import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { ChatService } from '../../../../services/chat.service';
import { BudgetService } from '../../../../services/budget.service';
import { MaterialService } from '../../../../services/material.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Material } from '../../../../models/material.model';
import { Product } from '../../../../models/product.model';

interface MaterialItem {
  id: number;
  materialId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  esDelProducto: boolean;
  esSolicitado: boolean;
}

interface MaterialSolicitado {
  materialId?: string;
  nombre: string;
  unidad?: string;
  costoVenta?: number;
  agregado: boolean;
}

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuestos.component.html',
  styleUrl: './presupuestos.component.css'
})
export class PresupuestosComponent implements OnChanges, OnInit {

  @Input() solicitudId: string | null = null;
  @Output() volverEvent = new EventEmitter<void>();
  @Output() navegarATabEvent = new EventEmitter<any>();
  @Output() navegarAPagosEvent = new EventEmitter<any>();

  private readonly requestService = inject(PurchaseRequestService);
  private readonly chatService = inject(ChatService);
  private readonly budgetService = inject(BudgetService);
  private readonly materialService = inject(MaterialService);
  private readonly maquetaService = inject(MaquetaService);

  // ── Datos de solicitud ────────────────────────────────────────────────────
  nombreProyecto = '';
  descripcion = '';
  isCustom = false;
  clienteNombre = '';
  clienteEmail = '';
  clienteTelefono = '';
  fechaSolicitud = '';
  isLoading = false;

  // ── Modo edición ──────────────────────────────────────────────────────────
  modoEdicion = false;
  presupuestoGuardado = false;
  guardando = false;
  enviando = false;

  // ── Materiales ────────────────────────────────────────────────────────────
  materialSeleccionado = '';
  cantidadMaterial = 1;
  materialesAgregados: MaterialItem[] = [];
  materialesSolicitados: MaterialSolicitado[] = [];
  materialesDeseados = '';

  // ── Autocomplete Materiales ────────────────────────────────────────────────
  busquedaMaterial = '';
  mostrarDropdown = false;
  materialesFiltrados: { id?: string, nombre: string, precio: number }[] = [];

  // ── Historial de Presupuestos ──────────────────────────────────────────────
  historialPresupuestos: any[] = [];
  mostrarHistorial = false;

  // ── Costos ────────────────────────────────────────────────────────────────
  manoDeObra: number = 0;
  margenGanancia: number = 30;

  // ── Adelanto ──────────────────────────────────────────────────────────────
  requiereAdelanto = false;
  porcentajeAdelanto: number = 50;

  // ── Modal adelanto ────────────────────────────────────────────────────────
  showAdelantoModal = false;
  vendedorTelefono = '+51 987 654 321';
  vendedorNombre = 'Administrador Maquetas Amazonas';
  qrDataUrl = '';
  copiado = false;

  // ── Boleta presencial ─────────────────────────────────────────────────────
  boletaTipo: 'adelanto' | 'completo' = 'completo';
  imprimiendoBoleta = false;
  today = new Date();

  // ── Explicación ──────────────────────────────────────────────────────────
  solicitarExplicacion = false;
  tipoEvento = '';
  cantidadPersonas = 0;
  duracionExplicacion = 60;
  precioExplicacion: number = 0;

  materialesDisponibles: { id?: string, nombre: string, precio: number }[] = [];

  // ── Selector de Maquetas del Catálogo ───────────────────────────────────
  catalogMaquetas: Product[] = [];
  selectedMaquetaId: string = '';
  currentMaquetaTipo: 'catalogo' | 'personalizada' | 'kit' = 'catalogo';
  busquedaMaqueta = '';
  mostrarDropdownMaqueta = false;
  maquetasFiltradas: Product[] = [];

  // ── Canal de Venta ─────────────────────────────────────────────────────
  tipoCompra: 'presencial' | 'online' = 'presencial';

  // ── Selector de Maqueta Base en Maqueta Personalizada ───────────────────
  busquedaMaquetaBase = '';
  mostrarDropdownMaquetaBase = false;
  maquetasFiltradasBase: Product[] = [];

  // ── Kits guardados (localStorage) ────────────────────────────────────────
  kitsGuardados: any[] = [];
  mostrarSelectorKit = false;
  kitSeleccionadoId = '';
  activeTab: 'calculadora' | 'kits' = 'calculadora';
  pagoConfirmado = false;
  filtroFechaHistorial = new Date().toISOString().substring(0, 10);

  get historialFiltrado(): any[] {
    if (!this.filtroFechaHistorial) return this.historialPresupuestos;
    return this.historialPresupuestos.filter(h => {
      const fechaRaw = h.fechaCreacion || h.createdAt;
      if (!fechaRaw) return false;
      const fechaStr = typeof fechaRaw === 'string' ? fechaRaw.substring(0, 10) : new Date(fechaRaw).toISOString().substring(0, 10);
      return fechaStr === this.filtroFechaHistorial;
    });
  }
  editingKitId: string | null = null;
  isAddingKit = false;
  kitFormData = {
    maquetaId: '',
    descripcion: ''
  };
  kitMaterialesForm: { materialNombre: string; cantidad: number }[] = [];

  private nextId = 1;
  private roomId: string | null = null;
  savedBudgetId: string | null = null;

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadMateriales();
    this.loadCatalogMaquetas();
    this.cargarHistorial();
    this.loadKitsDesdeStorage();
    if (this.solicitudId) {
      this.loadSolicitudData(this.solicitudId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitudId'] && this.solicitudId) {
      this.presupuestoGuardado = false;
      this.modoEdicion = false;
      this.loadSolicitudData(this.solicitudId);
    }
  }

  loadMateriales(): void {
    this.materialService.getAllMaterials().subscribe({
      next: (mats) => {
        this.materialesDisponibles = mats.map(m => ({
          id: m.id,
          nombre: m.nombre,
          precio: m.costoVenta
        }));
        this.materialesFiltrados = [...this.materialesDisponibles];
      },
      error: (err) => console.error('Error loading materials:', err)
    });
  }

