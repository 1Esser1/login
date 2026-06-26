import api from './api';

const slaService = {
  getAll: async () => (await api.get('/api/sla')).data,

  setDeadline: async (workplaceId, dueDate) =>
    (await api.patch(`/api/sla/${workplaceId}/deadline`, { dueDate })).data,
};

export default slaService;
