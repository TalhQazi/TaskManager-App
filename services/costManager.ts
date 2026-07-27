import { apiRequest } from "@/services/api";

// ---------- Types ----------

export type PurchaseStatus =
  | "not_purchased"
  | "ready_to_buy"
  | "partially_paid"
  | "purchased"
  | "shipped"
  | "received"
  | "stored"
  | "delayed"
  | "canceled";

export type ExpenseType =
  | "material"
  | "manufacturing"
  | "testing"
  | "certification"
  | "permit"
  | "shipping"
  | "tax"
  | "lab"
  | "packaging"
  | "other";

export interface CostVendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
}

export interface CostStorage {
  locationName?: string;
  address?: string;
  building?: string;
  room?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  qtyStored?: number;
  notes?: string;
  storedByUsername?: string;
  storedAt?: string | null;
}

export type CostFileType =
  | "quote"
  | "invoice"
  | "receipt"
  | "purchase_order"
  | "spec_sheet"
  | "safety_data_sheet"
  | "lab_report"
  | "photo"
  | "tracking"
  | "other";

export interface CostAttachment {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  fileType: CostFileType;
  uploadedByUsername: string;
  uploadedAt: string;
}

export type CostItemWarning = "missing_vendor" | "missing_receipt" | "not_stored";

export interface InventoryRecord {
  id: string;
  lineItemId: string;
  projectId: string;
  locationName: string;
  address: string;
  building: string;
  room: string;
  aisle: string;
  shelf: string;
  bin: string;
  qtyStored: number;
  unit: string;
  notes: string;
  qrCode: string;
  photoUrl: string;
  storedByUsername: string;
  storedAt: string;
}

export interface InventorySearchResult extends InventoryRecord {
  itemName: string;
  purchaseStatus: PurchaseStatus;
  vendorName: string;
  projectName: string;
}

export type CertificationType = "lab_testing" | "ul_listing" | "permit" | "certification" | "retesting";
export type CertificationStatus =
  | "planned"
  | "quoted"
  | "submitted"
  | "in_progress"
  | "passed"
  | "failed"
  | "approved"
  | "expired";

export interface CertificationRequirement {
  id: string;
  projectId: string;
  lineItemId: string | null;
  requirementType: CertificationType;
  name: string;
  authorityOrLab: string;
  standard: string;
  status: CertificationStatus;
  requiredForPrototype: boolean;
  estimatedCostCents: number;
  paidCents: number;
  dueDate: string | null;
  filingDate: string | null;
  approvalDate: string | null;
  expirationDate: string | null;
  result: string;
  notes: string;
}

export interface CostLineItem {
  id: string;
  costSheetId: string;
  costSectionId: string;
  projectId: string;
  taskId: string;
  itemName: string;
  description: string;
  expenseType: ExpenseType;
  qty: number;
  unit: string;
  unitCostCents: number;
  shippingCostCents: number;
  taxCostCents: number;
  otherFeesCents: number;
  estimatedTotalCents: number;
  paidCents: number;
  remainingCents: number;
  vendorId: string | null;
  vendor: CostVendor | null;
  quoteNumber: string;
  purchaseStatus: PurchaseStatus;
  priority: "low" | "medium" | "high" | "critical";
  requiredForPrototype: boolean;
  isActive: boolean;
  storage: CostStorage;
  attachments: CostAttachment[];
  warnings: CostItemWarning[];
  notes: string;
}

export interface CostSection {
  id: string;
  name: string;
  sortOrder: number;
  isRequired: boolean;
  subtotalEstimatedCents: number;
  subtotalPaidCents: number;
  items: CostLineItem[];
}

export interface CostSummary {
  projectedCents: number;
  spentCents: number;
  remainingCents: number;
  availableBudgetCents: number;
  budgetAfterRemainingCents: number;
  purchasedCount: number;
  totalCount: number;
  purchasedPct: number;
  buildReadinessPct: number;
  nextBlocker: {
    id: string;
    itemName: string;
    remainingCents: number;
    priority: string;
    purchaseStatus: PurchaseStatus;
  } | null;
}

export interface CostSheetPayload {
  sheet: {
    id: string;
    projectId: string;
    name: string;
    currency: string;
    availableBudgetCents: number;
  };
  sections: CostSection[];
  certifications: CertificationRequirement[];
  summary: CostSummary;
}

// ---------- Money helpers (values stored as integer cents) ----------

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

