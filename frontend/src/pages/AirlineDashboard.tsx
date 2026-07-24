import React, { useEffect } from 'react';
import { ArrowRightOutlined, FileDoneOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { setSimulatedUserId, unrestrictedUserId } from '../utils/simulatedAuth';
import AirlineBilledAmountsPanel from './AirlineBilledAmountsPanel';
import AirlineExpectedBillingPanel from './AirlineExpectedBillingPanel';

const { Paragraph, Text, Title } = Typography;

const workspaceItems = [
  {
    title: 'Contracts',
    description: 'View supplier contracts and follow contract review activity.',
    path: '/airline/contracts',
    icon: <FileTextOutlined style={{ fontSize: 26, color: '#1677ff' }} />,
    availability: 'Read-only contract access',
  },
  {
    title: 'Invoices',
    description: 'Review dispatched invoices, documents, and payment status.',
    path: '/airline/invoices',
    icon: <FileDoneOutlined style={{ fontSize: 26, color: '#13a8a8' }} />,
    availability: 'Dispatched invoice access',
  },
  {
    title: 'Disputes',
    description: 'Track invoice queries and line-level dispute resolution.',
    path: '/disputes',
    icon: <SafetyCertificateOutlined style={{ fontSize: 26, color: '#722ed1' }} />,
    availability: 'Workflow arrives in a later Phase 6 slice',
  },
];

const AirlineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantType') === 'AIRLINE'
    ? localStorage.getItem('simTenantId') || 'EK'
    : 'EK';

  useEffect(() => {
    localStorage.setItem('simTenantId', tenantId);
    localStorage.setItem('simTenantType', 'AIRLINE');
    setSimulatedUserId(unrestrictedUserId(tenantId));
  }, [tenantId]);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Space size="middle" wrap>
          <Title level={2} style={{ margin: 0 }}>Airline Workspace</Title>
          <Tag color="blue">{tenantId}</Tag>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          A single place for your contracts, invoices, payments, and supplier collaboration.
        </Paragraph>
      </div>

      <Alert
        type="info"
        showIcon
        message="Your airline and dimensional access are applied automatically"
        description="Airport and service-type restrictions follow your assigned roles on every view."
      />

      <Row gutter={[16, 16]}>
        {workspaceItems.map((item) => (
          <Col xs={24} md={12} xl={8} key={item.title}>
            <Card
              style={{ height: '100%' }}
              actions={[
                <Button type="link" key="open" onClick={() => navigate(item.path)}>
                  Open {item.title} <ArrowRightOutlined />
                </Button>,
              ]}
            >
              <Space direction="vertical" size="middle">
                {item.icon}
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>{item.title}</Title>
                  <Paragraph style={{ marginBottom: 12 }}>{item.description}</Paragraph>
                  <Text type="secondary">{item.availability}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <AirlineBilledAmountsPanel />
      <AirlineExpectedBillingPanel />
    </Space>
  );
};

export default AirlineDashboard;
