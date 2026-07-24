import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Empty, Spin, Select, DatePicker, Space } from 'antd';
import { 
  FileDoneOutlined, 
  FileTextOutlined, 
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getSimulatedUserId, scopedUserId, setSimulatedUserId, simulatedAuthHeaders, unrestrictedUserId } from '../utils/simulatedAuth';
import SupplierOperationalFootprintPanel from './SupplierOperationalFootprintPanel';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface GroupedReceivable {
  key: string;
  amount: number;
}

interface AgingBuckets {
  zeroToThirty: number;
  thirtyOneToSixty: number;
  sixtyOneToNinety: number;
  ninetyPlus: number;
}

interface ReceivablesSummary {
  totalOutstanding: number;
  byAirline: GroupedReceivable[];
  byAirport: GroupedReceivable[];
  aging: AgingBuckets;
}

interface InvoicedTrend {
  month: string;
  totalAmount: number;
}

interface RevenuePerFlightTrend {
  month: string;
  averageRevenue: number;
}

interface ExpiringContract {
  id: string;
  airlineId: string;
  airportCode: string;
  endDate: string;
  daysRemaining: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<ReceivablesSummary | null>(null);
  const [invoicedTrend, setInvoicedTrend] = useState<InvoicedTrend[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePerFlightTrend[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);

  // Dimension Filters State
  const [selectedAirline, setSelectedAirline] = useState<string | undefined>(undefined);
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Simulated tenant state to fetch headers properly if configured
  const simTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const simTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const [simUserId, setSimUserId] = useState<string>(() => getSimulatedUserId(simTenantId));

  useEffect(() => {
    setLoading(true);
    const headers = simulatedAuthHeaders(simTenantId, simTenantType, simUserId);

    const params: any = {};
    if (selectedAirline) params.airlineId = selectedAirline;
    if (selectedAirport) params.airportCode = selectedAirport;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    Promise.all([
      axios.get('/api/dashboard/receivables', { headers, params }),
      axios.get('/api/dashboard/invoiced-monthly', { headers, params }),
      axios.get('/api/dashboard/revenue-per-flight', { headers, params }),
      axios.get('/api/dashboard/expiring-contracts', { 
        headers, 
        params: { 
          airlineId: selectedAirline, 
          airportCode: selectedAirport 
        } 
      })
    ])
      .then(([recRes, invRes, revRes, expRes]) => {
        setReceivables(recRes.data);
        setInvoicedTrend(invRes.data);
        setRevenueTrend(revRes.data);
        setExpiringContracts(expRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
        setLoading(false);
      });
  }, [simTenantId, simTenantType, simUserId, selectedAirline, selectedAirport, startDate, endDate]);

  const handlePersonaChange = (userId: string) => {
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  // Calculate sum of invoicing trends
  const totalInvoicedThisMonth = invoicedTrend.length > 0 
    ? invoicedTrend[invoicedTrend.length - 1].totalAmount 
    : 0;

  // Custom Donut Slices Helper
  const renderDonutChart = () => {
    if (!receivables || !receivables.byAirline || receivables.byAirline.length === 0) {
      return <Empty description="No receivables outstanding" />;
    }

    const data = receivables.byAirline;
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const colors = ['#1890ff', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2', '#3436c7'];

    let accumulatedPercentage = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <svg width="180" height="180" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f0f2f5" strokeWidth="12" />
          {data.map((item, index) => {
            const percentage = (item.amount / total) * 100;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);
            accumulatedPercentage += percentage;

            return (
              <circle
                key={item.key}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.setAttribute('stroke-width', '16')}
                onMouseLeave={(e) => e.currentTarget.setAttribute('stroke-width', '12')}
              />
            );
          })}
          {/* Donut Hole */}
          <circle cx="60" cy="60" r="38" fill="#ffffff" />
        </svg>
        <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '200px' }}>
          {data.map((item, index) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                backgroundColor: colors[index % colors.length],
                borderRadius: '50%',
                marginRight: 8
              }} />
              <Text strong style={{ marginRight: 6 }}>{item.key}:</Text>
              <Text type="secondary">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Custom SVG Bar Chart for Invoiced Amount
  const renderBarChart = () => {
    if (invoicedTrend.length === 0) {
      return <Empty description="No invoiced history available" />;
    }

    const maxVal = Math.max(...invoicedTrend.map(t => t.totalAmount), 1);
    const chartHeight = 120;
    const barWidth = 40;
    const gap = 20;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width={invoicedTrend.length * (barWidth + gap) + 40} height="170" viewBox={`0 0 ${invoicedTrend.length * (barWidth + gap) + 40} 170`}>
          {/* Grid lines */}
          <line x1="20" y1={chartHeight + 10} x2={invoicedTrend.length * (barWidth + gap) + 20} y2={chartHeight + 10} stroke="#e8e8e8" strokeWidth="1" />
          <line x1="20" y1="10" x2={invoicedTrend.length * (barWidth + gap) + 20} y2="10" stroke="#f5f5f5" strokeWidth="1" strokeDasharray="3 3" />
          
          {invoicedTrend.map((data, index) => {
            const barHeight = (data.totalAmount / maxVal) * chartHeight;
            const x = index * (barWidth + gap) + 20;
            const y = chartHeight - barHeight + 10;

            return (
              <g key={data.month}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGrad)"
                  rx="4"
                  style={{ transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.setAttribute('opacity', '0.8')}
                  onMouseLeave={(e) => e.currentTarget.setAttribute('opacity', '1')}
                />
                {/* Value Text */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#595959"
                  fontWeight="bold"
                >
                  {data.totalAmount >= 1000 ? (data.totalAmount / 1000).toFixed(1) + 'k' : data.totalAmount.toFixed(0)}
                </text>
                {/* Month Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#8c8c8c"
                >
                  {data.month}
                </text>
              </g>
            );
          })}
          {/* Gradients */}
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1890ff" />
              <stop offset="100%" stopColor="#bae7ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  // Custom SVG Line Chart for Revenue per Flight
  const renderLineChart = () => {
    if (revenueTrend.length === 0) {
      return <Empty description="No flight metrics available" />;
    }

    const maxVal = Math.max(...revenueTrend.map(t => t.averageRevenue), 1);
    const chartHeight = 120;
    const width = 340;
    const xStep = width / (revenueTrend.length > 1 ? revenueTrend.length - 1 : 1);

    const points = revenueTrend.map((data, index) => {
      const x = index * xStep + 20;
      const y = chartHeight - (data.averageRevenue / maxVal) * chartHeight + 10;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width={width + 40} height="170" viewBox={`0 0 ${width + 40} 170`}>
          {/* Base Grid */}
          <line x1="20" y1={chartHeight + 10} x2={width + 20} y2={chartHeight + 10} stroke="#e8e8e8" strokeWidth="1" />
          
          {/* Line Path */}
          {revenueTrend.length > 1 && (
            <polyline
              fill="none"
              stroke="#2fc25b"
              strokeWidth="3"
              points={points}
            />
          )}

          {revenueTrend.map((data, index) => {
            const x = index * xStep + 20;
            const y = chartHeight - (data.averageRevenue / maxVal) * chartHeight + 10;

            return (
              <g key={data.month}>
                {/* Data point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="#ffffff"
                  stroke="#2fc25b"
                  strokeWidth="3"
                  style={{ cursor: 'pointer' }}
                />
                {/* Value Text */}
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#595959"
                  fontWeight="bold"
                >
                  {data.averageRevenue.toFixed(0)}
                </text>
                {/* Month Label */}
                <text
                  x={x}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#8c8c8c"
                >
                  {data.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const contractColumns = [
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    { 
      title: 'Days Remaining', 
      dataIndex: 'daysRemaining', 
      key: 'daysRemaining',
      render: (days: number) => {
        let color = 'orange';
        if (days <= 30) color = 'red';
        if (days > 60) color = 'gold';
        return <Tag color={color}>{days} days</Tag>;
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard Analytics</Title>
        <Tag color="geekblue" style={{ fontSize: '13px', padding: '4px 10px' }}>
          Simulated View: {simTenantId} ({simTenantType === 'GROUND_HANDLER' ? 'Ground Handler' : 'Airline'})
        </Tag>
      </div>

      {/* Reusable Dashboard Layout Dimension Filters Bar */}
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Space size="large" wrap>
          <div>
            <span style={{ marginRight: 8, fontWeight: 500, color: '#595959' }}>Access Scope:</span>
            <Select value={simUserId} style={{ width: 250 }} onChange={handlePersonaChange}>
              <Select.Option value={unrestrictedUserId(simTenantId)}>Unrestricted</Select.Option>
              <Select.Option value={scopedUserId(simTenantId)}>DXB / EK / BAGGAGE only</Select.Option>
            </Select>
          </div>

          <div>
            <span style={{ marginRight: 8, fontWeight: 500, color: '#595959' }}>Airline:</span>
            <Select
              placeholder="All Airlines"
              allowClear
              style={{ width: 140 }}
              onChange={(val) => setSelectedAirline(val)}
              value={selectedAirline}
            >
              <Select.Option value="EK">Emirates (EK)</Select.Option>
              <Select.Option value="LH">Lufthansa (LH)</Select.Option>
              <Select.Option value="QF">Qantas (QF)</Select.Option>
            </Select>
          </div>

          <div>
            <span style={{ marginRight: 8, fontWeight: 500, color: '#595959' }}>Airport:</span>
            <Select
              placeholder="All Airports"
              allowClear
              style={{ width: 140 }}
              onChange={(val) => setSelectedAirport(val)}
              value={selectedAirport}
            >
              <Select.Option value="DXB">Dubai (DXB)</Select.Option>
              <Select.Option value="LHR">London (LHR)</Select.Option>
              <Select.Option value="SYD">Sydney (SYD)</Select.Option>
            </Select>
          </div>

          <div>
            <span style={{ marginRight: 8, fontWeight: 500, color: '#595959' }}>Date Range:</span>
            <RangePicker
              style={{ width: 250 }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setStartDate(dates[0].format('YYYY-MM-DD'));
                  setEndDate(dates[1].format('YYYY-MM-DD'));
                } else {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }
              }}
            />
          </div>
        </Space>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Spin size="large" tip="Loading analytics..." />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic 
                  title="Outstanding Receivables" 
                  value={receivables ? receivables.totalOutstanding : 0} 
                  precision={2}
                  suffix="AED"
                  prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic 
                  title="Invoiced This Month" 
                  value={totalInvoicedThisMonth} 
                  precision={2}
                  suffix="AED"
                  prefix={<FileDoneOutlined style={{ color: '#1890ff' }} />} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic 
                  title="Active Disputes" 
                  value={receivables ? receivables.byAirline.length : 0} 
                  prefix={<FileTextOutlined style={{ color: '#faad14' }} />} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic 
                  title="Collections Success" 
                  value="94%" 
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card title="Receivables Share by Airline" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
                {renderDonutChart()}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Receivables Aging Profile" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
                {receivables ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>0 - 30 Days</Text>
                        <Text>{receivables.aging.zeroToThirty.toLocaleString()} AED</Text>
                      </div>
                      <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: receivables.totalOutstanding > 0 ? `${(receivables.aging.zeroToThirty / receivables.totalOutstanding) * 100}%` : '0%',
                          height: '100%',
                          background: '#1890ff',
                          borderRadius: 5
                        }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>31 - 60 Days</Text>
                        <Text>{receivables.aging.thirtyOneToSixty.toLocaleString()} AED</Text>
                      </div>
                      <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: receivables.totalOutstanding > 0 ? `${(receivables.aging.thirtyOneToSixty / receivables.totalOutstanding) * 100}%` : '0%',
                          height: '100%',
                          background: '#2fc25b',
                          borderRadius: 5
                        }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>61 - 90 Days</Text>
                        <Text>{receivables.aging.sixtyOneToNinety.toLocaleString()} AED</Text>
                      </div>
                      <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: receivables.totalOutstanding > 0 ? `${(receivables.aging.sixtyOneToNinety / receivables.totalOutstanding) * 100}%` : '0%',
                          height: '100%',
                          background: '#facc14',
                          borderRadius: 5
                        }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>90+ Days (Overdue)</Text>
                        <Text>{receivables.aging.ninetyPlus.toLocaleString()} AED</Text>
                      </div>
                      <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: receivables.totalOutstanding > 0 ? `${(receivables.aging.ninetyPlus / receivables.totalOutstanding) * 100}%` : '0%',
                          height: '100%',
                          background: '#ff4d4f',
                          borderRadius: 5
                        }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card title="Monthly Invoiced Trends" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {renderBarChart()}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Average Revenue per Flight" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {renderLineChart()}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="Contracts Up for Expiry (Within 90 Days)" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table 
                  dataSource={expiringContracts} 
                  columns={contractColumns} 
                  pagination={false} 
                  rowKey="id"
                  locale={{ emptyText: <Empty description="No contracts expiring soon" /> }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
      <SupplierOperationalFootprintPanel />
    </div>
  );
};

export default Dashboard;
