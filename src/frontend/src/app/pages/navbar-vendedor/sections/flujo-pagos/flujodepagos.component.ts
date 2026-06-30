import { CommonModule } from '@angular/common';
import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../services/chat.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { MaterialService } from '../../../../services/material.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { BudgetService } from '../../../../services/budget.service';


type PaymentMethod = 'Online' | 'Fisico';
type PaymentKind = 'Abono' | 'Adelanto' | 'Saldo' | 'Total';

interface PaymentForm {
    client: string;
    email: string;
    phone: string;
    productType: string;
    materials: string;
    amount: number | null;
    method: string;
    kind: string;
    date: string;
    operation: string;
    inventory: boolean;
    voucherUrl?: string;
}

interface PendingBalance {
    client: string;
    email: string;
    project: string;
    materials: string;
    method: PaymentMethod;
    amount: number;
    dueDate: string;
    solicitudId?: string;
}

interface Transaction {
    client: string;
    email: string;
    productType: string;
    materials: string;
    method: PaymentMethod;
    kind: PaymentKind;
    amount: number;
    operation: string;
    date: string;
    status: 'online' | 'fisico';
    projectName?: string;
    solicitudId?: string;
}

@Component({
    selector: 'app-flujodepagos',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './flujodepagos.component.html',
    styleUrl: './flujodepagos.component.css'
})
export class FlujoDePagosComponent implements OnInit, OnChanges {
    private readonly chatService = inject(ChatService);
    private readonly requestService = inject(PurchaseRequestService);
    private readonly materialService = inject(MaterialService);
    private readonly maquetaService = inject(MaquetaService);
    private readonly budgetService = inject(BudgetService);

    @Input() prefilledData: any = null;
    @Output() pagoRegistrado = new EventEmitter<void>();

    selectedReceipt: Transaction | null = null;
    exportLabel = 'Exportar CSV';
    isPrefilled = false;

    paymentForm: PaymentForm = {
        client: '',
        email: '',
        phone: '',
        productType: '',
        materials: '',
        amount: null,
        method: '',
        kind: '',
        date: '',
        operation: '',
        inventory: true,
        voucherUrl: ''
    };

    productTypes = [
        'Proyecto Personalizado (Maqueta a Medida)',
        'Proyecto Predeterminado (Catalogo)'
    ];

    paymentMethods = [
        'Online (Yape / Transferencia)',
        'Fisico (Efectivo en persona)'
    ];

    paymentKinds = [
        'Adelanto (50%)',
        'Saldo Restante (50%)',
        'Pago Completo (100%)'
    ];

    methodFilters = [
        { value: 'TODOS', label: 'Todos los métodos' },
        { value: 'ONLINE', label: 'Pago Online (Yape / Plin / Transf)' },
        { value: 'FISICO', label: 'Pago Físico (Efectivo en Caja)' }
    ];

    kindFilters = [
        { value: 'TODOS', label: 'Todos los abonos' },
        { value: 'ADELANTO', label: 'Adelantos (50%)' },
        { value: 'SALDO', label: 'Saldos restantes' },
        { value: 'TOTAL', label: 'Pagos completos (100%)' }
    ];

    selectedMethodFilter = 'TODOS';
    selectedKindFilter = 'TODOS';
    searchTerm = '';

    pendingBalances: PendingBalance[] = [];
    transactions: Transaction[] = [];
    allBudgets: any[] = [];
    dailyStats = {
        ventasTotales: 0,
        metodoOnlineCount: 0,
        metodoFisicoCount: 0
    };

    // =========================================================================
    // NUEVO ESTADO DEL PROTOTIPO (ISSUE 3)
    // =========================================================================
    activeSubTab: 'dashboard' | 'venta' | 'saldos' | 'auditoria' = 'dashboard';
    filtroPeriodoDashboard: 'hoy' | 'semana' | 'mes' = 'mes';

