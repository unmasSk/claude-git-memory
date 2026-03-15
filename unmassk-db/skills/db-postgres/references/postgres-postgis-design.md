# PostGIS Spatial Table Design

## Before You Start (5 Questions)

1. What is the geographic scope (single city/region vs global)?
2. What are your primary query patterns (within-radius, bbox, intersects, nearest-neighbor)?
3. What units do you need for distance/area (meters vs CRS units), and how accurate must they be?
4. What is the expected scale (rows, write rate), and is the data mostly append-only?
5. Do you need 3D (Z) or measures (M), or is 2D enough?

When turning these patterns into application code, use parameterized queries for user-provided values (WKT/WKB, coordinates, IDs, radii). Never string-concatenate untrusted input into SQL; for dynamic identifiers, use safe identifier quoting/whitelisting.

## Core Rules

- Always use PostGIS geometry/geography types instead of PostgreSQL's built-in geometric types (`POINT`, `LINE`, `POLYGON`, `CIRCLE`). PostGIS types provide true spatial capabilities.
- Choose between GEOMETRY and GEOGRAPHY based on your use case: GEOMETRY for projected/local data with Cartesian math; GEOGRAPHY for global data requiring accurate spherical calculations.
- Always specify SRID (Spatial Reference Identifier) when creating geometry columns. Use `4326` (WGS84) for GPS/global data, appropriate local projections for regional data.
- Create spatial indexes on all geometry/geography columns using GiST (default). Consider BRIN only for very large GEOMETRY tables where rows are naturally ordered on disk and coarser filtering is acceptable.
- Use constraint-based type enforcement with `GEOMETRY(type, SRID)` syntax to ensure data integrity.

## Geometry vs Geography

### When to Use GEOMETRY

- Local/regional data within a single coordinate system
- Projected coordinates (meters, feet) for accurate area/distance calculations
- Complex spatial operations (buffering, unions, intersections)
- Performance-critical queries (Cartesian math is faster)
- Data already in a projected CRS (UTM, State Plane, etc.)

```sql
-- Regional data with projected coordinates (UTM Zone 10N for California)
CREATE TABLE local_parcels (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_number TEXT NOT NULL,
    boundary GEOMETRY(POLYGON, 26910),  -- UTM Zone 10N (meters)
    area_sqm DOUBLE PRECISION GENERATED ALWAYS AS (ST_Area(boundary)) STORED
);
```

### When to Use GEOGRAPHY

- Global data spanning multiple continents/hemispheres
- GPS coordinates (latitude/longitude in decimal degrees)
- Accurate distance calculations on Earth's surface (great circle)
- Simple spatial operations (distance, containment)
- Data from GPS devices, geocoding services, or web maps

```sql
CREATE TABLE global_offices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326)  -- WGS84 (lat/lon)
);

SELECT
    a.name AS office_a,
    b.name AS office_b,
    ST_Distance(a.location, b.location) / 1000 AS distance_km
FROM global_offices a
CROSS JOIN global_offices b
WHERE a.id < b.id;
```

### Comparison Table

| Aspect | GEOMETRY | GEOGRAPHY |
|--------|----------|-----------|
| Coordinate system | Any SRID (projected or geodetic) | WGS84 (SRID 4326) only |
| Distance units | CRS units (degrees, meters, feet) | Meters (always) |
| Distance accuracy | Depends on projection | True spheroidal distance |
| Area accuracy | Accurate in projected CRS | Accurate on sphere |
| Function support | Full (300+ functions) | Limited (~40 functions) |
| Performance | Faster (Cartesian math) | Slower (spherical math) |
| Index type | GiST, BRIN, SP-GiST | GiST only |
| Best for | Regional/local data, complex analysis | Global data, GPS tracking |

## Geometry Types

### Point Types

```sql
location GEOMETRY(POINT, 4326)         -- single location (stores, sensors, events)
locations GEOMETRY(MULTIPOINT, 4326)   -- multiple discrete locations
location_3d GEOMETRY(POINTZ, 4326)     -- 3D point with elevation
location_m GEOMETRY(POINTM, 4326)      -- point with measure value (linear referencing)
```

