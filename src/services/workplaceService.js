import api from './api';

const workplaceService = {

  generate: async (taskId) => {
    const res = await api.post(`/api/workplace/generate/${taskId}`);
    return res.data;
  },

  regenerate: async (taskId) => {
    const res = await api.post(`/api/workplace/regenerate/${taskId}`);
    return res.data;
  },

  getById: async (workplaceId) => {
    const res = await api.get(`/api/workplace/${workplaceId}`);
    return res.data;
  },

  getByTask: async (taskId) => {
    const res = await api.get(`/api/workplace/task/${taskId}`);
    return res.data;
  },

  getMyWorkplaces: async () => {
    const res = await api.get('/api/workplace/my');
    return res.data;
  },

  getAllWorkplaces: async () => {
    const res = await api.get('/api/workplace/all');
    return res.data;
  },

  updateSubtaskStatus: async (subtaskId, status) => {
    const res = await api.put(`/api/workplace/subtask/${subtaskId}/status`, { status });
    return res.data;
  },

  getUnified: async (workplaceId) => {
    const res = await api.get(`/api/workplace/${workplaceId}/unified`);
    return res.data;
  },

  merge: async (workplaceId) => {
    const res = await api.post(`/api/workplace/${workplaceId}/merge`);
    return res.data;
  },
};

export default workplaceService;
