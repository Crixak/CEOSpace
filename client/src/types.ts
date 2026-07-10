export type Role = "ADMIN" | "MANAGER" | "SELLER";
export type ProductUnit = "KG" | "UNIT";
export type PurchaseOrderStatus = "PENDING" | "RECEIVED" | "CANCELLED";
export type PriceTier = "DIA" | "NOCHE" | "FINDE";
export type PaymentMethod = "CASH" | "OTHER";

export interface ProductPrice {
  id: string;
  productId: string;
  tier: PriceTier;
  price: number | string;
  cashPrice: number | string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: Category;
  unit: ProductUnit;
  price: number | string;
  costPrice: number | string;
  minStock: number | string;
  active: boolean;
  vegetarian?: boolean;
  description?: string | null;
  prices?: ProductPrice[];
}

export interface Stock {
  id: string;
  productId: string;
  branchId: string;
  quantity: number | string;
  product: Product;
  branch: Branch;
  lowStock: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  hiredAt: string;
  branchId: string | null;
  branch?: Branch | null;
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number | string;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface Sale {
  id: string;
  branchId: string;
  branch?: Branch;
  userId: string;
  user?: { id: string; name: string };
  total: number | string;
  paymentMethod?: PaymentMethod;
  priceTier?: PriceTier | null;
  createdAt: string;
  items: SaleItem[];
}

export interface Supplier {
  id: string;
  name: string;
  cuit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number | string;
  unitCost: number | string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  branchId: string;
  branch?: Branch;
  status: PurchaseOrderStatus;
  createdAt: string;
  receivedAt?: string | null;
  items: PurchaseOrderItem[];
}

export interface SalesSummary {
  totalSales: number;
  salesCount: number;
  byDay: { date: string; total: number }[];
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
}
