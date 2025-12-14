import { QueryCallback, QueryConfigArg } from "../postgres.type";

export interface ParsedQuery {
  sql: string;
  values?: unknown[];
}

export function parseQuery(
  sqlOrConfig: string | QueryConfigArg,
  valuesOrCallback?: unknown[] | QueryCallback
): ParsedQuery {
  if (typeof sqlOrConfig === "string") {
    const values = Array.isArray(valuesOrCallback) ? valuesOrCallback : undefined;
    return { sql: sqlOrConfig, values };
  }

  return { sql: sqlOrConfig.text, values: sqlOrConfig.values };
}

export function isSelectQuery(sql: string): boolean {
  return sql.trim().toUpperCase().startsWith("SELECT");
}
