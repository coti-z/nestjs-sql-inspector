import { Global, Module } from "@nestjs/common";
import { QueryAnalyzer } from "./analyzer/query-analyzer";
import { AdapterRegistry } from "./core/adapter-registry";
import { LogReporter } from "./reporter/log.reporter";

@Global()
@Module({
  providers: [AdapterRegistry, LogReporter, QueryAnalyzer],
  exports: [AdapterRegistry, LogReporter, QueryAnalyzer],
})
export class CommonModule {}
