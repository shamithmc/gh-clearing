import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';

import ContractsList from './pages/ContractsList';
import ContractWizard from './pages/ContractWizard';
import InvoicesList from './pages/InvoicesList';
import InvoiceWizard from './pages/InvoiceWizard';
import AirlineDashboard from './pages/AirlineDashboard';
import AirlineContracts from './pages/AirlineContracts';
import ContractReviewRequests from './pages/ContractReviewRequests';
import AirlineInvoices from './pages/AirlineInvoices';
import AirlineRfps from './pages/AirlineRfps';
import SupplierRfps from './pages/SupplierRfps';
import Marketplace from './pages/Marketplace';
import ServiceOfferings from './pages/ServiceOfferings';
import AirlineReviewRequests from './pages/AirlineReviewRequests';
import { Empty } from 'antd';

const TenantHome: React.FC = () => (
  localStorage.getItem('simTenantType') === 'AIRLINE' ? <AirlineDashboard /> : <Dashboard />
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<TenantHome />} />
        <Route path="airline" element={<AirlineDashboard />} />
        <Route path="airline/contracts" element={<AirlineContracts />} />
        <Route path="airline/invoices" element={<AirlineInvoices />} />
        <Route path="airline/rfps" element={<AirlineRfps />} />
        <Route path="airline/marketplace" element={<Marketplace />} />
        <Route path="airline/review-requests" element={<AirlineReviewRequests />} />
        <Route path="review-requests" element={<ContractReviewRequests />} />
        <Route path="rfps" element={<SupplierRfps />} />
        <Route path="offerings" element={<ServiceOfferings />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="contracts/new" element={<ContractWizard />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="invoices/new" element={<InvoiceWizard />} />
        <Route path="disputes" element={<Empty description="Airline dispute workspace is coming in a later Phase 6 slice" />} />
        <Route path="configuration" element={<div>Configuration Placeholder</div>} />
      </Route>
    </Routes>
  );
};

export default App;
