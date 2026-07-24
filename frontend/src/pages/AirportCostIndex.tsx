import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Table } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import PricingBenchmarkPanel from './PricingBenchmarkPanel';
import { 
  TrendingUp, 
  Globe, 
  Filter, 
  Layers, 
  DollarSign, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface CostIndexRow {
  airportCode: string;
  airportName: string;
  region: string;
  serviceType: string;
  serviceName: string;
  aircraftType: string;
  operationType: string;
  currency: string;
  averageCost: number;
  observationCount: number;
}

const AirportCostIndex: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [rows, setRows] = useState<CostIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [airport, setAirport] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [service, setService] = useState<string>();
  const [aircraft, setAircraft] = useState<string>();
  const [operation, setOperation] = useState<string>();

  const loadIndex = useCallback(async () => {
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
        `/api/market-intelligence/airport-cost-index?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit market intelligence.'
          : 'Airport cost index could not be loaded.');
      }
      setRows(await response.json());
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Airport cost index could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [aircraft, airport, headers, operation, region, service]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const options = (values: string[]) =>
    [...new Set(values)].sort().map(value => ({ value, label: value }));

  const airportOptions = options(rows.map(row => row.airportCode));
  const regionOptions = options(rows.map(row => row.region));
  const serviceOptions = options(rows.map(row => row.serviceType));
  const aircraftOptions = options(rows.map(row => row.aircraftType));
  const currencies = new Set(rows.map(row => row.currency)).size;

  const columns = [
    {
      title: 'ICAO AIRPORT HUB',
      key: 'airport',
      render: (_: unknown, row: CostIndexRow) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{row.airportCode}</span>
            <span>{row.airportName}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">{row.region}</span>
        </div>
      ),
    },
    {
      title: 'SERVICE DESCRIPTION',
      key: 'service',
      render: (_: unknown, row: CostIndexRow) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-800">{row.serviceName}</span>
          <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
            {row.serviceType}
          </span>
        </div>
      ),
    },
    { 
      title: 'AIRCRAFT TYPE', 
      dataIndex: 'aircraftType', 
      key: 'aircraftType',
      render: (type: string) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          {type}
        </span>
      )
    },
    {
      title: 'OPERATION TYPE',
      dataIndex: 'operationType',
      key: 'operationType',
      render: (value: string) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          value === 'INTERNATIONAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {value}
        </span>
      ),
    },
    {
      title: 'AVERAGE BILLED COST',
      key: 'averageCost',
      align: 'right' as const,
      render: (_: unknown, row: CostIndexRow) => (
        <div className="text-right font-mono text-sm font-bold text-slate-900 tracking-tight">
          {row.currency} {Number(row.averageCost).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      ),
    },
    {
      title: 'OBSERVATIONS',
      dataIndex: 'observationCount',
      key: 'observationCount',
      align: 'right' as const,
      render: (count: number) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {count} Data Points
        </span>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Airport Cost Index & Pricing Intelligence
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Confidentiality-safe billed cost averages</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Minimum 2 supplier data threshold</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadIndex}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Index
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published Segments</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{rows.length}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Airports</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{new Set(rows.map(row => row.airportCode)).size}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Types</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{new Set(rows.map(row => row.serviceType)).size}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currencies</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{currencies}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Benchmark Segment</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select data-testid="cost-index-region-filter" allowClear showSearch optionFilterProp="label" className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All regions" value={region} options={regionOptions} onChange={setRegion} />
          <Select data-testid="cost-index-airport-filter" allowClear showSearch optionFilterProp="label" className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports" value={airport} options={airportOptions} onChange={setAirport} />
          <Select data-testid="cost-index-service-filter" allowClear showSearch optionFilterProp="label" className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={service} options={serviceOptions} onChange={setService} />
          <Select data-testid="cost-index-aircraft-filter" allowClear showSearch optionFilterProp="label" className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All aircraft" value={aircraft} options={aircraftOptions} onChange={setAircraft} />
          <Select data-testid="cost-index-operation-filter" allowClear showSearch optionFilterProp="label" className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All operations" value={operation}
            options={['DOMESTIC', 'INTERNATIONAL'].map(value => ({ value, label: value }))}
            onChange={setOperation} />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            data-testid="airport-cost-index-table"
            columns={columns}
            dataSource={rows}
            rowKey={row => [
              row.airportCode,
              row.serviceType,
              row.aircraftType,
              row.operationType,
              row.currency,
            ].join('-')}
            size="small"
            pagination={{ pageSize: 10, className: "px-4 py-2" }}
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
            locale={{ emptyText: <div className="py-12 text-center text-xs text-slate-400">No confidentiality-safe cost segments match the selected filters</div> }}
          />
        </Spin>
      </div>

      <PricingBenchmarkPanel />

    </div>
  );
};

export default AirportCostIndex;