### Line Types

```sql
path GEOMETRY(LINESTRING, 4326)               -- single path (road, river, route)
network GEOMETRY(MULTILINESTRING, 4326)       -- multiple paths
trail_3d GEOMETRY(LINESTRINGZ, 4326)          -- 3D line with elevation profile
```

### Polygon Types

```sql
boundary GEOMETRY(POLYGON, 4326)              -- single area (parcel, zone)
territories GEOMETRY(MULTIPOLYGON, 4326)      -- multiple areas (archipelago)
footprint_3d GEOMETRY(POLYGONZ, 4326)         -- 3D polygon (building with height)
```

## Coordinate Systems (SRID)

| SRID | Name | Use Case | Units |
|------|------|----------|-------|
| 4326 | WGS84 | GPS, global data, web maps | Degrees |
| 3857 | Web Mercator | Web map tiles (display only) | Meters |
| 26910-26919 | UTM Zones (US) | Regional analysis | Meters |
| 32601-32660 | UTM Zones (North) | Regional analysis | Meters |

Best practices:
- Store in WGS84 (4326) for interoperability and GPS data
- Transform to projected CRS for accurate measurements
- Never mix SRIDs in spatial operations without explicit transformation

```sql
-- Store in WGS84, calculate in UTM
SELECT
    a.id AS point_a,
    b.id AS point_b,
    ST_Distance(
        ST_Transform(a.location, 26910),
        ST_Transform(b.location, 26910)
    ) AS distance_meters
FROM survey_points a
CROSS JOIN survey_points b
WHERE a.id < b.id;
```

## Spatial Indexing

### GiST Index (Default)

```sql
CREATE INDEX idx_your_table_geom_gist ON your_table_name USING GIST (geom);
CREATE INDEX idx_your_table_geog_gist ON your_table_name USING GIST (geog);
VACUUM ANALYZE your_table_name;
```

Supports all spatial operators (`&&`, `@>`, `<@`, `~=`, `<->`). Best for general-purpose spatial queries.

### BRIN Index

```sql
-- BRIN for very large, append-only GEOMETRY tables (geography uses GiST)
CREATE INDEX idx_your_table_geom_brin
    ON your_table_name
    USING BRIN (geom)
    WITH (pages_per_range = 128);
```

Supports bounding box operators (`&&`, `@>`, `<@`). Best for append-only tables, time-series spatial data, very large datasets (>100M rows). Much smaller than GiST but less precise.

### SP-GiST Index

```sql
-- SP-GiST for GEOMETRY(POINT, ...) only
CREATE INDEX idx_sensors_location_spgist ON sensors USING SPGIST (location);
```

Best for point-only data with quadtree-friendly distributions.

### Index Selection Guide

| Scenario | Index Type |
|----------|------------|
| General spatial queries | GiST |
| Very large, append-only | BRIN |
| Point-only, uniform distribution | SP-GiST |
| Geography columns | GiST |

## Table Design Examples

### Points of Interest

```sql
CREATE TABLE pois (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_category CHECK (category IN (
        'restaurant', 'hotel', 'gas_station', 'hospital', 'school'
    ))
);

CREATE INDEX idx_pois_location ON pois USING GIST (location);
CREATE INDEX idx_pois_category ON pois (category);

-- Find restaurants within 1km
SELECT name, address,
       ST_Distance(
         location,
         ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::GEOGRAPHY
       ) AS distance_m
FROM pois
WHERE category = 'restaurant'
  AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::GEOGRAPHY,
    1000
  )
ORDER BY distance_m;
```

### Property Parcels

```sql
CREATE TABLE parcels (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id TEXT NOT NULL UNIQUE,
    owner_name TEXT,
    boundary GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_Centroid(boundary)) STORED,
    area_sqm DOUBLE PRECISION GENERATED ALWAYS AS (
        ST_Area(boundary::GEOGRAPHY)
    ) STORED,
    CONSTRAINT valid_boundary CHECK (ST_IsValid(boundary))
);

CREATE INDEX idx_parcels_boundary ON parcels USING GIST (boundary);
CREATE INDEX idx_parcels_centroid ON parcels USING GIST (centroid);

SELECT parcel_id, owner_name, area_sqm
FROM parcels
WHERE ST_Intersects(boundary, ST_MakeEnvelope(-122.5, 37.7, -122.4, 37.8, 4326));
```

