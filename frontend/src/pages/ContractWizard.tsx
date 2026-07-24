import React, { useState } from 'react';
import { Steps, Form, Input, Select, DatePicker, message } from 'antd';
import { Plus, Trash2, FileText, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ContractWizard: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const next = () => {
    form.validateFields().then(() => {
      setCurrent(current + 1);
    }).catch(err => {
      console.log('ContractWizard Step Validation Errors:', JSON.stringify(err));
    });
  };

  const prev = () => setCurrent(current - 1);

  const onFinish = (values: any) => {
    const payload = {
      airlineId: values.airlineId,
      airportCode: values.airportCode,
      startDate: values.dateRange && values.dateRange[0] ? values.dateRange[0].format('YYYY-MM-DD') : '',
      endDate: values.dateRange && values.dateRange[1] ? values.dateRange[1].format('YYYY-MM-DD') : '',
      currency: values.currency,
      services: (values.services || []).map((s: any) => ({
        chargeCode: s.chargeCode,
        serviceName: s.serviceName,
        formulaType: s.formulaType,
        quantityDriver: s.quantityDriver,
        uom: s.uom,
        taxCode: s.taxCode,
        billingFrequency: s.billingFrequency,
        rateDetails: buildRateDetails(s)
      }))
    };

    const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
    const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';

    fetch('/api/contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType),
      },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        message.success('Contract drafted successfully!');
        navigate('/contracts');
      } else {
        res.json()
          .then(data => message.error(data.message || 'Failed to create contract.'))
          .catch(() => message.error('Failed to create contract.'));
      }
    });
  };

  const buildRateDetails = (service: any) => {
    const expectedAmount = service.expectedAmount
      ? { expectedAmount: Number(service.expectedAmount) }
      : {};
    switch (service.formulaType) {
      case 'PF-01':
      case 'PF-02':
      case 'PF-07':
        return { rate: Number(service.rate), ...expectedAmount };
      case 'PF-03':
      case 'PF-04':
        return { tiers: service.tiers, ...expectedAmount };
      case 'PF-05':
        return { timeBands: service.timeBands, ...expectedAmount };
      case 'PF-06':
        return { dayRates: service.dayRates, ...expectedAmount };
      default:
        return expectedAmount;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            Create Ground Handling Agreement (SGHA)
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
            Draft IATA-compliant turnaround SLAs, service line formulas, and multi-tiered rate cards
          </p>
        </div>
      </div>

      {/* Main Wizard Form Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <Steps 
          current={current} 
          items={[
            { title: 'Header Details' },
            { title: 'Service Lines' },
            { title: 'Review & Submit' }
          ]} 
          className="[&_.ant-steps-item-process_.ant-steps-item-icon]:!bg-slate-900 [&_.ant-steps-item-process_.ant-steps-item-icon]:!border-slate-900 [&_.ant-steps-item-finish_.ant-steps-item-icon]:!border-emerald-600 [&_.ant-steps-item-finish_.ant-steps-icon]:!text-emerald-600 mb-6"
        />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          
          {/* STEP 1: Header Details */}
          <div className={current === 0 ? 'block space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="airlineId" label={<span className="text-xs font-semibold text-slate-700">Airline Carrier</span>} rules={[{ required: true }]}>
                <Select id="airlineId" showSearch optionFilterProp="label" placeholder="Select Airline Carrier" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg">
                  <Option value="EK" label="Emirates (EK)">Emirates (EK)</Option>
                  <Option value="LH" label="Lufthansa (LH)">Lufthansa (LH)</Option>
                </Select>
              </Form.Item>

              <Form.Item name="airportCode" label={<span className="text-xs font-semibold text-slate-700">Station / Airport Hub</span>} rules={[{ required: true }]}>
                <Select id="airportCode" showSearch optionFilterProp="label" placeholder="Select Airport Station" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg">
                  <Option value="DXB" label="DXB - Dubai">DXB - Dubai</Option>
                  <Option value="FRA" label="FRA - Frankfurt">FRA - Frankfurt</Option>
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Form.Item name="dateRange" label={<span className="text-xs font-semibold text-slate-700">Validity Period</span>} rules={[{ required: true }]}>
                <RangePicker placeholder={["Start date", "End date"]} className="w-full [&_.ant-picker]:!rounded-lg [&_.ant-picker-input_input]:!text-xs" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Form.Item name="currency" label={<span className="text-xs font-semibold text-slate-700">Billing Currency</span>} rules={[{ required: true }]}>
                <Select id="currency" showSearch optionFilterProp="label" placeholder="Select Currency" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg">
                  <Option value="USD" label="USD">USD</Option>
                  <Option value="EUR" label="EUR">EUR</Option>
                  <Option value="AED" label="AED">AED</Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* STEP 2: Service Lines */}
          <div className={current === 1 ? 'block space-y-4' : 'hidden'}>
            <Form.List name="services">
              {(fields, { add, remove }) => (
                <div className="space-y-4">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Service Line #{name + 1}</span>
                        <button type="button" onClick={() => remove(name)} className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Form.Item {...restField} name={[name, 'chargeCode']} label={<span className="text-xs font-medium text-slate-700">Charge Code</span>} rules={[{ required: true }]}>
                          <Select id={`services_${name}_chargeCode`} showSearch optionFilterProp="label" placeholder="Select Code" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg">
                            <Option value="BAGGAGE" label="BAGGAGE">BAGGAGE</Option>
                            <Option value="PASSENGER_HANDLING" label="PASSENGER_HANDLING">PASSENGER_HANDLING</Option>
                            <Option value="DEICING" label="DEICING">DEICING</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item {...restField} name={[name, 'serviceName']} label={<span className="text-xs font-medium text-slate-700">Service Name</span>} rules={[{ required: true }]}>
                          <Input id={`services_${name}_serviceName`} placeholder="e.g. Turnaround Baggage Handling" className="!text-xs !rounded-lg" />
                        </Form.Item>

                        <Form.Item {...restField} name={[name, 'formulaType']} label={<span className="text-xs font-medium text-slate-700">Formula Pricing Model</span>} rules={[{ required: true }]}>
                          <Select id={`services_${name}_formulaType`} showSearch optionFilterProp="label" placeholder="Formula" className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg">
                            <Option value="PF-01" label="PF-01 (Unit Rate)">PF-01 (Unit Rate)</Option>
                            <Option value="PF-02" label="PF-02 (Fixed Fee)">PF-02 (Fixed Fee)</Option>
                            <Option value="PF-03" label="PF-03 (Tiered Volume)">PF-03 (Tiered Volume)</Option>
                            <Option value="PF-04" label="PF-04 (Slab Rate)">PF-04 (Slab Rate)</Option>
                            <Option value="PF-05" label="PF-05 (Time Band Rate)">PF-05 (Time Band Rate)</Option>
                            <Option value="PF-06" label="PF-06 (Day Rate)">PF-06 (Day Rate)</Option>
                            <Option value="PF-07" label="PF-07 (Custom Formula)">PF-07 (Custom Formula)</Option>
                          </Select>
                        </Form.Item>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Form.Item {...restField} name={[name, 'quantityDriver']} label={<span className="text-xs font-medium text-slate-700">Quantity Driver</span>}>
                          <Input id={`services_${name}_quantityDriver`} placeholder="e.g. passengers" className="!text-xs !rounded-lg" />
                        </Form.Item>

                        <Form.Item {...restField} name={[name, 'uom']} label={<span className="text-xs font-medium text-slate-700">UoM</span>}>
                          <Input id={`services_${name}_uom`} placeholder="e.g. PAX" className="!text-xs !rounded-lg" />
                        </Form.Item>

                        <Form.Item {...restField} name={[name, 'taxCode']} label={<span className="text-xs font-medium text-slate-700">Tax Code</span>}>
                          <Input id={`services_${name}_taxCode`} placeholder="e.g. VAT-0" className="!text-xs !rounded-lg" />
                        </Form.Item>

                        <Form.Item {...restField} name={[name, 'rate']} label={<span className="text-xs font-medium text-slate-700">Base Rate</span>}>
                          <Input id={`services_${name}_rate`} placeholder="12.50" className="!text-xs !rounded-lg !font-mono" />
                        </Form.Item>
                      </div>
                    </div>
                  ))}

                  <button
                    id="add-service-line-btn"
                    type="button"
                    onClick={() => add()}
                    className="w-full py-2.5 px-4 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Service Line
                  </button>
                </div>
              )}
            </Form.List>
          </div>

          {/* STEP 3: Review */}
          <div className={current === 2 ? 'block space-y-4' : 'hidden'}>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Contract Review Summary</span>
              </div>
              <p className="text-slate-600 m-0">Review your SLA configuration details before saving as draft.</p>
            </div>
          </div>

          {/* Wizard Nav Controls */}
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
                  id="contract-wizard-next-btn"
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {current === 2 && (
                <button
                  id="contract-wizard-submit-btn"
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Contract
                </button>
              )}
            </div>
          </div>

        </Form>
      </div>

    </div>
  );
};

export default ContractWizard;
