import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Form, Input, message, Modal, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

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

const statusColor = (status: string): string => {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING_APPROVAL') return 'warning';
  if (status === 'REVIEW_REQUESTED') return 'error';
  return 'default';
};

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
    } finally {
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

  const columns: TableColumnsType<Contract> = [
    { title: 'Contract', dataIndex: 'id', key: 'id', render: id => `${String(id).slice(0, 8)}…` },
    { title: 'Ground Handler', dataIndex: 'groundHandlerId', key: 'groundHandlerId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Valid From', dataIndex: 'startDate', key: 'startDate' },
    { title: 'Valid To', dataIndex: 'endDate', key: 'endDate' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Tag color={statusColor(String(status))}>{String(status)}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, contract) => contract.status === 'APPROVED' ? (
        <Button
          data-testid={`request-review-${contract.id}`}
          onClick={() => {
            reviewForm.resetFields();
            setReviewContract(contract);
          }}
        >
          Request Review
        </Button>
      ) : null,
    },
  ];

  const serviceColumns: TableColumnsType<ServiceLine> = [
    { title: 'Service Type', dataIndex: 'chargeCode', key: 'chargeCode' },
    { title: 'Service', dataIndex: 'serviceName', key: 'serviceName' },
    { title: 'Formula', dataIndex: 'formulaType', key: 'formulaType' },
    { title: 'Driver', dataIndex: 'quantityDriver', key: 'quantityDriver' },
    { title: 'UoM', dataIndex: 'uom', key: 'uom' },
    {
      title: 'Rate Details',
      dataIndex: 'rateDetails',
      key: 'rateDetails',
      render: details => <Text code>{JSON.stringify(details)}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Space size="middle" wrap>
          <Title level={2} style={{ margin: 0 }}>My Contracts</Title>
          <Tag color="blue">Read only</Tag>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Contracts shared with {tenantId}. Airport and service access is applied from your user profile.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12} lg={8}>
            <Text strong>Airport</Text>
            <Select
              data-testid="airport-filter"
              aria-label="Airport filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All airports"
              value={airportCode}
              onChange={setAirportCode}
              style={{ display: 'block', marginTop: 6 }}
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} — ${airport.name}`,
              }))}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Text strong>Service type</Text>
            <Select
              data-testid="service-type-filter"
              aria-label="Service type filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All service types"
              value={serviceType}
              onChange={setServiceType}
              style={{ display: 'block', marginTop: 6 }}
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} — ${chargeCode.displayName}`,
              }))}
            />
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={contracts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No contracts match your access and filters" /> }}
            expandable={{
              expandedRowRender: contract => (
                <Table
                  columns={serviceColumns}
                  dataSource={contract.services}
                  rowKey={service => `${contract.id}-${service.chargeCode}`}
                  pagination={false}
                  size="small"
                />
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Request contract review"
        open={Boolean(reviewContract)}
        okText="Send Request"
        confirmLoading={submittingReview}
        onOk={submitReviewRequest}
        onCancel={() => {
          setReviewContract(undefined);
          reviewForm.resetFields();
        }}
        destroyOnClose
      >
        <Paragraph type="secondary">
          The approved contract remains active and read-only. Your comment will be added to the ground handler's review queue.
        </Paragraph>
        <Form form={reviewForm} layout="vertical" preserve={false}>
          <Form.Item
            name="comment"
            label="Review comment"
            rules={[
              { required: true, whitespace: true, message: 'Enter a review comment' },
              { max: 2000, message: 'Comment must not exceed 2000 characters' },
            ]}
          >
            <Input.TextArea
              data-testid="review-comment"
              aria-label="Review comment"
              rows={5}
              maxLength={2000}
              showCount
              placeholder="Describe the terms or rates that need review"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default AirlineContracts;
