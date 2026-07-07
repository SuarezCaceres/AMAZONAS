import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, OnDestroy, Output, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { ChatService } from '../../../../services/chat.service';
import { EstadoSolicitud } from '../../../../models/purchase-request.model';
import { ChatRoomResponse, ChatMessageResponse, ChatSenderRole, ChatMessageType } from '../../../../models/chat.model';
import { Subscription, lastValueFrom } from 'rxjs';
import { FileService } from '../../../../services/file.service';
import { BudgetService } from '../../../../services/budget.service';
import { MaterialService } from '../../../../services/material.service';
import { PaymentModalComponent, PaymentConfirmPayload } from '../../../shared/components/payment-modal/payment-modal.component';

interface Solicitud {
  id: string;
  productoNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  detalle: string;
  fecha: Date;
  estado: 'pendiente' | 'procesando' | 'completado' | 'rechazado';
  isCustom: boolean;
  expanded: boolean;
  tienePresupuesto: boolean;
  numeroSolicitud: string;
  unreadCount?: number;
  lastMessageAt?: Date;
  descripcionPersonalizacion?: string;
  materialesDeseados?: string;
  solicitarExplicacion?: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
  materialesPreferidos?: any[];
  escala?: string;
  dimensiones?: string;
  mesaExpositora?: string;
  motivoCancelacion?: string;
}

type Vista = 'lista' | 'chat';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css'
})
export class SolicitudesComponent implements OnInit, OnDestroy {

  @Input() inicialSolicitudId: string | null = null;
  @Output() crearPresupuestoEvent = new EventEmitter<string>();
  @Output() chatIniciado = new EventEmitter<void>();
  @Output() navegarAPagosEvent = new EventEmitter<any>();
  @Output() chatActivoEvent = new EventEmitter<boolean>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private readonly requestService = inject(PurchaseRequestService);
  private readonly chatService = inject(ChatService);
  private readonly fileService = inject(FileService);
  private readonly budgetService = inject(BudgetService);
  private readonly materialService = inject(MaterialService);

  // ── Vista ──────────────────────────────────────────────────────────────────
  vista: Vista = 'lista';
  solicitudActiva: Solicitud | null = null;

  // ── Lista ─────────────────────────────────────────────────────────────────
  searchTerm = '';
  activeFilter: 'todos' | 'pendientes' | 'procesando' | 'completados' | 'rechazados' = 'todos';
  activeDateFilter: 'todos' | 'hoy' | 'ayer' | 'semana' | 'mes' = 'todos';
  mostrarModalCancelacion = false;
  motivoCancelacionText = '';
  filtroTipo: 'todos' | 'catalogo' | 'personalizada' = 'todos';
  ordenActivo: 'notificaciones' | 'reciente' = 'notificaciones';
  showCompletedHistory = false;
  isLoading = false;
  solicitudes: Solicitud[] = [];

  // ── Chat ──────────────────────────────────────────────────────────────────
  room: ChatRoomResponse | null = null;
  messages: ChatMessageResponse[] = [];
  newMessage = '';

  // ── Modal de Pago Reutilizable ──
  mostrarModalPago = false;
  montoCobro = 0;
  clienteCobro = '';
  proyectoCobro = '';
  materialesCobro = '';
  tipoCobro: 'adelanto' | 'saldo' | 'completo' = 'completo';
  prefilledVoucherUrl = '';
  selectedBudgetMetadata: any = null;
  activeBudget: any = null;
  loadingChat = false;
  wsConnected = false;
  currentUserEmail = sessionStorage.getItem('auth_email') || '';
  currentUserName = sessionStorage.getItem('auth_nombre') || '';

