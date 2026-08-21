import { handleLineWebhookRequest } from "@/lib/line-webhook";
import { analyzeReceiptImageV2 } from "@/lib/line-receipt-ocr-v2";
import { handleMarinatedChickenGroupRequest } from "@/lib/line-marinated-group";
import { handleFuelExpenseRequest } from "@/lib/line-fuel-interceptor";
import { handleLineMarinatedOrderIntakeRequest } from "@/lib/line-marinated-order-intake";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const groupResult = await handleMarinatedChickenGroupRequest(request.clone());
  if (groupResult.handled) {
    return Response.json({ ok: true, code: "ok" }, { status: 200 });
  }

  const fuelResult = await handleFuelExpenseRequest(request.clone());
  if (fuelResult.handled) {
    return Response.json({ ok: true, code: "ok" }, { status: fuelResult.status ?? 200 });
  }

  const orderResult = await handleLineMarinatedOrderIntakeRequest(request.clone());
  if (orderResult.handled) {
    const status = orderResult.status ?? 200;
    return Response.json(
      { ok: status < 400, code: status < 400 ? "ok" : "processing_error" },
      { status },
    );
  }

  const result = await handleLineWebhookRequest(request, {
    analyzeReceipt: analyzeReceiptImageV2,
  });

  return Response.json({ ok: result.ok, code: result.code }, { status: result.status });
}

export function GET() {
  return Response.json({ ok: true, service: "line-webhook" });
}
