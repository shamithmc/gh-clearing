import React, { useState, useEffect } from 'react';
import { Card, Steps, Button, Form, Input, Select, DatePicker, message, Row, Col, Typography, Divider, Table } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Title, Text } = Typography;
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
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();

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

  // Fetch airlines and airports references
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
      .catch(() => setAirports([{ iataCode: 'DXB', name: 'Dubai' }, { iataCode: 'FRA', name: 'Frankfurt' }]));
  }, [simTenantId, simTenantType, simUserId]);

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
          const servicesList = matchingContracts.flatMap(c => c.services);
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

  // Simple pricing engine simulation for UI preview
  const calculateLineItemAmount = (item: any) => {
    if (!item || !item.chargeCode) return 0;
    const contractSvc = selectedContractServices.find(s => s.chargeCode === item.chargeCode);
    if (!contractSvc) return 0;

    const rate = contractSvc.rateDetails?.rate || 0;
    const formula = contractSvc.formulaType;
    const driverQty = parseFloat(item.driverValue) || 0;

    if (formula === 'PF-01') {
      return driverQty * rate;
    } else if (formula === 'PF-03' || formula === 'PF-04') {
      // Slab-based fallback logic
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
    return (values.lineItems || []).map((item: any) => {
      const contractSvc = selectedContractServices.find(s => s.chargeCode === item.chargeCode);
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
    const lineItemsPayload = (values.lineItems || []).map((item: any) => {
      const contractSvc = selectedContractServices.find(s => s.chargeCode === item.chargeCode);
      const calcAmount = calculateLineItemAmount(item);
      
      const matchingContract = approvedContracts.find(c => 
        c.services.some(s => s.chargeCode === item.chargeCode)
      );
      // JSON stringified quantity driver configuration
      const driverObj = {
        [contractSvc?.quantityDriver || 'passenger']: parseFloat(item.driverValue) || 0
      };

      return {
        flightDate: item.flightDate.format('YYYY-MM-DD'),
        flightNumber: item.flightNumber,
        aircraftReg: item.aircraftReg,
        aircraftType: item.aircraftType?.trim().toUpperCase() || undefined,
        origin: item.origin,
        destination: item.destination,
        chargeCode: item.chargeCode,
        serviceName: contractSvc?.serviceName || 'Unknown Service',
        formulaType: contractSvc?.formulaType || 'PF-01',
        quantityDrivers: JSON.stringify(driverObj),
        calculatedAmount: calcAmount,
        contractId: matchingContract?.id || ''
      };
    });

    const payload = {
      invoiceNumber: values.invoiceNumber,
      supplierId: simTenantId,
      airlineId: values.airlineId,
      airportCode: values.airportCode,
      currency: values.currency,
      exchangeRate: parseFloat(values.exchangeRate) || 1.0,
      exchangeRateSource: values.exchangeRateSource,
      issueDate: values.issueDate.format('YYYY-MM-DD'),
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      totalAmount: lineItemsPayload.reduce((sum: number, i: any) => sum + i.calculatedAmount, 0),
      lineItems: lineItemsPayload
    };

    fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType, simUserId),
      },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        message.success('Invoice drafted successfully!');
        navigate('/invoices');
      } else {
        res.json().then(data => {
          message.error(data.message || 'Failed to create invoice.');
        }).catch(() => {
          message.error('Failed to create invoice.');
        });
      }
    });
  };

  return (
    <div>
      <Title level={3}>Create New Invoice</Title>
      <Card>
        <Steps current={current} items={[
          { title: 'Header & Context' },
          { title: 'Flight Line Items' },
          { title: 'Preview & Submit' }
        ]} style={{ marginBottom: 24 }} />

        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ exchangeRate: 1.0 }}>
          
          {/* STEP 1: Context and Invoice Header Details */}
          <div style={{ display: current === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="airlineId" label="Airline" rules={[{ required: true, message: 'Airline is required' }]}>
                  <Select showSearch optionFilterProp="children" placeholder="Select Airline" onChange={handleAirlineChange}>
                    {airlines.map(a => (
                      <Option key={a.iataCode} value={a.iataCode}>{a.name} ({a.iataCode})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="airportCode" label="Airport" rules={[{ required: true, message: 'Airport is required' }]}>
                  <Select showSearch optionFilterProp="children" placeholder="Select Airport" onChange={handleAirportChange}>
                    {airports.map(ap => (
                      <Option key={ap.iataCode} value={ap.iataCode}>{ap.name} ({ap.iataCode})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="invoiceNumber" label="Invoice Number" rules={[{ required: true, message: 'Invoice Number is required' }]}>
                  <Input id="invoiceNumber" placeholder="INV-2026-0001" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="currency" label="Currency" rules={[{ required: true, message: 'Currency is required' }]}>
                  <Select showSearch optionFilterProp="children" placeholder="Select Currency">
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                    <Option value="AED">AED</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="exchangeRate" label="Exchange Rate" rules={[{ required: true, message: 'Exchange Rate is required' }]}>
                  <Input id="exchangeRate" type="number" step="0.0001" placeholder="1.0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="exchangeRateSource" label="Exchange Rate Source" rules={[{ required: true, message: 'Exchange Rate Source is required' }]}>
                  <Input id="exchangeRateSource" placeholder="ECB, central bank, contract rate" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="issueDate" label="Issue Date" rules={[{ required: true, message: 'Issue Date is required' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dueDate" label="Due Date" rules={[{ required: true, message: 'Due Date is required' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {selectedAirline && selectedAirport && selectedContractServices.length === 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="danger">Warning: No approved contract services found for {selectedAirline} at {selectedAirport}. You must have an approved contract to build line items.</Text>
              </div>
            )}
          </div>

          {/* STEP 2: Flight Line Items */}
          <div style={{ display: current === 1 ? 'block' : 'none' }}>
            <Form.List name="lineItems">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" style={{ marginBottom: 16 }} title={`Flight Item ${name + 1}`} extra={<MinusCircleOutlined onClick={() => remove(name)} />}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'flightDate']} label="Flight Date" rules={[{ required: true, message: 'Flight date is required' }]}>
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'flightNumber']} label="Flight Number" rules={[{ required: true, message: 'Flight number is required' }]}>
                            <Input placeholder="EK302" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'aircraftReg']} label="Aircraft Reg" rules={[{ required: true, message: 'Aircraft Reg is required' }]}>
                            <Input placeholder="A6-EEO" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'aircraftType']} label="Aircraft Type (optional)">
                            <Input placeholder="A380" maxLength={50} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'origin']} label="Origin" rules={[{ required: true, message: 'Origin is required' }]}>
                            <Input placeholder="DXB" maxLength={3} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'destination']} label="Destination" rules={[{ required: true, message: 'Destination is required' }]}>
                            <Input placeholder="FRA" maxLength={3} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'chargeCode']} label="Contracted Service / Charge Code" rules={[{ required: true, message: 'Charge Code is required' }]}>
                            <Select placeholder="Select Contracted Service">
                              {selectedContractServices.map(svc => (
                                <Option key={svc.chargeCode} value={svc.chargeCode}>
                                  {svc.serviceName} ({svc.chargeCode})
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Display driver info dynamically if charge code is selected */}
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prev = prevValues.lineItems?.[name]?.chargeCode;
                          const curr = currentValues.lineItems?.[name]?.chargeCode;
                          return prev !== curr;
                        }}
                      >
                        {({ getFieldValue }) => {
                          const code = getFieldValue(['lineItems', name, 'chargeCode']);
                          const matchedSvc = selectedContractServices.find(s => s.chargeCode === code);
                          if (!matchedSvc) return null;

                          return (
                            <Row gutter={16} align="middle">
                              <Col span={12}>
                                <Form.Item 
                                  {...restField} 
                                  name={[name, 'driverValue']} 
                                  label={`Driver Qty: (${matchedSvc.quantityDriver || 'value'} in ${matchedSvc.uom || 'EA'})`}
                                  rules={[{ required: true, message: 'Driver quantity/value is required' }]}
                                >
                                  <Input type="number" step="0.01" placeholder="e.g. 150" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <div style={{ paddingTop: '8px' }}>
                                  <Text type="secondary">Pricing Formula: {matchedSvc.formulaType}</Text>
                                </div>
                              </Col>
                            </Row>
                          );
                        }}
                      </Form.Item>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Flight Item
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>

          {/* STEP 3: Preview */}
          <div style={{ display: current === 2 ? 'block' : 'none' }}>
            <Title level={4}>Invoice Draft Summary Preview</Title>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Invoice Number: </Text><Text>{form.getFieldValue('invoiceNumber')}</Text><br />
              <Text strong>Customer Airline: </Text><Text>{form.getFieldValue('airlineId')}</Text><br />
              <Text strong>Airport Hub: </Text><Text>{form.getFieldValue('airportCode')}</Text><br />
              <Text strong>Currency: </Text><Text>{form.getFieldValue('currency')}</Text><br />
              <Text strong>Exchange Rate: </Text><Text>{form.getFieldValue('exchangeRate')}</Text><br />
            </div>

            <Divider />

            <Table 
              pagination={false}
              dataSource={getLineItemsPreview()}
              rowKey={(_, i) => i?.toString() || '0'}
              columns={[
                { title: 'Flight No', dataIndex: 'flightNumber', key: 'flightNumber' },
                { title: 'Date', dataIndex: 'flightDate', key: 'flightDate', render: (d: any) => d ? d.format('YYYY-MM-DD') : '' },
                { title: 'Sector', key: 'sector', render: ((_: any, r: any) => `${r.origin || ''}-${r.destination || ''}`) as any },
                { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName' },
                { title: 'Formula', dataIndex: 'formulaType', key: 'formulaType' },
                { title: 'Qty/Driver', dataIndex: 'driverValue', key: 'driverValue' },
                { title: 'Calculated Amount', dataIndex: 'calculatedAmount', key: 'calculatedAmount', render: (val: number) => val.toFixed(2) }
              ]}
            />

            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Title level={3}>Total Amount: {getTotalAmount().toFixed(2)} {form.getFieldValue('currency')}</Title>
            </div>
          </div>

          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {current > 0 && <Button onClick={prev}>Previous</Button>}
            {current < 2 && <Button type="primary" onClick={next}>Next</Button>}
            {current === 2 && <Button type="primary" htmlType="submit">Submit Draft Invoice</Button>}
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default InvoiceWizard;
