import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Space, Spin, Table, Tag, Typography } from 'antd';
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
      title: 'Requested',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: value => new Date(String(value)).toLocaleString(),
    },
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    {
      title: 'Contract',
      dataIndex: 'contractId',
      key: 'contractId',
      render: value => <Text code>{String(value).slice(0, 8)}…</Text>,
    },
    {
      title: 'Contract Status',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      render: value => <Tag color="success">{String(value)}</Tag>,
    },
    { title: 'Requested By', dataIndex: 'requestedBy', key: 'requestedBy' },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: value => <Text>{String(value)}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Contract Review Requests</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Airline comments on approved contracts within your assigned airports, airlines, and service types.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No contract review requests in your access scope" /> }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default ContractReviewRequests;
