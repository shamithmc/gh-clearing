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
import { ArrowRightOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

interface CurrencySummary {
  currency: string;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface GroupedAmount {
  key: string;
  currency: string;
  totalBilled: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface InvoiceDrilldown {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  airportCode: string;
  issueDate: string;
  dueDate: string;
  status: 'SENT' | 'DISPUTED' | 'PAID';
  currency: string;
  invoiceTotal: number;
  filteredAmount: number;
  serviceTypes: string[];
}

interface BilledAmountsReport {
  summaries: CurrencySummary[];
  bySupplier: GroupedAmount[];
  byAirport: GroupedAmount[];
  byService: GroupedAmount[];
  invoices: InvoiceDrilldown[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: BilledAmountsReport = {
  summaries: [],
  bySupplier: [],
  byAirport: [],
  byService: [],
  invoices: [],
};

const colors = ['#1677ff', '#13c2c2', '#52c41a', '#faad14', '#722ed1', '#eb2f96'];

const formatAmount = (amount: number, currency: string) =>
  `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const SupplierPie: React.FC<{
  data: GroupedAmount[];
  currency: string;
  onSelect: (supplierId: string) => void;
}> = ({ data, currency, onSelect }) => {
  const total = data.reduce((sum, item) => sum + Number(item.totalBilled), 0);
  if (data.length === 0 || total <= 0) {
    return <Empty description="No supplier billing for this currency" />;
  }
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="180" height="180" viewBox="0 0 120 120" aria-label="Supplier billed amounts pie chart">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f0f0f0" strokeWidth="16" />
          {data.map((item, index) => {
            const length = (Number(item.totalBilled) / total) * circumference;
            const offset = -consumed;
            consumed += length;
            return (
              <circle
                key={`${item.key}-${item.currency}`}
                data-testid={`supplier-pie-${item.key}`}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={offset}
                onClick={() => onSelect(item.key)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>
        <text x="60" y="57" textAnchor="middle" fontSize="9" fill="#8c8c8c">TOTAL</text>
        <text x="60" y="70" textAnchor="middle" fontSize="10" fontWeight="bold">
          {formatAmount(total, currency)}
        </text>
      </svg>
      <Space direction="vertical" size={8}>
        {data.map((item, index) => (
          <Button key={item.key} type="text" onClick={() => onSelect(item.key)} style={{ padding: 0 }}>
            <Space>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: colors[index % colors.length],
                display: 'inline-block',
              }} />
              <Text strong>{item.key}</Text>
              <Text type="secondary">{formatAmount(item.totalBilled, currency)}</Text>
            </Space>
          </Button>
        ))}
      </Space>
    </div>
  );
};

const BreakdownBars: React.FC<{
  data: GroupedAmount[];
  currency: string;
  testIdPrefix: string;
  onSelect: (key: string) => void;
}> = ({ data, currency, testIdPrefix, onSelect }) => {
  const maximum = Math.max(...data.map(item => Number(item.totalBilled)), 0);
  if (data.length === 0 || maximum <= 0) {
    return <Empty description="No billed amounts for this dimension" />;
  }
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {data.map(item => (
        <button
          key={`${item.key}-${item.currency}`}
          data-testid={`${testIdPrefix}-${item.key}`}
          type="button"
          onClick={() => onSelect(item.key)}
          style={{ border: 0, background: 'transparent', padding: 0, width: '100%', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.key}</Text>
            <Text>{formatAmount(item.totalBilled, currency)}</Text>
          </div>
          <div style={{ height: 12, borderRadius: 8, background: '#f0f0f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(Number(item.totalBilled) / maximum) * 100}%`,
              background: 'linear-gradient(90deg, #1677ff, #69b1ff)',
              borderRadius: 8,
            }} />
          </div>
        </button>
      ))}
    </Space>
  );
};

