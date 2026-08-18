import React, { useState, useEffect } from 'react';
import { Steps, Form, Input, Select, DatePicker, message, Table } from 'antd';
import { Plus, Trash2, CreditCard, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Option } = Select;

interface ContractServiceLine {
  chargeCode: string;
  serviceName: string;
  formulaType: string;
  quantityDriver: string;
  uom: string;
  taxCode: string;
  rateDetails: any;
}

interface Contract {
  id: string;
  airlineId: string;
  airportCode: string;
  status: string;
  currency: string;
  services: ContractServiceLine[];
}

const InvoiceWizard: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  // Reference data lists
  const [airlines, setAirlines] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [approvedContracts, setApprovedContracts] = useState<Contract[]>([]);
  const [selectedContractServices, setSelectedContractServices] = useState<ContractServiceLine[]>([]);

  // Selected values
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [selectedAirport, setSelectedAirport] = useState<string>('');

  const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const simUserId = getSimulatedUserId(simTenantId);

  // Fetch reference lists
  useEffect(() => {
    fetch('/api/reference/airlines', {
      headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
    })
      .then(res => res.json())
      .then(data => setAirlines(data))
      .catch(() => setAirlines([{ iataCode: 'EK', name: 'Emirates' }, { iataCode: 'LH', name: 'Lufthansa' }]));

    fetch('/api/reference/airports', {
      headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
    })
      .then(res => res.json())
      .then(data => setAirports(data))
      .catch(() => setAirports([{ iataCode: 'DXB', name: 'Dubai International Airport' }, { iataCode: 'FRA', name: 'Frankfurt Airport' }]));
  }, [simTenantId, simTenantType, simUserId]);

  // Fetch invoice details when in edit mode
  useEffect(() => {
    if (id) {
      fetch(`/api/invoices/${id}`, {
        headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Invoice not found');
          return res.json();
        })
        .then((invoice: any) => {
          setSelectedAirline(invoice.airlineId);
          setSelectedAirport(invoice.airportCode);

          const mappedLineItems = (invoice.lineItems || []).map((item: any) => {
            let driverKey = 'passengers';
            let driverVal = '';
            if (item.quantityDrivers) {
              try {
                const parsed =
                  typeof item.quantityDrivers === 'string'
                    ? JSON.parse(item.quantityDrivers)
                    : item.quantityDrivers;
                const keys = Object.keys(parsed);
                if (keys.length > 0) {
                  driverKey = keys[0];
                  driverVal = parsed[driverKey] !== undefined ? String(parsed[driverKey]) : '';
                }
              } catch (_) {
                driverVal = '';
              }
            }

            return {
              contractId: item.contractId,
              flightDate: item.flightDate ? dayjs(item.flightDate) : dayjs(),
              flightNumber: item.flightNumber,
              aircraftReg: item.aircraftReg,
              origin: item.origin,
              destination: item.destination,
              chargeCode: item.chargeCode,
              driverKey,
              driverValue: driverVal,
              serviceName: item.serviceName,
              formulaType: item.formulaType,
              calculatedAmount: item.calculatedAmount,
            };
          });

          form.setFieldsValue({
            invoiceNumber: invoice.invoiceNumber,
            airlineId: invoice.airlineId,
            airportCode: invoice.airportCode,
            currency: invoice.currency || 'USD',
            exchangeRate: invoice.exchangeRate,
            exchangeRateSource: invoice.exchangeRateSource,
            issueDate: invoice.issueDate ? dayjs(invoice.issueDate) : dayjs(),
            dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : dayjs().add(30, 'day'),
            lineItems: mappedLineItems,
          });
        })
        .catch(() => {
          message.error('Failed to load invoice details for editing.');
        });
    }
  }, [id, form, simTenantId, simTenantType, simUserId]);

  // Fetch approved contracts when airline or airport changes
  useEffect(() => {
    if (selectedAirline && selectedAirport) {
      fetch('/api/contracts?status=APPROVED', {
        headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
      })
        .then(res => res.json())
        .then((contracts: Contract[]) => {
          const matchingContracts = contracts.filter(
            c => c.airlineId === selectedAirline && c.airportCode === selectedAirport
          );
          setApprovedContracts(matchingContracts);
          const servicesList = matchingContracts.flatMap(c => 
            (c.services || []).map(s => ({ ...s, contractId: c.id }))
          );
          setSelectedContractServices(servicesList);
        })
        .catch(() => {
          setApprovedContracts([]);
          setSelectedContractServices([]);
        });
    } else {
      setApprovedContracts([]);
      setSelectedContractServices([]);
    }
  }, [selectedAirline, selectedAirport, simTenantId, simTenantType, simUserId]);

  const handleAirlineChange = (val: string) => {
    setSelectedAirline(val);
    form.setFieldsValue({ lineItems: [] });
  };

  const handleAirportChange = (val: string) => {
    setSelectedAirport(val);
    form.setFieldsValue({ lineItems: [] });
  };

  const next = () => {
    form.validateFields().then(() => {
      setCurrent(current + 1);
    });
  };

  const prev = () => setCurrent(current - 1);

  const calculateLineItemAmount = (item: any) => {
    if (!item || !item.chargeCode) return 0;
    const contractSvc = selectedContractServices.find(s => s?.chargeCode === item.chargeCode);
    if (!contractSvc) return 0;

    const rate = contractSvc.rateDetails?.rate || 0;
    const formula = contractSvc.formulaType;
    const driverQty = parseFloat(item.driverValue) || 0;

    if (formula === 'PF-01') {
      return driverQty * rate;
    } else if (formula === 'PF-03' || formula === 'PF-04') {
      const tiers = contractSvc.rateDetails?.tiers || [];
      if (tiers.length > 0) {
        return driverQty * (tiers[0].rate || 0);
      }
      return driverQty * rate;
    }
    return driverQty * rate;
  };

  const getLineItemsPreview = () => {
    const values = form.getFieldsValue();
    return (values.lineItems || []).filter(Boolean).map((item: any) => {
      const contractSvc = selectedContractServices.find(s => s?.chargeCode === item.chargeCode);
      const calcAmount = calculateLineItemAmount(item);
      return {
        ...item,
        serviceName: contractSvc?.serviceName || 'Unknown Service',
        formulaType: contractSvc?.formulaType || 'PF-01',
        calculatedAmount: calcAmount,
      };
    });
  };

  const getTotalAmount = () => {
    return getLineItemsPreview().reduce((sum: number, item: any) => sum + item.calculatedAmount, 0);
  };

  const onFinish = (values: any) => {
    const lineItemsPayload = (values.lineItems || []).filter(Boolean).map((item: any) => {
      const contractSvc = selectedContractServices.find(s => s?.chargeCode === item.chargeCode);
      const calcAmount = calculateLineItemAmount(item);
      const fDate = item.flightDate && dayjs.isDayjs(item.flightDate) 
        ? item.flightDate.format('YYYY-MM-DD') 
        : (item.flightDate ? String(item.flightDate) : dayjs().format('YYYY-MM-DD'));

      const cId = item.contractId || (contractSvc as any)?.contractId || (approvedContracts[0]?.id);

      // quantityDrivers must be a JSON map string: {"<quantityDriver>": <numericValue>}
      // as expected by InvoiceService.parseQuantityDrivers()
      const driverKey = contractSvc?.quantityDriver || item.driverKey || 'passengers';
      const driverVal = parseFloat(item.driverValue) || 0;
      const quantityDriversJson = JSON.stringify({ [driverKey]: driverVal });

      return {
        contractId: cId,
        flightDate: fDate,
        flightNumber: item.flightNumber,
        aircraftReg: item.aircraftReg,
        origin: item.origin,
        destination: item.destination,
        chargeCode: item.chargeCode,
        serviceName: contractSvc?.serviceName || item.serviceName || 'Service',
        formulaType: contractSvc?.formulaType || item.formulaType || 'PF-01',
        quantityDrivers: quantityDriversJson,
        calculatedAmount: calcAmount
      };
    });

    const iDate = values.issueDate && dayjs.isDayjs(values.issueDate)
      ? values.issueDate.format('YYYY-MM-DD')
      : (values.issueDate ? String(values.issueDate) : dayjs().format('YYYY-MM-DD'));

    const dDate = values.dueDate && dayjs.isDayjs(values.dueDate)
      ? values.dueDate.format('YYYY-MM-DD')
      : (values.dueDate ? String(values.dueDate) : dayjs().add(30, 'day').format('YYYY-MM-DD'));

    const payload = {
      supplierId: simTenantId,
      invoiceNumber: values.invoiceNumber,
      airlineId: values.airlineId,
      airportCode: values.airportCode,
      currency: values.currency || 'USD',
      exchangeRate: values.exchangeRate ? Number(values.exchangeRate) : undefined,
      exchangeRateSource: values.exchangeRateSource,
      issueDate: iDate,
      dueDate: dDate,
      lineItems: lineItemsPayload
    };

    const url = isEditMode ? `/api/invoices/${id}` : '/api/invoices';
    const method = isEditMode ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType, simUserId),
      },
      body: JSON.stringify(payload)
    }).then(async res => {
      const textData = await res.text();
      console.log('[InvoiceWizard] ' + method + ' /api/invoices status:', res.status, 'body:', textData);
      if (res.ok) {
        message.success(isEditMode ? 'Invoice updated successfully!' : 'Invoice drafted successfully!');
        navigate('/invoices');
      } else {
        let errorMsg = isEditMode ? 'Failed to update invoice.' : 'Failed to create invoice.';
        try {
          const json = JSON.parse(textData);
          errorMsg = json.message || json.error || textData;
        } catch (_) {
          if (textData) errorMsg = textData;
        }
        console.error('[InvoiceWizard] Error message to show:', errorMsg);
        message.error(errorMsg);
      }
    }).catch(err => {
      console.error('[InvoiceWizard] fetch catch:', err);
      message.error(isEditMode ? 'Failed to update invoice.' : 'Failed to create invoice.');
    });
  };

  const previewColumns = [
    { title: 'Flight Date', dataIndex: 'flightDate', key: 'flightDate', render: (val: any) => val ? val.format('YYYY-MM-DD') : '' },
    { title: 'Flight No', dataIndex: 'flightNumber', key: 'flightNumber' },
    { title: 'Reg', dataIndex: 'aircraftReg', key: 'aircraftReg' },
    { title: 'Sector', key: 'sector', render: (_: any, r: any) => `${r.origin || ''}-${r.destination || ''}` },
    { title: 'Charge Code', dataIndex: 'chargeCode', key: 'chargeCode' },
    { title: 'Formula', dataIndex: 'formulaType', key: 'formulaType' },
    { title: 'Amount', dataIndex: 'calculatedAmount', key: 'calculatedAmount', align: 'right' as const, render: (val: number) => `$${val.toFixed(2)}` }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            {isEditMode ? 'Edit Ground Handling Invoice' : 'Create Ground Handling Invoice'}
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
            {isEditMode
              ? 'Update multi-flight turnaround billing records and contract-linked calculations'
              : 'Multi-flight turnaround billing generator linked to approved contract SLAs'}
          </p>
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <Steps 
          current={current} 
          items={[
            { title: 'Header & Scope' },
            { title: 'Flight Line Items' },
            { title: 'Ledger Preview' }
          ]} 
          className="[&_.ant-steps-item-process_.ant-steps-item-icon]:!bg-slate-900 [&_.ant-steps-item-process_.ant-steps-item-icon]:!border-slate-900 [&_.ant-steps-item-finish_.ant-steps-item-icon]:!border-emerald-600 [&_.ant-steps-item-finish_.ant-steps-icon]:!text-emerald-600 mb-6"
        />

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          initialValues={{
            issueDate: dayjs(),
            dueDate: dayjs().add(30, 'day'),
            currency: 'USD',
            lineItems: []
          }}
        >
          
          {/* STEP 1 */}
          <div className={current === 0 ? 'block space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item name="airlineId" label={<span className="text-xs font-semibold text-slate-700">Airline Carrier</span>} rules={[{ required: true }]}>
                <Select 
                  id="airlineId"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select Airline" 
                  onChange={handleAirlineChange} 
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selection-item]:!pointer-events-none"
                >
                  {airlines.map(a => <Option key={a.iataCode} value={a.iataCode} data-testid={`option-${a.iataCode}`} label={`${a.name} (${a.iataCode})`}>{a.name} ({a.iataCode})</Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="airportCode" label={<span className="text-xs font-semibold text-slate-700">Station / Airport Hub</span>} rules={[{ required: true }]}>
                <Select 
                  id="airportCode"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select Airport" 
                  onChange={handleAirportChange} 
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selection-item]:!pointer-events-none"
                >
                  {airports.map(ap => (
                    <Option key={ap.iataCode} value={ap.iataCode} data-testid={`option-${ap.iataCode}`} label={`${ap.name} (${ap.iataCode})`}>
                      {ap.name} ({ap.iataCode})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="invoiceNumber" label={<span className="text-xs font-semibold text-slate-700">Invoice Number</span>} rules={[{ required: true }]}>
                <Input id="invoiceNumber" placeholder="INV-2026-0001" className="!text-xs !rounded-lg !font-mono" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Form.Item name="currency" label={<span className="text-xs font-semibold text-slate-700">Currency</span>} initialValue="USD">
                <Select id="currency" showSearch optionFilterProp="label" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selection-item]:!pointer-events-none">
                  <Option value="USD" data-testid="option-USD" label="USD">USD</Option>
                  <Option value="EUR" data-testid="option-EUR" label="EUR">EUR</Option>
                  <Option value="AED" data-testid="option-AED" label="AED">AED</Option>
                </Select>
              </Form.Item>

              <Form.Item name="exchangeRate" label={<span className="text-xs font-semibold text-slate-700">Exchange Rate</span>}>
                <Input id="exchangeRate" placeholder="1.0" className="!text-xs !rounded-lg !font-mono" />
              </Form.Item>

              <Form.Item name="exchangeRateSource" label={<span className="text-xs font-semibold text-slate-700">Rate Source</span>}>
                <Input id="exchangeRateSource" placeholder="Central Bank / FX Reference" className="!text-xs !rounded-lg" />
              </Form.Item>

              <Form.Item name="issueDate" label={<span className="text-xs font-semibold text-slate-700">Issue Date</span>} rules={[{ required: true }]}>
                <DatePicker id="issueDate" className="w-full [&_.ant-picker]:!rounded-lg [&_.ant-picker-input_input]:!text-xs" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Form.Item name="dueDate" label={<span className="text-xs font-semibold text-slate-700">Due Date</span>} rules={[{ required: true }]}>
                <DatePicker id="dueDate" className="w-full [&_.ant-picker]:!rounded-lg [&_.ant-picker-input_input]:!text-xs" />
              </Form.Item>
            </div>
          </div>

          {/* STEP 2 */}
          <div className={current === 1 ? 'block space-y-4' : 'hidden'}>
            <Form.List name="lineItems">
              {(fields, { add, remove }) => {
                const lineItemsValues = form.getFieldsValue().lineItems || [];

                return (
                  <div className="space-y-4">
                    {fields.map(({ key, name, ...restField }) => {
                      const currentLineItem = lineItemsValues[name] || form.getFieldValue(['lineItems', name]);
                      const matchedSvc = selectedContractServices.find(s => s?.chargeCode === currentLineItem?.chargeCode);

                    return (
                      <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Turnaround Flight #{name + 1}</span>
                          <button type="button" onClick={() => remove(name)} className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Form.Item {...restField} name={[name, 'flightDate']} label={<span className="text-xs font-medium text-slate-700">Flight Date</span>} rules={[{ required: true }]}>
                            <DatePicker id={`lineItems_${name}_flightDate`} className="w-full [&_.ant-picker]:!rounded-lg [&_.ant-picker-input_input]:!text-xs" />
                          </Form.Item>

                          <Form.Item {...restField} name={[name, 'flightNumber']} label={<span className="text-xs font-medium text-slate-700">Flight No</span>} rules={[{ required: true }]}>
                            <Input id={`lineItems_${name}_flightNumber`} placeholder="EK302" className="!text-xs !rounded-lg !font-mono" />
                          </Form.Item>

                          <Form.Item {...restField} name={[name, 'aircraftReg']} label={<span className="text-xs font-medium text-slate-700">Aircraft Reg</span>} rules={[{ required: true }]}>
                            <Input id={`lineItems_${name}_aircraftReg`} placeholder="A6-EEO" className="!text-xs !rounded-lg !font-mono" />
                          </Form.Item>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Form.Item {...restField} name={[name, 'origin']} label={<span className="text-xs font-medium text-slate-700">Origin</span>} rules={[{ required: true }]}>
                            <Input id={`lineItems_${name}_origin`} placeholder="DXB" className="!text-xs !rounded-lg !font-mono" />
                          </Form.Item>

                          <Form.Item {...restField} name={[name, 'destination']} label={<span className="text-xs font-medium text-slate-700">Destination</span>} rules={[{ required: true }]}>
                            <Input id={`lineItems_${name}_destination`} placeholder="FRA" className="!text-xs !rounded-lg !font-mono" />
                          </Form.Item>

                          <Form.Item {...restField} name={[name, 'chargeCode']} label={<span className="text-xs font-medium text-slate-700">Service Charge Code</span>} rules={[{ required: true }]}>
                            <Select 
                              id={`lineItems_${name}_chargeCode`} 
                              showSearch 
                              optionFilterProp="label" 
                              placeholder="Select Code" 
                              onChange={() => setTick(t => t + 1)}
                              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selection-item]:!pointer-events-none"
                            >
                              {selectedContractServices.map(svc => (
                                <Option key={svc.chargeCode} value={svc.chargeCode} data-testid={`option-${svc.chargeCode}`} label={`${svc.serviceName} (${svc.chargeCode})`}>
                                  {svc.serviceName} ({svc.chargeCode})
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item {...restField} name={[name, 'driverValue']} label={<span className="text-xs font-medium text-slate-700">Driver Quantity</span>} rules={[{ required: true }]}>
                            <Input id={`lineItems_${name}_driverValue`} placeholder="e.g. 150" className="!text-xs !rounded-lg !font-mono" />
                          </Form.Item>
                        </div>

                        {matchedSvc && (
                          <div className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs font-mono text-blue-900">
                            Pricing Formula: {matchedSvc.formulaType}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    id="invoice-wizard-add-flight-btn"
                    type="button"
                    onClick={() => add()}
                    className="w-full py-2.5 px-4 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Flight Item
                  </button>
                </div>
              );
            }}
          </Form.List>
          </div>

          {/* STEP 3 */}
          <div className={current === 2 ? 'block space-y-4' : 'hidden'}>
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Invoice Amount</span>
                <h3 className="font-mono text-2xl font-bold text-white m-0">Total Amount: ${getTotalAmount().toFixed(2)}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <Table
              columns={previewColumns}
              dataSource={getLineItemsPreview()}
              pagination={false}
              rowKey={(r, i) => `${r.flightNumber}-${i}`}
              size="small"
              className="[&_.ant-table-thead_th]:!bg-slate-50 rounded-lg overflow-hidden border border-slate-200"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
            {current > 0 && (
              <button
                type="button"
                onClick={prev}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            )}
            <div className="ml-auto flex items-center gap-3">
              {current < 2 && (
                <button
                  id="invoice-wizard-next-btn"
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {current === 2 && (
                <button
                  id="invoice-wizard-submit-btn"
                  type="button"
                  onClick={() => {
                    form.validateFields()
                      .then(values => onFinish(values))
                      .catch(() => onFinish(form.getFieldsValue()));
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditMode ? 'Save Changes' : 'Submit Draft Invoice'}
                </button>
              )}
            </div>
          </div>

        </Form>
      </div>

    </div>
  );
};

export default InvoiceWizard;
