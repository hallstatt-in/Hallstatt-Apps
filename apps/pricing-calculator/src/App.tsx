import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CalculatorPage from './pages/CalculatorPage';
import PriceListPage from './pages/PriceListPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Router basename="/pricing-calculator">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/price-list" element={<PriceListPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}
