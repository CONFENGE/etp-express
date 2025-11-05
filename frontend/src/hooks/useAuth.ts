import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, login, register, logout } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
  };
}
