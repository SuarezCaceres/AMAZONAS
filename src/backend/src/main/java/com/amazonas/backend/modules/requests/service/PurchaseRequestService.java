package com.amazonas.backend.modules.requests.service;

import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.requests.dto.PurchaseRequestRequest;
import com.amazonas.backend.modules.requests.dto.PurchaseRequestResponse;
import com.amazonas.backend.modules.requests.dto.RequestFilesUpdateRequest;
import com.amazonas.backend.modules.requests.dto.SolicitudParaPresupuestoResponse;
import com.amazonas.backend.modules.requests.dto.UpdateEstadoRequest;
import com.amazonas.backend.modules.requests.dto.RejectRequest;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public interface PurchaseRequestService {

    /** Crea una solicitud de compra para el usuario autenticado */
    PurchaseRequestResponse crear(PurchaseRequestRequest request, String usuarioEmail);

    /** Retorna las solicitudes del usuario autenticado */
    List<PurchaseRequestResponse> listarMisSolicitudes(String usuarioEmail);

    /** Retorna el detalle de una solicitud por ID */
    PurchaseRequestResponse obtenerPorId(UUID id, String usuarioEmail);

    /** [Admin] Lista todas las solicitudes, con filtro opcional por estado */
    org.springframework.data.domain.Page<PurchaseRequestResponse> listarTodas(EstadoSolicitud estado, org.springframework.data.domain.Pageable pageable);

    /** [Admin] Actualiza el estado de una solicitud */
    PurchaseRequestResponse actualizarEstado(UUID id, UpdateEstadoRequest request);

    /** [Admin] Obtiene datos de solicitud para crear presupuesto, incluyendo materiales del producto */
    SolicitudParaPresupuestoResponse obtenerParaPresupuesto(UUID id);

    /** Guarda los enlaces de los archivos definitivos de la solicitud */
    PurchaseRequestResponse actualizarArchivos(UUID id, RequestFilesUpdateRequest request, String usuarioEmail);

    /** Cancela y elimina físicamente una solicitud junto con sus dependencias */
    void eliminar(UUID id, String usuarioEmail);

    /** Rechaza una solicitud guardando el motivo de rechazo */
    PurchaseRequestResponse rechazar(UUID id, RejectRequest request, String usuarioEmail);
}
