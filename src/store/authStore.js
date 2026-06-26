import { create } from 'zustand';
import authService from '../services/authService';

// Global state for authentication
// Any component can read or update this state
const useAuthStore = create((set) => ({

  // Initial state — read from localStorage on app start
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  // Login action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      set({
        user: {
          name: data.name,
          email: data.email,
          role: data.role,
          emailVerified: data.emailVerified,
          photoPath: data.photoPath,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Logout action
  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  // Update user profile in store + localStorage (after settings save)
  updateUser: (updates) => {
    set(state => {
      const updated = { ...state.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;