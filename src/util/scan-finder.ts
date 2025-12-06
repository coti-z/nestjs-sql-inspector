import { ExplainPlan, SCAN_TYPES, ScanType } from "../type";

export function isScanNode(nodeType: string): nodeType is ScanType {
  return SCAN_TYPES.includes(nodeType as ScanType);
}

export function findScanNodes(
  plan: ExplainPlan,
  results: ExplainPlan[] = []
): ExplainPlan[] {
  if (isScanNode(plan.nodeType)) {
    results.push(plan);
  }
  if (plan.plans) {
    for (const subPlan of plan.plans) {
      findScanNodes(subPlan, results);
    }
  }
  return results;
}
