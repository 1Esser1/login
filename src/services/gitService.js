import api from './api';

const gitService = {
  getStatus: async () => (await api.get('/api/git/status')).data,

  getAuthUrl: async (provider) => (await api.get(`/api/git/connect/${provider}`)).data,

  disconnect: async (provider) => api.delete(`/api/git/disconnect/${provider}`),

  getRepos: async (provider) => (await api.get(`/api/git/repos?provider=${provider}`)).data,

  createRepo: async (data) => (await api.post('/api/git/repos', data)).data,

  commitFiles: async (data) => (await api.post('/api/git/commit', data)).data,
};

export default gitService;
