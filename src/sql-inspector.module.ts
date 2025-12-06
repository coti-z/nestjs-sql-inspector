import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";

// PostgreSQL EXPLAIN 원본 타입 (스네이크 케이스 + 공백)
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

// camelCase로 변환된 타입
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

// RawExplainPlan을 ExplainPlan으로 변환
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

// pg query 인자 타입
interface QueryConfigArg {
  text: string;
  values?: unknown[];
}

type QueryArgs = [string, unknown[]?] | [QueryConfigArg];

// pg query 함수 시그니처
type BoundQueryFn = (
  this: Client,
  sql: string,
  values?: unknown[]
) => Promise<QueryResult<QueryResultRow>>;

// 패치 대상 prototype 타입
interface PatchablePrototype {
  query: BoundQueryFn;
}

// 스캔 타입 목록
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

// Plan 트리에서 모든 Scan 노드를 재귀적으로 찾기
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
export class QueryAnalyzerModule implements OnModuleInit {
  private readonly logger = new Logger(QueryAnalyzerModule.name);

  onModuleInit(): void {
    // TypeORM은 Client를 직접 사용하므로 Client만 패치
    this.patchQuery(
      Client.prototype as unknown as PatchablePrototype,
      this.logger
    );
    this.logger.log("QueryAnalyzer 활성화됨");
  }

  private patchQuery(prototype: PatchablePrototype, logger: Logger): void {
    const originalQueryFn: BoundQueryFn = prototype.query;

    // 타입 안전한 래퍼 함수
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

          let rawQueryPlan: RawExplainResult[] | string = firstRow["QUERY PLAN"];
          // pg가 JSON을 문자열로 반환하는 경우 파싱
          if (typeof rawQueryPlan === "string") {
            rawQueryPlan = JSON.parse(rawQueryPlan) as RawExplainResult[];
          }

          for (const result of rawQueryPlan) {
            const plan: ExplainPlan = transformPlan(result.Plan);
            const scanNodes: ExplainPlan[] = findScanNodes(plan);

            for (const scan of scanNodes) {
              const message = [
                `${scan.nodeType} 감지`,
                `  테이블: ${scan.relationName}`,
                `  인덱스: ${scan.indexName ?? "없음"}`,
                `  예상 rows: ${scan.planRows}`,
                `  예상 cost: ${scan.totalCost}`,
                `  쿼리: ${sql.substring(0, 100)}`,
              ].join("\n");

              logger.debug(message);
            }
          }
        } catch {
          // EXPLAIN 실패 시 SAVEPOINT로 롤백
          try {
            await executeQuery(this, `ROLLBACK TO SAVEPOINT ${savepointName}`);
          } catch {
            // 롤백도 실패하면 무시 (트랜잭션 밖에서 실행된 경우)
          }
        }
      }

      return executeQuery(this, sql, values);
    };

    prototype.query = wrappedQuery as BoundQueryFn;
  }
}
