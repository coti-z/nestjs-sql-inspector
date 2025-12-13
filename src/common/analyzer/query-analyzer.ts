import { Injectable } from "@nestjs/common";
import { LogReporter } from "../reporter/log.reporter";
import { ExplainPlan } from "../type/common.type";
import { findScanNodes } from "./scan-finder";

@Injectable()
export class QueryAnalyzer {
  constructor(private readonly reporter: LogReporter) {}

  analyze(plans: ExplainPlan[], sql: string): void {
    for (const plan of plans) {
      const scanNodes = findScanNodes(plan);

      for (const scan of scanNodes) {
        this.reporter.report({
          scan,
          sql,
          timestamp: new Date(),
        });
      }
    }
  }
}
