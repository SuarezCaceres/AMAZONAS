import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { AuthResponse } from '../../../../models/auth.model';

type AuthView = 'login' | 'register';

interface UserAccount {
  name: string;
  email: string;
  password: string;
  role?: string;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnChanges {

  private readonly authService = inject(AuthService);

  @Input() accessNotice = '';
  @Input() initialView: AuthView = 'login';

  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<UserAccount>();

  view: AuthView = 'login';
  recoverySent = false;
  successMessage = '';
  errorMessage = '';
  isLoading = false;
  isVendor = false;

  login = {
    name: '',
    email: '',
    password: ''
  };

  register = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialView']) {
      this.view = this.initialView;
      this.clearMessages();
    }
  }

  get isLogin(): boolean {
    return this.view === 'login';
  }

  switchToLogin(): void {
    this.view = 'login';
    this.clearMessages();
  }

  switchToRegister(): void {
    this.view = 'register';
    this.clearMessages();
  }

  closeModal(): void {
    this.clearMessages();

    this.login = { name: '', email: '', password: '' };
    this.register = { name: '', email: '', password: '', confirmPassword: '' };

    this.closed.emit();
  }

  submitLogin(): void {
    this.clearMessages();

    if (!this.login.email.trim() || !this.login.password.trim()) {
      this.errorMessage = 'Completa todos los campos.';
      return;
    }

    const email = this.login.email.trim().toLowerCase();
    const emailKey = `lock_until_${email}`;
    const attemptsKey = `failed_attempts_${email}`;

    const localLockUntil = localStorage.getItem(emailKey);
    if (localLockUntil) {
      const lockTime = parseInt(localLockUntil, 10);
      if (Date.now() < lockTime) {
        const minutesLeft = Math.ceil((lockTime - Date.now()) / (60 * 1000));
        this.errorMessage = `La cuenta está bloqueada temporalmente por exceso de intentos. Inténtalo de nuevo en ${minutesLeft} minutos.`;
        return;
      } else {
        localStorage.removeItem(emailKey);
        localStorage.setItem(attemptsKey, '0');
      }
    }

    this.isLoading = true;

    const request = {
      email: this.login.email.trim(),
      password: this.login.password
    };

    const requestObservable = this.isVendor
      ? this.authService.vendorLogin({ email: request.email, password: request.password })
      : this.authService.loginAuto(request);

    requestObservable.subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        localStorage.removeItem(emailKey);
        localStorage.removeItem(attemptsKey);

        this.authenticated.emit({
          name: response.nombre || response.email,
          email: response.email,
          password: '',
          role: response.role
        });
      },
      error: (err) => {
        this.isLoading = false;

        let attempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10);
        attempts++;
        localStorage.setItem(attemptsKey, attempts.toString());

        if (attempts >= 3) {
          const lockTime = Date.now() + 15 * 60 * 1000; // 15 minutos
          localStorage.setItem(emailKey, lockTime.toString());
          this.errorMessage = 'La cuenta está bloqueada temporalmente por exceso de intentos (15 min).';
        } else {
          if (err?.status === 423) {
            this.errorMessage = err?.error?.message || err?.error || 'La cuenta está bloqueada temporalmente por exceso de intentos (15 min).';
          } else {
            this.errorMessage = err?.error?.message || err?.error || 'Correo o contraseña incorrectos.';
          }
        }
      }
    });
  }

  submitRegister(): void {
    this.clearMessages();

    if (this.register.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener mínimo 6 caracteres.';
      return;
    }

    if (this.register.password !== this.register.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isLoading = true;

    const request = {
      nombre: this.register.name.trim(),
      email: this.register.email.trim().toLowerCase(),
      password: this.register.password
    };

    this.authService.register(request).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        this.authenticated.emit({
          name: response.nombre || response.email,
          email: response.email,
          password: '',
          role: response.role
        });
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 409) {
          this.errorMessage = 'El correo ya se encuentra registrado';
        } else {
          this.errorMessage = err?.error?.message || err?.error || 'Error al crear la cuenta. Intenta de nuevo.';
        }
      }
    });
  }

  sendRecovery(): void {
    this.clearMessages();

    const email = this.login.email.trim();
    if (!email) {
      this.errorMessage = 'Escribe tu correo electrónico para recuperar tu cuenta.';
      return;
    }

    this.isLoading = true;
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.recoverySent = true;
        this.successMessage = 'Se envió un enlace de recuperación a tu correo electrónico.';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || err?.error || 'No se pudo enviar el correo de recuperación. Verifica el correo e intenta de nuevo.';
      }
    });
  }

  clearMessages(): void {
    this.recoverySent = false;
    this.successMessage = '';
    this.errorMessage = '';
  }
}
