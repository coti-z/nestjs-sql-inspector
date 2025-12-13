import { ExplainPlan } from "../type/common.type";

export interface ScanDetectedEvent {
  scan: ExplainPlan;
  sql: string;
  timestamp: Date;
}

export interface ScanReporter {
  report(event: ScanDetectedEvent): void | Promise<void>;
}
