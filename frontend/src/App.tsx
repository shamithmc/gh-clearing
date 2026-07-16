import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<div>Contracts Placeholder</div>} />
        <Route path="invoices" element={<div>Invoices Placeholder</div>} />
        <Route path="configuration" element={<div>Configuration Placeholder</div>} />
      </Route>
    </Routes>
  );
};

export default App;
