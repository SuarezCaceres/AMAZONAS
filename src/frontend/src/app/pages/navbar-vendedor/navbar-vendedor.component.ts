import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ChangeDetectorRef, inject } from '@angular/core';
import { DashboardComponent } from './sections/dashboard/dashboard.component';
import { MaquetaComponent } from './sections/maqueta/maqueta.component';
import { GestionStockComponent } from './sections/gestion-stock/gestion-stock.component';
import { SolicitudesComponent } from './sections/solicitudes/solicitudes.component';
import { MaterialesComponent } from './sections/materiales/materiales.component';
import { PresupuestosComponent } from './sections/presupuestos/presupuestos.component';
import { FlujoDePagosComponent } from './sections/flujo-pagos/flujodepagos.component';

export type VendedorTab =
  | 'dashboard'
  | 'maquetas'
  | 'gestion-stock'
  | 'solicitudes'
  | 'materiales'
  | 'presupuestos'
  | 'pagos';

export interface NavItem {
  id: VendedorTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar-vendedor',
  standalone: true,
  imports: [
    CommonModule, 
    DashboardComponent, 
    MaquetaComponent, 
    GestionStockComponent, 
    SolicitudesComponent, 
    MaterialesComponent, 
    PresupuestosComponent,
    FlujoDePagosComponent
  ],
  templateUrl: './navbar-vendedor.component.html',
  styleUrl: './navbar-vendedor.component.css',
})

export class NavbarVendedorComponent {

  @Output() salir = new EventEmitter<void>();

  activeTab: VendedorTab = 'dashboard';
  mobileMenuOpen = false;
  solicitudIdParaPresupuesto: string | null = null;
  solicitudIdParaChat: string | null = null;
  isChatActivo = false;

  // Estado para la carga perezosa de pestañas (lazy tab loading)
  // Mantiene los componentes en memoria una vez cargados para evitar peticiones HTTP y perder estado al cambiar de tab.
  loadedTabs: { [key in VendedorTab]?: boolean } = {
    dashboard: true
  };

  navItems: NavItem[] = [
    { id: 'dashboard',     label: 'Dashboard',        icon: 'grid'        },
    { id: 'maquetas',      label: 'Maquetas',          icon: 'layers'      },
    { id: 'gestion-stock', label: 'Gestión de Stock',  icon: 'box'         },
    { id: 'solicitudes',   label: 'Solicitudes',       icon: 'cart'        },
    { id: 'materiales',    label: 'Materiales',        icon: 'briefcase'   },
    { id: 'presupuestos',  label: 'Presupuestos',      icon: 'calculator'  },
    { id: 'pagos',         label: 'Pagos',             icon: 'dollar'      },
  ];

  setTab(tab: VendedorTab): void {
    this.activeTab = tab;
    this.loadedTabs[tab] = true;
    this.mobileMenuOpen = false;
    if (tab !== 'presupuestos') {
      this.solicitudIdParaPresupuesto = null;
    }
    if (tab !== 'solicitudes') {
      this.solicitudIdParaChat = null;
      this.isChatActivo = false;
    }
  }

  irAPresupuestoConSolicitud(solicitudId: string): void {
    this.solicitudIdParaPresupuesto = null;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.solicitudIdParaPresupuesto = solicitudId;
      this.solicitudIdParaChat = solicitudId; // Guardar context para el retorno
      this.activeTab = 'presupuestos';
      this.loadedTabs['presupuestos'] = true;
      this.mobileMenuOpen = false;
      this.cdr.detectChanges();
    });
  }

  volverAlChat(): void {
    this.activeTab = 'solicitudes';
    this.loadedTabs['solicitudes'] = true;
    this.solicitudIdParaChat = this.solicitudIdParaPresupuesto;
  }

  selectedPaymentData: any = null;

  navegarAPagos(paymentData: any): void {
    this.selectedPaymentData = paymentData;
    this.activeTab = 'pagos';
    this.loadedTabs['pagos'] = true;
  }

  private readonly cdr = inject(ChangeDetectorRef);

  setChatActivo(active: boolean): void {
    this.isChatActivo = active;
    this.cdr.detectChanges();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  get activeLabel(): string {
    return this.navItems.find(item => item.id === this.activeTab)?.label ?? '';
  }
}

