import { QueryArgs } from "../postgres.type";

export interface ParsedQuery {
  sql: string;
  values?: unknown[];
}

export function parseQueryArgs(args: QueryArgs): ParsedQuery {
  const firstArg = args[0];

  if (typeof firstArg === "string") {
    return { sql: firstArg, values: args[1] };
  }

  return { sql: firstArg.text, values: firstArg.values };
}

export function isSelectQuery(sql: string): boolean {
  return sql.trim().toUpperCase().startsWith("SELECT");
}
