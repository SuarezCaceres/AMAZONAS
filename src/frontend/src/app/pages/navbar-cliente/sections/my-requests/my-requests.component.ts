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

  // ── Filtros ──
  filtroEstado: 'todos' | 'PENDIENTE' | 'PROCESANDO' = 'todos';
  filtroTipo: 'todos' | 'comprar' | 'personalizar' = 'todos';
  ordenActivo: 'notificaciones' | 'reciente' = 'notificaciones';

  get activeRequests(): SavedRequest[] {
    return this.requests.filter(r => !r.status || r.status !== 'COMPLETADO');
  }

  /** Getter filtrado + ordenado que usa el HTML */
  get filteredActiveRequests(): SavedRequest[] {
    let result = this.activeRequests;

    // 1. Filtro por estado
    if (this.filtroEstado !== 'todos') {
      result = result.filter(r => {
        const estado = r.status || 'PENDIENTE';
        return estado === this.filtroEstado;
      });
    }

    // 2. Filtro por tipo de maqueta
    if (this.filtroTipo !== 'todos') {
      result = result.filter(r => r.mode === this.filtroTipo);
    }

    // 3. Ordenamiento
    result = [...result].sort((a, b) => {
      if (this.ordenActivo === 'notificaciones') {
        // Primero los que tienen mensajes no leídos (más no leídos primero)
        const unreadA = a.unreadCount || 0;
        const unreadB = b.unreadCount || 0;
        if (unreadA !== unreadB) return unreadB - unreadA;
      }
      // Luego por fecha más reciente
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.date).getTime();
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.date).getTime();
      return timeB - timeA;
    });

    return result;
  }

  get completedRequests(): SavedRequest[] {
    return this.requests.filter(r => r.status === 'COMPLETADO');
  }

  setFiltroEstado(valor: 'todos' | 'PENDIENTE' | 'PROCESANDO'): void {
    this.filtroEstado = valor;
  }

  setFiltroTipo(valor: 'todos' | 'comprar' | 'personalizar'): void {
    this.filtroTipo = valor;
  }

  setOrden(valor: 'notificaciones' | 'reciente'): void {
    this.ordenActivo = valor;
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
        motivoCancelacion: res.motivoCancelacion,
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

  confirmarCancelacion(requestId?: string): void {
    if (!requestId) return;

    const req = this.requests.find(r => r.backendId === requestId);
    const isRejected = req?.status === 'RECHAZADO';

    const message = isRejected
      ? '¿Estás seguro de que deseas eliminar esta solicitud de tu historial?'
      : '¿Estás seguro de que deseas cancelar y eliminar esta solicitud? Esta acción borrará permanentemente la conversación, presupuestos y todo el historial relacionado.';

    const confirm = window.confirm(message);

    if (confirm) {
      this.requestService.eliminar(requestId).subscribe({
        next: () => {
          this.loadRequests();
        },
        error: (err) => {
          console.error('Error al eliminar la solicitud', err);
          alert(isRejected ? 'Hubo un error al eliminar la solicitud.' : 'Hubo un error al cancelar la solicitud. Por favor, intente de nuevo.');
        }
      });
    }
  }
}
