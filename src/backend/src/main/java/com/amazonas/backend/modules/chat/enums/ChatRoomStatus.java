package com.amazonas.backend.modules.chat.enums;

public enum ChatRoomStatus {
    OPEN,       // Negociación activa
    AGREED,     // Precio acordado, pendiente de pago
    CLOSED,     // Cerrado (pago completado o cancelado)
    ARCHIVED    // Archivado
}
