import api from './api';

const auditService = {
  getAll: async () => {
    const response = await api.get('/api/audit');
    return response.data;
  },
};

export default auditService;
