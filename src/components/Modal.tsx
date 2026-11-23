import { type ReactNode, useEffect, useRef } from "react";

/**
 * Fenêtre modale basée sur l'élément natif <dialog> : focus piégé, fermeture avec Échap et rôle
 * accessibles sans bibliothèque. Le contenu n'est monté que lorsque la fenêtre est ouverte.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // clic sur le fond
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="space-y-4 p-5">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
