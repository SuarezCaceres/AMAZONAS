export interface BudgetItemRequest {
  materialId: string;
  cantidad: number;
}

export interface BudgetExplanationServiceRequest {
  incluido?: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
  duracionMinutos?: number;
  precio?: number;
  notas?: string;
}

export interface BudgetRequest {
  solicitudId: string;
  nombre: string;
  descripcion?: string;
  manoDeObra: number;
  margenGanancia: number;
  adelantoRequerido?: boolean;
  adelantoPorcentaje?: number;
  items: BudgetItemRequest[];
  servicioExplicacion?: BudgetExplanationServiceRequest;
}

export interface BudgetItemResponse {
  id: string;
  materialId: string;
  materialNombre: string;
  materialUnidad: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export interface BudgetExplanationServiceResponse {
  id: string;
  incluido: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
  duracionMinutos?: number;
  precio: number;
  notas?: string;
}

export interface BudgetResponse {
  id: string;
  solicitudId: string;
  nombre: string;
  descripcion?: string;
  codigoReferencia?: string;
  estado?: string;
  manoDeObra: number;
  margenGanancia: number;
  adelantoRequerido: boolean;
  adelantoPorcentaje?: number;
  costoMateriales: number;
  subtotal: number;
  ganancia: number;
  total: number;
  adelantoMonto: number;
  items: BudgetItemResponse[];
  servicioExplicacion?: BudgetExplanationServiceResponse;
  createdAt: string;
  updatedAt: string;
}
