import { Injectable } from "@nestjs/common";
import { DatabaseAdapter } from "./database-adapter.interface";

@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<string, DatabaseAdapter>();

  register(adapter: DatabaseAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): DatabaseAdapter | undefined {
    return this.adapters.get(name);
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }

  getAll(): DatabaseAdapter[] {
    return Array.from(this.adapters.values());
  }
}
