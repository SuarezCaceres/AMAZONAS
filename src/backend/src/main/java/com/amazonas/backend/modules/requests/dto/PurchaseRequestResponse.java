package com.amazonas.backend.modules.requests.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public class PurchaseRequestResponse {

    private UUID id;

    // Datos del cliente (snapshot)
    private String clienteNombre;
    private String clienteEmail;
    private String clienteTelefono;

    // Datos del producto (snapshot)
    private UUID productoId;
    private String productoNombre;

    // Tipo de solicitud
    private Boolean isKit;
    private Boolean isCustom;

    // Estado actual
    private EstadoSolicitud estado;

    // Mensajes y personalización
    private String mensaje;
    private String descripcionPersonalizacion;
    private String materialesDeseados;

    // Servicio de explicación
    private Boolean solicitarExplicacion;
    private String tipoEvento;
    private Integer cantidadPersonas;

    // Listas de elementos relacionados
    private List<KitMaquetaResponse> kits;
    private List<KitCustomizedMaterialResponse> materialesCustomizados;
    private List<KitPersonalMaterialResponse> materialesPersonales;
    private List<RequestPreferredMaterialResponse> materialesPreferidos;

    // Indica si ya tiene presupuesto
    private Boolean tienePresupuesto;

    // Grabaciones y Archivos
    private List<String> grabacionesUrls;
    private List<String> archivosUrls;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PurchaseRequestResponse() {}

    // ─── Getters & Setters ───

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public UUID getProductoId() { return productoId; }
    public void setProductoId(UUID productoId) { this.productoId = productoId; }

    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }

    public Boolean getIsKit() { return isKit; }
    public void setIsKit(Boolean isKit) { this.isKit = isKit; }

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public EstadoSolicitud getEstado() { return estado; }
    public void setEstado(EstadoSolicitud estado) { this.estado = estado; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public String getDescripcionPersonalizacion() { return descripcionPersonalizacion; }
    public void setDescripcionPersonalizacion(String descripcionPersonalizacion) { this.descripcionPersonalizacion = descripcionPersonalizacion; }

    public String getMaterialesDeseados() { return materialesDeseados; }
    public void setMaterialesDeseados(String materialesDeseados) { this.materialesDeseados = materialesDeseados; }

    public Boolean getSolicitarExplicacion() { return solicitarExplicacion; }
    public void setSolicitarExplicacion(Boolean solicitarExplicacion) { this.solicitarExplicacion = solicitarExplicacion; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public Integer getCantidadPersonas() { return cantidadPersonas; }
    public void setCantidadPersonas(Integer cantidadPersonas) { this.cantidadPersonas = cantidadPersonas; }

    public List<KitMaquetaResponse> getKits() { return kits; }
    public void setKits(List<KitMaquetaResponse> kits) { this.kits = kits; }

    public List<KitCustomizedMaterialResponse> getMaterialesCustomizados() { return materialesCustomizados; }
    public void setMaterialesCustomizados(List<KitCustomizedMaterialResponse> materialesCustomizados) { this.materialesCustomizados = materialesCustomizados; }

    public List<KitPersonalMaterialResponse> getMaterialesPersonales() { return materialesPersonales; }
    public void setMaterialesPersonales(List<KitPersonalMaterialResponse> materialesPersonales) { this.materialesPersonales = materialesPersonales; }

    public List<RequestPreferredMaterialResponse> getMaterialesPreferidos() { return materialesPreferidos; }
    public void setMaterialesPreferidos(List<RequestPreferredMaterialResponse> materialesPreferidos) { this.materialesPreferidos = materialesPreferidos; }

    public Boolean getTienePresupuesto() { return tienePresupuesto; }
    public void setTienePresupuesto(Boolean tienePresupuesto) { this.tienePresupuesto = tienePresupuesto; }

    public List<String> getGrabacionesUrls() { return grabacionesUrls; }
    public void setGrabacionesUrls(List<String> grabacionesUrls) { this.grabacionesUrls = grabacionesUrls; }

    public List<String> getArchivosUrls() { return archivosUrls; }
    public void setArchivosUrls(List<String> archivosUrls) { this.archivosUrls = archivosUrls; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