  loadCatalogMaquetas(): void {
    this.maquetaService.getProducts(undefined, undefined, 0, 100).subscribe({
      next: (page) => {
        this.catalogMaquetas = page.content;
        this.maquetasFiltradas = [...this.catalogMaquetas];
      },
      error: (err) => console.error('Error loading catalog maquetas:', err)
    });
  }

  loadKitsDesdeStorage(): void {
    const stored = localStorage.getItem('kitsCompletos');
    this.kitsGuardados = stored ? JSON.parse(stored) : [];
  }

  cargarKitParaPresupuesto(kitId: string): void {
    const kit = this.kitsGuardados.find((k: any) => k.id === kitId);
    if (!kit) return;

    this.nombreProyecto = kit.maquetaNombre;
    this.descripcion = kit.descripcion || '';
    this.currentMaquetaTipo = 'kit';
    this.isCustom = false;
    this.mostrarSelectorKit = false;
    this.kitSeleccionadoId = kitId;

    // Mapear materiales del kit a materialesAgregados usando precios del inventario
    this.materialesAgregados = (kit.materiales || []).map((matKit: any, idx: number) => {
      const matInventario = this.materialesDisponibles.find(m => m.nombre === matKit.materialNombre);
      return {
        id: idx + 1,
        materialId: matInventario?.id || '',
        nombre: matKit.materialNombre,
        cantidad: matKit.cantidad,
        precioUnitario: matInventario?.precio || 0,
        esDelProducto: true,
        esSolicitado: false
      };
    });
    this.nextId = this.materialesAgregados.length + 1;
    // Tipo de compra presencial para kit
    this.tipoCompra = 'presencial';
  }

  filtrarMaquetas(): void {
    const query = this.busquedaMaqueta.trim().toLowerCase();
    if (!query) {
      this.maquetasFiltradas = [...this.catalogMaquetas];
    } else {
      this.maquetasFiltradas = this.catalogMaquetas.filter(m =>
        m.titulo.toLowerCase().includes(query)
      );
    }
  }

  getMaquetaPrecio(maq: Product): number {
    if (maq.materialesDetalle && maq.materialesDetalle.length > 0) {
      const precio = maq.materialesDetalle.reduce((sum: number, mat: any) => {
        const cost = Number(mat.costoVenta || 0);
        const qty = Number(mat.cantidadSugerida || 0);
        return sum + (cost * qty);
      }, 0);
      return precio > 0 ? precio : 120.00;
    }
    return 120.00;
  }

  seleccionarMaqueta(maq: Product): void {
    this.selectedMaquetaId = maq.id;
    this.busquedaMaqueta = maq.titulo;
    this.mostrarDropdownMaqueta = false;
    this.maquetaService.getProductById(maq.id).subscribe({
      next: (fullProduct) => {
        this.onMaquetaSelected(fullProduct);
      },
      error: (err) => console.error('Error fetching full product details:', err)
    });
  }

  onBlurMaquetaAutocomplete(): void {
    setTimeout(() => {
      this.mostrarDropdownMaqueta = false;
    }, 200);
  }

  onMaquetaSelected(maq: Product): void {
    this.nombreProyecto = maq.titulo;
    this.selectedMaquetaId = maq.id;
    this.busquedaMaqueta = maq.titulo;
    this.isCustom = false;

    if (!maq.materialesDetalle || maq.materialesDetalle.length === 0) {
      // El catálogo general no incluye detalle de materiales → buscar por ID
      this.isLoading = true;
      this.maquetaService.getProductById(maq.id).subscribe({
        next: (fullProduct) => {
          this.isLoading = false;
          const detalles = fullProduct.materialesDetalle || [];
          this.materialesAgregados = detalles.map((mat, index) => ({
            id: index + 1,
            materialId: mat.materialId,
            nombre: mat.nombre,
            cantidad: Number(mat.cantidadSugerida) || 1,
            precioUnitario: Number(mat.costoVenta) || 0,
            esDelProducto: true,
            esSolicitado: false
          }));
          this.nextId = this.materialesAgregados.length + 1;
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error cargando materiales de la maqueta:', err);
          this.materialesAgregados = [];
        }
      });
    } else {
      this.materialesAgregados = maq.materialesDetalle.map((mat, index) => ({
        id: index + 1,
        materialId: mat.materialId,
        nombre: mat.nombre,
        cantidad: Number(mat.cantidadSugerida) || 1,
        precioUnitario: Number(mat.costoVenta) || 0,
        esDelProducto: true,
        esSolicitado: false
      }));
      this.nextId = this.materialesAgregados.length + 1;
    }
  }

  filtrarMaquetasBase(): void {
    const query = this.busquedaMaquetaBase.trim().toLowerCase();
    if (!query) {
      this.maquetasFiltradasBase = [...this.catalogMaquetas];
    } else {
      this.maquetasFiltradasBase = this.catalogMaquetas.filter(m =>
        m.titulo.toLowerCase().includes(query)
      );
    }
  }

  seleccionarMaquetaBase(maq: Product): void {
    this.busquedaMaquetaBase = maq.titulo;
    this.mostrarDropdownMaquetaBase = false;
    this.maquetaService.getProductById(maq.id).subscribe({
      next: (fullProduct) => {
        // Precargar los materiales pero dejándolos totalmente editables
        this.materialesAgregados = (fullProduct.materialesDetalle || []).map((mat, index) => ({
          id: index + 1,
          materialId: mat.materialId,
          nombre: mat.nombre,
          cantidad: Number(mat.cantidadSugerida) || 1,
          precioUnitario: Number(mat.costoVenta) || 0,
          esDelProducto: true,
          esSolicitado: false
        }));
        this.nextId = this.materialesAgregados.length + 1;
        if (!this.nombreProyecto || this.nombreProyecto.startsWith('Maqueta Personalizada')) {
          this.nombreProyecto = `Maqueta Personalizada: ${fullProduct.titulo}`;
        }
      },
      error: (err) => console.error('Error fetching full base product details:', err)
    });
  }