  // ── File Attachments State ──
  preloadedFiles: { file: File, previewUrl: string | null, isImage: boolean }[] = [];
  uploadingFile = false;
  readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/ogg',
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed'
  ]);

  private subs: Subscription[] = [];

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadSolicitudes();

    // Conectar WebSocket globalmente (singleton ChatService)
    this.chatService.connect();

    // Escuchar estado de conexión
    this.subs.push(
      this.chatService.connectionStatus$.subscribe(connected => {
        this.wsConnected = connected;
        if (connected && this.room) {
          this.chatService.subscribeToRoom(this.room.id);
        }
      })
    );

    // Escuchar mensajes entrantes con deduplicación y reemplazo de temporales
    this.subs.push(
      this.chatService.messages$.subscribe(msg => {
        // Actualizar lastMessageAt y unreadCount en caliente
        const solicitud = this.solicitudes.find(s => s.id === msg.roomId);
        if (solicitud) {
          solicitud.lastMessageAt = new Date(msg.sentAt);
          if (
            (this.vista !== 'chat' || !this.solicitudActiva || this.solicitudActiva.id !== solicitud.id) &&
            msg.senderRole === 'CLIENT'
          ) {
            solicitud.unreadCount = (solicitud.unreadCount || 0) + 1;
          }
        }

        if (this.room && msg.roomId === this.room.id) {
          let tempIndex = -1;
          if (msg.metadata) {
            try {
              const meta = JSON.parse(msg.metadata);
              if (meta.clientMsgId) {
                tempIndex = this.messages.findIndex(m => m.id === meta.clientMsgId);
              }
            } catch (e) {}
          }

          if (tempIndex === -1) {
            // Fallback match: same sender, same content, sent within 10 seconds of each other
            tempIndex = this.messages.findIndex(m =>
              (m.status === 'SENDING' || m.status === 'SENT') &&
              m.senderRole === msg.senderRole &&
              m.content === msg.content &&
              Math.abs(new Date(m.sentAt).getTime() - new Date(msg.sentAt).getTime()) < 10000
            );
          }

          if (tempIndex !== -1) {
            this.messages[tempIndex] = { ...msg, status: 'SENT' };
            this.scrollToBottom();
          } else {
            if (!this.messages.some(m => m.id === msg.id)) {
              this.messages.push(msg);
              this.scrollToBottom();
            }
          }

          if (msg.messageType === ChatMessageType.SYSTEM) {
            this.reloadRoomInfo();
          }
        }
      })
    );

    // Escuchar confirmación de entrega (STOMP Receipts)
    this.subs.push(
      this.chatService.receipts$.subscribe(receiptId => {
        const msg = this.messages.find(m => m.id === receiptId);
        if (msg && msg.status === 'SENDING') {
          msg.status = 'SENT';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.room) {
      this.chatService.unsubscribeFromRoom(this.room.id);
    }
    document.body.style.overflow = '';
    setTimeout(() => this.chatActivoEvent.emit(false));
  }

  // ── Carga de solicitudes ──────────────────────────────────────────────────

  loadSolicitudes(): void {
    this.isLoading = true;
    this.chatService.getMyRooms().subscribe({
      next: (rooms) => {
        this.requestService.listarTodas().subscribe({
          next: (responses) => {
            this.solicitudes = responses.map((res): Solicitud => {
              let hash = 0;
              const idStr = res.id || '';
              for (let i = 0; i < idStr.length; i++) {
                hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
              }
              const num = Math.abs(hash % 9000) + 1000;
              const numeroSolicitud = `#${num}`;

              const room = rooms ? rooms.find(r => r.requestId === res.id) : null;
              const unreadCount = room ? room.unreadCount || 0 : 0;
              const lastMessageAt = room && room.lastMessageAt ? new Date(room.lastMessageAt) : null;

              return {
                id: res.id,
                productoNombre: res.productoNombre || 'Sin nombre',
                clienteNombre: res.clienteNombre,
                clienteEmail: res.clienteEmail,
                clienteTelefono: res.clienteTelefono || '',
                detalle: res.mensaje || (res as any).detalle || (res as any).message || '',
                fecha: new Date(res.createdAt),
                estado: this.mapEstado(res.estado),
                isCustom: res.isCustom,
                expanded: false,
                tienePresupuesto: res.tienePresupuesto || false,
                numeroSolicitud,
                descripcionPersonalizacion: res.descripcionPersonalizacion,
                materialesDeseados: res.materialesDeseados,
                solicitarExplicacion: res.solicitarExplicacion,
                tipoEvento: res.tipoEvento,
                cantidadPersonas: res.cantidadPersonas,
                materialesPreferidos: res.materialesPreferidos || [],
                escala: (res as any).escala || undefined,
                dimensiones: (res as any).dimensiones || undefined,
                mesaExpositora: (res as any).mesaExpositora || undefined,
                unreadCount,
                lastMessageAt: lastMessageAt || undefined,
                motivoCancelacion: res.motivoCancelacion
              };
            });
            if (this.solicitudes.length > 0) {
              this.solicitudes[0].expanded = true;
            }
            this.isLoading = false;

            if (this.inicialSolicitudId) {
              const found = this.solicitudes.find(s => s.id === this.inicialSolicitudId);
              if (found) {
                this.abrirChat(found);
                this.chatIniciado.emit();
              }
            }
          },
          error: (err) => {
            console.error('Error loading solicitudes:', err);
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading chat rooms, loading requests directly:', err);
        this.requestService.listarTodas().subscribe({
          next: (responses) => {
            this.solicitudes = responses.map((res): Solicitud => {
              let hash = 0;
              const idStr = res.id || '';
              for (let i = 0; i < idStr.length; i++) {
                hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
              }
              const num = Math.abs(hash % 9000) + 1000;
              const numeroSolicitud = `#${num}`;

              return {
                id: res.id,
                productoNombre: res.productoNombre || 'Sin nombre',
                clienteNombre: res.clienteNombre,
                clienteEmail: res.clienteEmail,
                clienteTelefono: res.clienteTelefono || '',
                detalle: res.mensaje || (res as any).detalle || (res as any).message || '',
                fecha: new Date(res.createdAt),
                estado: this.mapEstado(res.estado),
                isCustom: res.isCustom,
                expanded: false,
                tienePresupuesto: res.tienePresupuesto || false,
                numeroSolicitud,
                descripcionPersonalizacion: res.descripcionPersonalizacion,
                materialesDeseados: res.materialesDeseados,
                solicitarExplicacion: res.solicitarExplicacion,
                tipoEvento: res.tipoEvento,
                cantidadPersonas: res.cantidadPersonas,
                materialesPreferidos: res.materialesPreferidos || [],
                escala: (res as any).escala || undefined,
                dimensiones: (res as any).dimensiones || undefined,
                mesaExpositora: (res as any).mesaExpositora || undefined,
                unreadCount: 0,
                motivoCancelacion: res.motivoCancelacion
              };
            });
            if (this.solicitudes.length > 0) {
              this.solicitudes[0].expanded = true;
            }
            this.isLoading = false;

            if (this.inicialSolicitudId) {
              const found = this.solicitudes.find(s => s.id === this.inicialSolicitudId);
              if (found) {
                this.abrirChat(found);
                this.chatIniciado.emit();
              }
            }
          },
          error: (err) => {
            console.error('Error loading solicitudes:', err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  private mapEstado(estado: EstadoSolicitud): 'pendiente' | 'procesando' | 'completado' | 'rechazado' {
    const map: Record<EstadoSolicitud, 'pendiente' | 'procesando' | 'completado' | 'rechazado'> = {
      'PENDIENTE': 'pendiente',
      'PROCESANDO': 'procesando',
      'COMPLETADO': 'completado',
      'RECHAZADO': 'rechazado'
    };
    return map[estado] || 'pendiente';
  }

  // ── Navegación entre vistas ───────────────────────────────────────────────

  abrirChat(solicitud: Solicitud): void {
    // Feedback visual inmediato (optimistic update)
    solicitud.unreadCount = 0;
    
    this.solicitudActiva = solicitud;
    this.loadingChat = true;
    this.messages = [];
    this.room = null;

    document.body.style.overflow = 'hidden';
    setTimeout(() => this.chatActivoEvent.emit(true));

    // Obtener (o crear) la sala de chat para esta solicitud
    this.chatService.getOrCreateRoom(solicitud.id).subscribe({
      next: (room) => {
        this.room = room;
        this.vista = 'chat';

        // Cargar presupuesto activo
        this.budgetService.obtenerPorSolicitud(solicitud.id).subscribe({
          next: (budget) => {
            this.activeBudget = budget;
          },
          error: (err) => {
            console.warn('Error loading budget for room:', err);
            this.activeBudget = null;
          }
        });

        // Marcar como leído
        this.chatService.markAsRead(room.id).subscribe({
          next: () => {
            solicitud.unreadCount = 0;
          },
          error: (err) => console.error('Error al marcar chat como leído:', err)
        });

        // Cargar historial de mensajes
        this.chatService.getMessages(room.id).subscribe({
          next: (msgs) => {
            this.messages = msgs;
            this.loadingChat = false;
            this.scrollToBottom();
          },
          error: () => { this.loadingChat = false; }
        });

        // Suscribirse al topic WebSocket de la sala
        if (this.wsConnected) {
          this.chatService.subscribeToRoom(room.id);
        }
      },
      error: (err) => {
        console.error('Error obteniendo sala de chat:', err);
        this.loadingChat = false;
        document.body.style.overflow = '';
        setTimeout(() => this.chatActivoEvent.emit(false));
      }
    });
  }

  volverALista(): void {
    if (this.room) {
      this.chatService.unsubscribeFromRoom(this.room.id);
    }
    this.vista = 'lista';
    this.solicitudActiva = null;
    this.room = null;
    this.messages = [];
    this.newMessage = '';
    this.activeBudget = null;

    document.body.style.overflow = '';
    setTimeout(() => this.chatActivoEvent.emit(false));
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.scrollContainer && this.scrollContainer.nativeElement) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch (e) {}
    }, 50);
  }

  // ── Acciones del chat ─────────────────────────────────────────────────────

  enviarMensaje(): void {
    const text = this.newMessage.trim();
    if (!text || !this.room) return;

    // Actualizar lastMessageAt de la solicitud activa localmente
    const activeReq = this.solicitudes.find(s => s.id === this.room!.id);
    if (activeReq) {
      activeReq.lastMessageAt = new Date();
    }

    const clientMsgId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add local temporary message
    const tempMsg: ChatMessageResponse = {
      id: clientMsgId,
      roomId: this.room.id,
      senderId: this.currentUserEmail,
      senderName: this.currentUserName || 'Vendedor',
      senderRole: ChatSenderRole.VENDOR,
      messageType: ChatMessageType.TEXT,
      content: text,
      metadata: JSON.stringify({ clientMsgId }),
      isRead: false,
      sentAt: new Date().toISOString(),
      status: 'SENDING'
    };
    this.messages.push(tempMsg);
    this.newMessage = '';
    this.scrollToBottom();

    // Setup timeout for failure
    setTimeout(() => {
      const found = this.messages.find(m => m.id === clientMsgId);
      if (found && found.status === 'SENDING') {
        found.status = 'FAILED';
      }
    }, 8000);

    this.chatService.sendMessage(
      this.room.id,
      text,
      'TEXT',
      JSON.stringify({ clientMsgId }),
      clientMsgId
    );
  }

  retryMessage(msg: ChatMessageResponse): void {
    if (!this.room) return;

    msg.status = 'SENDING';
    msg.sentAt = new Date().toISOString();

    setTimeout(() => {
      if (msg.status === 'SENDING') {
        msg.status = 'FAILED';
      }
    }, 8000);

    const clientMsgId = msg.id;
    let metadata = msg.metadata;

    try {
      const metaObj = metadata ? JSON.parse(metadata) : {};
      metaObj.clientMsgId = clientMsgId;
      metadata = JSON.stringify(metaObj);
      msg.metadata = metadata;
    } catch (e) {}

    this.chatService.sendMessage(
      this.room.id,
      msg.content,
      msg.messageType,
      metadata,
      clientMsgId
    );
  }

  irAPresupuesto(): void {
    if (this.solicitudActiva) {
      this.crearPresupuestoEvent.emit(this.solicitudActiva.id);
    }
  }

  solicitarAdelantoRapido(): void {
    if (this.solicitudActiva && this.room) {
      const total = this.room.agreedPrice || 375.70;
      const half = total / 2;
      const paymentData = {
        client: this.room.clientName,
        email: this.room.clientEmail,
        phone: this.solicitudActiva.clienteTelefono || '987654321',
        productType: this.solicitudActiva.isCustom ? 'Proyecto Personalizado (Maqueta a Medida)' : 'Proyecto Predeterminado (Catalogo)',
        materials: this.solicitudActiva.materialesDeseados || 'Madera Balsa, PLA, Acrilico',
        amount: half,
        method: 'Online (Yape / Transferencia)',
        kind: 'Adelanto (50%)',
        date: new Date().toISOString().substring(0, 16),
        operation: `SOL-RAP-${Date.now()}`,
        inventory: true,
        roomId: this.room.id,
        solicitudId: this.room.requestId,
        voucherUrl: ''
      };
      this.navegarAPagosEvent.emit(paymentData);
    } else if (this.solicitudActiva) {
      const paymentData = {
        client: this.solicitudActiva.clienteNombre,
        email: '',
        phone: this.solicitudActiva.clienteTelefono || '987654321',
        productType: this.solicitudActiva.isCustom ? 'Proyecto Personalizado (Maqueta a Medida)' : 'Proyecto Predeterminado (Catalogo)',
        materials: this.solicitudActiva.materialesDeseados || 'Madera Balsa, PLA, Acrilico',
        amount: null,
        method: '',
        kind: '',
        date: new Date().toISOString().substring(0, 16),
        operation: `SOL-RAP-${Date.now()}`,
        inventory: true,
        solicitudId: this.solicitudActiva.id,
        voucherUrl: ''
      };
      this.navegarAPagosEvent.emit(paymentData);
    }
  }

  isVendorMessage(msg: ChatMessageResponse): boolean {
    return msg.senderRole === ChatSenderRole.VENDOR;
  }

  parseMetadata(metaStr: string): any {
    try {
      return JSON.parse(metaStr);
    } catch {
      return {};
    }
  }

  // ── Helpers de lista ─────────────────────────────────────────────────────

  get totalSolicitudes(): number { return this.solicitudes.length; }
  get pendientes(): number { return this.solicitudes.filter(s => s.estado === 'pendiente').length; }
  get procesando(): number { return this.solicitudes.filter(s => s.estado === 'procesando').length; }
  get completados(): number { return this.solicitudes.filter(s => s.estado === 'completado').length; }
  get rechazados(): number { return this.solicitudes.filter(s => s.estado === 'rechazado').length; }

  setDateFilter(filter: 'todos' | 'hoy' | 'ayer' | 'semana' | 'mes'): void {
    this.activeDateFilter = filter;
  }

  get activeSolicitudes(): Solicitud[] {
    return this.filteredSolicitudes.filter(s => s.estado !== 'completado' && s.estado !== 'rechazado');
  }

  get completedSolicitudes(): Solicitud[] {
    return this.filteredSolicitudes.filter(s => s.estado === 'completado');
  }

  get rejectedSolicitudes(): Solicitud[] {
    return this.filteredSolicitudes.filter(s => s.estado === 'rechazado');
  }

  get filteredSolicitudes(): Solicitud[] {
    let filtered = this.solicitudes;
    
    // 1. Filtrado por estado
    if (this.activeFilter !== 'todos') {
      const estadoMap: Record<string, string> = {
        'pendientes': 'pendiente', 'procesando': 'procesando', 'completados': 'completado', 'rechazados': 'rechazado'
      };
      filtered = filtered.filter(s => s.estado === estadoMap[this.activeFilter]);
    }
    
    // 2. Filtrado por fecha
    if (this.activeDateFilter !== 'todos') {
      const ahora = new Date();
      filtered = filtered.filter(s => {
        const fechaActividad = s.lastMessageAt ? new Date(s.lastMessageAt) : new Date(s.fecha);
        
        if (this.activeDateFilter === 'hoy') {
          return fechaActividad.getDate() === ahora.getDate() &&
                 fechaActividad.getMonth() === ahora.getMonth() &&
                 fechaActividad.getFullYear() === ahora.getFullYear();
        }
        if (this.activeDateFilter === 'ayer') {
          const ayer = new Date();
          ayer.setDate(ahora.getDate() - 1);
          return fechaActividad.getDate() === ayer.getDate() &&
                 fechaActividad.getMonth() === ayer.getMonth() &&
                 fechaActividad.getFullYear() === ayer.getFullYear();
        }
        if (this.activeDateFilter === 'semana') {
          const diffTime = ahora.getTime() - fechaActividad.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        }
        if (this.activeDateFilter === 'mes') {
          return fechaActividad.getMonth() === ahora.getMonth() &&
                 fechaActividad.getFullYear() === ahora.getFullYear();
        }
        return true;
      });
    }

    // 3. Filtrado por término de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.productoNombre.toLowerCase().includes(term) ||
        s.clienteNombre.toLowerCase().includes(term) ||
        s.clienteEmail.toLowerCase().includes(term)
      );
    }

    // 4. Filtrado por tipo de maqueta
    if (this.filtroTipo !== 'todos') {
      filtered = filtered.filter(s =>
        this.filtroTipo === 'personalizada' ? s.isCustom : !s.isCustom
      );
    }

    // 5. Ordenamiento
    return filtered.sort((a, b) => {
      if (this.ordenActivo === 'notificaciones') {
        const unreadA = a.unreadCount || 0;
        const unreadB = b.unreadCount || 0;
        if (unreadA !== unreadB) return unreadB - unreadA;
      }
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.fecha).getTime();
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.fecha).getTime();
      return timeB - timeA;
    });
  }

  setFilter(filter: 'todos' | 'pendientes' | 'procesando' | 'completados' | 'rechazados'): void {
    this.activeFilter = filter;
  }

  setFiltroTipo(valor: 'todos' | 'catalogo' | 'personalizada'): void {
    this.filtroTipo = valor;
  }

  setOrden(valor: 'notificaciones' | 'reciente'): void {
    this.ordenActivo = valor;
  }

  toggleExpand(solicitud: Solicitud): void { solicitud.expanded = !solicitud.expanded; }
  expandAll(): void { this.filteredSolicitudes.forEach(s => s.expanded = true); }
  collapseAll(): void { this.filteredSolicitudes.forEach(s => s.expanded = false); }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente', 'procesando': 'Procesando', 'completado': 'Completado', 'rechazado': 'Rechazado'
    };
    return labels[estado] || estado;
  }

  formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  hasOfferOrBudget(): boolean {
    return this.messages.some(m => m.messageType === 'OFFER' || m.messageType === 'BUDGET');
  }

  // ── Métodos de archivos adjuntos (Vendedor) ──
  addPreloadedFile(file: File): void {
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.preloadedFiles.push({
          file: file,
          previewUrl: e.target?.result as string,
          isImage: true
        });
      };
      reader.readAsDataURL(file);
    } else {
      this.preloadedFiles.push({
        file: file,
        previewUrl: null,
        isImage: false
      });
    }
  }

  onFileSelected(event: any): void {
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      // Validar tipo MIME
      if (!this.ALLOWED_MIME_TYPES.has(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.type || 'desconocido'}.\nSe aceptan: imágenes (JPG, PNG, GIF, WEBP, SVG), PDF, Word, PowerPoint, vídeos, ZIP/RAR y texto plano.`);
        continue;
      }

      // Límite de 5MB en el cliente
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert(`El archivo "${file.name}" supera el límite de 5MB permitido.`);
        continue;
      }

      this.addPreloadedFile(file);
    }
    event.target.value = ''; // Reset input
  }

  removePreloadedFile(index: number): void {
    this.preloadedFiles.splice(index, 1);
  }

  clearPreloadedFiles(): void {
    this.preloadedFiles = [];
  }

  async enviarArchivosVendedor(): Promise<void> {
    if (!this.room || this.preloadedFiles.length === 0) return;

    this.uploadingFile = true;
    const uploadedUrls: string[] = [];

    try {
      // 1. Subir secuencialmente a Cloudinary
      for (const item of this.preloadedFiles) {
        const response = await lastValueFrom(this.fileService.uploadImage(item.file));
        uploadedUrls.push(response.url);
      }

      // 2. Obtener el PurchaseRequest actual del backend
      const currentReq = await lastValueFrom(this.requestService.obtenerPorId(this.room.requestId));
      
      const grabacionesUrls = currentReq.grabacionesUrls ? [...currentReq.grabacionesUrls] : [];
      const archivosUrls = currentReq.archivosUrls ? [...currentReq.archivosUrls] : [];

      // Categorizar nuevos archivos por tipo
      this.preloadedFiles.forEach((item, index) => {
        const url = uploadedUrls[index];
        const type = item.file.type.toLowerCase();
        if (type.startsWith('audio/') || type.startsWith('video/')) {
          grabacionesUrls.push(url);
        } else {
          archivosUrls.push(url);
        }
      });

      // 3. Actualizar la base de datos
      await lastValueFrom(
        this.requestService.actualizarArchivos(this.room.requestId, {
          grabacionesUrls,
          archivosUrls
        })
      );

      // 4. Enviar un mensaje WebSocket de tipo FILE para cada archivo
      this.preloadedFiles.forEach((item, index) => {
        const url = uploadedUrls[index];
        const clientMsgId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const metadata = JSON.stringify({
          fileUrl: url,
          fileName: item.file.name,
          fileType: item.file.type,
          clientMsgId: clientMsgId
        });

        this.chatService.sendMessage(
          this.room!.id,
          `Archivo adjunto: ${item.file.name}`,
          'FILE',
          metadata,
          clientMsgId
        );
      });

      // 5. Limpiar y apagar loading
      this.clearPreloadedFiles();
      this.uploadingFile = false;
      alert('¡Archivo(s) enviado(s) exitosamente!');
    } catch (error) {
      console.error('Error al subir/enviar archivo', error);
      alert('Hubo un error al enviar el archivo. Por favor, inténtalo de nuevo.');
      this.uploadingFile = false;
    }
  }

  reloadRoomInfo(): void {
    if (this.room) {
      this.chatService.getOrCreateRoom(this.room.requestId).subscribe({
        next: (updatedRoom) => {
          this.room = updatedRoom;
        },
        error: (err) => console.error('Error reloading room details for seller', err)
      });

      this.budgetService.obtenerPorSolicitud(this.room.requestId).subscribe({
        next: (budget) => {
          this.activeBudget = budget;
        },
        error: (err) => console.warn('Error reloading budget details', err)
      });

      if (this.solicitudActiva) {
        this.requestService.obtenerPorId(this.room.requestId).subscribe({
          next: (res) => {
            if (this.solicitudActiva) {
              this.solicitudActiva.estado = this.mapEstado(res.estado);
              const idx = this.solicitudes.findIndex(s => s.id === res.id);
              if (idx !== -1) {
                this.solicitudes[idx].estado = this.mapEstado(res.estado);
              }
            }
          },
          error: (err) => console.error('Error reloading request details for seller', err)
        });
      }
    }
  }

  activeVoucherUrl: string | null = null;
  activeVoucherName: string = '';
  currentVoucherMessage: ChatMessageResponse | null = null;

  openVoucherZoom(url: string, name: string, msg: ChatMessageResponse): void {
    this.activeVoucherUrl = url;
    this.activeVoucherName = name;
    this.currentVoucherMessage = msg;
  }

  closeVoucherZoom(): void {
    this.activeVoucherUrl = null;
    this.activeVoucherName = '';
    this.currentVoucherMessage = null;
  }

  confirmarAdelantoDesdeChat(msg: ChatMessageResponse): void {
    if (!this.room) return;

    this.tipoCobro = 'adelanto';
    this.currentVoucherMessage = msg;
    
    let fileUrl = '';
    try {
      if (msg.metadata) {
        const fileData = JSON.parse(msg.metadata);
        fileUrl = fileData.fileUrl || '';
      }
    } catch (e) {
      console.warn('Error parsing message metadata for voucher prefill:', e);
    }
    this.prefilledVoucherUrl = fileUrl;

    this.clienteCobro = this.room.clientName;
    this.proyectoCobro = this.solicitudActiva?.productoNombre || 'Proyecto Maqueta';
    this.materialesCobro = this.solicitudActiva?.materialesDeseados || '';

    const requestId = this.solicitudActiva?.id;
    if (requestId) {
      this.budgetService.obtenerPorSolicitud(requestId).subscribe({
        next: (budget) => {
          let monto = (this.room!.agreedPrice || 375.70) / 2;
          if (budget) {
            monto = Number(budget.adelantoMonto);
            this.selectedBudgetMetadata = {
              budgetId: budget.codigoReferencia,
              porcentajeAdelanto: budget.adelantoPorcentaje || 50
            };
          }
          this.montoCobro = monto;
          this.mostrarModalPago = true;
        },
        error: (err) => {
          console.error("Error al buscar presupuesto, usando fallback:", err);
          const total = this.room!.agreedPrice || 375.70;
          this.montoCobro = total / 2;
          this.mostrarModalPago = true;
        }
      });
    } else {
      const total = this.room.agreedPrice || 375.70;
      this.montoCobro = total / 2;
      this.mostrarModalPago = true;
    }
  }

  confirmarPagoDesdeChat(msg: ChatMessageResponse): void {
    if (!this.room) return;

    this.currentVoucherMessage = msg;
    
    let fileUrl = '';
    try {
      if (msg.metadata) {
        const fileData = JSON.parse(msg.metadata);
        fileUrl = fileData.fileUrl || '';
      }
    } catch (e) {
      console.warn('Error parsing message metadata for voucher prefill:', e);
    }
    this.prefilledVoucherUrl = fileUrl;

    this.clienteCobro = this.room.clientName;
    this.proyectoCobro = this.solicitudActiva?.productoNombre || 'Proyecto Maqueta';
    this.materialesCobro = this.solicitudActiva?.materialesDeseados || '';

    const hasAdelanto = this.messages.some(m => 
      m.senderRole === 'SYSTEM' && 
      m.content.includes('pago de adelanto')
    );
    this.tipoCobro = hasAdelanto ? 'saldo' : 'completo';

    const requestId = this.solicitudActiva?.id;
    if (requestId) {
      this.budgetService.obtenerPorSolicitud(requestId).subscribe({
        next: (budget) => {
          let total = this.room!.agreedPrice || 375.70;
          let monto = hasAdelanto ? (total / 2) : total;

          if (budget) {
            total = Number(budget.total);
            monto = hasAdelanto ? (Number(budget.total) - Number(budget.adelantoMonto)) : total;
            this.selectedBudgetMetadata = {
              budgetId: budget.codigoReferencia,
              porcentajeAdelanto: budget.adelantoPorcentaje || 50
            };
          }
          this.montoCobro = monto;
          this.mostrarModalPago = true;
        },
        error: (err) => {
          console.error("Error al buscar presupuesto para pago final, usando fallback:", err);
          const total = this.room!.agreedPrice || 375.70;
          const monto = hasAdelanto ? (total / 2) : total;
          this.montoCobro = monto;
          this.mostrarModalPago = true;
        }
      });
    } else {
      const total = this.room.agreedPrice || 375.70;
      const monto = hasAdelanto ? (total / 2) : total;
      this.montoCobro = monto;
      this.mostrarModalPago = true;
    }
  }

  onConfirmarPagoDesdeChat(payload: PaymentConfirmPayload): void {
    this.mostrarModalPago = false;

    const registrarPagoConUrl = (voucherUrl: string | null) => {
      const abonoTipo = this.tipoCobro === 'adelanto' 
        ? 'ADELANTO' 
        : this.tipoCobro === 'saldo' 
          ? 'SALDO' 
          : 'TOTAL';

      const materialsStr = this.solicitudActiva?.materialesDeseados || 'Madera Balsa, PLA, Acrilico';

      const paymentPayload = {
        clientName: this.room!.clientName,
        clientEmail: this.room!.clientEmail,
        clientPhone: this.solicitudActiva?.clienteTelefono || '987654321',
        roomId: this.room!.id,
        monto: payload.monto,
        metodoPago: payload.metodoPago,
        tipoAbono: abonoTipo,
        tipoMaqueta: this.solicitudActiva?.isCustom ? 'PERSONALIZADA' : 'PREDETERMINADA',
        materiales: materialsStr,
        fechaTransaccion: new Date().toISOString(),
        codigoOperacion: payload.codigoOperacion,
        montoRecibido: payload.montoRecibido,
        vuelto: payload.vuelto,
        codigoSeguridad: payload.codigoSeguridad,
        voucherUrl: voucherUrl
      };

      this.chatService.registerPayment(paymentPayload).subscribe({
        next: (res) => {
          const sysMessage = this.tipoCobro === 'adelanto'
            ? `El vendedor ha verificado y confirmado el pago de adelanto de S/ ${payload.monto.toFixed(2)} vía ${payload.metodoTexto}.`
            : `El vendedor ha verificado y confirmado el pago de liquidación final (${abonoTipo.toLowerCase()}) de S/ ${payload.monto.toFixed(2)} vía ${payload.metodoTexto}.`;

          this.chatService.sendMessage(this.room!.id, sysMessage, 'SYSTEM');

          const budgetId = this.selectedBudgetMetadata?.budgetId;
          if (budgetId) {
            if (this.tipoCobro === 'adelanto') {
              localStorage.setItem('adelanto_pagado_' + budgetId, 'true');
            } else {
              localStorage.setItem('pago_confirmado_' + budgetId, 'true');
            }
          }

          if (this.tipoCobro === 'adelanto') {
            if (this.solicitudActiva?.id) {
              const nuevoEstado = 'PROCESANDO';
              this.requestService.actualizarEstado(this.solicitudActiva.id, { estado: nuevoEstado }).subscribe({
                next: () => {
                  if (this.solicitudActiva) {
                    this.solicitudActiva.estado = this.mapEstado(nuevoEstado as EstadoSolicitud);
                  }
                  this.chatService.sendMessage(this.room!.id, "La maqueta se encuentra en proceso de elaboración.", 'SYSTEM');
                  this.reloadRoomInfo();
                  this.closeVoucherZoom();
                  alert(`¡Pago de adelanto verificado y registrado exitosamente!\nMonto: S/ ${payload.monto.toFixed(2)}`);
                },
                error: (err) => {
                  console.error('Error al actualizar estado a PROCESANDO:', err);
                  this.reloadRoomInfo();
                  this.closeVoucherZoom();
                }
              });
            } else {
              this.reloadRoomInfo();
              this.closeVoucherZoom();
              alert(`¡Pago de adelanto verificado y registrado exitosamente!\nMonto: S/ ${payload.monto.toFixed(2)}`);
            }
          } else {
            if (this.solicitudActiva?.id) {
              const nuevoEstado = 'COMPLETADO';
              this.requestService.actualizarEstado(this.solicitudActiva.id, { estado: nuevoEstado }).subscribe({
                next: () => {
                  this.descontarMaterialesDeInventario(this.solicitudActiva!.id);
                  if (this.solicitudActiva) {
                    this.solicitudActiva.estado = this.mapEstado(nuevoEstado as EstadoSolicitud);
                  }
                  this.reloadRoomInfo();
                  this.closeVoucherZoom();
                  alert(`¡Pago final verificado y registrado exitosamente!\nMonto: S/ ${payload.monto.toFixed(2)}`);
                },
                error: (err) => {
                  console.error('Error al actualizar estado a COMPLETADO:', err);
                  this.reloadRoomInfo();
                  this.closeVoucherZoom();
                }
              });
            } else {
              this.reloadRoomInfo();
              this.closeVoucherZoom();
              alert(`¡Pago final verificado y registrado exitosamente!\nMonto: S/ ${payload.monto.toFixed(2)}`);
            }
          }
        },
        error: (err) => {
          console.error("Error al guardar pago en el servidor:", err);
          alert('Hubo un error al registrar el pago. Por favor, asegúrate de que el cliente esté registrado en la base de datos.');
        }
      });
    };

    if (payload.voucherFile) {
      this.fileService.uploadImage(payload.voucherFile).subscribe({
        next: (res) => registrarPagoConUrl(res?.url || null),
        error: (err) => {
          console.warn('Error al subir comprobante a Cloudinary:', err);
          registrarPagoConUrl(null);
        }
      });
    } else {
      registrarPagoConUrl(payload.prefilledVoucherUrl || null);
    }
  }

  marcarComoCompletado(): void {
    if (!this.solicitudActiva || !this.room) return;

    const confirmed = confirm("¿Estás seguro de marcar esta solicitud como COMPLETADA?\nEsto indicará que el producto ha sido fabricado y entregado.");
    if (!confirmed) return;

    this.requestService.actualizarEstado(this.solicitudActiva.id, { estado: 'COMPLETADO' }).subscribe({
      next: () => {
        // Descontar stock de materiales
        this.descontarMaterialesDeInventario(this.solicitudActiva!.id);

        // Enviar mensaje del sistema al chat
        const sysMessage = "El vendedor ha marcado la solicitud como COMPLETADA y el producto ha sido entregado.";
        this.chatService.sendMessage(this.room!.id, sysMessage, 'SYSTEM');

        // Recargar sala de chat e información
        this.reloadRoomInfo();
        alert("¡Solicitud completada con éxito!");
      },
      error: (err) => {
        console.error("Error al marcar como completado:", err);
        alert("Hubo un error al actualizar el estado de la solicitud.");
      }
    });
  }

  isAdelantoPagado(budgetId: string): boolean {
    if (!budgetId) return false;
    return localStorage.getItem('adelanto_pagado_' + budgetId) === 'true';
  }

  isPagoConfirmado(budgetId: string): boolean {
    if (!budgetId) return false;
    return localStorage.getItem('pago_confirmado_' + budgetId) === 'true';
  }

  isMensajeDescartado(msgId: string): boolean {
    if (!msgId) return false;
    return localStorage.getItem('descartado_msg_' + msgId) === 'true';
  }

  descartarComprobante(msgId: string): void {
    if (!msgId || !this.room) return;
    const confirmacion = confirm("¿Estás seguro de que deseas descartar/rechazar este archivo o comprobante?\nEsto ocultará el archivo de tu chat y enviará una notificación del sistema.");
    if (!confirmacion) return;

    localStorage.setItem('descartado_msg_' + msgId, 'true');
    this.chatService.sendMessage(this.room.id, "El vendedor ha descartado/rechazado un archivo o comprobante enviado por el cliente.", 'SYSTEM');
    
    this.closeVoucherZoom();
    this.reloadRoomInfo();
  }

  irAPagosConVoucher(msg: ChatMessageResponse): void {
    if (!this.room) return;
    let parsedMeta: any = {};
    try {
      parsedMeta = JSON.parse(msg.metadata);
    } catch (e) {
      console.error('Error parsing voucher metadata', e);
    }

    const total = this.room.agreedPrice || 375.70;

    // Buscar si ya se pagó un adelanto para precargar como SALDO o ADELANTO
    const hasAdelanto = this.messages.some(m => 
      m.senderRole === 'SYSTEM' && 
      m.content.includes('pago de adelanto')
    );

    const kindLabel = hasAdelanto ? 'Saldo restante' : 'Adelanto (50%)';

    const requestId = this.solicitudActiva?.id;
    if (requestId) {
      this.budgetService.obtenerPorSolicitud(requestId).subscribe({
        next: (budget) => {
          let preloadedAmount = hasAdelanto ? (total / 2) : (total / 2);
          if (budget) {
            preloadedAmount = hasAdelanto ? (Number(budget.total) - Number(budget.adelantoMonto)) : Number(budget.adelantoMonto);
          }
          this.navegarAPagosConDatos(preloadedAmount, kindLabel, msg, parsedMeta);
        },
        error: (err) => {
          console.error("Error al obtener presupuesto para precarga, usando fallback:", err);
          this.navegarAPagosConDatos(total / 2, kindLabel, msg, parsedMeta);
        }
      });
    } else {
      this.navegarAPagosConDatos(total / 2, kindLabel, msg, parsedMeta);
    }
  }

  private navegarAPagosConDatos(amount: number, kindLabel: string, msg: ChatMessageResponse, parsedMeta: any): void {
    const paymentData = {
      client: this.room!.clientName,
      email: this.room!.clientEmail,
      phone: this.solicitudActiva?.clienteTelefono || '987654321',
      productType: this.solicitudActiva?.isCustom ? 'Proyecto Personalizado (Maqueta a Medida)' : 'Proyecto Predeterminado (Catalogo)',
      materials: this.solicitudActiva?.materialesDeseados || 'Madera Balsa, PLA, Acrilico',
      amount: amount,
      method: 'Online (Yape / Transferencia)',
      kind: kindLabel,
      date: new Date().toISOString().substring(0, 16), // Format: yyyy-MM-ddTHH:mm
      operation: '', // Dejar en blanco para que el vendedor ingrese el código real en el formulario
      inventory: true,
      roomId: this.room!.id,
      solicitudId: this.room!.requestId,
      messageId: msg.id,
      voucherUrl: parsedMeta.fileUrl || ''
    };

    this.navegarAPagosEvent.emit(paymentData);
  }

  isImageFile(fileType?: string): boolean {
    if (!fileType) return false;
    return fileType.toLowerCase().startsWith('image/');
  }

  getFileIcon(fileType?: string): string {
    if (!fileType) return 'insert_drive_file';
    const type = fileType.toLowerCase();
    if (type === 'application/pdf') {
      return 'picture_as_pdf';
    }
    if (
      type === 'application/msword' ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'description';
    }
    return 'insert_drive_file';
  }

  getFileIconColorClass(fileType?: string): string {
    if (!fileType) return 'text-slate-400';
    const type = fileType.toLowerCase();
    if (type === 'application/pdf') {
      return 'text-red-500';
    }
    if (
      type === 'application/msword' ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'text-blue-500';
    }
    return 'text-slate-400';
  }

  confirmarCancelar(): void {
    this.abrirModalCancelacion();
  }

  abrirModalCancelacion(): void {
    if (!this.solicitudActiva) return;
    this.motivoCancelacionText = '';
    this.mostrarModalCancelacion = true;
  }

  cerrarModalCancelacion(): void {
    this.mostrarModalCancelacion = false;
  }

  confirmarRechazo(): void {
    if (!this.solicitudActiva) return;

    this.requestService.rechazar(this.solicitudActiva.id, this.motivoCancelacionText).subscribe({
      next: () => {
        // Enviar mensaje del sistema al chat
        const sysMessage = this.motivoCancelacionText.trim()
          ? `La solicitud ha sido rechazada por el vendedor. Motivo: ${this.motivoCancelacionText}`
          : "La solicitud ha sido rechazada por el vendedor.";
        
        if (this.room) {
          this.chatService.sendMessage(this.room.id, sysMessage, 'SYSTEM');
        }

        alert("La solicitud ha sido rechazada/cancelada exitosamente.");
        this.cerrarModalCancelacion();
        this.volverALista();
        this.loadSolicitudes();
      },
      error: (err) => {
        console.error('Error al rechazar la solicitud:', err);
        alert('Hubo un error al rechazar la solicitud. Por favor, intente de nuevo.');
      }
    });
  }

  private descontarMaterialesDeInventario(requestId: string): void {
    this.budgetService.obtenerPorSolicitud(requestId).subscribe({
      next: (budget) => {
        if (!budget || !budget.items || budget.items.length === 0) {
          console.log('No hay presupuesto o ítems asociados a la solicitud para descontar stock.');
          return;
        }

        this.materialService.getAllMaterials().subscribe({
          next: (materialsFromBackend) => {
            budget.items.forEach((item: any) => {
              const match = materialsFromBackend.find(m => m.id === item.materialId || m.nombre === item.nombre);
              if (match) {
                const cantidadADescontar = item.cantidad || 0;
                const nuevoStock = Math.max(0, match.stockActual - cantidadADescontar);
                const requestPayload = {
                  nombre: match.nombre,
                  unidad: match.unidad,
                  costoCompra: match.costoCompra,
                  costoVenta: match.costoVenta,
                  stockActual: nuevoStock,
                  categoriaId: match.categoriaId,
                  proveedor: match.proveedor,
                  activo: match.activo
                };
                this.materialService.updateMaterial(match.id, requestPayload).subscribe({
                  next: () => {
                    console.log(`Stock actualizado para ${match.nombre}: ${match.stockActual} -> ${nuevoStock}`);
                  },
                  error: (err) => console.error(`Error actualizando stock de ${match.nombre}:`, err)
                });
              }
            });
          },
          error: (err) => console.error('Error cargando materiales del inventario:', err)
        });
      },
      error: (err) => console.error('Error cargando presupuesto para descuento de stock:', err)
    });
  }
}
