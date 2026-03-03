type Props = {
  title: string;
  subtitle: string;
};

export default function AuthHeader({ title, subtitle }: Props) {
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={logoStyle}>🦷</div>
      <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 0.2 }}>{title}</h1>
      <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
        {subtitle}
      </p>
    </div>
  );
}

const logoStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  margin: "0 auto 10px",
  display: "grid",
  placeItems: "center",
  borderRadius: 16,
  background: "linear-gradient(135deg, var(--secondary), #ffffff)",
  border: "1px solid var(--stroke)",
  fontSize: 26,
};