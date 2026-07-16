import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';

import ContractsList from './pages/ContractsList';
import ContractWizard from './pages/ContractWizard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="contracts/new" element={<ContractWizard />} />
        <Route path="invoices" element={<div>Invoices Placeholder</div>} />
        <Route path="configuration" element={<div>Configuration Placeholder</div>} />
      </Route>
    </Routes>
  );
};

export default App;
