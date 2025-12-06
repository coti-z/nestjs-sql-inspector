import {
  DynamicModule,
  Inject,
  Logger,
  Module,
  OnModuleInit,
} from "@nestjs/common";
import { Client } from "pg";
import { patchPostgresQuery } from "./patch/postgres-patcher";
import { PatchablePrototype, SqlInspectorOptions } from "./type";

export const SQL_INSPECTOR_OPTIONS = "SQL_INSPECTOR_OPTIONS";

@Module({})
export class SqlInspectorModule implements OnModuleInit {
  private readonly logger = new Logger(SqlInspectorModule.name);

  constructor(
    @Inject(SQL_INSPECTOR_OPTIONS)
    private readonly options: SqlInspectorOptions
  ) {}

  static forRoot(options: SqlInspectorOptions = {}): DynamicModule {
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
    const { db = "postgres", enabled } = this.options;

    if (enabled === false) {
      return;
    }

    if (db !== "postgres") {
      return;
    }

    patchPostgresQuery(
      Client.prototype as unknown as PatchablePrototype,
      this.logger,
      this.options
    );
    this.logger.log("SqlInspector enabled (postgres)");
  }
}
