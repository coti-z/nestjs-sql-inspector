import { Injectable } from "@nestjs/common";
import { Client } from "pg";
import { AdapterRegistry } from "../../common/core/adapter-registry";
import { DatabaseAdapter } from "../../common/core/database-adapter.interface";
import { SqlInspectorOptions } from "../../common/type/common.type";
import { PostgresQueryInterceptor } from "./execution/postgres-query.interceptor";
import { BoundQueryFn, PatchablePrototype } from "./postgres.type";

@Injectable()
export class PostgresAdapter implements DatabaseAdapter {
  readonly name = "postgres";

  constructor(
    registry: AdapterRegistry,
    private readonly interceptor: PostgresQueryInterceptor
  ) {
    registry.register(this);
  }

  patch(_options: SqlInspectorOptions): void {
    const prototype = Client.prototype as unknown as PatchablePrototype;
    const originalQueryFn: BoundQueryFn = prototype.query;

    prototype.query = this.interceptor.createInterceptor(originalQueryFn);
  }
}
