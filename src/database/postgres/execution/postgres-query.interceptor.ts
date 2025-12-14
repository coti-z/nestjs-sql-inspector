import { Injectable } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";
import { QueryAnalyzer } from "../../../common/analyzer/query-analyzer";
import { isSelectQuery, parseQuery } from "../helper/postgres.query-parser";
import { BoundQueryFn, QueryCallback, QueryConfigArg } from "../postgres.type";
import { PostgresExecutor } from "./postgres.executor";

@Injectable()
export class PostgresQueryInterceptor {
  constructor(
    private readonly executor: PostgresExecutor,
    private readonly analyzer: QueryAnalyzer
  ) {}

  createInterceptor(originalQueryFn: BoundQueryFn): BoundQueryFn {
    const executor = this.executor;
    const analyzer = this.analyzer;

    const interceptedQuery = async function (
      this: Client,
      sqlOrConfig: string | QueryConfigArg,
      valuesOrCallback?: unknown[] | QueryCallback,
      _callback?: QueryCallback
    ): Promise<QueryResult<QueryResultRow>> {
      const { sql, values } = parseQuery(sqlOrConfig, valuesOrCallback);

      if (isSelectQuery(sql)) {
        const plans = await executor.executeExplain(
          this,
          originalQueryFn,
          sql,
          values
        );

        if (plans) {
          analyzer.analyze(plans, sql);
        }
      }

      return originalQueryFn.call(this, sql, values) as Promise<
        QueryResult<QueryResultRow>
      >;
    };

    return interceptedQuery as BoundQueryFn;
  }
}