    get transaccionesFiltradasDashboard(): Transaction[] {
        const hoy = new Date();
        return this.transactions.filter(tx => {
            const f = (tx as any).fechaObj;
            if (!f) return false;
            if (this.filtroPeriodoDashboard === 'hoy') {
                return f.getDate() === hoy.getDate() &&
                       f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            } else if (this.filtroPeriodoDashboard === 'semana') {
                const diffTime = Math.abs(hoy.getTime() - f.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            } else { // mes
                return f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            }
        });
    }

    get totalHoy(): number {
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                return f && f.getDate() === hoy.getDate() &&
                       f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            })
            .reduce((sum, tx) => sum + tx.amount, 0);
    }

    get totalSemana(): number {
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                if (!f) return false;
                const diffTime = Math.abs(hoy.getTime() - f.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            })
            .reduce((sum, tx) => sum + tx.amount, 0);
    }

    get totalMes(): number {
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                return f && f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            })
            .reduce((sum, tx) => sum + tx.amount, 0);
    }

    get gananciaHoy(): number {
        return this.totalHoy * 0.3;
    }

    get gananciaSemana(): number {
        return this.totalSemana * 0.3;
    }

    get gananciaMes(): number {
        return this.totalMes * 0.3;
    }

    get totalGananciaAcumulada(): number {
        return this.transactions.reduce((sum, tx) => sum + tx.amount, 0) * 0.3;
    }

    get maquetasVendidasStats(): { pred: number, custom: number } {
        const txs = this.transaccionesFiltradasDashboard;
        let pred = 0;
        let custom = 0;
        txs.forEach(tx => {
            if (tx.productType === 'Predeterminada') {
                pred++;
            } else {
                custom++;
            }
        });
        return { pred, custom };
    }

    get materialesConsumidos(): { nombre: string, cantidad: number }[] {
        const txs = this.transaccionesFiltradasDashboard;
        const countMap: { [key: string]: number } = {};
        
        txs.forEach(tx => {
            if (!tx.materials) return;
            const parts = tx.materials.split(',');
            parts.forEach(p => {
                const nombre = p.trim();
                if (nombre && nombre !== 'Materiales estándar' && nombre !== 'N/A' && nombre !== 'Ninguno') {
                    let cleanName = nombre;
                    let qty = 1;
                    const match = nombre.match(/^(\d+)x\s*(.*)/);
                    if (match) {
                        qty = parseInt(match[1], 10);
                        cleanName = match[2];
                    }
                    countMap[cleanName] = (countMap[cleanName] || 0) + qty;
                }
            });
        });

        return Object.keys(countMap).map(key => ({
            nombre: key,
            cantidad: countMap[key]
        })).sort((a, b) => b.cantidad - a.cantidad);
    }

    currentMaquetaTipo: 'catalogo' | 'personalizada' = 'catalogo';
    catalogMaquetas: any[] = [];
    selectedMaqueta: any = null;
    selectedPersonalizadaPrice = 27.00;
    maqAlto = 30;
    maqAncho = 30;
    maqLargo = 30;

    catalogMateriales: any[] = [];
    selectedMaterialId = '';
    selectedMaterialQty = 1;
    selectedMaterialStockLabel = '';
    cartMaterials: { id: string; name: string; price: number; qty: number; unit?: string }[] = [];

    // Modal state for Balance Payment (Cobro Físico)
    showCobroFisicoModal = false;
    cobroVentaId = '';
    cobroClienteDisplay = '';
    cobroMonto = 0;
    cobroMetodo = 'Fisico (Efectivo en persona)';
    uploadedVoucherName = '';
    uploadedVoucherFile: File | null = null;
    currentBalanceForModal: any = null;

    // Premium payment checkout states
    activePaymentMethod: 'yape' | 'transferencia' | 'efectivo' = 'yape';
    cobroNumeroOperacion = '';
    cobroCodigoSeguridad = '';
    cobroMontoRecibido = 0;
    copiadoExitoso = false;

    get cobroVuelto(): number {
        if (this.activePaymentMethod !== 'efectivo' || !this.cobroMontoRecibido) return 0;
        const vuelto = this.cobroMontoRecibido - this.cobroMonto;
        return vuelto > 0 ? Number(vuelto.toFixed(2)) : 0;
    }

    copiarNumeroYape(): void {
        navigator.clipboard.writeText('923932945').then(() => {
            this.copiadoExitoso = true;
            setTimeout(() => {
                this.copiadoExitoso = false;
            }, 2000);
        });
    }

    // Selected Transaction for receipt view/print
    selectedReceiptForPrint: any = null;

    setSubTab(tab: 'dashboard' | 'venta' | 'saldos' | 'auditoria'): void {
        this.activeSubTab = tab;
        if (tab === 'auditoria' || tab === 'dashboard') {
            this.loadTransactions();
            this.loadDailyStats();
        } else if (tab === 'saldos') {
            this.loadPendingBalances();
        }
    }

    ngOnInit(): void {
        this.loadTransactions();
        this.loadPendingBalances();
        this.loadDailyStats();
        this.loadCatalogMateriales();
        this.loadCatalogMaquetas();
        
        // Initial setup for form defaults
        this.paymentForm.method = this.paymentMethods[1]; // Físico
        this.paymentForm.kind = this.paymentKinds[2]; // Pago Completo
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['prefilledData'] && this.prefilledData) {
            this.isPrefilled = true;
            this.paymentForm = {
                client: this.prefilledData.client || '',
                email: this.prefilledData.email || '',
                phone: this.prefilledData.phone || '',
                productType: this.prefilledData.productType || '',
                materials: this.prefilledData.materials || '',
                amount: this.prefilledData.amount || null,
                method: this.prefilledData.method || '',
                kind: this.prefilledData.kind || '',
                date: this.prefilledData.date || new Date().toISOString().substring(0, 16),
                operation: this.prefilledData.operation || '',
                inventory: this.prefilledData.inventory ?? true,
                voucherUrl: this.prefilledData.voucherUrl || ''
            };
            (this.paymentForm as any).roomId = this.prefilledData.roomId;
            (this.paymentForm as any).solicitudId = this.prefilledData.solicitudId;
            (this.paymentForm as any).messageId = this.prefilledData.messageId;

            // Sync legacy prefilled data with prototype fields
            if (this.paymentForm.productType.includes('Personalizado')) {
                this.currentMaquetaTipo = 'personalizada';
            } else {
                this.currentMaquetaTipo = 'catalogo';
            }

            // Sync prefilled materials list into cartMaterials
            if (this.prefilledData.materialesDetalle && this.prefilledData.materialesDetalle.length > 0) {
                this.cartMaterials = this.prefilledData.materialesDetalle.map((m: any) => ({
                    id: m.materialId || `mat-${Math.random()}`,
                    name: m.nombre,
                    price: m.costoVenta || 0,
                    qty: m.cantidadSugerida || m.cantidad || 1
                }));
            } else {
                this.cartMaterials = [];
            }
        } else if (changes['prefilledData'] && !this.prefilledData) {
            this.isPrefilled = false;
            this.cartMaterials = [];
        }
    }

    loadTransactions(): void {
        this.requestService.listarTodas().subscribe({
            next: (reqs) => {
                this.budgetService.listarTodos().subscribe({
                    next: (budgets) => {
                        this.allBudgets = budgets || [];
                        this.chatService.getMyRooms().subscribe({
                            next: (rooms) => {
                                const chatRooms = rooms || [];
                                this.chatService.getAllTransactions().subscribe({
                                    next: (mats) => {
                                        if (mats) {
                                            this.transactions = mats.map(tx => {
                                                let projectName = '';
                                                let solicitudId = tx.roomId;

                                                if (tx.roomId) {
                                                    const room = chatRooms.find(r => r.id === tx.roomId);
                                                    if (room) {
                                                        solicitudId = room.requestId;
                                                    }
                                                }

                                                if (solicitudId && reqs) {
                                                    const sol = reqs.find(r => r.id === solicitudId);
                                                    if (sol) {
                                                        projectName = sol.productoNombre || '';
                                                    }
                                                }

                                                if (!projectName) {
                                                    projectName = tx.tipoMaqueta === 'PERSONALIZADA' ? 'Proyecto Personalizado' : 'Proyecto Catálogo';
                                                }

                                                return {
                                                    client: tx.clientName,
                                                    email: tx.clientEmail,
                                                    productType: tx.tipoMaqueta === 'PERSONALIZADA' ? 'Personalizada' : 'Predeterminada',
                                                    materials: tx.materiales || 'Materiales estándar',
                                                    method: tx.metodoPago === 'ONLINE' ? 'Online' : 'Fisico',
                                                    kind: tx.tipoAbono === 'ADELANTO' ? 'Adelanto' : tx.tipoAbono === 'SALDO' ? 'Saldo' : 'Total',
                                                    amount: Number(tx.monto),
                                                    operation: tx.codigoOperacion || 'N/A',
                                                    date: new Date(tx.fechaTransaccion).toLocaleDateString('es-PE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }),
                                                    status: tx.metodoPago === 'ONLINE' ? 'online' : 'fisico',
                                                    fechaObj: new Date(tx.fechaTransaccion),
                                                    projectName: projectName,
                                                    solicitudId: solicitudId
                                                };
                                            });
                                        }
                                    },
                                    error: (err) => console.error('Error al cargar transacciones reales:', err)
                                });
                            },
                            error: (err) => console.error('Error al cargar salas de chat para traducción de roomId:', err)
                        });
                    },
                    error: (err) => console.error('Error al cargar presupuestos en auditoría:', err)
                });
            },
            error: (err) => {
                console.error('Error al cargar solicitudes para join, procediendo de forma directa:', err);
                this.budgetService.listarTodos().subscribe({
                    next: (budgets) => {
                        this.allBudgets = budgets || [];
                        this.chatService.getMyRooms().subscribe({
                            next: (rooms) => {
                                const chatRooms = rooms || [];
                                this.chatService.getAllTransactions().subscribe({
                                    next: (mats) => {
                                        if (mats) {
                                            this.transactions = mats.map(tx => {
                                                let solicitudId = tx.roomId;
                                                if (tx.roomId) {
                                                    const room = chatRooms.find(r => r.id === tx.roomId);
                                                    if (room) {
                                                        solicitudId = room.requestId;
                                                    }
                                                }
                                                return {
                                                    client: tx.clientName,
                                                    email: tx.clientEmail,
                                                    productType: tx.tipoMaqueta === 'PERSONALIZADA' ? 'Personalizada' : 'Predeterminada',
                                                    materials: tx.materiales || 'Materiales estándar',
                                                    method: tx.metodoPago === 'ONLINE' ? 'Online' : 'Fisico',
                                                    kind: tx.tipoAbono === 'ADELANTO' ? 'Adelanto' : tx.tipoAbono === 'SALDO' ? 'Saldo' : 'Total',
                                                    amount: Number(tx.monto),
                                                    operation: tx.codigoOperacion || 'N/A',
                                                    date: new Date(tx.fechaTransaccion).toLocaleDateString('es-PE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }),
                                                    status: tx.metodoPago === 'ONLINE' ? 'online' : 'fisico',
                                                    fechaObj: new Date(tx.fechaTransaccion),
                                                    projectName: tx.tipoMaqueta === 'PERSONALIZADA' ? 'Proyecto Personalizado' : 'Proyecto Catálogo',
                                                    solicitudId: solicitudId
                                                };
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    loadPendingBalances(): void {
        this.requestService.listarTodas().subscribe({
            next: (reqs) => {
                if (reqs) {
                    this.budgetService.listarTodos().subscribe({
                        next: (budgets) => {
                            this.pendingBalances = reqs
                                .filter(r => r.estado === 'PROCESANDO')
                                .map(r => {
                                    const budget = budgets ? budgets.find(b => b.solicitudId === r.id) : null;
                                    let amount = r.isCustom ? 187.85 : 120.00;
                                    if (budget) {
                                        amount = budget.total - budget.adelantoMonto;
                                    }
                                    return {
                                        client: r.clienteNombre,
                                        email: r.clienteEmail,
                                        project: r.productoNombre || 'Proyecto Maqueta',
                                        materials: r.materialesDeseados || 'Materiales estándar',
                                        method: r.isCustom ? 'Online' as PaymentMethod : 'Fisico' as PaymentMethod,
                                        amount: amount,
                                        dueDate: 'En proceso',
                                        solicitudId: r.id
                                    };
                                });
                        },
                        error: (err) => {
                            console.error('Error al listar presupuestos para saldos pendientes, usando fallback:', err);
                            this.pendingBalances = reqs
                                .filter(r => r.estado === 'PROCESANDO')
                                .map(r => ({
                                    client: r.clienteNombre,
                                    email: r.clienteEmail,
                                    project: r.productoNombre || 'Proyecto Maqueta',
                                    materials: r.materialesDeseados || 'Materiales estándar',
                                    method: r.isCustom ? 'Online' as PaymentMethod : 'Fisico' as PaymentMethod,
                                    amount: r.isCustom ? 187.85 : 120.00,
                                    dueDate: 'En proceso',
                                    solicitudId: r.id
                                }));
                        }
                    });
                }
            },
            error: (err) => console.error('Error al cargar saldos pendientes reales:', err)
        });
    }

    loadDailyStats(): void {
        this.chatService.getDailyStats().subscribe({
            next: (stats) => {
                if (stats) {
                    this.dailyStats = stats;
                }
            },
            error: (err) => console.error('Error al cargar estadísticas diarias:', err)
        });
    }

    // =========================================================================
    // CATALOG & MATERIAL UTILITIES
    // =========================================================================
    loadCatalogMateriales(): void {
        this.materialService.getAllMaterials().subscribe({
            next: (mats) => {
                this.catalogMateriales = mats || [];
                if (this.catalogMateriales.length > 0) {
                    this.selectedMaterialId = this.catalogMateriales[0].id;
                    this.updateMaterialStockLabel();
                }
            },
            error: (err) => console.error('Error al cargar materiales:', err)
        });
    }

    loadCatalogMaquetas(): void {
        this.maquetaService.getProducts(undefined, undefined, 0, 50).subscribe({
            next: (page) => {
                if (page && page.content && page.content.length > 0) {
                    this.catalogMaquetas = page.content.map(p => {
                        // Calcular precio basado en la suma de materiales sugeridos asociados
                        let precioMateriales = 0;
                        if (p.materialesDetalle && p.materialesDetalle.length > 0) {
                            precioMateriales = p.materialesDetalle.reduce((sum: number, mat: any) => {
                                const cost = Number(mat.costoVenta || 0);
                                const qty = Number(mat.cantidadSugerida || 0);
                                return sum + (cost * qty);
                            }, 0);
                        }
                        
                        // Si no hay materiales asignados, usar precio base fallback
                        if (precioMateriales <= 0) {
                            precioMateriales = 120.00;
                        }

                        return {
                            id: p.id,
                            nombre: p.titulo,
                            precio: precioMateriales,
                            stock: p.stock,
                            imageUrl: p.imageUrl,
                            originalProduct: p
                        };
                    });
                } else {
                    this.setMockMaquetas();
                }
            },
            error: (err) => {
                console.error('Error al cargar maquetas del backend, cargando mockups locales:', err);
                this.setMockMaquetas();
            }
        });
    }

    private setMockMaquetas(): void {
        this.catalogMaquetas = [
            {
                id: 'm1',
                nombre: 'Maqueta Casa de Campo',
                precio: 45.00,
                stock: 5,
                originalProduct: {
                    id: 'm1',
                    titulo: 'Maqueta Casa de Campo',
                    stock: 5,
                    materialesDetalle: [
                        { materialId: 'mat-balsa', nombre: 'Madera Balsa', costoVenta: 15.00, cantidadSugerida: 2 },
                        { materialId: 'mat-silicona', nombre: 'Silicona Líquida', costoVenta: 7.50, cantidadSugerida: 2 }
                    ]
                }
            },
            {
                id: 'm2',
                nombre: 'Maqueta Edificio Moderno',
                precio: 75.00,
                stock: 3,
                originalProduct: {
                    id: 'm2',
                    titulo: 'Maqueta Edificio Moderno',
                    stock: 3,
                    materialesDetalle: [
                        { materialId: 'mat-pla', nombre: 'Filamento PLA', costoVenta: 25.00, cantidadSugerida: 2 },
                        { materialId: 'mat-acrilico', nombre: 'Plancha Acrílico', costoVenta: 12.50, cantidadSugerida: 2 }
                    ]
                }
            },
            {
                id: 'm3',
                nombre: 'Maqueta Puente Colgante',
                precio: 60.00,
                stock: 4,
                originalProduct: {
                    id: 'm3',
                    titulo: 'Maqueta Puente Colgante',
                    stock: 4,
                    materialesDetalle: [
                        { materialId: 'mat-balsa', nombre: 'Madera Balsa', costoVenta: 15.00, cantidadSugerida: 3 },
                        { materialId: 'mat-silicona', nombre: 'Silicona Líquida', costoVenta: 7.50, cantidadSugerida: 2 }
                    ]
                }
            }
        ];
    }

    selectMaquetaTipo(tipo: 'catalogo' | 'personalizada'): void {
        this.currentMaquetaTipo = tipo;
        this.selectedMaqueta = null;
        this.paymentForm.productType = tipo === 'personalizada' 
            ? 'Proyecto Personalizado (Maqueta a Medida)' 
            : 'Proyecto Predeterminado (Catalogo)';
        this.updateTotals();
    }

    selectCatalogMaqueta(maq: any): void {
        this.selectedMaqueta = maq;
        this.updateTotals();
    }

    calculatePersonalizadaPrice(): void {
        const volume = (this.maqAlto || 0) * (this.maqAncho || 0) * (this.maqLargo || 0);
        this.selectedPersonalizadaPrice = 10 + (volume * 0.001);
        this.updateTotals();
    }

    updateMaterialStockLabel(): void {
        const mat = this.catalogMateriales.find(m => m.id === this.selectedMaterialId);
        if (mat) {
            this.selectedMaterialStockLabel = `Stock disponible: ${mat.stockActual} ${mat.unidad || 'und'}`;
        } else {
            this.selectedMaterialStockLabel = '';
        }
    }

    addMaterialToCart(): void {
        if (!this.selectedMaterialId) {
            alert('Selecciona un material válido.');
            return;
        }

        const mat = this.catalogMateriales.find(m => m.id === this.selectedMaterialId);
        if (!mat) return;

        const qty = this.selectedMaterialQty;

        if (qty <= 0) {
            alert('❌ La cantidad de materiales debe ser mayor a cero y positiva.');
            return;
        }

        if (qty > mat.stockActual) {
            alert(`❌ Stock insuficiente. Solo quedan ${mat.stockActual} unidades de ${mat.nombre}.`);
            return;
        }

        const existingIndex = this.cartMaterials.findIndex(item => item.id === this.selectedMaterialId);
        if (existingIndex > -1) {
            const newQty = this.cartMaterials[existingIndex].qty + qty;
            if (newQty > mat.stockActual) {
                alert(`❌ La cantidad acumulada (${newQty}) excede el stock disponible.`);
                return;
            }
            this.cartMaterials[existingIndex].qty = newQty;
        } else {
            this.cartMaterials.push({
                id: mat.id,
                name: mat.nombre,
                price: mat.precio || mat.precioUnitario || 1.50,
                qty: qty,
                unit: mat.unidad
            });
        }

        this.updateTotals();
    }

    removeMaterialFromCart(matId: string): void {
        this.cartMaterials = this.cartMaterials.filter(item => item.id !== matId);
        this.updateTotals();
    }

    getMaquetaSubtotal(): number {
        if (this.currentMaquetaTipo === 'catalogo') {
            return this.selectedMaqueta ? (this.selectedMaqueta.price || this.selectedMaqueta.precio || 0) : 0;
        } else {
            return this.selectedPersonalizadaPrice;
        }
    }

    getMaterialsSubtotal(): number {
        return this.cartMaterials.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }

    getTotalVenta(): number {
        return this.getMaquetaSubtotal() + this.getMaterialsSubtotal();
    }

    updateTotals(): void {
        const total = this.getTotalVenta();
        this.paymentForm.amount = this.paymentForm.kind.includes('Adelanto') ? total * 0.5 : total;
        this.paymentForm.materials = this.cartMaterials.map(m => `${m.qty}x ${m.name}`).join(', ');
    }

    // =========================================================================
    // COBRO FISICO MODAL CONTROLS
    // =========================================================================
    openCobroFisicoModal(balance: PendingBalance): void {
        this.currentBalanceForModal = balance;
        this.cobroVentaId = balance.solicitudId || '';
        this.cobroClienteDisplay = balance.client;
        this.cobroMonto = balance.amount;
        this.activePaymentMethod = 'yape';
        this.cobroNumeroOperacion = '';
        this.cobroCodigoSeguridad = '';
        this.cobroMontoRecibido = 0;
        this.copiadoExitoso = false;
        this.cobroMetodo = 'Online (Yape / Plin)';
        this.uploadedVoucherName = '';
        this.uploadedVoucherFile = null;
        this.showCobroFisicoModal = true;
    }

    closeCobroFisicoModal(): void {
        this.showCobroFisicoModal = false;
        this.currentBalanceForModal = null;
    }

    triggerFileUploader(): void {
        const fileInput = document.getElementById('cobro-file-input') as HTMLInputElement;
        if (fileInput) fileInput.click();
    }

    handleFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.uploadedVoucherFile = file;
            this.uploadedVoucherName = file.name;
        }
    }

    submitCobroFisico(): void {
        if (this.cobroMonto <= 0) {
            alert('El monto debe ser mayor a cero.');
            return;
        }

        let codigoOp = '';
        let metodoTexto = '';
        let metodoPagoTipo: 'ONLINE' | 'FISICO' = 'ONLINE';

        if (this.activePaymentMethod === 'yape') {
            if (!this.cobroNumeroOperacion?.trim()) {
                alert('Por favor ingresa el número de operación.');
                return;
            }
            if (!this.cobroCodigoSeguridad?.trim()) {
                alert('Por favor ingresa el código de seguridad.');
                return;
            }
            codigoOp = `YAPE-${this.cobroNumeroOperacion.trim()}`;
            metodoTexto = 'Yape / Plin';
            metodoPagoTipo = 'ONLINE';
        } else if (this.activePaymentMethod === 'transferencia') {
            if (!this.cobroNumeroOperacion?.trim()) {
                alert('Por favor ingresa el número de operación de la transferencia.');
                return;
            }
            codigoOp = `TRANSF-${this.cobroNumeroOperacion.trim()}`;
            metodoTexto = 'Transferencia Bancaria';
            metodoPagoTipo = 'ONLINE';
        } else { // efectivo
            if (this.cobroMontoRecibido < this.cobroMonto) {
                alert(`El monto recibido (S/ ${this.cobroMontoRecibido}) es menor al saldo a pagar (S/ ${this.cobroMonto}).`);
                return;
            }
            codigoOp = `EFECTIVO-CAJA-${Date.now()}`;
            metodoTexto = 'Efectivo en persona';
            metodoPagoTipo = 'FISICO';
        }

        if (this.uploadedVoucherName) {
            codigoOp += ` (${this.uploadedVoucherName})`;
        }

        // Buscar si existe un roomId (sala de chat) asociada a esta solicitud para mantener el flujo de auditoría unido
        if (this.cobroVentaId) {
            this.chatService.getMyRooms().subscribe({
                next: (rooms) => {
                    const room = rooms ? rooms.find(r => r.requestId === this.cobroVentaId) : null;
                    const resolvedRoomId = room ? room.id : null;
                    this.registrarCobroSaldoConRoomId(resolvedRoomId, codigoOp, metodoPagoTipo, metodoTexto);
                },
                error: () => {
                    this.registrarCobroSaldoConRoomId(null, codigoOp, metodoPagoTipo, metodoTexto);
                }
            });
        } else {
            this.registrarCobroSaldoConRoomId(null, codigoOp, metodoPagoTipo, metodoTexto);
        }
    }

    private registrarCobroSaldoConRoomId(resolvedRoomId: string | null, codigoOp: string, metodoPagoTipo: 'ONLINE' | 'FISICO', metodoTexto: string): void {
        const payload = {
            clientName: this.cobroClienteDisplay,
            clientEmail: this.currentBalanceForModal?.email || `${this.cobroClienteDisplay.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            clientPhone: '999999999',
            roomId: resolvedRoomId,
            monto: this.cobroMonto,
            metodoPago: metodoPagoTipo,
            tipoAbono: 'SALDO',
            tipoMaqueta: 'PREDETERMINADA',
            materiales: this.currentBalanceForModal?.materials || 'Liquidación de saldo pendiente',
            fechaTransaccion: new Date().toISOString(),
            codigoOperacion: codigoOp
        };

        this.chatService.registerPayment(payload).subscribe({
            next: (res) => {
                alert('¡Saldo de cobro registrado con éxito!');

                // Change status of Purchase Request to COMPLETADO
                if (this.cobroVentaId) {
                    this.requestService.actualizarEstado(this.cobroVentaId, { estado: 'COMPLETADO' }).subscribe({
                        next: () => {
                            this.loadPendingBalances();
                        },
                        error: (err) => console.error('Error al actualizar estado de solicitud a COMPLETADO:', err)
                    });
                }

                // Show printed ticket
                const printedTx = {
                    codigoVenta: this.cobroVentaId || `VTA-${Math.floor(1000 + Math.random() * 9000)}`,
                    fecha: new Date().toLocaleString(),
                    cliente: this.cobroClienteDisplay,
                    metodo: metodoTexto,
                    monto: this.cobroMonto
                };
                this.prepareAndPrintTicket(printedTx, this.currentBalanceForModal?.project || 'Proyecto Maqueta', this.cobroMonto, [], this.cobroMonto, 0);

                this.closeCobroFisicoModal();
                this.loadTransactions();
                this.loadDailyStats();
            },
            error: (err) => {
                console.error('Error al registrar cobro de saldo:', err);
                alert('Error al registrar el cobro del saldo.');
            }
        });
    }

    // =========================================================================
    // TICKET PRINTING SYSTEM
    // =========================================================================
    prepareAndPrintTicket(tx: any, maquetaName: string, maquetaPrice: number, materialsList: any[], total: number, saldo: number): void {
        this.selectedReceiptForPrint = {
            id: tx.codigoVenta,
            fecha: tx.fecha,
            cliente: tx.cliente,
            maquetaName: maquetaName,
            maquetaPrice: maquetaPrice,
            materials: materialsList,
            subtotal: total / 1.18,
            igv: total - (total / 1.18),
            total: total,
            metodo: tx.metodo,
            montoCobrado: tx.monto,
            saldoRestante: saldo
        };
        
        setTimeout(() => {
            window.print();
        }, 300);
    }

    printReceipt(transaction: Transaction): void {
        const printedTx = {
            codigoVenta: transaction.operation || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
            fecha: transaction.date,
            cliente: transaction.client,
            metodo: transaction.method,
            monto: transaction.amount
        };
        
        this.prepareAndPrintTicket(
            printedTx, 
            transaction.productType, 
            transaction.amount - 10 > 0 ? transaction.amount - 10 : transaction.amount, 
            [], 
            transaction.amount, 
            0
        );
    }

    // =========================================================================
    // LEGACY METHODS & COMPATIBILITY
    // =========================================================================
    get filteredTransactions(): Transaction[] {
        const query = this.searchTerm.trim().toLowerCase();

        return this.transactions.filter((transaction) => {
            const matchesSearch = !query || transaction.client.toLowerCase().includes(query);
            
            // matchesMethod
            let matchesMethod = true;
            if (this.selectedMethodFilter !== 'TODOS') {
                const isOnlineTx = transaction.method.toLowerCase().includes('online') || 
                                   transaction.method.toLowerCase().includes('yape') || 
                                   transaction.method.toLowerCase().includes('transferencia');
                const isFisicoTx = transaction.method.toLowerCase().includes('fisico') || 
                                   transaction.method.toLowerCase().includes('efectivo');

                if (this.selectedMethodFilter === 'ONLINE') {
                    matchesMethod = isOnlineTx;
                } else if (this.selectedMethodFilter === 'FISICO') {
                    matchesMethod = isFisicoTx;
                }
            }

            // matchesKind
            let matchesKind = true;
            if (this.selectedKindFilter !== 'TODOS') {
                const kindLower = transaction.kind.toLowerCase();
                if (this.selectedKindFilter === 'ADELANTO') {
                    matchesKind = kindLower.includes('adelanto');
                } else if (this.selectedKindFilter === 'SALDO') {
                    matchesKind = kindLower.includes('saldo');
                } else if (this.selectedKindFilter === 'TOTAL') {
                    matchesKind = kindLower.includes('total') || kindLower.includes('completo');
                }
            }

            return matchesSearch && matchesMethod && matchesKind;
        });
    }

    obtenerFlujoTransaccion(tx: Transaction): {
        tipo: 'ADELANTO_PENDIENTE' | 'ADELANTO_LIQUIDADO' | 'SALDO_COMPLETO' | 'PAGO_UNICO',
        adelantoMonto: number,
        saldoMonto: number,
        totalMonto: number,
        esPresupuestado: boolean
    } {
        const clientLower = tx.client.toLowerCase();
        const kindLower = tx.kind.toLowerCase();

        // 1. Filtrar transacciones relacionadas con estricto aislamiento
        let related: Transaction[] = [];
        if (tx.solicitudId) {
            related = this.transactions.filter(t => t.solicitudId === tx.solicitudId);
        } else {
            // Para ventas de caja que no tienen solicitudId, agrupamos por nombre de maqueta y materiales
            const projectLower = (tx.projectName || '').toLowerCase();
            related = this.transactions.filter(t => 
                t.client.toLowerCase() === clientLower &&
                (t.projectName || '').toLowerCase() === projectLower &&
                !t.solicitudId
            );
        }

        const tieneAdelanto = related.some(t => t.kind.toLowerCase().includes('adelanto'));
        const tieneSaldo = related.some(t => t.kind.toLowerCase().includes('saldo'));

        // 2. Intentar cruzar con presupuestos reales cargados
        let budget: any = null;
        if (tx.solicitudId && this.allBudgets?.length) {
            budget = this.allBudgets.find(b => b.solicitudId === tx.solicitudId);
        } else if (this.allBudgets?.length) {
            // Coincidencia por correo para ventas presenciales registradas
            budget = this.allBudgets.find(b => 
                b.clienteEmail?.toLowerCase() === tx.email?.toLowerCase() &&
                !b.solicitudId
            );
        }

        let totalMonto = tx.amount;
        let adelantoMonto = tx.amount;
        let saldoMonto = tx.amount;
        let esPresupuestado = false;

        if (budget) {
            totalMonto = Number(budget.total);
            adelantoMonto = Number(budget.adelantoMonto);
            saldoMonto = Number(budget.total - budget.adelantoMonto);
            esPresupuestado = true;
        } else {
            // Fallback si no hay presupuesto detallado (estimación al 50%)
            if (kindLower.includes('adelanto')) {
                totalMonto = tx.amount * 2;
                adelantoMonto = tx.amount;
                saldoMonto = tx.amount;
            } else if (kindLower.includes('saldo')) {
                // Solo buscamos un adelanto hermano si pertenece a la misma solicitud
                const adelantoTx = related.find(t => t.kind.toLowerCase().includes('adelanto'));
                adelantoMonto = adelantoTx ? adelantoTx.amount : tx.amount;
                totalMonto = adelantoMonto + tx.amount;
                saldoMonto = tx.amount;
            } else {
                totalMonto = tx.amount;
                adelantoMonto = 0;
                saldoMonto = tx.amount;
            }
        }

        if (kindLower.includes('adelanto')) {
            if (tieneSaldo) {
                const saldoTx = related.find(t => t.kind.toLowerCase().includes('saldo'));
                return { 
                    tipo: 'ADELANTO_LIQUIDADO', 
                    adelantoMonto: adelantoMonto,
                    saldoMonto: saldoTx ? saldoTx.amount : saldoMonto,
                    totalMonto: totalMonto,
                    esPresupuestado: esPresupuestado
                };
            } else {
                return { 
                    tipo: 'ADELANTO_PENDIENTE', 
                    adelantoMonto: adelantoMonto,
                    saldoMonto: saldoMonto,
                    totalMonto: totalMonto,
                    esPresupuestado: esPresupuestado
                };
            }
        } else if (kindLower.includes('saldo')) {
            const adelantoTx = related.find(t => t.kind.toLowerCase().includes('adelanto'));
            return { 
                tipo: 'SALDO_COMPLETO', 
                adelantoMonto: adelantoTx ? adelantoTx.amount : adelantoMonto,
                saldoMonto: tx.amount,
                totalMonto: totalMonto,
                esPresupuestado: esPresupuestado
            };
        } else {
            return { 
                tipo: 'PAGO_UNICO', 
                adelantoMonto: 0,
                saldoMonto: totalMonto,
                totalMonto: totalMonto,
                esPresupuestado: esPresupuestado
            };
        }
    }

    openReceipt(transaction: Transaction): void {
        this.selectedReceipt = transaction;
    }

    closeReceipt(): void {
        this.selectedReceipt = null;
    }

    resetForm(): void {
        this.isPrefilled = false;
        this.paymentForm = {
            client: '',
            email: '',
            phone: '',
            productType: '',
            materials: '',
            amount: null,
            method: this.paymentMethods[1],
            kind: this.paymentKinds[2],
            date: '',
            operation: '',
            inventory: true,
            voucherUrl: ''
        };
        this.selectedMaqueta = null;
        this.cartMaterials = [];
        this.currentMaquetaTipo = 'catalogo';
    }

    collectBalance(balance: PendingBalance): void {
        this.openCobroFisicoModal(balance);
    }

    cancelTransaction(transaction: Transaction): void {
        this.transactions = this.transactions.filter((item) => item !== transaction);
    }

    exportCsv(): void {
        this.exportLabel = 'CSV exportado';
        window.setTimeout(() => {
            this.exportLabel = 'Exportar CSV';
        }, 1200);
    }

    registerTransaction(): void {
        if (!this.paymentForm.client || !this.paymentForm.email) {
            alert('Por favor, completa los campos obligatorios: Cliente y Correo.');
            return;
        }

        // Calculate amount based on selected options
        let maquetaName = 'Maqueta Personalizada';
        let maquetaPrice = 0;
        let productoId: string | undefined = undefined;
        let preassignedMaterialsList: any[] = [];

        if (this.currentMaquetaTipo === 'catalogo') {
            if (!this.selectedMaqueta && !this.isPrefilled) {
                alert('Por favor, selecciona una maqueta del catálogo.');
                return;
            }
            maquetaName = this.selectedMaqueta ? (this.selectedMaqueta.nombre || this.selectedMaqueta.name) : (this.paymentForm.productType || 'Maqueta del Catálogo');
            maquetaPrice = this.selectedMaqueta ? (this.selectedMaqueta.precio || this.selectedMaqueta.price || 0) : (this.paymentForm.amount || 0);
            productoId = this.selectedMaqueta?.id;
            
            const original = this.selectedMaqueta?.originalProduct;
            if (original && original.materialesDetalle) {
                preassignedMaterialsList = original.materialesDetalle;
            }
        } else {
            maquetaName = this.isPrefilled ? this.paymentForm.productType : `Maqueta Personalizada (${this.maqAlto}x${this.maqAncho}x${this.maqLargo}cm)`;
            maquetaPrice = this.isPrefilled ? (this.paymentForm.amount || 0) : this.selectedPersonalizadaPrice;
        }

        const total = this.getTotalVenta();
        const kind: 'ADELANTO' | 'SALDO' | 'TOTAL' = 
            this.paymentForm.kind.startsWith('Pago') || this.paymentForm.kind.includes('100%') 
                ? 'TOTAL' 
                : this.paymentForm.kind.startsWith('Saldo') 
                    ? 'SALDO' 
                    : 'ADELANTO';

        const amount = kind === 'ADELANTO' ? total * 0.5 : total;
        const method: 'ONLINE' | 'FISICO' = this.paymentForm.method.startsWith('Online') ? 'ONLINE' : 'FISICO';
        
        // Merge preassigned and cart materials
        const allMaterialsTextList: string[] = [];
        preassignedMaterialsList.forEach((m: any) => {
            allMaterialsTextList.push(`${m.cantidadSugerida || 1}x ${m.nombre} (incluido)`);
        });
        this.cartMaterials.forEach(m => {
            allMaterialsTextList.push(`${m.qty}x ${m.name} (adicional)`);
        });
        const materialsStr = allMaterialsTextList.join(', ') || 'Sin materiales adicionales';

        const registerPaymentPayload = (solId?: string) => {
            const payload = {
                clientName: this.paymentForm.client,
                clientEmail: this.paymentForm.email,
                clientPhone: this.paymentForm.phone || '999999999',
                roomId: (this.paymentForm as any).roomId || null,
                monto: amount,
                metodoPago: method,
                tipoAbono: kind,
                tipoMaqueta: this.currentMaquetaTipo === 'personalizada' ? 'PERSONALIZADA' : 'PREDETERMINADA',
                materiales: materialsStr,
                fechaTransaccion: this.paymentForm.date ? new Date(this.paymentForm.date).toISOString() : new Date().toISOString(),
                codigoOperacion: this.paymentForm.operation || `OPE-${Date.now()}`
            };

            this.chatService.registerPayment(payload).subscribe({
                next: (res) => {
                    alert('¡Pago registrado con éxito en la base de datos!');

                    // Trigger browser native print for thermal receipt
                    const printedTx = {
                        codigoVenta: solId || `VTA-${Math.floor(1000 + Math.random() * 9000)}`,
                        fecha: this.paymentForm.date ? new Date(this.paymentForm.date).toLocaleString() : new Date().toLocaleString(),
                        cliente: this.paymentForm.client,
                        metodo: this.paymentForm.method,
                        monto: amount
                    };

                    const ticketMaterials: any[] = [];
                    preassignedMaterialsList.forEach((m: any) => {
                        ticketMaterials.push({
                            qty: m.cantidadSugerida || 1,
                            name: `${m.nombre} (incluido)`,
                            price: m.costoVenta
                        });
                    });
                    this.cartMaterials.forEach(m => {
                        ticketMaterials.push({
                            qty: m.qty,
                            name: this.isPrefilled ? m.name : `${m.name} (adicional)`,
                            price: m.price
                        });
                    });

                    this.prepareAndPrintTicket(printedTx, maquetaName, maquetaPrice, ticketMaterials, total, kind === 'ADELANTO' ? total * 0.5 : 0);

                    // WS confirmation message if roomId is present
                    if (payload.roomId) {
                        const abonoText = kind === 'ADELANTO' ? 'adelanto' : kind === 'SALDO' ? 'saldo' : 'pago completo';
                        const sysMessage = `El vendedor ha verificado y registrado el pago de ${abonoText} de S/ ${payload.monto.toFixed(2)}.`;
                        this.chatService.sendMessage(payload.roomId, sysMessage, 'SYSTEM');
                    }

                    // Decrement stock if checkbox checked
                    if (this.paymentForm.inventory) {
                        // 1. Decrement additional materials
                        this.cartMaterials.forEach(item => {
                            const match = this.catalogMateriales.find(m => m.id === item.id);
                            if (match) {
                                match.stockActual = Math.max(0, match.stockActual - item.qty);
                                const req = {
                                    nombre: match.nombre,
                                    unidad: match.unidad,
                                    costoCompra: match.costoCompra,
                                    costoVenta: match.costoVenta,
                                    stockActual: match.stockActual,
                                    categoriaId: match.categoriaId,
                                    proveedor: match.proveedor,
                                    activo: match.activo
                                };
                                this.materialService.updateMaterial(match.id, req).subscribe({
                                    error: (e) => console.error('Error actualizando stock en backend para material adicional:', match.nombre, e)
                                });
                            }
                        });

                        // 2. Decrement preassigned materials
                        preassignedMaterialsList.forEach(item => {
                            const match = this.catalogMateriales.find(m => m.id === item.materialId || m.id === item.id);
                            if (match) {
                                match.stockActual = Math.max(0, match.stockActual - Number(item.cantidadSugerida || 1));
                                const req = {
                                    nombre: match.nombre,
                                    unidad: match.unidad,
                                    costoCompra: match.costoCompra,
                                    costoVenta: match.costoVenta,
                                    stockActual: match.stockActual,
                                    categoriaId: match.categoriaId,
                                    proveedor: match.proveedor,
                                    activo: match.activo
                                };
                                this.materialService.updateMaterial(match.id, req).subscribe({
                                    error: (e) => console.error('Error actualizando stock en backend para material pre-asignado:', match.nombre, e)
                                });
                            }
                        });

                        // 3. Decrement maqueta stock if catalog product selected
                        if (this.currentMaquetaTipo === 'catalogo' && this.selectedMaqueta) {
                            const original = this.selectedMaqueta.originalProduct;
                            if (original) {
                                const newStock = Math.max(0, original.stock - 1);
                                const req = {
                                    titulo: original.titulo,
                                    descripcion: original.descripcion,
                                    descripcionDetallada: original.descripcionDetallada,
                                    categoriaId: original.categoriaId,
                                    imageUrl: original.imageUrl,
                                    gradoEscolar: original.gradoEscolar,
                                    ocasion: original.ocasion,
                                    caracteristicas: original.caracteristicas,
                                    materialesReciclables: original.materialesReciclables,
                                    stock: newStock
                                };
                                this.maquetaService.updateProduct(original.id, req).subscribe({
                                    next: () => {
                                        console.log('Stock de maqueta catalogada actualizado en backend');
                                        this.loadCatalogMaquetas();
                                    },
                                    error: (e) => console.error('Error actualizando stock de maqueta en backend:', e)
                                });
                            }
                        }
                    }

                    this.pagoRegistrado.emit();
                    this.resetForm();
                    
                    // Reload real data
                    this.loadTransactions();
                    this.loadPendingBalances();
                    this.loadDailyStats();
                },
                error: (err) => {
                    console.error('Error al registrar pago en backend:', err);
                    alert(err?.error?.message || 'Error al registrar el pago.');
                }
            });
        };

        // If it is an Adelanto (and not prefilled), create a Purchase Request so it appears in Pending list
        if (kind === 'ADELANTO' && !this.isPrefilled) {
            const reqBody = {
                clienteNombre: this.paymentForm.client,
                clienteEmail: this.paymentForm.email,
                clienteTelefono: this.paymentForm.phone || '999999999',
                mensaje: `Venta manual presencial de ${maquetaName}`,
                productoId: productoId,
                isCustom: this.currentMaquetaTipo === 'personalizada',
                descripcionPersonalizacion: this.currentMaquetaTipo === 'personalizada' ? `Maqueta de ${this.maqAlto}x${this.maqAncho}x${this.maqLargo}cm` : undefined,
                materialesDeseados: materialsStr
            };

            this.requestService.crear(reqBody).subscribe({
                next: (reqRes) => {
                    this.requestService.actualizarEstado(reqRes.id, { estado: 'PROCESANDO' }).subscribe({
                        next: () => {
                            this.chatService.getMyRooms().subscribe({
                                next: (rooms) => {
                                    const room = rooms ? rooms.find(r => r.requestId === reqRes.id) : null;
                                    if (room) {
                                        (this.paymentForm as any).roomId = room.id;
                                    }
                                    registerPaymentPayload(reqRes.id);
                                },
                                error: () => registerPaymentPayload(reqRes.id)
                            });
                        },
                        error: (err) => {
                            console.error('Error al actualizar estado a PROCESANDO en venta directa:', err);
                            registerPaymentPayload(reqRes.id);
                        }
                    });
                },
                error: (err) => {
                    console.error('Error al crear solicitud de compra para saldo pendiente:', err);
                    registerPaymentPayload();
                }
            });
        } else {
            registerPaymentPayload();
        }
    }
}
