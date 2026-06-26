import api from './api';

const taskService = {

  // Get all task types for the dropdown
  getTaskTypes: async () => {
    const response = await api.get('/api/tasks/types');
    return response.data;
  },

  // Submit a new task
  submitTask: async (taskData) => {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },

  // Get all tasks
  getAllTasks: async () => {
    const response = await api.get('/api/tasks');
    return response.data;
  },

  // Get current user's tasks
  getMyTasks: async () => {
    const response = await api.get('/api/tasks/my');
    return response.data;
  },

  // Get a single task by ID (own tasks for devs/product; any for managers/admin)
  getById: async (taskId) => {
    const response = await api.get(`/api/tasks/${taskId}`);
    return response.data;
  },

  // Delete a task (admin only)
  deleteTask: async (taskId) => {
    const response = await api.delete(`/api/tasks/${taskId}`);
    return response.data;
  },

  // CAB workflow
  requestCabApproval: async (taskId) => {
    const response = await api.post(`/api/tasks/${taskId}/cab/request`);
    return response.data;
  },

  cabApprove: async (taskId, comment) => {
    const response = await api.post(`/api/tasks/${taskId}/cab/approve`, { comment });
    return response.data;
  },

  cabReject: async (taskId, comment) => {
    const response = await api.post(`/api/tasks/${taskId}/cab/reject`, { comment });
    return response.data;
  },

  getPendingCab: async () => {
    const response = await api.get('/api/tasks');
    return response.data.filter(t => t.status === 'PENDING_CAB_APPROVAL');
  },
};

export default taskService;