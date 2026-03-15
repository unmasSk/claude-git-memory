# OpenTelemetry App-Level Instrumentation

Practical guide for instrumenting applications with the OpenTelemetry SDK and exporting telemetry to any backend: Datadog, Honeycomb, SigNoz, Rollbar, or Sentry.

OTel separates instrumentation (in your app) from the backend (where data goes). You write instrumentation once and swap exporters without touching app code.

---

## Core Concepts

| Concept | What it is |
|---------|-----------|
| **SDK** | Language library (`@opentelemetry/sdk-node`, `opentelemetry-sdk`) that creates spans and metrics |
| **Auto-instrumentation** | Plugins that patch frameworks (Express, Django, etc.) automatically — zero code changes |
| **Exporter** | Sends data to a backend via OTLP (HTTP or gRPC), or native format (Datadog agent) |
| **Collector** | Optional proxy (`otelcol`) that receives spans from your app and routes to one or many backends |

---

## Setup 1: JavaScript / Node.js → Honeycomb

Honeycomb is the simplest OTLP target — no agent, direct ingest.

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

```javascript
// instrument.mjs — load before anything else
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "my-service",
  traceExporter: new OTLPTraceExporter({
    url: "https://api.honeycomb.io/v1/traces",
    headers: {
      "x-honeycomb-team": process.env.HONEYCOMB_API_KEY,
    },
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }, // noisy
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => sdk.shutdown());
```

Start with `--import`:
```bash
node --import ./instrument.mjs server.mjs
```

---

## Setup 2: Python → Datadog

Datadog uses its own agent as an OTLP receiver — no direct HTTP ingest.

```bash
pip install opentelemetry-sdk \
  opentelemetry-exporter-otlp-proto-grpc \
  opentelemetry-instrumentation-django \
  opentelemetry-instrumentation-requests
```

```python
# otel_setup.py — call before app initialization
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": os.environ.get("OTEL_SERVICE_NAME", "my-service"),
    "deployment.environment": os.environ.get("SENTRY_ENVIRONMENT", "production"),
})

exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317",  # Datadog agent OTLP gRPC port
)

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
```

Auto-instrument Django:
```python
# manage.py or wsgi.py, before Django setup
import otel_setup  # noqa: F401

from opentelemetry.instrumentation.django import DjangoInstrumentor
DjangoInstrumentor().instrument()
```

Datadog agent must have OTLP enabled in `datadog.yaml`:
```yaml
otlp_config:
  receiver:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
```

---

## Setup 3: JavaScript → SigNoz (self-hosted OTLP)

SigNoz accepts standard OTLP — use the same pattern as Honeycomb but point at your SigNoz instance.

```javascript
// instrument.mjs
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "my-service",

  traceExporter: new OTLPTraceExporter({
    url: `${process.env.SIGNOZ_ENDPOINT}/v1/traces`,
    headers: {
      "signoz-ingestion-key": process.env.SIGNOZ_INGESTION_KEY,
    },
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.SIGNOZ_ENDPOINT}/v1/metrics`,
      headers: {
        "signoz-ingestion-key": process.env.SIGNOZ_INGESTION_KEY,
      },
    }),
    exportIntervalMillis: 60_000,
  }),

  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

For self-hosted SigNoz, `SIGNOZ_ENDPOINT` is typically `http://your-host:4318` (OTLP HTTP).

---

## Auto-Instrumentation Coverage

### JavaScript (`@opentelemetry/auto-instrumentations-node`)

Automatically patches: Express, Fastify, Koa, Hapi, HTTP/HTTPS, gRPC, GraphQL, MySQL, PostgreSQL, MongoDB, Redis, AWS SDK, `fetch`, `dns`, `net`.

Disable noisy plugins to reduce span volume:
```javascript
getNodeAutoInstrumentations({
  "@opentelemetry/instrumentation-fs": { enabled: false },
  "@opentelemetry/instrumentation-dns": { enabled: false },
})
```

### Python (`opentelemetry-distro`)

Zero-code option — instruments everything via environment variables:

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # installs all detected instrumentations

