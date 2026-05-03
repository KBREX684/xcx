"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { acceptCertificateAction, revokeCertificateAction } from "../app/actions";

type CertificateAcceptFormProps = {
  certificateId: string;
  returnPath: string;
  actorName?: string;
  comment?: string;
  showFields?: boolean;
  buttonLabel?: string;
  className?: string;
};

export function CertificateAcceptForm({
  certificateId,
  returnPath,
  actorName = "客户联系人",
  comment = "客户已确认收到交付过程证明。",
  showFields = false,
  buttonLabel = "提交确认",
  className = "action-button",
}: CertificateAcceptFormProps) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await acceptCertificateAction(formData);
      if (result?.ok === false) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={submit} className="form-stack">
      <input type="hidden" name="certificateId" value={certificateId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      {showFields ? (
        <>
          <label className="field-label">
            确认人
            <input className="field-control" name="actorName" defaultValue={actorName} />
          </label>
          <label className="field-label">
            备注
            <textarea
              className="field-control field-textarea"
              name="comment"
              rows={4}
              defaultValue={comment}
            />
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="actorName" value={actorName} />
          <input type="hidden" name="comment" value={comment} />
        </>
      )}
      <button type="submit" className={className} disabled={isPending}>
        {isPending ? "提交中..." : buttonLabel}
      </button>
    </form>
  );
}

type CertificateRevokeFormProps = {
  certificateId: string;
  projectId?: string;
  returnPath: string;
  buttonLabel?: string;
  className?: string;
};

export function CertificateRevokeForm({
  certificateId,
  projectId,
  returnPath,
  buttonLabel = "撤销",
  className = "inline-link inline-link-button",
}: CertificateRevokeFormProps) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await revokeCertificateAction(formData);
      if (result?.ok === false) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={submit}>
      <input type="hidden" name="certificateId" value={certificateId} />
      <input type="hidden" name="projectId" value={projectId ?? ""} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button type="submit" className={className} disabled={isPending}>
        {isPending ? "处理中..." : buttonLabel}
      </button>
    </form>
  );
}
