import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Table, Tabs } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  Globe,
  MapPin,
  Users,
  Layers,
  Receipt,
  Filter,
  RefreshCw
} from 'lucide-react';

interface CurrencyMetric {
  currency: string;
  monthlyContractValue: number;
  invoicedValue: number;
  invoiceCount: number;
}

interface AirportFootprint {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  suppliers: string[];
  serviceTypes: string[];
  financials: CurrencyMetric[];
}

interface ServiceRate {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  billingFrequency?: string;
  monthlyExpectedValue: number;
}

interface ContractDrilldown {
  contractId: string;
  supplierId: string;
  airportCode: string;
  startDate: string;
  endDate: string;
  currency: string;
  services: ServiceRate[];
}

interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  airportCode: string;
  issueDate: string;
  status: string;
  currency: string;
  invoicedValue: number;
  serviceTypes: string[];
}

interface FootprintReport {
  asOfDate?: string;
  invoicedFromDate?: string;
  summary: {
    airportCount: number;
    supplierCount: number;
    serviceCount: number;
    activeContractCount: number;
    dispatchedInvoiceCount: number;
  };
  airports: AirportFootprint[];
  contracts: ContractDrilldown[];
  invoices: InvoiceSummary[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: FootprintReport = {
  summary: {
    airportCount: 0,
    supplierCount: 0,
    serviceCount: 0,
    activeContractCount: 0,
    dispatchedInvoiceCount: 0,
  },
  airports: [],
  contracts: [],
  invoices: [],
};

const formatAmount = (value: number, currency: string) =>
  `${currency} ${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CurrentFootprintMap: React.FC<{
  airports: AirportFootprint[];
  selectedAirport?: string;
  hoveredAirport?: string;
  onSelect: (airportCode: string) => void;
  onHover: (airportCode?: string) => void;
}> = ({ airports, selectedAirport, hoveredAirport, onSelect, onHover }) => {
  if (airports.length === 0) {
    return (
      <div className="py-8 text-center">
        <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600 m-0">No active contracted airports to plot</p>
      </div>
    );
  }
  const width = 900;
  const height = 440;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  });
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="World map of the airline current ground-handling footprint"
        className="w-full rounded-xl"
        style={{
          minWidth: 680,
          background: 'linear-gradient(180deg, #e6f4ff 0%, #f6ffed 100%)',
        }}
      >
        <g fill="#d9e7d0" stroke="#b7c9ab" strokeWidth="1.5">
          <path d="M40 95 L105 55 205 70 255 115 225 165 170 175 135 220 85 200 55 150 Z" />
          <path d="M220 225 L255 245 275 315 250 400 215 340 205 275 Z" />
          <path d="M385 75 L430 55 485 75 510 110 485 130 435 125 405 105 Z" />
          <path d="M430 135 L500 130 535 185 520 285 475 350 440 285 420 205 Z" />
          <path d="M500 85 L610 55 745 85 830 135 795 190 690 180 625 230 550 190 510 135 Z" />
          <path d="M710 270 L775 255 835 295 820 350 750 360 700 320 Z" />
        </g>
        {airports.map(airport => {
          const { x, y } = project(Number(airport.latitude), Number(airport.longitude));
          const active = selectedAirport === airport.airportCode
            || hoveredAirport === airport.airportCode;
          const radius = 9 + Math.min(airport.suppliers.length + airport.serviceTypes.length, 6);
          return (
            <g
              key={airport.airportCode}
              data-testid={`aor2-map-${airport.airportCode}`}
              role="button"
              tabIndex={0}
              aria-label={`${airport.airportCode} current footprint`}
              onMouseEnter={() => onHover(airport.airportCode)}
              onMouseLeave={() => onHover(undefined)}
              onFocus={() => onHover(airport.airportCode)}
              onBlur={() => onHover(undefined)}
              onClick={() => onSelect(airport.airportCode)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(airport.airportCode);
                }
              }}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle
                cx={x}
                cy={y}
                r={radius + 7}
                fill={active ? '#fa8c16' : '#1677ff'}
                opacity="0.22"
              />
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={active ? '#fa8c16' : '#1677ff'}
                stroke="#fff"
                strokeWidth="3"
              />
              <text
                x={x}
                y={y - radius - 7}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#262626"
                stroke="#fff"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {airport.airportCode}
              </text>
              <title>
                {`${airport.airportName}; suppliers: ${airport.suppliers.join(', ')}; `
                  + `services: ${airport.serviceTypes.join(', ')}`}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AirlineCurrentFootprintPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<FootprintReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [knownCurrencies, setKnownCurrencies] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [historyMonths, setHistoryMonths] = useState(12);
  const [selectedAirport, setSelectedAirport] = useState<string>();
  const [hoveredAirport, setHoveredAirport] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers })
        .then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers })
        .then(response => response.ok ? response.json() : []),
    ]).then(([airportData, serviceData]) => {
      setAirports(airportData);
      setServices(serviceData);
    }).catch(() => {
      setAirports([]);
      setServices([]);
    });
  }, [headers]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setSelectedAirport(undefined);
    const params = new URLSearchParams({ historyMonths: String(historyMonths) });
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (currency) params.set('currency', currency);
    try {
      const response = await fetch(
        `/api/airline/reports/current-footprint?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit current-footprint reporting.'
          : 'Current footprint could not be loaded.');
      }
      const nextReport: FootprintReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.airports.flatMap(item => item.suppliers),
      ])].sort());
      setKnownCurrencies(current => [...new Set([
        ...current,
        ...nextReport.airports.flatMap(item =>
          item.financials.map(financial => financial.currency)),
      ])].sort());
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Current footprint could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, currency, headers, historyMonths, serviceType, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeAirportCode = hoveredAirport || selectedAirport;
  const activeAirport = report.airports.find(item => item.airportCode === activeAirportCode);
  const contractRows = selectedAirport
    ? report.contracts.filter(item => item.airportCode === selectedAirport)
    : report.contracts;
  const invoiceRows = selectedAirport
    ? report.invoices.filter(item => item.airportCode === selectedAirport)
    : report.invoices;
  const contractColumns: TableColumnsType<ContractDrilldown> = [
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'SUPPLIER', dataIndex: 'supplierId', key: 'supplierId' },
    {
      title: 'SERVICES & MONTHLY VALUES',
      key: 'services',
      render: (_, contract) => (
        <div className="space-y-1.5">
          {contract.services.map(service => (
            <div key={service.serviceId} className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                {service.serviceType}
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {formatAmount(service.monthlyExpectedValue, contract.currency)}
              </span>
              <span className="text-xs text-slate-400">{service.billingFrequency || 'Not scheduled'}</span>
            </div>
          ))}
        </div>
      ),
    },
    { title: 'VALID FROM', dataIndex: 'startDate', key: 'startDate' },
    { title: 'VALID TO', dataIndex: 'endDate', key: 'endDate' },
  ];
  const invoiceColumns: TableColumnsType<InvoiceSummary> = [
    { title: 'INVOICE', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'SUPPLIER', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'ISSUE DATE', dataIndex: 'issueDate', key: 'issueDate' },
    {
      title: 'SERVICES',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: (values: string[]) => (
        <div className="flex items-center gap-1 flex-wrap">
          {values.map(value => (
            <span key={value} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
              {value}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: 'INVOICED',
      key: 'invoicedValue',
      align: 'right' as const,
      render: (_, invoice) => (
        <span className="text-xs font-extrabold text-slate-900">
          {formatAmount(invoice.invoicedValue, invoice.currency)}
        </span>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {value}
        </span>
      ),
    },
  ];

  const tableStyle = "[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60";

  return (
    <div className="space-y-6 mt-2">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Current Footprint
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                AOR2 active airports, suppliers, services, monthly values, and invoice history
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadReport}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Data
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Footprint</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Select data-testid="aor2-supplier-filter" allowClear showSearch
            optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All suppliers" value={supplierId}
            options={knownSuppliers.map(value => ({ value, label: value }))}
            onChange={setSupplierId} />
          <Select data-testid="aor2-airport-filter" allowClear showSearch
            optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports" value={airportCode}
            options={airports.map(item => ({
              value: item.iataCode, label: `${item.iataCode} — ${item.name}`,
            }))} onChange={setAirportCode} />
          <Select data-testid="aor2-service-filter" allowClear showSearch
            optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={serviceType}
            options={services.map(item => ({
              value: item.code, label: `${item.code} — ${item.displayName}`,
            }))} onChange={setServiceType} />
          <Select data-testid="aor2-currency-filter" allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All currencies" value={currency}
            options={knownCurrencies.map(value => ({ value, label: value }))}
            onChange={setCurrency} />
          <Select data-testid="aor2-history-filter"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            value={historyMonths} options={[3, 6, 12, 24].map(value => ({
              value, label: `${value} months of invoices`,
            }))} onChange={setHistoryMonths} />
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div data-testid="aor2-airports" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Airports</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.airportCount}</p>
            </div>
            <div data-testid="aor2-suppliers" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suppliers</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.supplierCount}</p>
            </div>
            <div data-testid="aor2-services" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Services</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.serviceCount}</p>
            </div>
            <div data-testid="aor2-invoices" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatched Invoices</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.dispatchedInvoiceCount}</p>
            </div>
          </div>

          {/* Map Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Airline Ground-Handling Footprint</span>
            </div>
            <div className="p-4">
              <CurrentFootprintMap airports={report.airports}
                selectedAirport={selectedAirport} hoveredAirport={hoveredAirport}
                onSelect={setSelectedAirport} onHover={setHoveredAirport} />
              {activeAirport && (
                <div data-testid={`aor2-hover-${activeAirport.airportCode}`}
                  className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-900 m-0">
                      {activeAirport.airportCode} — {activeAirport.airportName}
                    </h3>
                    <span className="text-xs text-slate-600">{activeAirport.city}, {activeAirport.country}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeAirport.suppliers.map(value => (
                        <span key={value} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">{value}</span>
                      ))}
                      {activeAirport.serviceTypes.map(value => (
                        <span key={value} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">{value}</span>
                      ))}
                    </div>
                    {activeAirport.financials.map(financial => (
                      <p key={financial.currency} className="text-xs text-slate-600 m-0">
                        {financial.currency}: monthly contract value{' '}
                        <strong className="text-slate-900">{formatAmount(financial.monthlyContractValue, financial.currency)}</strong>
                        {' · '}invoiced since {report.invoicedFromDate}{' '}
                        <strong className="text-slate-900">{formatAmount(financial.invoicedValue, financial.currency)}</strong>
                        {' · '}{financial.invoiceCount} invoice(s)
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contract & Invoice Drill-down */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {selectedAirport
                  ? `Drill-down — ${selectedAirport}`
                  : 'Contract and Invoice Drill-down'}
              </span>
            </div>
            <div className="p-4">
              <Tabs items={[
                {
                  key: 'contracts',
                  label: `Contracts (${contractRows.length})`,
                  children: <Table data-testid="aor2-contract-table"
                    rowKey="contractId" columns={contractColumns}
                    dataSource={contractRows} pagination={{ pageSize: 10 }} scroll={{ x: 900 }}
                    className={tableStyle} />,
                },
                {
                  key: 'invoices',
                  label: `Invoices (${invoiceRows.length})`,
                  children: <Table data-testid="aor2-invoice-table"
                    rowKey="invoiceId" columns={invoiceColumns}
                    dataSource={invoiceRows} pagination={{ pageSize: 10 }} scroll={{ x: 900 }}
                    className={tableStyle} />,
                },
              ]} />
            </div>
          </div>

        </div>
      </Spin>

    </div>
  );
};

export default AirlineCurrentFootprintPanel;
