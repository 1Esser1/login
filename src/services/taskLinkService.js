import api from './api';

const taskLinkService = {
  // Returns flat list: [{ id, fromTaskId, toTaskId, fromTitle, toTitle, sequenceOrder, aiDefined }]
  getAllLinks: () =>
    api.get('/api/tasks/links/all').then(r => r.data),

  // Returns { requires: [...], requiredFor: [...] }
  getLinks: (taskId) =>
    api.get(`/api/tasks/${taskId}/links`).then(r => r.data),

  /**
   * direction = 'from' → taskId is the PREREQUISITE (must be done first)
   * direction = 'to'   → linkedTaskId is the PREREQUISITE (must be done first)
   */
  linkTasks: (taskId, linkedTaskId, direction = 'from') => {
    const fromId = direction === 'from' ? taskId : linkedTaskId;
    const toId   = direction === 'from' ? linkedTaskId : taskId;
    return api.post(`/api/tasks/${fromId}/links`, { linkedTaskId: toId }).then(r => r.data);
  },

  // AI decides which task is the prerequisite
  linkTasksWithAi: (taskId, linkedTaskId) =>
    api.post(`/api/tasks/${taskId}/links/ai`, { linkedTaskId }).then(r => r.data),

  // fromId → toId (directed delete — also tolerates reversed order server-side)
  unlinkTasks: (fromId, toId) =>
    api.delete(`/api/tasks/${fromId}/links/${toId}`).then(r => r.data),
};

export default taskLinkService;
