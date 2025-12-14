import { Client, QueryResult, QueryResultRow } from "pg";

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

// pg query argument type
export interface QueryConfigArg {
  text: string;
  values?: unknown[];
}

export type QueryCallback = (
  err: Error,
  result: QueryResult<QueryResultRow>
) => void;

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
