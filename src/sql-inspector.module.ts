import { DynamicModule, Module } from "@nestjs/common";
import { CommonModule } from "./common/common.module";
import { SqlInspectorService } from "./common/service/sql-inspector.service";
import { SqlInspectorOptions } from "./common/type/common.type";
import { PostgresModule } from "./database/postgres/postgres.module";

export const SQL_INSPECTOR_OPTIONS = "SQL_INSPECTOR_OPTIONS";

@Module({})
export class SqlInspectorModule {
  static forRoot(options: SqlInspectorOptions = {}): DynamicModule {
    return {
      module: SqlInspectorModule,
      imports: [CommonModule, PostgresModule],
      providers: [
        {
          provide: SQL_INSPECTOR_OPTIONS,
          useValue: options,
        },
        SqlInspectorService,
      ],
    };
  }
}
