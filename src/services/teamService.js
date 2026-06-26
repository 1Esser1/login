import api from './api';

const teamService = {
  getMyTeams:         ()              => api.get('/api/teams').then(r => r.data),
  getTeam:            (id)            => api.get(`/api/teams/${id}`).then(r => r.data),
  getEligibleMembers: ()              => api.get('/api/teams/eligible-members').then(r => r.data),
  getManagers:        ()              => api.get('/api/teams/managers').then(r => r.data),
  createTeam:         (data)          => api.post('/api/teams', data).then(r => r.data),
  updateTeam:         (id, data)      => api.put(`/api/teams/${id}`, data).then(r => r.data),
  deleteTeam:         (id)            => api.delete(`/api/teams/${id}`),
  addMember:          (id, userId)    => api.post(`/api/teams/${id}/members/${userId}`).then(r => r.data),
  removeMember:       (id, userId)    => api.delete(`/api/teams/${id}/members/${userId}`).then(r => r.data),
};

export default teamService;
