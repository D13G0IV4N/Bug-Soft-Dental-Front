import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import formStyles from "../../styles/formSystem.module.css";

type ModalSize = "narrow" | "default" | "wide";

interface AppModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  size?: ModalSize;
  closeLabel?: string;
  closeDisabled?: boolean;
  disableClose?: boolean;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AppModal({
  open,
  title,
  subtitle,
  eyebrow,
  size = "default",
  closeLabel = "Cerrar",
  closeDisabled = false,
  disableClose = false,
  onClose,
  actions,
  children,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape" && !disableClose && !closeDisabled) onClose();
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose, disableClose, closeDisabled]);

  if (!open) return null;

  const cardSizeClass = size === "narrow"
    ? formStyles.modalCardNarrow
    : size === "wide"
      ? formStyles.modalCardWide
      : "";

  return createPortal(
    <div className={formStyles.modalOverlay} onClick={() => !disableClose && !closeDisabled && onClose()}>
      <section
        className={`${formStyles.modalCard} ${cardSizeClass}`.trim()}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className={formStyles.modalHeader}>
          <div>
            {eyebrow ? <p className={formStyles.modalEyebrow}>{eyebrow}</p> : null}
            <h2 className={formStyles.modalTitle}>{title}</h2>
            {subtitle ? <p className={formStyles.modalText}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={formStyles.modalCloseButton}
            onClick={onClose}
            disabled={disableClose || closeDisabled}
            aria-label={closeLabel}
          >
            ×
          </button>
        </header>

        <div className={formStyles.modalBody}>{children}</div>
        {actions ? <footer className={formStyles.modalFooter}>{actions}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
