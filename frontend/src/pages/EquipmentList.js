import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    department: '',
    assigned_employee: '',
    location: '',
    purchase_date: '',
    warranty_end: '',
    maintenance_team_id: ''
  });
  
  useEffect(() => {
    fetchEquipment();
    fetchTeams();
  }, []);
  
  const fetchEquipment = async () => {
    try {
      const response = await axios.get(`${API}/equipment`);
      setEquipment(response.data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/equipment`, formData);
      toast.success('Equipment created successfully');
      setOpen(false);
      fetchEquipment();
      setFormData({
        name: '',
        serial_number: '',
        department: '',
        assigned_employee: '',
        location: '',
        purchase_date: '',
        warranty_end: '',
        maintenance_team_id: ''
      });
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast.error('Failed to create equipment');
    }
  };
  
  const getMaintenanceCount = async (equipmentId) => {
    try {
      const response = await axios.get(`${API}/equipment/${equipmentId}/maintenance_count`);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching maintenance count:', error);
      return 0;
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
    <div data-testid="equipment-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Equipment Management</h1>
          <p className="text-slate-600 mt-1">Track and manage all company equipment</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-equipment-button" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="equipment-dialog">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Equipment Name *</Label>
                  <Input
                    id="name"
                    data-testid="equipment-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serial_number">Serial Number *</Label>
                  <Input
                    id="serial_number"
                    data-testid="equipment-serial-input"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    data-testid="equipment-department-input"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="assigned_employee">Assigned Employee</Label>
                  <Input
                    id="assigned_employee"
                    data-testid="equipment-employee-input"
                    value={formData.assigned_employee}
                    onChange={(e) => setFormData({...formData, assigned_employee: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    data-testid="equipment-location-input"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance_team_id">Maintenance Team</Label>
                  <Select 
                    value={formData.maintenance_team_id.toString()} 
                    onValueChange={(value) => setFormData({...formData, maintenance_team_id: value})}
                  >
                    <SelectTrigger data-testid="equipment-team-select">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id.toString()}>{team.team_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    data-testid="equipment-purchase-date-input"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="warranty_end">Warranty End Date</Label>
                  <Input
                    id="warranty_end"
                    type="date"
                    data-testid="equipment-warranty-date-input"
                    value={formData.warranty_end}
                    onChange={(e) => setFormData({...formData, warranty_end: e.target.value})}
                  />
                </div>
              </div>
              <Button type="submit" data-testid="equipment-submit-button" className="w-full bg-blue-600 hover:bg-blue-700">
                Create Equipment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <EquipmentCard key={item.id} equipment={item} getMaintenanceCount={getMaintenanceCount} />
        ))}
      </div>
      
      {equipment.length === 0 && (
        <div className="text-center py-12" data-testid="no-equipment-message">
          <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No equipment found</h3>
          <p className="text-slate-500 mt-1">Add your first equipment to get started</p>
        </div>
      )}
    </div>
  );
};

const EquipmentCard = ({ equipment, getMaintenanceCount }) => {
  const [maintenanceCount, setMaintenanceCount] = useState(null);
  
  useEffect(() => {
    const fetchCount = async () => {
      const count = await getMaintenanceCount(equipment.id);
      setMaintenanceCount(count);
    };
    fetchCount();
  }, [equipment.id]);
  
  const isWarrantyExpired = equipment.warranty_end && new Date(equipment.warranty_end) < new Date();
  
  return (
    <div 
      className={`bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow ${
        equipment.is_scrapped ? 'opacity-60 border-red-300' : 'border-slate-200'
      }`}
      data-testid={`equipment-card-${equipment.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800">{equipment.name}</h3>
          <p className="text-sm text-slate-500">{equipment.serial_number}</p>
        </div>
        {equipment.is_scrapped && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">SCRAPPED</span>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Department:</span>
          <span className="font-medium text-slate-800">{equipment.department || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Location:</span>
          <span className="font-medium text-slate-800">{equipment.location || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Assigned to:</span>
          <span className="font-medium text-slate-800">{equipment.assigned_employee || 'Unassigned'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Team:</span>
          <span className="font-medium text-slate-800">{equipment.team_name || 'N/A'}</span>
        </div>
      </div>
      
      {isWarrantyExpired && (
        <div className="mt-4 flex items-center gap-2 text-orange-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Warranty Expired</span>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-slate-200">
        <button 
          className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
          data-testid={`equipment-maintenance-button-${equipment.id}`}
        >
          <Package className="w-4 h-4" />
          <span>Open Requests: {maintenanceCount !== null ? maintenanceCount : '...'}</span>
        </button>
      </div>
    </div>
  );
};

export default EquipmentList;
