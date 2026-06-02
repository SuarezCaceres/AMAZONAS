export interface Material {
  id: string;
  nombre: string;
  unidad: string;
  costoCompra: number;
  costoVenta: number;
  stockActual: number;
  categoriaId: string;
  categoriaNombre: string;
  proveedor?: string;
  activo: boolean;
}

export interface MaterialRequest {
  nombre: string;
  unidad: string;
  costoCompra: number;
  costoVenta: number;
  stockActual: number;
  categoriaId: string;
  proveedor?: string;
  activo?: boolean;
}

export interface MaterialCategory {
  id: string;
  nombre: string;
}
