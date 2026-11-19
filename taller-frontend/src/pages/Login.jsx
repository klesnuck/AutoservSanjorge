import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para MFA (Segundo factor)
  const [mfaStep, setMfaStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState("");
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState("");

  const { login, verifyMfa, resendMfa } = useContext(AuthContext);
  const navigate = useNavigate();

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return value.length < 64 && emailRegex.test(value);
  };

  const validateEmailField = () => {
    const message = email ? (validateEmail(email) ? "" : "El correo electrónico no es válido") : "El correo electrónico es obligatorio.";
    setEmailError(message);
    return !message;
  };

  const validatePasswordField = () => {
    const message = password ? "" : "La contraseña es obligatoria.";
    setPasswordError(message);
    return !message;
  };

  // Paso 1: Enviar credenciales
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const isEmailValid = validateEmailField();
    const isPasswordValid = validatePasswordField();

    if (!isEmailValid || !isPasswordValid) {
      setError("Corrige los errores antes de continuar.");
      return;
    }

    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      if (result.mfaRequired) {
        // Pasar al paso 2 (MFA)
        setMfaStep(true);
        setTempToken(result.tempToken);
        setDevOtp(result.otpDev || "");
        setEmailSent(Boolean(result.emailSent));
        setEmailPreviewUrl(result.emailPreviewUrl || "");
        setMfaCode("");
        setError("");
      } else {
        // Login directo si MFA no fue requerido
        if (result.user?.role === "Administrador") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } else {
      setError(result.error || "Correo o contraseña incorrectos");
      setPassword("");
    }
    setLoading(false);
  };

  // Paso 2: Verificar código MFA
  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError("");
    setMfaSuccessMsg("");

    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setError("Ingresa el código de seguridad de 6 dígitos.");
      return;
    }

    setLoading(true);
    const result = await verifyMfa(tempToken, mfaCode.trim());
    if (result.success) {
      if (result.user?.role === "Administrador") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } else {
      setError(result.error || "Código de verificación incorrecto o expirado.");
    }
    setLoading(false);
  };

  // Reenviar código MFA
  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    const result = await resendMfa(tempToken);
    if (result.success) {
      setDevOtp(result.otpDev);
      setEmailSent(Boolean(result.emailSent));
      setEmailPreviewUrl(result.emailPreviewUrl || "");
      setMfaSuccessMsg("Se ha generado y enviado un nuevo código a tu correo.");
    } else {
      setError(result.error || "No se pudo reenviar el código.");
    }
    setLoading(false);
  };

  const isLoginFormComplete = () => {
    return email.trim() && password.trim() && !emailError && !passwordError;
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12"
        style={{
          backgroundImage: 'linear-gradient(rgba(10,24,60,0.75), rgba(10,24,60,0.75)),url("/assets/f1.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
        <div>
          <h2 className="text-white text-2xl font-bold mb-2">San Jorge</h2>
          <p className="text-blue-200">Autoservicio</p>
        </div>
        <div className="text-white">
          <p className="text-lg italic mb-6">
            "El portal de clientes nos permite ofrecer transparencia total en nuestras cotizaciones y mantenimientos. Todo el historial de tu vehículo en un solo lugar."
          </p>
          <div>
            <h3 className="font-bold text-lg">Garantía San Jorge</h3>
            <p className="text-blue-200">Más de 30 años de experiencia</p>
          </div>
        </div>
      </div>

      {/* Lado derecho con formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">

          {/* VISTA 1: INGRESO DE CREDENCIALES */}
          {!mfaStep ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Bienvenido de vuelta</h1>
              <p className="text-gray-600 mb-8">
                Inicia sesión con tu correo y contraseña para acceder a la plataforma.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email field */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    onBlur={validateEmailField}
                    placeholder="ejemplo@correo.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailError ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                      onBlur={validatePasswordField}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${passwordError ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-600"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !isLoginFormComplete()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Verificando..." : "Continuar con MFA"}
                </button>
              </form>

              {/* Register link */}
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  ¿No tienes cuenta?{" "}
                  <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                    Registrate aquí
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* VISTA 2: DESAFÍO MFA (DOBLE FACTOR) */
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                  🔐
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Autenticación de 2 Factores</h1>
                  <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">MFA Activo</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">
                Hemos enviado un código temporal de 6 dígitos a <span className="font-semibold text-gray-800">{email}</span> para verificar tu identidad.
              </p>

              {/* Mensaje de correo enviado */}
              <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">📧</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900">
                      Correo de verificación enviado
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Revisa tu bandeja de entrada o spam en <strong>{email}</strong>.
                    </p>
                    {emailPreviewUrl && (
                      <div className="mt-2.5">
                        <a
                          href={emailPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-medium text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-md shadow-sm transition"
                        >
                          📬 Ver correo recibido en pantalla (Bandeja de prueba) ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notificación con código de demo / prueba rápida */}
              {devOtp && (
                <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Código recibido (Demo):</p>
                      <p className="text-lg font-mono font-bold tracking-widest text-gray-900">{devOtp}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMfaCode(devOtp)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition"
                    >
                      Autocompletar
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyMfa} className="space-y-5">
                <div>
                  <label className="block text-gray-700 font-semibold text-sm mb-2 text-center">
                    Ingresa el código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-widest font-mono text-2xl py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {mfaSuccessMsg && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm text-center">
                    {mfaSuccessMsg}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Validando..." : "Confirmar e Iniciar Sesión"}
                </button>

                <div className="flex items-center justify-between pt-2 text-sm">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-blue-600 hover:underline disabled:text-gray-400"
                  >
                    Reenviar código
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep(false);
                      setError("");
                      setMfaSuccessMsg("");
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    ← Volver al login
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Login;
