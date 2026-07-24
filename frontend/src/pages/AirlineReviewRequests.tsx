import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import { 
  Building2, 
  Globe, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  RefreshCw,
  Layers,
  Send
} from 'lucide-react';

interface ReviewRequest {
  id: string;
  contractId: string;
  groundHandlerId: string;
  airlineId: string;
  airportCode: string;
  contractStatus: string;
  serviceTypes: string[];
  comment: string;
  requestedBy: string;
  createdAt: string;
}

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          APPROVED
        </span>
      );
    case 'REVIEW_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          REVIEW_REQUESTED
        </span>
      );
    case 'PENDING_APPROVAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          PENDING_APPROVAL
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};

const AirlineReviewRequests: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [supplierFilter, setSupplierFilter] = useState<string>();
  const [airportFilter, setAirportFilter] = useState<string>();
  const [serviceFilter, setServiceFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/airline/contract-review-requests', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit access to sent review requests.'
          : 'Sent review requests could not be loaded.');
      }
      setRequests(await response.json());
    } catch (requestError) {
      setRequests([]);
      setError(requestError instanceof Error ? requestError.message : 'Sent review requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => requests.filter(request =>
    (!supplierFilter || request.groundHandlerId === supplierFilter)
      && (!airportFilter || request.airportCode === airportFilter)
      && (!serviceFilter || request.serviceTypes.includes(serviceFilter))
      && (!statusFilter || request.contractStatus === statusFilter)
  ), [airportFilter, requests, serviceFilter, statusFilter, supplierFilter]);

  const suppliers = [...new Set(requests.map(request => request.groundHandlerId))].sort();
  const airports = [...new Set(requests.map(request => request.airportCode))].sort();
  const services = [...new Set(requests.flatMap(request => request.serviceTypes))].sort();
  const statuses = [...new Set(requests.map(request => request.contractStatus))].sort();

  const columns: TableColumnsType<ReviewRequest> = [
    {
      title: 'SENT TIMESTAMPS',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: value => (
        <span className="font-mono text-xs text-slate-600 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          {new Date(String(value)).toLocaleString()}
        </span>
      ),
    },
    { 
      title: 'SUPPLIER HANDLER', 
      dataIndex: 'groundHandlerId', 
      key: 'groundHandlerId',
      render: (gh: string) => (
        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          {gh}
        </span>
      )
    },
    { 
      title: 'ICAO HUB', 
      dataIndex: 'airportCode', 
      key: 'airportCode',
      render: (code: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1">
          <Globe className="w-3 h-3 text-slate-500" />
          {code}
        </span>
      )
    },
    {
      title: 'SERVICE CODES',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: values => (
        <div className="flex flex-wrap gap-1">
          {values.map((value: string) => (
            <span key={value} className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              {value}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: 'CONTRACT REF',
      dataIndex: 'contractId',
      key: 'contractId',
      render: value => (
        <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
          {String(value).slice(0, 8)}...
        </span>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      render: value => renderStatusBadge(String(value)),
    },
    { 
      title: 'REQUESTED BY', 
      dataIndex: 'requestedBy', 
      key: 'requestedBy',
      render: (user: string) => (
        <span className="font-mono text-xs text-slate-600 inline-flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400" />
          {user}
        </span>
      )
    },
    {
      title: 'AUDIT COMMENT',
      dataIndex: 'comment',
      key: 'comment',
      render: value => (
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-800 italic">
          "{String(value)}"
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  Review Requests Sent
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                  {tenantId} (Airline Portal)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Contract audit review requests submitted to suppliers</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Track response status</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadRequests}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sent</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{requests.length}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suppliers</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{suppliers.length}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Station Hubs</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{airports.length}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Types</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{services.length}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Review Requests</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            data-testid="review-summary-supplier-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All suppliers"
            value={supplierFilter}
            options={suppliers.map(value => ({ value, label: value }))}
            onChange={setSupplierFilter}
          />
          <Select
            data-testid="review-summary-airport-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports"
            value={airportFilter}
            options={airports.map(value => ({ value, label: value }))}
            onChange={setAirportFilter}
          />
          <Select
            data-testid="review-summary-service-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services"
            value={serviceFilter}
            options={services.map(value => ({ value, label: value }))}
            onChange={setServiceFilter}
          />
          <Select
            data-testid="review-summary-status-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All statuses"
            value={statusFilter}
            options={statuses.map(value => ({ value, label: value }))}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredRequests}
            rowKey="id"
            size="small"
            onRow={request => ({ id: `airline-review-request-${request.id}` })}
            pagination={{ pageSize: 10, className: "px-4 py-2" }}
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
            locale={{ emptyText: <div className="py-12 text-center text-xs text-slate-400">No sent review requests match the selected filters</div> }}
          />
        </Spin>
      </div>

    </div>
  );
};

export default AirlineReviewRequests;
