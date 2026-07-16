import { CommonModule } from '@angular/common';
import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../services/chat.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { MaterialService } from '../../../../services/material.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { BudgetService } from '../../../../services/budget.service';
import { FileService } from '../../../../services/file.service';
import { PaymentModalComponent, PaymentConfirmPayload } from '../../../shared/components/payment-modal/payment-modal.component';


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
    id: string;
    client: string;
    email: string;
    project: string;
    materials: string;
    materialItems?: { name: string; qty: number }[];
    method: PaymentMethod;
    amount: number;
    dueDate: string;
    solicitudId?: string;
    budgetId?: string;
    realSolicitudId?: string;
    tipoVenta: 'ONLINE' | 'PRESENCIAL';
    fechaObj: Date;
    fechaFormatted: string;
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
    realProfit?: number;
    fechaObj?: Date;
    montoRecibido?: number;
    vuelto?: number;
    codigoSeguridad?: string;
    voucherUrl?: string;
}

@Component({
    selector: 'app-flujodepagos',
    standalone: true,
    imports: [CommonModule, FormsModule, PaymentModalComponent],
    templateUrl: './flujodepagos.component.html',
    styleUrl: './flujodepagos.component.css'
})
export class FlujoDePagosComponent implements OnInit, OnChanges {
    private readonly chatService = inject(ChatService);
    private readonly requestService = inject(PurchaseRequestService);
    private readonly materialService = inject(MaterialService);
    private readonly maquetaService = inject(MaquetaService);
    private readonly budgetService = inject(BudgetService);
    private readonly fileService = inject(FileService);

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
    activeSubTab: 'dashboard' | 'saldos' | 'auditoria' = 'dashboard';
    filtroPeriodoDashboard: 'hoy' | 'semana' | 'mes' = 'mes';
    chartPeriodFilter: 'semanas' | 'meses' | 'dias' = 'meses';

    // Filtros y ordenamiento para Saldos Pendientes
    filtroCanalPendientes: 'todos' | 'presencial' | 'online' = 'todos';
    ordenPendientes: 'reciente' | 'antiguo' | 'monto_desc' | 'monto_asc' = 'reciente';
    fechaInicioPendientes: string = '';
    fechaFinPendientes: string = '';

    // Paginación para Saldos Pendientes
    paginaActualPendientes: number = 1;
    itemsPorPaginaPendientes: number = 5;

    onFiltroPendientesChange(): void {
        this.paginaActualPendientes = 1;
    }

    limpiarFiltrosPendientes(): void {
        this.fechaInicioPendientes = '';
        this.fechaFinPendientes = '';
        this.filtroCanalPendientes = 'todos';
        this.ordenPendientes = 'reciente';
        this.paginaActualPendientes = 1;
    }

    get saldosPendientesFiltrados(): PendingBalance[] {
        let list = [...this.pendingBalances];

        // Filtro por Canal
        if (this.filtroCanalPendientes === 'presencial') {
            list = list.filter(b => b.tipoVenta === 'PRESENCIAL');
        } else if (this.filtroCanalPendientes === 'online') {
            list = list.filter(b => b.tipoVenta === 'ONLINE');
        }

        // Filtro por Rango de Fechas (Formato local YYYY-MM-DD sin desfasaje de zona horaria)
        if (this.fechaInicioPendientes) {
            const parts = this.fechaInicioPendientes.split('-');
            if (parts.length === 3) {
                const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0);
                list = list.filter(b => b.fechaObj >= start);
            }
        }
        if (this.fechaFinPendientes) {
            const parts = this.fechaFinPendientes.split('-');
            if (parts.length === 3) {
                const end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
                list = list.filter(b => b.fechaObj <= end);
            }
        }

        // Ordenamiento
        list.sort((a, b) => {
            if (this.ordenPendientes === 'reciente') {
                return b.fechaObj.getTime() - a.fechaObj.getTime();
            } else if (this.ordenPendientes === 'antiguo') {
                return a.fechaObj.getTime() - b.fechaObj.getTime();
            } else if (this.ordenPendientes === 'monto_desc') {
                return b.amount - a.amount;
            } else if (this.ordenPendientes === 'monto_asc') {
                return a.amount - b.amount;
            }
            return 0;
        });

