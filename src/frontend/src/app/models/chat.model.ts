export enum ChatRoomStatus {
  ACTIVE = 'ACTIVE',
  OPEN = 'OPEN',       // Compatibilidad con registros legacy en Neon DB
  AGREED = 'AGREED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

export enum ChatMessageType {
  TEXT = 'TEXT',
  OFFER = 'OFFER',
  BUDGET = 'BUDGET',
  SYSTEM = 'SYSTEM',
  EXTRA = 'EXTRA',
  FILE = 'FILE',
  VOUCHER = 'VOUCHER'
}

export enum ChatOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum ChatSenderRole {
  CLIENT = 'CLIENT',
  VENDOR = 'VENDOR',
  SYSTEM = 'SYSTEM'
}

export interface ChatRoomResponse {
  id: string;
  requestId: string;
  productName: string;
  clientName: string;
  clientEmail: string;
  vendorName: string;
  status: ChatRoomStatus;
  agreedPrice: number | null;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
}

export interface ChatMessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: ChatSenderRole;
  messageType: ChatMessageType;
  content: string;
  metadata: string; // JSON String
  isRead: boolean;
  sentAt: string;
  status?: 'SENDING' | 'SENT' | 'FAILED';
}

export interface ChatOfferResponse {
  id: string;
  roomId: string;
  proposerId: string;
  proposerName: string;
  proposerRole: ChatSenderRole;
  proposedPrice: number;
  note: string;
  status: ChatOfferStatus;
  respondedAt: string | null;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface CreateOfferRequest {
  proposedPrice: number;
  note: string;
}

export interface CreateExtraRequest {
  title: string;
  description: string;
  price: number;
}
