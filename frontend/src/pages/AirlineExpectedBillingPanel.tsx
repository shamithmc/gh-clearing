import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DatePicker, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  TrendingUp,
  Filter,
  RefreshCw,
  LineChart,
  Layers,
  Calendar,
  CalendarDays
} from 'lucide-react';

const { RangePicker } = DatePicker;

interface CurrencySummary {
  currency: string;
  totalExpected: number;
  occurrenceCount: number;
}

interface TimelinePoint {
  date: string;
  currency: string;
  amount: number;
  occurrenceCount: number;
}

interface GroupedAmount {
  key: string;
  currency: string;
  totalExpected: number;
  occurrenceCount: number;
}

interface ProjectionDrilldown {
  expectedDate: string;
  contractId: string;
  serviceId: string;
  supplierId: string;
  airportCode: string;
  serviceType: string;
  serviceName: string;
  billingFrequency: string;
  currency: string;
  expectedAmount: number;
}

interface ExpectedBillingReport {
  startDate?: string;
  endDate?: string;
  summaries: CurrencySummary[];
  timeline: TimelinePoint[];
  bySupplier: GroupedAmount[];
  byAirport: GroupedAmount[];
  byService: GroupedAmount[];
  projections: ProjectionDrilldown[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: ExpectedBillingReport = {
  summaries: [],
  timeline: [],
  bySupplier: [],
  byAirport: [],
  byService: [],
  projections: [],
};

const formatAmount = (amount: number, currency: string) =>
  `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ExpectedBillingLine: React.FC<{
  data: TimelinePoint[];
  currency: string;
  selectedDate?: string;
  onSelect: (date: string) => void;
}> = ({ data, currency, selectedDate, onSelect }) => {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center">
        <LineChart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600 m-0">No expected billing in this date range</p>
      </div>
    );
  }
  const width = 820;
  const height = 260;
  const left = 64;
  const right = 24;
  const top = 24;
  const bottom = 48;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(...data.map(point => Number(point.amount)), 1);
  const timestamps = data.map(point => new Date(`${point.date}T00:00:00Z`).getTime());
  const minimumDate = Math.min(...timestamps);
  const maximumDate = Math.max(...timestamps);
  const dateSpan = Math.max(maximumDate - minimumDate, 1);
  const coordinates = data.map((point, index) => ({
    point,
    x: data.length === 1
      ? left + chartWidth / 2
      : left + ((timestamps[index] - minimumDate) / dateSpan) * chartWidth,
    y: top + chartHeight - (Number(point.amount) / maximum) * chartHeight,
  }));
  const path = coordinates.map(({ x, y }, index) =>
    `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Expected billing day versus amount line chart"
        className="w-full"
        style={{ minWidth: 620, maxHeight: 320 }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#f0f0f0" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8c8c8c">
                {(maximum * ratio).toLocaleString()}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#1677ff" strokeWidth="3" />
        {coordinates.map(({ point, x, y }) => (
          <g
            key={`${point.date}-${point.currency}`}
            data-testid={`afr2-line-point-${point.date}`}
            onClick={() => onSelect(point.date)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={x}
              cy={y}
              r={selectedDate === point.date ? 7 : 5}
              fill={selectedDate === point.date ? '#fa8c16' : '#1677ff'}
              stroke="#fff"
              strokeWidth="2"
            />
            <title>{`${point.date}: ${formatAmount(point.amount, currency)}`}</title>
          </g>
        ))}
        <text x={left} y={height - 14} fontSize="11" fill="#8c8c8c">
          {data[0].date}
        </text>
        <text x={width - right} y={height - 14} textAnchor="end" fontSize="11" fill="#8c8c8c">
          {data[data.length - 1].date}
        </text>
        <text
          x={14}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#595959"
          transform={`rotate(-90 14 ${top + chartHeight / 2})`}
        >
          Amount ({currency})
        </text>
      </svg>
    </div>
  );
};

const DimensionSummary: React.FC<{
  title: string;
  data: GroupedAmount[];
  currency: string;
  testIdPrefix: string;
  onSelect: (value: string) => void;
}> = ({ title, data, currency, testIdPrefix, onSelect }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden h-full">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200/80">
      <Layers className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</span>
    </div>
    <div className="p-4">
      {data.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs text-slate-400 m-0">No data available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 6).map(item => (
            <button
              key={`${item.key}-${item.currency}`}
              data-testid={`${testIdPrefix}-${item.key}`}
              type="button"
              onClick={() => onSelect(item.key)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border-0 bg-transparent text-left cursor-pointer transition-colors"
            >
              <span className="text-xs font-bold text-slate-900">{item.key}</span>
              <span className="text-xs font-semibold text-slate-700">{formatAmount(item.totalExpected, currency)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AirlineExpectedBillingPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<ExpectedBillingReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>();
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
    setSelectedDate(undefined);
    const params = new URLSearchParams();
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    try {
      const response = await fetch(
        `/api/airline/reports/expected-billing?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit expected billing.'
          : 'Expected billing could not be loaded.');
      }
      const nextReport: ExpectedBillingReport = await response.json();
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
      setError(cause instanceof Error ? cause.message : 'Expected billing could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, endDate, headers, serviceType, startDate, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report.summaries.find(item => item.currency === currency);
  const forCurrency = <T extends { currency: string },>(items: T[]) =>
    items.filter(item => item.currency === currency);
  const projectionRows = forCurrency(report.projections)
    .filter(item => !selectedDate || item.expectedDate === selectedDate);
  const columns: TableColumnsType<ProjectionDrilldown> = [
    { title: 'EXPECTED DATE', dataIndex: 'expectedDate', key: 'expectedDate' },
    { title: 'SUPPLIER', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'SERVICE', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'FREQUENCY',
      dataIndex: 'billingFrequency',
      key: 'billingFrequency',
      render: (value: string) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {value}
        </span>
      ),
    },
    {
      title: 'EXPECTED',
      key: 'expectedAmount',
      align: 'right' as const,
      render: (_, item) => (
        <span className="text-xs font-extrabold text-slate-900">
          {formatAmount(item.expectedAmount, item.currency)}
        </span>
      ),
    },
    { title: 'CONTRACT', dataIndex: 'contractId', key: 'contractId' },
  ];

  return (
    <div className="space-y-6 mt-2">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Expected Billing
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                AFR2 contract-frequency projections. Values are estimates, not dispatched invoices
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Projections</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Select
            data-testid="afr2-supplier-filter"
            allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All suppliers" value={supplierId}
            options={knownSuppliers.map(value => ({ value, label: value }))}
            onChange={setSupplierId}
          />
          <Select
            data-testid="afr2-airport-filter"
            allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports" value={airportCode}
            options={airports.map(item => ({
              value: item.iataCode,
              label: `${item.iataCode} — ${item.name}`,
            }))}
            onChange={setAirportCode}
          />
          <Select
            data-testid="afr2-service-filter"
            allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={serviceType}
            options={services.map(item => ({
              value: item.code,
              label: `${item.code} — ${item.displayName}`,
            }))}
            onChange={setServiceType}
          />
          <RangePicker
            data-testid="afr2-date-filter"
            className="w-full [&_input]:!text-xs !rounded-lg"
            onChange={dates => {
              setStartDate(dates?.[0]?.format('YYYY-MM-DD'));
              setEndDate(dates?.[1]?.format('YYYY-MM-DD'));
            }}
          />
          <Select
            data-testid="afr2-currency-filter"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="Currency" value={currency}
            options={report.summaries.map(item => ({
              value: item.currency,
              label: item.currency,
            }))}
            onChange={setCurrency}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {!summary && !loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80">
            <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 m-0">No configured expected billing matches these filters</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div data-testid="afr2-total-expected" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expected</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 m-0">
                  {currency} {Number(summary?.totalExpected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div data-testid="afr2-occurrence-count" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Occurrences</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 m-0">{summary?.occurrenceCount || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projection Window</span>
                </div>
                <p className="text-lg font-extrabold text-slate-900 m-0">
                  {report.startDate || '—'} &rarr; {report.endDate || '—'}
                </p>
              </div>
            </div>

            {/* Chart Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
                <LineChart className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Day vs. Expected Amount</span>
              </div>
              <div className="p-6">
                <ExpectedBillingLine
                  data={forCurrency(report.timeline)}
                  currency={currency || ''}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
              </div>
            </div>

            {/* Dimension Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DimensionSummary
                title="By Supplier"
                data={forCurrency(report.bySupplier)}
                currency={currency || ''}
                testIdPrefix="afr2-supplier"
                onSelect={setSupplierId}
              />
              <DimensionSummary
                title="By Airport"
                data={forCurrency(report.byAirport)}
                currency={currency || ''}
                testIdPrefix="afr2-airport"
                onSelect={setAirportCode}
              />
              <DimensionSummary
                title="By Service"
                data={forCurrency(report.byService)}
                currency={currency || ''}
                testIdPrefix="afr2-service"
                onSelect={setServiceType}
              />
            </div>

            {/* Projection Drill-down Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {selectedDate ? `Expected Amounts — ${selectedDate}` : 'Expected Amount Drill-down'}
                  </span>
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer"
                  >
                    Show all dates
                  </button>
                )}
              </div>
              <Table
                data-testid="afr2-projection-table"
                rowKey={item => `${item.expectedDate}-${item.contractId}-${item.serviceId}`}
                columns={columns}
                dataSource={projectionRows}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: (
                  <div className="py-8 text-center">
                    <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">No projected amounts</p>
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

export default AirlineExpectedBillingPanel;