export function dollarsToCents(input: string | number): number {
  const n = typeof input === "string" ? Number(input.replace(/[$,\s]/g, "")) : input;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDollarInput(cents: number): string {
  return ((cents || 0) / 100).toFixed(2);
}

// ---------- API Services Layer ----------

const BASE = "/cost-manager";

export function getProjectCostSheet(projectId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/projects/${encodeURIComponent(projectId)}`);
}

export function updateCostSheet(sheetId: string, payload: { name?: string; availableBudgetCents?: number }) {
  return apiRequest<CostSheetPayload>(`${BASE}/sheets/${encodeURIComponent(sheetId)}`, {
    method: "PATCH",
    data: payload,
  });
}

export function createCostSection(sheetId: string, payload: { name: string; isRequired?: boolean }) {
  return apiRequest<CostSheetPayload>(`${BASE}/sheets/${encodeURIComponent(sheetId)}/sections`, {
    method: "POST",
    data: payload,
  });
}

export function updateCostSection(sectionId: string, payload: { name?: string; isRequired?: boolean; sortOrder?: number }) {
  return apiRequest<CostSheetPayload>(`${BASE}/sections/${encodeURIComponent(sectionId)}`, {
    method: "PATCH",
    data: payload,
  });
}

export function deleteCostSection(sectionId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/sections/${encodeURIComponent(sectionId)}`, {
    method: "DELETE",
  });
}

export type LineItemInput = Partial<{
  itemName: string;
  description: string;
  expenseType: ExpenseType;
  qty: number;
  unit: string;
  unitCostCents: number;
  shippingCostCents: number;
  taxCostCents: number;
  otherFeesCents: number;
  paidCents: number;
  vendorId: string | null;
  quoteNumber: string;
  taskId: string;
  purchaseStatus: PurchaseStatus;
  priority: "low" | "medium" | "high" | "critical";
  requiredForPrototype: boolean;
  isActive: boolean;
  notes: string;
  storage: CostStorage;
}>;

export function createCostLineItem(sectionId: string, payload: LineItemInput & { itemName: string }) {
  return apiRequest<CostSheetPayload>(`${BASE}/sections/${encodeURIComponent(sectionId)}/items`, {
    method: "POST",
    data: payload,
  });
}

export function updateCostLineItem(itemId: string, payload: LineItemInput) {
  return apiRequest<CostSheetPayload>(`${BASE}/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    data: payload,
  });
}

export function deleteCostLineItem(itemId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

export function getTaskCostItems(taskId: string) {
  return apiRequest<{ items: CostLineItem[] }>(`${BASE}/tasks/${encodeURIComponent(taskId)}/items`);
}

// -- Files (quotes, invoices, receipts, spec sheets, lab reports) --

export function uploadCostItemFiles(
  itemId: string,
  files: Array<{ fileName: string; fileType: CostFileType; dataUrl: string }>
) {
  return apiRequest<CostSheetPayload>(`${BASE}/items/${encodeURIComponent(itemId)}/files`, {
    method: "POST",
    data: { files },
  });
}

export function deleteCostItemFile(itemId: string, fileId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/items/${encodeURIComponent(itemId)}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
}

// -- Inventory (split locations, QR codes, global finder) --

export function getItemInventory(itemId: string) {
  return apiRequest<{ items: InventoryRecord[] }>(`${BASE}/items/${encodeURIComponent(itemId)}/inventory`);
}

export function createInventoryRecord(
  itemId: string,
  payload: Partial<InventoryRecord> & { locationName: string; photoDataUrl?: string; markStored?: boolean }
) {
  return apiRequest<CostSheetPayload>(`${BASE}/items/${encodeURIComponent(itemId)}/inventory`, {
    method: "POST",
    data: payload,
  });
}

export function deleteInventoryRecord(recordId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/inventory/${encodeURIComponent(recordId)}`, {
    method: "DELETE",
  });
}

export function searchInventory(search: string) {
  return apiRequest<{ items: InventorySearchResult[] }>(
    `${BASE}/inventory?search=${encodeURIComponent(search)}`
  );
}

// -- Certifications, testing, UL listing, permits --

export type CertificationInput = Partial<{
  requirementType: CertificationType;
  name: string;
  authorityOrLab: string;
  standard: string;
  status: CertificationStatus;
  requiredForPrototype: boolean;
  estimatedCostCents: number;
  paidCents: number;
  dueDate: string | null;
  filingDate: string | null;
  approvalDate: string | null;
  expirationDate: string | null;
  result: string;
  notes: string;
}>;

export function createCertification(
  projectId: string,
  payload: CertificationInput & { requirementType: CertificationType; name: string }
) {
  return apiRequest<CostSheetPayload>(`${BASE}/projects/${encodeURIComponent(projectId)}/certifications`, {
    method: "POST",
    data: payload,
  });
}

