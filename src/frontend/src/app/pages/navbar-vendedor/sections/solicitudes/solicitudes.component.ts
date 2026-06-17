import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { PurchaseRequestResponse, EstadoSolicitud } from '../../../../models/purchase-request.model';

interface Solicitud {
  id: string;
  productoNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  fecha: Date;
  estado: 'pendiente' | 'procesando' | 'completado';
  isCustom: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css'
})
export class SolicitudesComponent implements OnInit {
  
  @Output() crearPresupuestoEvent = new EventEmitter<string>();
  @Output() abrirChatEvent = new EventEmitter<string>();
  
  private readonly requestService = inject(PurchaseRequestService);
  
  searchTerm = '';
  activeFilter: 'todos' | 'pendientes' | 'procesando' | 'completados' = 'todos';
  isLoading = false;

  solicitudes: Solicitud[] = [];

  ngOnInit(): void {
    this.loadSolicitudes();
  }

  loadSolicitudes(): void {
    this.isLoading = true;
    this.requestService.listarTodas().subscribe({
      next: (responses) => {
        this.solicitudes = responses.map((res): Solicitud => ({
          id: res.id,
          productoNombre: res.productoNombre || 'Sin nombre',
          clienteNombre: res.clienteNombre,
          clienteEmail: res.clienteEmail,
          clienteTelefono: res.clienteTelefono || '',
          fecha: new Date(res.createdAt),
          estado: this.mapEstado(res.estado),
          isCustom: res.isCustom,
          expanded: false
        }));
        if (this.solicitudes.length > 0) {
          this.solicitudes[0].expanded = true;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading solicitudes:', err);
        this.isLoading = false;
      }
    });
  }

  private mapEstado(estado: EstadoSolicitud): 'pendiente' | 'procesando' | 'completado' {
    const map: Record<EstadoSolicitud, 'pendiente' | 'procesando' | 'completado'> = {
      'PENDIENTE': 'pendiente',
      'PROCESANDO': 'procesando',
      'COMPLETADO': 'completado'
    };
    return map[estado] || 'pendiente';
  }

  get totalSolicitudes(): number {
    return this.solicitudes.length;
  }

  get pendientes(): number {
    return this.solicitudes.filter(s => s.estado === 'pendiente').length;
  }

  get procesando(): number {
    return this.solicitudes.filter(s => s.estado === 'procesando').length;
  }

  get completados(): number {
    return this.solicitudes.filter(s => s.estado === 'completado').length;
  }

  get filteredSolicitudes(): Solicitud[] {
    let filtered = this.solicitudes;

    if (this.activeFilter !== 'todos') {
      const estadoMap: Record<string, string> = {
        'pendientes': 'pendiente',
        'procesando': 'procesando',
        'completados': 'completado'
      };
      filtered = filtered.filter(s => s.estado === estadoMap[this.activeFilter]);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.productoNombre.toLowerCase().includes(term) ||
        s.clienteNombre.toLowerCase().includes(term) ||
        s.clienteEmail.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  setFilter(filter: 'todos' | 'pendientes' | 'procesando' | 'completados'): void {
    this.activeFilter = filter;
  }

  toggleExpand(solicitud: Solicitud): void {
    solicitud.expanded = !solicitud.expanded;
  }

  expandAll(): void {
    this.filteredSolicitudes.forEach(s => s.expanded = true);
  }

  collapseAll(): void {
    this.filteredSolicitudes.forEach(s => s.expanded = false);
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'procesando': 'Procesando',
      'completado': 'Completado'
    };
    return labels[estado] || estado;
  }

  comunicarCliente(solicitud: Solicitud): void {
    this.abrirChatEvent.emit(solicitud.id);
  }

  crearPresupuesto(solicitud: Solicitud): void {
    this.crearPresupuestoEvent.emit(solicitud.id);
  }
}
