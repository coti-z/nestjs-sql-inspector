export type DatabaseDriver = "postgres";

export interface SqlInspectorOptions {
  db?: DatabaseDriver;
  logLevel?: "debug" | "log" | "warn";
  enabled?: boolean;
}

// Transformed to camelCase (DB-agnostic)
export interface ExplainPlan {
  nodeType: string;
  relationName?: string;
  planRows?: number;
  startupCost?: number;
  totalCost?: number;
  parallelAware?: boolean;
  asyncCapable?: boolean;
  planWidth?: number;
  indexName?: string;
  indexCond?: string;
  plans?: ExplainPlan[];
}

// Scan type list
export const SCAN_TYPES = [
  "Seq Scan",
  "Index Scan",
  "Index Only Scan",
  "Bitmap Heap Scan",
  "Bitmap Index Scan",
  "Tid Scan",
  "Tid Range Scan",
] as const;

export type ScanType = (typeof SCAN_TYPES)[number];
