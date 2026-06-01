import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { SavedRequest, SessionUser } from '../request-form/request-form.component';
import { PurchaseRequestService } from '../../services/purchase-request.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-requests.component.html',
  styleUrl: './my-requests.component.css'
})
export class MyRequestsComponent implements OnChanges {
  @Input() user: SessionUser | null = null;

  private readonly requestService = inject(PurchaseRequestService);

  requests: SavedRequest[] = [];

  ngOnChanges(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.requestService.listarMisSolicitudes().subscribe({
      next: (responses) => {
        this.requests = responses.map((res): SavedRequest => ({
          id: 0,
          mode: res.isCustom ? 'personalizar' : 'comprar',
          modelTitle: res.productoNombre || 'Solicitud personalizada',
          fullName: res.clienteNombre,
          email: res.clienteEmail,
          phone: res.clienteTelefono || '',
          detail: res.isCustom ? res.descripcionPersonalizacion || '' : res.mensaje || '',
          explanation: res.solicitarExplicacion,
          date: res.createdAt,
          selectedMaterials: res.materialesCustomizados?.map(m => m.materialName) || []
        }));
      },
      error: (err) => {
        console.error('Error loading requests from backend, falling back to local storage', err);
        const saved = localStorage.getItem('maquetasRequests');
        const allRequests: SavedRequest[] = saved ? JSON.parse(saved) : [];
        this.requests = this.user
          ? allRequests.filter((request) => request.email === this.user?.email)
          : allRequests;
      }
    });
  }

  getTypeLabel(mode: SavedRequest['mode']): string {
    return mode === 'personalizar' ? 'Personalizacion' : 'Compra';
  }
}
