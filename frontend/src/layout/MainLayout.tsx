import React from 'react';
import { Layout, Menu, Button, Typography, Space, theme } from 'antd';
import { 
  DashboardOutlined, 
  FileTextOutlined, 
  FileDoneOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  CommentOutlined,
  SendOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const storedTenantType = localStorage.getItem('simTenantType');
  const isAirline = storedTenantType === 'AIRLINE' || location.pathname.startsWith('/airline');
  const tenantId = isAirline ? localStorage.getItem('simTenantId') || 'EK' : localStorage.getItem('simTenantId') || 'SWISSPORT';

  const groundHandlerMenuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: 'Contracts',
    },
    {
      key: '/review-requests',
      icon: <CommentOutlined />,
      label: 'Review Requests',
    },
    {
      key: '/invoices',
      icon: <FileDoneOutlined />,
      label: 'Invoices',
    },
    {
      key: '/rfps',
      icon: <SendOutlined />,
      label: 'RFP Summary',
    },
    {
      key: '/offerings',
      icon: <ShopOutlined />,
      label: 'Service Offerings',
    },
    {
      key: '/configuration',
      icon: <SettingOutlined />,
      label: 'Configuration',
    }
  ];

  const airlineMenuItems = [
    { key: '/airline', icon: <DashboardOutlined />, label: 'Airline Home' },
    { key: '/airline/contracts', icon: <FileTextOutlined />, label: 'Contracts' },
    { key: '/airline/review-requests', icon: <CommentOutlined />, label: 'Review Requests' },
    { key: '/airline/invoices', icon: <FileDoneOutlined />, label: 'Invoices' },
    { key: '/airline/rfps', icon: <SendOutlined />, label: 'RFPs' },
    { key: '/airline/marketplace', icon: <ShopOutlined />, label: 'Marketplace' },
    { key: '/disputes', icon: <SafetyCertificateOutlined />, label: 'Disputes' },
  ];

  const menuItems = isAirline ? airlineMenuItems : groundHandlerMenuItems;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
            {isAirline ? 'Airline Clearing' : 'GH Clearing'}
          </Title>
        </div>
        <Menu 
          theme="light" 
          mode="inline" 
          selectedKeys={[location.pathname.startsWith('/invoices') ? '/invoices' : location.pathname.startsWith('/contracts') ? '/contracts' : location.pathname]} 
          items={menuItems}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Space size="large">
            <Space>
              <UserOutlined />
              <Text strong>{tenantId}</Text>
              <Text type="secondary">({isAirline ? 'Airline User' : 'Ground Handler User'})</Text>
            </Space>
            <Button type="text" icon={<LogoutOutlined />}>
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
