import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModelItem } from '../../../data/model';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { PurchaseRequestRequest } from '../../../../models/purchase-request.model';
import { MaterialService } from '../../../../services/material.service';

export type RequestMode = 'personalizar' | 'comprar';

export interface SessionUser {
  name: string;
  email: string;
}

export interface SavedRequest {
  id: number;
  backendId?: string;
  mode: RequestMode;
  modelTitle: string;
  fullName: string;
  email: string;
  phone: string;
  detail: string;
  explanation: boolean;
  date: string;
  selectedMaterials?: string[];
  extraMaterials?: string[];
  otherMaterials?: string;
  explanationType?: string;
  explanationModel?: string;
  explanationPeople?: number;
  status?: string;
  unreadCount?: number;
  lastMessageAt?: string;
}

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.css'
})
export class RequestFormComponent implements OnInit {

  private readonly requestService = inject(PurchaseRequestService);
  private readonly materialService = inject(MaterialService);

  @Input({ required: true }) model!: ModelItem;
  @Input({ required: true }) mode!: RequestMode;
  @Input() user: SessionUser | null = null;

  // NUEVO INPUT
  @Input() standaloneRequest = false;

  @Output() changedMode = new EventEmitter<RequestMode>();
  @Output() submitted = new EventEmitter<SavedRequest>();

  loading = false;

  materialOptions = [
    'Carton reciclado',
    'Arcilla',
    'Pintura acrilica',
    'Materiales reciclables',
    'Carton',
    'Cartulina',
    'Tecnopor',
    'Duplex',
    'Fideos',
    'Plastilina',
    'Madera',
    'Algodon',
    'Aserrin',
    'Palitos de chupete',
    'Chapitas de plastico',
    'Botellas de plastico',
    'Discos',
    'Papel',
    'Temperas',
    'Pegamento',
    'Silicona'
  ];

  additionalMaterials = [
    'Carton',
    'Cartulina',
    'Tecnopor',
    'Duplex',
    'Fideos',
    'Plastilina',
    'Madera',
    'Algodon',
    'Aserrin',
    'Palitos de chupete',
    'Chapitas de plastico',
    'Botellas de plastico',
    'Discos',
    'Papel',
    'Temperas',
    'Pegamento',
    'Silicona'
  ];

  form = {
    fullName: '',
    email: '',
    phone: '',
    description: '',
    message: '',
    otherMaterials: '',
    explanation: false,
    explanationType: 'presencial',
    explanationModel: '',
    explanationPeople: 2
  };

  explanationTypes = [
    { value: 'video', label: 'Video pregrabado', icon: '&#128249;' },
    { value: 'presencial', label: 'Explicacion presencial', icon: '&#128101;' },
    { value: 'virtual', label: 'Explicacion virtual', icon: '&#128249; &#128101;' }
  ];

  explanationModels = ['Individual', 'Grupal', 'Salon'];

