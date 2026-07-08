import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return value.length < 64 && emailRegex.test(value);
  };

  const validatePassword = (value) => {
    const hasNumbers = /\d/.test(value);
    const isLongEnough = value.length > 6;
    return hasNumbers && isLongEnough;
  };

  const checkExistingUser = async (email, name) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/users`);
      if (response.ok) {
        const users = await response.json();
        const existingEmail = users.find(user => user.email.toLowerCase() === email.toLowerCase());
        const existingName = users.find(user => user.name.toLowerCase() === name.toLowerCase());

        if (existingEmail) {
          setEmailError("Este correo electrónico ya está registrado");
          return false;
        }
        if (existingName) {
          setNameError("Este nombre ya está registrado");
          return false;
        }
      }
    } catch (error) {
      // If we can't check, continue with registration (backend will handle it)
      console.log("No se pudo verificar usuarios existentes:", error);
    }
    return true;
  };

  const validateNameField = () => {
    const message = name.trim() ? "" : "El nombre completo es obligatorio.";
    setNameError(message);
    return !message;
  };

  const validateEmailField = () => {
    const message = email ? (validateEmail(email) ? "" : "El correo electrónico no es válido (debe contener @ y un dominio)") : "El correo electrónico es obligatorio.";
    setEmailError(message);
    return !message;
  };

  const validatePhoneField = () => {
    const phoneRegex = /^\d{10}$/;
    const message = phone ? (phoneRegex.test(phone) ? "" : "El teléfono debe contener exactamente 10 dígitos numéricos") : "";
    setPhoneError(message);
    return !message;
  };

  const validatePasswordField = () => {
    const message = password ? (validatePassword(password) ? "" : "La contraseña debe tener más de 6 caracteres e incluir números") : "La contraseña es obligatoria.";
    setPasswordError(message);
    return !message;
  };

  const validateConfirmPasswordField = () => {
    const message = confirmPassword ? (password === confirmPassword ? "" : "Las contraseñas no coinciden") : "Debes confirmar tu contraseña.";
    setConfirmPasswordError(message);
    return !message;
  };

  const isFormComplete = () => {
    return name.trim() &&
           email.trim() &&
           phone.trim() &&
           password.trim() &&
           confirmPassword.trim() &&
           !nameError &&
           !emailError &&
           !phoneError &&
           !passwordError &&
           !confirmPasswordError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const isNameValid = validateNameField();
    const isEmailValid = validateEmailField();
    const isPhoneValid = validatePhoneField();
    const isPasswordValid = validatePasswordField();
    const isConfirmPasswordValid = validateConfirmPasswordField();

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmPasswordValid) {
      setError("Corrige los errores marcados antes de continuar.");
      return;
    }

    // Check for existing users
    const usersAvailable = await checkExistingUser(email, name);
    if (!usersAvailable) {
      setError("Corrige los errores marcados antes de continuar.");
      return;
    }

    setLoading(true);

    const result = await register({ name, email, password, phone });
    if (result.success) {
      navigate("/login");
    } else {
      setError(result.error);
      // Don't clear passwords on error
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side with blue background */}
      <div className="hidden md:flex md:w-1/2 bg-blue-950 flex-col justify-between p-12">
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

      {/* Right side with registration form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
          <p className="text-gray-600 mb-8">
            Regístrate para acceder a nuestros servicios.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                onBlur={() => {
                  validateNameField();
                  checkExistingUser(email, e.target.value);
                }}
                placeholder="Juan Pérez García"
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${nameError ? 'border-red-500 border' : 'border border-gray-300'}`}
              />
              {nameError && <p className="mt-2 text-sm text-red-600">{nameError}</p>}
            </div>

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
                onBlur={() => {
                  validateEmailField();
                  checkExistingUser(e.target.value, name);
                }}
                placeholder="ejemplo@correo.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
            </div>

            {/* Phone field */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  // Only allow numbers and limit to 10 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(value);
                  if (phoneError) setPhoneError("");
                }}
                onBlur={validatePhoneField}
                placeholder="8841397918"
                maxLength={10}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {phoneError && <p className="mt-2 text-sm text-red-600">{phoneError}</p>}
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
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 7 caracteres e incluir números
              </p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError("");
                  }}
                  onBlur={validateConfirmPasswordField}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${confirmPasswordError ? 'border-red-500' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-600"
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {confirmPasswordError && <p className="mt-2 text-sm text-red-600">{confirmPasswordError}</p>}
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
              disabled={loading || !isFormComplete()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition duration-200"
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
