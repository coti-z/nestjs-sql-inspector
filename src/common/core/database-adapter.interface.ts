import { SqlInspectorOptions } from "../type/common.type";

export interface DatabaseAdapter {
  readonly name: string;

  patch(options: SqlInspectorOptions): void;
}
