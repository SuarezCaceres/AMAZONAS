package com.amazonas.backend.modules.budgets.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.requests.model.PurchaseRequest;
import com.amazonas.backend.modules.vendors.model.Vendor;
import org.hibernate.annotations.BatchSize;

import jakarta.persistence.*;

@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitud_id", unique = true)
    private PurchaseRequest solicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creador_id")
    private Vendor creador;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "codigo_referencia", nullable = false, unique = true, length = 30)
    private String codigoReferencia;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = "PENDIENTE"; // PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, EN_PRODUCCION

    @Column(name = "mano_de_obra", nullable = false, precision = 10, scale = 2)
    private BigDecimal manoDeObra = BigDecimal.ZERO;

    @Column(name = "margen_ganancia", nullable = false)
    private Integer margenGanancia = 30; // Porcentaje

    @Column(name = "adelanto_requerido")
    private Boolean adelantoRequerido = false;

    @Column(name = "adelanto_porcentaje")
    private Integer adelantoPorcentaje = 0;

    @Column(name = "adelanto_monto", precision = 10, scale = 2)
    private BigDecimal adelantoMonto = BigDecimal.ZERO;

    @Column(name = "cliente_nombre", length = 255)
    private String clienteNombre;

    @Column(name = "cliente_email", length = 150)
    private String clienteEmail;

    @Column(name = "cliente_telefono", length = 15)
    private String clienteTelefono;

    @Column(name = "es_presencial", nullable = false)
    private Boolean esPresencial = false;

    @Column(name = "is_custom", nullable = false)
    private Boolean isCustom = false;

    @Column(name = "is_kit", nullable = false)
    private Boolean isKit = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Relaciones
    @BatchSize(size = 30)
    @OneToMany(mappedBy = "presupuesto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BudgetItem> items = new ArrayList<>();

    @OneToOne(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    private BudgetExplanationService servicioExplicacion;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.codigoReferencia == null) {
            long epoch = System.currentTimeMillis() % 1000000;
            int randomNum = (int) (Math.random() * 100);
            this.codigoReferencia = String.format("PR-2026-%06d%02d", epoch, randomNum);
        }
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        recalculateAdelanto();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        recalculateAdelanto();
    }

    // Calcula el monto del adelanto en base al total y al porcentaje
    public void recalculateAdelanto() {
        if (adelantoRequerido != null && adelantoRequerido && adelantoPorcentaje != null && adelantoPorcentaje > 0) {
            BigDecimal total = getTotal();
            this.adelantoMonto = total.multiply(BigDecimal.valueOf(adelantoPorcentaje))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            this.adelantoMonto = BigDecimal.ZERO;
        }
    }

    // Métodos calculados
    public BigDecimal getCostoMateriales() {
        if (items == null) return BigDecimal.ZERO;
        return items.stream()
                .map(BudgetItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getSubtotal() {
        BigDecimal costoMateriales = getCostoMateriales();
        BigDecimal servicioPrecio = (servicioExplicacion != null && servicioExplicacion.getIncluido())
                ? servicioExplicacion.getPrecio()
                : BigDecimal.ZERO;
        return costoMateriales.add(manoDeObra).add(servicioPrecio);
    }

    public BigDecimal getGanancia() {
        BigDecimal subtotal = getSubtotal();
        if (margenGanancia == null) return BigDecimal.ZERO;
        return subtotal.multiply(BigDecimal.valueOf(margenGanancia))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public BigDecimal getTotal() {
        return getSubtotal().add(getGanancia());
    }

    // =========================
    // GETTERS & SETTERS
    // =========================

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public PurchaseRequest getSolicitud() {
        return solicitud;
    }

    public void setSolicitud(PurchaseRequest solicitud) {
        this.solicitud = solicitud;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public BigDecimal getManoDeObra() {
        return manoDeObra;
    }

    public void setManoDeObra(BigDecimal manoDeObra) {
        this.manoDeObra = manoDeObra;
    }

    public Integer getMargenGanancia() {
        return margenGanancia;
    }

    public void setMargenGanancia(Integer margenGanancia) {
        this.margenGanancia = margenGanancia;
    }

    public Boolean getAdelantoRequerido() {
        return adelantoRequerido;
    }

    public void setAdelantoRequerido(Boolean adelantoRequerido) {
        this.adelantoRequerido = adelantoRequerido;
    }

    public Integer getAdelantoPorcentaje() {
        return adelantoPorcentaje;
    }

    public void setAdelantoPorcentaje(Integer adelantoPorcentaje) {
        this.adelantoPorcentaje = adelantoPorcentaje;
    }

    public BigDecimal getAdelantoMonto() {
        return adelantoMonto;
    }

    public void setAdelantoMonto(BigDecimal adelantoMonto) {
        this.adelantoMonto = adelantoMonto;
    }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public Boolean getEsPresencial() { return esPresencial; }
    public void setEsPresencial(Boolean esPresencial) { this.esPresencial = esPresencial; }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<BudgetItem> getItems() {
        return items;
    }

    public void setItems(List<BudgetItem> items) {
        this.items = items;
    }

    public BudgetExplanationService getServicioExplicacion() {
        return servicioExplicacion;
    }

    public void setServicioExplicacion(BudgetExplanationService servicioExplicacion) {
        this.servicioExplicacion = servicioExplicacion;
    }

    public Vendor getCreador() {
        return creador;
    }

    public void setCreador(Vendor creador) {
        this.creador = creador;
    }

    public String getCodigoReferencia() {
        return codigoReferencia;
    }

    public void setCodigoReferencia(String codigoReferencia) {
        this.codigoReferencia = codigoReferencia;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }

    public Boolean getIsKit() { return isKit; }
    public void setIsKit(Boolean isKit) { this.isKit = isKit; }
}
