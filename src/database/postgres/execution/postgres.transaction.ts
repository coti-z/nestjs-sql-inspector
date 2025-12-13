import { Injectable } from "@nestjs/common";
import { Client } from "pg";
import { BoundQueryFn } from "../postgres.type";
import { PostgresQueryRunner } from "./postgres.query-runner";

@Injectable()
export class PostgresTransaction {
  constructor(private readonly queryRunner: PostgresQueryRunner) {}

  async withSavepoint<T>(
    client: Client,
    originalQueryFn: BoundQueryFn,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const savepointName = `sp_${Date.now()}`;

    try {
      await this.queryRunner.execute(
        client,
        `SAVEPOINT ${savepointName}`,
        undefined,
        originalQueryFn
      );

      const result = await fn();

      await this.queryRunner.execute(
        client,
        `RELEASE SAVEPOINT ${savepointName}`,
        undefined,
        originalQueryFn
      );

      return result;
    } catch {
      try {
        await this.queryRunner.execute(
          client,
          `ROLLBACK TO SAVEPOINT ${savepointName}`,
          undefined,
          originalQueryFn
        );
      } catch {
        // Ignore rollback failure
      }
      return null;
    }
  }
}