  onBlurMaquetaBaseAutocomplete(): void {
    setTimeout(() => {
      this.mostrarDropdownMaquetaBase = false;
    }, 200);
  }

  onTipoCompraChange(): void {
    if (this.tipoCompra === 'presencial') {
      this.requiereAdelanto = false;
    } else {
      this.requiereAdelanto = true;
    }
  }

  setMaquetaTipo(tipo: 'catalogo' | 'personalizada' | 'kit'): void {
    this.currentMaquetaTipo = tipo;
    if (tipo === 'catalogo') {
      this.isCustom = false;
      if (this.solicitudId) {
        this.loadSolicitudData(this.solicitudId);
      } else if (this.selectedMaquetaId) {
        const maq = this.catalogMaquetas.find(m => m.id === this.selectedMaquetaId);
        if (maq) this.onMaquetaSelected(maq);
      } else {
        this.materialesAgregados = [];
        this.nombreProyecto = '';
      }
    } else if (tipo === 'kit') {
      this.isCustom = false;
      if (!this.kitSeleccionadoId) {
        this.materialesAgregados = [];
        this.nombreProyecto = '';
      } else {
        this.cargarKitParaPresupuesto(this.kitSeleccionadoId);
      }
    } else {
      this.isCustom = true;
    }
  }

  get isMaquetaPersonalizada(): boolean {
    return this.currentMaquetaTipo === 'personalizada' || this.isCustom;
  }

  loadSolicitudData(id: string): void {
    this.isLoading = true;
    this.savedBudgetId = null;
    this.tipoCompra = 'online';

    this.requestService.obtenerParaPresupuesto(id).subscribe({
      next: (data) => {
        this.nombreProyecto = data.productoNombre || '';
        this.descripcion = data.descripcionPersonalizacion || '';
        this.isCustom = data.isCustom;
        this.clienteNombre = data.clienteNombre;
        this.clienteEmail = data.clienteEmail || '';
        this.clienteTelefono = data.clienteTelefono || '';
        this.fechaSolicitud = data.createdAt || '';

        // Si la solicitud está COMPLETADA, bloquear la calculadora automáticamente en solo lectura
        // Se consulta obtenerPorId para evitar desfases de caché en el DTO del backend
        this.requestService.obtenerPorId(id).subscribe({
          next: (reqFull) => {
            const estadoStr = (reqFull.estado || '').toUpperCase();
            if (estadoStr === 'COMPLETADO') {
              this.pagoConfirmado = true;
            } else {
              this.pagoConfirmado = false;
            }
          },
          error: (err) => {
            console.error('Error cargando estado detallado de la solicitud:', err);
            const estadoStr = (data.estado || '').toUpperCase();
            this.pagoConfirmado = estadoStr === 'COMPLETADO';
          }
        });

        // Intentar obtener un presupuesto existente para esta solicitud
        this.budgetService.obtenerPorSolicitud(id).subscribe({
          next: (budget) => {
            if (!budget || !budget.id) {
              this.inicializarConDatosSolicitud(data);
              return;
            }

            this.savedBudgetId = budget.id;
            this.nombreProyecto = budget.nombre;
            this.descripcion = budget.descripcion || '';
            this.manoDeObra = budget.manoDeObra || 0;
            this.margenGanancia = budget.margenGanancia || 30;
            this.requiereAdelanto = budget.adelantoRequerido;
            this.porcentajeAdelanto = budget.adelantoPorcentaje || 50;

            this.materialesAgregados = budget.items.map((item, index) => ({
              id: index + 1,
              materialId: item.materialId,
              nombre: item.materialNombre,
              cantidad: item.cantidad,
              precioUnitario: item.costoUnitario,
              esDelProducto: false,
              esSolicitado: false
            }));
            this.nextId = this.materialesAgregados.length + 1;

            if (budget.servicioExplicacion) {
              this.solicitarExplicacion = budget.servicioExplicacion.incluido;
              this.tipoEvento = budget.servicioExplicacion.tipoEvento || '';
              this.cantidadPersonas = (this.solicitarExplicacion && (!budget.servicioExplicacion.cantidadPersonas || budget.servicioExplicacion.cantidadPersonas <= 0))
                ? 1
                : (budget.servicioExplicacion.cantidadPersonas || 0);
              this.duracionExplicacion = budget.servicioExplicacion.duracionMinutos || 60;
              this.precioExplicacion = budget.servicioExplicacion.precio || 0;
            } else {
              this.solicitarExplicacion = false;
            }

            this.presupuestoGuardado = true;
            this.modoEdicion = false;
            this.isLoading = false;
          },
          error: () => {
            this.inicializarConDatosSolicitud(data);
          }
        });

        // Obtener sala de chat para poder enviar mensajes
        this.chatService.getOrCreateRoom(id).subscribe({
          next: (room) => { this.roomId = room.id; },
          error: (err) => console.warn('No se pudo obtener sala de chat:', err)
        });
      },
      error: (err) => {
        console.error('Error loading solicitud data:', err);
        this.isLoading = false;
      }
    });
  }

