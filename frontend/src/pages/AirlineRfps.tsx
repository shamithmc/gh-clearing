import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DatePicker, Form, Input, message, Modal, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import type { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  FileText,
  Send,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const { RangePicker } = DatePicker;

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

interface Rfp {
  id: string;
  airlineId: string;
  airportCode: string;
  serviceType: string;
  requirements: string;
  desiredStartDate: string;
  desiredEndDate: string;
  status: string;
  eligibleGroundHandlerIds: string[];
  createdAt: string;
}

interface RfpFormValues {
  airportCode: string;
  serviceType: string;
  requirements: string;
  contractPeriod: [Dayjs, Dayjs];
}

interface RfpProposal {
  id: string;
  rfpId: string;
  groundHandlerId: string;
  proposedRate: number;
  currency: string;
  terms: string;
  status: string;
  submittedAt: string;
}

interface ProposalDecisionResponse {
  proposalId: string;
  proposalStatus: string;
  rfpStatus: string;
  seededContractId?: string;
}

const proposalStatusColor: Record<string, string> = {
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
};

const AirlineRfps: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [form] = Form.useForm<RfpFormValues>();
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>();
  const [evaluationRfp, setEvaluationRfp] = useState<Rfp>();
  const [proposals, setProposals] = useState<RfpProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [decidingProposalId, setDecidingProposalId] = useState<string>();
  const [proposalError, setProposalError] = useState<string>();

  const loadRfps = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/rfps', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit RFP management.'
          : 'RFPs could not be loaded.');
      }
      setRfps(await response.json());
    } catch (requestError) {
      setRfps([]);
      setError(requestError instanceof Error ? requestError.message : 'RFPs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

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
    loadRfps();
  }, [headers, loadRfps]);

  useEffect(() => {
    const airportCode = searchParams.get('airportCode');
    const serviceType = searchParams.get('serviceType');
    if (airportCode || serviceType) {
      form.setFieldsValue({
        ...(airportCode ? { airportCode } : {}),
        ...(serviceType ? { serviceType } : {}),
      });
    }
  }, [form, searchParams]);

  const publishRfp = async (values: RfpFormValues) => {
    setPublishing(true);
    try {
      const response = await fetch('/api/rfps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          airportCode: values.airportCode,
          serviceType: values.serviceType,
          requirements: values.requirements,
          desiredStartDate: values.contractPeriod[0].format('YYYY-MM-DD'),
          desiredEndDate: values.contractPeriod[1].format('YYYY-MM-DD'),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit this RFP.'
          : payload.message || 'The RFP could not be published.');
      }
      const created: Rfp = await response.json();
      message.success(`RFP published to ${created.eligibleGroundHandlerIds.length} eligible ground handler(s)`);
      form.resetFields();
      await loadRfps();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The RFP could not be published.');
    } finally {
      setPublishing(false);
    }
  };

  const loadProposals = useCallback(async (rfpId: string) => {
    setLoadingProposals(true);
    setProposalError(undefined);
    try {
      const response = await fetch(`/api/rfps/${rfpId}/proposals`, { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit proposal evaluation.'
          : 'Proposals could not be loaded.');
      }
      setProposals(await response.json());
    } catch (requestError) {
      setProposals([]);
      setProposalError(requestError instanceof Error ? requestError.message : 'Proposals could not be loaded.');
    } finally {
      setLoadingProposals(false);
    }
  }, [headers]);

  const openEvaluation = (rfp: Rfp) => {
    setEvaluationRfp(rfp);
    setProposals([]);
    loadProposals(rfp.id);
  };

  const decideProposal = async (proposal: RfpProposal, status: 'ACCEPTED' | 'REJECTED') => {
    if (!evaluationRfp) return;
    setDecidingProposalId(proposal.id);
    try {
      const response = await fetch(`/api/rfps/${evaluationRfp.id}/proposals/${proposal.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status, seedContract: status === 'ACCEPTED' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit this decision.'
          : payload.message || 'The proposal decision could not be saved.');
      }
      const decision: ProposalDecisionResponse = await response.json();
      if (decision.seededContractId) {
        message.success(`Proposal accepted and draft contract ${decision.seededContractId} created`);
      } else {
        message.success(`Proposal ${status.toLowerCase()}`);
      }
      await Promise.all([loadProposals(evaluationRfp.id), loadRfps()]);
      if (status === 'ACCEPTED') {
        setEvaluationRfp(current => current ? { ...current, status: decision.rfpStatus } : current);
      }
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The proposal decision could not be saved.');
    } finally {
      setDecidingProposalId(undefined);
    }
  };

  const proposalColumns: TableColumnsType<RfpProposal> = [
    { title: 'SUPPLIER', dataIndex: 'groundHandlerId', key: 'groundHandlerId' },
    {
      title: 'PROPOSED RATE',
      key: 'proposedRate',
      render: (_, proposal) => (
        <span className="text-xs font-extrabold text-slate-900">
          {proposal.currency} {Number(proposal.proposedRate).toLocaleString()}
        </span>
      ),
    },
    { title: 'TERMS', dataIndex: 'terms', key: 'terms' },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${proposalStatusColor[status] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'right' as const,
      render: (_, proposal) => proposal.status === 'SUBMITTED' && evaluationRfp?.status === 'PUBLISHED' ? (
        <div className="flex items-center gap-2 justify-end">
          <button
            data-testid={`accept-proposal-${proposal.id}`}
            disabled={Boolean(decidingProposalId && decidingProposalId !== proposal.id)}
            onClick={() => decideProposal(proposal, 'ACCEPTED')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accept &amp; Create Draft
          </button>
          <button
            data-testid={`reject-proposal-${proposal.id}`}
            disabled={Boolean(decidingProposalId && decidingProposalId !== proposal.id)}
            onClick={() => decideProposal(proposal, 'REJECTED')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      ) : null,
    },
  ];

  const columns: TableColumnsType<Rfp> = [
    { title: 'AIRPORT', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'SERVICE', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'CONTRACT PERIOD',
      key: 'period',
      render: (_, rfp) => (
        <span className="text-xs text-slate-600">{rfp.desiredStartDate} to {rfp.desiredEndDate}</span>
      ),
    },
    {
      title: 'ELIGIBLE SUPPLIERS',
      dataIndex: 'eligibleGroundHandlerIds',
      key: 'eligibleGroundHandlerIds',
      render: (ids: string[]) => <span className="text-xs font-semibold text-slate-900">{ids.length}</span>,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {status}
        </span>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'right' as const,
      render: (_, rfp) => (
        <button
          data-testid={`review-proposals-${rfp.id}`}
          onClick={() => openEvaluation(rfp)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Review Proposals
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Requests for Proposal
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                Publish service requirements to ground handlers configured for your airline and selected airport
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

      {/* Create RFP Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
          <Send className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Create RFP</span>
        </div>
        <div className="p-6">
          <Form<RfpFormValues> form={form} layout="vertical" onFinish={publishRfp}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item name="airportCode" label={<span className="text-xs font-semibold text-slate-700">Airport</span>} rules={[{ required: true, message: 'Select an airport' }]}>
                <Select
                  data-testid="rfp-airport"
                  aria-label="RFP airport"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select airport"
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                  options={airports.map(airport => ({
                    value: airport.iataCode,
                    label: `${airport.iataCode} - ${airport.name}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="serviceType" label={<span className="text-xs font-semibold text-slate-700">Service Type</span>} rules={[{ required: true, message: 'Select a service type' }]}>
                <Select
                  data-testid="rfp-service"
                  aria-label="RFP service type"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select service"
                  className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
                  options={chargeCodes.map(chargeCode => ({
                    value: chargeCode.code,
                    label: `${chargeCode.code} - ${chargeCode.displayName}`,
                  }))}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="contractPeriod"
              label={<span className="text-xs font-semibold text-slate-700">Desired Contract Period</span>}
              rules={[{ required: true, message: 'Select the desired contract period' }]}
            >
              <RangePicker data-testid="rfp-period" className="w-full [&_input]:!text-xs !rounded-lg" />
            </Form.Item>

            <Form.Item
              name="requirements"
              label={<span className="text-xs font-semibold text-slate-700">Requirements</span>}
              rules={[
                { required: true, message: 'Describe the service requirements' },
                { max: 4000, message: 'Requirements cannot exceed 4000 characters' },
              ]}
            >
              <Input.TextArea
                data-testid="rfp-requirements"
                rows={5}
                showCount
                maxLength={4000}
                placeholder="Describe volumes, operating hours, service levels, equipment, and other requirements"
                className="!text-xs !rounded-lg"
              />
            </Form.Item>

            <button
              data-testid="publish-rfp"
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg px-4 py-2 h-9 shadow-xs focus:ring-2 focus:ring-blue-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {publishing ? 'Publishing...' : 'Publish RFP'}
            </button>
          </Form>
        </div>
      </div>

      {/* Published RFPs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">My Published RFPs</span>
        </div>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rfps}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: (
              <div className="py-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 m-0">No RFPs published yet</p>
              </div>
            )}}
            expandable={{
              expandedRowRender: rfp => (
                <p className="text-xs text-slate-600 m-0 leading-relaxed">{rfp.requirements}</p>
              ),
            }}
            className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
          />
        </Spin>
      </div>

      {/* Proposal Evaluation Modal */}
      <Modal
        open={Boolean(evaluationRfp)}
        title={evaluationRfp ? `Proposals for ${evaluationRfp.serviceType} at ${evaluationRfp.airportCode}` : 'RFP Proposals'}
        width={1000}
        footer={null}
        onCancel={() => {
          setEvaluationRfp(undefined);
          setProposals([]);
          setProposalError(undefined);
        }}
      >
        {proposalError && <Alert type="error" showIcon message={proposalError} className="mb-4 rounded-xl border-rose-200 bg-rose-50" />}
        {evaluationRfp?.status === 'AWARDED' && (
          <Alert type="success" showIcon message="This RFP has been awarded." className="mb-4 rounded-xl" />
        )}
        <Spin spinning={loadingProposals}>
          <Table
            data-testid="proposal-comparison"
            rowKey="id"
            columns={proposalColumns}
            dataSource={proposals}
            pagination={false}
            locale={{ emptyText: (
              <div className="py-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 m-0">No proposals submitted yet</p>
              </div>
            )}}
            scroll={{ x: 800 }}
            className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
          />
        </Spin>
      </Modal>

    </div>
  );
};

export default AirlineRfps;
