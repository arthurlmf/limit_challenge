export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface Office {
  id: number;
  name: string;
  city: string;
}
export interface Mechanic {
  id: number;
  name: string;
  certification_number: string;
  active: boolean;
}
export interface Vehicle {
  id: number;
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  office: number;
  active: boolean;
}
export interface Maintenance {
  id: number;
  vehicle: number;
  mechanic: Mechanic;
  maintenance_date: string;
  maintenance_type: string;
  cost: string;
  notes: string;
}
export interface VehicleDetail extends Omit<Vehicle, 'office'> {
  office: Office;
  maintenance_records: Maintenance[];
}
export interface DueVehicle extends Vehicle {
  last_maintenance: string | null;
}
export type OfficeInput = Omit<Office, 'id'>;
export type MechanicInput = Omit<Mechanic, 'id'>;
export type VehicleInput = Omit<Vehicle, 'id'>;
export type MaintenanceInput = Omit<Maintenance, 'id' | 'mechanic'> & { mechanic: number };
