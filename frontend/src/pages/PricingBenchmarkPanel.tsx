import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Title, Text } = Typography;

interface PricingBenchmarkRow {
  airportCode: string;
  airportName: string;
  region: string;
  serviceType: string;
  serviceName: string;
  aircraftType: string;
  operationType: string;
  currency: string;
  airlineAverageCost: number;
  airlineObservationCount: number;
  marketPosition: string;
}

const positionPresentation: Record<string, { label: string; color: string }> = {
  TOP_25_PERCENT_PREMIUM: { label: 'Top 25% — Premium', color: 'volcano' },
  MID_50_PERCENT: { label: 'Mid 50% — Market Range', color: 'blue' },
  BOTTOM_25_PERCENT_DISCOUNT: { label: 'Bottom 25% — Discount', color: 'green' },
};

const PricingBenchmarkPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [rows, setRows] = useState<PricingBenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [airport, setAirport] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [service, setService] = useState<string>();
  const [aircraft, setAircraft] = useState<string>();
  const [operation, setOperation] = useState<string>();
  const [position, setPosition] = useState<string>();

  const loadBenchmarks = useCallback(async () => {
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
        `/api/market-intelligence/pricing-benchmarks?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit pricing benchmarks.'
          : 'Pricing benchmarks could not be loaded.');
      }
      setRows(await response.json());
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Pricing benchmarks could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [aircraft, airport, headers, operation, region, service]);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  const options = (values: string[]) =>
    [...new Set(values)].sort().map(value => ({ value, label: value }));
  const visibleRows = position
    ? rows.filter(row => row.marketPosition === position)
    : rows;

  const columns = [
    {
      title: 'Airport',
      key: 'airport',
      render: (_: unknown, row: PricingBenchmarkRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.airportCode} — {row.airportName}</Text>
          <Text type="secondary">{row.region}</Text>
        </Space>
      ),
    },
    {
      title: 'Service',
      key: 'service',
      render: (_: unknown, row: PricingBenchmarkRow) => (
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
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Your average cost',
      key: 'airlineAverageCost',
      align: 'right' as const,
      render: (_: unknown, row: PricingBenchmarkRow) => (
        <Text strong>{row.currency} {Number(row.airlineAverageCost).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</Text>
      ),
    },
    {
      title: 'Market position',
      dataIndex: 'marketPosition',
      key: 'marketPosition',
      render: (value: string) => {
        const presentation = positionPresentation[value] || { label: value, color: 'default' };
        return <Tag color={presentation.color}>{presentation.label}</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 32 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>Pricing Benchmark</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          See where your billed rates sit in the market without exposing competitor rates or
          supplier identities. Benchmarks appear only for confidentiality-safe segments.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card><Statistic title="Benchmarked Segments" value={rows.length} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Premium" value={rows.filter(row => row.marketPosition === 'TOP_25_PERCENT_PREMIUM').length} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Market Range" value={rows.filter(row => row.marketPosition === 'MID_50_PERCENT').length} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Discount" value={rows.filter(row => row.marketPosition === 'BOTTOM_25_PERCENT_DISCOUNT').length} /></Card>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-region-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All regions" value={region} options={options(rows.map(row => row.region))}
              onChange={setRegion} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-airport-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All airports" value={airport} options={options(rows.map(row => row.airportCode))}
              onChange={setAirport} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-service-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All services" value={service} options={options(rows.map(row => row.serviceType))}
              onChange={setService} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-aircraft-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All aircraft" value={aircraft} options={options(rows.map(row => row.aircraftType))}
              onChange={setAircraft} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-operation-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All operations" value={operation}
              options={['DOMESTIC', 'INTERNATIONAL'].map(value => ({ value, label: value }))}
              onChange={setOperation} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="benchmark-position-filter" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
              placeholder="All positions" value={position}
              options={Object.entries(positionPresentation).map(([value, item]) => ({
                value,
                label: item.label,
              }))}
              onChange={setPosition} />
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            data-testid="pricing-benchmark-table"
            columns={columns}
            dataSource={visibleRows}
            rowKey={row => [
              row.airportCode,
              row.serviceType,
              row.aircraftType,
              row.operationType,
              row.currency,
            ].join('-')}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No confidentiality-safe benchmarks match the selected filters" /> }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default PricingBenchmarkPanel;
