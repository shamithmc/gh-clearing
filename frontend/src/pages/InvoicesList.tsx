import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Table, Tag, Select, Space, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

interface InvoiceLineItem {
  id: string;
  flightDate: string;
  flightNumber: string;
  aircraftReg: string;
  origin: string;
  destination: string;
  chargeCode: string;
  serviceName: string;
  formulaType: string;
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
  exchangeRate: number;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [simTenantId, setSimTenantId] = useState<string>(localStorage.getItem('simTenantId') || 'SWISSPORT');
  const [simTenantType, setSimTenantType] = useState<string>(localStorage.getItem('simTenantType') || 'GROUND_HANDLER');
  
  const navigate = useNavigate();

  const fetchInvoices = useCallback(() => {
    fetch('/api/invoices', {
      headers: {
        'X-Mock-Tenant-Id': simTenantId,
        'X-Mock-Tenant-Type': simTenantType,
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setInvoices(data))
      .catch(() => setInvoices([]));
  }, [simTenantId, simTenantType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleTenantChange = (value: string) => {
    if (value === 'SWISSPORT') {
      setSimTenantId('SWISSPORT');
      setSimTenantType('GROUND_HANDLER');
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    } else {
      setSimTenantId('EK');
      setSimTenantType('AIRLINE');
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
    }
  };

  const columns = [
    { title: 'Invoice ID', dataIndex: 'id', key: 'id', render: (id: string) => id.substring(0, 8) + '...' },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate' },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number, record: Invoice) => `${amount.toFixed(2)} ${record.currency}` },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'PAID') color = 'success';
        if (status === 'SENT') color = 'blue';
        if (status === 'DRAFT') color = 'processing';
        if (status === 'DISPUTED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      }
    }
  ];

  const expandedRowRender = (record: Invoice) => {
    const itemColumns = [
      { title: 'Flight Date', dataIndex: 'flightDate', key: 'flightDate' },
      { title: 'Flight No', dataIndex: 'flightNumber', key: 'flightNumber' },
      { title: 'Aircraft Reg', dataIndex: 'aircraftReg', key: 'aircraftReg' },
      { title: 'Sector', key: 'sector', render: ((_: any, r: InvoiceLineItem) => `${r.origin}-${r.destination}`) as any },
      { title: 'Charge Code', dataIndex: 'chargeCode', key: 'chargeCode' },
      { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName' },
      { title: 'Quantity/Drivers', dataIndex: 'quantityDrivers', key: 'quantityDrivers' },
      { title: 'Calculated Amount', dataIndex: 'calculatedAmount', key: 'calculatedAmount', render: (amount: number) => amount.toFixed(2) },
    ];

    return (
      <Table 
        columns={itemColumns} 
        dataSource={record.lineItems} 
        pagination={false} 
        rowKey="id" 
      />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Invoices</Title>
        {simTenantType === 'GROUND_HANDLER' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
            Create Invoice
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={12}></Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <span>Simulate Tenant User:</span>
              <Select value={simTenantId} style={{ width: 220 }} onChange={handleTenantChange}>
                <Option value="SWISSPORT">Swissport (Ground Handler)</Option>
                <Option value="EK">Emirates (Airline)</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={invoices} 
          rowKey="id"
          expandable={{ expandedRowRender, defaultExpandedRowKeys: [] }}
          locale={{ emptyText: 'No invoices found' }} 
        />
      </Card>
    </div>
  );
};

export default InvoicesList;
