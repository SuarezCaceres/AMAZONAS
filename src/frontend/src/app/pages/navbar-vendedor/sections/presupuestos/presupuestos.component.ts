import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { ChatService } from '../../../../services/chat.service';
import { BudgetService } from '../../../../services/budget.service';
import { MaterialService } from '../../../../services/material.service';
import { Material } from '../../../../models/material.model';

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

  private readonly requestService = inject(PurchaseRequestService);
  private readonly chatService = inject(ChatService);
  private readonly budgetService = inject(BudgetService);
  private readonly materialService = inject(MaterialService);

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

  // ── Explicación ──────────────────────────────────────────────────────────
  solicitarExplicacion = false;
  tipoEvento = '';
  cantidadPersonas = 0;
  duracionExplicacion = 60;
  precioExplicacion: number = 0;

  materialesDisponibles: { id?: string, nombre: string, precio: number }[] = [];

  private nextId = 1;
  private roomId: string | null = null;
  savedBudgetId: string | null = null;

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadMateriales();
    this.cargarHistorial();
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


  loadSolicitudData(id: string): void {
    this.isLoading = true;
    this.savedBudgetId = null;

    this.requestService.obtenerParaPresupuesto(id).subscribe({
      next: (data) => {
        this.nombreProyecto = data.productoNombre || '';
        this.descripcion = data.descripcionPersonalizacion || '';
        this.isCustom = data.isCustom;
        this.clienteNombre = data.clienteNombre;
        this.clienteEmail = data.clienteEmail || '';
        this.clienteTelefono = data.clienteTelefono || '';
        this.fechaSolicitud = data.createdAt || '';

        // Intentar obtener un presupuesto existente para esta solicitud
        this.budgetService.obtenerPorSolicitud(id).subscribe({
          next: (budget) => {
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
            // No existe presupuesto, inicializar con datos de la solicitud
            this.materialesAgregados = data.materialesProducto.map((mat, index) => ({
              id: index + 1,
              materialId: mat.id,
              nombre: mat.nombre,
              cantidad: Number(mat.cantidadSugerida) || 1,
              precioUnitario: Number(mat.costoVenta) || 0,
              esDelProducto: true,
              esSolicitado: false
            }));
            this.nextId = this.materialesAgregados.length + 1;

            this.materialesSolicitados = (data.materialesPreferidos || []).map(mat => ({
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
        this.historialPresupuestos = list;
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
    if (!this.solicitudId) return;

    const tieneMaterialSinRegistrar = this.materialesAgregados.some(m => !m.materialId);
    if (tieneMaterialSinRegistrar) {
      alert('Tienes materiales en la lista que no están registrados en el inventario. Por favor, regístralos o selecciónalos del buscador antes de guardar.');
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

    this.guardando = true;

    const request = {
      solicitudId: this.solicitudId,
      nombre: this.nombreProyecto,
      descripcion: this.descripcion,
      manoDeObra: this.manoDeObra || 0,
      margenGanancia: this.margenGanancia || 0,
      adelantoRequerido: this.requiereAdelanto,
      adelantoPorcentaje: this.porcentajeAdelanto || 0,
      items: this.materialesAgregados.map(m => ({
        materialId: m.materialId,
        cantidad: m.cantidad
      })),
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

    const saveObs = this.savedBudgetId 
      ? this.budgetService.actualizar(this.savedBudgetId, request)
      : this.budgetService.crear(request);

    saveObs.subscribe({
      next: (savedBudget) => {
        this.savedBudgetId = savedBudget.id;
        this.presupuestoGuardado = true;
        this.modoEdicion = false;
        this.guardando = false;
        this.loadSolicitudData(this.solicitudId!);
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
    this.modoEdicion = true;
  }

  enviarPresupuestoAlCliente(): void {
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

    const request = {
      solicitudId: this.solicitudId,
      nombre: this.nombreProyecto,
      descripcion: this.descripcion,
      manoDeObra: this.manoDeObra || 0,
      margenGanancia: this.margenGanancia || 0,
      adelantoRequerido: this.requiereAdelanto,
      adelantoPorcentaje: this.porcentajeAdelanto || 0,
      items: this.materialesAgregados.map(m => ({
        materialId: m.materialId,
        cantidad: m.cantidad
      })),
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
    this.roomId = null;
  }
}
