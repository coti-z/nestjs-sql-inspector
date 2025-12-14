import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SQL_INSPECTOR_OPTIONS } from "../../sql-inspector.module";
import { AdapterRegistry } from "../core/adapter-registry";
import { LogReporter } from "../reporter/log.reporter";
import { SqlInspectorOptions } from "../type/common.type";

@Injectable()
export class SqlInspectorService implements OnModuleInit {
  private readonly logger = new Logger(SqlInspectorService.name);

  constructor(
    @Inject(SQL_INSPECTOR_OPTIONS)
    private readonly options: SqlInspectorOptions,
    private readonly registry: AdapterRegistry,
    private readonly logReporter: LogReporter
  ) {}

  onModuleInit(): void {
    this.initialize();
  }

  private initialize(): void {
    const { db = "postgres", enabled, logLevel = "debug" } = this.options;

    if (enabled === false) {
      return;
    }

    const adapter = this.registry.get(db);
    if (!adapter) {
      this.logger.warn(`Unsupported database: ${db}`);
      return;
    }

    adapter.patch(this.options);

    this.logReporter.setLogLevel(logLevel);
    this.logger.log(`SqlInspector enabled (${adapter.name})`);
  }
}
