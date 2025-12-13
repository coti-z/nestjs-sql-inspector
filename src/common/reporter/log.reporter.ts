import { Injectable, Logger } from "@nestjs/common";
import { ScanDetectedEvent, ScanReporter } from "./scan-reporter.interface";

type LogLevel = "debug" | "log" | "warn";

@Injectable()
export class LogReporter implements ScanReporter {
  private readonly logger = new Logger(LogReporter.name);
  private logLevel: LogLevel = "debug";

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  report(event: ScanDetectedEvent): void {
    const { scan, sql } = event;

    const message = [
      `${scan.nodeType} detected`,
      `  table: ${scan.relationName}`,
      `  index: ${scan.indexName ?? "none"}`,
      `  estimated rows: ${scan.planRows}`,
      `  estimated cost: ${scan.totalCost}`,
      `  query: ${sql.substring(0, 100)}`,
    ].join("\n");

    this.logger[this.logLevel](message);
  }
}
