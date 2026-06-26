import api from './api';

const overrideService = {

  createOverride: async (overrideData) => {
    const response = await api.post('/api/overrides', overrideData);
    return response.data;
  },

  getTaskOverrides: async (taskId) => {
    const response = await api.get(`/api/overrides/task/${taskId}`);
    return response.data;
  },

  getAllOverrides: async () => {
    const response = await api.get('/api/overrides');
    return response.data;
  },
};

export default overrideService;