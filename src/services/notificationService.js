import api from './api';

const notificationService = {
  getAll: async () => {
    const response = await api.get('/api/notifications');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/api/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (id) => {
    await api.put(`/api/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    await api.put('/api/notifications/read-all');
  },
};

export default notificationService;
