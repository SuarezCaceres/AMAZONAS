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

    public List<BudgetItemRequest> getItems() { return items; }
    public void setItems(List<BudgetItemRequest> items) { this.items = items; }

    public BudgetExplanationServiceRequest getServicioExplicacion() { return servicioExplicacion; }
    public void setServicioExplicacion(BudgetExplanationServiceRequest servicioExplicacion) { this.servicioExplicacion = servicioExplicacion; }
}
