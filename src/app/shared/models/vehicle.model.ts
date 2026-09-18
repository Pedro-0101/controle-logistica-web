/** Tipo do veículo no sistema. */
export type VehicleType = 'own' | 'thirdParty' | 'visitor';

/** Veículo, conforme retornado por `/vehicle`. */
export interface Vehicle {
  id: string;
  plate: string;
  code: string;
  type: VehicleType;
  companyId: string;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do POST /vehicle. O `code` é omitido para terceiro/visitante (gerado pelo back-end). */
export interface CreateVehicleRequest {
  plate: string;
  code?: string;
  type?: VehicleType;
  active?: boolean;
}

/** Corpo do PATCH /vehicle/{id}. */
export interface UpdateVehicleRequest {
  plate?: string;
  code?: string;
  type?: VehicleType;
  active?: boolean;
}
