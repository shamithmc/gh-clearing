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
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EnvironmentOutlined, GlobalOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

interface CurrencyMetric {
  currency: string;
  monthlyContractValue: number;
  invoicedValue: number;
  invoiceCount: number;
}

interface AirportFootprint {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  suppliers: string[];
  serviceTypes: string[];
  financials: CurrencyMetric[];
}

interface ServiceRate {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  billingFrequency?: string;
  monthlyExpectedValue: number;
}

interface ContractDrilldown {
  contractId: string;
  supplierId: string;
  airportCode: string;
  startDate: string;
  endDate: string;
  currency: string;
  services: ServiceRate[];
}

interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  airportCode: string;
  issueDate: string;
  status: string;
  currency: string;
  invoicedValue: number;
  serviceTypes: string[];
}

interface FootprintReport {
  asOfDate?: string;
  invoicedFromDate?: string;
  summary: {
    airportCount: number;
    supplierCount: number;
    serviceCount: number;
    activeContractCount: number;
    dispatchedInvoiceCount: number;
  };
  airports: AirportFootprint[];
  contracts: ContractDrilldown[];
  invoices: InvoiceSummary[];
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
  summary: {
    airportCount: 0,
    supplierCount: 0,
    serviceCount: 0,
    activeContractCount: 0,
    dispatchedInvoiceCount: 0,
  },
  airports: [],
  contracts: [],
  invoices: [],
};

