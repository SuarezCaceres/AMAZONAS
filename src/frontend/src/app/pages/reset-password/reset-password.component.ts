import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);

  @Input() token = '';
  @Output() completed = new EventEmitter<void>();

  password = '';
  confirmPassword = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  submitReset(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.password.trim() || !this.confirmPassword.trim()) {
      this.errorMessage = 'Completa todos los campos.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.';
        setTimeout(() => {
          this.completed.emit();
        }, 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error || 'No se pudo restablecer la contraseña. El token puede haber expirado o ser inválido.';
      }
    });
  }

  cancel(): void {
    this.completed.emit();
  }
}
