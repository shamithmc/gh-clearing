import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';

import ContractsList from './pages/ContractsList';
import ContractWizard from './pages/ContractWizard';
import InvoicesList from './pages/InvoicesList';
import InvoiceWizard from './pages/InvoiceWizard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="contracts/new" element={<ContractWizard />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="invoices/new" element={<InvoiceWizard />} />
        <Route path="configuration" element={<div>Configuration Placeholder</div>} />
      </Route>
    </Routes>
  );
};

export default App;