  selectedMaterials: string[] = [];
  materialDropdownOptions: string[][] = [];
  selectedExtras: string[] = [];
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.materialService.getAllMaterials().subscribe({
      next: (mats) => {
        if (mats && mats.length > 0) {
          const activeMats = mats.filter(m => m.activo !== false).map(m => m.nombre);
          if (activeMats.length > 0) {
            this.materialOptions = activeMats;
            this.additionalMaterials = [...activeMats];
            this.regenerateDropdownOptions(false);
          }
        }
      },
      error: (err) => {
        console.error('Error fetching materials from DB, using fallback hardcoded list:', err);
      }
    });
  }

  ngOnChanges(): void {
    this.form.fullName = this.user?.name || this.form.fullName || 'Juan';
    this.form.email = this.user?.email || this.form.email || 'juan@gmail.com';
    this.form.phone = this.form.phone || '+51 999 999 999';

    this.regenerateDropdownOptions(true);
  }

  regenerateDropdownOptions(resetSelected: boolean): void {
    if (this.model?.materials) {
      if (resetSelected || !this.selectedMaterials || this.selectedMaterials.length === 0) {
        this.selectedMaterials = this.model.materials.slice(0, 4);
      }

      // Generate the options for each slot
      this.materialDropdownOptions = [];
      const originalMaterials = this.model.materials.slice(0, 4);
      for (let i = 0; i < 4; i++) {
        const orig = originalMaterials[i];
        if (orig) {
          if (!this.materialOptions.includes(orig)) {
            this.materialDropdownOptions.push([orig, ...this.materialOptions]);
          } else {
            this.materialDropdownOptions.push([...this.materialOptions]);
          }
        } else {
          this.materialDropdownOptions.push([...this.materialOptions]);
        }
      }

      while (
        this.selectedMaterials.length < 4 &&
        this.selectedMaterials.length < this.materialOptions.length
      ) {
        this.selectedMaterials.push(
          this.materialOptions[this.selectedMaterials.length]
        );
      }
    }
  }

  get isCustomization(): boolean {
    return this.mode === 'personalizar';
  }

  get title(): string {
    return this.isCustomization
      ? 'Personalizar Maqueta'
      : 'Comprar Maqueta Ya Hecha';
  }

  get actionTitle(): string {
    return this.isCustomization
      ? 'Solicitud de Personalizacion'
      : 'Solicitar Compra';
  }

  get submitLabel(): string {
    return this.isCustomization
      ? 'Enviar Solicitud de Personalizacion'
      : 'Enviar Solicitud';
  }

  get alternateMode(): RequestMode {
    return this.isCustomization ? 'comprar' : 'personalizar';
  }

  get requiresExplanationPeople(): boolean {
    return (
      this.form.explanationModel === 'Grupal' ||
      this.form.explanationModel === 'Salon'
    );
  }

  get explanationPeopleMinimum(): number {
    return this.form.explanationModel === 'Salon' ? 10 : 2;
  }

  updateExplanationPeopleMinimum(): void {
    if (!this.requiresExplanationPeople) {
      return;
    }

    this.form.explanationPeople = this.explanationPeopleMinimum;
  }

  toggleExtra(material: string): void {
    this.selectedExtras = this.selectedExtras.includes(material)
      ? this.selectedExtras.filter((item) => item !== material)
      : [...this.selectedExtras, material];
  }

  isExtraSelected(material: string): boolean {
    return this.selectedExtras.includes(material);
  }

  submitRequest(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validar duplicidad de materiales seleccionados (si es personalización)
    if (this.isCustomization && this.selectedMaterials && this.selectedMaterials.length > 0) {
      const nonNullMaterials = this.selectedMaterials.filter(m => !!m).map(m => m.trim().toLowerCase());
      const uniqueMaterials = new Set(nonNullMaterials);
      if (uniqueMaterials.size !== nonNullMaterials.length) {
        this.errorMessage = 'No se permiten materiales duplicados. Cada material seleccionado debe ser único.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Validar teléfono del cliente (Perú: 9 dígitos numéricos)
    const rawPhone = this.form.phone || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('51')) {
      cleanPhone = cleanPhone.substring(2);
    }

    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      this.errorMessage = 'El número telefónico debe contener exactamente 9 dígitos numéricos (ej: 999888777).';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.form.phone = cleanPhone;

    const request: SavedRequest = {
      id: Date.now(),
      mode: this.mode,
      modelTitle: this.model?.title || 'Solicitud personalizada',
      fullName: this.form.fullName,
      email: this.form.email,
      phone: this.form.phone,
      detail: this.isCustomization
        ? this.form.description
        : this.form.message,
      explanation: this.form.explanation,
      date: new Date().toISOString(),
      selectedMaterials: this.isCustomization
        ? [...this.selectedMaterials]
        : undefined,
      extraMaterials: this.isCustomization
        ? [...this.selectedExtras]
        : undefined,
      otherMaterials: this.isCustomization
        ? this.form.otherMaterials
        : undefined,
      explanationType: this.form.explanation
        ? this.form.explanationType
        : undefined,
      explanationModel: this.form.explanation
        ? this.form.explanationModel
        : undefined,
      explanationPeople:
        this.form.explanation && this.requiresExplanationPeople
          ? this.form.explanationPeople
          : undefined
    };

    // Construct the backend request matching V1__init_schema.sql and DTOs
    const reqBody: PurchaseRequestRequest = {
      clienteNombre: this.form.fullName.trim(),
      clienteEmail: this.form.email.trim(),
      clienteTelefono: this.form.phone.trim(),
      mensaje: !this.isCustomization ? this.form.message : undefined,
      productoId: this.model?.id || undefined,
      isKit: false,
      isCustom: this.isCustomization,
      descripcionPersonalizacion: this.isCustomization ? this.form.description : undefined,
      materialesDeseados: this.isCustomization && this.form.otherMaterials
        ? this.form.otherMaterials
        : undefined,
      solicitarExplicacion: this.form.explanation,
      tipoEvento: this.form.explanation ? this.form.explanationType : undefined,
      cantidadPersonas: this.form.explanation && this.requiresExplanationPeople ? this.form.explanationPeople : undefined,
      materialesCustomizados: [],
      materialesPersonales: [],
      materialesPreferidos: this.isCustomization && this.selectedExtras.length > 0
        ? this.selectedExtras.map(extraName => ({
            materialName: extraName,
            razonPreferencia: 'Material extra seleccionado por el cliente'
          }))
        : []
    };

    if (this.isCustomization && this.model?.rawProduct?.materialesDetalle) {
      const details: any[] = this.model.rawProduct.materialesDetalle;
      this.selectedMaterials.forEach((matName) => {
        const found = details.find((d: any) => d.nombre === matName);
        if (found) {
          reqBody.materialesCustomizados?.push({
            materialId: found.materialId,
            cantidad: found.cantidadSugerida || 1
          });
        } else {
          reqBody.materialesPersonales?.push({
            materialName: matName,
            cantidad: 1,
            descripcion: 'Material personalizado'
          });
        }
      });
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.loading = true;
    this.requestService.crear(reqBody).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (response) => {
        console.log('Solicitud creada en backend con éxito', response);
        const saved = this.getSavedRequests();
        localStorage.setItem(
          'maquetasRequests',
          JSON.stringify([request, ...saved])
        );

        this.successMessage = 'Solicitud enviada correctamente.';
        this.submitted.emit(request);
      },
      error: (err) => {
        console.error('Error al crear solicitud en el backend', err);
        if (err?.status === 409) {
          this.errorMessage = 'Ya has enviado una solicitud para este producto recientemente. Por favor, espera 1 minuto.';
        } else if (err?.status === 400) {
          this.errorMessage = err?.error?.message || 'Error de validación en los datos de la solicitud.';
        } else if (err?.status === 401 || err?.status === 403) {
          this.errorMessage = 'No tienes autorización. Por favor, inicia sesión de nuevo.';
        } else if (err?.status === 0) {
          // Servidor caído: permitimos guardar de forma local temporal
          const saved = this.getSavedRequests();
          localStorage.setItem(
            'maquetasRequests',
            JSON.stringify([request, ...saved])
          );
          this.successMessage = 'El servidor no responde. Solicitud guardada localmente de forma temporal.';
          this.submitted.emit(request);
        } else {
          this.errorMessage = err?.error?.message || err?.error || 'Error al procesar la solicitud. Intenta nuevamente.';
        }
      }
    });
  }

  private getSavedRequests(): SavedRequest[] {
    const saved = localStorage.getItem('maquetasRequests');
    return saved ? JSON.parse(saved) : [];
  }
}
