import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../services/chat.service';
import { AuthService } from '../../../../services/auth.service';
import {
  ChatRoomResponse,
  ChatMessageResponse,
  ChatOfferResponse,
  ChatMessageType,
  ChatSenderRole,
  ChatOfferStatus
} from '../../../../models/chat.model';
import { Subscription } from 'rxjs';

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

  @Input() autoSelectRequestId?: string;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUserRole: ChatSenderRole = ChatSenderRole.CLIENT;
  currentUserEmail: string = '';
  currentUserName: string = '';

  rooms: ChatRoomResponse[] = [];
  selectedRoom: ChatRoomResponse | null = null;
  messages: ChatMessageResponse[] = [];

  // Websocket subscriptions
  private statusSub?: Subscription;
  private messageSub?: Subscription;
  private offerSub?: Subscription;

  // Form inputs
  newMessageText: string = '';

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
    this.currentUserEmail = localStorage.getItem('auth_email') || '';
    this.currentUserName = localStorage.getItem('auth_nombre') || '';
    const rawRole = this.authService.getUserRole();
    this.currentUserRole = rawRole === 'ADMIN' ? ChatSenderRole.VENDOR : ChatSenderRole.CLIENT;

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
        // Add message if not already present
        if (!this.messages.some(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.shouldScrollToBottom = true;
          
          // Mark as read REST
          this.chatService.markAsRead(this.selectedRoom.id).subscribe();
          
          // If message is of type OFFER, load/update active offer
          if (msg.messageType === ChatMessageType.OFFER) {
            this.refreshActiveOffer();
          }

          // Update room list preview
          this.loadRoomsList();
        }
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
    if (changes['autoSelectRequestId'] && this.autoSelectRequestId) {
      this.handleAutoSelect(this.autoSelectRequestId);
    }
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.messageSub?.unsubscribe();
    this.offerSub?.unsubscribe();
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Ignore
    }
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
        this.loadRoomsList();
      },
      error: (err) => console.error('Error auto-selecting/creating room', err)
    });
  }

  selectRoom(room: ChatRoomResponse): void {
    if (this.selectedRoom) {
      this.chatService.unsubscribeFromRoom(this.selectedRoom.id);
    }

    this.selectedRoom = room;
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
          id: parsedMetadata.id,
          roomId: latestOfferMsg.roomId,
          proposerId: latestOfferMsg.senderId,
          proposerName: latestOfferMsg.senderName,
          proposerRole: latestOfferMsg.senderRole,
          proposedPrice: parsedMetadata.proposedPrice,
          note: parsedMetadata.note,
          status: parsedMetadata.status,
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

  sendMessage(): void {
    if (!this.selectedRoom || !this.newMessageText.trim()) {
      return;
    }

    this.chatService.sendMessage(this.selectedRoom.id, this.newMessageText.trim());
    this.newMessageText = '';
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
    
    // Check role to align
    return msg.senderRole === this.currentUserRole;
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
}
