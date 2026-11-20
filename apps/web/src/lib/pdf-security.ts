import { toast } from "sonner";

/**
 * Checks if a PDF loading/processing error is due to password protection or encryption.
 */
export function isEncryptedPdfError(err: unknown): boolean {
  if (!err) return false;
  const error = err as { name?: string; message?: string };
  if (error.name === "PasswordException") return true;
  if (typeof error.message === "string") {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("password") ||
      msg.includes("encrypted") ||
      msg.includes("decrypt") ||
      msg.includes("bad password")
    );
  }
  return false;
}

/**
 * Shows a targeted, actionable toast notification when an encrypted PDF is encountered,
 * offering a 1-click redirect to the Unlock PDF tool.
 * Returns true if the error was handled as an encryption error.
 */
export function handleEncryptedPdfToast(err: unknown, fileName?: string): boolean {
  if (isEncryptedPdfError(err)) {
    toast.error("Document is password-protected", {
      description: fileName
        ? `"${fileName}" is encrypted. Unlock it first using the Unlock PDF tool.`
        : "This PDF is encrypted. Unlock it first using the Unlock PDF tool.",
      action: {
        label: "Unlock PDF",
        onClick: () => {
          window.location.href = "/tools/unlock-pdf";
        },
      },
      duration: 8000,
    });
    return true;
  }
  return false;
}
