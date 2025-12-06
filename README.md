# @coti-z/nestjs-sql-inspector

inspect query performance issues in NestJS applications.

## Installation

```bash
npm install @coti-z/nestjs-sql-inspector
```

## Usage

```typescript
import { Module } from "@nestjs/common";
import { SqlInspectorModule } from "@coti-z/nestjs-sql-inspector";

@Module({
  imports: [
    SqlInspectorModule.forRoot({
      db: "postgres",
      logLevel: "debug",
      enabled: true,
    }),
  ],
})
export class AppModule {}
```

## Options

| Option     | Type                         | Default      | Description                  |
| ---------- | ---------------------------- | ------------ | ---------------------------- |
| `db`       | `"postgres"`                 | `"postgres"` | Database driver              |
| `logLevel` | `"debug" \| "log" \| "warn"` | `"debug"`    | Log level for query analysis |
| `enabled`  | `boolean`                    | `true`       | Enable/disable inspector     |

## Features

- Automatic query analysis using EXPLAIN
- Detects slow queries and inefficient scan types
- Logs query performance information

## RoadMap

- database

  - [x] PostgreSQL
  - [ ] MySQL
  - [ ] MongoDB

- option
  - [ ] slowQueryThreshold

## Requirements

- NestJS >= 9.0.0
- PostgreSQL with `pg` driver >= 8.0.0

## License

MIT
