import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

interface CurrencySummary {
  currency: string;
  totalExpected: number;
  occurrenceCount: number;
}

interface TimelinePoint {
  date: string;
  currency: string;
  amount: number;
  occurrenceCount: number;
}

interface GroupedAmount {
  key: string;
  currency: string;
  totalExpected: number;
  occurrenceCount: number;
}

interface ProjectionDrilldown {
  expectedDate: string;
  contractId: string;
  serviceId: string;
  supplierId: string;
  airportCode: string;
  serviceType: string;
  serviceName: string;
  billingFrequency: string;
  currency: string;
  expectedAmount: number;
}

interface ExpectedBillingReport {
  startDate?: string;
  endDate?: string;
  summaries: CurrencySummary[];
  timeline: TimelinePoint[];
  bySupplier: GroupedAmount[];
  byAirport: GroupedAmount[];
  byService: GroupedAmount[];
  projections: ProjectionDrilldown[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: ExpectedBillingReport = {
  summaries: [],
  timeline: [],
  bySupplier: [],
  byAirport: [],
  byService: [],
  projections: [],
};

const formatAmount = (amount: number, currency: string) =>
  `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ExpectedBillingLine: React.FC<{
  data: TimelinePoint[];
  currency: string;
  selectedDate?: string;
  onSelect: (date: string) => void;
}> = ({ data, currency, selectedDate, onSelect }) => {
  if (data.length === 0) {
    return <Empty description="No expected billing in this date range" />;
  }
  const width = 820;
  const height = 260;
  const left = 64;
  const right = 24;
  const top = 24;
  const bottom = 48;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(...data.map(point => Number(point.amount)), 1);
  const timestamps = data.map(point => new Date(`${point.date}T00:00:00Z`).getTime());
  const minimumDate = Math.min(...timestamps);
  const maximumDate = Math.max(...timestamps);
  const dateSpan = Math.max(maximumDate - minimumDate, 1);
  const coordinates = data.map((point, index) => ({
    point,
    x: data.length === 1
      ? left + chartWidth / 2
      : left + ((timestamps[index] - minimumDate) / dateSpan) * chartWidth,
    y: top + chartHeight - (Number(point.amount) / maximum) * chartHeight,
  }));
  const path = coordinates.map(({ x, y }, index) =>
    `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Expected billing day versus amount line chart"
        style={{ width: '100%', minWidth: 620, maxHeight: 320 }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#f0f0f0" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8c8c8c">
                {(maximum * ratio).toLocaleString()}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#1677ff" strokeWidth="3" />
        {coordinates.map(({ point, x, y }) => (
          <g
            key={`${point.date}-${point.currency}`}
            data-testid={`afr2-line-point-${point.date}`}
            onClick={() => onSelect(point.date)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={x}
              cy={y}
              r={selectedDate === point.date ? 7 : 5}
              fill={selectedDate === point.date ? '#fa8c16' : '#1677ff'}
              stroke="#fff"
              strokeWidth="2"
            />
            <title>{`${point.date}: ${formatAmount(point.amount, currency)}`}</title>
          </g>
        ))}
        <text x={left} y={height - 14} fontSize="11" fill="#8c8c8c">
          {data[0].date}
        </text>
        <text x={width - right} y={height - 14} textAnchor="end" fontSize="11" fill="#8c8c8c">
          {data[data.length - 1].date}
        </text>
        <text
          x={14}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#595959"
          transform={`rotate(-90 14 ${top + chartHeight / 2})`}
        >
          Amount ({currency})
        </text>
      </svg>
    </div>
  );
};

const DimensionSummary: React.FC<{
  title: string;
  data: GroupedAmount[];
  currency: string;
  testIdPrefix: string;
  onSelect: (value: string) => void;
}> = ({ title, data, currency, testIdPrefix, onSelect }) => (
  <Card size="small" title={title} style={{ height: '100%' }}>
    {data.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
      <Space direction="vertical" style={{ width: '100%' }}>
        {data.slice(0, 6).map(item => (
          <Button
            key={`${item.key}-${item.currency}`}
            data-testid={`${testIdPrefix}-${item.key}`}
            type="text"
            block
            onClick={() => onSelect(item.key)}
            style={{ display: 'flex', justifyContent: 'space-between', paddingInline: 0 }}
          >
            <Text strong>{item.key}</Text>
            <Text>{formatAmount(item.totalExpected, currency)}</Text>
          </Button>
        ))}
      </Space>
    )}
  </Card>
);

const AirlineExpectedBillingPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<ExpectedBillingReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers })
        .then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers })
        .then(response => response.ok ? response.json() : []),
    ]).then(([airportData, serviceData]) => {
      setAirports(airportData);
      setServices(serviceData);
    }).catch(() => {
      setAirports([]);
      setServices([]);
    });
  }, [headers]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setSelectedDate(undefined);
    const params = new URLSearchParams();
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    try {
      const response = await fetch(
        `/api/airline/reports/expected-billing?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit expected billing.'
          : 'Expected billing could not be loaded.');
      }
      const nextReport: ExpectedBillingReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.bySupplier.map(item => item.key),
      ])].sort());
      setCurrency(current => nextReport.summaries.some(item => item.currency === current)
        ? current
        : nextReport.summaries[0]?.currency);
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Expected billing could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, endDate, headers, serviceType, startDate, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report.summaries.find(item => item.currency === currency);
  const forCurrency = <T extends { currency: string },>(items: T[]) =>
    items.filter(item => item.currency === currency);
  const projectionRows = forCurrency(report.projections)
    .filter(item => !selectedDate || item.expectedDate === selectedDate);
  const columns: TableColumnsType<ProjectionDrilldown> = [
    { title: 'Expected Date', dataIndex: 'expectedDate', key: 'expectedDate' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Service', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'Frequency',
      dataIndex: 'billingFrequency',
      key: 'billingFrequency',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Expected',
      key: 'expectedAmount',
      align: 'right',
      render: (_, item) => formatAmount(item.expectedAmount, item.currency),
    },
    { title: 'Contract', dataIndex: 'contractId', key: 'contractId' },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 8 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>Expected Billing</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          AFR2 contract-frequency projections. Values are estimates, not dispatched invoices.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={5}>
            <Select
              data-testid="afr2-supplier-filter"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="All suppliers"
              value={supplierId}
              options={knownSuppliers.map(value => ({ value, label: value }))}
              onChange={setSupplierId}
            />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select
              data-testid="afr2-airport-filter"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="All airports"
              value={airportCode}
              options={airports.map(item => ({
                value: item.iataCode,
                label: `${item.iataCode} — ${item.name}`,
              }))}
              onChange={setAirportCode}
            />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select
              data-testid="afr2-service-filter"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="All services"
              value={serviceType}
              options={services.map(item => ({
                value: item.code,
                label: `${item.code} — ${item.displayName}`,
              }))}
              onChange={setServiceType}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <RangePicker
              data-testid="afr2-date-filter"
              style={{ width: '100%' }}
              onChange={dates => {
                setStartDate(dates?.[0]?.format('YYYY-MM-DD'));
                setEndDate(dates?.[1]?.format('YYYY-MM-DD'));
              }}
            />
          </Col>
          <Col xs={24} sm={12} xl={3}>
            <Select
              data-testid="afr2-currency-filter"
              style={{ width: '100%' }}
              placeholder="Currency"
              value={currency}
              options={report.summaries.map(item => ({
                value: item.currency,
                label: item.currency,
              }))}
              onChange={setCurrency}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {!summary && !loading ? (
          <Empty description="No configured expected billing matches these filters" />
        ) : (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card data-testid="afr2-total-expected">
                  <Statistic
                    title="Total Expected"
                    value={summary?.totalExpected || 0}
                    precision={2}
                    prefix={currency}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card data-testid="afr2-occurrence-count">
                  <Statistic title="Projected Occurrences" value={summary?.occurrenceCount || 0} />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card>
                  <Statistic
                    title="Projection Window"
                    value={`${report.startDate || '—'} → ${report.endDate || '—'}`}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Space><LineChartOutlined />Day vs. Expected Amount</Space>}>
              <ExpectedBillingLine
                data={forCurrency(report.timeline)}
                currency={currency || ''}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <DimensionSummary
                  title="By Supplier"
                  data={forCurrency(report.bySupplier)}
                  currency={currency || ''}
                  testIdPrefix="afr2-supplier"
                  onSelect={setSupplierId}
                />
              </Col>
              <Col xs={24} lg={8}>
                <DimensionSummary
                  title="By Airport"
                  data={forCurrency(report.byAirport)}
                  currency={currency || ''}
                  testIdPrefix="afr2-airport"
                  onSelect={setAirportCode}
                />
              </Col>
              <Col xs={24} lg={8}>
                <DimensionSummary
                  title="By Service"
                  data={forCurrency(report.byService)}
                  currency={currency || ''}
                  testIdPrefix="afr2-service"
                  onSelect={setServiceType}
                />
              </Col>
            </Row>

            <Card
              title={selectedDate ? `Expected Amounts — ${selectedDate}` : 'Expected Amount Drill-down'}
              extra={selectedDate
                ? <Button type="link" onClick={() => setSelectedDate(undefined)}>Show all dates</Button>
                : undefined}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                data-testid="afr2-projection-table"
                rowKey={item => `${item.expectedDate}-${item.contractId}-${item.serviceId}`}
                columns={columns}
                dataSource={projectionRows}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="No projected amounts" /> }}
                scroll={{ x: 900 }}
              />
            </Card>
          </Space>
        )}
      </Spin>
    </Space>
  );
};

export default AirlineExpectedBillingPanel;
