# @coti-z/nestjs-sql-inspector

inspect query performance issues in NestJS applications.

## Installation

```bash
npm install @coti-z/nestjs-sql-inspector
```

## Usage

```typescript
import { Module } from "@nestjs/common";
import { QueryAnalyzerModule } from "@coti-z/nestjs-sql-inspector";

@Module({
  imports: [QueryAnalyzerModule],
})
export class AppModule {}
```

## Features

- Automatic query analysis using EXPLAIN
- Detects slow queries and inefficient scan types
- Logs query performance information

## RoadMap

- [ ] typeorm

  - [x] PostgreSQL
  - [ ] MySQL
  - [ ] MongoDB

- [ ] prisma

  - [ ] PostgreSQL
  - [ ] MySQL
  - [ ] MongoDB

## Requirements

- NestJS >= 9.0.0
- PostgreSQL with `pg` driver >= 8.0.0

## License

MIT
