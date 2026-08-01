import React, { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Spin, Empty } from 'antd';
import axios from 'axios';
import { getSimulatedUserId, scopedUserId, setSimulatedUserId, simulatedAuthHeaders, unrestrictedUserId } from '../utils/simulatedAuth';
import { isKeycloakAuthenticated } from '../auth/keycloakAuth';
import SupplierOperationalFootprintPanel from './SupplierOperationalFootprintPanel';
import { 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Globe, 
  Calendar, 
  PieChart, 
  TrendingUp, 
  Clock, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface GroupedReceivable {
  key: string;
  amount: number;
}

interface AgingBuckets {
  zeroToThirty: number;
  thirtyOneToSixty: number;
  sixtyOneToNinety: number;
  ninetyPlus: number;
}

interface ReceivablesSummary {
  totalOutstanding: number;
  byAirline: GroupedReceivable[];
  byAirport: GroupedReceivable[];
  aging: AgingBuckets;
}

interface InvoicedTrend {
  month: string;
  totalAmount: number;
}

interface RevenuePerFlightTrend {
  month: string;
  averageRevenue: number;
}

interface ExpiringContract {
  id: string;
  airlineId: string;
  airportCode: string;
  endDate: string;
  daysRemaining: number;
}

const Dashboard: React.FC = () => {
  const usingKeycloak = isKeycloakAuthenticated();
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<ReceivablesSummary | null>(null);
  const [invoicedTrend, setInvoicedTrend] = useState<InvoicedTrend[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePerFlightTrend[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);

  // Dimension Filters State
  const [selectedAirline, setSelectedAirline] = useState<string | undefined>(undefined);
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Simulated tenant state
  const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const [simUserId, setSimUserId] = useState<string>(() => getSimulatedUserId(simTenantId));

  useEffect(() => {
    setLoading(true);
    const headers = simulatedAuthHeaders(simTenantId, simTenantType, simUserId);

    const params: any = {};
    if (selectedAirline) params.airlineId = selectedAirline;
    if (selectedAirport) params.airportCode = selectedAirport;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    Promise.all([
      axios.get('/api/dashboard/receivables', { headers, params }),
      axios.get('/api/dashboard/invoiced-monthly', { headers, params }),
      axios.get('/api/dashboard/revenue-per-flight', { headers, params }),
      axios.get('/api/dashboard/expiring-contracts', { 
        headers, 
        params: { 
          airlineId: selectedAirline, 
          airportCode: selectedAirport 
        } 
      })
    ])
      .then(([recRes, invRes, revRes, expRes]) => {
        setReceivables(recRes.data);
        setInvoicedTrend(invRes.data);
        setRevenueTrend(revRes.data);
        setExpiringContracts(expRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
        setLoading(false);
      });
  }, [simTenantId, simTenantType, simUserId, selectedAirline, selectedAirport, startDate, endDate]);

  const handlePersonaChange = (userId: string) => {
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  const totalInvoicedThisMonth = invoicedTrend.length > 0 
    ? invoicedTrend[invoicedTrend.length - 1].totalAmount 
    : 0;

  // Custom SVG Donut Chart
  const renderDonutChart = () => {
    if (!receivables || !receivables.byAirline || receivables.byAirline.length === 0) {
      return (
        <div className="py-12 text-center">
          <PieChart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No receivables outstanding</p>
        </div>
      );
    }

    const data = receivables.byAirline;
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#14b8a6'];

    let accumulatedPercentage = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-4">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            {data.map((item, index) => {
              const percentage = (item.amount / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);
              accumulatedPercentage += percentage;

              return (
                <circle
                  key={item.key}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={colors[index % colors.length]}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:stroke-[16px] cursor-pointer"
                />
              );
            })}
            <circle cx="60" cy="60" r="38" fill="#ffffff" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Outstanding</span>
            <span className="font-mono text-sm font-bold text-slate-900">${(total / 1000).toFixed(1)}k</span>
          </div>
        </div>

        <div className="space-y-2 max-w-xs w-full">
          {data.map((item, index) => (
            <div key={item.key} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="font-semibold text-slate-800">{item.key}</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Custom SVG Bar Chart
  const renderBarChart = () => {
    if (invoicedTrend.length === 0) {
      return (
        <div className="py-12 text-center">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No invoiced history available</p>
        </div>
      );
    }

    const maxVal = Math.max(...invoicedTrend.map(t => t.totalAmount), 1);
    const chartHeight = 120;
    const barWidth = 40;
    const gap = 20;

    return (
      <div className="flex flex-col items-center p-2 overflow-x-auto">
        <svg width={invoicedTrend.length * (barWidth + gap) + 40} height="170" viewBox={`0 0 ${invoicedTrend.length * (barWidth + gap) + 40} 170`}>
          <line x1="20" y1={chartHeight + 10} x2={invoicedTrend.length * (barWidth + gap) + 20} y2={chartHeight + 10} stroke="#cbd5e1" strokeWidth="1" />
          <line x1="20" y1="10" x2={invoicedTrend.length * (barWidth + gap) + 20} y2="10" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          
          {invoicedTrend.map((data, index) => {
            const barHeight = (data.totalAmount / maxVal) * chartHeight;
            const x = index * (barWidth + gap) + 20;
            const y = chartHeight - barHeight + 10;

            return (
              <g key={data.month}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGrad)"
                  rx="6"
                  className="transition-opacity duration-200 hover:opacity-85 cursor-pointer"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {data.totalAmount >= 1000 ? (data.totalAmount / 1000).toFixed(1) + 'k' : data.totalAmount.toFixed(0)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                  fontWeight="500"
                >
                  {data.month}
                </text>
              </g>
            );
          })}
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  // Custom SVG Line Chart
  const renderLineChart = () => {
    if (revenueTrend.length === 0) {
      return (
        <div className="py-12 text-center">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No flight metrics available</p>
        </div>
      );
    }

    const maxVal = Math.max(...revenueTrend.map(t => t.averageRevenue), 1);
    const chartHeight = 120;
    const width = 340;
    const xStep = width / (revenueTrend.length > 1 ? revenueTrend.length - 1 : 1);

    const points = revenueTrend.map((data, index) => {
      const x = index * xStep + 20;
      const y = chartHeight - (data.averageRevenue / maxVal) * chartHeight + 10;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="flex flex-col items-center p-2 overflow-x-auto">
        <svg width={width + 40} height="170" viewBox={`0 0 ${width + 40} 170`}>
          <line x1="20" y1={chartHeight + 10} x2={width + 20} y2={chartHeight + 10} stroke="#cbd5e1" strokeWidth="1" />
          
          {revenueTrend.length > 1 && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              points={points}
            />
          )}

          {revenueTrend.map((data, index) => {
            const x = index * xStep + 20;
            const y = chartHeight - (data.averageRevenue / maxVal) * chartHeight + 10;

            return (
              <g key={data.month}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth="3"
                  className="cursor-pointer hover:r-7 transition-all"
                />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ${data.averageRevenue.toFixed(0)}
                </text>
                <text
                  x={x}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                  fontWeight="500"
                >
                  {data.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const contractColumns = [
    { 
      title: 'AIRLINE', 
      dataIndex: 'airlineId', 
      key: 'airlineId',
      render: (airlineId: string) => (
        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          {airlineId}
        </span>
      )
    },
    { 
      title: 'ICAO HUB', 
      dataIndex: 'airportCode', 
      key: 'airportCode',
      render: (airportCode: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1">
          <Globe className="w-3 h-3 text-slate-500" />
          {airportCode}
        </span>
      )
    },
    { 
      title: 'EXPIRY DATE', 
      dataIndex: 'endDate', 
      key: 'endDate',
      render: (date: string) => <span className="font-mono text-xs text-slate-600">{date}</span>
    },
    { 
      title: 'EXPIRY WINDOW', 
      dataIndex: 'daysRemaining', 
      key: 'daysRemaining',
      render: (days: number) => {
        let badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        if (days <= 30) badgeClass = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
        if (days > 60) badgeClass = "bg-sky-50 text-sky-700 border-sky-200";
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
            <Clock className="w-3 h-3" />
            {days} Days Remaining
          </span>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs shrink-0">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Dashboard Analytics
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Receivables settlement analytics</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Monthly revenue trends</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                <span>SLA Contract expiration alerts</span>
              </p>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-xl shadow-xs w-fit shrink-0">
          {simTenantId} ({simTenantType === 'GROUND_HANDLER' ? 'Ground Handler' : 'Airline'})
        </span>
      </div>

      {/* Scope & Filter Toolbar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-slate-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white m-0">Operational Dimension Filters</h4>
            <p className="text-xs text-slate-300 m-0">Filter analytics by carrier code, ICAO hub station, or billing date range</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {!usingKeycloak && <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-2.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700">
            <UserCheck className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="text-xs font-medium text-slate-300 shrink-0">Access Scope:</span>
            <Select 
              value={simUserId} 
              className="w-full min-w-0 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
              onChange={handlePersonaChange}
            >
              <Option value={unrestrictedUserId(simTenantId)}>Unrestricted Global Access</Option>
              <Option value={scopedUserId(simTenantId)}>DXB / EK / BAGGAGE only</Option>
            </Select>
          </div>}

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-2.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 shrink-0">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Airline:</span>
            </div>
            <Select
              placeholder="All Airlines"
              allowClear
              className="w-full min-w-0 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs"
              onChange={(val) => setSelectedAirline(val)}
              value={selectedAirline}
            >
              <Option value="EK">Emirates (EK)</Option>
              <Option value="LH">Lufthansa (LH)</Option>
              <Option value="QF">Qantas (QF)</Option>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-2.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 shrink-0">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Airport:</span>
            </div>
            <Select
              placeholder="All Airports"
              allowClear
              className="w-full min-w-0 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs"
              onChange={(val) => setSelectedAirport(val)}
              value={selectedAirport}
            >
              <Option value="DXB">Dubai (DXB)</Option>
              <Option value="LHR">London (LHR)</Option>
              <Option value="SYD">Sydney (SYD)</Option>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-2.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Date Range:</span>
            </div>
            <RangePicker
              className="w-full min-w-0 max-w-full [&_.ant-picker]:!bg-slate-900 [&_.ant-picker]:!border-slate-700 [&_.ant-picker-input_input]:!text-white [&_.ant-picker-input_input]:!text-xs"
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setStartDate(dates[0].format('YYYY-MM-DD'));
                  setEndDate(dates[1].format('YYYY-MM-DD'));
                } else {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-2xl border border-slate-200/80">
          <Spin size="large" tip="Loading analytics..." />
        </div>
      ) : (
        <>
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Outstanding Receivables</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    ${(receivables ? receivables.totalOutstanding : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[11px] text-rose-600/80 mt-1 block">Uncollected balances</span>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Invoiced This Month</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-blue-600">
                    ${totalInvoicedThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[11px] text-blue-600/80 mt-1 block">Current cycle volume</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Active Disputes</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-amber-600">
                    {receivables ? receivables.byAirline.length : 0}
                  </span>
                </div>
                <span className="text-[11px] text-amber-600/80 mt-1 block">Carriers with disputed line items</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Collections Success</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-emerald-600">94.8%</span>
                </div>
                <span className="text-[11px] text-emerald-600/80 mt-1 block">On-time clearance SLA</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 m-0">Receivables Share by Airline</h4>
                <p className="text-xs text-slate-500 m-0">Outstanding balance distribution across operating carriers</p>
              </div>
              {renderDonutChart()}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 m-0">Receivables Aging Profile</h4>
                <p className="text-xs text-slate-500 m-0">Payment duration buckets and overdue exposure</p>
              </div>
              {receivables ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>0 - 30 Days</span>
                      <span className="font-mono font-bold">${receivables.aging.zeroToThirty.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: receivables.totalOutstanding > 0 ? `${(receivables.aging.zeroToThirty / receivables.totalOutstanding) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>31 - 60 Days</span>
                      <span className="font-mono font-bold">${receivables.aging.thirtyOneToSixty.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: receivables.totalOutstanding > 0 ? `${(receivables.aging.thirtyOneToSixty / receivables.totalOutstanding) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>61 - 90 Days</span>
                      <span className="font-mono font-bold">${receivables.aging.sixtyOneToNinety.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: receivables.totalOutstanding > 0 ? `${(receivables.aging.sixtyOneToNinety / receivables.totalOutstanding) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>90+ Days (Overdue)</span>
                      <span className="font-mono font-bold text-rose-600">${receivables.aging.ninetyPlus.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                        style={{ width: receivables.totalOutstanding > 0 ? `${(receivables.aging.ninetyPlus / receivables.totalOutstanding) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Empty />
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 m-0">Monthly Invoiced Trends</h4>
                <p className="text-xs text-slate-500 m-0">Historical gross billing throughput by month</p>
              </div>
              {renderBarChart()}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 m-0">Average Revenue per Flight</h4>
                <p className="text-xs text-slate-500 m-0">Yield efficiency per ground handling turnaround operation</p>
              </div>
              {renderLineChart()}
            </div>
          </div>

          {/* Expiring Contracts Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  Contracts Up for Expiry (Within 90 Days)
                </h4>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                Total: {expiringContracts.length}
              </span>
            </div>
            <Table 
              dataSource={expiringContracts} 
              columns={contractColumns} 
              pagination={false} 
              rowKey="id"
              size="small"
              className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
              locale={{ emptyText: <Empty description="No contracts expiring soon" /> }}
            />
          </div>
        </>
      )}
      <SupplierOperationalFootprintPanel />
    </div>
  );
};

export default Dashboard;
