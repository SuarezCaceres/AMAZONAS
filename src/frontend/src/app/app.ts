import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { Auth } from './pages/auth/auth';
import { CatalogDetailComponent } from './pages/catalog-detail/catalog-detail.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { MODELS, ModelItem } from './pages/data/model';
import { HeaderComponent } from './pages/header/header.component';
import { FooterComponent } from './pages/footer/footer.component';
import { NavbarVendedorComponent } from './pages/navbar-vendedor/navbar-vendedor.component';
import { Inicio } from './pages/inicio/inicio';
import { Nosotros } from './pages/nosotros/nosotros';
import { MyRequestsComponent } from './pages/my-requests/my-requests.component';
import { RequestFormComponent, RequestMode, SavedRequest, SessionUser } from './pages/request-form/request-form.component';
import { AuthService } from './services/auth.service';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { CategoriesComponent } from './pages/categories/categories.component';

type PageView = 'inicio' | 'nosotros' | 'catalog' | 'detail' | 'auth' | 'request' | 'requests' | 'vendedor' | 'reset-password' | 'categories';
type AuthView = 'login' | 'register';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    Auth,
    CatalogComponent,
    CatalogDetailComponent,
    FooterComponent,
    HeaderComponent,
    NavbarVendedorComponent,
    Inicio,
    Nosotros,
    MyRequestsComponent,
    RequestFormComponent,
    ResetPasswordComponent,
    CategoriesComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private userSub?: Subscription;

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

    // Al iniciar http://localhost:4200 siempre redirigir a inicio
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
      this.page = 'vendedor';
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

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.showInicio();
  }

  showVendedor(): void {
    this.page = 'vendedor';
  }

  salirPanel(): void {
    this.showInicio();
  }

  handleResetCompleted(): void {
    window.history.replaceState({}, document.title, window.location.pathname);
    this.tokenToReset = '';
    this.showLogin();
  }
}
