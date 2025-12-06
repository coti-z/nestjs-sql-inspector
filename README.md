# @coti-z/nestjs-sql-inspector

Auto-detect SQL performance issues in NestJS applications with PostgreSQL.

## Installation

```bash
npm install @coti-z/nestjs-sql-inspector
```

## Usage

```typescript
import { Module } from '@nestjs/common';
import { QueryAnalyzerModule } from '@coti-z/nestjs-sql-inspector';

@Module({
  imports: [QueryAnalyzerModule],
})
export class AppModule {}
```

## Features

- Automatic SQL query analysis using PostgreSQL EXPLAIN
- Detects various scan types (Seq Scan, Index Scan, etc.)
- Logs query performance information

## Requirements

- NestJS >= 9.0.0
- PostgreSQL with `pg` driver >= 8.0.0

## License

MIT
