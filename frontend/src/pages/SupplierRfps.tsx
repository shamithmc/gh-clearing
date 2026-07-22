import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Form, Input, InputNumber, message, Modal, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

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
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Service', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'Desired Contract Period',
      key: 'period',
      render: (_, rfp) => `${rfp.desiredStartDate} to ${rfp.desiredEndDate}`,
    },
    {
      title: 'RFP Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Tag color={status === 'AWARDED' ? 'purple' : status === 'CLOSED' ? 'default' : 'processing'}>{status}</Tag>,
    },
    {
      title: 'Response',
      dataIndex: 'responseStatus',
      key: 'responseStatus',
      render: status => <Tag color={status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'error' : status === 'SUBMITTED' ? 'processing' : 'default'}>{status.split('_').join(' ')}</Tag>,
    },
    {
      title: 'Outcome',
      dataIndex: 'outcome',
      key: 'outcome',
      render: outcome => <Tag color={outcome === 'WON' ? 'success' : outcome === 'NOT_SELECTED' ? 'error' : outcome === 'PENDING_DECISION' ? 'gold' : 'default'}>{outcome.split('_').join(' ')}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, rfp) => rfp.proposalStatus ? (
        <Text>{rfp.proposalCurrency} {rfp.proposedRate}</Text>
      ) : rfp.status === 'PUBLISHED' ? (
        <Button
          data-testid={`respond-rfp-${rfp.id}`}
          icon={<SendOutlined />}
          onClick={() => {
            form.resetFields();
            setSelectedRfp(rfp);
          }}
        >
          Submit Proposal
        </Button>
      ) : <Text type="secondary">Response closed</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>RFP Summary</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Track every eligible airline request, your response status, and the final procurement outcome.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card data-testid="rfp-summary-received"><Statistic title="Received" value={rfps.length} /></Card></Col>
        <Col xs={12} md={6}><Card data-testid="rfp-summary-responded"><Statistic title="Responded" value={responded} /></Card></Col>
        <Col xs={12} md={6}><Card data-testid="rfp-summary-pending"><Statistic title="Pending Decision" value={pending} /></Card></Col>
        <Col xs={12} md={6}><Card data-testid="rfp-summary-won"><Statistic title="Won" value={won} valueStyle={{ color: '#389e0d' }} /></Card></Col>
      </Row>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="rfp-summary-airline-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All airlines"
              value={airlineFilter}
              options={airlines.map(value => ({ value, label: value }))}
              onChange={setAirlineFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="rfp-summary-airport-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All airports"
              value={airportFilter}
              options={airports.map(value => ({ value, label: value }))}
              onChange={setAirportFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="rfp-summary-response-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All responses"
              value={responseFilter}
              options={['NOT_SUBMITTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED'].map(value => ({ value, label: value.split('_').join(' ') }))}
              onChange={setResponseFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="rfp-summary-outcome-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All outcomes"
              value={outcomeFilter}
              options={['OPEN', 'PENDING_DECISION', 'WON', 'NOT_SELECTED', 'CLOSED'].map(value => ({ value, label: value.split('_').join(' ') }))}
              onChange={setOutcomeFilter}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          onRow={rfp => ({ id: `rfp-summary-row-${rfp.id}` })}
          columns={columns}
          dataSource={filteredRfps}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No RFPs match the selected filters" /> }}
          expandable={{
            expandedRowRender: rfp => (
              <Space direction="vertical">
                <Text strong>Requirements</Text>
                <Paragraph style={{ margin: 0 }}>{rfp.requirements}</Paragraph>
                {rfp.proposalTerms && (
                  <>
                    <Text strong>Submitted terms</Text>
                    <Paragraph style={{ margin: 0 }}>{rfp.proposalTerms}</Paragraph>
                  </>
                )}
              </Space>
            ),
          }}
        />
      </Spin>

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
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="proposedRate"
            label="Proposed rate"
            rules={[{ required: true, message: 'Enter a proposed rate' }]}
          >
            <InputNumber
              data-testid="proposal-rate"
              min={0.0001}
              precision={4}
              style={{ width: '100%' }}
              placeholder="Rate for the requested service"
            />
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Select
              data-testid="proposal-currency"
              options={['USD', 'EUR', 'GBP', 'AED'].map(currency => ({ value: currency, label: currency }))}
            />
          </Form.Item>
          <Form.Item
            name="terms"
            label="Commercial and service terms"
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
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default SupplierRfps;
