export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginVendorRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
  nombre?: string;
}

export interface CurrentUserResponse {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  role: string;
  activo?: boolean;
}
