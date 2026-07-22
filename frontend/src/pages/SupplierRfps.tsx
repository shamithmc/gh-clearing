import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Form, Input, InputNumber, message, Modal, Select, Space, Spin, Table, Tag, Typography } from 'antd';
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
      title: 'Response',
      key: 'proposalStatus',
      render: (_, rfp) => rfp.proposalStatus
        ? <Tag color="success">{rfp.proposalStatus}</Tag>
        : <Tag>NOT SUBMITTED</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, rfp) => rfp.proposalStatus ? (
        <Text>{rfp.proposalCurrency} {rfp.proposedRate}</Text>
      ) : (
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
      ),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>RFP Opportunities</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Published airline requests matching your configured airports, airlines, and user access scope.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rfps}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No eligible RFP opportunities" /> }}
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
