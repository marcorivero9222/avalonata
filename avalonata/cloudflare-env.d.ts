declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AVALON_GUEST_MODE?: string;
    BUCKET?: R2Bucket;
  }
}
