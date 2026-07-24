import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
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
import { EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

interface ExpirySummary {
  totalContracts: number;
  expiringWithin30Days: number;
  expiringWithin60Days: number;
  expiringAfter60Days: number;
  airportCount: number;
}

interface AirportExpiryPoint {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  contractCount: number;
  nearestExpiryDays: number;
  suppliers: string[];
  serviceTypes: string[];
}

interface ExpiringContract {
  contractId: string;
  supplierId: string;
  airportCode: string;
  airportName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  urgency: 'URGENT' | 'UPCOMING' | 'MONITOR';
  currency: string;
  serviceTypes: string[];
}

interface ContractExpiryReport {
  asOfDate?: string;
  horizonDays: number;
  summary: ExpirySummary;
  airports: AirportExpiryPoint[];
  contracts: ExpiringContract[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: ContractExpiryReport = {
  horizonDays: 90,
  summary: {
    totalContracts: 0,
    expiringWithin30Days: 0,
    expiringWithin60Days: 0,
    expiringAfter60Days: 0,
    airportCount: 0,
  },
  airports: [],
  contracts: [],
};

const urgencyColor = (days: number) => {
  if (days <= 30) return '#cf1322';
  if (days <= 60) return '#fa8c16';
  return '#d4b106';
};

const urgencyTag = (urgency: ExpiringContract['urgency']) => {
  if (urgency === 'URGENT') return 'red';
  if (urgency === 'UPCOMING') return 'orange';
  return 'gold';
};

const ExpiryWorldMap: React.FC<{
  airports: AirportExpiryPoint[];
  onSelect: (airportCode: string) => void;
}> = ({ airports, onSelect }) => {
  if (airports.length === 0) {
    return <Empty description="No expiring contracts to plot" />;
  }
  const width = 900;
  const height = 440;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  });
  const handleKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    airportCode: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(airportCode);
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="World map of airports with contracts approaching expiry"
        style={{
          width: '100%',
          minWidth: 680,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #e6f4ff 0%, #f6ffed 100%)',
        }}
      >
        <g fill="#d9e7d0" stroke="#b7c9ab" strokeWidth="1.5" opacity="0.95">
          <path d="M40 95 L105 55 205 70 255 115 225 165 170 175 135 220 85 200 55 150 Z" />
          <path d="M220 225 L255 245 275 315 250 400 215 340 205 275 Z" />
          <path d="M385 75 L430 55 485 75 510 110 485 130 435 125 405 105 Z" />
          <path d="M430 135 L500 130 535 185 520 285 475 350 440 285 420 205 Z" />
          <path d="M500 85 L610 55 745 85 830 135 795 190 690 180 625 230 550 190 510 135 Z" />
          <path d="M710 270 L775 255 835 295 820 350 750 360 700 320 Z" />
        </g>
        <g stroke="#fff" strokeWidth="1" opacity="0.45">
          {[-120, -60, 0, 60, 120].map(longitude => {
            const { x } = project(0, longitude);
            return <line key={longitude} x1={x} x2={x} y1="0" y2={height} />;
          })}
          {[-60, -30, 0, 30, 60].map(latitude => {
            const { y } = project(latitude, 0);
            return <line key={latitude} x1="0" x2={width} y1={y} y2={y} />;
          })}
        </g>
        {airports.map(airport => {
          const { x, y } = project(Number(airport.latitude), Number(airport.longitude));
          const color = urgencyColor(airport.nearestExpiryDays);
          const radius = 8 + Math.min(airport.contractCount, 5) * 2;
          return (
            <g
              key={airport.airportCode}
              data-testid={`aor1-map-${airport.airportCode}`}
              role="button"
              tabIndex={0}
              aria-label={`${airport.airportCode}, ${airport.contractCount} expiring contracts`}
              onClick={() => onSelect(airport.airportCode)}
              onKeyDown={event => handleKeyDown(event, airport.airportCode)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle cx={x} cy={y} r={radius + 5} fill={color} opacity="0.2" />
              <circle cx={x} cy={y} r={radius} fill={color} stroke="#fff" strokeWidth="3" />
              <text
                x={x}
                y={y - radius - 7}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#262626"
                stroke="#fff"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {airport.airportCode}
              </text>
              <title>
                {`${airport.airportName} — ${airport.contractCount} contract(s), `
                  + `nearest expiry in ${airport.nearestExpiryDays} days; `
                  + `suppliers: ${airport.suppliers.join(', ')}; `
                  + `services: ${airport.serviceTypes.join(', ')}`}
              </title>
            </g>
          );
        })}
      </svg>
      <Space size="large" wrap style={{ marginTop: 12 }}>
        <Text><span style={{ color: '#cf1322' }}>●</span> 0–30 days</Text>
        <Text><span style={{ color: '#fa8c16' }}>●</span> 31–60 days</Text>
        <Text><span style={{ color: '#d4b106' }}>●</span> 61+ days</Text>
        <Text type="secondary">Marker size reflects contract count. Select an airport to filter.</Text>
      </Space>
    </div>
  );
};

const AirlineContractExpiryPanel: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<ContractExpiryReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [horizonDays, setHorizonDays] = useState(90);
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
    const params = new URLSearchParams({ horizonDays: String(horizonDays) });
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    try {
      const response = await fetch(
        `/api/airline/reports/contract-expiry?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit contract-expiry reporting.'
          : 'Contract expiry could not be loaded.');
      }
      const nextReport: ContractExpiryReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.contracts.map(contract => contract.supplierId),
      ])].sort());
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Contract expiry could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, headers, horizonDays, serviceType, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const columns: TableColumnsType<ExpiringContract> = [
    {
      title: 'Airport',
      key: 'airport',
      render: (_, contract) => (
        <Space direction="vertical" size={0}>
          <Text strong>{contract.airportCode}</Text>
          <Text type="secondary">{contract.airportName}</Text>
        </Space>
      ),
    },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    {
      title: 'Services',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: (values: string[]) => (
        <Space size={[4, 4]} wrap>
          {values.map(value => <Tag key={value}>{value}</Tag>)}
        </Space>
      ),
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    {
      title: 'Expiry',
      key: 'expiry',
      sorter: (left, right) => left.daysRemaining - right.daysRemaining,
      render: (_, contract) => (
        <Tag color={urgencyTag(contract.urgency)}>
          {contract.daysRemaining === 0 ? 'Expires today' : `${contract.daysRemaining} days`}
        </Tag>
      ),
    },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    {
      title: 'Contract',
      key: 'contract',
      render: (_, contract) => (
        <Button
          type="link"
          onClick={() => navigate(
            `/airline/contracts?airportCode=${contract.airportCode}`,
          )}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 8 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>Contracts Approaching Expiry</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          AOR1 upcoming supplier-contract renewals in table and geographic views.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={6}>
            <Select
              data-testid="aor1-supplier-filter"
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
          <Col xs={24} sm={12} xl={6}>
            <Select
              data-testid="aor1-airport-filter"
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
          <Col xs={24} sm={12} xl={6}>
            <Select
              data-testid="aor1-service-filter"
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
            <Select
              data-testid="aor1-horizon-filter"
              style={{ width: '100%' }}
              value={horizonDays}
              options={[30, 60, 90, 180, 365].map(value => ({
                value,
                label: `Next ${value} days`,
              }))}
              onChange={setHorizonDays}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}>
              <Card data-testid="aor1-total-contracts">
                <Statistic title="Approaching Expiry" value={report.summary.totalContracts} />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card data-testid="aor1-urgent-contracts">
                <Statistic
                  title="Within 30 Days"
                  value={report.summary.expiringWithin30Days}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card data-testid="aor1-upcoming-contracts">
                <Statistic
                  title="31–60 Days"
                  value={report.summary.expiringWithin60Days}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card data-testid="aor1-airport-count">
                <Statistic
                  title="Airports"
                  value={report.summary.airportCount}
                  prefix={<EnvironmentOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Expiry Map">
            <ExpiryWorldMap airports={report.airports} onSelect={setAirportCode} />
          </Card>

          <Card
            title={`Contract Expiry Table — as of ${report.asOfDate || 'today'}`}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              data-testid="aor1-contract-table"
              rowKey="contractId"
              columns={columns}
              dataSource={report.contracts}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description="No contracts expire in this horizon" /> }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Space>
      </Spin>
    </Space>
  );
};

export default AirlineContractExpiryPanel;
