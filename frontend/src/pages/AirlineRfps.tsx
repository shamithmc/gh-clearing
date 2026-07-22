import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, message, Modal, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import type { Dayjs } from 'dayjs';
import { SendOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

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
    { title: 'Supplier', dataIndex: 'groundHandlerId', key: 'groundHandlerId' },
    {
      title: 'Proposed Rate',
      key: 'proposedRate',
      render: (_, proposal) => `${proposal.currency} ${Number(proposal.proposedRate).toLocaleString()}`,
    },
    { title: 'Terms', dataIndex: 'terms', key: 'terms' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Tag color={status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'error' : 'processing'}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, proposal) => proposal.status === 'SUBMITTED' && evaluationRfp?.status === 'PUBLISHED' ? (
        <Space wrap>
          <Button
            data-testid={`accept-proposal-${proposal.id}`}
            type="primary"
            loading={decidingProposalId === proposal.id}
            disabled={Boolean(decidingProposalId && decidingProposalId !== proposal.id)}
            onClick={() => decideProposal(proposal, 'ACCEPTED')}
          >
            Accept &amp; Create Draft
          </Button>
          <Button
            data-testid={`reject-proposal-${proposal.id}`}
            danger
            loading={decidingProposalId === proposal.id}
            disabled={Boolean(decidingProposalId && decidingProposalId !== proposal.id)}
            onClick={() => decideProposal(proposal, 'REJECTED')}
          >
            Reject
          </Button>
        </Space>
      ) : null,
    },
  ];

  const columns: TableColumnsType<Rfp> = [
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Service', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'Desired Contract Period',
      key: 'period',
      render: (_, rfp) => `${rfp.desiredStartDate} to ${rfp.desiredEndDate}`,
    },
    {
      title: 'Eligible Suppliers',
      dataIndex: 'eligibleGroundHandlerIds',
      key: 'eligibleGroundHandlerIds',
      render: ids => <Text>{ids.length}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Tag color="processing">{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, rfp) => (
        <Button data-testid={`review-proposals-${rfp.id}`} onClick={() => openEvaluation(rfp)}>
          Review Proposals
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Requests for Proposal</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Publish service requirements to ground handlers configured for your airline and selected airport.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card title="Create RFP">
        <Form<RfpFormValues> form={form} layout="vertical" onFinish={publishRfp}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="airportCode" label="Airport" rules={[{ required: true, message: 'Select an airport' }]}>
                <Select
                  data-testid="rfp-airport"
                  aria-label="RFP airport"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select airport"
                  options={airports.map(airport => ({
                    value: airport.iataCode,
                    label: `${airport.iataCode} - ${airport.name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="serviceType" label="Service type" rules={[{ required: true, message: 'Select a service type' }]}>
                <Select
                  data-testid="rfp-service"
                  aria-label="RFP service type"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select service"
                  options={chargeCodes.map(chargeCode => ({
                    value: chargeCode.code,
                    label: `${chargeCode.code} - ${chargeCode.displayName}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="contractPeriod"
            label="Desired contract period"
            rules={[{ required: true, message: 'Select the desired contract period' }]}
          >
            <RangePicker data-testid="rfp-period" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="requirements"
            label="Requirements"
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
            />
          </Form.Item>

          <Button
            data-testid="publish-rfp"
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={publishing}
          >
            Publish RFP
          </Button>
        </Form>
      </Card>

      <Card title="My Published RFPs" styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rfps}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No RFPs published yet" /> }}
            expandable={{
              expandedRowRender: rfp => <Paragraph style={{ margin: 0 }}>{rfp.requirements}</Paragraph>,
            }}
          />
        </Spin>
      </Card>

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
        {proposalError && <Alert type="error" showIcon message={proposalError} style={{ marginBottom: 16 }} />}
        {evaluationRfp?.status === 'AWARDED' && (
          <Alert type="success" showIcon message="This RFP has been awarded." style={{ marginBottom: 16 }} />
        )}
        <Spin spinning={loadingProposals}>
          <Table
            data-testid="proposal-comparison"
            rowKey="id"
            columns={proposalColumns}
            dataSource={proposals}
            pagination={false}
            locale={{ emptyText: <Empty description="No proposals submitted yet" /> }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Modal>
    </Space>
  );
};

export default AirlineRfps;
