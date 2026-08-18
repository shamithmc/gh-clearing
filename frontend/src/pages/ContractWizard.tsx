import React, { useState, useEffect } from 'react';
import { Steps, Form, Input, Select, DatePicker, message } from 'antd';
import {
  Plus,
  Trash2,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { simulatedAuthHeaders } from '../utils/simulatedAuth';
import { TiersEditor } from '../components/pricing/TiersEditor';
import { TimeBandsEditor } from '../components/pricing/TimeBandsEditor';
import { DayRatesEditor } from '../components/pricing/DayRatesEditor';
import { CompoundDriverEditor } from '../components/pricing/CompoundDriverEditor';
import { MtowEditor } from '../components/pricing/MtowEditor';
import { FormulaReviewCard } from '../components/pricing/FormulaReviewCard';
import type { ReferenceAirline, ReferenceAirport, ReferenceChargeCode } from '../components/pricing/types';

const { Option } = Select;
const { RangePicker } = DatePicker;

const FALLBACK_AIRLINES: ReferenceAirline[] = [
  { iataCode: 'EK', name: 'Emirates' },
  { iataCode: 'LH', name: 'Lufthansa' },
  { iataCode: 'BA', name: 'British Airways' },
  { iataCode: 'QR', name: 'Qatar Airways' },
  { iataCode: 'AF', name: 'Air France' },
];

const FALLBACK_AIRPORTS: ReferenceAirport[] = [
  { iataCode: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
  { iataCode: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt' },
  { iataCode: 'LHR', name: 'London Heathrow Airport', city: 'London' },
  { iataCode: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
  { iataCode: 'DOH', name: 'Hamad International Airport', city: 'Doha' },
];

const FALLBACK_CHARGE_CODES: ReferenceChargeCode[] = [
  { code: 'BAGGAGE', name: 'Baggage Handling' },
  { code: 'BAGGAGE_DELIVERY', name: 'Baggage Delivery' },
  { code: 'CARGO_HANDLING', name: 'Cargo Handling' },
  { code: 'CATERING', name: 'Catering Services' },
  { code: 'CLEANING', name: 'Cabin Cleaning' },
  { code: 'COMMISSION', name: 'Commission' },
  { code: 'CREW_ACCOMMODATION', name: 'Crew Accommodation' },
  { code: 'CREW_TRANSPORTATION', name: 'Crew Transportation' },
  { code: 'CUSTOMS_SERVICE_CHARGE', name: 'Customs Service Charge' },
  { code: 'DEICING', name: 'Aircraft De-icing' },
  { code: 'DEPARTURE_STAMPS', name: 'Departure Stamps' },
  { code: 'IMMIGRATION_FINES', name: 'Immigration Fines' },
  { code: 'LOUNGES', name: 'Executive Lounges' },
  { code: 'MISCELLANEOUS', name: 'Miscellaneous Services' },
  { code: 'MISHANDLING_BAGGAGE', name: 'Mishandled Baggage' },
  { code: 'MISHANDLING_PASSENGER', name: 'Mishandled Passenger' },
  { code: 'MOTOR_FUEL', name: 'Motor Fuel' },
  { code: 'PASSENGER_HANDLING', name: 'Passenger Handling' },
  { code: 'PASSENGER_TRANSPORTATION', name: 'Passenger Transportation' },
  { code: 'PASSENGER_SECURITY', name: 'Passenger Security' },
  { code: 'RAMP_HANDLING', name: 'Ramp Handling Services' },
  { code: 'RENT_EQUIPMENT', name: 'Ground Support Equipment Rental' },
  { code: 'STAND', name: 'Aircraft Stand Services' },
  { code: 'STPC', name: 'Stopover Paid by Carrier' },
  { code: 'UTILITIES', name: 'Airport Utilities' },
];

let cachedAirlines: ReferenceAirline[] = FALLBACK_AIRLINES;
let cachedAirports: ReferenceAirport[] = FALLBACK_AIRPORTS;
let cachedChargeCodes: ReferenceChargeCode[] = FALLBACK_CHARGE_CODES;
let refDataLoaded = false;

const ContractWizard: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Dynamic Reference Data States
  const [airlines, setAirlines] = useState<ReferenceAirline[]>(cachedAirlines);
  const [airports, setAirports] = useState<ReferenceAirport[]>(cachedAirports);
  const [chargeCodes, setChargeCodes] = useState<ReferenceChargeCode[]>(cachedChargeCodes);
  const [loadingRefData, setLoadingRefData] = useState(false);

  useEffect(() => {
    if (!refDataLoaded) {
      fetchReferenceData();
    }
  }, []);

  useEffect(() => {
    if (id) {
      const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
      const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
      const headers = simulatedAuthHeaders(simTenantId, simTenantType);

      fetch(`/api/contracts/${id}`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error('Contract not found');
          return res.json();
        })
        .then((contract) => {
          const mappedServices = (contract.services || []).map((s: any) => {
            const rd = s.rateDetails || {};
            const formula = s.formulaType || 'PF-01';
            let compoundDrivers: string[] | undefined;
            if (formula === 'PF-02') {
              compoundDrivers = s.quantityDriver ? s.quantityDriver.split(',') : ['passengers', 'bags'];
            }

            let timeBands = rd.timeBands;
            if (formula === 'PF-05' && (!timeBands || timeBands.length === 0)) {
              if (rd.rate !== undefined && rd.rate !== null && rd.rate !== '') {
                timeBands = [{ start: '00:00', end: '24:00', rate: Number(rd.rate) }];
              } else {
                timeBands = [
                  { start: '06:00', end: '22:00', rate: 100.0 },
                  { start: '22:00', end: '06:00', rate: 150.0 },
                ];
              }
            }

            let tiers = rd.tiers;
            if ((formula === 'PF-03' || formula === 'PF-04') && (!tiers || tiers.length === 0)) {
              if (rd.rate !== undefined && rd.rate !== null && rd.rate !== '') {
                tiers = [{ upto: null, rate: Number(rd.rate), isTerminal: true }];
              } else {
                tiers = [
                  { upto: 100, rate: 15.0, isTerminal: false },
                  { upto: 500, rate: 12.0, isTerminal: false },
                  { upto: null, rate: 8.5, isTerminal: true },
                ];
              }
            }

            return {
              chargeCode: s.chargeCode,
              serviceName: s.serviceName,
              formulaType: formula,
              quantityDriver: s.quantityDriver,
              uom: s.uom,
              taxCode: s.taxCode,
              billingFrequency: s.billingFrequency,
              expectedAmount: rd.expectedAmount,
              rate: rd.rate !== undefined ? String(rd.rate) : undefined,
              tiers,
              timeBands,
              dayRates: rd.dayRates,
              compoundDrivers,
            };
          });

          form.setFieldsValue({
            airlineId: contract.airlineId,
            airportCode: contract.airportCode,
            dateRange: contract.startDate && contract.endDate ? [dayjs(contract.startDate), dayjs(contract.endDate)] : undefined,
            currency: contract.currency,
            services: mappedServices,
          });
        })
        .catch(() => {
          message.error('Failed to load contract details for editing.');
        });
    }
  }, [id, form]);

  const fetchReferenceData = async () => {
    setLoadingRefData(true);
    const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
    const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
    const headers = simulatedAuthHeaders(simTenantId, simTenantType);

    try {
      const [airlinesRes, airportsRes, chargeCodesRes] = await Promise.allSettled([
        fetch('/api/reference/airlines', { headers }).then((res) => (res.ok ? res.json() : null)),
        fetch('/api/reference/airports', { headers }).then((res) => (res.ok ? res.json() : null)),
        fetch('/api/reference/charge-codes', { headers }).then((res) => (res.ok ? res.json() : null)),
      ]);

      if (airlinesRes.status === 'fulfilled' && Array.isArray(airlinesRes.value) && airlinesRes.value.length > 0) {
        cachedAirlines = airlinesRes.value;
        setAirlines(airlinesRes.value);
      }
      if (airportsRes.status === 'fulfilled' && Array.isArray(airportsRes.value) && airportsRes.value.length > 0) {
        cachedAirports = airportsRes.value;
        setAirports(airportsRes.value);
      }
      if (
        chargeCodesRes.status === 'fulfilled' &&
        Array.isArray(chargeCodesRes.value) &&
        chargeCodesRes.value.length > 0
      ) {
        cachedChargeCodes = chargeCodesRes.value;
        setChargeCodes(chargeCodesRes.value);
      }
      refDataLoaded = true;
    } catch {
      // Fallbacks already initialized
    } finally {
      setLoadingRefData(false);
    }
  };

  const next = async () => {
    try {
      if (current === 0) {
        await form.validateFields(['airlineId', 'airportCode', 'dateRange', 'currency']);
      } else if (current === 1) {
        await form.validateFields(['services']);
      } else {
        await form.validateFields();
      }
      setCurrent(current + 1);
    } catch (err: any) {
      console.log('ContractWizard Step Validation Errors:', JSON.stringify(err));
    }
  };

  const prev = () => setCurrent(current - 1);

  const buildRateDetails = (service: any) => {
    const expectedAmount = service.expectedAmount
      ? { expectedAmount: Number(service.expectedAmount) }
      : {};

    switch (service.formulaType) {
      case 'PF-01':
        return { rate: Number(service.rate), ...expectedAmount };

      case 'PF-02':
        return { rate: Number(service.rate), ...expectedAmount };

      case 'PF-03':
      case 'PF-04': {
        const rawTiers =
          Array.isArray(service.tiers) && service.tiers.length > 0
            ? service.tiers
            : service.rate !== undefined && service.rate !== null && service.rate !== ''
            ? [{ upto: null, rate: Number(service.rate), isTerminal: true }]
            : [];
        const tiers = rawTiers.map((t: any) => ({
          upto: t.isTerminal || t.upto === null || t.upto === '' || t.upto === undefined ? null : Number(t.upto),
          rate: Number(t.rate),
        }));
        return { tiers, ...expectedAmount };
      }

      case 'PF-05': {
        const rawBands =
          Array.isArray(service.timeBands) && service.timeBands.length > 0
            ? service.timeBands
            : service.rate !== undefined && service.rate !== null && service.rate !== ''
            ? [{ start: '00:00', end: '24:00', rate: Number(service.rate) }]
            : [];
        const timeBands = rawBands.map((tb: any) => ({
          start: tb.start,
          end: tb.end,
          rate: Number(tb.rate),
        }));
        return { timeBands, ...expectedAmount };
      }

      case 'PF-06': {
        const dRates = service.dayRates || {};
        const dayRates: Record<string, number> = {
          MONDAY: Number(dRates.MONDAY ?? service.rate ?? 0),
          TUESDAY: Number(dRates.TUESDAY ?? service.rate ?? 0),
          WEDNESDAY: Number(dRates.WEDNESDAY ?? service.rate ?? 0),
          THURSDAY: Number(dRates.THURSDAY ?? service.rate ?? 0),
          FRIDAY: Number(dRates.FRIDAY ?? service.rate ?? 0),
          SATURDAY: Number(dRates.SATURDAY ?? service.rate ?? 0),
          SUNDAY: Number(dRates.SUNDAY ?? service.rate ?? 0),
        };
        return { dayRates, ...expectedAmount };
      }

      case 'PF-07':
        return { rate: Number(service.rate), ...expectedAmount };

      default:
        return expectedAmount;
    }
  };

  const handleFormulaChange = (formulaType: string, fieldIndex: number) => {
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    let updatedService = { ...currentService, formulaType };

    if (formulaType === 'PF-01') {
      updatedService = {
        ...updatedService,
        quantityDriver: updatedService.quantityDriver || 'passengers',
        uom: updatedService.uom || 'PAX',
        rate: updatedService.rate || '12.50',
      };
    } else if (formulaType === 'PF-02') {
      const defaultDrivers = ['passengers', 'bags'];
      updatedService = {
        ...updatedService,
        compoundDrivers: defaultDrivers,
        quantityDriver: defaultDrivers.join(','),
        uom: updatedService.uom || 'PAX_BAG',
        rate: updatedService.rate || '1.25',
      };
    } else if (formulaType === 'PF-03' || formulaType === 'PF-04') {
      updatedService = {
        ...updatedService,
        quantityDriver: updatedService.quantityDriver || 'passengers',
        uom: updatedService.uom || 'PAX',
        tiers:
          updatedService.tiers && updatedService.tiers.length > 0
            ? updatedService.tiers
            : [
                { upto: 100, rate: 15.0, isTerminal: false },
                { upto: 500, rate: 12.0, isTerminal: false },
                { upto: null, rate: 8.5, isTerminal: true },
              ],
      };
    } else if (formulaType === 'PF-05') {
      updatedService = {
        ...updatedService,
        quantityDriver: updatedService.quantityDriver || 'flight_turnarounds',
        uom: updatedService.uom || 'FLIGHT',
        timeBands:
          updatedService.timeBands && updatedService.timeBands.length > 0
            ? updatedService.timeBands
            : [
                { start: '06:00', end: '22:00', rate: 100.0 },
                { start: '22:00', end: '06:00', rate: 150.0 },
              ],
      };
    } else if (formulaType === 'PF-06') {
      updatedService = {
        ...updatedService,
        quantityDriver: updatedService.quantityDriver || 'flight_turnarounds',
        uom: updatedService.uom || 'FLIGHT',
        dayRates: updatedService.dayRates || {
          MONDAY: 50.0,
          TUESDAY: 50.0,
          WEDNESDAY: 50.0,
          THURSDAY: 50.0,
          FRIDAY: 50.0,
          SATURDAY: 75.0,
          SUNDAY: 75.0,
        },
      };
    } else if (formulaType === 'PF-07') {
      updatedService = {
        ...updatedService,
        quantityDriver: 'mtow',
        uom: 'TONNE',
        rate: updatedService.rate || '4.75',
      };
    }

    currentServices[fieldIndex] = updatedService;
    form.setFieldsValue({ services: currentServices });
  };

  const onFinish = (values: any) => {
    const payload = {
      airlineId: values.airlineId,
      airportCode: values.airportCode,
      startDate:
        values.dateRange && values.dateRange[0]
          ? values.dateRange[0].format('YYYY-MM-DD')
          : '',
      endDate:
        values.dateRange && values.dateRange[1]
          ? values.dateRange[1].format('YYYY-MM-DD')
          : '',
      currency: values.currency,
      services: (values.services || []).map((s: any) => {
        let qDriver = s.quantityDriver;
        if (s.formulaType === 'PF-02' && s.compoundDrivers && s.compoundDrivers.length > 0) {
          qDriver = s.compoundDrivers.join(',');
        } else if (s.formulaType === 'PF-07') {
          qDriver = 'mtow';
        }

        return {
          chargeCode: s.chargeCode,
          serviceName: s.serviceName,
          formulaType: s.formulaType,
          quantityDriver: qDriver || 'units',
          uom: s.uom || 'UNIT',
          taxCode: s.taxCode || 'VAT-0',
          billingFrequency: s.expectedAmount ? s.billingFrequency : undefined,
          rateDetails: buildRateDetails(s),
        };
      }),
    };

    const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
    const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
    const url = isEditMode ? `/api/contracts/${id}` : '/api/contracts';
    const method = isEditMode ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType),
      },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (res.ok) {
        message.success(isEditMode ? 'Contract updated successfully!' : 'Contract drafted successfully!');
        navigate('/contracts');
      } else {
        res
          .json()
          .then((data) => message.error(data.message || (isEditMode ? 'Failed to update contract.' : 'Failed to create contract.')))
          .catch(() => message.error(isEditMode ? 'Failed to update contract.' : 'Failed to create contract.'));
      }
    });
  };

  const formValues = form.getFieldsValue(true) || {};
  const currentServices = formValues.services || [];
  const selectedAirline = airlines.find((a) => a.iataCode === formValues.airlineId);
  const selectedAirport = airports.find((a) => a.iataCode === formValues.airportCode);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            {isEditMode ? 'Edit Ground Handling Agreement (SGHA)' : 'Create Ground Handling Agreement (SGHA)'}
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
            {isEditMode
              ? 'Update structured turnaround SLAs, service line formulas (PF-01 through PF-07), and multi-tiered rate cards'
              : 'Draft structured turnaround SLAs, service line formulas (PF-01 through PF-07), and multi-tiered rate cards'}
          </p>
        </div>
      </div>

      {/* Main Wizard Form Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <Steps
          current={current}
          items={[
            { title: 'Header Details' },
            { title: 'Service Lines & Formulas' },
            { title: 'Review & Submit' },
          ]}
          className="[&_.ant-steps-item-process_.ant-steps-item-icon]:!bg-slate-900 [&_.ant-steps-item-process_.ant-steps-item-icon]:!border-slate-900 [&_.ant-steps-item-finish_.ant-steps-item-icon]:!border-emerald-600 [&_.ant-steps-item-finish_.ant-steps-icon]:!text-emerald-600 mb-6"
        />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          {/* STEP 1: Header Details */}
          <div className={current === 0 ? 'block space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="airlineId"
                label={<span className="text-xs font-semibold text-slate-700">Airline Carrier</span>}
                rules={[{ required: true, message: 'Please select an airline carrier' }]}
              >
                <Select
                  id="airlineId"
                  showSearch
                  virtual={false}
                  optionFilterProp="label"
                  placeholder="Select Airline Carrier"
                  loading={loadingRefData}
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                >
                  {airlines.map((a) => (
                    <Option key={a.iataCode} value={a.iataCode} label={`${a.name} (${a.iataCode})`}>
                      {a.name} ({a.iataCode})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="airportCode"
                label={<span className="text-xs font-semibold text-slate-700">Station / Airport Hub</span>}
                rules={[{ required: true, message: 'Please select an airport station' }]}
              >
                <Select
                  id="airportCode"
                  showSearch
                  virtual={false}
                  optionFilterProp="label"
                  placeholder="Select Airport Station"
                  loading={loadingRefData}
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                >
                  {airports.map((ap) => (
                    <Option
                      key={ap.iataCode}
                      value={ap.iataCode}
                      label={`${ap.iataCode} - ${ap.name || ap.city || ''}`}
                    >
                      {ap.iataCode} - {ap.name || ap.city}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Form.Item
                name="dateRange"
                label={<span className="text-xs font-semibold text-slate-700">Validity Period</span>}
                rules={[{ required: true, message: 'Please specify agreement validity period' }]}
              >
                <RangePicker
                  placeholder={['Start date', 'End date']}
                  className="w-full [&_.ant-picker]:!rounded-lg [&_.ant-picker-input_input]:!text-xs"
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Form.Item
                name="currency"
                label={<span className="text-xs font-semibold text-slate-700">Billing Currency</span>}
                rules={[{ required: true, message: 'Please select a billing currency' }]}
              >
                <Select
                  id="currency"
                  showSearch
                  virtual={false}
                  optionFilterProp="label"
                  placeholder="Select Currency"
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                >
                  <Option value="USD" label="USD - US Dollar">USD - US Dollar</Option>
                  <Option value="EUR" label="EUR - Euro">EUR - Euro</Option>
                  <Option value="AED" label="AED - UAE Dirham">AED - UAE Dirham</Option>
                  <Option value="GBP" label="GBP - British Pound">GBP - British Pound</Option>
                  <Option value="CHF" label="CHF - Swiss Franc">CHF - Swiss Franc</Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* STEP 2: Service Lines */}
          <div className={current === 1 ? 'block space-y-4' : 'hidden'}>
            <Form.List name="services">
              {(fields, { add, remove }) => (
                <div className="space-y-6">
                  {fields.map(({ key, name, ...restField }) => {
                    const svc = form.getFieldValue('services')?.[name] || {};
                    const selectedFormula = svc.formulaType || 'PF-01';

                    return (
                      <div
                        key={key}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4 relative shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[11px] font-bold">
                              #{name + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Service Line Configuration
                            </span>
                          </div>
                          <button
                            type="button"
                            id={`services_${name}_remove_btn`}
                            onClick={() => remove(name)}
                            className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Row 1: Charge Code, Service Name, Formula Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Form.Item
                            {...restField}
                            name={[name, 'chargeCode']}
                            label={<span className="text-xs font-medium text-slate-700">Charge Code</span>}
                            rules={[{ required: true, message: 'Select charge code' }]}
                          >
                            <Select
                              id={`services_${name}_chargeCode`}
                              showSearch
                              virtual={false}
                              optionFilterProp="label"
                              placeholder="Select Code"
                              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                            >
                              {chargeCodes.map((cc) => (
                                <Option key={cc.code} value={cc.code} label={`${cc.code} ${cc.name ? `(${cc.name})` : ''}`}>
                                  {cc.code}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'serviceName']}
                            label={<span className="text-xs font-medium text-slate-700">Service Name</span>}
                            rules={[{ required: true, message: 'Enter service name' }]}
                          >
                            <Input
                              id={`services_${name}_serviceName`}
                              placeholder="e.g. Turnaround Baggage Handling"
                              className="!text-xs !rounded-lg"
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'formulaType']}
                            label={<span className="text-xs font-medium text-slate-700">Pricing Formula Model</span>}
                            rules={[{ required: true, message: 'Select formula model' }]}
                          >
                            <Select
                              id={`services_${name}_formulaType`}
                              showSearch
                              virtual={false}
                              optionFilterProp="label"
                              placeholder="Select Formula"
                              onChange={(val: string) => handleFormulaChange(val, name)}
                              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                            >
                              <Option value="PF-01" label="PF-01 (Unit Rate)">PF-01 (Unit Rate)</Option>
                              <Option value="PF-02" label="PF-02 (Compound Unit Rate)">PF-02 (Compound Unit Rate)</Option>
                              <Option value="PF-03" label="PF-03 (Tiered Volume)">PF-03 (Tiered Volume)</Option>
                              <Option value="PF-04" label="PF-04 (Slab Rate)">PF-04 (Slab Rate)</Option>
                              <Option value="PF-05" label="PF-05 (Time Band Rate)">PF-05 (Time Band Rate)</Option>
                              <Option value="PF-06" label="PF-06 (Day Rate)">PF-06 (Day Rate)</Option>
                              <Option value="PF-07" label="PF-07 (Custom Formula)">PF-07 (Custom Formula)</Option>
                            </Select>
                          </Form.Item>
                        </div>

                        {/* Row 2: Standard Service Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Form.Item
                            {...restField}
                            name={[name, 'quantityDriver']}
                            label={<span className="text-xs font-medium text-slate-700">Quantity Driver</span>}
                            rules={[{ required: selectedFormula !== 'PF-02', message: 'Driver required' }]}
                          >
                            <Input
                              id={`services_${name}_quantityDriver`}
                              placeholder="e.g. passengers"
                              className="!text-xs !rounded-lg"
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'uom']}
                            label={<span className="text-xs font-medium text-slate-700">UoM (Unit of Measure)</span>}
                            rules={[{ required: true, message: 'UoM required' }]}
                          >
                            <Input
                              id={`services_${name}_uom`}
                              placeholder="e.g. PAX"
                              className="!text-xs !rounded-lg"
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'taxCode']}
                            label={<span className="text-xs font-medium text-slate-700">Tax Code</span>}
                          >
                            <Input
                              id={`services_${name}_taxCode`}
                              placeholder="e.g. VAT-0"
                              className="!text-xs !rounded-lg"
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'billingFrequency']}
                            label={<span className="text-xs font-medium text-slate-700">Billing Frequency</span>}
                          >
                            <Select
                              id={`services_${name}_billingFrequency`}
                              placeholder="Frequency"
                              defaultValue="FLIGHT_MOVEMENT"
                              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                            >
                              <Option value="FLIGHT_MOVEMENT">FLIGHT_MOVEMENT</Option>
                              <Option value="MONTHLY">MONTHLY</Option>
                              <Option value="DAILY">DAILY</Option>
                            </Select>
                          </Form.Item>
                        </div>

                        {/* Dedicated Formula Sub-Editor */}
                        <div className="pt-2">
                          {selectedFormula === 'PF-01' && (
                            <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl">
                              <Form.Item
                                {...restField}
                                name={[name, 'rate']}
                                label={<span className="text-xs font-semibold text-slate-700">Base Unit Rate</span>}
                                rules={[
                                  { required: true, message: 'Base rate required' },
                                  {
                                    validator: async (_, val) => {
                                      if (val === null || val === undefined || val === '') return Promise.resolve();
                                      const num = Number(val);
                                      if (isNaN(num) || num < 0) return Promise.reject(new Error('Rate must be ≥ 0'));
                                      return Promise.resolve();
                                    },
                                  },
                                ]}
                                className="!mb-0 max-w-sm"
                              >
                                <Input
                                  id={`services_${name}_rate`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="12.50"
                                  className="!text-xs !rounded-lg !font-mono"
                                />
                              </Form.Item>
                            </div>
                          )}

                          {selectedFormula === 'PF-02' && (
                            <CompoundDriverEditor fieldIndex={name} form={form} />
                          )}

                          {(selectedFormula === 'PF-03' || selectedFormula === 'PF-04') && (
                            <div className="space-y-3">
                              <Form.Item
                                {...restField}
                                name={[name, 'rate']}
                                label={<span className="text-xs font-medium text-slate-700">Base / Fallback Unit Rate</span>}
                                className="!mb-0 max-w-sm"
                              >
                                <Input
                                  id={`services_${name}_rate`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="e.g. 15.00"
                                  className="!text-xs !rounded-lg !font-mono"
                                />
                              </Form.Item>
                              <TiersEditor fieldIndex={name} form={form} formulaType={selectedFormula} />
                            </div>
                          )}

                          {selectedFormula === 'PF-05' && (
                            <div className="space-y-3">
                              <Form.Item
                                {...restField}
                                name={[name, 'rate']}
                                label={<span className="text-xs font-medium text-slate-700">Standard Base Rate</span>}
                                className="!mb-0 max-w-sm"
                              >
                                <Input
                                  id={`services_${name}_rate`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="e.g. 100.00"
                                  className="!text-xs !rounded-lg !font-mono"
                                />
                              </Form.Item>
                              <TimeBandsEditor fieldIndex={name} form={form} />
                            </div>
                          )}

                          {selectedFormula === 'PF-06' && (
                            <DayRatesEditor fieldIndex={name} form={form} />
                          )}

                          {selectedFormula === 'PF-07' && (
                            <MtowEditor fieldIndex={name} form={form} />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    id="add-service-line-btn"
                    type="button"
                    onClick={() => add()}
                    className="w-full py-3 px-4 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    Add Service Line
                  </button>
                </div>
              )}
            </Form.List>
          </div>

          {/* STEP 3: Review */}
          <div className={current === 2 ? 'block space-y-6' : 'hidden'}>
            {/* Header Summary Banner */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold m-0 tracking-tight text-white">
                    Contract Agreement Review
                  </h2>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold rounded-lg">
                  Draft Ready
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Carrier
                  </span>
                  <div className="font-bold text-white text-sm">
                    {selectedAirline ? `${selectedAirline.name} (${selectedAirline.iataCode})` : formValues.airlineId || '-'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Airport Station
                  </span>
                  <div className="font-bold text-white text-sm">
                    {selectedAirport ? `${selectedAirport.iataCode} (${selectedAirport.name || selectedAirport.city})` : formValues.airportCode || '-'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Validity
                  </span>
                  <div className="font-mono text-white text-xs">
                    {formValues.dateRange && formValues.dateRange[0]
                      ? `${formValues.dateRange[0].format('YYYY-MM-DD')} → ${formValues.dateRange[1].format('YYYY-MM-DD')}`
                      : 'Not set'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Currency
                  </span>
                  <div className="font-bold text-white text-sm font-mono">
                    {formValues.currency || 'USD'}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Lines Visual Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 m-0 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Configured Service Lines ({currentServices.length})</span>
                </h3>
                <span className="text-xs text-slate-500 font-normal">
                  All rate tiers and pricing formulas ready for billing execution
                </span>
              </div>

              {currentServices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                  No service lines configured. Please return to Step 2 and add at least one service.
                </div>
              ) : (
                <div className="space-y-4">
                  {currentServices.map((svc: any, idx: number) => (
                    <FormulaReviewCard
                      key={idx}
                      index={idx}
                      service={svc}
                      currency={formValues.currency || 'USD'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wizard Nav Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
            {current > 0 && (
              <button
                type="button"
                id="contract-wizard-prev-btn"
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
                  {isEditMode ? 'Save Changes' : 'Submit Contract'}
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