        return list;
    }

    get totalPaginasPendientes(): number {
        return Math.ceil(this.saldosPendientesFiltrados.length / this.itemsPorPaginaPendientes) || 1;
    }

    get paginasPendientesArray(): number[] {
        return Array.from({ length: this.totalPaginasPendientes }, (_, i) => i + 1);
    }

    get saldosPendientesPaginados(): PendingBalance[] {
        const inicio = (this.paginaActualPendientes - 1) * this.itemsPorPaginaPendientes;
        return this.saldosPendientesFiltrados.slice(inicio, inicio + this.itemsPorPaginaPendientes);
    }

    get indiceInicioPendientes(): number {
        if (this.saldosPendientesFiltrados.length === 0) return 0;
        return (this.paginaActualPendientes - 1) * this.itemsPorPaginaPendientes + 1;
    }

    get indiceFinPendientes(): number {
        return Math.min(this.paginaActualPendientes * this.itemsPorPaginaPendientes, this.saldosPendientesFiltrados.length);
    }

    cambiarPaginaPendientes(pagina: number): void {
        if (pagina >= 1 && pagina <= this.totalPaginasPendientes) {
            this.paginaActualPendientes = pagina;
        }
    }

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
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                return f && f.getDate() === hoy.getDate() &&
                       f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            })
            .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);
    }

    get gananciaSemana(): number {
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                if (!f) return false;
                const diffTime = Math.abs(hoy.getTime() - f.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            })
            .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);
    }

    get gananciaMes(): number {
        const hoy = new Date();
        return this.transactions
            .filter(tx => {
                const f = (tx as any).fechaObj;
                return f && f.getMonth() === hoy.getMonth() &&
                       f.getFullYear() === hoy.getFullYear();
            })
            .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);
    }

    get totalGananciaAcumulada(): number {
        return this.transactions.reduce((sum, tx) => sum + (tx.realProfit || 0), 0);
    }

    get chartData() {
        const hoy = new Date();
        const intervals: { label: string; value: number }[] = [];

        if (this.chartPeriodFilter === 'dias') {
            // Últimos 7 días
            for (let i = 6; i >= 0; i--) {
                const d = new Date(hoy);
                d.setDate(hoy.getDate() - i);
                const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                
                const daySumProfit = this.transactions
                    .filter(tx => {
                        const f = (tx as any).fechaObj;
                        return f && f.getDate() === d.getDate() && f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear();
                    })
                    .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);

                intervals.push({ label, value: daySumProfit });
            }
        } else if (this.chartPeriodFilter === 'semanas') {
            // Últimas 6 semanas
            for (let i = 5; i >= 0; i--) {
                const start = new Date(hoy);
                start.setDate(hoy.getDate() - (i * 7 + 6));
                const end = new Date(hoy);
                end.setDate(hoy.getDate() - (i * 7));
                const label = `Sem -${i}`;
                
                const weekSumProfit = this.transactions
                    .filter(tx => {
                        const f = (tx as any).fechaObj;
                        return f && f >= start && f <= end;
                    })
                    .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);

                intervals.push({ label, value: weekSumProfit });
            }
        } else {
            // Últimos 6 meses
            for (let i = 5; i >= 0; i--) {
                const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
                const label = d.toLocaleDateString('es-ES', { month: 'short' });
                
                const monthSumProfit = this.transactions
                    .filter(tx => {
                        const f = (tx as any).fechaObj;
                        return f && f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear();
                    })
                    .reduce((sum, tx) => sum + (tx.realProfit || 0), 0);

                intervals.push({ label, value: monthSumProfit });
            }
        }

        // Encontrar valor máximo para escalar el gráfico
        const maxVal = Math.max(...intervals.map(item => item.value), 100);
        const yMax = Math.ceil(maxVal / 100) * 100; // redondear al siguiente centenar para la escala

        const width = 500;
        const height = 200;
        const paddingLeft = 20;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 20;

        const points = intervals.map((item, index) => {
            const x = paddingLeft + (index / (intervals.length - 1)) * (width - paddingLeft - paddingRight);
            const y = height - paddingBottom - (item.value / yMax) * (height - paddingTop - paddingBottom);
            return {
                label: item.label,
                value: item.value,
                x,
                y
            };
        });

        // Construir trayectorias SVG (Bezier suavizado)
        let linePath = '';
        let areaPath = '';

        if (points.length > 0) {
            linePath = `M ${points[0].x},${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
                const cpY1 = points[i - 1].y;
                const cpX2 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
                const cpY2 = points[i].y;
                linePath += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${points[i].x},${points[i].y}`;
            }

            areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`;
        }

        const yLabels: string[] = [];
        for (let i = 5; i >= 0; i--) {
            yLabels.push(`S/ ${(yMax * i / 5).toFixed(0)}`);
        }

        return {
            points,
            linePath,
            areaPath,
            yLabels
        };
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

    setSubTab(tab: 'dashboard' | 'saldos' | 'auditoria'): void {
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
            this.activeSubTab = 'auditoria';
            this.loadTransactions();
            this.loadDailyStats();
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
                                        let loadedTxs: Transaction[] = [];
                                        if (mats) {
                                            loadedTxs = mats.map(tx => {
                                                let projectName = '';
                                                let solicitudId = tx.roomId;

                                                if (tx.roomId) {
                                                    const room = chatRooms.find(r => r.id === tx.roomId);
                                                    if (room) {
                                                        solicitudId = room.requestId;
                                                    }
                                                }

                                                if (solicitudId && reqs && reqs.content) {
                                                    const sol = reqs.content.find((r: any) => r.id === solicitudId);
                                                    if (sol) {
                                                        projectName = sol.productoNombre || '';
                                                    }
                                                }

                                                if (!projectName) {
                                                    projectName = tx.tipoMaqueta === 'PERSONALIZADA' ? 'Proyecto Personalizado' : 'Proyecto Catálogo';
                                                }

                                                const isPresencialTx = (tx.codigoOperacion && tx.codigoOperacion.includes('[PRESENCIAL]')) || tx.metodoPago === 'FISICO';

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
                                                    status: isPresencialTx ? 'fisico' : 'online',
                                                    fechaObj: new Date(tx.fechaTransaccion),
                                                    projectName: projectName,
                                                    solicitudId: solicitudId,
                                                    realProfit: this.calculateRealProfit(Number(tx.monto), solicitudId),
                                                    montoRecibido: tx.montoRecibido ? Number(tx.montoRecibido) : undefined,
                                                    vuelto: tx.vuelto ? Number(tx.vuelto) : undefined,
                                                    codigoSeguridad: tx.codigoSeguridad || undefined,
                                                    voucherUrl: tx.voucherUrl || undefined
                                                };
                                            });
                                        }

                                        // Incluir compras presenciales / presupuestos completados que no tengan registro duplicado
                                        if (this.allBudgets && this.allBudgets.length > 0) {
                                            this.allBudgets.forEach(budget => {
                                                const isPresencial = budget.esPresencial || !budget.solicitudId;
                                                const key = budget.id || budget.solicitudId || budget.nombre;
                                                const isPagoConfirmado = budget.estado === 'COMPLETADO' || (key && localStorage.getItem('pago_confirmado_' + key) === 'true');
                                                const isAdelantoPagado = key && localStorage.getItem('adelanto_pagado_' + key) === 'true';

                                                const bEmail = (budget.clienteEmail || '').toLowerCase().trim();
                                                const bName = (budget.clienteNombre || '').toLowerCase().trim();

                                                const alreadyExists = loadedTxs.some(tx => {
                                                    if (budget.solicitudId && tx.solicitudId && tx.solicitudId === budget.solicitudId) return true;
                                                    if (budget.id && tx.operation && tx.operation.includes(budget.id)) return true;
                                                    if (bEmail && tx.email && tx.email.toLowerCase().trim() === bEmail) return true;
                                                    if (bName && tx.client && tx.client.toLowerCase().trim() === bName) return true;
                                                    return false;
                                                });

                                                if (!alreadyExists && (isPresencial || isPagoConfirmado || isAdelantoPagado)) {
                                                    const clientName = budget.clienteNombre || 'Cliente Presencial';
                                                    const clientEmail = budget.clienteEmail || 'presencial@correo.com';
                                                    const materialsStr = (budget.items || []).map((i: any) => `${i.cantidad}x ${i.materialNombre}`).join(', ') || 'Materiales del presupuesto';
                                                    const fecha = budget.fechaCreacion ? new Date(budget.fechaCreacion) : new Date();

                                                    if (isPagoConfirmado || budget.estado === 'COMPLETADO') {
                                                        loadedTxs.push({
                                                            client: clientName,
                                                            email: clientEmail,
                                                            productType: budget.isCustom ? 'Personalizada' : 'Predeterminada',
                                                            materials: materialsStr,
                                                            method: 'Fisico',
                                                            kind: 'Total',
                                                            amount: Number(budget.total || 0),
                                                            operation: `PRESENCIAL-${budget.codigoReferencia || (budget.id ? budget.id.substring(0, 8) : 'Caja')}`,
                                                            date: fecha.toLocaleDateString('es-PE', {
                                                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            }),
                                                            status: 'fisico',
                                                            fechaObj: fecha,
                                                            projectName: budget.nombre || 'Proyecto Maqueta Presencial',
                                                            solicitudId: budget.solicitudId || budget.id,
                                                            realProfit: this.calculateRealProfit(Number(budget.total || 0), budget.solicitudId)
                                                        });
                                                    } else if (isAdelantoPagado) {
                                                        const adelantoMonto = Number(budget.adelantoMonto || (budget.total * 0.5));
                                                        loadedTxs.push({
                                                            client: clientName,
                                                            email: clientEmail,
                                                            productType: budget.isCustom ? 'Personalizada' : 'Predeterminada',
                                                            materials: materialsStr,
                                                            method: 'Fisico',
                                                            kind: 'Adelanto',
                                                            amount: adelantoMonto,
                                                            operation: `ADELANTO-PRESENCIAL-${budget.codigoReferencia || (budget.id ? budget.id.substring(0, 8) : 'Caja')}`,
                                                            date: fecha.toLocaleDateString('es-PE', {
                                                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            }),
                                                            status: 'fisico',
                                                            fechaObj: fecha,
                                                            projectName: budget.nombre || 'Proyecto Maqueta Presencial',
                                                            solicitudId: budget.solicitudId || budget.id,
                                                            realProfit: this.calculateRealProfit(adelantoMonto, budget.solicitudId)
                                                        });
                                                    }
                                                }
                                            });
                                        }

                                        this.transactions = loadedTxs;
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
                        this.chatService.getAllTransactions().subscribe({
                            next: (mats) => {
                                if (mats) {
                                    this.transactions = mats.map(tx => ({
                                        client: tx.clientName,
                                        email: tx.clientEmail,
                                        productType: tx.tipoMaqueta === 'PERSONALIZADA' ? 'Personalizada' : 'Predeterminada',
                                        materials: tx.materiales || 'Materiales estándar',
                                        method: tx.metodoPago === 'ONLINE' ? 'Online' : 'Fisico',
                                        kind: tx.tipoAbono === 'ADELANTO' ? 'Adelanto' : tx.tipoAbono === 'SALDO' ? 'Saldo' : 'Total',
                                        amount: Number(tx.monto),
                                        operation: tx.codigoOperacion || 'N/A',
                                        date: new Date(tx.fechaTransaccion).toLocaleDateString('es-PE', {
                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        }),
                                        status: tx.metodoPago === 'ONLINE' ? 'online' : 'fisico',
                                        fechaObj: new Date(tx.fechaTransaccion),
                                        projectName: tx.tipoMaqueta === 'PERSONALIZADA' ? 'Proyecto Personalizado' : 'Proyecto Catálogo',
                                        solicitudId: tx.roomId,
                                        realProfit: this.calculateRealProfit(Number(tx.monto), tx.roomId)
                                    }));
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    loadPendingBalances(): void {
        this.requestService.listarTodas(undefined, true, 0, 1000).subscribe({
            next: (reqPage: any) => {
                const reqs = reqPage.content || [];
                this.budgetService.listarTodos().subscribe({
                    next: (budgets) => {
                        this.allBudgets = budgets || [];
                        const loadedBalances: PendingBalance[] = [];
                        const processedBudgetIds = new Set<string>();

                        // 1. Procesar Presupuestos (tanto Online como Presenciales) desde el backend
                        if (budgets && budgets.length > 0) {
                            budgets.forEach(b => {
                                const isPresencial = Boolean(b.esPresencial) || !b.solicitudId;
                                const key = b.id || b.solicitudId || b.nombre;
                                const isPagoConfirmado = b.estado === 'COMPLETADO' || (key && localStorage.getItem('pago_confirmado_' + key) === 'true');
                                const isAdelantoPagado = (key && localStorage.getItem('adelanto_pagado_' + key) === 'true') || Boolean(b.adelantoRequerido) || (Number(b.adelantoMonto || 0) > 0);

                                if (isAdelantoPagado && !isPagoConfirmado && b.estado !== 'COMPLETADO') {
                                    if (b.id) processedBudgetIds.add(b.id);
                                    if (b.solicitudId) processedBudgetIds.add(b.solicitudId);

                                    const montoAdelanto = Number(b.adelantoMonto || (Number(b.total || 0) * 0.5));
                                    const saldoPendiente = Math.max(0, Number(b.total || 0) - montoAdelanto);

                                    if (saldoPendiente > 0) {
                                        const rawDate = b.createdAt || (b as any).fechaCreacion;
                                        const fecha = rawDate ? new Date(rawDate) : new Date();
                                        const materialItems = (b.items || []).map((i: any) => ({
                                            name: i.materialNombre || 'Material',
                                            qty: Number(i.cantidad || 1)
                                        }));

                                        const materialsStr = materialItems.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || 'Materiales del presupuesto';

                                        loadedBalances.push({
                                            id: b.id || `b-${Math.random()}`,
                                            client: b.clienteNombre || (isPresencial ? 'Cliente Taller' : 'Cliente Web'),
                                            email: b.clienteEmail || (isPresencial ? 'presencial@correo.com' : 'online@correo.com'),
                                            project: b.nombre || 'Proyecto Maqueta',
                                            materials: materialsStr,
                                            materialItems: materialItems,
                                            method: isPresencial ? 'Fisico' : 'Online',
                                            amount: saldoPendiente,
                                            dueDate: '50% PENDIENTE',
                                            solicitudId: b.solicitudId || b.id || (b.codigoReferencia || 'REF-CAJA'),
                                            budgetId: b.id,
                                            realSolicitudId: b.solicitudId,
                                            tipoVenta: isPresencial ? 'PRESENCIAL' : 'ONLINE',
                                            fechaObj: fecha,
                                            fechaFormatted: fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                        });
                                    }
                                }
                            });
                        }

                        // 2. Procesar Solicitudes Online activas sin presupuesto finalizado
                        if (reqs && reqs.length > 0) {
                            reqs.filter((r: any) => {
                                const st = String(r.estado);
                                return (st === 'PROCESANDO' || st === 'PRESUPUESTADO' || st === 'ACEPTADO') && !processedBudgetIds.has(r.id);
                            }).forEach((r: any) => {
                                const amount = r.isCustom ? 187.85 : 120.00;
                                const fecha = r.createdAt ? new Date(r.createdAt) : new Date();

                                loadedBalances.push({
                                    id: r.id,
                                    client: r.clienteNombre || 'Cliente Online',
                                    email: r.clienteEmail || 'online@correo.com',
                                    project: r.productoNombre || 'Maqueta Personalizada',
                                    materials: r.materialesDeseados || 'Materiales solicitados',
                                    materialItems: [{ name: r.materialesDeseados || 'Materiales estándar', qty: 1 }],
                                    method: 'Online',
                                    amount: amount,
                                    dueDate: '50% PENDIENTE',
                                    solicitudId: r.id,
                                    realSolicitudId: r.id,
                                    tipoVenta: 'ONLINE',
                                    fechaObj: fecha,
                                    fechaFormatted: fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                });
                            });
                        }

                        this.pendingBalances = loadedBalances;
                    },
                    error: (err) => console.error('Error al cargar presupuestos para saldos pendientes:', err)
                });
            },
            error: (err) => console.error('Error al cargar solicitudes para saldos pendientes:', err)
        });
    }

    // Helper method to calculate real profit from budget
    private calculateRealProfit(transactionAmount: number, solicitudId?: string): number {
        const DEFAULT_PROFIT_RATIO = 3 / 13; // Approx 23.07% of final price for a 30% markup

        if (!solicitudId || !this.allBudgets) {
            return transactionAmount * DEFAULT_PROFIT_RATIO;
        }

        const budget = this.allBudgets.find(b => b.solicitudId === solicitudId);
        if (!budget || !budget.total) {
            return transactionAmount * DEFAULT_PROFIT_RATIO;
        }

        let exactProfit = budget.ganancia || 0; // The 30% margin applied on top
        exactProfit += budget.manoDeObra || 0;
        
        if (budget.servicioExplicacion && budget.servicioExplicacion.incluido) {
            exactProfit += (budget.servicioExplicacion.precio || 0);
        }

        if (budget.items && budget.items.length > 0 && this.catalogMateriales && this.catalogMateriales.length > 0) {
            budget.items.forEach((item: any) => {
                const mat = this.catalogMateriales.find(m => m.id === item.materialId);
                if (mat && mat.costoVenta !== undefined && mat.costoCompra !== undefined) {
                    exactProfit += (mat.costoVenta - mat.costoCompra) * item.cantidad;
                }
            });
        }

        const profitPercentage = exactProfit / budget.total;
        return transactionAmount * profitPercentage;
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

    onConfirmarCobroDesdeComponente(payload: PaymentConfirmPayload): void {
        let codigoOp = payload.codigoOperacion;

        if (this.currentBalanceForModal?.tipoVenta === 'PRESENCIAL') {
            codigoOp += ' [PRESENCIAL]';
        }

        const procesarEnvio = (resolvedRoomId: string | null, voucherUrl: string | null) => {
            this.registrarCobroSaldoConRoomId(resolvedRoomId, codigoOp, payload.metodoPago, payload.metodoTexto, voucherUrl, payload);
        };

        const obtenerRoomIdYProcesar = (voucherUrl: string | null) => {
            if (this.cobroVentaId) {
                this.chatService.getMyRooms().subscribe({
                    next: (rooms) => {
                        const room = rooms ? rooms.find(r => r.requestId === this.cobroVentaId) : null;
                        procesarEnvio(room ? room.id : null, voucherUrl);
                    },
                    error: () => procesarEnvio(null, voucherUrl)
                });
            } else {
                procesarEnvio(null, voucherUrl);
            }
        };

        if (payload.voucherFile) {
            this.fileService.uploadImage(payload.voucherFile).subscribe({
                next: (res) => obtenerRoomIdYProcesar(res?.url || null),
                error: (err) => {
                    console.warn('Error al subir comprobante a Cloudinary (se continúa sin imagen):', err);
                    obtenerRoomIdYProcesar(null);
                }
            });
        } else {
            obtenerRoomIdYProcesar(null);
        }
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

        if (this.currentBalanceForModal?.tipoVenta === 'PRESENCIAL') {
            codigoOp += ' [PRESENCIAL]';
        }

        // Buscar si existe un roomId (sala de chat) asociada a esta solicitud para mantener el flujo de auditoría unido
        const procesarEnvio = (resolvedRoomId: string | null, voucherUrl: string | null) => {
            this.registrarCobroSaldoConRoomId(resolvedRoomId, codigoOp, metodoPagoTipo, metodoTexto, voucherUrl);
        };

        const obtenerRoomIdYProcesar = (voucherUrl: string | null) => {
            if (this.cobroVentaId) {
                this.chatService.getMyRooms().subscribe({
                    next: (rooms) => {
                        const room = rooms ? rooms.find(r => r.requestId === this.cobroVentaId) : null;
                        const resolvedRoomId = room ? room.id : null;
                        procesarEnvio(resolvedRoomId, voucherUrl);
                    },
                    error: () => procesarEnvio(null, voucherUrl)
                });
            } else {
                procesarEnvio(null, voucherUrl);
            }
        };

        // Si se subió un voucher de imagen, se sube primero a Cloudinary
        if (this.uploadedVoucherFile) {
            this.fileService.uploadImage(this.uploadedVoucherFile).subscribe({
                next: (res) => obtenerRoomIdYProcesar(res?.url || null),
                error: (err) => {
                    console.warn('Error al subir comprobante a Cloudinary (se continúa sin imagen):', err);
                    obtenerRoomIdYProcesar(null);
                }
            });
        } else {
            obtenerRoomIdYProcesar(null);
        }
    }

    private registrarCobroSaldoConRoomId(resolvedRoomId: string | null, codigoOp: string, metodoPagoTipo: 'ONLINE' | 'FISICO', metodoTexto: string, voucherUrl: string | null = null, confirmPayload?: PaymentConfirmPayload): void {
        const montoRecibido = confirmPayload ? confirmPayload.montoRecibido : (this.activePaymentMethod === 'efectivo' ? Number(this.cobroMontoRecibido) : Number(this.cobroMonto));
        const vuelto = confirmPayload ? confirmPayload.vuelto : (this.activePaymentMethod === 'efectivo' ? Math.max(0, Number(this.cobroMontoRecibido) - Number(this.cobroMonto)) : 0);
        const codigoSeguridad = confirmPayload ? confirmPayload.codigoSeguridad : ((this.activePaymentMethod === 'yape' && this.cobroCodigoSeguridad) ? this.cobroCodigoSeguridad.trim() : null);

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
            codigoOperacion: codigoOp,
            montoRecibido: montoRecibido,
            vuelto: vuelto,
            codigoSeguridad: codigoSeguridad,
            voucherUrl: voucherUrl
        };

        this.chatService.registerPayment(payload).subscribe({
            next: (res) => {
                alert('¡Saldo de cobro registrado con éxito!');

                // Marcar el pago como confirmado en localStorage para todos los IDs de referencia posibles
                if (this.currentBalanceForModal?.id) {
                    localStorage.setItem('pago_confirmado_' + this.currentBalanceForModal.id, 'true');
                }
                if (this.currentBalanceForModal?.budgetId) {
                    localStorage.setItem('pago_confirmado_' + this.currentBalanceForModal.budgetId, 'true');
                }
                if (this.currentBalanceForModal?.realSolicitudId) {
                    localStorage.setItem('pago_confirmado_' + this.currentBalanceForModal.realSolicitudId, 'true');
                }
                if (this.cobroVentaId) {
                    localStorage.setItem('pago_confirmado_' + this.cobroVentaId, 'true');
                }

                // Intentar actualizar el estado en el backend únicamente si existe un UUID de solicitud web real
                const targetRequestId = this.currentBalanceForModal?.realSolicitudId;
                if (targetRequestId) {
                    this.requestService.actualizarEstado(targetRequestId, { estado: 'COMPLETADO' }).subscribe({
                        next: () => {
                            this.loadPendingBalances();
                        },
                        error: (err) => {
                            console.warn('Nota: No se pudo cambiar el estado de la solicitud en backend (se completó localmente):', err);
                            this.loadPendingBalances();
                        }
                    });
                } else {
                    this.loadPendingBalances();
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

        const calculatedTotal = this.getTotalVenta();
        const total = (this.isPrefilled && this.paymentForm.amount) ? Number(this.paymentForm.amount) : calculatedTotal;
        const kind: 'ADELANTO' | 'SALDO' | 'TOTAL' = 
            this.paymentForm.kind.startsWith('Pago') || this.paymentForm.kind.includes('100%') 
                ? 'TOTAL' 
                : this.paymentForm.kind.startsWith('Saldo') 
                    ? 'SALDO' 
                    : 'ADELANTO';

        const amount = (this.isPrefilled && this.paymentForm.amount) ? Number(this.paymentForm.amount) : (kind === 'ADELANTO' ? total * 0.5 : total);
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
