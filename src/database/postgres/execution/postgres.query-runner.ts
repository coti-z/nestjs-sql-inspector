import { Injectable } from "@nestjs/common";
import { Client, QueryResult, QueryResultRow } from "pg";
import { QueryRunner } from "../../../common/core/query-runner.interface";
import { BoundQueryFn } from "../postgres.type";

@Injectable()
export class PostgresQueryRunner implements QueryRunner<Client> {
  execute<T extends QueryResultRow = QueryResultRow>(
    client: Client,
    sql: string,
    values?: unknown[],
    originalQueryFn?: BoundQueryFn
  ): Promise<QueryResult<T>> {
    const queryFn = originalQueryFn ?? (client.query.bind(client) as BoundQueryFn);
    return queryFn.call(client, sql, values) as Promise<QueryResult<T>>;
  }
}
