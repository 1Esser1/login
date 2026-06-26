import api from './api';

const dependencyService = {
  getBlockedIds: () =>
    api.get('/api/tasks/blocked-ids').then(r => r.data),

  getAll: (taskId) =>
    api.get(`/api/tasks/${taskId}/dependencies`).then(r => r.data),

  add: (blockedTaskId, blockingTaskId) =>
    api.post(`/api/tasks/${blockedTaskId}/dependencies`, { blockingTaskId }).then(r => r.data),

  remove: (blockedTaskId, blockingTaskId) =>
    api.delete(`/api/tasks/${blockedTaskId}/dependencies/${blockingTaskId}`).then(r => r.data),
};

export default dependencyService;
