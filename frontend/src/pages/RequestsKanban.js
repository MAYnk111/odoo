import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RequestsKanban = () => {
  const [kanbanData, setKanbanData] = useState({ 'New': [], 'In Progress': [], 'Repaired': [], 'Scrap': [] });
  const [equipment, setEquipment] = useState([]);
  const [teams, setTeams] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    equipment_id: '',
    request_type: 'Corrective',
    scheduled_date: '',
    technician_id: '',
    duration_hours: ''
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [requestsRes, equipmentRes, teamsRes, techRes] = await Promise.all([
        axios.get(`${API}/requests/kanban`),
        axios.get(`${API}/equipment`),
        axios.get(`${API}/teams`),
        axios.get(`${API}/technicians`)
      ]);
      setKanbanData(requestsRes.data);
      setEquipment(equipmentRes.data);
      setTeams(teamsRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/requests`, formData);
      toast.success('Request created successfully');
      setOpen(false);
      fetchData();
      setFormData({
        subject: '',
        equipment_id: '',
        request_type: 'Corrective',
        scheduled_date: '',
        technician_id: '',
        duration_hours: ''
      });
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.response?.data?.error || 'Failed to create request');
    }
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/requests/${selectedRequest.id}`, selectedRequest);
      toast.success('Request updated successfully');
      setEditOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(error.response?.data?.error || 'Failed to update request');
    }
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    // Check if dragging to a column
    const targetStatus = ['New', 'In Progress', 'Repaired', 'Scrap'].find(status => status === overId);
    
    if (targetStatus) {
      // Find the request
      let request = null;
      for (const status in kanbanData) {
        const found = kanbanData[status].find(r => r.id === activeId);
        if (found) {
          request = found;
          break;
        }
      }
      
      if (request && request.status !== targetStatus) {
        // Validate: Duration required before marking as Repaired
        if (targetStatus === 'Repaired' && !request.duration_hours) {
          toast.error('Duration is required before marking as Repaired');
          return;
        }
        
        try {
          await axios.put(`${API}/requests/${activeId}`, {
            ...request,
            status: targetStatus
          });
          toast.success(`Request moved to ${targetStatus}`);
          fetchData();
        } catch (error) {
          console.error('Error updating request:', error);
          toast.error('Failed to update request status');
        }
      }
    }
  };
  
  const handleCardClick = (request) => {
    setSelectedRequest(request);
    setEditOpen(true);
  };
  
  const selectedEquipment = equipment.find(e => e.id === parseInt(formData.equipment_id));
  const filteredTechnicians = selectedEquipment 
    ? technicians.filter(t => t.team_id === selectedEquipment.maintenance_team_id)
    : [];
  
  const editFilteredTechnicians = selectedRequest
    ? technicians.filter(t => t.team_id === selectedRequest.team_id)
    : [];
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div data-testid="kanban-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Maintenance Requests</h1>
          <p className="text-slate-600 mt-1">Drag and drop requests to change their status</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-request-button" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="create-request-dialog">
            <DialogHeader>
              <DialogTitle>Create Maintenance Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    data-testid="request-subject-input"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="equipment_id">Equipment *</Label>
                  <Select 
                    value={formData.equipment_id.toString()} 
                    onValueChange={(value) => setFormData({...formData, equipment_id: value, technician_id: ''})}
                  >
                    <SelectTrigger data-testid="request-equipment-select">
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.filter(e => !e.is_scrapped).map(eq => (
                        <SelectItem key={eq.id} value={eq.id.toString()}>{eq.name} ({eq.serial_number})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="request_type">Request Type *</Label>
                  <Select 
                    value={formData.request_type} 
                    onValueChange={(value) => setFormData({...formData, request_type: value})}
                  >
                    <SelectTrigger data-testid="request-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrective">Corrective (Breakdown)</SelectItem>
                      <SelectItem value="Preventive">Preventive (Routine)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    data-testid="request-scheduled-date-input"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="technician_id">Assign Technician</Label>
                  <Select 
                    value={formData.technician_id.toString()} 
                    onValueChange={(value) => setFormData({...formData, technician_id: value})}
                    disabled={!formData.equipment_id}
                  >
                    <SelectTrigger data-testid="request-technician-select">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTechnicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.equipment_id && filteredTechnicians.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">No technicians available for this equipment's team</p>
                  )}
                </div>
              </div>
              <Button type="submit" data-testid="request-submit-button" className="w-full bg-blue-600 hover:bg-blue-700">
                Create Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="kanban-container">
          {Object.entries(kanbanData).map(([status, requests]) => (
            <KanbanColumn 
              key={status} 
              status={status} 
              requests={requests}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </DndContext>
      
      {/* Edit Request Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl" data-testid="edit-request-dialog">
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit_subject">Subject</Label>
                  <Input
                    id="edit_subject"
                    data-testid="edit-request-subject-input"
                    value={selectedRequest.subject}
                    onChange={(e) => setSelectedRequest({...selectedRequest, subject: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_technician">Technician</Label>
                  <Select 
                    value={selectedRequest.technician_id?.toString() || ''} 
                    onValueChange={(value) => setSelectedRequest({...selectedRequest, technician_id: value})}
                  >
                    <SelectTrigger data-testid="edit-request-technician-select">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {editFilteredTechnicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_duration">Duration (hours)</Label>
                  <Input
                    id="edit_duration"
                    type="number"
                    step="0.5"
                    data-testid="edit-request-duration-input"
                    value={selectedRequest.duration_hours || ''}
                    onChange={(e) => setSelectedRequest({...selectedRequest, duration_hours: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_scheduled_date">Scheduled Date</Label>
                  <Input
                    id="edit_scheduled_date"
                    type="date"
                    data-testid="edit-request-scheduled-date-input"
                    value={selectedRequest.scheduled_date || ''}
                    onChange={(e) => setSelectedRequest({...selectedRequest, scheduled_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select 
                    value={selectedRequest.status} 
                    onValueChange={(value) => setSelectedRequest({...selectedRequest, status: value})}
                  >
                    <SelectTrigger data-testid="edit-request-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Repaired">Repaired</SelectItem>
                      <SelectItem value="Scrap">Scrap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" data-testid="edit-request-submit-button" className="w-full bg-blue-600 hover:bg-blue-700">
                Update Request
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KanbanColumn = ({ status, requests, onCardClick }) => {
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: 'column' }
  });
  
  const statusColors = {
    'New': 'status-new',
    'In Progress': 'status-in-progress',
    'Repaired': 'status-repaired',
    'Scrap': 'status-scrap'
  };
  
  return (
    <div ref={setNodeRef} className="kanban-column" data-testid={`kanban-column-${status.toLowerCase().replace(' ', '-')}`}>
      <div className={`kanban-column-header ${statusColors[status]}`}>
        <span>{status}</span>
        <span className="font-bold">{requests.length}</span>
      </div>
      
      <SortableContext items={requests.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards">
          {requests.map(request => (
            <KanbanCard key={request.id} request={request} onClick={() => onCardClick(request)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanCard = ({ request, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: request.id,
    data: { type: 'card', request }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const isOverdue = request.scheduled_date && new Date(request.scheduled_date) < new Date() && request.status !== 'Repaired';
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card ${isOverdue ? 'overdue' : ''}`}
      onClick={onClick}
      data-testid={`kanban-card-${request.id}`}
    >
      <div className="card-title">{request.subject}</div>
      <div className="card-meta">
        <div>Equipment: {request.equipment_name}</div>
        <div>Type: {request.request_type}</div>
        {request.scheduled_date && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(request.scheduled_date).toLocaleDateString()}
          </div>
        )}
        {request.duration_hours && (
          <div>Duration: {request.duration_hours}h</div>
        )}
      </div>
      
      {request.technician_name && (
        <div className="card-technician">
          <div className="technician-avatar">
            {request.technician_name.charAt(0)}
          </div>
          <span className="text-sm font-medium">{request.technician_name}</span>
        </div>
      )}
      
      {isOverdue && (
        <div className="overdue-badge">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          OVERDUE
        </div>
      )}
    </div>
  );
};

export default RequestsKanban;
