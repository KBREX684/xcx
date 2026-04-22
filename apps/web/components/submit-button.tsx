"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button className={className ?? "action-button"} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

