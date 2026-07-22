import { handleLineWebhookRequest } from "@/lib/line-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await handleLineWebhookRequest(request);

  return Response.json({ ok: result.ok, code: result.code }, { status: result.status });
}

export function GET() {
  return Response.json({ ok: true, service: "line-webhook" });
}
