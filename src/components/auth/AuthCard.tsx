type Props = {
  children: React.ReactNode;
};

export default function AuthCard({ children }: Props) {
  return <div style={cardStyle}>{children}</div>;
}

const cardStyle: React.CSSProperties = {
  width: "min(460px, 95vw)",
  background: "var(--card)",
  border: "1px solid var(--stroke)",
  borderRadius: 22,
  boxShadow: "var(--shadow)",
  padding: 28,
};