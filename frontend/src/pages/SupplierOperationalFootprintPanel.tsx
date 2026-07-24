import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { EnvironmentOutlined, GlobalOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

interface CurrencyValue {
  currency: string;
  monthlyExpectedValue: number;
}

interface AirportOperation {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  airlines: string[];
  serviceTypes: string[];
  monthlyValues: CurrencyValue[];
  contractCount: number;
}

interface ServiceOperation {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  billingFrequency?: string;
  monthlyExpectedValue: number;
}

interface ContractOperation {
  contractId: string;
  airlineId: string;
  airportCode: string;
  startDate: string;
  endDate: string;
  currency: string;
  services: ServiceOperation[];
}

interface FootprintReport {
  asOfDate?: string;
  summary: {
    airportCount: number;
    airlineCount: number;
    serviceCount: number;
    activeContractCount: number;
  };
  airports: AirportOperation[];
  contracts: ContractOperation[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ServiceOption {
  code: string;
  displayName: string;
}

const emptyReport: FootprintReport = {
  summary: { airportCount: 0, airlineCount: 0, serviceCount: 0, activeContractCount: 0 },
  airports: [],
  contracts: [],
};

const formatAmount = (value: number, currency: string) =>
  `${currency} ${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const OperationsMap: React.FC<{
  airports: AirportOperation[];
  selected?: string;
  hovered?: string;
  onSelect: (code: string) => void;
  onHover: (code?: string) => void;
}> = ({ airports, selected, hovered, onSelect, onHover }) => {
  if (airports.length === 0) {
    return <Empty description="No active supplier operations to plot" />;
  }
  const width = 900;
  const height = 440;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  });
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label="World map of supplier operational footprint"
        style={{ width: '100%', minWidth: 680, borderRadius: 12,
          background: 'linear-gradient(180deg, #e6f4ff 0%, #f6ffed 100%)' }}>
        <g fill="#d9e7d0" stroke="#b7c9ab" strokeWidth="1.5">
          <path d="M40 95 L105 55 205 70 255 115 225 165 170 175 135 220 85 200 55 150 Z" />
          <path d="M220 225 L255 245 275 315 250 400 215 340 205 275 Z" />
          <path d="M385 75 L430 55 485 75 510 110 485 130 435 125 405 105 Z" />
          <path d="M430 135 L500 130 535 185 520 285 475 350 440 285 420 205 Z" />
          <path d="M500 85 L610 55 745 85 830 135 795 190 690 180 625 230 550 190 510 135 Z" />
          <path d="M710 270 L775 255 835 295 820 350 750 360 700 320 Z" />
        </g>
        {airports.map(airport => {
          const { x, y } = project(Number(airport.latitude), Number(airport.longitude));
          const active = selected === airport.airportCode || hovered === airport.airportCode;
          const radius = 9 + Math.min(airport.contractCount, 5) * 2;
          return (
            <g key={airport.airportCode} data-testid={`sor2-map-${airport.airportCode}`}
              role="button" tabIndex={0} aria-label={`${airport.airportCode} supplier operation`}
              onMouseEnter={() => onHover(airport.airportCode)}
              onMouseLeave={() => onHover(undefined)}
              onFocus={() => onHover(airport.airportCode)}
              onBlur={() => onHover(undefined)}
              onClick={() => onSelect(airport.airportCode)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(airport.airportCode);
                }
              }}
              style={{ cursor: 'pointer', outline: 'none' }}>
              <circle cx={x} cy={y} r={radius + 7}
                fill={active ? '#fa8c16' : '#13a8a8'} opacity="0.22" />
              <circle cx={x} cy={y} r={radius}
                fill={active ? '#fa8c16' : '#13a8a8'} stroke="#fff" strokeWidth="3" />
              <text x={x} y={y - radius - 7} textAnchor="middle" fontSize="12"
                fontWeight="bold" fill="#262626" stroke="#fff" strokeWidth="3"
                paintOrder="stroke">{airport.airportCode}</text>
              <title>{`${airport.airportName}; airlines: ${airport.airlines.join(', ')}; `
                + `services: ${airport.serviceTypes.join(', ')}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const SupplierOperationalFootprintPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'GROUND_HANDLER', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<FootprintReport>(emptyReport);
  const [airportOptions, setAirportOptions] = useState<AirportOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [knownAirlines, setKnownAirlines] = useState<string[]>([]);
  const [knownCurrencies, setKnownCurrencies] = useState<string[]>([]);
  const [airlineId, setAirlineId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [selectedAirport, setSelectedAirport] = useState<string>();
  const [hoveredAirport, setHoveredAirport] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
    ]).then(([airports, services]) => {
      setAirportOptions(airports);
      setServiceOptions(services);
    }).catch(() => {
      setAirportOptions([]);
      setServiceOptions([]);
    });
  }, [headers]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setSelectedAirport(undefined);
    const params = new URLSearchParams();
    if (airlineId) params.set('airlineId', airlineId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (currency) params.set('currency', currency);
    try {
      const response = await fetch(
        `/api/supplier/reports/operational-footprint?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit operational-footprint reporting.'
          : 'Operational footprint could not be loaded.');
      }
      const nextReport: FootprintReport = await response.json();
      setReport(nextReport);
      setKnownAirlines(current => [...new Set([
        ...current, ...nextReport.airports.flatMap(item => item.airlines),
      ])].sort());
      setKnownCurrencies(current => [...new Set([
        ...current,
        ...nextReport.airports.flatMap(item =>
          item.monthlyValues.map(value => value.currency)),
      ])].sort());
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Operational footprint could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airlineId, airportCode, currency, headers, serviceType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeCode = hoveredAirport || selectedAirport;
  const activeAirport = report.airports.find(item => item.airportCode === activeCode);
  const tableRows = selectedAirport
    ? report.contracts.filter(item => item.airportCode === selectedAirport)
    : report.contracts;
  const columns: TableColumnsType<ContractOperation> = [
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    {
      title: 'Services and Monthly Values',
      key: 'services',
      render: (_, contract) => (
        <Space direction="vertical" size={4}>
          {contract.services.map(service => (
            <Space key={service.serviceId} wrap>
              <Tag>{service.serviceType}</Tag>
              <Text>{formatAmount(service.monthlyExpectedValue, contract.currency)}</Text>
              <Text type="secondary">{service.billingFrequency || 'Not scheduled'}</Text>
            </Space>
          ))}
        </Space>
      ),
    },
    { title: 'Valid From', dataIndex: 'startDate', key: 'startDate' },
    { title: 'Valid To', dataIndex: 'endDate', key: 'endDate' },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 24 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Operational Footprint</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          SOR2 active airports, airline customers, services, and monthly contracted values.
        </Paragraph>
      </div>
      {error && <Alert type="error" showIcon message={error} />}
      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={6}>
            <Select data-testid="sor2-airline-filter" allowClear showSearch
              style={{ width: '100%' }} placeholder="All airlines" value={airlineId}
              options={knownAirlines.map(value => ({ value, label: value }))}
              onChange={setAirlineId} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Select data-testid="sor2-airport-filter" allowClear showSearch
              optionFilterProp="label" style={{ width: '100%' }} placeholder="All airports"
              value={airportCode} options={airportOptions.map(item => ({
                value: item.iataCode, label: `${item.iataCode} — ${item.name}`,
              }))} onChange={setAirportCode} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Select data-testid="sor2-service-filter" allowClear showSearch
              optionFilterProp="label" style={{ width: '100%' }} placeholder="All services"
              value={serviceType} options={serviceOptions.map(item => ({
                value: item.code, label: `${item.code} — ${item.displayName}`,
              }))} onChange={setServiceType} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Select data-testid="sor2-currency-filter" allowClear style={{ width: '100%' }}
              placeholder="All currencies" value={currency}
              options={knownCurrencies.map(value => ({ value, label: value }))}
              onChange={setCurrency} />
          </Col>
        </Row>
      </Card>
      <Spin spinning={loading}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}><Card data-testid="sor2-airports"><Statistic title="Airports" value={report.summary.airportCount} prefix={<EnvironmentOutlined />} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="sor2-airlines"><Statistic title="Airlines" value={report.summary.airlineCount} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="sor2-services"><Statistic title="Services" value={report.summary.serviceCount} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="sor2-contracts"><Statistic title="Active Contracts" value={report.summary.activeContractCount} /></Card></Col>
          </Row>
          <Card title={<Space><GlobalOutlined />Supplier Operations Map</Space>}>
            <OperationsMap airports={report.airports} selected={selectedAirport}
              hovered={hoveredAirport} onSelect={setSelectedAirport}
              onHover={setHoveredAirport} />
            {activeAirport && (
              <Card data-testid={`sor2-hover-${activeAirport.airportCode}`}
                size="small" style={{ marginTop: 16, background: '#fafafa' }}>
                <Space direction="vertical" size={8}>
                  <Title level={5} style={{ margin: 0 }}>
                    {activeAirport.airportCode} — {activeAirport.airportName}
                  </Title>
                  <Text>{activeAirport.city}, {activeAirport.country}</Text>
                  <Space wrap>
                    {activeAirport.airlines.map(value => <Tag color="blue" key={value}>{value}</Tag>)}
                    {activeAirport.serviceTypes.map(value => <Tag key={value}>{value}</Tag>)}
                  </Space>
                  {activeAirport.monthlyValues.map(value => (
                    <Text key={value.currency}>
                      Monthly expected value:{' '}
                      <strong>{formatAmount(value.monthlyExpectedValue, value.currency)}</strong>
                    </Text>
                  ))}
                </Space>
              </Card>
            )}
          </Card>
          <Card title={selectedAirport
            ? `Active Contract Drill-down — ${selectedAirport}`
            : `Active Contract Drill-down — as of ${report.asOfDate || 'today'}`}
            styles={{ body: { padding: 0 } }}>
            <Table data-testid="sor2-contract-table" rowKey="contractId"
              columns={columns} dataSource={tableRows}
              pagination={{ pageSize: 10 }} scroll={{ x: 900 }}
              locale={{ emptyText: <Empty description="No active operations match these filters" /> }} />
          </Card>
        </Space>
      </Spin>
    </Space>
  );
};

export default SupplierOperationalFootprintPanel;
