import { ExplainPlan } from "../../../common/type/common.type";
import { RawExplainPlan } from "../postgres.type";

export function transformPlan(raw: RawExplainPlan): ExplainPlan {
  const result: ExplainPlan = {
    nodeType: raw["Node Type"],
    relationName: raw["Relation Name"],
    planRows: raw["Plan Rows"],
    startupCost: raw["Startup Cost"],
    totalCost: raw["Total Cost"],
    parallelAware: raw["Parallel Aware"],
    asyncCapable: raw["Async Capable"],
    planWidth: raw["Plan Width"],
    indexName: raw["Index Name"],
    indexCond: raw["Index Cond"],
  };

  if (raw.Plans) {
    result.plans = raw.Plans.map(transformPlan);
  }

  return result;
}
