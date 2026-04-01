import styles from "./patient.module.css";

export default function PatientPlaceholderPage() {
  return (
    <section className={styles.placeholderPage}>
      <p className={styles.placeholderEyebrow}>Próximamente</p>
      <h2 className={styles.placeholderTitle}>Esta sección está en preparación</h2>
      <p className={styles.placeholderText}>
        La navegación ya está lista para las futuras páginas del paciente. Esta pantalla se mantiene ligera por ahora.
      </p>
    </section>
  );
}
