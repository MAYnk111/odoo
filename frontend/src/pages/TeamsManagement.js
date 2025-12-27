import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeamsManagement = () => {
  const [teams, setTeams] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ team_name: '', description: '' });
  const [techForm, setTechForm] = useState({ name: '', email: '', team_id: '' });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [teamsRes, techRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/technicians`)
      ]);
      setTeams(teamsRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/teams`, teamForm);
      toast.success('Team created successfully');
      setTeamOpen(false);
      fetchData();
      setTeamForm({ team_name: '', description: '' });
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };
  
  const handleTechSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/technicians`, techForm);
      toast.success('Technician added successfully');
      setTechOpen(false);
      fetchData();
      setTechForm({ name: '', email: '', team_id: '' });
    } catch (error) {
      console.error('Error adding technician:', error);
      toast.error('Failed to add technician');
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
    <div data-testid="teams-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Teams Management</h1>
        <p className="text-slate-600 mt-1">Manage maintenance teams and technicians</p>
      </div>
      
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="teams" data-testid="teams-tab">Maintenance Teams</TabsTrigger>
          <TabsTrigger value="technicians" data-testid="technicians-tab">Technicians</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams">
          <div className="flex justify-end mb-6">
            <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-team-button" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="team-dialog">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTeamSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="team_name">Team Name *</Label>
                    <Input
                      id="team_name"
                      data-testid="team-name-input"
                      value={teamForm.team_name}
                      onChange={(e) => setTeamForm({...teamForm, team_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      data-testid="team-description-input"
                      value={teamForm.description}
                      onChange={(e) => setTeamForm({...teamForm, description: e.target.value})}
                    />
                  </div>
                  <Button type="submit" data-testid="team-submit-button" className="w-full bg-blue-600 hover:bg-blue-700">
                    Create Team
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const teamTechs = technicians.filter(t => t.team_id === team.id);
              return (
                <div key={team.id} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm" data-testid={`team-card-${team.id}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">{team.team_name}</h3>
                      <p className="text-sm text-slate-500">{teamTechs.length} technicians</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{team.description || 'No description'}</p>
                  
                  <div className="space-y-2">
                    {teamTechs.map(tech => (
                      <div key={tech.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded" data-testid={`technician-item-${tech.id}`}>
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {tech.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="font-medium text-slate-800">{tech.name}</div>
                          <div className="text-slate-500 text-xs">{tech.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="technicians">
          <div className="flex justify-end mb-6">
            <Dialog open={techOpen} onOpenChange={setTechOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-technician-button" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Technician
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="technician-dialog">
                <DialogHeader>
                  <DialogTitle>Add New Technician</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTechSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      data-testid="technician-name-input"
                      value={techForm.name}
                      onChange={(e) => setTechForm({...techForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="technician-email-input"
                      value={techForm.email}
                      onChange={(e) => setTechForm({...techForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="team_id">Team *</Label>
                    <Select 
                      value={techForm.team_id.toString()} 
                      onValueChange={(value) => setTechForm({...techForm, team_id: value})}
                    >
                      <SelectTrigger data-testid="technician-team-select">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id.toString()}>{team.team_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" data-testid="technician-submit-button" className="w-full bg-blue-600 hover:bg-blue-700">
                    Add Technician
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Team</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((tech) => (
                  <tr key={tech.id} className="border-b border-slate-200 hover:bg-slate-50" data-testid={`technician-row-${tech.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {tech.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{tech.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{tech.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {tech.team_name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamsManagement;
