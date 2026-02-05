// Shared types for the Ocean Garage application

export interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  year?: number;
  trim?: string;
  style?: string;
  bodyType?: string;
  engine?: string;
  transmission?: string;
  drive?: string;
  manufacturer?: string;
  origin?: string;
  licensePlate?: string;
  workDescription?: string;
  serviceType?: string;
  color?: string;
  mileage?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: 'on_hold' | 'active' | 'completed';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'worker';
  isActive: boolean;
  hourlyRate?: number;
  createdAt?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'invoice' | 'estimate';
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  createdAt: string;
  vehicle: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
}

export interface Expense {
  id: string;
  description: string;
  category: 'parts' | 'labor' | 'tools' | 'supplies' | 'other';
  amount: number;
  date: string;
  notes?: string;
  vehicle?: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
  createdBy: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
}

export interface TimeLog {
  id: string;
  hours: number;
  notes?: string;
  date: string;
  vehicle: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
  user: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
}

export interface WorkSession {
  id: string;
  checkIn: string;
  checkOut?: string;
  hours?: number;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  vehicle?: Vehicle;
  createdAt: string;
}

export interface WorkerSalary {
  userId: string;
  userName: string;
  userEmail: string;
  hourlyRate: number;
  totalHours: number;
  salary: number;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

// Form data types
export interface VehicleFormData {
  vin: string;
  brand: string;
  model: string;
  year: string;
  trim: string;
  style: string;
  bodyType: string;
  engine: string;
  transmission: string;
  drive: string;
  manufacturer: string;
  origin: string;
  licensePlate: string;
  workDescription: string;
  serviceType: string;
  color: string;
  mileage: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface InvoiceFormData {
  type: 'invoice' | 'estimate';
  vehicleId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  taxRate: string;
  notes: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    total: string;
  }>;
}

// Derendinger types
export interface DerendingerProduct {
  id: string;
  articleNumber: string;
  name: string;
  description: string;
  supplier: string;
  brand: string;
  stock: number;
  totalStock: number;
  price: number | null;
  images: string[];
  category: string;
  categoryName: string;
  salesQuantity: number;
  availabilityType?: string;
  deliveryInfo?: string;
}

export interface SelectedProduct extends DerendingerProduct {
  quantity: number;
  isAutoSelected?: boolean;
}

// Service Template types
export interface ServiceTemplatePart {
  partCode: string;
  name: string;
  functionalGroup?: string;
  quantity: number;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  estimatedHours: number;
  parts: ServiceTemplatePart[];
  isActive: boolean;
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
}
