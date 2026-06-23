export type EstadoSolicitud = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO';

export interface KitMaquetaRequest {
  productId: string;
  cantidad: number;
  precioUnitarioReferencia?: number;
}

export interface KitCustomizedMaterialRequest {
  materialId: string;
  cantidad: number;
}

export interface KitPersonalMaterialRequest {
  materialName: string;
  cantidad: number;
  descripcion?: string;
}

export interface RequestPreferredMaterialRequest {
  materialId?: string;
  materialName: string;
  razonPreferencia?: string;
}

export interface PurchaseRequestRequest {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  mensaje?: string;
  productoId?: string;
  isKit?: boolean;
  kits?: KitMaquetaRequest[];
  isCustom?: boolean;
  descripcionPersonalizacion?: string;
  materialesDeseados?: string;
  materialesCustomizados?: KitCustomizedMaterialRequest[];
  materialesPersonales?: KitPersonalMaterialRequest[];
  materialesPreferidos?: RequestPreferredMaterialRequest[];
  solicitarExplicacion?: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
}

export interface UpdateEstadoRequest {
  estado: EstadoSolicitud;
}

export interface KitMaquetaResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  cantidad: number;
  precioUnitarioReferencia: number;
  subtotal: number;
}

export interface KitCustomizedMaterialResponse {
  id: string;
  materialId: string;
  materialName: string;
  materialUnit: string;
  cantidad: number;
  costoUnitarioReferencia: number;
  subtotal: number;
}

export interface KitPersonalMaterialResponse {
  id: string;
  materialName: string;
  cantidad: number;
  descripcion?: string;
}

export interface RequestPreferredMaterialResponse {
  id: string;
  materialId?: string;
  materialName: string;
  razonPreferencia?: string;
}

export interface PurchaseRequestResponse {
  id: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  productoId?: string;
  productoNombre?: string;
  isKit: boolean;
  isCustom: boolean;
  estado: EstadoSolicitud;
  mensaje?: string;
  descripcionPersonalizacion?: string;
  materialesDeseados?: string;
  solicitarExplicacion: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
  kits?: KitMaquetaResponse[];
  materialesCustomizados?: KitCustomizedMaterialResponse[];
  materialesPersonales?: KitPersonalMaterialResponse[];
  materialesPreferidos?: RequestPreferredMaterialResponse[];
  tienePresupuesto: boolean;
  grabacionesUrls?: string[];
  archivosUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialPresupuestoDTO {
  id: string;
  nombre: string;
  unidad: string;
  costoVenta: number;
  cantidadSugerida: number;
  esOpcional: boolean;
}

export interface MaterialSolicitadoDTO {
  materialId?: string;
  nombre: string;
  unidad?: string;
  costoVenta?: number;
  razonPreferencia?: string;
}

export interface SolicitudParaPresupuestoResponse {
  id: string;
  productoNombre: string;
  descripcionPersonalizacion?: string;
  isCustom: boolean;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  createdAt: string;
  materialesProducto: MaterialPresupuestoDTO[];
  materialesPreferidos: MaterialSolicitadoDTO[];
  materialesDeseados?: string;
  solicitarExplicacion?: boolean;
  tipoEvento?: string;
  cantidadPersonas?: number;
}
