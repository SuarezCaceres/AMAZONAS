import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { tap } from 'rxjs/operators';

import { API_BASE_URL } from '../config/api.config';
import { ClerkService } from './clerk.service';
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
  private readonly clerkService = inject(ClerkService);
  private readonly API_URL = `${API_BASE_URL}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<CurrentUserResponse | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.clerkService.session$.subscribe(async (session) => {
      if (session) {
        try {
          const token = await this.clerkService.getToken();
          const clerk = this.clerkService.getClerkInstance();
          const user = clerk?.user;
          
          if (token && user) {
            const role = this.getRoleFromToken(token) || 'CLIENT';
            const email = user.primaryEmailAddress?.emailAddress || '';
            const nombre = user.username || user.fullName || user.firstName || email;

            sessionStorage.setItem('auth_token', token);
            sessionStorage.setItem('auth_email', email);
            sessionStorage.setItem('auth_role', role);
            sessionStorage.setItem('auth_nombre', nombre);

            this.currentUserSubject.next({
              id: user.id,
              nombre: nombre,
              email: email,
              role: role
            });
          }
        } catch (e) {
          console.error('Error synchronizing Clerk session to AuthService', e);
        }
      } else {
        this.clearLocalSession();
        this.currentUserSubject.next(null);
      }
    });
  }

  // Se mantienen firmas de registro y login para evitar errores de compilación
  // pero ahora la UI principal de autenticación se gestionará mediante el widget de Clerk.
  register(request: RegisterRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      subscriber.error('Use the Clerk UI for registration.');
    });
  }

  registerVendor(request: RegisterRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      subscriber.error('Use the Clerk UI for vendor registration.');
    });
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      subscriber.error('Use the Clerk UI for login.');
    });
  }

  vendorLogin(request: LoginVendorRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      subscriber.error('Use the Clerk UI for vendor login.');
    });
  }

  loginAuto(request: LoginRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(subscriber => {
      subscriber.error('Use the Clerk UI for login.');
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

    sessionStorage.setItem('auth_token', auth.token);
    sessionStorage.setItem('auth_email', auth.email);
    sessionStorage.setItem('auth_role', role);
    sessionStorage.setItem('auth_nombre', auth.nombre || '');
    
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
      // Soporta roles de Clerk en claims personalizados
      return payload.role || payload.roles || payload.metadata?.role || null;
    } catch (e) {
      console.error('Error decoding JWT token', e);
      return null;
    }
  }

  loadSession(): void {
    // La sesión ahora se maneja automáticamente de forma reactiva mediante ClerkService
  }

  private clearLocalSession(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_nombre');
  }

  getToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  getNombre(): string {
    return sessionStorage.getItem('auth_nombre') || '';
  }

  logout(): void {
    this.clearLocalSession();
    this.currentUserSubject.next(null);
    from(this.clerkService.signOut()).subscribe();
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    return sessionStorage.getItem('auth_role');
  }

  forgotPassword(email: string): Observable<any> {
    return new Observable(subscriber => subscriber.error('Managed via Clerk UI.'));
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return new Observable(subscriber => subscriber.error('Managed via Clerk UI.'));
  }
}
