package com.amazonas.backend.modules.requests.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * DTO para crear una solicitud de compra.
 * Soporta tres flujos del Figma:
 *   1. Maqueta Ya Hecha   → productoId + datos de contacto + (opcional) explicacion
 *   2. Kit de Maquetas    → isKit=true + lista de kits
 *   3. Personalización    → isCustom=true + campos de personalización + materiales
 */
public class PurchaseRequestRequest {

    // ─── Datos de contacto del cliente (requeridos siempre) ───
    private String clienteNombre;
    private String clienteEmail;
    private String clienteTelefono;
    private String mensaje;

    // ─── Flujo 1: Maqueta ya hecha ───
    private UUID productoId; // Puede ser null si es personalización libre

    // ─── Flujo 2: Kit de maquetas ───
    private Boolean isKit = false;
    private List<KitMaquetaRequest> kits = new ArrayList<>();

    // ─── Flujo 3: Personalización total ───
    private Boolean isCustom = false;
    private String descripcionPersonalizacion;
    private String materialesDeseados; // Texto libre de materiales no inventariados
    private List<KitCustomizedMaterialRequest> materialesCustomizados = new ArrayList<>();
    private List<KitPersonalMaterialRequest> materialesPersonales = new ArrayList<>();
    private List<RequestPreferredMaterialRequest> materialesPreferidos = new ArrayList<>();

    // ─── Servicio de Explicación (opcional, aplica a flujos 1 y 3) ───
    private Boolean solicitarExplicacion = false;
    private String tipoEvento;
    private Integer cantidadPersonas;

    public PurchaseRequestRequest() {}

    // ─── Getters & Setters ───

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public UUID getProductoId() { return productoId; }
    public void setProductoId(UUID productoId) { this.productoId = productoId; }

    public Boolean getIsKit() { return isKit; }
    public void setIsKit(Boolean isKit) { this.isKit = isKit; }

    public List<KitMaquetaRequest> getKits() { return kits; }
    public void setKits(List<KitMaquetaRequest> kits) { this.kits = kits; }

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public String getDescripcionPersonalizacion() { return descripcionPersonalizacion; }
    public void setDescripcionPersonalizacion(String descripcionPersonalizacion) { this.descripcionPersonalizacion = descripcionPersonalizacion; }

    public String getMaterialesDeseados() { return materialesDeseados; }
    public void setMaterialesDeseados(String materialesDeseados) { this.materialesDeseados = materialesDeseados; }

    public List<KitCustomizedMaterialRequest> getMaterialesCustomizados() { return materialesCustomizados; }
    public void setMaterialesCustomizados(List<KitCustomizedMaterialRequest> materialesCustomizados) { this.materialesCustomizados = materialesCustomizados; }

    public List<KitPersonalMaterialRequest> getMaterialesPersonales() { return materialesPersonales; }
    public void setMaterialesPersonales(List<KitPersonalMaterialRequest> materialesPersonales) { this.materialesPersonales = materialesPersonales; }

    public List<RequestPreferredMaterialRequest> getMaterialesPreferidos() { return materialesPreferidos; }
    public void setMaterialesPreferidos(List<RequestPreferredMaterialRequest> materialesPreferidos) { this.materialesPreferidos = materialesPreferidos; }

    public Boolean getSolicitarExplicacion() { return solicitarExplicacion; }
    public void setSolicitarExplicacion(Boolean solicitarExplicacion) { this.solicitarExplicacion = solicitarExplicacion; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public Integer getCantidadPersonas() { return cantidadPersonas; }
    public void setCantidadPersonas(Integer cantidadPersonas) { this.cantidadPersonas = cantidadPersonas; }
}
