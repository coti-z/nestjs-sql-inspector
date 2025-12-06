import { Logger } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";
import {
  BoundQueryFn,
  ExplainPlan,
  ExplainRow,
  PatchablePrototype,
  QueryArgs,
  RawExplainResult,
  SqlInspectorOptions,
} from "../type";
import { transformPlan } from "../util/plan-transformer";
import { findScanNodes } from "../util/scan-finder";

export function patchPostgresQuery(
  prototype: PatchablePrototype,
  logger: Logger,
  options: SqlInspectorOptions = {}
): void {
  const originalQueryFn: BoundQueryFn = prototype.query;
  const logLevel = options.logLevel ?? "debug";

  // Type-safe wrapper function
  const executeQuery = <T extends QueryResultRow = QueryResultRow>(
    context: Client,
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<T>> => {
    return originalQueryFn.call(context, sql, values) as Promise<
      QueryResult<T>
    >;
  };

  const wrappedQuery = async function (
    this: Client,
    ...args: QueryArgs
  ): Promise<QueryResult<QueryResultRow>> {
    const firstArg = args[0];
    const sql: string = typeof firstArg === "string" ? firstArg : firstArg.text;
    const values: unknown[] | undefined =
      typeof firstArg === "string" ? args[1] : firstArg.values ?? undefined;

    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      // cspell:ignore savepoint SAVEPOINT
      const savepointName = `explain_sp_${Date.now()}`;

      try {
        await executeQuery(this, `SAVEPOINT ${savepointName}`);
        const explain = await executeQuery<ExplainRow>(
          this,
          `EXPLAIN (FORMAT JSON) ${sql}`,
          values
        );
        await executeQuery(this, `RELEASE SAVEPOINT ${savepointName}`);

        const firstRow = explain.rows[0];
        if (!firstRow) return executeQuery(this, sql, values);

        let rawQueryPlan: RawExplainResult[] | string = firstRow["QUERY PLAN"];
        // Parse if pg returns JSON as string
        if (typeof rawQueryPlan === "string") {
          rawQueryPlan = JSON.parse(rawQueryPlan) as RawExplainResult[];
        }

        for (const result of rawQueryPlan) {
          const plan: ExplainPlan = transformPlan(result.Plan);
          const scanNodes: ExplainPlan[] = findScanNodes(plan);

          for (const scan of scanNodes) {
            const message = [
              `${scan.nodeType} detected`,
              `  table: ${scan.relationName}`,
              `  index: ${scan.indexName ?? "none"}`,
              `  estimated rows: ${scan.planRows}`,
              `  estimated cost: ${scan.totalCost}`,
              `  query: ${sql.substring(0, 100)}`,
            ].join("\n");

            logger[logLevel](message);
          }
        }
      } catch {
        // Rollback to savepoint if EXPLAIN fails
        try {
          await executeQuery(this, `ROLLBACK TO SAVEPOINT ${savepointName}`);
        } catch {
          // Ignore if rollback fails (executed outside transaction)
        }
      }
    }

    return executeQuery(this, sql, values);
  };

  prototype.query = wrappedQuery as BoundQueryFn;
}
