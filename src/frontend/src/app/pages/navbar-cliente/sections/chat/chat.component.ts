import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../../../../services/chat.service';
import { AuthService } from '../../../../services/auth.service';
import { FileService } from '../../../../services/file.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import {
  ChatRoomResponse,
  ChatMessageResponse,
  ChatOfferResponse,
  ChatMessageType,
  ChatSenderRole,
  ChatOfferStatus,
  ChatRoomStatus
} from '../../../../models/chat.model';
import { Subscription, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {

  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly fileService = inject(FileService);
  private readonly purchaseRequestService = inject(PurchaseRequestService);
  private readonly router = inject(Router);


  @Input() autoSelectRequestId?: string;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUserRole: ChatSenderRole = ChatSenderRole.CLIENT;
  currentUserEmail: string = '';
  currentUserName: string = '';

  rooms: ChatRoomResponse[] = [];
  selectedRoom: ChatRoomResponse | null = null;
  messages: ChatMessageResponse[] = [];
  isSidebarOpen: boolean = true;

  // Websocket subscriptions
  private statusSub?: Subscription;
  private messageSub?: Subscription;
  private offerSub?: Subscription;
  private receiptSub?: Subscription;

  // Form inputs
  newMessageText: string = '';

  // File Attachments State
  preloadedFiles: { file: File, previewUrl: string | null, isImage: boolean }[] = [];
  uploadingFile: boolean = false;

  // Counter-offer State
  isCounterOfferMode: boolean = false;
  counterOfferPrice: number = 0;
  counterOfferNote: string = '';

  // Offer Modal / Form
  showOfferForm: boolean = false;
  proposedPrice: number = 0;
  offerNote: string = '';

  // Extra Form
  showExtraForm: boolean = false;
  extraTitle: string = '';
  extraDescription: string = '';
  extraPrice: number = 0;

  // Active / Last Offer
  activeOffer: ChatOfferResponse | null = null;

  // Active Extras
  extras: any[] = []; // Extracted from metadata or service if needed

  private shouldScrollToBottom: boolean = false;

  ngOnInit(): void {
    this.currentUserEmail = sessionStorage.getItem('auth_email') || '';
    this.currentUserName = sessionStorage.getItem('auth_nombre') || '';
    // Forzar rol CLIENTE en la sección de cliente para corregir identidad del emisor
    this.currentUserRole = ChatSenderRole.CLIENT;

    // Bloquear el scroll de la página principal
    document.body.style.overflow = 'hidden';


    // Connect to WebSocket STOMP
    this.chatService.connect();

    // Subscribe to STOMP connection status to handle connection restores
    this.statusSub = this.chatService.connectionStatus$.subscribe(connected => {
      if (connected && this.selectedRoom) {
        this.chatService.subscribeToRoom(this.selectedRoom.id);
      }
    });

    // Listen to real-time messages
    this.messageSub = this.chatService.messages$.subscribe(msg => {
      if (this.selectedRoom && msg.roomId === this.selectedRoom.id) {
        // Try to match with an existing temporary message first
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
          // Replace temporary message with official database message, retaining status SENT
          this.messages[tempIndex] = { ...msg, status: 'SENT' };
        } else {
          // Add message if not already present
          if (!this.messages.some(m => m.id === msg.id)) {
            this.messages.push(msg);
            this.shouldScrollToBottom = true;
          }
        }

        // Mark as read REST
        this.chatService.markAsRead(this.selectedRoom.id).subscribe();
        
        // If message is of type OFFER, load/update active offer
        if (msg.messageType === ChatMessageType.OFFER) {
          this.refreshActiveOffer();
        }

        if (msg.messageType === ChatMessageType.SYSTEM) {
          this.reloadRoomInfo();
        }

        // Update room list preview
        this.loadRoomsList();
      }
    });

    // Listen to STOMP receipts for message delivery confirmation
    this.receiptSub = this.chatService.receipts$.subscribe(receiptId => {
      const msg = this.messages.find(m => m.id === receiptId);
      if (msg && msg.status === 'SENDING') {
        msg.status = 'SENT';
      }
    });

    // Listen to real-time offer updates
    this.offerSub = this.chatService.offers$.subscribe(offer => {
      if (this.selectedRoom && offer.roomId === this.selectedRoom.id) {
        this.activeOffer = offer;
        // Check if there is a corresponding message we need to update, or just reload messages
        this.loadMessages(this.selectedRoom.id);
        this.loadRoomsList();
      }
    });

    // Load initial list of rooms
    this.loadRoomsList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['autoSelectRequestId'];
    if (change && this.autoSelectRequestId && change.currentValue !== change.previousValue) {
      this.handleAutoSelect(this.autoSelectRequestId);
    }
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.messageSub?.unsubscribe();
    this.offerSub?.unsubscribe();
    this.receiptSub?.unsubscribe();
    this.chatService.disconnect();
    // Restaurar el scroll de la página principal
    document.body.style.overflow = '';
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.scrollContainer && this.scrollContainer.nativeElement) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) {
        // Ignore
      }
    }, 50);
  }


  loadRoomsList(): void {
    this.chatService.getMyRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        // If we have autoSelectRequestId, it's handled in handleAutoSelect
      },
      error: (err) => console.error('Error listing chat rooms', err)
    });
  }

  handleAutoSelect(requestId: string): void {
    this.chatService.getOrCreateRoom(requestId).subscribe({
      next: (room) => {
        this.selectRoom(room);
      },
      error: (err) => console.error('Error auto-selecting/creating room', err)
    });
  }

  selectRoom(room: ChatRoomResponse): void {
    // IMPORTANTE: Si ya estamos en esta sala, no hacer nada para evitar ráfagas de UNSUBSCRIBE/SUBSCRIBE
    if (this.selectedRoom && this.selectedRoom.id === room.id) {
      return;
    }

    if (this.selectedRoom) {
      this.chatService.unsubscribeFromRoom(this.selectedRoom.id);
    }

    this.selectedRoom = room;
    this.isSidebarOpen = false;
    this.messages = [];
    this.activeOffer = null;
    this.extras = [];

    // Load messages history
    this.loadMessages(room.id);

    // Subscribe to STOMP channels for this room
    this.chatService.subscribeToRoom(room.id);

    // Mark as read
    this.chatService.markAsRead(room.id).subscribe({
      next: () => {
        room.unreadCount = 0;
        this.loadRoomsList(); // refresh unread counters
      }
    });
  }

  loadMessages(roomId: string): void {
    this.chatService.getMessages(roomId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.shouldScrollToBottom = true;
        this.refreshActiveOffer();
        this.extractExtras();
      },
      error: (err) => console.error('Error loading messages history', err)
    });
  }

  refreshActiveOffer(): void {
    // Look for the latest offer message to identify current active offer
    const offerMsgs = this.messages.filter(m => m.messageType === ChatMessageType.OFFER);
    if (offerMsgs.length > 0) {
      try {
        // Sort by sentAt descending
        offerMsgs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        const latestOfferMsg = offerMsgs[0];
        const parsedMetadata = JSON.parse(latestOfferMsg.metadata);
        
        this.activeOffer = {
          id: parsedMetadata.offerId || parsedMetadata.id,
          roomId: latestOfferMsg.roomId,
          proposerId: latestOfferMsg.senderId,
          proposerName: latestOfferMsg.senderName,
          proposerRole: latestOfferMsg.senderRole,
          proposedPrice: parsedMetadata.proposedPrice,
          note: parsedMetadata.note,
          status: parsedMetadata.status || ChatOfferStatus.PENDING,
          respondedAt: parsedMetadata.respondedAt,
          createdAt: latestOfferMsg.sentAt
        };
      } catch (e) {
        console.error('Error parsing offer metadata', e);
      }
    } else {
      this.activeOffer = null;
    }
  }

  extractExtras(): void {
    // Extract accepted extra items from messages
    this.extras = [];
    const extraMsgs = this.messages.filter(m => m.messageType === ChatMessageType.EXTRA);
    extraMsgs.forEach(m => {
      try {
        const data = JSON.parse(m.metadata);
        if (data.status === 'ACCEPTED') {
          this.extras.push(data);
        }
      } catch (e) {
        console.error('Error parsing extra metadata', e);
      }
    });
  }

  // Tipos MIME aceptados — deben estar sincronizados con el backend (CloudinaryServiceImpl)
  private readonly ALLOWED_MIME_TYPES = new Set([
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

      // Validar tipo MIME contra la lista del backend
      if (!this.ALLOWED_MIME_TYPES.has(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.type || 'desconocido'}.\nSe aceptan: imágenes (JPG, PNG, GIF, WEBP, SVG), PDF, Word (.doc/.docx) y texto plano.`);
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

  async enviarComprobanteDefinitivo(): Promise<void> {
    if (!this.selectedRoom || this.preloadedFiles.length === 0) return;

    this.uploadingFile = true;
    const uploadedUrls: string[] = [];

    try {
      // 1. Subir secuencialmente a Cloudinary
      for (const item of this.preloadedFiles) {
        const response = await lastValueFrom(this.fileService.uploadImage(item.file));
        uploadedUrls.push(response.url);
      }

      // 2. Obtener el PurchaseRequest actual del backend para no sobreescribir otros archivos
      const currentReq = await lastValueFrom(this.purchaseRequestService.obtenerPorId(this.selectedRoom.requestId));
      
      const grabacionesUrls = currentReq.grabacionesUrls ? [...currentReq.grabacionesUrls] : [];
      const archivosUrls = currentReq.archivosUrls ? [...currentReq.archivosUrls] : [];

      // Categorizar nuevos archivos por tipo (audio/video vs otros)
      this.preloadedFiles.forEach((item, index) => {
        const url = uploadedUrls[index];
        const type = item.file.type.toLowerCase();
        if (type.startsWith('audio/') || type.startsWith('video/')) {
          grabacionesUrls.push(url);
        } else {
          archivosUrls.push(url);
        }
      });

      // 3. Actualizar la base de datos mediante el endpoint PUT
      await lastValueFrom(
        this.purchaseRequestService.actualizarArchivos(this.selectedRoom.requestId, {
          grabacionesUrls,
          archivosUrls
        })
      );

      // 4. Enviar un mensaje WebSocket de tipo VOUCHER para notificar al vendedor formalmente para cada archivo
      this.preloadedFiles.forEach((item, index) => {
        const url = uploadedUrls[index];
        const clientMsgId = `voucher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const metadata = JSON.stringify({
          fileUrl: url,
          fileName: item.file.name,
          fileType: item.file.type,
          clientMsgId: clientMsgId
        });

        this.chatService.sendMessage(
          this.selectedRoom!.id,
          `Comprobante de pago definitivo: ${item.file.name}`,
          'VOUCHER',
          metadata,
          clientMsgId
        );
      });

      // 5. Limpiar archivos pre-cargados y apagar loading
      this.clearPreloadedFiles();
      this.uploadingFile = false;
      this.showPaymentPanel = false;
      alert('¡Comprobante(s) definitivo(s) enviado(s) y guardado(s) exitosamente!');
    } catch (error) {
      console.error('Error al subir/guardar comprobante definitivo', error);
      alert('Hubo un error al guardar y enviar el comprobante. Por favor, inténtalo de nuevo.');
      this.uploadingFile = false;
    }
  }

  sendMessage(): void {
    if (!this.selectedRoom) return;

    const text = this.newMessageText.trim();
    if (!text) return;

    const clientMsgId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add local temporary message
    const tempMsg: ChatMessageResponse = {
      id: clientMsgId,
      roomId: this.selectedRoom.id,
      senderId: this.currentUserEmail,
      senderName: this.currentUserName,
      senderRole: this.currentUserRole,
      messageType: ChatMessageType.TEXT,
      content: text,
      metadata: JSON.stringify({ clientMsgId }),
      isRead: false,
      sentAt: new Date().toISOString(),
      status: 'SENDING'
    };
    this.messages.push(tempMsg);
    this.shouldScrollToBottom = true;
    this.newMessageText = '';

    // Setup timeout for failure
    setTimeout(() => {
      const found = this.messages.find(m => m.id === clientMsgId);
      if (found && found.status === 'SENDING') {
        found.status = 'FAILED';
      }
    }, 8000);

    this.chatService.sendMessage(
      this.selectedRoom.id,
      text,
      'TEXT',
      JSON.stringify({ clientMsgId }),
      clientMsgId
    );
  }


  retryMessage(msg: ChatMessageResponse): void {
    if (!this.selectedRoom) return;

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
      this.selectedRoom.id,
      msg.content,
      msg.messageType,
      metadata,
      clientMsgId
    );
  }

  goToCreateBudget(): void {
    if (this.selectedRoom) {
      this.router.navigate(['/admin/presupuestos/crear'], {
        queryParams: { requestId: this.selectedRoom.requestId }
      });
    }
  }

  // Offer Proposals
  openOfferModal(): void {
    this.proposedPrice = this.selectedRoom?.agreedPrice || 0;
    this.offerNote = '';
    this.showOfferForm = true;
  }

  closeOfferModal(): void {
    this.showOfferForm = false;
  }

  submitOffer(): void {
    if (!this.selectedRoom || this.proposedPrice <= 0) return;

    this.chatService.createOffer(this.selectedRoom.id, {
      proposedPrice: this.proposedPrice,
      note: this.offerNote
    }).subscribe({
      next: (offer) => {
        this.activeOffer = offer;
        this.closeOfferModal();
        this.loadMessages(this.selectedRoom!.id);
      },
      error: (err) => console.error('Error creating offer', err)
    });
  }

  // Counter-offer triggers
  startCounterOffer(offer: ChatOfferResponse): void {
    this.isCounterOfferMode = true;
    this.counterOfferPrice = offer.proposedPrice;
    this.counterOfferNote = '';
    
    // Enfocar input si está en pantalla
    setTimeout(() => {
      const el = document.getElementById('counterOfferPriceInput');
      if (el) el.focus();
    }, 100);
  }

  cancelCounterOffer(): void {
    this.isCounterOfferMode = false;
    this.counterOfferPrice = 0;
    this.counterOfferNote = '';
  }

  submitCounterOffer(): void {
    if (!this.selectedRoom || this.counterOfferPrice <= 0) return;

    this.chatService.createOffer(this.selectedRoom.id, {
      proposedPrice: this.counterOfferPrice,
      note: this.counterOfferNote
    }).subscribe({
      next: (offer) => {
        this.activeOffer = offer;
        this.cancelCounterOffer();
        this.loadMessages(this.selectedRoom!.id);
      },
      error: (err) => console.error('Error creating counter-offer', err)
    });
  }

  respondToOffer(accept: boolean): void {
    if (!this.activeOffer) return;

    this.chatService.respondToOffer(this.activeOffer.id, accept).subscribe({
      next: (updatedOffer) => {
        this.activeOffer = updatedOffer;
        if (this.selectedRoom) {
          // If accepted, updatedRoom price is set. We reload messages to see system message.
          this.loadMessages(this.selectedRoom.id);
          // Also update local room state
          if (accept) {
            this.selectedRoom = {
              ...this.selectedRoom,
              status: this.selectedRoom.status, // might be updated
              agreedPrice: updatedOffer.proposedPrice
            };
          }
        }
      },
      error: (err) => console.error('Error responding to offer', err)
    });
  }

  // Extra service Proposals
  openExtraModal(): void {
    this.extraTitle = '';
    this.extraDescription = '';
    this.extraPrice = 0;
    this.showExtraForm = true;
  }

  closeExtraModal(): void {
    this.showExtraForm = false;
  }

  submitExtra(): void {
    if (!this.selectedRoom || !this.extraTitle.trim() || this.extraPrice <= 0) return;

    this.chatService.addExtra(this.selectedRoom.id, {
      title: this.extraTitle.trim(),
      description: this.extraDescription.trim(),
      price: this.extraPrice
    }).subscribe({
      next: (updatedRoom) => {
        this.selectedRoom = updatedRoom;
        this.closeExtraModal();
        this.loadMessages(this.selectedRoom.id);
      },
      error: (err) => console.error('Error proposing extra', err)
    });
  }

  respondToExtra(extraId: string, accept: boolean): void {
    this.chatService.respondToExtra(extraId, accept).subscribe({
      next: (updatedRoom) => {
        this.selectedRoom = updatedRoom;
        this.loadMessages(this.selectedRoom.id);
      },
      error: (err) => console.error('Error responding to extra', err)
    });
  }

  // Helpers
  isMyMessage(msg: ChatMessageResponse): boolean {
    if (msg.senderRole === ChatSenderRole.SYSTEM) return false;
    // Comparación principal: el mensaje fue enviado por alguien con rol CLIENT.
    // Como este componente es exclusivamente de la vista del cliente, cualquier
    // mensaje con senderRole === CLIENT siempre es del usuario actual.
    // Esto resuelve el bug donde el nombre "admin" aparecía en mensajes propios
    // porque se comparaba el rol global del contexto de seguridad y no el rol
    // real del remitente en la sala de chat.
    return msg.senderRole === ChatSenderRole.CLIENT;
  }

  parseMetadata(metaStr: string): any {
    try {
      return JSON.parse(metaStr);
    } catch {
      return {};
    }
  }

  getTotalBudget(): number {
    if (!this.selectedRoom) return 0;
    let base = this.selectedRoom.agreedPrice || 0;
    let extrasSum = this.extras.reduce((sum, item) => sum + (item.price || 0), 0);
    return base + extrasSum;
  }

  showPaymentPanel: boolean = false;

  reloadRoomInfo(): void {
    if (this.selectedRoom) {
      this.chatService.getOrCreateRoom(this.selectedRoom.requestId).subscribe({
        next: (updatedRoom) => {
          this.selectedRoom = updatedRoom;
        },
        error: (err) => console.error('Error reloading room details', err)
      });
    }
  }

  aceptarPresupuestoYProcederAlPago(totalAmount: number): void {
    if (!this.selectedRoom) return;

    this.chatService.acceptBudget(this.selectedRoom.id, totalAmount).subscribe({
      next: (updatedRoom) => {
        this.selectedRoom = updatedRoom;
        this.loadRoomsList();
        this.showPaymentPanel = true;
      },
      error: (err) => {
        console.error('Error al aceptar presupuesto y proceder al pago:', err);
        alert('Hubo un error al procesar la solicitud. Por favor, inténtalo de nuevo.');
      }
    });
  }

  aceptarPresupuestoDesdeCard(totalAmount: number): void {
    if (!this.selectedRoom) return;

    this.chatService.acceptBudget(this.selectedRoom.id, totalAmount).subscribe({
      next: (updatedRoom) => {
        this.selectedRoom = updatedRoom;
        this.loadRoomsList();
        alert('Has aceptado el presupuesto. El vendedor iniciará la producción tras confirmar el pago del adelanto.');
      },
      error: (err) => {
        console.error('Error al aceptar presupuesto:', err);
        alert('Hubo un error al aceptar el presupuesto. Por favor, inténtalo de nuevo.');
      }
    });
  }

  hasOfferOrBudget(): boolean {
    return this.messages.some(m => m.messageType === 'OFFER' || m.messageType === 'BUDGET');
  }

  solicitarCambiosDesdeCard(): void {
    const notas = prompt('Describe las observaciones o cambios que solicitas para el presupuesto:');
    if (notas && notas.trim() && this.selectedRoom) {
      const msg = `✍ Observaciones sobre el presupuesto:\n"${notas.trim()}"`;
      this.chatService.sendMessage(this.selectedRoom.id, msg, ChatMessageType.TEXT);
    }
  }

  isDragging: boolean = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!this.ALLOWED_MIME_TYPES.has(file.type)) {
          alert(`Tipo de archivo no permitido: ${file.name}.\nSe aceptan: imágenes, PDF, Word y texto plano.`);
          continue;
        }

        const maxSizeInBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeInBytes) {
          alert(`El archivo "${file.name}" supera el límite de 5MB.`);
          continue;
        }

        this.addPreloadedFile(file);
      }
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert(`¡Copiado al portapapeles: "${text}"!`);
    }).catch(err => {
      console.error('Error al copiar al portapapeles:', err);
    });
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
}
