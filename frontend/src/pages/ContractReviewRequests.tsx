import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import { 
  MessageSquare, 
  Globe, 
  Clock, 
  CheckCircle2, 
  User, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface ReviewRequest {
  id: string;
  contractId: string;
  groundHandlerId: string;
  airlineId: string;
  airportCode: string;
  contractStatus: string;
  comment: string;
  requestedBy: string;
  createdAt: string;
}

const ContractReviewRequests: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'GROUND_HANDLER', userId),
    [tenantId, userId],
  );
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/contract-review-requests', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit access to contract review requests.'
          : 'Review requests could not be loaded.');
      }
      setRequests(await response.json());
    } catch (requestError) {
      setRequests([]);
      setError(requestError instanceof Error ? requestError.message : 'Review requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const columns: TableColumnsType<ReviewRequest> = [
    {
      title: 'REQUEST TIMESTAMPS',
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
      title: 'AIRLINE CARRIER', 
      dataIndex: 'airlineId', 
      key: 'airlineId',
      render: (id: string) => (
        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          {id}
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
      title: 'CONTRACT STATUS',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      render: value => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {String(value)}
        </span>
      ),
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
      title: 'REVIEW COMMENT / REMARKS',
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
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Contract Review Requests
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Carrier SLA audit comments</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Assigned airports & service profiles</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadRequests}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Requests
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, className: "px-4 py-2" }}
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
            locale={{ 
              emptyText: (
                <div className="py-12 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600 m-0">No contract review requests in your access scope</p>
                </div>
              ) 
            }}
          />
        </Spin>
      </div>

    </div>
  );
};

export default ContractReviewRequests;
