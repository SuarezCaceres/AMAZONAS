import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, OnDestroy, Output, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { ChatService } from '../../../../services/chat.service';
import { EstadoSolicitud } from '../../../../models/purchase-request.model';
import { ChatRoomResponse, ChatMessageResponse, ChatSenderRole, ChatMessageType } from '../../../../models/chat.model';
import { Subscription, lastValueFrom } from 'rxjs';
import { FileService } from '../../../../services/file.service';

interface Solicitud {
  id: string;
  productoNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  detalle: string;
  fecha: Date;
  estado: 'pendiente' | 'procesando' | 'completado';
  isCustom: boolean;
  expanded: boolean;
  tienePresupuesto: boolean;
  numeroSolicitud: string;
  descripcionPersonalizacion?: string;
  materialesDeseados?: string;
  solicitarExplicacion?: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
  materialesPreferidos?: any[];
  escala?: string;
  dimensiones?: string;
  mesaExpositora?: string;
}

type Vista = 'lista' | 'chat';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css'
})
export class SolicitudesComponent implements OnInit, OnDestroy {

  @Input() inicialSolicitudId: string | null = null;
  @Output() crearPresupuestoEvent = new EventEmitter<string>();
  @Output() chatIniciado = new EventEmitter<void>();
  @Output() navegarAPagosEvent = new EventEmitter<string>();
  @Output() chatActivoEvent = new EventEmitter<boolean>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private readonly requestService = inject(PurchaseRequestService);
  private readonly chatService = inject(ChatService);
  private readonly fileService = inject(FileService);

  // ── Vista ──────────────────────────────────────────────────────────────────
  vista: Vista = 'lista';
  solicitudActiva: Solicitud | null = null;

  // ── Lista ─────────────────────────────────────────────────────────────────
  searchTerm = '';
  activeFilter: 'todos' | 'pendientes' | 'procesando' | 'completados' = 'todos';
  isLoading = false;
  solicitudes: Solicitud[] = [];

  // ── Chat ──────────────────────────────────────────────────────────────────
  room: ChatRoomResponse | null = null;
  messages: ChatMessageResponse[] = [];
  newMessage = '';
  loadingChat = false;
  wsConnected = false;
  currentUserEmail = localStorage.getItem('auth_email') || '';
  currentUserName = localStorage.getItem('auth_nombre') || '';

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
            mesaExpositora: (res as any).mesaExpositora || undefined
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

  private mapEstado(estado: EstadoSolicitud): 'pendiente' | 'procesando' | 'completado' {
    const map: Record<EstadoSolicitud, 'pendiente' | 'procesando' | 'completado'> = {
      'PENDIENTE': 'pendiente',
      'PROCESANDO': 'procesando',
      'COMPLETADO': 'completado'
    };
    return map[estado] || 'pendiente';
  }

  // ── Navegación entre vistas ───────────────────────────────────────────────

  abrirChat(solicitud: Solicitud): void {
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
    if (this.solicitudActiva) {
      this.navegarAPagosEvent.emit(this.solicitudActiva.id);
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

  get filteredSolicitudes(): Solicitud[] {
    let filtered = this.solicitudes;
    if (this.activeFilter !== 'todos') {
      const estadoMap: Record<string, string> = {
        'pendientes': 'pendiente', 'procesando': 'procesando', 'completados': 'completado'
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

  toggleExpand(solicitud: Solicitud): void { solicitud.expanded = !solicitud.expanded; }
  expandAll(): void { this.filteredSolicitudes.forEach(s => s.expanded = true); }
  collapseAll(): void { this.filteredSolicitudes.forEach(s => s.expanded = false); }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente', 'procesando': 'Procesando', 'completado': 'Completado'
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

  confirmarPagoDesdeChat(msg: ChatMessageResponse): void {
    if (!this.room) return;

    let parsedMeta: any = {};
    try {
      parsedMeta = JSON.parse(msg.metadata);
    } catch (e) {
      console.error('Error parsing voucher message metadata', e);
    }

    const total = this.room.agreedPrice || 375.70;
    const half = total / 2;

    const payload = {
      clientName: this.room.clientName,
      clientEmail: this.room.clientEmail,
      clientPhone: this.solicitudActiva?.clienteTelefono || '987654321',
      roomId: this.room.id,
      monto: half,
      metodoPago: 'ONLINE', // Yape
      tipoAbono: 'ADELANTO', // Adelanto
      tipoMaqueta: this.solicitudActiva?.isCustom ? 'PERSONALIZADA' : 'PREDETERMINADA',
      materiales: this.solicitudActiva?.materialesDeseados || 'Madera Balsa, PLA, Acrilico',
      fechaTransaccion: new Date().toISOString(),
      codigoOperacion: parsedMeta.fileName || `YAPE-OPE-${Date.now()}`
    };

    this.chatService.registerPayment(payload).subscribe({
      next: (res) => {
        // Enviar mensaje de confirmación del sistema vía WebSocket
        const sysMessage = `El vendedor ha verificado y confirmado el pago de adelanto de S/ ${half.toFixed(2)}.`;
        this.chatService.sendMessage(this.room!.id, sysMessage, 'SYSTEM');

        // Recargar sala de chat e información
        this.reloadRoomInfo();
        this.closeVoucherZoom();
        alert(`¡Pago verificado y registrado exitosamente!\nMonto de adelanto: S/ ${half.toFixed(2)}`);
      },
      error: (err) => {
        console.error('Error al registrar pago desde chat:', err);
        alert('Hubo un error al registrar el pago. Por favor, asegúrate de que el cliente esté registrado en la base de datos.');
      }
    });
  }
}
