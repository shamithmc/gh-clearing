import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, message, Modal, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import { 
  FileText, 
  Globe, 
  Filter, 
  MessageSquare, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw
} from 'lucide-react';

interface ServiceLine {
  chargeCode: string;
  serviceName: string;
  formulaType: string;
  quantityDriver?: string;
  uom?: string;
  taxCode?: string;
  rateDetails: Record<string, unknown>;
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

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

const AirlineContracts: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reviewContract, setReviewContract] = useState<Contract>();
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm] = Form.useForm<{ comment: string }>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
    ]).then(([airportData, chargeCodeData]) => {
      setAirports(airportData);
      setChargeCodes(chargeCodeData);
    }).catch(() => {
      setAirports([]);
      setChargeCodes([]);
    });
  }, [headers]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    try {
      const query = params.toString();
      const response = await fetch(`/api/contracts${query ? `?${query}` : ''}`, { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit contract viewing.'
          : 'Contracts could not be loaded.');
      }
      setContracts(await response.json());
    } catch (requestError) {
      setContracts([]);
      setError(requestError instanceof Error ? requestError.message : 'Contracts could not be loaded.');
    } fontinally: {
      setLoading(false);
    }
  }, [airportCode, headers, serviceType]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const submitReviewRequest = async () => {
    if (!reviewContract) return;
    const { comment } = await reviewForm.validateFields();
    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/contracts/${reviewContract.id}/review-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit this review request.'
          : 'The review request could not be submitted.');
      }
      message.success('Review request sent to the ground handler');
      setReviewContract(undefined);
      reviewForm.resetFields();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The review request could not be submitted.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            APPROVED
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
            REVIEW_REQUESTED
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

  const columns: TableColumnsType<Contract> = [
    { 
      title: 'CONTRACT REF', 
      dataIndex: 'id', 
      key: 'id', 
      render: id => (
        <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
          {String(id).slice(0, 8)}…
        </span>
      ) 
    },
    { 
      title: 'GROUND HANDLER', 
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
      title: 'VALID FROM', 
      dataIndex: 'startDate', 
      key: 'startDate',
      render: (date: string) => <span className="font-mono text-xs text-slate-600">{date}</span>
    },
    { 
      title: 'VALID TO', 
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
      render: status => renderStatusBadge(String(status)),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'right' as const,
      render: (_, contract) => contract.status === 'APPROVED' ? (
        <Button
          size="small"
          data-testid={`request-review-${contract.id}`}
          className="!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-200 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
          onClick={() => {
            reviewForm.resetFields();
            setReviewContract(contract);
          }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Request Review
        </Button>
      ) : null,
    },
  ];

  const serviceColumns: TableColumnsType<ServiceLine> = [
    { 
      title: 'SERVICE TYPE', 
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
      render: (driver: string) => <span className="font-mono text-xs text-slate-600">{driver || '—'}</span>
    },
    { 
      title: 'UOM', 
      dataIndex: 'uom', 
      key: 'uom',
      render: (uom: string) => <span className="font-mono text-xs text-slate-500">{uom || '—'}</span>
    },
    {
      title: 'RATE DETAILS',
      dataIndex: 'rateDetails',
      key: 'rateDetails',
      render: details => (
        <span className="font-mono text-xs text-slate-800 bg-white p-1 rounded border border-slate-200 block">
          {JSON.stringify(details)}
        </span>
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  My Contracts
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                  Read only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Contracts shared with {tenantId}. Airport and service access is applied from your user profile.</span>
              </p>
            </div>
          </div>
        </div>

        <Button 
          className="!inline-flex !items-center !gap-2 !bg-white hover:!bg-slate-50 !text-slate-700 !border-slate-300 !font-medium !text-xs !rounded-lg !px-3.5 !py-2 !h-9 shadow-xs"
          onClick={fetchContracts}
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Shared Contracts</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Station / Airport Hub</label>
            <Select
              data-testid="airport-filter"
              aria-label="Airport filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All airports"
              value={airportCode}
              onChange={setAirportCode}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} — ${airport.name}`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Service / Charge Type</label>
            <Select
              data-testid="service-type-filter"
              aria-label="Service type filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All service types"
              value={serviceType}
              onChange={setServiceType}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} — ${chargeCode.displayName}`,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={contracts}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, className: "px-4 py-2" }}
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
            locale={{ emptyText: <div className="py-12 text-center text-xs text-slate-400">No contracts match your access and filters</div> }}
            expandable={{
              expandedRowRender: contract => (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-inner space-y-3">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                      Contracted Service Lines ({contract.services.length})
                    </h4>
                  </div>
                  <Table
                    columns={serviceColumns}
                    dataSource={contract.services}
                    rowKey={service => `${contract.id}-${service.chargeCode}`}
                    pagination={false}
                    size="small"
                    className="[&_.ant-table-thead_th]:!bg-slate-100/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-tbody_td]:!py-2 [&_.ant-table-tbody_td]:!border-slate-200/60 rounded-lg overflow-hidden border border-slate-200"
                  />
                </div>
              ),
            }}
          />
        </Spin>
      </div>

      {/* Review Request Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-base">Request Contract Review</span>
          </div>
        }
        open={Boolean(reviewContract)}
        okText="Send Request"
        confirmLoading={submittingReview}
        onOk={submitReviewRequest}
        onCancel={() => {
          setReviewContract(undefined);
          reviewForm.resetFields();
        }}
        destroyOnClose
        okButtonProps={{
          className: "!bg-blue-600 hover:!bg-blue-700 !border-blue-600 !text-white !font-semibold !text-xs !rounded-lg"
        }}
        cancelButtonProps={{
          className: "!border-slate-300 !text-slate-700 hover:!bg-slate-50 !text-xs !rounded-lg"
        }}
      >
        <div className="py-3 space-y-3">
          <p className="text-xs text-slate-600 m-0">
            The approved contract remains active and read-only. Your review comment will be submitted to the ground handler's review queue.
          </p>
          <Form form={reviewForm} layout="vertical" preserve={false}>
            <Form.Item
              name="comment"
              label={<span className="text-xs font-semibold text-slate-700">Review Comment & Rate Feedback</span>}
              rules={[
                { required: true, whitespace: true, message: 'Enter a review comment' },
                { max: 2000, message: 'Comment must not exceed 2000 characters' },
              ]}
            >
              <Input.TextArea
                data-testid="review-comment"
                aria-label="Review comment"
                rows={4}
                maxLength={2000}
                showCount
                placeholder="Describe the specific terms, rates, or SLA clauses that need review..."
                className="!text-xs !rounded-lg !border-slate-300 focus:!border-blue-500 focus:!ring-2 focus:!ring-blue-500/20"
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

    </div>
  );
};

export default AirlineContracts;
