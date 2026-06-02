import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { VendedorTab } from '../../navbar-vendedor.component';
import { MaquetaService } from '../../../../services/maqueta.service';
import { MaterialService } from '../../../../services/material.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  tab: VendedorTab | null;
}

export interface StatCard {
  id: string;
  label: string;
  value: number;
  description: string;
  icon: string;
  iconColor: string;
  descColor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {

  @Output() tabSelected = new EventEmitter<VendedorTab>();
  @Output() goToSite = new EventEmitter<void>();

  private readonly maquetaService = inject(MaquetaService);
  private readonly materialService = inject(MaterialService);
  private readonly purchaseRequestService = inject(PurchaseRequestService);

  loading = true;
  error = false;

  statCards: StatCard[] = [
    {
      id: 'solicitudes',
      label: 'Solicitudes Pendientes',
      value: 0,
      description: 'Nuevas solicitudes de compra',
      icon: 'cart',
      iconColor: '#00a982',
      descColor: '#00a982',
    },
    {
      id: 'productos',
      label: 'Total Productos',
      value: 0,
      description: 'Maquetas en catálogo',
      icon: 'box',
      iconColor: '#3b82f6',
      descColor: '#3b82f6',
    },
    {
      id: 'stock',
      label: 'Stock Bajo',
      value: 0,
      description: 'Productos con menos de 5 unidades',
      icon: 'alert-circle',
      iconColor: '#f59e0b',
      descColor: '#f59e0b',
    },
    {
      id: 'materiales',
      label: 'Materiales Registrados',
      value: 0,
      description: 'Materiales para presupuestos',
      icon: 'package',
      iconColor: '#8b5cf6',
      descColor: '#8b5cf6',
    },
    {
      id: 'presupuestos',
      label: 'Presupuestos Guardados',
      value: 0,
      description: 'Cotizaciones creadas',
      icon: 'calculator',
      iconColor: '#3b82f6',
      descColor: '#3b82f6',
    },
    {
      id: 'ventas',
      label: 'Ventas Realizadas',
      value: 0,
      description: 'Solicitudes completadas',
      icon: 'trending-up',
      iconColor: '#f97316',
      descColor: '#f97316',
    },
  ];

  quickActions: QuickAction[] = [
    {
      id: 'ver-solicitudes',
      label: 'Ver Solicitudes',
      description: 'Gestionar pedidos de clientes',
      icon: 'cart',
      iconColor: '#00a982',
      tab: 'solicitudes',
    },
    {
      id: 'gestionar-stock',
      label: 'Gestionar Stock',
      description: 'Actualizar inventario',
      icon: 'box',
      iconColor: '#3b82f6',
      tab: 'gestion-stock',
    },
    {
      id: 'calcular-presupuesto',
      label: 'Calcular Presupuesto',
      description: 'Crear cotización nueva',
      icon: 'calculator',
      iconColor: '#3b82f6',
      tab: 'presupuestos',
    },
    {
      id: 'gestionar-materiales',
      label: 'Gestionar Materiales',
      description: 'Costos y stock de materiales',
      icon: 'package',
      iconColor: '#8b5cf6',
      tab: 'materiales',
    },
    {
      id: 'ver-analisis',
      label: 'Ver Análisis',
      description: 'Estadísticas de productos',
      icon: 'bar-chart',
      iconColor: '#3b82f6',
      tab: 'maquetas',
    },
    {
      id: 'ver-sitio-web',
      label: 'Ver Sitio Web',
      description: 'Vista de cliente',
      icon: 'globe',
      iconColor: '#f97316',
      tab: null,
    },
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = false;

    forkJoin({
      productsPage: this.maquetaService.getProducts(undefined, undefined, 0, 999).pipe(
        catchError(() => of({ content: [], totalElements: 0 }))
      ),
      materials: this.materialService.getAllMaterials().pipe(
        catchError(() => of([]))
      ),
      requests: this.purchaseRequestService.listarTodas().pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ productsPage, materials, requests }) => {
        const products = productsPage.content || [];
        
        // 1. Solicitudes Pendientes
        const pendientes = requests.filter(r => r.estado === 'PENDIENTE').length;
        
        // 2. Total Productos
        const totalProducts = productsPage.totalElements || products.length;
        
        // 3. Stock Bajo (< 5 unidades)
        const stockBajo = products.filter(p => p.stock < 5).length;
        
        // 4. Materiales Registrados
        const totalMaterials = materials.length;
        
        // 5. Presupuestos Guardados (Solicitudes que tienen presupuesto asociado)
        const presupuestos = requests.filter(r => r.tienePresupuesto).length;
        
        // 6. Ventas Realizadas (Solicitudes completadas)
        const completados = requests.filter(r => r.estado === 'COMPLETADO').length;

        // Actualizar los valores en statCards
        this.statCards = this.statCards.map(card => {
          let val = 0;
          switch (card.id) {
            case 'solicitudes': val = pendientes; break;
            case 'productos': val = totalProducts; break;
            case 'stock': val = stockBajo; break;
            case 'materiales': val = totalMaterials; break;
            case 'presupuestos': val = presupuestos; break;
            case 'ventas': val = completados; break;
          }
          return { ...card, value: val };
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  handleQuickAction(action: QuickAction): void {
    if (action.tab) {
      this.tabSelected.emit(action.tab);
    } else {
      this.goToSite.emit();
    }
  }
}
