import styles from "./patient.module.css";

export default function PatientPlaceholderPage() {
  return (
    <section className={styles.placeholderPage}>
      <p className={styles.placeholderEyebrow}>Coming soon</p>
      <h2 className={styles.placeholderTitle}>This section is being prepared</h2>
      <p className={styles.placeholderText}>
        The navigation is now ready for future patient pages. This screen is intentionally lightweight for now.
      </p>
    </section>
  );
}
