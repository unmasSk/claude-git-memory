---
title: Database Normalization Guide
description: Normal forms 1NF through BCNF with examples, denormalization patterns, trade-offs
tags: normalization, 1NF, 2NF, 3NF, BCNF, denormalization
---

# Normalization Guide

## First Normal Form (1NF)

**Requirements:** Atomic values per cell, unique column names, uniform data types, no duplicate rows.

**Violation: Multiple values in one column**
```sql
-- BAD
CREATE TABLE customers (id INT PRIMARY KEY, phones VARCHAR(500)); -- "555-1234, 555-5678"

-- GOOD
CREATE TABLE customer_phones (
    id INT PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    phone VARCHAR(20),
    phone_type VARCHAR(10)
);
```

**Violation: Repeating groups**
```sql
-- BAD
CREATE TABLE orders (order_id INT PRIMARY KEY, item1_name VARCHAR(100), item1_qty INT, item2_name VARCHAR(100), item2_qty INT);

-- GOOD
CREATE TABLE order_items (id INT PRIMARY KEY, order_id INT REFERENCES orders(order_id), item_name VARCHAR(100), quantity INT);
```

## Second Normal Form (2NF)

**Requirements:** 1NF + all non-key attributes fully depend on the entire primary key (no partial dependencies). Only applies to tables with composite PKs.

**Violation: Partial dependency on composite key**
```sql
-- BAD: student_name depends only on student_id, not on (student_id, course_id)
CREATE TABLE student_courses (
    student_id INT, course_id INT,
    student_name VARCHAR(100),  -- depends only on student_id
    course_title VARCHAR(200),  -- depends only on course_id
    grade CHAR(2),              -- depends on both
    PRIMARY KEY (student_id, course_id)
);

-- GOOD
CREATE TABLE students (student_id INT PRIMARY KEY, student_name VARCHAR(100));
CREATE TABLE courses (course_id INT PRIMARY KEY, course_title VARCHAR(200));
CREATE TABLE enrollments (
    student_id INT, course_id INT, grade CHAR(2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students,
    FOREIGN KEY (course_id) REFERENCES courses
);
```

## Third Normal Form (3NF)

**Requirements:** 2NF + no transitive dependencies (non-key attributes don't depend on other non-key attributes).

**Violation: Transitive dependency**
```sql
-- BAD: department_name depends on department_id (not on employee_id)
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    department_id INT,
    department_name VARCHAR(100),   -- transitive: employee_id → department_id → department_name
    salary DECIMAL(8,2)
);

-- GOOD
CREATE TABLE departments (department_id INT PRIMARY KEY, department_name VARCHAR(100));
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    department_id INT REFERENCES departments,
    salary DECIMAL(8,2)
);
```

## Boyce-Codd Normal Form (BCNF)

**Requirements:** 3NF + every determinant is a candidate key.

**Violation: Determinant that is not a candidate key**
```sql
-- BAD: advisor_id determines subject, but advisor_id is not a candidate key
CREATE TABLE student_advisor (
    student_id INT, subject VARCHAR(50), advisor_id INT,
    PRIMARY KEY (student_id, subject)
    -- Problem: advisor_id → subject, but advisor_id is not a CK
);

-- GOOD
CREATE TABLE advisors (advisor_id INT PRIMARY KEY, subject VARCHAR(50));
CREATE TABLE student_advisors (
    student_id INT, advisor_id INT,
    PRIMARY KEY (student_id, advisor_id),
    FOREIGN KEY (advisor_id) REFERENCES advisors
);
```

---

## When to Denormalize

Normalize first. Denormalize only when you have measured a performance problem that normalization cannot solve.

**Valid reasons:**
- Read-heavy workloads where join cost is measured and significant.
- Pre-computed aggregates for reporting (materialized summaries).
- Historical snapshots that must not change when source data changes.

**Common patterns:**

**Redundant storage for hot read paths:**
```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_total DECIMAL(10,2),  -- denormalized: sum of order_items.total
    item_count INT              -- denormalized: count of order_items
);
```

**Materialized aggregates:**
```sql
CREATE TABLE monthly_sales_summary (
    year_month VARCHAR(7),
    product_category VARCHAR(50),
    total_sales DECIMAL(12,2),
    total_units INT,
    updated_at TIMESTAMP
);
```

**Maintaining consistency after denormalization:**
```sql
-- Trigger to keep denormalized order_total current
CREATE TRIGGER update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders SET order_total = (
        SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = NEW.order_id
    ) WHERE order_id = NEW.order_id;
END;
```

Or use materialized views (PostgreSQL):
```sql
CREATE MATERIALIZED VIEW customer_summary AS
SELECT c.id, COUNT(o.id) AS order_count, SUM(o.total) AS lifetime_value
FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id;
-- Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY customer_summary;
```

---

## Trade-offs

| | Normalized | Denormalized |
|-|-----------|-------------|
| Data integrity | High | Risk of inconsistencies |
| Storage | Efficient | Redundant |
| Write performance | Better | Worse (update multiple places) |
| Read performance | More joins | Fewer joins |
| Schema flexibility | Easier to change | Harder (data in multiple places) |

---

## Anti-Patterns

- **Premature denormalization:** Designing denormalized from the start without evidence of need.
- **Over-normalization:** Creating excessive small tables requiring 5+ joins for simple queries.
- **Inconsistent approach:** Mixing normalized and denormalized patterns without clear strategy.
- **No consistency mechanism:** Denormalizing without triggers, jobs, or materialized views to maintain correctness.
