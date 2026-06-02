package com.amazonas.backend.modules.requests.service;

import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.requests.dto.PurchaseRequestRequest;
import com.amazonas.backend.modules.requests.dto.PurchaseRequestResponse;
import com.amazonas.backend.modules.requests.dto.UpdateEstadoRequest;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public interface PurchaseRequestService {

    /** Crea una solicitud de compra para el usuario autenticado */
    PurchaseRequestResponse crear(PurchaseRequestRequest request, String usuarioEmail);

    /** Retorna las solicitudes del usuario autenticado */
    List<PurchaseRequestResponse> listarMisSolicitudes(String usuarioEmail);

    /** Retorna el detalle de una solicitud por ID */
    PurchaseRequestResponse obtenerPorId(UUID id, String usuarioEmail);

    /** [Admin] Lista todas las solicitudes, con filtro opcional por estado */
    List<PurchaseRequestResponse> listarTodas(EstadoSolicitud estado);

    /** [Admin] Actualiza el estado de una solicitud */
    PurchaseRequestResponse actualizarEstado(UUID id, UpdateEstadoRequest request);
}
