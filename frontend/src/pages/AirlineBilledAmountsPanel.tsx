import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DatePicker, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  DollarSign,
  Filter,
  ExternalLink,
  PieChart,
  BarChart3,
  Receipt,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const { RangePicker } = DatePicker;

interface CurrencySummary {
  currency: string;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface GroupedAmount {
  key: string;
  currency: string;
  totalBilled: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface InvoiceDrilldown {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  airportCode: string;
  issueDate: string;
  dueDate: string;
  status: 'SENT' | 'DISPUTED' | 'PAID';
  currency: string;
  invoiceTotal: number;
  filteredAmount: number;
  serviceTypes: string[];
}

interface BilledAmountsReport {
  summaries: CurrencySummary[];
  bySupplier: GroupedAmount[];
  byAirport: GroupedAmount[];
  byService: GroupedAmount[];
  invoices: InvoiceDrilldown[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: BilledAmountsReport = {
  summaries: [],
  bySupplier: [],
  byAirport: [],
  byService: [],
  invoices: [],
};

const colors = ['#1677ff', '#13c2c2', '#52c41a', '#faad14', '#722ed1', '#eb2f96'];

const formatAmount = (amount: number, currency: string) =>
  `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusColor: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISPUTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
};

const SupplierPie: React.FC<{
  data: GroupedAmount[];
  currency: string;
  onSelect: (supplierId: string) => void;
}> = ({ data, currency, onSelect }) => {
  const total = data.reduce((sum, item) => sum + Number(item.totalBilled), 0);
  if (data.length === 0 || total <= 0) {
    return (
      <div className="py-6 text-center">
        <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500 m-0">No supplier billing for this currency</p>
      </div>
    );
  }
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="180" height="180" viewBox="0 0 120 120" aria-label="Supplier billed amounts pie chart">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f0f0f0" strokeWidth="16" />
          {data.map((item, index) => {
            const length = (Number(item.totalBilled) / total) * circumference;
            const offset = -consumed;
            consumed += length;
            return (
              <circle
                key={`${item.key}-${item.currency}`}
                data-testid={`supplier-pie-${item.key}`}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={offset}
                onClick={() => onSelect(item.key)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>
        <text x="60" y="57" textAnchor="middle" fontSize="9" fill="#8c8c8c">TOTAL</text>
        <text x="60" y="70" textAnchor="middle" fontSize="10" fontWeight="bold">
          {formatAmount(total, currency)}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((item, index) => (
          <button key={item.key} type="button" onClick={() => onSelect(item.key)}
            className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-xs font-bold text-slate-900">{item.key}</span>
            <span className="text-xs text-slate-500">{formatAmount(item.totalBilled, currency)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const BreakdownBars: React.FC<{
  data: GroupedAmount[];
  currency: string;
  testIdPrefix: string;
  onSelect: (key: string) => void;
}> = ({ data, currency, testIdPrefix, onSelect }) => {
  const maximum = Math.max(...data.map(item => Number(item.totalBilled)), 0);
  if (data.length === 0 || maximum <= 0) {
    return (
      <div className="py-6 text-center">
        <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500 m-0">No billed amounts for this dimension</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 w-full">
      {data.map(item => (
        <button
          key={`${item.key}-${item.currency}`}
          data-testid={`${testIdPrefix}-${item.key}`}
          type="button"
          onClick={() => onSelect(item.key)}
          className="border-0 bg-transparent p-0 w-full cursor-pointer text-left"
        >
          <div className="flex justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">{item.key}</span>
            <span className="text-xs font-semibold text-slate-700">{formatAmount(item.totalBilled, currency)}</span>
          </div>
          <div className="h-3 rounded-lg bg-slate-100 overflow-hidden">
            <div className="h-full rounded-lg"
              style={{
                width: `${(Number(item.totalBilled) / maximum) * 100}%`,
                background: 'linear-gradient(90deg, #1677ff, #69b1ff)',
              }} />
          </div>
        </button>
      ))}
    </div>
  );
};

const AirlineBilledAmountsPanel: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<BilledAmountsReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
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
    const params = new URLSearchParams();
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    try {
      const response = await fetch(
        `/api/airline/reports/billed-amounts?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit airline financial reports.'
          : 'Billed amounts could not be loaded.');
      }
      const nextReport: BilledAmountsReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.bySupplier.map(item => item.key),
      ])].sort());
      setCurrency(current => nextReport.summaries.some(item => item.currency === current)
        ? current
        : nextReport.summaries[0]?.currency);
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Billed amounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, endDate, headers, serviceType, startDate, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report.summaries.find(item => item.currency === currency);
  const forCurrency = (items: GroupedAmount[]) =>
    items.filter(item => item.currency === currency);
  const invoiceRows = report.invoices.filter(invoice => invoice.currency === currency);

  const invoiceColumns: TableColumnsType<InvoiceDrilldown> = [
    { title: 'INVOICE', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'SUPPLIER', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
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
      title: 'BILLED',
      key: 'filteredAmount',
      align: 'right' as const,
      render: (_, invoice) => (
        <span className="text-xs font-extrabold text-slate-900">
          {formatAmount(invoice.filteredAmount, invoice.currency)}
        </span>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[value] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 mt-2">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Billed Amounts
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                AFR1 supplier billing by airport and service, with invoice-level drill-down
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/airline/invoices')}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          Open Invoice Workspace
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Billing</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Select data-testid="afr1-supplier-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All suppliers" value={supplierId}
            options={knownSuppliers.map(value => ({ value, label: value }))} onChange={setSupplierId} />
          <Select data-testid="afr1-airport-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports" value={airportCode}
            options={airports.map(item => ({ value: item.iataCode, label: `${item.iataCode} — ${item.name}` }))}
            onChange={setAirportCode} />
          <Select data-testid="afr1-service-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={serviceType}
            options={services.map(item => ({ value: item.code, label: `${item.code} — ${item.displayName}` }))}
            onChange={setServiceType} />
          <RangePicker data-testid="afr1-date-filter"
            className="w-full [&_input]:!text-xs !rounded-lg"
            onChange={dates => {
              setStartDate(dates?.[0]?.format('YYYY-MM-DD'));
              setEndDate(dates?.[1]?.format('YYYY-MM-DD'));
            }} />
          <Select data-testid="afr1-currency-filter"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="Currency" value={currency}
            options={report.summaries.map(item => ({ value: item.currency, label: item.currency }))}
            onChange={setCurrency} />
        </div>
      </div>

      <Spin spinning={loading}>
        {!summary && !loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80">
            <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 m-0">No dispatched billing matches the selected filters</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div data-testid="afr1-total-billed" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Billed</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 m-0">
                  {currency} {Number(summary?.totalBilled || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div data-testid="afr1-total-paid" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</span>
                </div>
                <p className="text-2xl font-extrabold text-emerald-600 m-0">
                  {currency} {Number(summary?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div data-testid="afr1-total-outstanding" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</span>
                </div>
                <p className="text-2xl font-extrabold text-rose-600 m-0">
                  {currency} {Number(summary?.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div data-testid="afr1-invoice-count" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoices</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 m-0">{summary?.invoiceCount || 0}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
                  <PieChart className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier Share</span>
                </div>
                <div className="p-6">
                  <SupplierPie data={forCurrency(report.bySupplier)} currency={currency || ''} onSelect={setSupplierId} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Airport-wise Billing</span>
                </div>
                <div className="p-6">
                  <BreakdownBars data={forCurrency(report.byAirport)} currency={currency || ''}
                    testIdPrefix="afr1-airport-bar" onSelect={setAirportCode} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden xl:col-span-2">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Service-wise Billing</span>
                </div>
                <div className="p-6">
                  <BreakdownBars data={forCurrency(report.byService)} currency={currency || ''}
                    testIdPrefix="afr1-service-bar" onSelect={setServiceType} />
                </div>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
                <Receipt className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice Drill-down</span>
              </div>
              <Table data-testid="afr1-invoice-table" rowKey="id" columns={invoiceColumns}
                dataSource={invoiceRows} pagination={{ pageSize: 10 }}
                locale={{ emptyText: (
                  <div className="py-8 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">No invoices match the selected report filters</p>
                  </div>
                )}}
                scroll={{ x: 900 }}
                className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
              />
            </div>

          </div>
        )}
      </Spin>

    </div>
  );
};

export default AirlineBilledAmountsPanel;