OTEL_SERVICE_NAME=my-service \
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io \
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=<KEY>" \
opentelemetry-instrument python manage.py runserver
```

Packages auto-instrumented when installed: Django, Flask, FastAPI, SQLAlchemy, Redis, Requests, urllib3, psycopg2, pymongo, Celery, aiohttp.

---

## Exporter Configuration

### Common OTLP Environment Variables

These work for both JS and Python SDKs:

| Variable | Purpose | Example |
|----------|---------|---------|
| `OTEL_SERVICE_NAME` | Service name in all telemetry | `"api-gateway"` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP receiver URL | `https://api.honeycomb.io` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Auth headers (comma-separated) | `x-honeycomb-team=KEY` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` or `http/protobuf` | `http/protobuf` |
| `OTEL_TRACES_SAMPLER` | Sampling strategy | `parentbased_traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument | `0.1` (10% sampling) |
| `OTEL_RESOURCE_ATTRIBUTES` | Extra resource attributes | `deployment.environment=prod` |

### Backend Endpoint Reference

| Backend | OTLP HTTP endpoint | Auth mechanism |
|---------|-------------------|----------------|
| Honeycomb | `https://api.honeycomb.io/v1/traces` | `x-honeycomb-team` header |
| Honeycomb (dataset) | `https://api.honeycomb.io/v1/traces` | `x-honeycomb-dataset` header |
| SigNoz Cloud | `https://ingest.{region}.signoz.cloud:443` | `signoz-ingestion-key` header |
| SigNoz self-hosted | `http://your-host:4318/v1/traces` | None (or custom) |
| Datadog | Via agent `http://localhost:4318` | Agent handles auth |
| Sentry | `https://o<id>.ingest.sentry.io/api/<proj>/envelope/` | `OTLPIntegration` in Sentry SDK |
| Rollbar | Not OTLP — use Rollbar SDK directly | — |

---

## Sending to Sentry via OTel

If the app already uses OTel tracing, add Sentry as an error sink without replacing your tracer:

**Python:**
```python
# Install: pip install "sentry-sdk[opentelemetry-otlp]"
import sentry_sdk
from sentry_sdk.integrations.opentelemetry import OTLPIntegration

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    integrations=[OTLPIntegration()],
    # Do NOT set traces_sample_rate — OTel controls sampling
)
```

**Node.js:**
```javascript
// @sentry/node ≥8.x handles this automatically when OTel SDK is detected
// Initialize Sentry first, then OTel SDK
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });

// Then start your OTel SDK — Sentry attaches as a span processor
```

---

## Custom Spans

### JavaScript

```javascript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-module");

async function processOrder(orderId) {
  return tracer.startActiveSpan("process-order", async (span) => {
    span.setAttribute("order.id", orderId);
    span.setAttribute("order.source", "web");
    try {
      const result = await doWork(orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Python

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_order(order_id: str):
    with tracer.start_as_current_span("process-order") as span:
        span.set_attribute("order.id", order_id)
        try:
            result = do_work(order_id)
            return result
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

---

## Common Patterns

### Sampling

Reduce span volume in high-traffic production:
```javascript
// JS: 10% parent-based sampling
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";

const sdk = new NodeSDK({
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),
  }),
  // ...
});
```

```bash
# Python: via env var (no code change)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

### Baggage (cross-service context)

Propagate custom context across service boundaries:
```javascript
import { propagation, context } from "@opentelemetry/api";

// Set baggage before outgoing HTTP call
const baggage = propagation.createBaggage({
  "tenant.id": { value: tenantId },
});
context.with(propagation.setBaggage(context.active(), baggage), () => {
  // fetch() here will carry baggage in W3C headers
});
```

### Health Check Exclusion

Exclude noisy health check spans from exporters using a custom span processor. For Express:
```javascript
getNodeAutoInstrumentations({
  "@opentelemetry/instrumentation-http": {
    ignoreIncomingRequestHook: (req) =>
      req.url === "/health" || req.url === "/readyz",
  },
})
```

---

## Verification

After instrumenting with OTel, verify spans are arriving at the backend:

### JavaScript (Node.js)

```bash
# Start your app with instrumentation
node --require ./instrument.js app.js

# Generate a test request
curl http://localhost:3000/api/test

# Check the backend dashboard within 60 seconds for:
# - A trace with service name matching OTEL_SERVICE_NAME
# - Spans for HTTP request + any auto-instrumented calls (DB, Redis, etc.)
```

### Python

```bash
# Start with auto-instrumentation
opentelemetry-instrument python app.py

# Generate a test request
curl http://localhost:8000/api/test

# Check the backend dashboard within 60 seconds
```

### If spans are NOT arriving

1. Check `OTEL_EXPORTER_OTLP_ENDPOINT` is set and reachable: `curl -v $OTEL_EXPORTER_OTLP_ENDPOINT`
2. Check authentication headers/API keys are correct for your backend
3. Check for TLS issues: self-hosted backends may need `OTEL_EXPORTER_OTLP_INSECURE=true`
4. Enable OTel debug logging: `OTEL_LOG_LEVEL=debug` (JS) or `OTEL_PYTHON_LOG_LEVEL=debug` (Python)
5. Check your firewall allows outbound HTTPS to the backend endpoint
