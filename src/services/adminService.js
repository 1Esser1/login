import api from './api';

const adminService = {

  // Get all pending users
  getPendingUsers: async () => {
    const response = await api.get('/api/admin/users/pending');
    return response.data;
  },

  // Approve a user
  approveUser: async (userId) => {
    const response = await api.put(`/api/admin/users/${userId}/approve`);
    return response.data;
  },

  // Reject a user
  rejectUser: async (userId) => {
    const response = await api.put(`/api/admin/users/${userId}/reject`);
    return response.data;
  },

  // Get all users (any status)
  getAllUsers: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },

  // Update a user (role, name, status)
  updateUser: async (userId, data) => {
    const response = await api.put(`/api/admin/users/${userId}`, data);
    return response.data;
  },

  // Delete a user permanently
  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Get active AI provider
  getAiProvider: async () => {
    const response = await api.get('/api/admin/ai-provider');
    return response.data;
  },

  // Set active AI provider
  setAiProvider: async (provider) => {
    const response = await api.put('/api/admin/ai-provider', { provider });
    return response.data;
  },
};

export default adminService;