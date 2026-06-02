package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;

public class BudgetExplanationServiceRequest {

    private Boolean incluido = true;
    private String tipoEvento;
    private Integer cantidadPersonas;
    private Integer duracionMinutos;
    private BigDecimal precio;
    private String notas;

    public BudgetExplanationServiceRequest() {}

    public Boolean getIncluido() { return incluido; }
    public void setIncluido(Boolean incluido) { this.incluido = incluido; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public Integer getCantidadPersonas() { return cantidadPersonas; }
    public void setInCantidadPersonas(Integer cantidadPersonas) { this.cantidadPersonas = cantidadPersonas; }
    public void setCantidadPersonas(Integer cantidadPersonas) { this.cantidadPersonas = cantidadPersonas; }

    public Integer getDuracionMinutos() { return duracionMinutos; }
    public void setDuracionMinutos(Integer duracionMinutos) { this.duracionMinutos = duracionMinutos; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
