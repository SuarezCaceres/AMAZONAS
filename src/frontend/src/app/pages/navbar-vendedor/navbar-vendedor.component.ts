import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { DashboardComponent } from './sections/dashboard/dashboard.component';
import { MaquetaComponent } from './sections/maqueta/maqueta.component';
import { GestionStockComponent } from './sections/gestion-stock/gestion-stock.component';
import { MaterialesComponent } from './sections/materiales/materiales.component';

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
  imports: [CommonModule, DashboardComponent, MaquetaComponent, GestionStockComponent, MaterialesComponent],
  templateUrl: './navbar-vendedor.component.html',
  styleUrl: './navbar-vendedor.component.css',
})

export class NavbarVendedorComponent {

  @Output() salir = new EventEmitter<void>();

  activeTab: VendedorTab = 'dashboard';
  mobileMenuOpen = false;

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
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  get activeLabel(): string {
    return this.navItems.find(item => item.id === this.activeTab)?.label ?? '';
  }
}
