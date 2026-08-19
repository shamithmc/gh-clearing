import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, scopedUserId, setSimulatedUserId, simulatedAuthHeaders, unrestrictedUserId } from '../utils/simulatedAuth';
import { isWorkOsAuthenticated } from '../auth/workosAuth';
import { 
  FileText, 
  Plus, 
  Building2, 
  Globe, 
  ShieldCheck, 
  UserCheck, 
  Filter, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  Pencil
} from 'lucide-react';

const { Option } = Select;

interface ServiceLine {
  chargeCode: string;
  serviceName: string;
  formulaType: string;
  quantityDriver: string;
  uom: string;
  taxCode: string;
  rateDetails: any;
}

interface Contract {
  id: string;
  groundHandlerId: string;
  airlineId: string;
  airportCode: string;
  startDate: string;
  endDate: string;
  status: string;
  currency: string;
  services: ServiceLine[];
}

const ContractsList: React.FC = () => {
  const usingWorkOs = isWorkOsAuthenticated();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Simulated Tenant Role Selector
  const [simTenantId, setSimTenantId] = useState<string>(localStorage.getItem('simTenantId') || 'SWISSPORT');
  const [simTenantType, setSimTenantType] = useState<string>(localStorage.getItem('simTenantType') || 'GROUND_HANDLER');
  const [simUserId, setSimUserId] = useState<string>(() => getSimulatedUserId(localStorage.getItem('simTenantId') || 'SWISSPORT'));
  
  const navigate = useNavigate();

  const fetchContracts = useCallback(() => {
    const url = statusFilter === 'ALL' ? '/api/contracts' : `/api/contracts?status=${statusFilter}`;
    fetch(url, {
      headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
    })
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setContracts(data))
      .catch(() => setContracts([]));
  }, [statusFilter, simTenantId, simTenantType, simUserId]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleStatusTransition = (contractId: string, newStatus: string) => {
    fetch(`/api/contracts/${contractId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType, simUserId),
      },
      body: JSON.stringify({ status: newStatus }),
    })
    .then(res => {
      if (res.ok) {
        message.success(`Contract status updated to ${newStatus}`);
        fetchContracts();
      }
    })
    .catch(() => {});
  };

  const handleTenantChange = (value: string) => {
    const userId = unrestrictedUserId(value);
    if (value === 'SWISSPORT') {
      setSimTenantId('SWISSPORT');
      setSimTenantType('GROUND_HANDLER');
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    } else {
      setSimTenantId('EK');
      setSimTenantType('AIRLINE');
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
    }
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  const handlePersonaChange = (userId: string) => {
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            APPROVED & ACTIVE
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDING_APPROVAL
          </span>
        );
      case 'REVIEW_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            REVIEW REQUESTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            DRAFT
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

  const columns = [
    { 
      title: 'CONTRACT ID', 
      dataIndex: 'id', 
      key: 'id', 
      render: (id: string) => (
        <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
          {id.substring(0, 8)}...
        </span>
      )
    },
    { 
      title: 'OPERATIONAL PARTIES', 
      key: 'parties',
      render: (_: any, record: Contract) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
            {record.groundHandlerId}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
            {record.airlineId}
          </span>
        </div>
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
      title: 'START DATE', 
      dataIndex: 'startDate', 
      key: 'startDate',
      render: (date: string) => <span className="font-mono text-xs text-slate-600">{date}</span>
    },
    { 
      title: 'END DATE', 
      dataIndex: 'endDate', 
      key: 'endDate',
      render: (date: string) => <span className="font-mono text-xs font-semibold text-slate-700">{date}</span>
    },
    { 
      title: 'CURRENCY', 
      dataIndex: 'currency', 
      key: 'currency',
      render: (curr: string) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
          {curr}
        </span>
      )
    },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => renderStatusBadge(status)
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'right' as const,
      render: (record: Contract) => {
        if (record.status === 'APPROVED' || record.status === 'EXPIRED') {
          return null;
        }
        if (simTenantType === 'GROUND_HANDLER') {
          if (record.status === 'DRAFT' || record.status === 'REVIEW_REQUESTED') {
            return (
              <div className="flex items-center justify-end gap-1.5">
                <Button 
                  data-testid="edit-contract-btn"
                  size="small"
                  className="!bg-slate-100 hover:!bg-slate-200 !border-slate-300 !text-slate-800 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                  onClick={() => navigate(`/contracts/${record.id}/edit`)}
                >
                  <Pencil className="w-3 h-3 text-slate-600" />
                  Edit
                </Button>
                <Button 
                  data-testid="submit-approval-btn"
                  type="primary" 
                  size="small"
                  className="!bg-slate-900 hover:!bg-slate-800 !border-slate-900 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                  onClick={() => handleStatusTransition(record.id, 'PENDING_APPROVAL')}
                >
                  Submit for Approval
                </Button>
              </div>
            );
          }
          if (record.status === 'PENDING_APPROVAL') {
            return (
              <div className="flex items-center justify-end gap-1.5">
                <Button 
                  danger 
                  size="small" 
                  className="!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-200 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                  onClick={() => handleStatusTransition(record.id, 'REVIEW_REQUESTED')}
                >
                  Request Review
                </Button>
                <Button 
                  data-testid="approve-btn"
                  type="primary" 
                  size="small" 
                  className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                  onClick={() => handleStatusTransition(record.id, 'APPROVED')}
                >
                  Approve
                </Button>
              </div>
            );
          }
        } else if (simTenantType === 'AIRLINE') {
          if (record.status === 'PENDING_APPROVAL') {
            return (
              <Button 
                danger 
                size="small" 
                className="!bg-rose-600 hover:!bg-rose-700 !text-white !border-rose-600 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => handleStatusTransition(record.id, 'REVIEW_REQUESTED')}
              >
                Request Review
              </Button>
            );
          }
        }
        return null;
      }
    }
  ];

  const expandedRowRender = (record: Contract) => {
    const serviceColumns = [
      { 
        title: 'CHARGE CODE', 
        dataIndex: 'chargeCode', 
        key: 'chargeCode',
        render: (code: string) => (
          <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {code}
          </span>
        )
      },
      { 
        title: 'SERVICE DESCRIPTION', 
        dataIndex: 'serviceName', 
        key: 'serviceName',
        render: (name: string) => <span className="text-xs font-medium text-slate-800">{name}</span>
      },
      { 
        title: 'FORMULA TYPE', 
        dataIndex: 'formulaType', 
        key: 'formulaType',
        render: (type: string) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
            {type}
          </span>
        )
      },
      { 
        title: 'QUANTITY DRIVER', 
        dataIndex: 'quantityDriver', 
        key: 'quantityDriver',
        render: (qd: string) => <span className="font-mono text-xs text-slate-600">{qd}</span>
      },
      { 
        title: 'UOM', 
        dataIndex: 'uom', 
        key: 'uom',
        render: (uom: string) => <span className="font-mono text-xs text-slate-500">{uom}</span>
      },
      { 
        title: 'TAX CODE', 
        dataIndex: 'taxCode', 
        key: 'taxCode',
        render: (tax: string) => <span className="font-mono text-xs text-slate-600">{tax}</span>
      },
      { 
        title: 'CONTRACT RATE DETAILS', 
        dataIndex: 'rateDetails', 
        key: 'rateDetails',
        render: (rates: any, sRecord: ServiceLine) => {
          if (sRecord.formulaType === 'PF-01' || sRecord.formulaType === 'PF-02' || sRecord.formulaType === 'PF-07') {
            return <span className="font-mono text-xs font-bold text-slate-900">Rate: {rates.rate} {record.currency}</span>;
          }
          if (sRecord.formulaType === 'PF-03' || sRecord.formulaType === 'PF-04') {
            return (
              <div className="space-y-1">
                {(rates.tiers || []).map((t: any, idx: number) => (
                  <div key={idx} className="font-mono text-xs text-slate-700">
                    Up to: <strong className="text-slate-900">{t.upto || '∞'}</strong> ➔ Rate: <strong className="text-blue-700">{t.rate} {record.currency}</strong>
                  </div>
                ))}
              </div>
            );
          }
          return <span className="font-mono text-xs text-slate-700">{JSON.stringify(rates)}</span>;
        }
      },
    ];

    return (
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-inner space-y-3">
        {record.status === 'REVIEW_REQUESTED' && (
          <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-lg flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-rose-950">Carrier Review Requested:</strong>
              <p className="mt-0.5 text-rose-900">
                The airline carrier has submitted review feedback on this agreement. Please check the Contract Review Requests inbox or edit SLA parameters to address remarks.
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-1 pb-1">
          <Layers className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
            SLA Service Lines & Billing Formulas ({record.services?.length || 0})
          </h4>
        </div>
        <Table 
          columns={serviceColumns} 
          dataSource={record.services} 
          pagination={false} 
          rowKey="chargeCode" 
          size="small"
          className="[&_.ant-table-thead_th]:!bg-slate-100/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-tbody_td]:!py-2 [&_.ant-table-tbody_td]:!border-slate-200/60 rounded-lg overflow-hidden border border-slate-200"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Ground Handling Contracts & SLA Registry
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>SGHA contract SLA agreements</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Tiered turnaround rates</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Multi-currency pricing formulas</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="!inline-flex !items-center !gap-2 !bg-white hover:!bg-slate-50 !text-slate-700 !border-slate-300 !font-medium !text-xs !rounded-lg !px-3.5 !py-2 !h-9 shadow-xs"
            onClick={fetchContracts}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </Button>

          {simTenantType === 'GROUND_HANDLER' && (
            <Button 
              id="create-contract-btn"
              type="primary" 
              className="!inline-flex !items-center !gap-2 !bg-blue-600 hover:!bg-blue-700 !text-white !font-semibold !text-xs !rounded-lg !px-4 !py-2 !h-9 shadow-xs focus:ring-2 focus:ring-blue-500/30"
              onClick={() => navigate('/contracts/new')}
            >
              <Plus className="w-4 h-4" />
              Create Contract
            </Button>
          )}
        </div>
      </div>

      {/* Scope Toolbar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Scope</span>
              <p className="text-xs text-slate-300 m-0">Contract visibility and approval privileges</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {!usingWorkOs && <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Status Filter:</span>
              <Select 
                value={statusFilter} 
                className="w-48 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
                onChange={setStatusFilter}
              >
                <Option value="ALL">All Statuses</Option>
                <Option value="DRAFT">DRAFT</Option>
                <Option value="PENDING_APPROVAL">PENDING_APPROVAL</Option>
                <Option value="APPROVED">APPROVED</Option>
                <Option value="REVIEW_REQUESTED">REVIEW_REQUESTED</Option>
                <Option value="EXPIRED">EXPIRED</Option>
              </Select>
            </div>}

            {!usingWorkOs && <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Tenant:</span>
              <Select 
                value={simTenantId} 
                className="w-52 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
                onChange={handleTenantChange}
              >
                <Option value="SWISSPORT">Swissport (Ground Handler)</Option>
                <Option value="EK">Emirates (Airline)</Option>
              </Select>
            </div>}

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Scope:</span>
              <Select 
                value={simUserId} 
                className="w-56 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
                onChange={handlePersonaChange}
              >
                <Option value={unrestrictedUserId(simTenantId)}>Unrestricted Global Access</Option>
                <Option value={scopedUserId(simTenantId)}>DXB / EK / BAGGAGE Scoped</Option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={contracts} 
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, className: "px-4 py-2" }}
          rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
          className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
          expandable={{ expandedRowRender, defaultExpandedRowKeys: [] }}
          locale={{ 
            emptyText: (
              <div className="py-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600 m-0">No contracts found</p>
                <p className="text-xs text-slate-400 m-0">Try adjusting your status filter or scope settings</p>
              </div>
            ) 
          }} 
        />
      </div>

    </div>
  );
};

export default ContractsList;
