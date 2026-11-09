declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    INGEST_SECRET?: string;
  }
}