const AirlineBilledAmountsPanel: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<BilledAmountsReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
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
    const params = new URLSearchParams();
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    try {
      const response = await fetch(
        `/api/airline/reports/billed-amounts?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit airline financial reports.'
          : 'Billed amounts could not be loaded.');
      }
      const nextReport: BilledAmountsReport = await response.json();
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
      setError(cause instanceof Error ? cause.message : 'Billed amounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, endDate, headers, serviceType, startDate, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report.summaries.find(item => item.currency === currency);
  const forCurrency = (items: GroupedAmount[]) =>
    items.filter(item => item.currency === currency);
  const invoiceRows = report.invoices.filter(invoice => invoice.currency === currency);

  const invoiceColumns: TableColumnsType<InvoiceDrilldown> = [
    { title: 'Invoice', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    {
      title: 'Services',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: (values: string[]) => (
        <Space size={[4, 4]} wrap>{values.map(value => <Tag key={value}>{value}</Tag>)}</Space>
      ),
    },
    {
      title: 'Billed',
      key: 'filteredAmount',
      align: 'right',
      render: (_, invoice) => formatAmount(invoice.filteredAmount, invoice.currency),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={value === 'PAID' ? 'success' : value === 'DISPUTED' ? 'error' : 'blue'}>
          {value}
        </Tag>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Billed Amounts</Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            AFR1 supplier billing by airport and service, with invoice-level drill-down.
          </Paragraph>
        </div>
        <Button onClick={() => navigate('/airline/invoices')} icon={<ArrowRightOutlined />}>
          Open Invoice Workspace
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="afr1-supplier-filter" allowClear showSearch optionFilterProp="label"
              style={{ width: '100%' }} placeholder="All suppliers" value={supplierId}
              options={knownSuppliers.map(value => ({ value, label: value }))} onChange={setSupplierId} />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="afr1-airport-filter" allowClear showSearch optionFilterProp="label"
              style={{ width: '100%' }} placeholder="All airports" value={airportCode}
              options={airports.map(item => ({ value: item.iataCode, label: `${item.iataCode} — ${item.name}` }))}
              onChange={setAirportCode} />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="afr1-service-filter" allowClear showSearch optionFilterProp="label"
              style={{ width: '100%' }} placeholder="All services" value={serviceType}
              options={services.map(item => ({ value: item.code, label: `${item.code} — ${item.displayName}` }))}
              onChange={setServiceType} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <RangePicker data-testid="afr1-date-filter" style={{ width: '100%' }}
              onChange={dates => {
                setStartDate(dates?.[0]?.format('YYYY-MM-DD'));
                setEndDate(dates?.[1]?.format('YYYY-MM-DD'));
              }} />
          </Col>
          <Col xs={24} sm={12} xl={3}>
            <Select data-testid="afr1-currency-filter" style={{ width: '100%' }}
              placeholder="Currency" value={currency}
              options={report.summaries.map(item => ({ value: item.currency, label: item.currency }))}
              onChange={setCurrency} />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {!summary && !loading ? (
          <Empty description="No dispatched billing matches the selected filters" />
        ) : (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} lg={6}><Card data-testid="afr1-total-billed"><Statistic title="Total Billed" value={summary?.totalBilled || 0} precision={2} prefix={currency} /></Card></Col>
              <Col xs={12} lg={6}><Card data-testid="afr1-total-paid"><Statistic title="Paid" value={summary?.totalPaid || 0} precision={2} prefix={currency} valueStyle={{ color: '#389e0d' }} /></Card></Col>
              <Col xs={12} lg={6}><Card data-testid="afr1-total-outstanding"><Statistic title="Outstanding" value={summary?.totalOutstanding || 0} precision={2} prefix={currency} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col xs={12} lg={6}><Card data-testid="afr1-invoice-count"><Statistic title="Invoices" value={summary?.invoiceCount || 0} /></Card></Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} xl={12}>
                <Card title={<Space><PieChartOutlined />Supplier Share</Space>}>
                  <SupplierPie data={forCurrency(report.bySupplier)} currency={currency || ''} onSelect={setSupplierId} />
                </Card>
              </Col>
              <Col xs={24} xl={12}>
                <Card title={<Space><BarChartOutlined />Airport-wise Billing</Space>}>
                  <BreakdownBars data={forCurrency(report.byAirport)} currency={currency || ''}
                    testIdPrefix="afr1-airport-bar" onSelect={setAirportCode} />
                </Card>
              </Col>
              <Col xs={24}>
                <Card title={<Space><BarChartOutlined />Service-wise Billing</Space>}>
                  <BreakdownBars data={forCurrency(report.byService)} currency={currency || ''}
                    testIdPrefix="afr1-service-bar" onSelect={setServiceType} />
                </Card>
              </Col>
            </Row>

            <Card title="Invoice Drill-down" styles={{ body: { padding: 0 } }}>
              <Table data-testid="afr1-invoice-table" rowKey="id" columns={invoiceColumns}
                dataSource={invoiceRows} pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="No invoices match the selected report filters" /> }}
                scroll={{ x: 900 }} />
            </Card>
          </Space>
        )}
      </Spin>
    </Space>
  );
};

export default AirlineBilledAmountsPanel;
