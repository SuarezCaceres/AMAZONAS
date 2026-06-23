package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class SolicitudParaPresupuestoResponse {

    private UUID id;
    private String productoNombre;
    private String descripcionPersonalizacion;
    private Boolean isCustom;
    private String clienteNombre;
    private String clienteEmail;
    private String clienteTelefono;
    private LocalDateTime createdAt;
    
    private List<MaterialPresupuestoDTO> materialesProducto;
    private List<MaterialSolicitadoDTO> materialesPreferidos;
    private String materialesDeseados;
    
    // Servicio de explicación
    private Boolean solicitarExplicacion;
    private String tipoEvento;
    private Integer cantidadPersonas;

    public SolicitudParaPresupuestoResponse() {}

    // ─── Getters & Setters ───

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }

    public String getDescripcionPersonalizacion() { return descripcionPersonalizacion; }
    public void setDescripcionPersonalizacion(String descripcionPersonalizacion) { this.descripcionPersonalizacion = descripcionPersonalizacion; }

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<MaterialPresupuestoDTO> getMaterialesProducto() { return materialesProducto; }
    public void setMaterialesProducto(List<MaterialPresupuestoDTO> materialesProducto) { this.materialesProducto = materialesProducto; }

    public List<MaterialSolicitadoDTO> getMaterialesPreferidos() { return materialesPreferidos; }
    public void setMaterialesPreferidos(List<MaterialSolicitadoDTO> materialesPreferidos) { this.materialesPreferidos = materialesPreferidos; }

    public String getMaterialesDeseados() { return materialesDeseados; }
    public void setMaterialesDeseados(String materialesDeseados) { this.materialesDeseados = materialesDeseados; }

    public Boolean getSolicitarExplicacion() { return solicitarExplicacion; }
    public void setSolicitarExplicacion(Boolean solicitarExplicacion) { this.solicitarExplicacion = solicitarExplicacion; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public Integer getCantidadPersonas() { return cantidadPersonas; }
    public void setCantidadPersonas(Integer cantidadPersonas) { this.cantidadPersonas = cantidadPersonas; }

    // ─── Inner DTO for Materials ───
    public static class MaterialPresupuestoDTO {
        private UUID id;
        private String nombre;
        private String unidad;
        private BigDecimal costoVenta;
        private BigDecimal cantidadSugerida;
        private Boolean esOpcional;

        public MaterialPresupuestoDTO() {}

        public MaterialPresupuestoDTO(UUID id, String nombre, String unidad, BigDecimal costoVenta, BigDecimal cantidadSugerida, Boolean esOpcional) {
            this.id = id;
            this.nombre = nombre;
            this.unidad = unidad;
            this.costoVenta = costoVenta;
            this.cantidadSugerida = cantidadSugerida;
            this.esOpcional = esOpcional;
        }

        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public String getUnidad() { return unidad; }
        public void setUnidad(String unidad) { this.unidad = unidad; }

        public BigDecimal getCostoVenta() { return costoVenta; }
        public void setCostoVenta(BigDecimal costoVenta) { this.costoVenta = costoVenta; }

        public BigDecimal getCantidadSugerida() { return cantidadSugerida; }
        public void setCantidadSugerida(BigDecimal cantidadSugerida) { this.cantidadSugerida = cantidadSugerida; }

        public Boolean getEsOpcional() { return esOpcional; }
        public void setEsOpcional(Boolean esOpcional) { this.esOpcional = esOpcional; }
    }

    // ─── Inner DTO for Client's Requested Materials ───
    public static class MaterialSolicitadoDTO {
        private UUID materialId;
        private String nombre;
        private String unidad;
        private BigDecimal costoVenta;
        private String razonPreferencia;

        public MaterialSolicitadoDTO() {}

        public MaterialSolicitadoDTO(UUID materialId, String nombre, String unidad, BigDecimal costoVenta, String razonPreferencia) {
            this.materialId = materialId;
            this.nombre = nombre;
            this.unidad = unidad;
            this.costoVenta = costoVenta;
            this.razonPreferencia = razonPreferencia;
        }

        public UUID getMaterialId() { return materialId; }
        public void setMaterialId(UUID materialId) { this.materialId = materialId; }

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public String getUnidad() { return unidad; }
        public void setUnidad(String unidad) { this.unidad = unidad; }

        public BigDecimal getCostoVenta() { return costoVenta; }
        public void setCostoVenta(BigDecimal costoVenta) { this.costoVenta = costoVenta; }

        public String getRazonPreferencia() { return razonPreferencia; }
        public void setRazonPreferencia(String razonPreferencia) { this.razonPreferencia = razonPreferencia; }
    }
}
