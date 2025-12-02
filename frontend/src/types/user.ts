export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  organization: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  lgpdConsent: boolean;
  internationalTransferConsent: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
