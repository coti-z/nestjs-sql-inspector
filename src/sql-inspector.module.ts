import { DynamicModule, Logger, Module, OnModuleInit } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";

export type DatabaseDriver = "postgres";

export interface SqlInspectorOptions {
  db?: DatabaseDriver;
  logLevel?: "debug" | "log" | "warn";
  enabled?: boolean;
}

const SQL_INSPECTOR_OPTIONS = "SQL_INSPECTOR_OPTIONS";

// PostgreSQL EXPLAIN raw type (snake_case with spaces)
interface RawExplainPlan {
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

interface RawExplainResult {
  Plan: RawExplainPlan;
}

interface ExplainRow {
  "QUERY PLAN": RawExplainResult[] | string;
}

// Transformed to camelCase
interface ExplainPlan {
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

// Transform RawExplainPlan to ExplainPlan
function transformPlan(raw: RawExplainPlan): ExplainPlan {
  const result: ExplainPlan = {
    nodeType: raw["Node Type"],
    relationName: raw["Relation Name"],
    planRows: raw["Plan Rows"],
    startupCost: raw["Startup Cost"],
    totalCost: raw["Total Cost"],
    parallelAware: raw["Parallel Aware"],
    asyncCapable: raw["Async Capable"],
    planWidth: raw["Plan Width"],
    indexName: raw["Index Name"],
    indexCond: raw["Index Cond"],
  };

  if (raw.Plans) {
    result.plans = raw.Plans.map(transformPlan);
  }

  return result;
}

// pg query argument type
interface QueryConfigArg {
  text: string;
  values?: unknown[];
}

type QueryArgs = [string, unknown[]?] | [QueryConfigArg];

// pg query function signature
type BoundQueryFn = (
  this: Client,
  sql: string,
  values?: unknown[]
) => Promise<QueryResult<QueryResultRow>>;

// Patchable prototype type
interface PatchablePrototype {
  query: BoundQueryFn;
}

// Scan type list
const SCAN_TYPES = [
  "Seq Scan",
  "Index Scan",
  "Index Only Scan",
  "Bitmap Heap Scan",
  "Bitmap Index Scan",
  "Tid Scan",
  "Tid Range Scan",
] as const;

type ScanType = (typeof SCAN_TYPES)[number];

function isScanNode(nodeType: string): nodeType is ScanType {
  return SCAN_TYPES.includes(nodeType as ScanType);
}

// Recursively find all Scan nodes in Plan tree
function findScanNodes(
  plan: ExplainPlan,
  results: ExplainPlan[] = []
): ExplainPlan[] {
  if (isScanNode(plan.nodeType)) {
    results.push(plan);
  }
  if (plan.plans) {
    for (const subPlan of plan.plans) {
      findScanNodes(subPlan, results);
    }
  }
  return results;
}

@Module({})
export class SqlInspectorModule implements OnModuleInit {
  private readonly logger = new Logger(SqlInspectorModule.name);
  private static options: SqlInspectorOptions = {};

  static forRoot(options: SqlInspectorOptions = {}): DynamicModule {
    SqlInspectorModule.options = options;
    return {
      module: SqlInspectorModule,
      providers: [
        {
          provide: SQL_INSPECTOR_OPTIONS,
          useValue: options,
        },
      ],
      exports: [SQL_INSPECTOR_OPTIONS],
    };
  }

  onModuleInit(): void {
    const options = SqlInspectorModule.options;
    const { db = "postgres", enabled } = options;

    if (enabled === false) {
      this.logger.log("SqlInspector disabled");
      return;
    }

    if (db !== "postgres") {
      this.logger.warn(`${db} is not supported yet`);
      return;
    }

    // TypeORM uses Client directly, so only patch Client
    this.patchQuery(
      Client.prototype as unknown as PatchablePrototype,
      this.logger,
      options
    );
    this.logger.log("SqlInspector enabled (postgres)");
  }

  private patchQuery(
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
      const sql: string =
        typeof firstArg === "string" ? firstArg : firstArg.text;
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

          let rawQueryPlan: RawExplainResult[] | string =
            firstRow["QUERY PLAN"];
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
}
