package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class BudgetResponse {

    private UUID id;
    private UUID solicitudId;
    private String nombre;
    private String descripcion;
    private String codigoReferencia;
    private String estado;
    private BigDecimal manoDeObra;
    private Integer margenGanancia;
    private Boolean adelantoRequerido;
    private Integer adelantoPorcentaje;

    // Campos calculados
    private BigDecimal costoMateriales;
    private BigDecimal subtotal;
    private BigDecimal ganancia;
    private BigDecimal total;
    private BigDecimal adelantoMonto;

    // Datos del cliente para presupuestos presenciales
    private String clienteNombre;
    private String clienteEmail;
    private String clienteTelefono;
    private Boolean esPresencial;

    private List<BudgetItemResponse> items;
    private BudgetExplanationServiceResponse servicioExplicacion;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public BudgetResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getSolicitudId() { return solicitudId; }
    public void setSolicitudId(UUID solicitudId) { this.solicitudId = solicitudId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getManoDeObra() { return manoDeObra; }
    public void setManoDeObra(BigDecimal manoDeObra) { this.manoDeObra = manoDeObra; }

    public Integer getMargenGanancia() { return margenGanancia; }
    public void setMargenGanancia(Integer margenGanancia) { this.margenGanancia = margenGanancia; }

    public Boolean getAdelantoRequerido() { return adelantoRequerido; }
    public void setAdelantoRequerido(Boolean adelantoRequerido) { this.adelantoRequerido = adelantoRequerido; }

    public Integer getAdelantoPorcentaje() { return adelantoPorcentaje; }
    public void setAdelantoPorcentaje(Integer adelantoPorcentaje) { this.adelantoPorcentaje = adelantoPorcentaje; }

    public BigDecimal getCostoMateriales() { return costoMateriales; }
    public void setCostoMateriales(BigDecimal costoMateriales) { this.costoMateriales = costoMateriales; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getGanancia() { return ganancia; }
    public void setGanancia(BigDecimal ganancia) { this.ganancia = ganancia; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public BigDecimal getAdelantoMonto() { return adelantoMonto; }
    public void setAdelantoMonto(BigDecimal adelantoMonto) { this.adelantoMonto = adelantoMonto; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public Boolean getEsPresencial() { return esPresencial; }
    public void setEsPresencial(Boolean esPresencial) { this.esPresencial = esPresencial; }

    public List<BudgetItemResponse> getItems() { return items; }
    public void setItems(List<BudgetItemResponse> items) { this.items = items; }

    public BudgetExplanationServiceResponse getServicioExplicacion() { return servicioExplicacion; }
    public void setServicioExplicacion(BudgetExplanationServiceResponse servicioExplicacion) { this.servicioExplicacion = servicioExplicacion; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCodigoReferencia() { return codigoReferencia; }
    public void setCodigoReferencia(String codigoReferencia) { this.codigoReferencia = codigoReferencia; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    private Boolean isCustom;
    private Boolean isKit;

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public Boolean getIsKit() { return isKit; }
    public void setIsKit(Boolean isKit) { this.isKit = isKit; }

    private Boolean clienteRegistrado;

    public Boolean getClienteRegistrado() { return clienteRegistrado; }
    public void setClienteRegistrado(Boolean clienteRegistrado) { this.clienteRegistrado = clienteRegistrado; }
}
