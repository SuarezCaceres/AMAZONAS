import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PaymentConfirmPayload {
    metodoPago: 'ONLINE' | 'FISICO';
    metodoTexto: string;
    codigoOperacion: string;
    monto: number;
    montoRecibido: number;
    vuelto: number;
    codigoSeguridad: string | null;
    voucherFile: File | null;
    voucherName: string;
    prefilledVoucherUrl?: string;
}

@Component({
    selector: 'app-payment-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './payment-modal.component.html',
    styleUrl: './payment-modal.component.css'
})
export class PaymentModalComponent {
    @Input() isOpen = false;
    @Input() clientName = '';
    @Input() amountToPay = 0;
    @Input() title = 'Registrar Pago';
    @Input() projectName = 'Proyecto Maqueta';
    @Input() materialsDescription = '';
    @Input() summaryLabel = 'Liquidación de saldo pendiente';
    @Input() allowOnlineMethods = true;
    @Input() allowFisicoMethods = true;
    @Input() prefilledVoucherUrl = '';

    @Output() close = new EventEmitter<void>();
    @Output() confirm = new EventEmitter<PaymentConfirmPayload>();

    activePaymentMethod: 'yape' | 'transferencia' | 'efectivo' = 'yape';
    numeroOperacion = '';
    codigoSeguridad = '';
    montoRecibido = 0;
    copiadoExitoso = false;
    uploadedVoucherName = '';
    uploadedVoucherFile: File | null = null;

    get vuelto(): string {
        const cambio = Math.max(0, this.montoRecibido - this.amountToPay);
        return cambio.toFixed(2);
    }

    ngOnChanges(): void {
        if (this.isOpen) {
            // Reset internal state when modal opens
            if (!this.allowOnlineMethods && this.allowFisicoMethods) {
                this.activePaymentMethod = 'efectivo';
            } else {
                this.activePaymentMethod = 'yape';
            }
            this.numeroOperacion = '';
            this.codigoSeguridad = '';
            this.montoRecibido = 0;
            this.copiadoExitoso = false;
            
            if (this.prefilledVoucherUrl) {
                this.uploadedVoucherName = 'Comprobante enviado por cliente';
                this.uploadedVoucherFile = null;
            } else {
                this.uploadedVoucherName = '';
                this.uploadedVoucherFile = null;
            }
        }
    }

    copiarNumeroYape(): void {
        navigator.clipboard.writeText('923932945').then(() => {
            this.copiadoExitoso = true;
            setTimeout(() => this.copiadoExitoso = false, 2000);
        });
    }

    triggerFileUploader(): void {
        const fileInput = document.getElementById('payment-modal-file-input') as HTMLInputElement;
        if (fileInput) fileInput.click();
    }

    handleFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.uploadedVoucherFile = file;
            this.uploadedVoucherName = file.name;
        }
    }

    clearPrefilledVoucher(event: Event): void {
        event.stopPropagation();
        this.uploadedVoucherName = '';
        this.uploadedVoucherFile = null;
        this.prefilledVoucherUrl = '';
    }

    onNumeroOperacionInput(event: any): void {
        const raw = event.target.value || '';
        this.numeroOperacion = raw.replace(/\D/g, '').slice(0, 8);
        event.target.value = this.numeroOperacion;
    }

    onCodigoSeguridadInput(event: any): void {
        const raw = event.target.value || '';
        this.codigoSeguridad = raw.replace(/\D/g, '').slice(0, 3);
        event.target.value = this.codigoSeguridad;
    }

    submitPayment(): void {
        if (this.amountToPay <= 0) {
            alert('El monto debe ser mayor a cero.');
            return;
        }

        let codigoOp = '';
        let metodoTexto = '';
        let metodoPagoTipo: 'ONLINE' | 'FISICO' = 'ONLINE';

        if (this.activePaymentMethod === 'yape') {
            const numOp = this.numeroOperacion ? this.numeroOperacion.trim() : '';
            const codSeg = this.codigoSeguridad ? this.codigoSeguridad.trim() : '';

            if (!numOp) {
                alert('Por favor ingresa el número de operación de Yape / Plin.');
                return;
            }
            if (numOp.length !== 8) {
                alert('El número de operación de Yape / Plin debe tener exactamente 8 dígitos numéricos.');
                return;
            }
            if (!codSeg) {
                alert('Por favor ingresa el código de seguridad.');
                return;
            }
            if (codSeg.length !== 3) {
                alert('El código de seguridad debe tener exactamente 3 dígitos numéricos.');
                return;
            }
            codigoOp = `YAPE-${numOp}`;
            metodoTexto = 'Yape / Plin';
            metodoPagoTipo = 'ONLINE';
        } else if (this.activePaymentMethod === 'transferencia') {
            const numOp = this.numeroOperacion ? this.numeroOperacion.trim() : '';
            if (!numOp) {
                alert('Por favor ingresa el número de operación de la transferencia.');
                return;
            }
            if (numOp.length !== 8) {
                alert('El número de operación de la transferencia debe tener exactamente 8 dígitos numéricos.');
                return;
            }
            codigoOp = `TRANSF-${numOp}`;
            metodoTexto = 'Transferencia Bancaria';
            metodoPagoTipo = 'ONLINE';
        } else {
            if (this.montoRecibido < this.amountToPay) {
                alert(`El monto recibido (S/ ${this.montoRecibido}) es menor al saldo a pagar (S/ ${this.amountToPay}).`);
                return;
            }
            codigoOp = `EFECTIVO-CAJA-${Date.now()}`;
            metodoTexto = 'Efectivo en persona';
            metodoPagoTipo = 'FISICO';
        }

        if (this.uploadedVoucherName) {
            codigoOp += ` (${this.uploadedVoucherName})`;
        }

        const montoRecibido = this.activePaymentMethod === 'efectivo' ? Number(this.montoRecibido) : Number(this.amountToPay);
        const vuelto = this.activePaymentMethod === 'efectivo' ? Math.max(0, Number(this.montoRecibido) - Number(this.amountToPay)) : 0;
        const codigoSeguridadVal = (this.activePaymentMethod === 'yape' && this.codigoSeguridad) ? this.codigoSeguridad.trim() : null;

        this.confirm.emit({
            metodoPago: metodoPagoTipo,
            metodoTexto: metodoTexto,
            codigoOperacion: codigoOp,
            monto: this.amountToPay,
            montoRecibido: montoRecibido,
            vuelto: vuelto,
            codigoSeguridad: codigoSeguridadVal,
            voucherFile: this.uploadedVoucherFile,
            voucherName: this.uploadedVoucherName,
            prefilledVoucherUrl: this.prefilledVoucherUrl
        });
    }

    closeModal(): void {
        this.close.emit();
    }
}
