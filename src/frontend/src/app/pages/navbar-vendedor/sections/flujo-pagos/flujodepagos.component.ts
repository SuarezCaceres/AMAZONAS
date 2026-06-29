import { CommonModule } from '@angular/common';
import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../services/chat.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';

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
        inventory: false,
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

    methodFilters = ['Metodo', 'Online', 'Fisico'];
    kindFilters = ['Abono', 'Adelanto', 'Saldo', 'Total'];

    selectedMethodFilter = 'Metodo';
    selectedKindFilter = 'Abono';
    searchTerm = '';

    pendingBalances: PendingBalance[] = [];
    transactions: Transaction[] = [];
    dailyStats = {
        ventasTotales: 0,
        metodoOnlineCount: 0,
        metodoFisicoCount: 0
    };

    ngOnInit(): void {
        this.loadTransactions();
        this.loadPendingBalances();
        this.loadDailyStats();
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
                inventory: this.prefilledData.inventory || true,
                voucherUrl: this.prefilledData.voucherUrl || ''
            };
            (this.paymentForm as any).roomId = this.prefilledData.roomId;
            (this.paymentForm as any).solicitudId = this.prefilledData.solicitudId;
            (this.paymentForm as any).messageId = this.prefilledData.messageId;
        } else if (changes['prefilledData'] && !this.prefilledData) {
            this.isPrefilled = false;
        }
    }

    loadTransactions(): void {
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
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        status: tx.metodoPago === 'ONLINE' ? 'online' : 'fisico'
                    }));
                }
            },
            error: (err) => console.error('Error al cargar transacciones reales:', err)
        });
    }

    loadPendingBalances(): void {
        this.requestService.listarTodas().subscribe({
            next: (reqs) => {
                if (reqs) {
                    this.pendingBalances = reqs
                        .filter(r => r.estado === 'PENDIENTE' || r.estado === 'PROCESANDO')
                        .map(r => {
                            const estimatedAmount = r.isCustom ? 187.85 : 120.00;
                            return {
                                client: r.clienteNombre,
                                project: r.productoNombre || 'Proyecto Maqueta',
                                materials: r.materialesDeseados || 'Materiales estándar',
                                method: r.isCustom ? 'Online' as PaymentMethod : 'Fisico' as PaymentMethod,
                                amount: estimatedAmount,
                                dueDate: r.estado === 'PENDIENTE' ? 'Hoy' : 'En proceso',
                                solicitudId: r.id
                            };
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

    get filteredTransactions(): Transaction[] {
        const query = this.searchTerm.trim().toLowerCase();

        return this.transactions.filter((transaction) => {
            const matchesSearch = !query || transaction.client.toLowerCase().includes(query);
            const matchesMethod = this.selectedMethodFilter === 'Metodo' || transaction.method === this.selectedMethodFilter;
            const matchesKind = this.selectedKindFilter === 'Abono' || transaction.kind === this.selectedKindFilter;

            return matchesSearch && matchesMethod && matchesKind;
        });
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
            method: '',
            kind: '',
            date: '',
            operation: '',
            inventory: false,
            voucherUrl: ''
        };
    }

    collectBalance(balance: PendingBalance): void {
        this.paymentForm.client = balance.client;
        this.paymentForm.materials = balance.materials;
        this.paymentForm.amount = balance.amount;
        this.paymentForm.method = balance.method === 'Online'
            ? 'Online (Yape / Transferencia)'
            : 'Fisico (Efectivo en persona)';
        this.paymentForm.kind = 'Saldo Restante (50%)';
    }

    cancelTransaction(transaction: Transaction): void {
        // En un entorno de producción se llamaría a un servicio DELETE, de momento filtramos localmente
        this.transactions = this.transactions.filter((item) => item !== transaction);
    }

    exportCsv(): void {
        this.exportLabel = 'CSV exportado';
        window.setTimeout(() => {
            this.exportLabel = 'Exportar CSV';
        }, 1200);
    }

    registerTransaction(): void {
        if (!this.paymentForm.client || !this.paymentForm.email || !this.paymentForm.amount) {
            alert('Por favor, completa los campos obligatorios: Cliente, Correo y Monto.');
            return;
        }

        const method: 'ONLINE' | 'FISICO' = this.paymentForm.method.startsWith('Online') ? 'ONLINE' : 'FISICO';
        const kind: 'ADELANTO' | 'SALDO' | 'TOTAL' = this.paymentForm.kind.startsWith('Pago') || this.paymentForm.kind.includes('100%') ? 'TOTAL' : this.paymentForm.kind.startsWith('Saldo') ? 'SALDO' : 'ADELANTO';
        const tipoMaqueta = this.paymentForm.productType.includes('Personalizado') ? 'PERSONALIZADA' : 'PREDETERMINADA';

        const payload = {
            clientName: this.paymentForm.client,
            clientEmail: this.paymentForm.email,
            clientPhone: this.paymentForm.phone || '999999999',
            roomId: (this.paymentForm as any).roomId || null,
            monto: Number(this.paymentForm.amount || 0),
            metodoPago: method,
            tipoAbono: kind,
            tipoMaqueta: tipoMaqueta,
            materiales: this.paymentForm.materials || 'Materiales del proyecto',
            fechaTransaccion: this.paymentForm.date ? new Date(this.paymentForm.date).toISOString() : new Date().toISOString(),
            codigoOperacion: this.paymentForm.operation || `OPE-${Date.now()}`
        };

        this.chatService.registerPayment(payload).subscribe({
            next: (res) => {
                alert('¡Pago registrado con éxito en la base de datos!');

                // Enviar mensaje de confirmación del sistema vía WebSocket
                if (payload.roomId) {
                    const abonoText = kind === 'ADELANTO' ? 'adelanto' : kind === 'SALDO' ? 'saldo' : 'pago completo';
                    const sysMessage = `El vendedor ha verificado y registrado el pago de ${abonoText} de S/ ${payload.monto.toFixed(2)}.`;
                    this.chatService.sendMessage(payload.roomId, sysMessage, 'SYSTEM');
                }

                // Notificar al padre y reiniciar
                this.pagoRegistrado.emit();
                this.resetForm();

                // Recargar datos reales
                this.loadTransactions();
                this.loadPendingBalances();
                this.loadDailyStats();
            },
            error: (err) => {
                console.error('Error al registrar pago en backend:', err);
                alert(err?.error?.message || 'Error al registrar el pago. Asegúrate de que el cliente esté registrado en la base de datos.');
            }
        });
    }
}
