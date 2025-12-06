import { Client, QueryResult, QueryResultRow } from "pg";

export type DatabaseDriver = "postgres";

export interface SqlInspectorOptions {
  db?: DatabaseDriver;
  logLevel?: "debug" | "log" | "warn";
  enabled?: boolean;
}

// PostgreSQL EXPLAIN raw type (snake_case with spaces)
export interface RawExplainPlan {
  "Node Type": string;
  "Relation Name"?: string;
  "Plan Rows"?: number;
  "Startup Cost"?: number;
  "Total Cost"?: number;
  "Parallel Aware"?: boolean;
  "Async Capable"?: boolean;
  "Plan Width"?: number;
  "Index Name"?: string;
  "Index Cond"?: string;
  Plans?: RawExplainPlan[];
}

export interface RawExplainResult {
  Plan: RawExplainPlan;
}

export interface ExplainRow {
  "QUERY PLAN": RawExplainResult[] | string;
}

// Transformed to camelCase
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

// pg query argument type
export interface QueryConfigArg {
  text: string;
  values?: unknown[];
}

export type QueryArgs = [string, unknown[]?] | [QueryConfigArg];

// pg query function signature
export type BoundQueryFn = (
  this: Client,
  sql: string,
  values?: unknown[]
) => Promise<QueryResult<QueryResultRow>>;

// Patchable prototype type
export interface PatchablePrototype {
  query: BoundQueryFn;
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
