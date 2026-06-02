import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { API_BASE_URL } from '../config/api.config';
import {
  LoginRequest,
  LoginVendorRequest,
  RegisterRequest,
  AuthResponse,
  CurrentUserResponse
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = `${API_BASE_URL}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<CurrentUserResponse | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadSession();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  registerVendor(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/vendor/register`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  vendorLogin(request: LoginVendorRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/vendor/login`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  loginAuto(request: LoginRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      this.login(request).subscribe({
        next: (response) => {
          subscriber.next(response);
          subscriber.complete();
        },
        error: (err) => {
          console.log('Client login failed, checking fallback. Error:', err);
          if (err?.status === 423) {
            subscriber.error(err);
            return;
          }
          const errMsg = typeof err?.error === 'string' ? err.error : (err?.error?.message || '');
          const isWrongPassword = errMsg.toLowerCase().includes('contraseña') || errMsg.toLowerCase().includes('password');
          
          if (!isWrongPassword) {
            console.log('Attempting vendor login fallback...');
            this.vendorLogin(request).subscribe({
              next: (response) => {
                subscriber.next(response);
                subscriber.complete();
              },
              error: (vendorErr) => {
                console.log('Vendor login fallback failed. Error:', vendorErr);
                subscriber.error(vendorErr);
              }
            });
          } else {
            subscriber.error(err);
          }
        }
      });
    });
  }

  getVendorProfile(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(`${this.API_URL}/vendor/me`).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  saveSession(auth: AuthResponse): void {
    let role = auth.role;
    if (!role && auth.token) {
      role = this.getRoleFromToken(auth.token) || '';
    }

    localStorage.setItem('auth_token', auth.token);
    localStorage.setItem('auth_email', auth.email);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_nombre', auth.nombre || '');
    
    this.currentUserSubject.next({
      id: '',
      nombre: auth.nombre || '',
      email: auth.email,
      role: role
    });
  }

  private getRoleFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role || payload.roles || null;
    } catch (e) {
      console.error('Error decoding JWT token', e);
      return null;
    }
  }

  loadSession(): void {
    const token = this.getToken();
    const email = localStorage.getItem('auth_email');
    const role = localStorage.getItem('auth_role');
    const nombre = localStorage.getItem('auth_nombre');

    if (token && email && role) {
      // Verificar si el token ya expiro antes de restaurar la sesion
      if (this.isTokenExpired(token)) {
        console.warn('Token expirado detectado al iniciar. Limpiando sesion.');
        this.logout();
        return;
      }
      this.currentUserSubject.next({
        id: '',
        nombre: nombre || '',
        email,
        role
      });
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getNombre(): string {
    return localStorage.getItem('auth_nombre') || '';
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_nombre');
    sessionStorage.clear();
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  getUserRole(): string | null {
    return localStorage.getItem('auth_role');
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/reset-password`, { token, newPassword });
  }

  /** Decodifica el JWT y verifica si el claim `exp` ya paso. */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false; // Sin exp → no expira
      // exp esta en segundos, Date.now() en milisegundos
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true; // Token malformado → tratar como expirado
    }
  }
}
