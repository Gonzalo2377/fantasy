"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { error?: string; ok?: string } | undefined;
type Action = (prev: ActionResult, data: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className,
  resetOnOk,
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && <p className="mt-2 text-sm font-medium text-bad" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm font-medium text-good" role="status">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = "btn w-full", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingText ?? "Un momento…") : children}
    </button>
  );
}
