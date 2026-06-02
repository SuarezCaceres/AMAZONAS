import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthResponse } from '../../models/auth.model';

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
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth implements OnChanges {

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

    this.isLoading = true;

    const request = {
      email: this.login.email.trim(),
      password: this.login.password
    };

    this.authService.loginAuto(request).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        this.successMessage = `Bienvenido, ${response.nombre || response.email}.`;
        this.authenticated.emit({
          name: response.nombre || response.email,
          email: response.email,
          password: '',
          role: response.role
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || err?.error || 'Correo o contraseña incorrectos.';
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
        this.successMessage = `Cuenta creada. Bienvenido, ${response.nombre || response.email}.`;
        this.authenticated.emit({
          name: response.nombre || response.email,
          email: response.email,
          password: '',
          role: response.role
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || err?.error || 'Error al crear la cuenta. Intenta de nuevo.';
      }
    });
  }

  sendRecovery(): void {
    this.clearMessages();

    if (!this.login.email.trim()) {
      this.errorMessage = 'Escribe tu correo electrónico para recuperar tu cuenta.';
      return;
    }

    this.recoverySent = true;
    this.successMessage = 'Se envió un enlace de recuperación (simulado).';
  }

  private clearMessages(): void {
    this.recoverySent = false;
    this.successMessage = '';
    this.errorMessage = '';
  }
}
