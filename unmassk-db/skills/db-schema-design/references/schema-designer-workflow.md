---
title: Database Schema Designer Workflow
description: Schema design process, RLS policies, seed data, ERD generation, common pitfalls
tags: schema-design, RLS, ERD, seed-data, multi-tenancy
---

# Schema Designer Workflow

## Design Process

### Step 1: Requirements to Entities

Given requirements, extract entities and relationships:
```
Requirements: "Users create projects. Projects have tasks. Tasks have labels. Tasks can be assigned to users. We need a full audit trail."

Entities: User, Project, Task, Label, TaskLabel (junction), TaskAssignment, AuditLog
```

### Step 2: Identify Relationships

```
User 1──* Project       (owner)
Project 1──* Task
Task *──* Label         (via TaskLabel)
Task *──* User          (via TaskAssignment)
```

### Step 3: Normalize to 3NF

Eliminate partial dependencies (2NF) and transitive dependencies (3NF). See `schema-normalization-guide.md` for rules and examples.

### Step 4: Add Cross-Cutting Concerns

```sql
-- Multi-tenancy: add organization_id to all tenant-scoped tables
-- Soft deletes: deleted_at TIMESTAMPTZ instead of hard deletes
-- Audit trail: created_at, updated_at (always); created_by, updated_by (for regulated domains)
-- Optimistic locking: version INTEGER to prevent lost updates
```

### Step 5: Index Strategy

- Index every FK column.
- Add composite indexes for common WHERE + ORDER BY patterns.
- Add partial indexes for filtered queries (e.g., `WHERE deleted_at IS NULL`).
- See `schema-index-strategies.md` for composite column ordering rules.

---

## Row-Level Security (RLS)

Enforce multi-tenancy and access control at the database layer, not only in application code.

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create app role
CREATE ROLE app_user;

-- Organization isolation: users can only see tasks in their org's projects
CREATE POLICY tasks_org_isolation ON tasks
  FOR ALL TO app_user
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = current_setting('app.current_user_id')::text
    )
  );

-- Soft delete: never show deleted records
CREATE POLICY tasks_no_deleted ON tasks
  FOR SELECT TO app_user
  USING (deleted_at IS NULL);

-- Only creator or admin can delete
CREATE POLICY tasks_delete_policy ON tasks
  FOR DELETE TO app_user
  USING (
    created_by_id = current_setting('app.current_user_id')::text
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN projects p ON p.organization_id = om.organization_id
      WHERE p.id = tasks.project_id
        AND om.user_id = current_setting('app.current_user_id')::text
        AND om.role IN ('owner', 'admin')
    )
  );

-- Set user context at the start of each request
SELECT set_config('app.current_user_id', $1, true);
```

**Always test RLS with a non-superuser role before deploying.**

---

## Seed Data Generation

```typescript
// db/seed.ts
import { faker } from '@faker-js/faker'
import { db } from './client'
import { organizations, users, projects, tasks } from './schema'
import { createId } from '@paralleldrive/cuid2'

async function seed() {
  const [org] = await db.insert(organizations).values({
    id: createId(),
    name: 'acme-corp',
    slug: 'acme',
    plan: 'growth',
  }).returning()

  const [admin] = await db.insert(users).values({
    id: createId(),
    email: 'admin@acme.com',
    name: 'alice-admin',
    passwordHash: await hashPassword('password123'),
  }).returning()

  const projectsData = Array.from({ length: 3 }, () => ({
    id: createId(),
    organizationId: org.id,
    ownerId: admin.id,
    name: faker.company.catchPhrase(),
    status: 'active' as const,
  }))

  const createdProjects = await db.insert(projects).values(projectsData).returning()

  for (const project of createdProjects) {
    const tasksData = Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, (_, i) => ({
      id: createId(),
      projectId: project.id,
      title: faker.hacker.phrase(),
      status: faker.helpers.arrayElement(['todo', 'in_progress', 'done'] as const),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
      position: i * 1000,
      createdById: admin.id,
    }))
    await db.insert(tasks).values(tasksData)
  }
}

seed().catch(console.error).finally(() => process.exit(0))
```

---

## ERD Generation (Mermaid)

```
erDiagram
    Organization ||--o{ Project : owns
    User ||--o{ Task : "created by"
    Project ||--o{ Task : contains
    Task ||--o{ TaskLabel : has
    Label ||--o{ TaskLabel : "applied to"

    Task {
        string id PK
        string project_id FK
        string title
        string status
        timestamp deleted_at
        int version
    }
```

Generate from Prisma schema:
```bash
npx prisma-erd-generator
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Soft delete without partial index | `WHERE deleted_at IS NULL` causes full scan | `CREATE INDEX ... WHERE deleted_at IS NULL` |
| Missing composite indexes | `WHERE org_id = ? AND status = ?` is slow | Add composite index `(org_id, status)` |
| Mutable surrogate keys | Email/slug as PK breaks when data changes | Use UUID/CUID/BIGINT as PK |
| NOT NULL without default | Adding NOT NULL column to existing table fails | Provide default or use multi-phase migration |
| No optimistic locking | Concurrent updates overwrite each other | Add `version INTEGER` column |
| RLS not tested | Policies appear correct but leak data | Test with `SET ROLE app_user` |
| FK without index | Lookups and joins on FK are slow | Index every FK column |

---

## Best Practices Checklist

- [ ] `created_at`, `updated_at` on every table.
- [ ] Soft deletes (`deleted_at`) instead of hard DELETE for auditable data.
- [ ] Audit log for regulated domains (before/after JSON).
- [ ] UUIDs or CUIDs as PKs — avoid sequential integer exposure.
- [ ] Every FK column has an index.
- [ ] Partial indexes for `WHERE deleted_at IS NULL` and similar filtered queries.
- [ ] RLS for multi-tenant apps — database enforces tenancy, not only app code.
