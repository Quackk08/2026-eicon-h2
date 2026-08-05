import { useEffect, useRef, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  kicker?: string;
  title: string;
  /** Body copy, or extra controls such as a type-to-confirm field. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm action as destructive. */
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one modal confirmation the app uses.
 *
 * Several screens used to fake this with `role="dialog" aria-modal="true"` on
 * an inline section: nothing received focus, Escape did nothing, and the
 * "modal" claim told screen readers to ignore a page that was still fully
 * interactive. This centralises the behaviour those attributes promise —
 * focus moves in, Tab cycles inside, Escape and the backdrop cancel, and
 * focus returns to wherever it was.
 *
 * Cancel gets initial focus so that Enter, pressed out of habit, keeps
 * things rather than destroying them.
 */
export function ConfirmDialog({
  open,
  kicker,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="confirm-dialog-backdrop" onClick={onCancel} aria-hidden="true" />
      <section
        className="reset-confirm confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        ref={panelRef}
      >
        <div>
          {kicker && <p className="app-kicker">{kicker}</p>}
          <h2 id="confirm-dialog-title">{title}</h2>
          {children}
        </div>
        <div>
          <button className="secondary-command" type="button" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`primary-command${danger ? " danger-command" : ""}`}
            type="button"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </>
  );
}
