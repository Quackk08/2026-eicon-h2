import { useRef, useState } from "react";
import { ArrowRight, Camera, Check, RefreshCcw, X } from "lucide-react";
import { ApiError } from "../api/client";
import { verifyMission, type MissionVerification } from "../api/backend";
import type { Mission } from "../data/appData";

/** Enough tries to reshoot a blurry receipt; few enough to bound API cost. */
const MAX_ATTEMPTS = 3;

/**
 * Downscales a camera photo before upload: phones produce 3–10MB originals,
 * and the model reads a 1280px JPEG just as well.
 */
async function toUploadableImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg" };
}

function describeExtracted(verification: MissionVerification): string | null {
  const extracted = verification.extracted;
  if (!extracted) return null;
  const parts = [extracted.merchant, extracted.amount, extracted.paidAt].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length ? parts.join(" · ") : null;
}

interface MissionVerifySheetProps {
  mission: Mission;
  onClose: () => void;
  /** Called when the server confirmed and recorded the completion. */
  onVerified: (summary: string | null) => void;
  /** Called when the person chooses to complete without a photo. */
  onCompleteWithout: () => void;
}

/**
 * The Verify flow: one photo — a receipt or the scene itself — read by the
 * server against the Mission. Verification is a recording aid, never a
 * gate: every path out of this sheet still allows completing the Mission,
 * including when the photo can't be read or the feature isn't configured.
 */
export function MissionVerifySheet({
  mission,
  onClose,
  onVerified,
  onCompleteWithout
}: MissionVerifySheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<MissionVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const image = await toUploadableImage(file);
      setPendingImage(image);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
    } catch {
      setError("This photo could not be read on the device. Try taking it again.");
    }
  };

  const analyze = async () => {
    if (!pendingImage || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const verification = await verifyMission(mission.id, pendingImage.base64, pendingImage.mimeType);
      setAttempts((count) => count + 1);
      setResult(verification);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 503
          ? "Photo verification is not available on this server. You can still complete the Mission below."
          : "The photo could not be analyzed. Check the connection, or complete the Mission without it."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const retake = () => {
    setResult(null);
    setPendingImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    inputRef.current?.click();
  };

  const summary = result ? describeExtracted(result) : null;
  const outOfTries = attempts >= MAX_ATTEMPTS;

  return (
    <section className="verify-sheet" aria-labelledby="verify-sheet-title">
      <div className="verify-sheet-heading">
        <div>
          <p className="app-kicker">Leave a trace</p>
          <h2 id="verify-sheet-title">Verify this Mission</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close verification" title="Close" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>

      <p className="verify-sheet-lead">
        A receipt or a photo of the place itself. ReNew reads it once, keeps only the summary, and
        never stores the photo.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {!result && (
        <div className="verify-sheet-capture">
          {previewUrl ? (
            <img className="verify-preview" src={previewUrl} alt="Your photo, ready to analyze" />
          ) : (
            <button className="verify-drop" type="button" onClick={pickPhoto}>
              <Camera aria-hidden="true" />
              Take or choose a photo
            </button>
          )}
          {previewUrl && (
            <div className="verify-capture-actions">
              <button className="primary-command" type="button" disabled={analyzing} onClick={() => void analyze()}>
                {analyzing ? "Reading the photo..." : "Analyze photo"} <ArrowRight aria-hidden="true" />
              </button>
              <button className="text-button" type="button" disabled={analyzing} onClick={retake}>
                <RefreshCcw aria-hidden="true" /> Retake
              </button>
            </div>
          )}
        </div>
      )}

      {result && result.verdict === "verified" && (
        <div className="verify-result is-verified" role="status">
          <p className="verify-result-line"><Check aria-hidden="true" /> {result.reason}</p>
          {summary && <p className="verify-result-summary">{summary}</p>}
          <button className="primary-command" type="button" onClick={() => onVerified(summary)}>
            Finish and reflect <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}

      {result && result.verdict !== "verified" && (
        <div className="verify-result" role="status">
          <p className="verify-result-line">{result.reason}</p>
          <p className="verify-result-summary">
            No trace found in this photo — which does not undo what you did.
          </p>
          <div className="verify-capture-actions">
            <button className="primary-command" type="button" onClick={onCompleteWithout}>
              Complete anyway <ArrowRight aria-hidden="true" />
            </button>
            {!outOfTries && (
              <button className="secondary-command" type="button" onClick={retake}>
                <RefreshCcw aria-hidden="true" /> Try another photo
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="auth-note" role="alert">{error}</p>}

      {!result && (
        <button className="text-button verify-skip" type="button" onClick={onCompleteWithout}>
          Complete without a photo <ArrowRight aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
