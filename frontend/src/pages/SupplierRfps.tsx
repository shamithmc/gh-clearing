import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, InputNumber, message, Modal, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  FileText,
  Send,
  Filter,
  RefreshCw,
  Trophy,
  Clock,
  Inbox,
  MessageSquareReply
} from 'lucide-react';

interface SupplierRfp {
  id: string;
  airlineId: string;
  airportCode: string;
  serviceType: string;
  requirements: string;
  desiredStartDate: string;
  desiredEndDate: string;
  status: string;
  proposalId?: string;
  proposalStatus?: string;
  proposedRate?: number;
  proposalCurrency?: string;
  proposalTerms?: string;
  responseStatus: string;
  outcome: string;
}

interface ProposalValues {
  proposedRate: number;
  currency: string;
  terms: string;
}

const statusColor: Record<string, string> = {
  AWARDED: 'bg-purple-50 text-purple-700 border-purple-200',
  CLOSED: 'bg-slate-50 text-slate-600 border-slate-200',
  PUBLISHED: 'bg-blue-50 text-blue-700 border-blue-200',
};

const responseColor: Record<string, string> = {
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  NOT_SUBMITTED: 'bg-slate-50 text-slate-600 border-slate-200',
};

const outcomeColor: Record<string, string> = {
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NOT_SELECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING_DECISION: 'bg-amber-50 text-amber-700 border-amber-200',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  CLOSED: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SupplierRfps: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'GROUND_HANDLER', userId),
    [tenantId, userId],
  );
  const [rfps, setRfps] = useState<SupplierRfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedRfp, setSelectedRfp] = useState<SupplierRfp>();
  const [submitting, setSubmitting] = useState(false);
  const [airlineFilter, setAirlineFilter] = useState<string>();
  const [airportFilter, setAirportFilter] = useState<string>();
  const [responseFilter, setResponseFilter] = useState<string>();
  const [outcomeFilter, setOutcomeFilter] = useState<string>();
  const [form] = Form.useForm<ProposalValues>();

  const loadRfps = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/supplier/rfps', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit RFP monitoring.'
          : 'RFP opportunities could not be loaded.');
      }
      setRfps(await response.json());
    } catch (requestError) {
      setRfps([]);
      setError(requestError instanceof Error ? requestError.message : 'RFP opportunities could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadRfps();
  }, [loadRfps]);

  const submitProposal = async () => {
    if (!selectedRfp) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/supplier/rfps/${selectedRfp.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit this proposal.'
          : payload.message || 'The proposal could not be submitted.');
      }
      message.success('Proposal submitted to the airline');
      setSelectedRfp(undefined);
      form.resetFields();
      await loadRfps();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The proposal could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRfps = useMemo(() => rfps.filter(rfp =>
    (!airlineFilter || rfp.airlineId === airlineFilter)
      && (!airportFilter || rfp.airportCode === airportFilter)
      && (!responseFilter || rfp.responseStatus === responseFilter)
      && (!outcomeFilter || rfp.outcome === outcomeFilter)
  ), [airlineFilter, airportFilter, outcomeFilter, responseFilter, rfps]);

  const airlines = [...new Set(rfps.map(rfp => rfp.airlineId))].sort();
  const airports = [...new Set(rfps.map(rfp => rfp.airportCode))].sort();
  const responded = rfps.filter(rfp => rfp.responseStatus !== 'NOT_SUBMITTED').length;
  const pending = rfps.filter(rfp => rfp.outcome === 'PENDING_DECISION').length;
  const won = rfps.filter(rfp => rfp.outcome === 'WON').length;

  const columns: TableColumnsType<SupplierRfp> = [
    { title: 'AIRLINE', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'SERVICE', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'CONTRACT PERIOD',
      key: 'period',
      render: (_, rfp) => (
        <span className="text-xs text-slate-600">{rfp.desiredStartDate} → {rfp.desiredEndDate}</span>
      ),
    },
    {
      title: 'RFP STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[status] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'RESPONSE',
      dataIndex: 'responseStatus',
      key: 'responseStatus',
      render: (status: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${responseColor[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {status.split('_').join(' ')}
        </span>
      ),
    },
    {
      title: 'OUTCOME',
      dataIndex: 'outcome',
      key: 'outcome',
      render: (outcome: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${outcomeColor[outcome] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {outcome.split('_').join(' ')}
        </span>
      ),
    },
    {
      title: 'ACTION',
      key: 'action',
      align: 'right' as const,
      render: (_, rfp) => rfp.proposalStatus ? (
        <span className="text-xs font-semibold text-slate-900">{rfp.proposalCurrency} {rfp.proposedRate}</span>
      ) : rfp.status === 'PUBLISHED' ? (
        <button
          data-testid={`respond-rfp-${rfp.id}`}
          onClick={() => {
            form.resetFields();
            setSelectedRfp(rfp);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Submit Proposal
        </button>
      ) : (
        <span className="text-xs text-slate-400">Response closed</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                RFP Summary
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Track every eligible airline request, your response status, and the final procurement outcome</span>
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadRfps}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Data
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div data-testid="rfp-summary-received" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Inbox className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</span>
          </div>
          <p className="ant-statistic-content-value text-2xl font-extrabold text-slate-900 m-0">{rfps.length}</p>
        </div>
        <div data-testid="rfp-summary-responded" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareReply className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Responded</span>
          </div>
          <p className="ant-statistic-content-value text-2xl font-extrabold text-slate-900 m-0">{responded}</p>
        </div>
        <div data-testid="rfp-summary-pending" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Decision</span>
          </div>
          <p className="ant-statistic-content-value text-2xl font-extrabold text-slate-900 m-0">{pending}</p>
        </div>
        <div data-testid="rfp-summary-won" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Won</span>
          </div>
          <p className="ant-statistic-content-value text-2xl font-extrabold text-emerald-600 m-0">{won}</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter RFPs</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            data-testid="rfp-summary-airline-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airlines"
            value={airlineFilter}
            options={airlines.map(value => ({ value, label: value }))}
            onChange={setAirlineFilter}
          />
          <Select
            data-testid="rfp-summary-airport-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports"
            value={airportFilter}
            options={airports.map(value => ({ value, label: value }))}
            onChange={setAirportFilter}
          />
          <Select
            data-testid="rfp-summary-response-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All responses"
            value={responseFilter}
            options={['NOT_SUBMITTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED'].map(value => ({ value, label: value.split('_').join(' ') }))}
            onChange={setResponseFilter}
          />
          <Select
            data-testid="rfp-summary-outcome-filter"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All outcomes"
            value={outcomeFilter}
            options={['OPEN', 'PENDING_DECISION', 'WON', 'NOT_SELECTED', 'CLOSED'].map(value => ({ value, label: value.split('_').join(' ') }))}
            onChange={setOutcomeFilter}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            onRow={rfp => ({ id: `rfp-summary-row-${rfp.id}` })}
            columns={columns}
            dataSource={filteredRfps}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: (
              <div className="py-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 m-0">No RFPs match the selected filters</p>
              </div>
            )}}
            expandable={{
              expandedRowRender: rfp => (
                <div className="space-y-3 py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1">Requirements</span>
                    <p className="text-xs text-slate-600 m-0 leading-relaxed">{rfp.requirements}</p>
                  </div>
                  {rfp.proposalTerms && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">Submitted terms</span>
                      <p className="text-xs text-slate-600 m-0 leading-relaxed">{rfp.proposalTerms}</p>
                    </div>
                  )}
                </div>
              ),
            }}
            className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
          />
        </Spin>
      </div>

      {/* Submit Proposal Modal */}
      <Modal
        title={selectedRfp ? `Proposal for ${selectedRfp.airlineId} · ${selectedRfp.serviceType}` : 'Submit Proposal'}
        open={Boolean(selectedRfp)}
        okText="Submit Proposal"
        confirmLoading={submitting}
        onOk={submitProposal}
        onCancel={() => {
          setSelectedRfp(undefined);
          form.resetFields();
        }}
      >
        <Form<ProposalValues>
          form={form}
          layout="vertical"
          initialValues={{ currency: 'USD' }}
          className="mt-5"
        >
          <Form.Item
            name="proposedRate"
            label={<span className="text-xs font-semibold text-slate-700">Proposed Rate</span>}
            rules={[{ required: true, message: 'Enter a proposed rate' }]}
          >
            <InputNumber
              data-testid="proposal-rate"
              min={0.0001}
              precision={4}
              className="!w-full [&_input]:!text-xs"
              placeholder="Rate for the requested service"
            />
          </Form.Item>
          <Form.Item name="currency" label={<span className="text-xs font-semibold text-slate-700">Currency</span>} rules={[{ required: true }]}>
            <Select
              data-testid="proposal-currency"
              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
              options={['USD', 'EUR', 'GBP', 'AED'].map(currency => ({ value: currency, label: currency }))}
            />
          </Form.Item>
          <Form.Item
            name="terms"
            label={<span className="text-xs font-semibold text-slate-700">Commercial and Service Terms</span>}
            rules={[
              { required: true, message: 'Enter proposal terms' },
              { max: 4000, message: 'Terms cannot exceed 4000 characters' },
            ]}
          >
            <Input.TextArea
              data-testid="proposal-terms"
              rows={5}
              maxLength={4000}
              showCount
              placeholder="Describe rate basis, validity, payment terms, service levels, and exclusions"
              className="!text-xs !rounded-lg"
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default SupplierRfps;
