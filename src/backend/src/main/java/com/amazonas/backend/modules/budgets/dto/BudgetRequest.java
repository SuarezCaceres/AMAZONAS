package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class BudgetRequest {

    private UUID solicitudId;
    private String nombre;
    private String descripcion;
    private BigDecimal manoDeObra;
    private Integer margenGanancia; // Porcentaje (ej: 30 = 30%)
    private Boolean adelantoRequerido;
    private Integer adelantoPorcentaje;

    // Datos del cliente para presupuestos presenciales
    private String clienteNombre;
    private String clienteEmail;
    private String clienteTelefono;
    private Boolean esPresencial;

    private List<BudgetItemRequest> items = new ArrayList<>();
    private BudgetExplanationServiceRequest servicioExplicacion; // Opcional

    public BudgetRequest() {}

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

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public Boolean getEsPresencial() { return esPresencial; }
    public void setEsPresencial(Boolean esPresencial) { this.esPresencial = esPresencial; }

    public List<BudgetItemRequest> getItems() { return items; }
    public void setItems(List<BudgetItemRequest> items) { this.items = items; }

    public BudgetExplanationServiceRequest getServicioExplicacion() { return servicioExplicacion; }
    public void setServicioExplicacion(BudgetExplanationServiceRequest servicioExplicacion) { this.servicioExplicacion = servicioExplicacion; }

    private Boolean isCustom;
    private Boolean isKit;

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public Boolean getIsKit() { return isKit; }
    public void setIsKit(Boolean isKit) { this.isKit = isKit; }
}
