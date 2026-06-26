import api from './api';

const sprintService = {
  getBoard: async () => (await api.get('/api/sprint/board')).data,

  updateStatus: async (subtaskId, status) =>
    (await api.put(`/api/workplace/subtask/${subtaskId}/status`, { status })).data,

  updateWorkplaceStatus: async (workplaceId, status) =>
    (await api.patch(`/api/workplace/${workplaceId}/status`, { status })).data,

  getWorkload: async () => (await api.get('/api/sprint/workload')).data,
};

export default sprintService;
