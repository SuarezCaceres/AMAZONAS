package com.amazonas.backend.modules.requests.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.BatchSize;

import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.products.model.Product;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.budgets.model.Budget;

import jakarta.persistence.*;

@Entity
@Table(name = "purchase_requests")
@SQLDelete(sql = "UPDATE purchase_requests SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class PurchaseRequest {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Product producto;

    @Column(name = "cliente_nombre", nullable = false, length = 255)
    private String clienteNombre;

    @Column(name = "cliente_email", nullable = false, length = 150)
    private String clienteEmail;

    @Column(name = "cliente_telefono", length = 15)
    private String clienteTelefono;

    @Column(name = "producto_nombre", nullable = false, length = 200)
    private String productoNombre;

    @Column(name = "is_kit", nullable = false)
    private Boolean isKit = false;

    @Column(name = "is_custom", nullable = false)
    private Boolean isCustom = false;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "estado",
            nullable = false,
            columnDefinition = "estado_solicitud"
    )
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;

    @Column(columnDefinition = "TEXT")
    private String mensaje;

    @Column(name = "descripcion_personalizacion", columnDefinition = "TEXT")
    private String descripcionPersonalizacion;

    @Column(name = "materiales_deseados", columnDefinition = "TEXT")
    private String materialesDeseados;

    @Column(name = "solicitar_explicacion")
    private Boolean solicitarExplicacion = false;

    @Column(name = "tipo_evento", length = 100)
    private String tipoEvento;

    @Column(name = "cantidad_personas")
    private Integer cantidadPersonas;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relaciones de la Opción A
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KitMaqueta> kits = new ArrayList<>();

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KitCustomizedMaterial> materialesCustomizados = new ArrayList<>();

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KitPersonalMaterial> materialesPersonales = new ArrayList<>();

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestPreferredMaterial> materialesPreferidos = new ArrayList<>();

    @OneToOne(mappedBy = "solicitud", cascade = CascadeType.ALL)
    private Budget presupuesto;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
    }

    public Product getProducto() {
        return producto;
    }

    public void setProducto(Product producto) {
        this.producto = producto;
    }

    public String getClienteNombre() {
        return clienteNombre;
    }

    public void setClienteNombre(String clienteNombre) {
        this.clienteNombre = clienteNombre;
    }

    public String getClienteEmail() {
        return clienteEmail;
    }

    public void setClienteEmail(String clienteEmail) {
        this.clienteEmail = clienteEmail;
    }

    public String getClienteTelefono() {
        return clienteTelefono;
    }

    public void setClienteTelefono(String clienteTelefono) {
        this.clienteTelefono = clienteTelefono;
    }

    public String getProductoNombre() {
        return productoNombre;
    }

    public void setProductoNombre(String productoNombre) {
        this.productoNombre = productoNombre;
    }

    public Boolean getIsKit() {
        return isKit;
    }

    public void setIsKit(Boolean isKit) {
        this.isKit = isKit;
    }

    public Boolean getIsCustom() {
        return isCustom;
    }

    public void setIsCustom(Boolean isCustom) {
        this.isCustom = isCustom;
    }

    public EstadoSolicitud getEstado() {
        return estado;
    }

    public void setEstado(EstadoSolicitud estado) {
        this.estado = estado;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getDescripcionPersonalizacion() {
        return descripcionPersonalizacion;
    }

    public void setDescripcionPersonalizacion(String descripcionPersonalizacion) {
        this.descripcionPersonalizacion = descripcionPersonalizacion;
    }

    public String getMaterialesDeseados() {
        return materialesDeseados;
    }

    public void setMaterialesDeseados(String materialesDeseados) {
        this.materialesDeseados = materialesDeseados;
    }

    public Boolean getSolicitarExplicacion() {
        return solicitarExplicacion;
    }

    public void setSolicitarExplicacion(Boolean solicitarExplicacion) {
        this.solicitarExplicacion = solicitarExplicacion;
    }

    public String getTipoEvento() {
        return tipoEvento;
    }

    public void setTipoEvento(String tipoEvento) {
        this.tipoEvento = tipoEvento;
    }

    public Integer getCantidadPersonas() {
        return cantidadPersonas;
    }

    public void setCantidadPersonas(Integer cantidadPersonas) {
        this.cantidadPersonas = cantidadPersonas;
    }

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

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public List<KitMaqueta> getKits() {
        return kits;
    }

    public void setKits(List<KitMaqueta> kits) {
        this.kits = kits;
    }

    public List<KitCustomizedMaterial> getMaterialesCustomizados() {
        return materialesCustomizados;
    }

    public void setMaterialesCustomizados(List<KitCustomizedMaterial> materialesCustomizados) {
        this.materialesCustomizados = materialesCustomizados;
    }

    public List<KitPersonalMaterial> getMaterialesPersonales() {
        return materialesPersonales;
    }

    public void setMaterialesPersonales(List<KitPersonalMaterial> materialesPersonales) {
        this.materialesPersonales = materialesPersonales;
    }

    public List<RequestPreferredMaterial> getMaterialesPreferidos() {
        return materialesPreferidos;
    }

    public void setMaterialesPreferidos(List<RequestPreferredMaterial> materialesPreferidos) {
        this.materialesPreferidos = materialesPreferidos;
    }

    public Budget getPresupuesto() {
        return presupuesto;
    }

    public void setPresupuesto(Budget presupuesto) {
        this.presupuesto = presupuesto;
    }
}
