import { ok } from "@/lib/api";
import { serviceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Which services are configured (booleans only — never values). */
export async function GET() {
  return ok(serviceStatus());
}
