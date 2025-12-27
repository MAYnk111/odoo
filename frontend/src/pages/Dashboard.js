import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, Users, AlertCircle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-1">Real-time maintenance management overview</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card primary" data-testid="stat-equipment">
          <div className="flex items-center justify-between mb-3">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div className="stat-value">{stats?.total_equipment || 0}</div>
          <div className="stat-label">Active Equipment</div>
        </div>
        
        <div className="stat-card success" data-testid="stat-teams">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <div className="stat-value">{stats?.total_teams || 0}</div>
          <div className="stat-label">Maintenance Teams</div>
        </div>
        
        <div className="stat-card warning" data-testid="stat-open-requests">
          <div className="flex items-center justify-between mb-3">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <div className="stat-value">{stats?.open_requests || 0}</div>
          <div className="stat-label">Open Requests</div>
        </div>
        
        <div className="stat-card success" data-testid="stat-completed-requests">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="stat-value">{stats?.completed_requests || 0}</div>
          <div className="stat-label">Completed Requests</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="chart-container" data-testid="chart-requests-by-team">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Requests by Team</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.requests_by_team || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container" data-testid="chart-requests-by-equipment">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Equipment (by Requests)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.requests_by_equipment || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipment" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10b981" name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
