"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { retryWebhookDeliveryAction } from "../app/actions";

type WebhookRetryFormProps = {
  webhookId: string;
  deliveryId: string;
  returnPath: string;
};

export function WebhookRetryForm({ webhookId, deliveryId, returnPath }: WebhookRetryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  function submitRetry(formData: FormData) {
    if (isCoolingDown) {
      toast.error("该投递刚刚重试过，请 10 秒后再试。");
      return;
    }

    setIsCoolingDown(true);
    window.setTimeout(() => setIsCoolingDown(false), 10_000);

    startTransition(async () => {
      const result = await retryWebhookDeliveryAction(formData);
      if (result?.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("已重新投递，状态将在列表中刷新。");
      router.refresh();
    });
  }

  const disabled = isPending || isCoolingDown;

  return (
    <form action={submitRetry} className="link-row">
      <input type="hidden" name="webhookId" value={webhookId} />
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button type="submit" className="ghost-button" disabled={disabled}>
        {isPending ? "重试中..." : isCoolingDown ? "冷却 10 秒" : "重试失败投递"}
      </button>
    </form>
  );
}
