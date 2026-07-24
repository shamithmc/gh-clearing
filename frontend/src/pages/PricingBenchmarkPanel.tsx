import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Table } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  BarChart3,
  Filter,
  RefreshCw,
  TrendingUp,
  Gauge,
  ArrowDown,
  Layers
} from 'lucide-react';

interface PricingBenchmarkRow {
  airportCode: string;
  airportName: string;
  region: string;
  serviceType: string;
  serviceName: string;
  aircraftType: string;
  operationType: string;
  currency: string;
  airlineAverageCost: number;
  airlineObservationCount: number;
  marketPosition: string;
}

const positionPresentation: Record<string, { label: string; className: string }> = {
  TOP_25_PERCENT_PREMIUM: { label: 'Top 25% — Premium', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  MID_50_PERCENT: { label: 'Mid 50% — Market Range', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  BOTTOM_25_PERCENT_DISCOUNT: { label: 'Bottom 25% — Discount', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PricingBenchmarkPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [rows, setRows] = useState<PricingBenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [airport, setAirport] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [service, setService] = useState<string>();
  const [aircraft, setAircraft] = useState<string>();
  const [operation, setOperation] = useState<string>();
  const [position, setPosition] = useState<string>();

  const loadBenchmarks = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airport) params.set('airportCode', airport);
    if (region) params.set('region', region);
    if (service) params.set('serviceType', service);
    if (aircraft) params.set('aircraftType', aircraft);
    if (operation) params.set('operationType', operation);
    try {
      const response = await fetch(
        `/api/market-intelligence/pricing-benchmarks?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit pricing benchmarks.'
          : 'Pricing benchmarks could not be loaded.');
      }
      setRows(await response.json());
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Pricing benchmarks could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [aircraft, airport, headers, operation, region, service]);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  const options = (values: string[]) =>
    [...new Set(values)].sort().map(value => ({ value, label: value }));
  const visibleRows = position
    ? rows.filter(row => row.marketPosition === position)
    : rows;

  const premiumCount = rows.filter(row => row.marketPosition === 'TOP_25_PERCENT_PREMIUM').length;
  const midCount = rows.filter(row => row.marketPosition === 'MID_50_PERCENT').length;
  const discountCount = rows.filter(row => row.marketPosition === 'BOTTOM_25_PERCENT_DISCOUNT').length;

  const columns = [
    {
      title: 'AIRPORT',
      key: 'airport',
      render: (_: unknown, row: PricingBenchmarkRow) => (
        <div>
          <span className="text-xs font-bold text-slate-900">{row.airportCode} — {row.airportName}</span>
          <span className="block text-[11px] text-slate-500">{row.region}</span>
        </div>
      ),
    },
    {
      title: 'SERVICE',
      key: 'service',
      render: (_: unknown, row: PricingBenchmarkRow) => (
        <div>
          <span className="text-xs font-semibold text-slate-800">{row.serviceName}</span>
          <span className="block text-[11px] text-slate-500">{row.serviceType}</span>
        </div>
      ),
    },
    { title: 'AIRCRAFT', dataIndex: 'aircraftType', key: 'aircraftType' },
    {
      title: 'OPERATION',
      dataIndex: 'operationType',
      key: 'operationType',
      render: (value: string) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
          {value}
        </span>
      ),
    },
    {
      title: 'YOUR AVG COST',
      key: 'airlineAverageCost',
      align: 'right' as const,
      render: (_: unknown, row: PricingBenchmarkRow) => (
        <span className="text-xs font-extrabold text-slate-900">
          {row.currency} {Number(row.airlineAverageCost).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: 'MARKET POSITION',
      dataIndex: 'marketPosition',
      key: 'marketPosition',
      render: (value: string) => {
        const presentation = positionPresentation[value] || { label: value, className: 'bg-slate-50 text-slate-600 border-slate-200' };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${presentation.className}`}>
            {presentation.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 mt-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Pricing Benchmark
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                See where your billed rates sit in the market without exposing competitor rates or supplier identities
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadBenchmarks}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Data
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Segments</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 m-0">{rows.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium</span>
          </div>
          <p className="text-2xl font-extrabold text-orange-600 m-0">{premiumCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Market Range</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 m-0">{midCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 m-0">{discountCount}</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Benchmarks</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <Select data-testid="benchmark-region-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All regions" value={region} options={options(rows.map(row => row.region))}
            onChange={setRegion} />
          <Select data-testid="benchmark-airport-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports" value={airport} options={options(rows.map(row => row.airportCode))}
            onChange={setAirport} />
          <Select data-testid="benchmark-service-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={service} options={options(rows.map(row => row.serviceType))}
            onChange={setService} />
          <Select data-testid="benchmark-aircraft-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All aircraft" value={aircraft} options={options(rows.map(row => row.aircraftType))}
            onChange={setAircraft} />
          <Select data-testid="benchmark-operation-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All operations" value={operation}
            options={['DOMESTIC', 'INTERNATIONAL'].map(value => ({ value, label: value }))}
            onChange={setOperation} />
          <Select data-testid="benchmark-position-filter" allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All positions" value={position}
            options={Object.entries(positionPresentation).map(([value, item]) => ({
              value,
              label: item.label,
            }))}
            onChange={setPosition} />
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            data-testid="pricing-benchmark-table"
            columns={columns}
            dataSource={visibleRows}
            rowKey={row => [
              row.airportCode,
              row.serviceType,
              row.aircraftType,
              row.operationType,
              row.currency,
            ].join('-')}
            pagination={{ pageSize: 50 }}
            locale={{ emptyText: (
              <div className="py-8 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 m-0">No confidentiality-safe benchmarks match the selected filters</p>
              </div>
            )}}
            scroll={{ x: 900 }}
            className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
          />
        </Spin>
      </div>

    </div>
  );
};

export default PricingBenchmarkPanel;
