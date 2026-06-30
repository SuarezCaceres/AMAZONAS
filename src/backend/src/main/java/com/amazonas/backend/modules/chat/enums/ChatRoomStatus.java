package com.amazonas.backend.modules.chat.enums;

public enum ChatRoomStatus {
    ACTIVE,     // Negociación activa (estado por defecto)
    OPEN,       // Alias legacy (compatible con registros previos en BD)
    AGREED,     // Precio acordado, pendiente de pago
    CLOSED,     // Cerrado (pago completado o cancelado)
    ARCHIVED    // Archivado
}

