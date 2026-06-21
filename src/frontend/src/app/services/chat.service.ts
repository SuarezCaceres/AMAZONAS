import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  ChatRoomResponse,
  ChatMessageResponse,
  ChatOfferResponse,
  CreateOfferRequest,
  CreateExtraRequest
} from '../models/chat.model';
import { Client, IFrame, IMessage } from '@stomp/stompjs';

@Injectable({ providedIn: 'root' })
export class ChatService {

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly REST_URL = `${API_BASE_URL}/chat`;

  private stompClient: Client | null = null;
  private readonly connectionStatusSubject = new BehaviorSubject<boolean>(false);
  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();

  private readonly messageSubject = new Subject<ChatMessageResponse>();
  readonly messages$ = this.messageSubject.asObservable();

  private readonly offerSubject = new Subject<ChatOfferResponse>();
  readonly offers$ = this.offerSubject.asObservable();

  private readonly roomUpdateSubject = new Subject<ChatRoomResponse>();
  readonly roomUpdates$ = this.roomUpdateSubject.asObservable();

  private activeSubscriptions: { [key: string]: any } = {};

  // =========================================================================
  // REST API METHODS
  // =========================================================================

  getOrCreateRoom(requestId: string): Observable<ChatRoomResponse> {
    return this.http.post<ChatRoomResponse>(`${this.REST_URL}/rooms/request/${requestId}`, {});
  }

  getMyRooms(): Observable<ChatRoomResponse[]> {
    return this.http.get<ChatRoomResponse[]>(`${this.REST_URL}/rooms`);
  }

  getMessages(roomId: string): Observable<ChatMessageResponse[]> {
    return this.http.get<ChatMessageResponse[]>(`${this.REST_URL}/rooms/${roomId}/messages`);
  }

  markAsRead(roomId: string): Observable<void> {
    return this.http.patch<void>(`${this.REST_URL}/rooms/${roomId}/read`, {});
  }

  createOffer(roomId: string, request: CreateOfferRequest): Observable<ChatOfferResponse> {
    return this.http.post<ChatOfferResponse>(`${this.REST_URL}/rooms/${roomId}/offers`, request);
  }

  respondToOffer(offerId: string, accept: boolean): Observable<ChatOfferResponse> {
    const action = accept ? 'accept' : 'reject';
    return this.http.post<ChatOfferResponse>(`${this.REST_URL}/offers/${offerId}/${action}`, {});
  }

  addExtra(roomId: string, request: CreateExtraRequest): Observable<ChatRoomResponse> {
    return this.http.post<ChatRoomResponse>(`${this.REST_URL}/rooms/${roomId}/extras`, request);
  }

  respondToExtra(extraId: string, accept: boolean): Observable<ChatRoomResponse> {
    const action = accept ? 'accept' : 'reject';
    return this.http.post<ChatRoomResponse>(`${this.REST_URL}/extras/${extraId}/${action}`, {});
  }

  // =========================================================================
  // WEBSOCKET STOMP METHODS
  // =========================================================================

  connect(): void {
    if (this.stompClient && this.stompClient.connected) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('Cannot connect to WebSocket: No JWT token found');
      return;
    }

    // Convert API HTTP URL to WebSocket protocol (ws:// or wss://)
    let brokerURL = API_BASE_URL.replace('/api', '/ws');
    if (brokerURL.startsWith('https://')) {
      brokerURL = brokerURL.replace('https://', 'wss://');
    } else if (brokerURL.startsWith('http://')) {
      brokerURL = brokerURL.replace('http://', 'ws://');
    }

    this.stompClient = new Client({
      brokerURL: brokerURL,
      connectHeaders: {
        token: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('[STOMP Debug]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.stompClient.onConnect = (frame: IFrame) => {
      console.log('Connected to WebSocket STOMP');
      this.connectionStatusSubject.next(true);
    };

    this.stompClient.onDisconnect = () => {
      console.log('Disconnected from WebSocket STOMP');
      this.connectionStatusSubject.next(false);
      this.clearSubscriptions();
    };

    this.stompClient.onStompError = (frame: IFrame) => {
      console.error('STOMP protocol error', frame.headers['message']);
      this.connectionStatusSubject.next(false);
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connectionStatusSubject.next(false);
      this.clearSubscriptions();
    }
  }

  subscribeToRoom(roomId: string): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('STOMP client not connected. The ChatComponent statusSub will handle re-subscription on reconnect.');
      return;
    }

    // Evitar duplicar suscripciones para la misma sala
    if (this.activeSubscriptions[roomId]) {
      return;
    }

    console.log(`Subscribing to room topics for ID: ${roomId}`);

    // 1. Suscripción a mensajes en tiempo real
    const msgSub = this.stompClient.subscribe(`/topic/room/${roomId}`, (message: IMessage) => {
      try {
        const chatMsg: ChatMessageResponse = JSON.parse(message.body);
        this.messageSubject.next(chatMsg);
      } catch (err) {
        console.error('Error parsing room message', err);
      }
    });

    // 2. Suscripción a ofertas en tiempo real
    const offerSub = this.stompClient.subscribe(`/topic/room/${roomId}/offers`, (message: IMessage) => {
      try {
        const offer: ChatOfferResponse = JSON.parse(message.body);
        this.offerSubject.next(offer);
      } catch (err) {
        console.error('Error parsing offer update', err);
      }
    });

    // Guardar suscripciones para poder limpiarlas al cambiar de sala o desconectar
    this.activeSubscriptions[roomId] = { msgSub, offerSub };
  }

  unsubscribeFromRoom(roomId: string): void {
    const subs = this.activeSubscriptions[roomId];
    if (subs) {
      subs.msgSub.unsubscribe();
      subs.offerSub.unsubscribe();
      delete this.activeSubscriptions[roomId];
      console.log(`Unsubscribed from room: ${roomId}`);
    }
  }

  sendMessage(roomId: string, content: string, messageType: string = 'TEXT', metadata: string | null = null): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('Cannot send message: WebSocket is not connected');
      return;
    }

    this.stompClient.publish({
      destination: `/app/chat/${roomId}/send`,
      body: JSON.stringify({ content, messageType, metadata })
    });
  }

  private clearSubscriptions(): void {
    Object.keys(this.activeSubscriptions).forEach(roomId => {
      this.unsubscribeFromRoom(roomId);
    });
    this.activeSubscriptions = {};
  }
}