const formatAmount = (value: number, currency: string) =>
  `${currency} ${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CurrentFootprintMap: React.FC<{
  airports: AirportFootprint[];
  selectedAirport?: string;
  hoveredAirport?: string;
  onSelect: (airportCode: string) => void;
  onHover: (airportCode?: string) => void;
}> = ({ airports, selectedAirport, hoveredAirport, onSelect, onHover }) => {
  if (airports.length === 0) {
    return <Empty description="No active contracted airports to plot" />;
  }
  const width = 900;
  const height = 440;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  });
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="World map of the airline current ground-handling footprint"
        style={{
          width: '100%',
          minWidth: 680,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #e6f4ff 0%, #f6ffed 100%)',
        }}
      >
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
          const active = selectedAirport === airport.airportCode
            || hoveredAirport === airport.airportCode;
          const radius = 9 + Math.min(airport.suppliers.length + airport.serviceTypes.length, 6);
          return (
            <g
              key={airport.airportCode}
              data-testid={`aor2-map-${airport.airportCode}`}
              role="button"
              tabIndex={0}
              aria-label={`${airport.airportCode} current footprint`}
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
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle
                cx={x}
                cy={y}
                r={radius + 7}
                fill={active ? '#fa8c16' : '#1677ff'}
                opacity="0.22"
              />
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={active ? '#fa8c16' : '#1677ff'}
                stroke="#fff"
                strokeWidth="3"
              />
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
                {`${airport.airportName}; suppliers: ${airport.suppliers.join(', ')}; `
                  + `services: ${airport.serviceTypes.join(', ')}`}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AirlineCurrentFootprintPanel: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [report, setReport] = useState<FootprintReport>(emptyReport);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [knownCurrencies, setKnownCurrencies] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [historyMonths, setHistoryMonths] = useState(12);
  const [selectedAirport, setSelectedAirport] = useState<string>();
  const [hoveredAirport, setHoveredAirport] = useState<string>();
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
    setSelectedAirport(undefined);
    const params = new URLSearchParams({ historyMonths: String(historyMonths) });
    if (supplierId) params.set('supplierId', supplierId);
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (currency) params.set('currency', currency);
    try {
      const response = await fetch(
        `/api/airline/reports/current-footprint?${params.toString()}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit current-footprint reporting.'
          : 'Current footprint could not be loaded.');
      }
      const nextReport: FootprintReport = await response.json();
      setReport(nextReport);
      setKnownSuppliers(current => [...new Set([
        ...current,
        ...nextReport.airports.flatMap(item => item.suppliers),
      ])].sort());
      setKnownCurrencies(current => [...new Set([
        ...current,
        ...nextReport.airports.flatMap(item =>
          item.financials.map(financial => financial.currency)),
      ])].sort());
    } catch (cause) {
      setReport(emptyReport);
      setError(cause instanceof Error ? cause.message : 'Current footprint could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, currency, headers, historyMonths, serviceType, supplierId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeAirportCode = hoveredAirport || selectedAirport;
  const activeAirport = report.airports.find(item => item.airportCode === activeAirportCode);
  const contractRows = selectedAirport
    ? report.contracts.filter(item => item.airportCode === selectedAirport)
    : report.contracts;
  const invoiceRows = selectedAirport
    ? report.invoices.filter(item => item.airportCode === selectedAirport)
    : report.invoices;
  const contractColumns: TableColumnsType<ContractDrilldown> = [
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
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
  const invoiceColumns: TableColumnsType<InvoiceSummary> = [
    { title: 'Invoice', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    {
      title: 'Services',
      dataIndex: 'serviceTypes',
      key: 'serviceTypes',
      render: (values: string[]) => (
        <Space wrap>{values.map(value => <Tag key={value}>{value}</Tag>)}</Space>
      ),
    },
    {
      title: 'Invoiced',
      key: 'invoicedValue',
      align: 'right',
      render: (_, invoice) => formatAmount(invoice.invoicedValue, invoice.currency),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', marginTop: 8 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>Current Footprint</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          AOR2 active airports, suppliers, services, monthly values, and invoice history.
        </Paragraph>
      </div>
      {error && <Alert type="error" showIcon message={error} />}
      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="aor2-supplier-filter" allowClear showSearch
              optionFilterProp="label" style={{ width: '100%' }} placeholder="All suppliers"
              value={supplierId} options={knownSuppliers.map(value => ({ value, label: value }))}
              onChange={setSupplierId} />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="aor2-airport-filter" allowClear showSearch
              optionFilterProp="label" style={{ width: '100%' }} placeholder="All airports"
              value={airportCode} options={airports.map(item => ({
                value: item.iataCode, label: `${item.iataCode} — ${item.name}`,
              }))} onChange={setAirportCode} />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="aor2-service-filter" allowClear showSearch
              optionFilterProp="label" style={{ width: '100%' }} placeholder="All services"
              value={serviceType} options={services.map(item => ({
                value: item.code, label: `${item.code} — ${item.displayName}`,
              }))} onChange={setServiceType} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Select data-testid="aor2-currency-filter" allowClear style={{ width: '100%' }}
              placeholder="All currencies" value={currency}
              options={knownCurrencies.map(value => ({ value, label: value }))}
              onChange={setCurrency} />
          </Col>
          <Col xs={24} sm={12} xl={5}>
            <Select data-testid="aor2-history-filter" style={{ width: '100%' }}
              value={historyMonths} options={[3, 6, 12, 24].map(value => ({
                value, label: `${value} months of invoices`,
              }))} onChange={setHistoryMonths} />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}><Card data-testid="aor2-airports"><Statistic title="Airports" value={report.summary.airportCount} prefix={<EnvironmentOutlined />} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="aor2-suppliers"><Statistic title="Suppliers" value={report.summary.supplierCount} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="aor2-services"><Statistic title="Services" value={report.summary.serviceCount} /></Card></Col>
            <Col xs={12} lg={6}><Card data-testid="aor2-invoices"><Statistic title="Dispatched Invoices" value={report.summary.dispatchedInvoiceCount} /></Card></Col>
          </Row>
          <Card title={<Space><GlobalOutlined />Airline Ground-Handling Footprint</Space>}>
            <CurrentFootprintMap airports={report.airports}
              selectedAirport={selectedAirport} hoveredAirport={hoveredAirport}
              onSelect={setSelectedAirport} onHover={setHoveredAirport} />
            {activeAirport && (
              <Card data-testid={`aor2-hover-${activeAirport.airportCode}`}
                size="small" style={{ marginTop: 16, background: '#fafafa' }}>
                <Space direction="vertical" size={8}>
                  <Title level={5} style={{ margin: 0 }}>
                    {activeAirport.airportCode} — {activeAirport.airportName}
                  </Title>
                  <Text>{activeAirport.city}, {activeAirport.country}</Text>
                  <Space wrap>
                    {activeAirport.suppliers.map(value => <Tag color="blue" key={value}>{value}</Tag>)}
                    {activeAirport.serviceTypes.map(value => <Tag key={value}>{value}</Tag>)}
                  </Space>
                  {activeAirport.financials.map(financial => (
                    <Text key={financial.currency}>
                      {financial.currency}: monthly contract value{' '}
                      <strong>{formatAmount(financial.monthlyContractValue, financial.currency)}</strong>
                      {' · '}invoiced since {report.invoicedFromDate}{' '}
                      <strong>{formatAmount(financial.invoicedValue, financial.currency)}</strong>
                      {' · '}{financial.invoiceCount} invoice(s)
                    </Text>
                  ))}
                </Space>
              </Card>
            )}
          </Card>
          <Card title={selectedAirport
            ? `Drill-down — ${selectedAirport}`
            : 'Contract and Invoice Drill-down'}>
            <Tabs items={[
              {
                key: 'contracts',
                label: `Contracts (${contractRows.length})`,
                children: <Table data-testid="aor2-contract-table"
                  rowKey="contractId" columns={contractColumns}
                  dataSource={contractRows} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />,
              },
              {
                key: 'invoices',
                label: `Invoices (${invoiceRows.length})`,
                children: <Table data-testid="aor2-invoice-table"
                  rowKey="invoiceId" columns={invoiceColumns}
                  dataSource={invoiceRows} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />,
              },
            ]} />
          </Card>
        </Space>
      </Spin>
    </Space>
  );
};

export default AirlineCurrentFootprintPanel;