  private inicializarConDatosSolicitud(data: any): void {
    this.materialesAgregados = (data.materialesProducto || []).map((mat: any, index: number) => ({
      id: index + 1,
      materialId: mat.materialId || mat.id || '',
      nombre: mat.nombre,
      cantidad: Number(mat.cantidadSugerida) || 1,
      precioUnitario: Number(mat.costoVenta) || 0,
      esDelProducto: true,
      esSolicitado: false
    }));
    this.nextId = this.materialesAgregados.length + 1;

    this.materialesSolicitados = (data.materialesPreferidos || []).map((mat: any) => ({
      materialId: mat.materialId,
      nombre: mat.nombre,
      unidad: mat.unidad,
      costoVenta: mat.costoVenta ? Number(mat.costoVenta) : undefined,
      agregado: false
    }));

    this.materialesDeseados = data.materialesDeseados || '';
    this.solicitarExplicacion = data.solicitarExplicacion || false;
    this.tipoEvento = data.tipoEvento || '';
    this.cantidadPersonas = (this.solicitarExplicacion && (!data.cantidadPersonas || data.cantidadPersonas <= 0))
      ? 1
      : (data.cantidadPersonas || 0);

    if (data.isCustom) {
      this.requiereAdelanto = true;
    }

    this.presupuestoGuardado = false;
    this.modoEdicion = false;
    this.isLoading = false;
  }

  // ── Getters calculados ────────────────────────────────────────────────────

  get totalMateriales(): number {
    return this.materialesAgregados.reduce((sum, m) => sum + (m.cantidad * (m.precioUnitario || 0)), 0);
  }

  get subtotal(): number {
    return this.totalMateriales + (this.manoDeObra || 0) + (this.precioExplicacion || 0);
  }

  get ganancia(): number {
    return this.subtotal * ((this.margenGanancia || 0) / 100);
  }

  get total(): number {
    return this.subtotal + this.ganancia;
  }

  get montoAdelanto(): number {
    if (!this.requiereAdelanto) return 0;
    return this.total * ((this.porcentajeAdelanto || 0) / 100);
  }

  get explicacionLabel(): string {
    if (!this.solicitarExplicacion) return '';
    return `Precio por ${this.duracionExplicacion} min para ${this.cantidadPersonas} personas`;
  }

  safe(n: number | null | undefined): number {
    return Number(n) || 0;
  }

  // Autocomplete & Historial methods
  filtrarMateriales(): void {
    const query = this.busquedaMaterial.trim().toLowerCase();
    if (!query) {
      this.materialesFiltrados = [...this.materialesDisponibles];
    } else {
      this.materialesFiltrados = this.materialesDisponibles.filter(m =>
        m.nombre.toLowerCase().includes(query)
      );
    }
  }

  seleccionarMaterial(mat: { id?: string, nombre: string, precio: number }): void {
    this.materialSeleccionado = mat.nombre;
    this.busquedaMaterial = mat.nombre;
    this.mostrarDropdown = false;
  }

  agregarMaterialDesdeAutocomplete(): void {
    if (!this.materialSeleccionado) {
      const exactMatch = this.materialesDisponibles.find(m => m.nombre.toLowerCase() === this.busquedaMaterial.trim().toLowerCase());
      if (exactMatch) {
        this.materialSeleccionado = exactMatch.nombre;
      } else {
        alert('Por favor selecciona un material válido de la lista predictiva.');
        return;
      }
    }
    this.agregarMaterial();
    this.busquedaMaterial = '';
    this.materialSeleccionado = '';
    this.mostrarDropdown = false;
  }

  onBlurAutocomplete(): void {
    setTimeout(() => {
      this.mostrarDropdown = false;
    }, 200);
  }

  cargarHistorial(): void {
    this.budgetService.listarTodos().subscribe({
      next: (list) => {
        // Ordenar descendente: los presupuestos más recientes primero
        this.historialPresupuestos = list.sort((a: any, b: any) => {
          // Intentar por fecha de creación, luego por ID como fallback
          const dateA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
          const dateB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;
          // Fallback: comparar IDs como strings (UUIDs más recientes tienden a ser mayores)
          return (b.id || '').localeCompare(a.id || '');
        });
      },
      error: (err) => console.error('Error loading budgets history:', err)
    });
  }

  cargarPresupuestoDesdeHistorial(budget: any): void {
    if (budget.solicitudId) {
      this.solicitudId = budget.solicitudId;
      this.loadSolicitudData(budget.solicitudId);
    } else {
      this.savedBudgetId = budget.id;
      this.isCustom = budget.isCustom === undefined ? true : budget.isCustom;
      this.currentMaquetaTipo = this.isCustom ? 'personalizada' : 'catalogo';
      this.nombreProyecto = budget.nombre;
      this.descripcion = budget.descripcion || '';
      this.manoDeObra = budget.manoDeObra || 0;
      this.margenGanancia = budget.margenGanancia || 30;
      this.requiereAdelanto = budget.adelantoRequerido;
      this.porcentajeAdelanto = budget.adelantoPorcentaje || 50;

      this.materialesAgregados = budget.items.map((item: any, index: number) => ({
        id: index + 1,
        materialId: item.materialId,
        nombre: item.materialNombre,
        cantidad: item.cantidad,
        precioUnitario: item.costoUnitario,
        esDelProducto: false,
        esSolicitado: false
      }));
      this.nextId = this.materialesAgregados.length + 1;

      if (budget.servicioExplicacion) {
        this.solicitarExplicacion = budget.servicioExplicacion.incluido;
        this.tipoEvento = budget.servicioExplicacion.tipoEvento || '';
        this.cantidadPersonas = budget.servicioExplicacion.cantidadPersonas || 0;
        this.duracionExplicacion = budget.servicioExplicacion.duracionMinutos || 60;
        this.precioExplicacion = budget.servicioExplicacion.precio || 0;
      } else {
        this.solicitarExplicacion = false;
      }
      this.presupuestoGuardado = true;
      this.modoEdicion = false;

      // Cargar datos de cliente y tipo de compra para presupuestos presenciales
      if (budget.esPresencial) {
        this.tipoCompra = 'presencial';
        this.clienteNombre = budget.clienteNombre || '';
        this.clienteEmail = budget.clienteEmail || '';
        this.clienteTelefono = budget.clienteTelefono || '';
        this.requiereAdelanto = budget.adelantoRequerido || false;
      } else {
        this.tipoCompra = 'online';
      }
    }
  }

  // ── Materiales ────────────────────────────────────────────────────────────

