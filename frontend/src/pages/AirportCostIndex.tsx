import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Title, Text } = Typography;

interface CostIndexRow {
  airportCode: string;
  airportName: string;
  region: string;
  serviceType: string;
  serviceName: string;
  aircraftType: string;
  operationType: string;
  currency: string;
  averageCost: number;
  observationCount: number;
}

const AirportCostIndex: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [rows, setRows] = useState<CostIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [airport, setAirport] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [service, setService] = useState<string>();
  const [aircraft, setAircraft] = useState<string>();
  const [operation, setOperation] = useState<string>();

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airport) params.set('airportCode', airport);
    if (region) params.set('region', region);
    if (service) params.set('serviceType', service);
    if (aircraft) params.set('aircraftType', aircraft);
    if (operation) params.set('operationType', operation);
    try {
      const response = await fetch(
        `/api/market-intelligence/airport-cost-index?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit market intelligence.'
          : 'Airport cost index could not be loaded.');
      }
      setRows(await response.json());
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Airport cost index could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [aircraft, airport, headers, operation, region, service]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const options = (values: string[]) =>
    [...new Set(values)].sort().map(value => ({ value, label: value }));

  const airportOptions = options(rows.map(row => row.airportCode));
  const regionOptions = options(rows.map(row => row.region));
  const serviceOptions = options(rows.map(row => row.serviceType));
  const aircraftOptions = options(rows.map(row => row.aircraftType));
  const currencies = new Set(rows.map(row => row.currency)).size;

  const columns = [
    {
      title: 'Airport',
      key: 'airport',
      render: (_: unknown, row: CostIndexRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.airportCode} — {row.airportName}</Text>
          <Text type="secondary">{row.region}</Text>
        </Space>
      ),
    },
    {
      title: 'Service',
      key: 'service',
      render: (_: unknown, row: CostIndexRow) => (
        <Space direction="vertical" size={0}>
          <Text>{row.serviceName}</Text>
          <Text type="secondary">{row.serviceType}</Text>
        </Space>
      ),
    },
    { title: 'Aircraft', dataIndex: 'aircraftType', key: 'aircraftType' },
    {
      title: 'Operation',
      dataIndex: 'operationType',
      key: 'operationType',
      render: (value: string) => <Tag color={value === 'INTERNATIONAL' ? 'blue' : 'green'}>{value}</Tag>,
    },
    {
      title: 'Average billed cost',
      key: 'averageCost',
      align: 'right' as const,
      render: (_: unknown, row: CostIndexRow) => (
        <Text strong>{row.currency} {Number(row.averageCost).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</Text>
      ),
    },
    {
      title: 'Observations',
      dataIndex: 'observationCount',
      key: 'observationCount',
      align: 'right' as const,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Airport Cost Index</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Confidentiality-safe billed-cost averages. A segment appears only when at least two
          distinct suppliers contribute dispatched invoice data.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Published Segments" value={rows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Airports" value={new Set(rows.map(row => row.airportCode)).size} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Services" value={new Set(rows.map(row => row.serviceType)).size} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Currencies" value={currencies} /></Card></Col>
      </Row>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={5}>
            <Select data-testid="cost-index-region-filter" allowClear style={{ width: '100%' }}
              placeholder="All regions" value={region} options={regionOptions} onChange={setRegion} />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select data-testid="cost-index-airport-filter" allowClear style={{ width: '100%' }}
              placeholder="All airports" value={airport} options={airportOptions} onChange={setAirport} />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select data-testid="cost-index-service-filter" allowClear style={{ width: '100%' }}
              placeholder="All services" value={service} options={serviceOptions} onChange={setService} />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select data-testid="cost-index-aircraft-filter" allowClear style={{ width: '100%' }}
              placeholder="All aircraft" value={aircraft} options={aircraftOptions} onChange={setAircraft} />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select data-testid="cost-index-operation-filter" allowClear style={{ width: '100%' }}
              placeholder="All operations" value={operation}
              options={['DOMESTIC', 'INTERNATIONAL'].map(value => ({ value, label: value }))}
              onChange={setOperation} />
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            data-testid="airport-cost-index-table"
            columns={columns}
            dataSource={rows}
            rowKey={row => [
              row.airportCode,
              row.serviceType,
              row.aircraftType,
              row.operationType,
              row.currency,
            ].join('-')}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No confidentiality-safe cost segments match the selected filters" /> }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default AirportCostIndex;