### GPS Tracking

```sql
CREATE TABLE gps_tracks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    accuracy_m DOUBLE PRECISION
);

CREATE INDEX idx_gps_device_time ON gps_tracks (device_id, recorded_at DESC);
CREATE INDEX idx_gps_location ON gps_tracks USING GIST (location);

-- Create linestring from track points
SELECT
    device_id,
    ST_MakeLine(location::GEOMETRY ORDER BY recorded_at) AS track_line,
    MIN(recorded_at) AS start_time,
    MAX(recorded_at) AS end_time
FROM gps_tracks
WHERE device_id = 'device_001'
  AND recorded_at >= '2024-01-01'
GROUP BY device_id;
```

## Performance Patterns

Use `ST_DWithin` instead of `ST_Distance` for filtering:

```sql
-- SLOW: calculates distance for all rows
SELECT * FROM pois WHERE ST_Distance(location, ref_point) < 1000;

-- FAST: uses spatial index
SELECT * FROM pois WHERE ST_DWithin(location, ref_point, 1000);
```

Use `&&` for bounding box pre-filtering:

```sql
SELECT * FROM parcels
WHERE boundary && ST_MakeEnvelope(-122.5, 37.7, -122.4, 37.8, 4326)
  AND ST_Intersects(boundary, search_polygon);
```

Use generated columns for computed spatial attributes:

```sql
-- SLOW: function prevents index usage
SELECT * FROM parcels WHERE ST_Area(boundary) > 10000;

-- FAST: use generated column with regular index
ALTER TABLE parcels ADD COLUMN area_sqm DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_Area(boundary::GEOGRAPHY)) STORED;
CREATE INDEX idx_parcels_area ON parcels (area_sqm);
SELECT * FROM parcels WHERE area_sqm > 10000;
```

## Data Validation

```sql
-- Add validity constraint
ALTER TABLE parcels ADD CONSTRAINT valid_geom CHECK (ST_IsValid(boundary));

-- Find and fix invalid geometries
SELECT id, ST_IsValidReason(boundary) AS reason
FROM parcels WHERE NOT ST_IsValid(boundary);

UPDATE parcels SET boundary = ST_MakeValid(boundary)
WHERE NOT ST_IsValid(boundary);

-- Verify SRID consistency
SELECT DISTINCT ST_SRID(geom) FROM spatial_table;

-- Ensure coordinates are within valid WGS84 bounds
ALTER TABLE global_locations ADD CONSTRAINT valid_coords CHECK (
    ST_X(location::GEOMETRY) BETWEEN -180 AND 180 AND
    ST_Y(location::GEOMETRY) BETWEEN -90 AND 90
);
```

## Do Not Use

- PostgreSQL built-in types (`POINT`, `LINE`, `POLYGON`, `CIRCLE`) -- use PostGIS types instead
- SRID 0 (undefined) -- always specify the correct SRID
- `ST_Distance` for filtering -- use `ST_DWithin` for index-supported distance queries
- Mixed SRIDs in operations -- always transform to common SRID first
- GEOGRAPHY for complex analysis -- use GEOMETRY with appropriate projection
- Over-precise coordinates -- GPS accuracy is ~3-5m; 6 decimal places (0.1m) is sufficient

## Common Pitfalls

1. **Longitude/Latitude order**: PostGIS uses `(longitude, latitude)` = `(X, Y)`, not `(lat, lon)`
2. **GEOGRAPHY distance units**: always in meters, regardless of display
3. **Index not used**: run `EXPLAIN ANALYZE` to verify spatial index usage
4. **Transform performance**: cache transformed geometries for repeated queries
5. **Large geometries**: consider `ST_Subdivide` for very complex polygons
6. **SQL injection**: never concatenate untrusted input into SQL; parameterize values; use `quote_ident` or `format('%I', ...)` for dynamic identifiers
