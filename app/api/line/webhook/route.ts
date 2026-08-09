import { handleLineWebhookRequest } from "@/lib/line-webhook";
import { handleMarinatedChickenGroupRequest } from "@/lib/line-marinated-group";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const groupResult = await handleMarinatedChickenGroupRequest(request.clone());
  if (groupResult.handled) {
    return Response.json({ ok: true, code: "ok" }, { status: 200 });
  }

  const result = await handleLineWebhookRequest(request);

  return Response.json({ ok: result.ok, code: result.code }, { status: result.status });
}

export function GET() {
  return Response.json({ ok: true, service: "line-webhook" });
}
