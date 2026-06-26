import api from './api';

const settingsService = {

  // Get saved notification preferences
  getNotifications: async () => {
    const response = await api.get('/api/settings/notifications');
    return response.data;
  },

  // Update profile (name, email, password, photo)
  updateProfile: async (data, photo) => {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (photo) formData.append('photo', photo);
    const response = await api.put('/api/settings/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Save notification preferences
  saveNotifications: async (prefs) => {
    const response = await api.put('/api/settings/notifications', prefs);
    return response.data;
  },
};

export default settingsService;
