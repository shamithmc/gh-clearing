import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  Clock,
  Filter,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Timer,
  Eye,
  Globe
} from 'lucide-react';

interface ExpirySummary {
  totalContracts: number;
  expiringWithin30Days: number;
  expiringWithin60Days: number;
  expiringAfter60Days: number;
  airportCount: number;
}

interface AirportExpiryPoint {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  contractCount: number;
  nearestExpiryDays: number;
  suppliers: string[];
  serviceTypes: string[];
}

interface ExpiringContract {
  contractId: string;
  supplierId: string;
  airportCode: string;
  airportName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  urgency: 'URGENT' | 'UPCOMING' | 'MONITOR';
  currency: string;
  serviceTypes: string[];
}

interface ContractExpiryReport {
  asOfDate?: string;
  horizonDays: number;
  summary: ExpirySummary;
  airports: AirportExpiryPoint[];
  contracts: ExpiringContract[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: ContractExpiryReport = {
  horizonDays: 90,
  summary: {
    totalContracts: 0,
    expiringWithin30Days: 0,
    expiringWithin60Days: 0,
    expiringAfter60Days: 0,
    airportCount: 0,
  },
  airports: [],
  contracts: [],
};

const urgencyColor = (days: number) => {
  if (days <= 30) return '#cf1322';
  if (days <= 60) return '#fa8c16';
  return '#d4b106';
};

const urgencyTagClass: Record<string, string> = {
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
  UPCOMING: 'bg-orange-50 text-orange-700 border-orange-200',
  MONITOR: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ExpiryWorldMap: React.FC<{
  airports: AirportExpiryPoint[];
  onSelect: (airportCode: string) => void;
}> = ({ airports, onSelect }) => {
  if (airports.length === 0) {
    return (
      <div className="py-8 text-center">
        <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600 m-0">No expiring contracts to plot</p>
      </div>
    );
  }
  const width = 900;
  const height = 440;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  });
  const handleKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    airportCode: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(airportCode);
    }
  };

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="World map of airports with contracts approaching expiry"
        className="w-full rounded-xl"
        style={{
          minWidth: 680,
          background: 'linear-gradient(180deg, #e6f4ff 0%, #f6ffed 100%)',
        }}
      >
        <g fill="#d9e7d0" stroke="#b7c9ab" strokeWidth="1.5" opacity="0.95">
          <path d="M40 95 L105 55 205 70 255 115 225 165 170 175 135 220 85 200 55 150 Z" />
          <path d="M220 225 L255 245 275 315 250 400 215 340 205 275 Z" />
          <path d="M385 75 L430 55 485 75 510 110 485 130 435 125 405 105 Z" />
          <path d="M430 135 L500 130 535 185 520 285 475 350 440 285 420 205 Z" />
          <path d="M500 85 L610 55 745 85 830 135 795 190 690 180 625 230 550 190 510 135 Z" />
          <path d="M710 270 L775 255 835 295 820 350 750 360 700 320 Z" />
        </g>
        <g stroke="#fff" strokeWidth="1" opacity="0.45">
          {[-120, -60, 0, 60, 120].map(longitude => {
            const { x } = project(0, longitude);
            return <line key={longitude} x1={x} x2={x} y1="0" y2={height} />;
          })}
          {[-60, -30, 0, 30, 60].map(latitude => {
            const { y } = project(latitude, 0);
            return <line key={latitude} x1="0" x2={width} y1={y} y2={y} />;
          })}
        </g>
        {airports.map(airport => {
          const { x, y } = project(Number(airport.latitude), Number(airport.longitude));
          const color = urgencyColor(airport.nearestExpiryDays);
          const radius = 8 + Math.min(airport.contractCount, 5) * 2;
          return (
            <g
              key={airport.airportCode}
              data-testid={`aor1-map-${airport.airportCode}`}
              role="button"
              tabIndex={0}
              aria-label={`${airport.airportCode}, ${airport.contractCount} expiring contracts`}
              onClick={() => onSelect(airport.airportCode)}
              onKeyDown={event => handleKeyDown(event, airport.airportCode)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle cx={x} cy={y} r={radius + 5} fill={color} opacity="0.2" />
              <circle cx={x} cy={y} r={radius} fill={color} stroke="#fff" strokeWidth="3" />
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
                {`${airport.airportName} — ${airport.contractCount} contract(s), `
                  + `nearest expiry in ${airport.nearestExpiryDays} days; `
                  + `suppliers: ${airport.suppliers.join(', ')}; `
                  + `services: ${airport.serviceTypes.join(', ')}`}
              </title>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 flex-wrap mt-3">
        <span className="text-xs text-slate-600"><span style={{ color: '#cf1322' }}>●</span> 0–30 days</span>
        <span className="text-xs text-slate-600"><span style={{ color: '#fa8c16' }}>●</span> 31–60 days</span>
        <span className="text-xs text-slate-600"><span style={{ color: '#d4b106' }}>●</span> 61+ days</span>
        <span className="text-xs text-slate-400">Marker size reflects contract count. Select an airport to filter.</span>
      </div>
    </div>
  );
};

const AirlineContractExpiryPanel: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<ContractExpiryReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [horizonDays, setHorizonDays] = useState(90);
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
    const params = new URLSearchParams({ horizonDays: String(horizonDays) });
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    try {
      const response = await fetch(
        `/api/airline/reports/contract-expiry?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit contract-expiry reporting.'
          : 'Contract expiry could not be loaded.');
      }
      const nextReport: ContractExpiryReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.contracts.map(contract => contract.supplierId),
      ])].sort());
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Contract expiry could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, headers, horizonDays, serviceType, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const columns: TableColumnsType<ExpiringContract> = [
    {
      title: 'AIRPORT',
      key: 'airport',
      render: (_, contract) => (
        <div>
          <span className="text-xs font-bold text-slate-900">{contract.airportCode}</span>
          <span className="block text-[11px] text-slate-500">{contract.airportName}</span>
        </div>
      ),
    },
    { title: 'SUPPLIER', dataIndex: 'supplierId', key: 'supplierId' },
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
    { title: 'START DATE', dataIndex: 'startDate', key: 'startDate' },
    { title: 'END DATE', dataIndex: 'endDate', key: 'endDate' },
    {
      title: 'EXPIRY',
      key: 'expiry',
      sorter: (left, right) => left.daysRemaining - right.daysRemaining,
      render: (_, contract) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${urgencyTagClass[contract.urgency] || 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {contract.daysRemaining === 0 ? 'Expires today' : `${contract.daysRemaining} days`}
        </span>
      ),
    },
    { title: 'CURRENCY', dataIndex: 'currency', key: 'currency' },
    {
      title: 'CONTRACT',
      key: 'contract',
      align: 'right' as const,
      render: (_, contract) => (
        <button
          onClick={() => navigate(
            `/airline/contracts?airportCode=${contract.airportCode}`,
          )}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
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
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Contracts Approaching Expiry
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                AOR1 upcoming supplier-contract renewals in table and geographic views
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Contracts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Select
            data-testid="aor1-supplier-filter"
            allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All suppliers" value={supplierId}
            options={knownSuppliers.map(value => ({ value, label: value }))}
            onChange={setSupplierId}
          />
          <Select
            data-testid="aor1-airport-filter"
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
            data-testid="aor1-service-filter"
            allowClear showSearch optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services" value={serviceType}
            options={services.map(item => ({
              value: item.code,
              label: `${item.code} — ${item.displayName}`,
            }))}
            onChange={setServiceType}
          />
          <Select
            data-testid="aor1-horizon-filter"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            value={horizonDays}
            options={[30, 60, 90, 180, 365].map(value => ({
              value,
              label: `Next ${value} days`,
            }))}
            onChange={setHorizonDays}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div data-testid="aor1-total-contracts" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approaching Expiry</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.totalContracts}</p>
            </div>
            <div data-testid="aor1-urgent-contracts" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Within 30 Days</span>
              </div>
              <p className="text-2xl font-extrabold text-rose-600 m-0">{report.summary.expiringWithin30Days}</p>
            </div>
            <div data-testid="aor1-upcoming-contracts" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">31–60 Days</span>
              </div>
              <p className="text-2xl font-extrabold text-orange-600 m-0">{report.summary.expiringWithin60Days}</p>
            </div>
            <div data-testid="aor1-airport-count" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Airports</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 m-0">{report.summary.airportCount}</p>
            </div>
          </div>

          {/* Map Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Expiry Map</span>
            </div>
            <div className="p-4">
              <ExpiryWorldMap airports={report.airports} onSelect={setAirportCode} />
            </div>
          </div>

          {/* Contract Expiry Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Contract Expiry Table — as of {report.asOfDate || 'today'}
              </span>
            </div>
            <Table
              data-testid="aor1-contract-table"
              rowKey="contractId"
              columns={columns}
              dataSource={report.contracts}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: (
                <div className="py-8 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 m-0">No contracts expire in this horizon</p>
                </div>
              )}}
              scroll={{ x: 1000 }}
              className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
            />
          </div>

        </div>
      </Spin>

    </div>
  );
};

export default AirlineContractExpiryPanel;
