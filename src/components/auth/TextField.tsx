type Props = {
  label: string;
  type: React.HTMLInputTypeAttribute;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
};

export default function TextField({
  label,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: Props) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  outline: "none",
  fontSize: 14,
  background: "#fbfdff",
  transition: "border 0.15s, box-shadow 0.15s",
};