  agregarMaterial(): void {
    if (!this.materialSeleccionado) return;
    const material = this.materialesDisponibles.find(m => m.nombre === this.materialSeleccionado);
    if (!material) return;
    const existente = this.materialesAgregados.find(m => m.nombre === this.materialSeleccionado && !m.esDelProducto);
    if (existente) {
      existente.cantidad += this.cantidadMaterial;
    } else {
      this.materialesAgregados.push({
        id: this.nextId++,
        materialId: material.id || '',
        nombre: material.nombre,
        cantidad: this.cantidadMaterial,
        precioUnitario: material.precio,
        esDelProducto: false,
        esSolicitado: false
      });
    }
    this.materialSeleccionado = '';
    this.cantidadMaterial = 1;
  }

  eliminarMaterial(id: number): void {
    const material = this.materialesAgregados.find(m => m.id === id);
    if (material?.esSolicitado) {
      const solicitado = this.materialesSolicitados.find(s => s.nombre === material.nombre);
      if (solicitado) solicitado.agregado = false;
    }
    this.materialesAgregados = this.materialesAgregados.filter(m => m.id !== id);
  }

  agregarMaterialSolicitado(mat: MaterialSolicitado): void {
    if (mat.agregado) return;
    this.materialesAgregados.push({
      id: this.nextId++,
      materialId: mat.materialId || '',
      nombre: mat.nombre,
      cantidad: 1,
      precioUnitario: mat.costoVenta || 0,
      esDelProducto: false,
      esSolicitado: true
    });
    mat.agregado = true;
  }

  irARegistrarMaterial(mat: MaterialSolicitado): void {
    this.materialService.triggerAddMaterial({
      nombre: mat.nombre,
      unidad: mat.unidad
    });
    this.navegarATabEvent.emit('materiales');
  }

  toggleExplicacion(): void {
    if (this.solicitarExplicacion) {
      if (!this.cantidadPersonas || this.cantidadPersonas <= 0) {
        this.cantidadPersonas = 1;
      }
      if (!this.duracionExplicacion || this.duracionExplicacion <= 0) {
        this.duracionExplicacion = 60;
      }
    }
  }

  validarPersonas(): void {
    if (this.solicitarExplicacion && (!this.cantidadPersonas || this.cantidadPersonas <= 0)) {
      this.cantidadPersonas = 1;
    }
  }

  validarDuracion(): void {
    if (this.solicitarExplicacion && (!this.duracionExplicacion || this.duracionExplicacion <= 0)) {
      this.duracionExplicacion = 15;
    }
  }

  // ── Guardar presupuesto ───────────────────────────────────────────────────

