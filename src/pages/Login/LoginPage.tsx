import { useState } from "react";
import styles from "./login.module.css";
import { login } from "../../api/auth";
import { Link, useNavigate } from "react-router-dom";
import { getPostLoginRoute, normalizeRole } from "../../utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res: any = await login({ email, password });

      const token = res?.data?.token;
      if (!token) {
        console.log("LOGIN RES:", res);
        alert("Login OK pero no llegó token en data.token (revisa consola)");
        return;
      }

      localStorage.setItem("authToken", token);

      const user = res?.data?.user ?? res?.user;
      const normalizedRole = normalizeRole(user?.role ?? null);
      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            role: normalizedRole ?? user?.role,
          })
        );
      }

      navigate(getPostLoginRoute(normalizedRole), { replace: true });
    } catch (err: any) {
      console.log("=== LOGIN ERROR (RAW) ===", err);

      const data = err?.response?.data;

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
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandMark}>🦷</div>
          <p className={styles.brandEyebrow}>Plataforma clínica</p>
          <h1 className={styles.brandTitle}>Bug&Soft Dental</h1>
          <p className={styles.brandCopy}>
            Gestión médica diseñada para equipos odontológicos modernos.
          </p>
          <div className={styles.brandPill}>Acceso seguro para personal autorizado</div>
        </aside>

        <div className={styles.formPanel}>
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Iniciar sesión</h2>
            <p className={styles.formSubtitle}>
              Ingresa con tu cuenta para acceder al panel clínico.
            </p>
          </header>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="email">
                Correo corporativo
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

              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.3 2.3a1 1 0 0 0-1.4 1.4l3.2 3.2A12.9 12.9 0 0 0 1.5 12a12.8 12.8 0 0 0 4.2 4.3A11.3 11.3 0 0 0 12 18c1.8 0 3.6-.4 5.2-1.3l3.5 3.5a1 1 0 0 0 1.4-1.4L3.3 2.3Zm8.7 13.2c-2 0-3.5-1.5-3.5-3.5 0-.5.1-.9.3-1.3l4.5 4.5c-.4.2-.8.3-1.3.3Zm9.8-3.5a12.8 12.8 0 0 1-3.9 4.1l-1.5-1.5a6 6 0 0 0 1.6-2.6 1 1 0 1 0-1.9-.6c-.2.6-.6 1.2-1 1.7L13.7 9a3.5 3.5 0 0 1 2.7 2.7 1 1 0 1 0 1.9-.6 5.5 5.5 0 0 0-5.2-4L11.6 5.6c.2 0 .3 0 .4 0 2.2 0 4.4.7 6.1 1.9a12.6 12.6 0 0 1 3.7 4.5Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5.5c4.8 0 8.3 3.9 9.7 6.5-1.4 2.6-4.9 6.5-9.7 6.5S3.7 14.6 2.3 12C3.7 9.4 7.2 5.5 12 5.5Zm0-2C5.9 3.5 1.8 8.3.4 11.2a1.8 1.8 0 0 0 0 1.6C1.8 15.7 5.9 20.5 12 20.5s10.2-4.8 11.6-7.7a1.8 1.8 0 0 0 0-1.6C22.2 8.3 18.1 3.5 12 3.5Zm0 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0-2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <a
                className={styles.link}
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button className={styles.btn} type="submit">
              Acceder al sistema
            </button>

            <p className={styles.registerPrompt}>
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>

            <p className={styles.footer}>Entorno de salud con acceso auditado.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