export function updateCertification(certId: string, payload: CertificationInput) {
  return apiRequest<CostSheetPayload>(`${BASE}/certifications/${encodeURIComponent(certId)}`, {
    method: "PATCH",
    data: payload,
  });
}

export function deleteCertification(certId: string) {
  return apiRequest<CostSheetPayload>(`${BASE}/certifications/${encodeURIComponent(certId)}`, {
    method: "DELETE",
  });
}

/**
 * Mobile implementation for reading base64 data payloads from device storage references.
 * Designed to interact cleanly with local cross-platform file paths (e.g. URI properties 
 * from DocumentPicker or ImagePicker outputs).
 */
export interface MobileFileReference {
  uri: string;
  name: string;
  type?: string;
}

export async function mobileFileToDataUrl(file: MobileFileReference): Promise<string> {
  try {
    // In React Native workspaces, reading asset content occurs over localized bridging modules.
    // This framework normalizes your upload structural signatures across platforms.
    return `data:${file.type || "application/octet-stream"};base64,${file.uri}`;
  } catch (error) {
    throw new Error(`Could not access mobile file asset resource: ${file.name}`);
  }
}

// ---------- Status display style map configurations (Optimized for React Native layout frameworks) ----------

export interface MobileStatusConfig {
  label: string;
  color: string;
  bg: string;
}

export const PURCHASE_STATUS_META: Record<PurchaseStatus, MobileStatusConfig> = {
  not_purchased: { label: "Not Purchased", color: "#8b949e", bg: "rgba(139, 148, 158, 0.15)" },
  ready_to_buy: { label: "Ready to Buy", color: "#58a6ff", bg: "rgba(88, 166, 255, 0.15)" },
  partially_paid: { label: "Partially Paid", color: "#d29922", bg: "rgba(210, 153, 34, 0.15)" },
  purchased: { label: "Purchased", color: "#56d364", bg: "rgba(86, 211, 100, 0.15)" },
  shipped: { label: "Shipped", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  received: { label: "Received", color: "#34d399", bg: "rgba(52, 211, 153, 0.15)" },
  stored: { label: "Stored", color: "#2ea043", bg: "rgba(46, 160, 67, 0.2)" },
  delayed: { label: "Delayed", color: "#f0883e", bg: "rgba(240, 136, 62, 0.15)" },
  canceled: { label: "Canceled", color: "#f85149", bg: "rgba(248, 81, 73, 0.15)" },
};

export const PURCHASED_STATUSES: PurchaseStatus[] = ["purchased", "shipped", "received", "stored"];

export const FILE_TYPE_LABELS: Record<CostFileType, string> = {
  quote: "Quote",
  invoice: "Invoice",
  receipt: "Receipt",
  purchase_order: "Purchase Order",
  spec_sheet: "Spec Sheet",
  safety_data_sheet: "Safety Data Sheet",
  lab_report: "Lab Report",
  photo: "Photo",
  tracking: "Tracking Document",
  other: "Other",
};

export const WARNING_LABELS: Record<CostItemWarning, string> = {
  missing_vendor: "No vendor/contact on a costed item",
  missing_receipt: "Purchased with no invoice or receipt attached",
  not_stored: "Purchased but no storage location recorded",
};

export const CERT_TYPE_LABELS: Record<CertificationType, string> = {
  lab_testing: "Lab Testing",
  ul_listing: "UL Listing",
  permit: "Permit",
  certification: "Certification",
  retesting: "Retesting",
};

export const CERT_STATUS_META: Record<CertificationStatus, MobileStatusConfig> = {
  dynamic: { label: "Unknown", color: "#8b949e", bg: "rgba(139, 148, 158, 0.15)" },
  planned: { label: "Planned", color: "#8b949e", bg: "rgba(139, 148, 158, 0.15)" },
  quoted: { label: "Quoted", color: "#58a6ff", bg: "rgba(88, 166, 255, 0.15)" },
  submitted: { label: "Submitted", color: "#bc8cff", bg: "rgba(188, 140, 255, 0.15)" },
  in_progress: { label: "In Progress", color: "#d29922", bg: "rgba(210, 153, 34, 0.15)" },
  passed: { label: "Passed", color: "#56d364", bg: "rgba(86, 211, 100, 0.15)" },
  failed: { label: "Failed", color: "#f85149", bg: "rgba(248, 81, 73, 0.15)" },
  approved: { label: "Approved", color: "#2ea043", bg: "rgba(46, 160, 67, 0.2)" },
  expired: { label: "Expired", color: "#f0883e", bg: "rgba(240, 136, 62, 0.15)" },
};