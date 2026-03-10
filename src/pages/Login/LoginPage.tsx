import { useState } from "react";
import styles from "./login.module.css";
import { login } from "../../api/auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // ✅ AQUÍ FALTABA: hacer la petición
      const res: any = await login({ email, password });

      // ✅ token viene como data.token
      const token = res?.data?.token;
      if (!token) {
        console.log("LOGIN RES:", res);
        alert("Login OK pero no llegó token en data.token (revisa consola)");
        return;
      }

      localStorage.setItem("authToken", token);

      // ✅ user normalmente viene en data.user (ajusta si tu backend lo manda distinto)
      const user = res?.data?.user ?? res?.user;
      if (user) localStorage.setItem("user", JSON.stringify(user));

      // ✅ redirigir a gestión de clínicas
      navigate("/clinics", { replace: true });
    } catch (err: any) {
      console.log("=== LOGIN ERROR (RAW) ===", err);

      const status = err?.response?.status;
      const data = err?.response?.data;
      const url = (err?.config?.baseURL || "") + (err?.config?.url || "");

      console.log("URL:", url);
      console.log("STATUS:", status);
      console.log("DATA:", data);
      console.log("MESSAGE:", err?.message);
      console.log("CODE:", err?.code);

      const msg =
        data?.message ||
        data?.errors?.auth?.[0] ||
        data?.errors?.email?.[0] ||
        data?.errors?.password?.[0] ||
        err?.message ||
        "No se pudo iniciar sesión";

      alert(msg);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.brandPanel} aria-hidden="true">
          <div className={styles.brandBadge}>Plataforma clínica</div>
          <h1 className={styles.brandTitle}>Bug&Soft Dental</h1>
          <p className={styles.brandText}>
            Gestiona pacientes, citas y equipo clínico desde una experiencia
            segura y diseñada para el día a día odontológico.
          </p>
          <div className={styles.brandMetrics}>
            <div>
              <strong>+120</strong>
              <span>Centros activos</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Disponibilidad</span>
            </div>
          </div>
        </section>

        <section className={styles.cardWrap}>
          <div className={styles.topBar} />

          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.logo} aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M7.9 2.7A3.7 3.7 0 0 0 4.2 6.4c0 1.7.5 2.8 1.1 4 .7 1.4 1.5 2.8 1.5 5.1 0 2.1 1.4 3.8 3.3 3.8 1.3 0 2-1 2-2.6v-2.1h.3v2.1c0 1.6.7 2.6 2 2.6 1.9 0 3.3-1.7 3.3-3.8 0-2.3.8-3.7 1.5-5.1.6-1.2 1.1-2.3 1.1-4a3.7 3.7 0 0 0-3.7-3.7c-1 0-1.9.4-2.5 1a3.4 3.4 0 0 0-4.2 0 3.5 3.5 0 0 0-2.5-1Z" />
                </svg>
              </div>
              <h2 className={styles.title}>Bienvenido de nuevo</h2>
              <p className={styles.subtitle}>
                Inicia sesión para acceder a tu agenda y operación clínica.
              </p>
            </div>

            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="email">
                  Correo
                </label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  placeholder="ej. recepcion@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className={styles.metaRow}>
                <a
                  className={styles.link}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  ¿Olvidaste tu contraseña?
                </a>
                <a
                  className={styles.link}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  Crear cuenta
                </a>
              </div>

              <button className={styles.btn} type="submit">
                Entrar
              </button>

              <div className={styles.footer}>
                <span>Salud • Dental</span>
                <span>•</span>
                <span>Bug&Soft Hub</span>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
