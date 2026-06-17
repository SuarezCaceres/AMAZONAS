package com.amazonas.backend.modules.chat.enums;

public enum ChatOfferStatus {
    PENDING,    // Esperando respuesta
    ACCEPTED,   // Aceptada
    REJECTED,   // Rechazada
    COUNTERED,  // Contraofertada
    EXPIRED     // Expiró sin respuesta
}
