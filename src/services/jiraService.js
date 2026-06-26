import api from './api';

const jiraService = {
  getStatus:    async ()    => (await api.get('/api/jira/status')).data,
  connect:      async (data) => (await api.post('/api/jira/connect', data)).data,
  disconnect:   async ()    => api.delete('/api/jira/disconnect'),
  listProjects: async ()    => (await api.get('/api/jira/projects')).data,

  createIssue:   async (data)   => (await api.post('/api/jira/issue/create', data)).data,
  linkIssue:     async (data)   => (await api.post('/api/jira/issue/link', data)).data,
  refreshStatus: async (taskId) => (await api.put(`/api/jira/issue/${taskId}/refresh`)).data,
  unlinkIssue:   async (taskId) => api.delete(`/api/jira/issue/${taskId}/unlink`),
  pushSubtask:    async (data)       => (await api.post('/api/jira/subtask/push', data)).data,
  forceSyncSubtask: async (subtaskId) => (await api.put(`/api/jira/subtask/${subtaskId}/force-sync`)).data,
};

export default jiraService;
