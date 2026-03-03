type Props = {
  text: string;
};

export default function PrimaryButton({ text }: Props) {
  return (
    <button type="submit" style={btnStyle}>
      {text}
    </button>
  );
}

const btnStyle: React.CSSProperties = {
  height: 46,
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  transition: "transform 0.06s ease",
};