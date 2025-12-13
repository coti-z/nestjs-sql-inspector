import { Injectable } from "@nestjs/common";
import { Client } from "pg";
import { ExplainPlan } from "../../../common/type/common.type";
import { transformPlan } from "../helper/postgres.plan-transformer";
import { BoundQueryFn, ExplainRow, RawExplainResult } from "../postgres.type";
import { PostgresQueryRunner } from "./postgres.query-runner";
import { PostgresTransaction } from "./postgres.transaction";

@Injectable()
export class PostgresExecutor {
  constructor(
    private readonly queryRunner: PostgresQueryRunner,
    private readonly transaction: PostgresTransaction
  ) {}

  async executeExplain(
    client: Client,
    originalQueryFn: BoundQueryFn,
    sql: string,
    values?: unknown[]
  ): Promise<ExplainPlan[] | null> {
    return this.transaction.withSavepoint(client, originalQueryFn, async () => {
      const explain = await this.queryRunner.execute<ExplainRow>(
        client,
        `EXPLAIN (FORMAT JSON) ${sql}`,
        values,
        originalQueryFn
      );

      const firstRow = explain.rows[0];
      if (!firstRow) return [];

      let rawQueryPlan: RawExplainResult[] | string = firstRow["QUERY PLAN"];
      if (typeof rawQueryPlan === "string") {
        rawQueryPlan = JSON.parse(rawQueryPlan) as RawExplainResult[];
      }

      return rawQueryPlan.map((result) => transformPlan(result.Plan));
    });
  }
}
