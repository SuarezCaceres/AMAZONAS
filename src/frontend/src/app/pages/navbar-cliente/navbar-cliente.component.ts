import { Component, EventEmitter, OnInit, OnDestroy, Output, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { InicioComponent } from './sections/inicio/inicio.component';
import { NosotrosComponent } from './sections/nosotros/nosotros.component';
import { CategoriesComponent } from './sections/categories/categories.component';
import { CatalogComponent } from './sections/catalog/catalog.component';
import { CatalogDetailComponent } from './sections/catalog-detail/catalog-detail.component';
import { AuthComponent } from './sections/auth/auth.component';
import { RequestFormComponent, RequestMode, SavedRequest, SessionUser } from './sections/request-form/request-form.component';
import { MyRequestsComponent } from './sections/my-requests/my-requests.component';
import { ResetPasswordComponent } from './sections/reset-password/reset-password.component';
import { ChatComponent } from './sections/chat/chat.component';

import { MODELS, ModelItem } from '../data/model';
import { AuthService } from '../../services/auth.service';

type PageView = 'inicio' | 'nosotros' | 'catalog' | 'detail' | 'auth' | 'request' | 'requests' | 'categories' | 'reset-password' | 'chat';
type AuthView = 'login' | 'register';

@Component({
  selector: 'app-navbar-cliente',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    InicioComponent,
    NosotrosComponent,
    CategoriesComponent,
    CatalogComponent,
    CatalogDetailComponent,
    AuthComponent,
    RequestFormComponent,
    MyRequestsComponent,
    ResetPasswordComponent,
    ChatComponent
  ],
  templateUrl: './navbar-cliente.component.html',
  styleUrl: './navbar-cliente.component.css'
})
export class NavbarClienteComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private userSub?: Subscription;

  @Output() openVendorPanel = new EventEmitter<void>();

  page: PageView = 'inicio';
  previousPage: PageView = 'inicio';

  selectedModel: ModelItem = MODELS[0];

  accessNotice = '';
  authView: AuthView = 'login';
  currentUser: SessionUser | null = null;
  requestMode: RequestMode = 'personalizar';
  isStandaloneRequest = false;
  tokenToReset = '';
  preselectedCategory = '';
  selectedRequestIdForChat = '';

  ngOnInit(): void {
    // Check for password reset token in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token && window.location.href.includes('reset-password')) {
      this.tokenToReset = token;
      this.page = 'reset-password';
    }

    this.userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = {
          name: user.nombre || user.email,
          email: user.email
        };
      } else {
        this.currentUser = null;
      }
    });

    this.page = 'inicio';
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  showCatalog(): void {
    this.preselectedCategory = '';
    this.page = 'catalog';
    this.accessNotice = '';
  }

  handleCategoryFromHeader(catId: string): void {
    this.preselectedCategory = catId;
    this.page = 'catalog';
    this.accessNotice = '';
  }

  showInicio(): void {
    this.page = 'inicio';
    this.accessNotice = '';
  }

  showNosotros(): void {
    this.page = 'nosotros';
    this.accessNotice = '';
  }

  showCategories(): void {
    this.page = 'categories';
    this.accessNotice = '';
  }

  showDetails(model: ModelItem): void {
    this.isStandaloneRequest = false;
    this.selectedModel = model;
    this.page = 'detail';
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  requestAccess(action: RequestMode): void {
    this.isStandaloneRequest = false;

    if (this.currentUser) {
      this.openRequest(action);
      return;
    }

    this.previousPage = this.page === 'auth'
      ? this.previousPage
      : this.page;

    this.accessNotice = action === 'comprar'
      ? 'Para comprar una maqueta debes iniciar sesion o registrarte.'
      : 'Para personalizar tu maqueta debes iniciar sesion o registrarte.';

    this.authView = 'login';
    this.page = 'auth';
  }

  openStandaloneRequest(): void {
    this.isStandaloneRequest = true;

    if (!this.currentUser) {
      this.previousPage = this.page;
      this.accessNotice =
        'Para personalizar tu maqueta debes iniciar sesion o registrarte.';
      this.authView = 'login';
      this.page = 'auth';
      return;
    }

    this.requestMode = 'personalizar';
    this.page = 'request';
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  showLogin(): void {
    this.previousPage = 'catalog';
    this.accessNotice = '';
    this.authView = 'login';
    this.page = 'auth';
  }

  showRegister(): void {
    this.previousPage = this.page === 'auth' ? this.previousPage : this.page;
    this.accessNotice = 'Crea tu cuenta para comprar o personalizar tus maquetas.';
    this.authView = 'register';
    this.page = 'auth';
  }

  closeAuth(): void {
    this.page = this.previousPage;
    this.accessNotice = '';
  }

  completeLogin(user: SessionUser & { role?: string }): void {
    this.currentUser = {
      name: user.name,
      email: user.email
    };

    this.accessNotice = '';

    // Redirigir según el rol
    const role = user.role || this.authService.getUserRole();
    if (role === 'ADMIN') {
      this.openVendorPanel.emit();
    } else {
      this.showCatalog();
    }
  }

  openRequest(mode: RequestMode): void {
    this.requestMode = mode;
    this.page = 'request';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchRequestMode(mode: RequestMode): void {
    this.requestMode = mode;
  }

  showRequests(): void {
    if (!this.currentUser) {
      this.showLogin();
      return;
    }
    this.page = 'requests';
    this.accessNotice = '';
  }

  handleRequestSubmitted(_request: SavedRequest): void {
    this.page = 'requests';
  }

  handleViewChat(requestId: string): void {
    this.selectedRequestIdForChat = requestId;
    this.page = 'chat';
    this.accessNotice = '';
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.showInicio();
  }

  handleResetCompleted(): void {
    window.history.replaceState({}, document.title, window.location.pathname);
    this.tokenToReset = '';
    this.showLogin();
  }
}
