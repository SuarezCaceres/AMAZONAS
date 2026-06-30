import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, inject } from '@angular/core';
import { SavedRequest, SessionUser } from '../request-form/request-form.component';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { ChatService } from '../../../../services/chat.service';

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
  private readonly chatService = inject(ChatService);

  requests: SavedRequest[] = [];
  showCompletedHistory = false;

  get activeRequests(): SavedRequest[] {
    return this.requests.filter(r => !r.status || r.status !== 'COMPLETADO');
  }

  get completedRequests(): SavedRequest[] {
    return this.requests.filter(r => r.status === 'COMPLETADO');
  }

  toggleCompletedHistory(): void {
    this.showCompletedHistory = !this.showCompletedHistory;
  }

  ngOnChanges(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    // 1. Mostrar cache inmediatamente para evitar lag visual
    const cached = this.requestService.misSolicitudes();
    if (cached && cached.length > 0) {
      this.requests = this.mapResponses(cached, []);
    }

    // 2. Cargar asincronicamente del servidor para refrescar
    this.chatService.getMyRooms().subscribe({
      next: (rooms) => {
        this.requestService.listarMisSolicitudes().subscribe({
          next: (responses) => {
            this.requests = this.mapResponses(responses, rooms);
            this.sortRequests();
          },
          error: (err) => {
            console.error('Error loading requests from backend, falling back to local storage', err);
            const saved = localStorage.getItem('maquetasRequests');
            const allRequests: SavedRequest[] = saved ? JSON.parse(saved) : [];
            this.requests = this.user
              ? allRequests.filter((request) => request.email === this.user?.email)
              : allRequests;
            this.sortRequests();
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener salas, intentando cargar solicitudes directamente:', err);
        this.requestService.listarMisSolicitudes().subscribe({
          next: (responses) => {
            this.requests = this.mapResponses(responses, []);
            this.sortRequests();
          },
          error: (err) => {
            console.error('Error loading requests from backend', err);
          }
        });
      }
    });
  }

  private mapResponses(responses: any[], rooms: any[]): SavedRequest[] {
    return responses.map((res): SavedRequest => {
      const room = rooms ? rooms.find(r => r.requestId === res.id) : null;
      return {
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
        selectedMaterials: [
          ...(res.materialesCustomizados?.map((m: any) => m.materialName) || []),
          ...(res.materialesPersonales?.map((m: any) => m.materialName) || [])
        ],
        status: res.estado,
        unreadCount: room ? room.unreadCount || 0 : 0,
        lastMessageAt: room ? room.lastMessageAt : undefined
      };
    });
  }

  private sortRequests(): void {
    this.requests.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.date).getTime();
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.date).getTime();
      return timeB - timeA; // Más reciente primero
    });
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
