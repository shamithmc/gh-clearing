import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag } from 'antd';
import { 
  FileDoneOutlined, 
  FileTextOutlined, 
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const pendingInvoices = [
    { key: '1', invoiceNumber: 'INV-2023-001', airline: 'Emirates (EK)', amount: '$12,450.00', status: 'Pending Approval' },
    { key: '2', invoiceNumber: 'INV-2023-002', airline: 'Lufthansa (LH)', amount: '$8,200.00', status: 'Pending Approval' },
  ];

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Airline', dataIndex: 'airline', key: 'airline' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => <Tag color="warning">{status}</Tag>
    },
  ];

  return (
    <div>
      <Title level={3}>Dashboard</Title>
      
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Active Contracts" 
              value={42} 
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Pending Invoices" 
              value={15} 
              prefix={<FileDoneOutlined style={{ color: '#faad14' }} />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Active Disputes" 
              value={3} 
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="YTD Processed" 
              value={"$1.2M"} 
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Action Required: Pending Invoices">
            <Table dataSource={pendingInvoices} columns={columns} pagination={false} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
