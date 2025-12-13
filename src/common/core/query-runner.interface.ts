import { QueryResult, QueryResultRow } from "pg";

export interface QueryRunner<TClient> {
  execute<T extends QueryResultRow = QueryResultRow>(
    client: TClient,
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>;
}
