import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, message, Popconfirm, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

interface InvoiceLineItem {
  id: string;
  flightDate: string;
  flightNumber: string;
  aircraftReg: string;
  origin: string;
  destination: string;
  chargeCode: string;
  serviceName: string;
  quantityDrivers: string;
  calculatedAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  airlineId: string;
  airportCode: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'SENT' | 'PAID' | 'DISPUTED';
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

const statusColor = (status: Invoice['status']): string => {
  if (status === 'PAID') return 'success';
  if (status === 'DISPUTED') return 'error';
  return 'blue';
};

const AirlineInvoices: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [status, setStatus] = useState<Invoice['status']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
    ]).then(([airportData, chargeCodeData]) => {
      setAirports(airportData);
      setChargeCodes(chargeCodeData);
    }).catch(() => {
      setAirports([]);
      setChargeCodes([]);
    });
  }, [headers]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (status) params.set('status', status);
    try {
      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ''}`, { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit invoice viewing.'
          : 'Invoices could not be loaded.');
      }
      setInvoices(await response.json());
    } catch (requestError) {
      setInvoices([]);
      setError(requestError instanceof Error ? requestError.message : 'Invoices could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, headers, serviceType, status]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const downloadDocument = async (invoice: Invoice, format: 'xml' | 'pdf') => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/${format}`, { headers });
      if (!response.ok) throw new Error();
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-${invoice.invoiceNumber}.${format}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      message.error(`Unable to download ${format.toUpperCase()} invoice`);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status?status=PAID`, {
        method: 'PUT',
        headers,
      });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit payment updates.'
          : 'The invoice could not be marked as paid.');
      }
      message.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
      await loadInvoices();
    } catch (requestError) {
      message.error(requestError instanceof Error
        ? requestError.message
        : 'The invoice could not be marked as paid.');
    }
  };

  const columns: TableColumnsType<Invoice> = [
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate' },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, invoice) => `${Number(amount).toFixed(2)} ${invoice.currency}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: value => <Tag color={statusColor(value)}>{value}</Tag>,
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (_, invoice) => (
        <Space>
          <Button
            aria-label={`Download XML ${invoice.invoiceNumber}`}
            icon={<DownloadOutlined />}
            onClick={() => downloadDocument(invoice, 'xml')}
          >
            XML
          </Button>
          <Button
            aria-label={`Download PDF ${invoice.invoiceNumber}`}
            icon={<DownloadOutlined />}
            onClick={() => downloadDocument(invoice, 'pdf')}
          >
            PDF
          </Button>
        </Space>
      ),
    },
    {
      title: 'Payment',
      key: 'payment',
      render: (_, invoice) => invoice.status === 'SENT' || invoice.status === 'DISPUTED' ? (
        <Popconfirm
          title="Mark invoice as paid?"
          description="This status update is immediately visible to the supplier."
          okText="Mark Paid"
          cancelText="Cancel"
          onConfirm={() => markAsPaid(invoice)}
        >
          <Button type="primary" icon={<CheckCircleOutlined />}>
            Mark as Paid
          </Button>
        </Popconfirm>
      ) : <Tag color="success">Paid</Tag>,
    },
  ];

  const lineColumns: TableColumnsType<InvoiceLineItem> = [
    { title: 'Flight Date', dataIndex: 'flightDate', key: 'flightDate' },
    { title: 'Flight', dataIndex: 'flightNumber', key: 'flightNumber' },
    { title: 'Aircraft', dataIndex: 'aircraftReg', key: 'aircraftReg' },
    { title: 'Service Type', dataIndex: 'chargeCode', key: 'chargeCode' },
    { title: 'Service', dataIndex: 'serviceName', key: 'serviceName' },
    {
      title: 'Sector',
      key: 'sector',
      render: (_, item) => `${item.origin}–${item.destination}`,
    },
    {
      title: 'Amount',
      dataIndex: 'calculatedAmount',
      key: 'calculatedAmount',
      render: value => Number(value).toFixed(2),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Space size="middle" wrap>
          <Title level={2} style={{ margin: 0 }}>My Invoices</Title>
          <Tag color="blue">Dispatched invoices</Tag>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Invoices sent to {tenantId}. Tenant and dimensional access is applied automatically.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>Airport</Text>
            <Select
              data-testid="invoice-airport-filter"
              aria-label="Invoice airport filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All airports"
              value={airportCode}
              onChange={setAirportCode}
              style={{ display: 'block', marginTop: 6 }}
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} — ${airport.name}`,
              }))}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Service type</Text>
            <Select
              data-testid="invoice-service-filter"
              aria-label="Invoice service type filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All service types"
              value={serviceType}
              onChange={setServiceType}
              style={{ display: 'block', marginTop: 6 }}
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} — ${chargeCode.displayName}`,
              }))}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Status</Text>
            <Select
              data-testid="invoice-status-filter"
              aria-label="Invoice status filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All dispatched statuses"
              value={status}
              onChange={setStatus}
              style={{ display: 'block', marginTop: 6 }}
              options={['SENT', 'PAID', 'DISPUTED'].map(value => ({ value, label: value }))}
            />
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={invoices}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No dispatched invoices match your access and filters" /> }}
            expandable={{
              expandedRowRender: invoice => (
                <Table
                  columns={lineColumns}
                  dataSource={invoice.lineItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ),
            }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default AirlineInvoices;
