import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, inject } from '@angular/core';
import { SavedRequest, SessionUser } from '../request-form/request-form.component';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-requests.component.html',
  styleUrl: './my-requests.component.css'
})
export class MyRequestsComponent implements OnChanges {
  @Input() user: SessionUser | null = null;
  @Output() viewChat = new EventEmitter<string>();

  private readonly requestService = inject(PurchaseRequestService);

  requests: SavedRequest[] = [];

  ngOnChanges(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    // 1. Mostrar cache inmediatamente para evitar lag visual
    const cached = this.requestService.misSolicitudes();
    if (cached && cached.length > 0) {
      this.requests = this.mapResponses(cached);
    }

    // 2. Cargar asincronicamente del servidor para refrescar
    this.requestService.listarMisSolicitudes().subscribe({
      next: (responses) => {
        this.requests = this.mapResponses(responses);
      },
      error: (err) => {
        console.error('Error loading requests from backend, falling back to local storage', err);
        const saved = localStorage.getItem('maquetasRequests');
        const allRequests: SavedRequest[] = saved ? JSON.parse(saved) : [];
        this.requests = this.user
          ? allRequests.filter((request) => request.email === this.user?.email)
          : allRequests;
      }
    });
  }

  private mapResponses(responses: any[]): SavedRequest[] {
    return responses.map((res): SavedRequest => ({
      id: 0,
      backendId: res.id,
      mode: res.isCustom ? 'personalizar' : 'comprar',
      modelTitle: res.productoNombre || 'Solicitud personalizada',
      fullName: res.clienteNombre,
      email: res.clienteEmail,
      phone: res.clienteTelefono || '',
      detail: res.isCustom ? res.descripcionPersonalizacion || '' : res.mensaje || '',
      explanation: res.solicitarExplicacion,
      date: res.createdAt,
      selectedMaterials: res.materialesCustomizados?.map((m: any) => m.materialName) || []
    }));
  }

  getTypeLabel(mode: SavedRequest['mode']): string {
    return mode === 'personalizar' ? 'Personalizacion' : 'Compra';
  }

  onViewChat(requestId?: string): void {
    if (requestId) {
      this.viewChat.emit(requestId);
    }
  }
}
