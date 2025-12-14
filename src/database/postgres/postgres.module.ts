import { Module } from "@nestjs/common";
import { PostgresQueryInterceptor } from "./execution/postgres-query.interceptor";
import { PostgresExecutor } from "./execution/postgres.executor";
import { PostgresQueryRunner } from "./execution/postgres.query-runner";
import { PostgresTransaction } from "./execution/postgres.transaction";
import { PostgresAdapter } from "./postgres.adapter";

@Module({
  providers: [
    PostgresQueryRunner,
    PostgresTransaction,
    PostgresExecutor,
    PostgresQueryInterceptor,
    PostgresAdapter,
  ],
  exports: [PostgresAdapter],
})
export class PostgresModule {}