  guardarPresupuesto(): void {
    if (this.pagoConfirmado) {
      alert('No se puede modificar un presupuesto de una venta cerrada.');
      return;
    }
    const tieneMaterialSinRegistrar = this.materialesAgregados.some(m => !m.materialId);
    if (tieneMaterialSinRegistrar) {
      alert('Tienes materiales en la lista que no están registrados en el inventario. Por favor, regístralos o selecciónalos del buscador antes de guardar.');
      return;
    }

    if (this.tipoCompra === 'presencial') {
      if (!this.clienteNombre?.trim()) {
        alert('Por favor ingresa el nombre del cliente.');
        return;
      }
      if (!this.clienteEmail?.trim()) {
        alert('Por favor ingresa el email del cliente.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.clienteEmail.trim())) {
        alert('Por favor ingresa un correo electrónico válido (ejemplo: usuario@dominio.com). Asegúrate de no usar comas en lugar de puntos.');
        return;
      }
    }

    if (this.solicitarExplicacion) {
      if (!this.cantidadPersonas || this.cantidadPersonas <= 0) {
        alert('La cantidad de personas para el servicio de explicación debe ser mayor a 0.');
        return;
      }
      if (!this.duracionExplicacion || this.duracionExplicacion <= 0) {
        alert('La duración para el servicio de explicación debe ser mayor a 0.');
        return;
      }
      if (this.precioExplicacion < 0) {
        alert('El precio del servicio de explicación no puede ser negativo.');
        return;
      }
    }

    this.guardando = true;

    const request: any = {
      nombre: this.nombreProyecto,
      descripcion: this.descripcion,
      manoDeObra: this.manoDeObra || 0,
      margenGanancia: this.margenGanancia || 0,
      adelantoRequerido: this.requiereAdelanto,
      adelantoPorcentaje: this.porcentajeAdelanto || 0,
      isCustom: this.isMaquetaPersonalizada,
      isKit: !this.isMaquetaPersonalizada,
      items: (() => {
        const uniqueItemsMap = new Map<string, number>();
        this.materialesAgregados.forEach(m => {
          if (m.materialId) {
            const current = uniqueItemsMap.get(m.materialId) || 0;
            uniqueItemsMap.set(m.materialId, current + m.cantidad);
          }
        });
        return Array.from(uniqueItemsMap.entries()).map(([materialId, cantidad]) => ({
          materialId,
          cantidad
        }));
      })(),
      servicioExplicacion: this.solicitarExplicacion ? {
        incluido: true,
        tipoEvento: this.tipoEvento,
        cantidadPersonas: this.cantidadPersonas,
        duracionMinutos: this.duracionExplicacion,
        precio: this.precioExplicacion,
        notas: ''
      } : {
        incluido: false,
        precio: 0
      }
    };

    if (this.solicitudId) {
      request.solicitudId = this.solicitudId;
    } else {
      request.esPresencial = true;
      request.clienteNombre = this.clienteNombre;
      request.clienteEmail = this.clienteEmail;
      request.clienteTelefono = this.clienteTelefono || '';
    }

    const saveObs = this.savedBudgetId
      ? this.budgetService.actualizar(this.savedBudgetId, request)
      : this.budgetService.crear(request);

    saveObs.subscribe({
      next: (savedBudget) => {
        this.savedBudgetId = savedBudget.id;
        this.presupuestoGuardado = true;
        this.modoEdicion = false;
        this.guardando = false;
        if (this.solicitudId) {
          this.loadSolicitudData(this.solicitudId!);
        }
        this.cargarHistorial();
      },
      error: (err) => {
        console.error('Error saving budget:', err);
        alert('Error al guardar el presupuesto: ' + (err.error?.message || err.message));
        this.guardando = false;
      }
    });
  }

  activarEdicion(): void {
    if (this.pagoConfirmado) return;
    this.modoEdicion = true;
  }

  enviarPresupuestoAlCliente(): void {
    if (this.pagoConfirmado) {
      alert('No se puede enviar un presupuesto de una venta cerrada.');
      return;
    }
    if (!this.solicitudId) return;

    const tieneMaterialSinRegistrar = this.materialesAgregados.some(m => !m.materialId);
    if (tieneMaterialSinRegistrar) {
      alert('Tienes materiales en la lista que no están registrados en el inventario. Por favor, regístralos o selecciónalos del buscador antes de guardar y enviar.');
      return;
    }

    if (!this.roomId) {
      alert('No se encontró una sala de chat activa para esta solicitud.');
      return;
    }

    if (this.solicitarExplicacion) {
      if (!this.cantidadPersonas || this.cantidadPersonas <= 0) {
        alert('La cantidad de personas para el servicio de explicación debe ser mayor a 0.');
        return;
      }
      if (!this.duracionExplicacion || this.duracionExplicacion <= 0) {
        alert('La duración para el servicio de explicación debe ser mayor a 0.');
        return;
      }
      if (this.precioExplicacion < 0) {
        alert('El precio del servicio de explicación no puede ser negativo.');
        return;
      }
    }

    this.enviando = true;

    const request: any = {
      solicitudId: this.solicitudId,
      nombre: this.nombreProyecto,
      descripcion: this.descripcion,
      manoDeObra: this.manoDeObra || 0,
      margenGanancia: this.margenGanancia || 0,
      adelantoRequerido: this.requiereAdelanto,
      adelantoPorcentaje: this.porcentajeAdelanto || 0,
      items: (() => {
        const uniqueItemsMap = new Map<string, number>();
        this.materialesAgregados.forEach(m => {
          if (m.materialId) {
            const current = uniqueItemsMap.get(m.materialId) || 0;
            uniqueItemsMap.set(m.materialId, current + m.cantidad);
          }
        });
        return Array.from(uniqueItemsMap.entries()).map(([materialId, cantidad]) => ({
          materialId,
          cantidad
        }));
      })(),
      servicioExplicacion: this.solicitarExplicacion ? {
        incluido: true,
        tipoEvento: this.tipoEvento,
        cantidadPersonas: this.cantidadPersonas,
        duracionMinutos: this.duracionExplicacion,
        precio: this.precioExplicacion,
        notas: ''
      } : {
        incluido: false,
        precio: 0
      }
    };

    if (!this.solicitudId) {
      request.esPresencial = true;
      request.clienteNombre = this.clienteNombre;
      request.clienteEmail = this.clienteEmail;
      request.clienteTelefono = this.clienteTelefono || '';
    }

    const saveObs = this.savedBudgetId
      ? this.budgetService.actualizar(this.savedBudgetId, request)
      : this.budgetService.crear(request);

    saveObs.subscribe({
      next: (savedBudget) => {
        this.savedBudgetId = savedBudget.id;
        this.presupuestoGuardado = true;
        this.modoEdicion = false;
        this.cargarHistorial();

        this.chatService.connect();


        const adelantoTexto = this.requiereAdelanto
          ? `\n⚠ ADELANTO REQUERIDO:\nPara iniciar la fabricación de tu maqueta personalizada, necesitamos un adelanto del ${this.porcentajeAdelanto}%:\nMonto del adelanto: S/ ${this.montoAdelanto.toFixed(2)}\n\nUna vez confirmado el pago del adelanto, comenzaremos con la elaboración.`
          : '';

        const mensaje = `Hola ${this.clienteEmail}, hemos actualizado el presupuesto para tu maqueta "${this.nombreProyecto}".\n\nPrecio Total: S/ ${this.total.toFixed(2)}\n\nIncluye materiales de calidad y mano de obra especializada.${adelantoTexto}\n\n¿Tienes alguna pregunta?`;

        const materialesMetadata = this.materialesAgregados.map(m => ({
          nombre: m.nombre,
          cantidad: m.cantidad,
          precioUnitario: m.precioUnitario,
          subtotal: m.cantidad * (m.precioUnitario || 0)
        }));

        const metadata = JSON.stringify({
          budgetId: savedBudget.codigoReferencia,
          proyectoNombre: this.nombreProyecto,
          totalAmount: this.total,
          adelantoAmount: this.montoAdelanto,
          porcentajeAdelanto: this.porcentajeAdelanto,
          requiereAdelanto: this.requiereAdelanto,
          manoDeObra: this.manoDeObra,
          margenGanancia: this.margenGanancia,
          materiales: materialesMetadata
        });

        // Conectar WS y esperar conexión para enviar
        let sub: any;
        sub = this.chatService.connectionStatus$.subscribe(connected => {
          if (connected && this.roomId) {
            this.chatService.sendMessage(this.roomId, mensaje, 'BUDGET', metadata);
            this.enviando = false;
            setTimeout(() => {
              if (sub) {
                sub.unsubscribe();
              }
            }, 0);
          }
        });

        // Si ya estaba conectado, forzar envío inmediato
        setTimeout(() => {
          if (this.enviando && this.roomId) {
            this.chatService.sendMessage(this.roomId, mensaje, 'BUDGET', metadata);
            this.enviando = false;
            if (sub) {
              sub.unsubscribe();
            }
          }
        }, 1000);
      },
      error: (err) => {
        console.error('Error saving budget before sending:', err);
        alert('Error al guardar el presupuesto antes de enviar: ' + (err.error?.message || err.message));
        this.enviando = false;
      }
    });
  }  // ── Modal adelanto ────────────────────────────────────────────────────────

  abrirModalAdelanto(): void {
    this.showAdelantoModal = true;
    this.generarQR();
  }

  cerrarModalAdelanto(): void {
    this.showAdelantoModal = false;
    this.copiado = false;
  }

  copiarAlPortapapeles(texto: string): void {
    navigator.clipboard.writeText(texto).then(() => {
      this.copiado = true;
      setTimeout(() => { this.copiado = false; }, 2000);
    });
  }

  imprimirQR(): void {
    window.print();
  }

  private generarQR(): void {
    // Generamos QR con datos de pago usando la API pública de QR
    const datos = encodeURIComponent(`Pago adelanto maqueta: S/ ${this.montoAdelanto.toFixed(2)}\nTel: ${this.vendedorTelefono}\nProyecto: ${this.nombreProyecto}`);
    this.qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${datos}&color=0f766e&bgcolor=ffffff`;
  }

  // ── Boleta presencial ─────────────────────────────────────────────────────

  imprimirBoletaPresencial(tipo: 'adelanto' | 'completo'): void {
    this.boletaTipo = tipo;

    const ejecutarImpresion = () => {
      this.imprimiendoBoleta = true;
      // Pequeño delay para que Angular actualice la vista antes de abrir el diálogo
      setTimeout(() => {
        window.print();
        this.imprimiendoBoleta = false;
      }, 150);
    };

    if (!this.savedBudgetId) {
      // Guardar primero y luego imprimir
      if (!this.solicitudId && !this.nombreProyecto) {
        alert('Por favor completa el nombre del proyecto antes de imprimir la boleta.');
        return;
      }
      this.guardarPresupuesto();
      // Esperamos a que guardando se ponga en false para imprimir
      const checkGuardado = setInterval(() => {
        if (!this.guardando) {
          clearInterval(checkGuardado);
          if (this.presupuestoGuardado || !this.solicitudId) {
            ejecutarImpresion();
          }
        }
      }, 200);
    } else {
      ejecutarImpresion();
    }
  }

  irARegistrarPago(): void {
    const materialsStr = this.materialesAgregados
      .map(m => `${m.cantidad}x ${m.nombre}`)
      .join(', ') || 'Sin materiales adicionales';

    const esPresencial = this.tipoCompra === 'presencial';

    const paymentData = {
      client: this.clienteNombre || 'Cliente Presencial',
      email: this.clienteEmail || `${(this.clienteNombre || 'caja').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      phone: this.clienteTelefono || '999999999',
      productType: this.isMaquetaPersonalizada ? 'Proyecto Personalizado (Maqueta a Medida)' : `Maqueta Estándar: ${this.nombreProyecto}`,
      materials: materialsStr,
      amount: esPresencial ? this.total : this.montoAdelanto,
      method: esPresencial ? 'Fisico (Efectivo en persona)' : 'Digital (Yape / Transferencia)',
      kind: esPresencial ? 'Pago Completo (100%)' : 'Adelanto (50%)',
      date: new Date().toISOString().substring(0, 16),
      operation: '',
      inventory: true,
      solicitudId: this.solicitudId,
      roomId: this.roomId,
      voucherUrl: '',
      materialesDetalle: this.materialesAgregados.map(m => ({
        materialId: m.materialId,
        nombre: m.nombre,
        cantidadSugerida: m.cantidad,
        costoVenta: m.precioUnitario
      })),
      isKit: this.currentMaquetaTipo === 'kit',
      kitNombre: this.nombreProyecto
    };

    this.navegarAPagosEvent.emit(paymentData);
  }

  // ── Resetear ─────────────────────────────────────────────────────────────

  nuevoPresupuesto(): void {
    this.nombreProyecto = '';
    this.descripcion = '';
    this.materialesAgregados = [];
    this.materialesSolicitados = [];
    this.materialesDeseados = '';
    this.manoDeObra = 0;
    this.margenGanancia = 30;
    this.requiereAdelanto = false;
    this.porcentajeAdelanto = 50;
    this.isCustom = false;
    this.solicitarExplicacion = false;
    this.tipoEvento = '';
    this.cantidadPersonas = 0;
    this.duracionExplicacion = 60;
    this.precioExplicacion = 0;
    this.presupuestoGuardado = false;
    this.modoEdicion = false;
    this.pagoConfirmado = false;
    this.roomId = null;
    this.selectedMaquetaId = '';
    this.busquedaMaqueta = '';
    this.currentMaquetaTipo = 'catalogo';
    this.tipoCompra = 'presencial';
    this.boletaTipo = 'completo';
    this.today = new Date();
    this.clienteNombre = '';
    this.clienteEmail = '';
    this.clienteTelefono = '';
    this.solicitudId = null;
    this.savedBudgetId = null;
    this.activeTab = 'calculadora';
  }

  // ── Gestión de Kits ───────────────────────────────────────────────────────

  saveKits(updatedKits: any[]): void {
    this.kitsGuardados = updatedKits;
    localStorage.setItem('kitsCompletos', JSON.stringify(updatedKits));
  }

  handleEditKit(kit: any): void {
    this.editingKitId = kit.id;
    this.isAddingKit = false;
    this.kitFormData = {
      maquetaId: kit.maquetaId,
      descripcion: kit.descripcion || ''
    };
    this.kitMaterialesForm = (kit.materiales || []).map((m: any) => ({
      materialNombre: m.materialNombre,
      cantidad: m.cantidad
    }));
    this.activeTab = 'kits';
  }

  handleSaveKit(): void {
    const maqueta = this.catalogMaquetas.find(p => p.id === this.kitFormData.maquetaId);
    if (!maqueta) {
      alert('Por favor selecciona una maqueta');
      return;
    }

    const calculatedPrice = this.calcularTotalKit(this.kitMaterialesForm);

    if (this.editingKitId) {
      const updated = this.kitsGuardados.map(k =>
        k.id === this.editingKitId ? {
          id: this.editingKitId,
          maquetaId: this.kitFormData.maquetaId,
          maquetaNombre: maqueta.titulo,
          precioTotal: calculatedPrice,
          descripcion: this.kitFormData.descripcion,
          materiales: this.kitMaterialesForm
        } : k
      );
      this.saveKits(updated);
      this.editingKitId = null;
    } else if (this.isAddingKit) {
      const existingKit = this.kitsGuardados.find(k => k.maquetaId === this.kitFormData.maquetaId);
      if (existingKit) {
        alert('Ya existe un kit completo para esta maqueta. Puedes editarlo en lugar de crear uno nuevo.');
        return;
      }

      const newKit = {
        id: Date.now().toString(),
        maquetaId: this.kitFormData.maquetaId,
        maquetaNombre: maqueta.titulo,
        precioTotal: calculatedPrice,
        descripcion: this.kitFormData.descripcion,
        materiales: this.kitMaterialesForm
      };
      this.saveKits([...this.kitsGuardados, newKit]);
      this.isAddingKit = false;
    }

    this.kitFormData = { maquetaId: '', descripcion: '' };
    this.kitMaterialesForm = [];
  }

  handleDeleteKit(id: string): void {
    if (confirm('¿Estás seguro de eliminar este kit completo?')) {
      this.saveKits(this.kitsGuardados.filter(k => k.id !== id));
    }
  }

  handleCancelKit(): void {
    this.editingKitId = null;
    this.isAddingKit = false;
    this.kitFormData = { maquetaId: '', descripcion: '' };
    this.kitMaterialesForm = [];
  }

  agregarMaterialKit(): void {
    this.kitMaterialesForm.push({ materialNombre: '', cantidad: 1 });
  }

  eliminarMaterialKit(index: number): void {
    this.kitMaterialesForm.splice(index, 1);
  }

  calcularTotalKit(materiales: { materialNombre: string; cantidad: number }[]): number {
    return materiales.reduce((sum, matKit) => {
      const mat = this.materialesDisponibles.find(m => m.nombre === matKit.materialNombre);
      return sum + (matKit.cantidad * (mat?.precio || 0));
    }, 0);
  }

  onEditKitSelected(): void {
    const kit = this.kitsGuardados.find(k => k.id === this.kitSeleccionadoId);
    if (kit) {
      this.editingKitId = kit.id;
      this.isAddingKit = false;
      this.kitFormData = {
        maquetaId: kit.maquetaId,
        descripcion: kit.descripcion || ''
      };
      this.kitMaterialesForm = kit.materiales ? [...kit.materiales] : [];
    }
  }

  onDeleteKitSelected(): void {
    if (confirm('¿Estás seguro de eliminar este kit?')) {
      const id = this.kitSeleccionadoId;
      this.saveKits(this.kitsGuardados.filter(k => k.id !== id));
      this.kitSeleccionadoId = '';
      this.materialesAgregados = [];
      this.nombreProyecto = '';
    }
  }

  completarPagoPresencial(): void {
    if (this.materialesAgregados.length === 0) {
      alert('No hay materiales agregados en este presupuesto.');
      return;
    }

    const tieneMaterialSinRegistrar = this.materialesAgregados.some(m => !m.materialId);
    if (tieneMaterialSinRegistrar) {
      alert('Algunos materiales no están registrados en el inventario. Por favor, regístralos antes de completar el pago para poder descontar el stock.');
      return;
    }

    if (confirm('¿Confirmas que el cliente ha completado el pago de esta maqueta/kit presencial? Esto descontará automáticamente los materiales del inventario en el backend.')) {
      this.guardando = true;

      // Obtener todos los materiales actuales del backend para asegurarnos de tener el stock fresco
      this.materialService.getAllMaterials().subscribe({
        next: (materialsFromBackend) => {
          let actualizacionesPendientes = this.materialesAgregados.length;
          let errores = 0;

          this.materialesAgregados.forEach(item => {
            const match = materialsFromBackend.find(m => m.id === item.materialId || m.nombre === item.nombre);
            if (match) {
              const nuevoStock = Math.max(0, match.stockActual - item.cantidad);
              const requestPayload = {
                nombre: match.nombre,
                unidad: match.unidad,
                costoCompra: match.costoCompra,
                costoVenta: match.costoVenta,
                stockActual: nuevoStock,
                categoriaId: match.categoriaId,
                proveedor: match.proveedor,
                activo: match.activo
              };

              this.materialService.updateMaterial(match.id, requestPayload).subscribe({
                next: () => {
                  actualizacionesPendientes--;
                  if (actualizacionesPendientes === 0) {
                    this.guardando = false;
                    this.pagoConfirmado = true;
                    alert('¡Pago completado con éxito! El stock de los materiales utilizados ha sido descontado del inventario backend.');
                  }
                },
                error: (err) => {
                  console.error('Error al actualizar material:', match.nombre, err);
                  errores++;
                  actualizacionesPendientes--;
                  if (actualizacionesPendientes === 0) {
                    this.guardando = false;
                    this.pagoConfirmado = true;
                    alert(`Pago registrado, pero ocurrieron ${errores} errores al intentar actualizar el stock de algunos materiales.`);
                  }
                }
              });
            } else {
              actualizacionesPendientes--;
              if (actualizacionesPendientes === 0) {
                this.guardando = false;
                this.pagoConfirmado = true;
                alert('Pago registrado. Algunos materiales no se encontraron en el catálogo del backend para actualizar el stock.');
              }
            }
          });
        },
        error: (err) => {
          console.error('Error al obtener materiales del backend:', err);
          this.guardando = false;
          alert('No se pudo conectar con el inventario del backend para descontar el stock.');
        }
      });
    }
  }
}
