import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

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

const statusColor = (status: string): string => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REVIEW_REQUESTED') return 'error';
  if (status === 'PENDING_APPROVAL') return 'warning';
  return 'default';
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
      title: 'Sent',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: value => new Date(String(value)).toLocaleString(),
    },
    { title: 'Supplier', dataIndex: 'groundHandlerId', key: 'groundHandlerId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    {
      title: 'Services',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: values => <Space size={[4, 4]} wrap>{values.map((value: string) => <Tag key={value}>{value}</Tag>)}</Space>,
    },
    {
      title: 'Contract',
      dataIndex: 'contractId',
      key: 'contractId',
      render: value => <Text code>{String(value).slice(0, 8)}…</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      render: value => <Tag color={statusColor(String(value))}>{String(value)}</Tag>,
    },
    { title: 'Requested By', dataIndex: 'requestedBy', key: 'requestedBy' },
    { title: 'Comment', dataIndex: 'comment', key: 'comment' },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Review Requests Sent</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Track contract review requests sent to suppliers within your airport and service access scope.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Requests Sent" value={requests.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Suppliers" value={suppliers.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Airports" value={airports.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Service Types" value={services.length} /></Card></Col>
      </Row>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="review-summary-supplier-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All suppliers"
              value={supplierFilter}
              options={suppliers.map(value => ({ value, label: value }))}
              onChange={setSupplierFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="review-summary-airport-filter"
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
              data-testid="review-summary-service-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All services"
              value={serviceFilter}
              options={services.map(value => ({ value, label: value }))}
              onChange={setServiceFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              data-testid="review-summary-status-filter"
              allowClear
              style={{ width: '100%' }}
              placeholder="All statuses"
              value={statusFilter}
              options={statuses.map(value => ({ value, label: value }))}
              onChange={setStatusFilter}
            />
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredRequests}
            rowKey="id"
            onRow={request => ({ id: `airline-review-request-${request.id}` })}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No sent review requests match the selected filters" /> }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default AirlineReviewRequests;
