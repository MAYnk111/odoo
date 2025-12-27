import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EquipmentList from './pages/EquipmentList';
import TeamsManagement from './pages/TeamsManagement';
import RequestsKanban from './pages/RequestsKanban';
import CalendarView from './pages/CalendarView';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="equipment" element={<EquipmentList />} />
            <Route path="teams" element={<TeamsManagement />} />
            <Route path="requests" element={<RequestsKanban />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
