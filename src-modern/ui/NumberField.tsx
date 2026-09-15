import { useEffect, useRef, useState, type ReactNode } from "react";
type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onCommit: (n: number) => void;
  icon?: ReactNode;
  unit?: string;
  compact?: boolean;
  readOnly?: boolean;
};
/** Local draft prevents an empty mobile input from temporarily becoming invalid project geometry. */
export function NumberField({
  label,
  value,
  min = -10000,
  max = 20000,
  onCommit,
  icon,
  unit = "мм",
  compact = false,
  readOnly = false,
}: Props) {
  const [draft, setDraft] = useState(String(value)),
    [error, setError] = useState(false),
    focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  const commit = () => {
    focused.current = false;
    if (readOnly) {
      setDraft(String(value));
      setError(false);
      return;
    }
    const n = Number(draft.replace(",", "."));
    if (!draft.trim() || !Number.isFinite(n) || n < min || n > max) {
      setError(true);
      return;
    }
    setError(false);
    if (n !== value) onCommit(n);
  };
  return (
    <label className={compact ? "numberField compact" : "numberField"}>
      <span className="fieldCaption">
        {icon && <span className="fieldIcon">{icon}</span>}
        <span>{label}</span>
      </span>
      <span className="inputWrap">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          aria-invalid={error}
          readOnly={readOnly}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(String(value));
              setError(false);
              e.currentTarget.blur();
            }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
      {error && (
        <small>
          {min}…{max} {unit}
        </small>
      )}
    </label>
  );
}
