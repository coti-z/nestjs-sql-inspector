import { Injectable } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";
import { QueryAnalyzer } from "../../common/analyzer/query-analyzer";
import { AdapterRegistry } from "../../common/core/adapter-registry";
import { DatabaseAdapter } from "../../common/core/database-adapter.interface";
import { SqlInspectorOptions } from "../../common/type/common.type";
import { PostgresExecutor } from "./execution/postgres.executor";
import { isSelectQuery, parseQueryArgs } from "./helper/postgres.query-parser";
import { BoundQueryFn, PatchablePrototype, QueryArgs } from "./postgres.type";

@Injectable()
export class PostgresAdapter implements DatabaseAdapter {
  readonly name = "postgres";

  constructor(
    registry: AdapterRegistry,
    private readonly executor: PostgresExecutor,
    private readonly analyzer: QueryAnalyzer
  ) {
    registry.register(this);
  }

  patch(_options: SqlInspectorOptions): void {
    const prototype = Client.prototype as unknown as PatchablePrototype;
    const originalQueryFn: BoundQueryFn = prototype.query;
    const executor = this.executor;
    const analyzer = this.analyzer;

    const wrappedQuery = async function (
      this: Client,
      ...args: QueryArgs
    ): Promise<QueryResult<QueryResultRow>> {
      const { sql, values } = parseQueryArgs(args);

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

    prototype.query = wrappedQuery as BoundQueryFn;
  }
}
