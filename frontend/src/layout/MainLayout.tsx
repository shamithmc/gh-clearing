import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plane, 
  Building2, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Receipt, 
  Send, 
  ShoppingBag, 
  TrendingUp, 
  ShieldCheck, 
  LogOut, 
  User, 
  Sliders,
  Scale,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { getAuthenticatedUser, isWorkOsAuthenticated, logout } from '../auth/workosAuth';
import { canManageSupplierConfiguration } from '../utils/supplierConfigurationAccess';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-close sidebar on mobile route change
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [location.pathname, isMobile]);

  const authenticatedUser = getAuthenticatedUser();
  const storedTenantType = authenticatedUser?.tenantType ?? localStorage.getItem('simTenantType');
  const isAirline = authenticatedUser
    ? authenticatedUser.tenantType === 'AIRLINE'
    : storedTenantType === 'AIRLINE' || location.pathname.startsWith('/airline');
  const tenantId = authenticatedUser?.tenantId
    ?? (isAirline ? localStorage.getItem('simTenantId') || 'EK' : localStorage.getItem('simTenantId') || 'SWISSPORT');

  const groundHandlerMenuItems = [
    {
      key: '/',
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: 'Dashboard',
    },
    {
      key: '/contracts',
      icon: <FileText className="w-4 h-4" />,
      label: 'Contracts',
    },
    {
      key: '/review-requests',
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Review Requests',
    },
    {
      key: '/invoices',
      icon: <Receipt className="w-4 h-4" />,
      label: 'Invoices',
    },
    {
      key: '/rfps',
      icon: <Send className="w-4 h-4" />,
      label: 'RFP Summary',
    },
    {
      key: '/offerings',
      icon: <ShoppingBag className="w-4 h-4" />,
      label: 'Service Offerings',
    },
    ...(canManageSupplierConfiguration(authenticatedUser, storedTenantType) ? [{
      key: '/configuration',
      icon: <Sliders className="w-4 h-4" />,
      label: 'Configuration',
    }] : [])
  ];

  const airlineMenuItems = [
    { key: '/airline', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Airline Home' },
    { key: '/airline/contracts', icon: <FileText className="w-4 h-4" />, label: 'Contracts' },
    { key: '/airline/review-requests', icon: <MessageSquare className="w-4 h-4" />, label: 'Review Requests' },
    { key: '/airline/invoices', icon: <Receipt className="w-4 h-4" />, label: 'Invoices' },
    { key: '/airline/rfps', icon: <Send className="w-4 h-4" />, label: 'RFPs' },
    { key: '/airline/marketplace', icon: <ShoppingBag className="w-4 h-4" />, label: 'Marketplace' },
    { key: '/airline/cost-index', icon: <TrendingUp className="w-4 h-4" />, label: 'Cost Index' },
    { key: '/disputes', icon: <Scale className="w-4 h-4" />, label: 'Disputes' },
  ];

  const menuItems = isAirline ? airlineMenuItems : groundHandlerMenuItems;

  // Selected key calculation
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/airline/invoices')) return '/airline/invoices';
    if (path.startsWith('/airline/contracts')) return '/airline/contracts';
    if (path.startsWith('/airline/review-requests')) return '/airline/review-requests';
    if (path.startsWith('/airline/rfps')) return '/airline/rfps';
    if (path.startsWith('/invoices')) return '/invoices';
    if (path.startsWith('/contracts')) return '/contracts';
    if (path.startsWith('/review-requests')) return '/review-requests';
    if (path.startsWith('/rfps')) return '/rfps';
    return path;
  };

  return (
    <Layout className="min-h-screen bg-slate-100">
      
      {/* Mobile Backdrop */}
      {isMobile && !collapsed && (
        <div 
          onClick={() => setCollapsed(true)} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300" 
        />
      )}

      {/* Responsive Sidebar */}
      <Sider 
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setCollapsed(broken);
        }}
        onCollapse={(val) => setCollapsed(val)}
        theme="dark"
        className="!bg-slate-900 border-r border-slate-800 shadow-xl z-50 transition-all duration-300"
        width={240}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              {isAirline ? <Plane className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight m-0">
                {isAirline ? 'AIRLINE CLEARING' : 'GH CLEARING'}
              </h2>
              <span className="text-[10px] font-mono text-slate-400 block tracking-wider uppercase">
                Aviation Fintech Platform
              </span>
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={() => setCollapsed(true)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="py-2">
          <Menu 
            theme="dark" 
            mode="inline" 
            selectedKeys={[getSelectedKey()]} 
            items={menuItems}
            onClick={(e) => navigate(e.key)}
            className="!bg-slate-900 !border-0 [&_.ant-menu-item]:!text-slate-300 [&_.ant-menu-item]:!text-xs [&_.ant-menu-item]:!font-medium [&_.ant-menu-item-selected]:!bg-blue-600 [&_.ant-menu-item-selected]:!text-white [&_.ant-menu-item-selected]:!font-bold [&_.ant-menu-item]:!rounded-lg [&_.ant-menu-item]:!mx-2 [&_.ant-menu-item]:!my-1"
          />
        </div>

        {/* Footer Workspace Info */}
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Operational Mode</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 block">
            IATA AHM560 & SLA Verifier
          </span>
        </div>
      </Sider>

      <Layout className="bg-slate-50/50 min-w-0">
        {/* Header Bar */}
        <Header className="!bg-white px-4 sm:!px-6 border-b border-slate-200/80 flex items-center justify-between !h-16 shadow-2xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="lg:hidden p-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Scope:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                {tenantId} ({isAirline ? 'AIRLINE' : 'HANDLER'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-800">{authenticatedUser?.username ?? tenantId}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-medium">{isAirline ? 'Airline Operations' : 'Handler Station'}</span>
            </div>

            <button 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
              onClick={() => void logout()}
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isWorkOsAuthenticated() ? 'Sign out' : 'Reset Persona'}</span>
            </button>
          </div>
        </Header>

        {/* Main Content Area */}
        <Content className="p-3 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
