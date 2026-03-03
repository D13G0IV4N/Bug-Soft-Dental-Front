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
      <div className={styles.cardWrap}>
        <div className={styles.topBar} />

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.logo}>🦷</div>
            <h1 className={styles.title}>Bug&Soft Dental</h1>
            <p className={styles.subtitle}>
              Inicia sesión para acceder a tu agenda.
            </p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
              <div className={styles.label}>Correo</div>
              <input
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
              <div className={styles.label}>Contraseña</div>
              <input
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
      </div>
    </div>
  );
}