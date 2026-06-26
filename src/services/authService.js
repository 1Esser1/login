import api from './api';

// All authentication related API calls
const authService = {

  // Register new user with photo
  // Uses FormData because we're sending a file
  register: async (userData, photo) => {
    const formData = new FormData();

    // Append JSON data as a string with content type
    formData.append(
      'data',
      new Blob([JSON.stringify(userData)], { type: 'application/json' })
    );

    // Append photo if provided
    if (photo) {
      formData.append('photo', photo);
    }

    const response = await api.post('/api/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Login and store token
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const data = response.data;

    // Store token and user info in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      name: data.name,
      email: data.email,
      role: data.role,
      emailVerified: data.emailVerified,
      photoPath: data.photoPath,
      passwordStrength: data.passwordStrength,
    }));

    return data;
  },

  // Logout — clear localStorage
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Check if current user is admin
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user?.role === 'ADMIN';
  },
};

export default authService;