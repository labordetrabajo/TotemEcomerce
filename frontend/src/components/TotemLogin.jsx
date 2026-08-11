import { useState } from "react";

import "./TotemLogin.css";
import { useTotemAuth } from "../context/TotemAuthContext";

function TotemLogin({ checking = false }) {
  const { login } = useTotemAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim()) {
      setError("Ingresá el usuario del tótem");
      return;
    }

    if (!password) {
      setError("Ingresá la contraseña");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(username.trim(), password);
    } catch (loginError) {
      console.error(loginError);
      setError(loginError.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="totem-login-shell">
        <div className="totem-login-card checking">
          <div className="totem-login-brand" aria-hidden="true">PP</div>
          <div className="totem-login-spinner" />
          <h1>Preparando tótem</h1>
          <p>Estamos comprobando la sesión de este equipo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="totem-login-shell">
      <div className="totem-login-card">
        <div className="totem-login-brand" aria-hidden="true">PP</div>
        <p className="totem-login-eyebrow">Configuración del equipo</p>
        <h1>Iniciar sesión</h1>
        <p className="totem-login-description">
          Ingresá la cuenta asignada a este tótem. Esta configuración se realiza una sola vez.
        </p>

        <form className="totem-login-form" onSubmit={handleSubmit}>
          <label>
            <span>Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ej. TOTEM_01"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña del equipo"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="totem-login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="totem-login-help">
          La contraseña no se guarda en este equipo.
        </p>
      </div>
    </div>
  );
}

export default TotemLogin;
