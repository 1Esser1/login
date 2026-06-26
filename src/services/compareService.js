import api from './api';

const compareService = {
  compare: async (items, additionalContext) => {
    const response = await api.post('/api/compare', {
      items,
      additionalContext: additionalContext?.trim() || null,
    });
    return response.data;
  },
};

export default compareService;
