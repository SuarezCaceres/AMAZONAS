import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClerkSignInComponent, ClerkSignUpComponent } from 'ngx-clerk';
import { AuthService } from '../../../../services/auth.service';

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
  imports: [
    CommonModule,
    ClerkSignInComponent,
    ClerkSignUpComponent
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnChanges, OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private userSub?: Subscription;

  @Input() accessNotice = '';
  @Input() initialView: AuthView = 'login';

  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<UserAccount>();

  view: AuthView = 'login';

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.authenticated.emit({
          name: user.nombre,
          email: user.email,
          password: '',
          role: user.role
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialView']) {
      this.view = this.initialView;
    }
  }

  get isLogin(): boolean {
    return this.view === 'login';
  }

  closeModal(): void {
    this.closed.emit();
  }
}
