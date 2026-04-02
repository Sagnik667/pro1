"use client";

import { useState } from "react";

export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Login with username and password
        if (!email.trim()) {
          throw new Error("Username is required");
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: email.toLowerCase(),
            password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Login failed");
        }

        // Store token and user in localStorage
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Call onAuth callback
        onAuth(data.user, data.token);

      } else {
        // Signup with username and password
        if (!email.trim()) {
          throw new Error("Username is required");
        }

        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: email.toLowerCase(),
            password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Signup failed");
        }

        // Store token and user in localStorage
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Call onAuth callback
        onAuth(data.user, data.token);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        <h1 style={{
          textAlign: "center",
          marginBottom: "2rem",
          color: "#333",
          fontSize: "2rem"
        }}>
          Meeting Scheduler
        </h1>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
              setEmail("");
              setPassword("");
            }}
            style={{
              padding: "0.5rem 1rem",
              margin: "0 0.5rem",
              border: "none",
              borderRadius: "5px",
              background: isLogin ? "#667eea" : "#f0f0f0",
              color: isLogin ? "white" : "#333",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: isLogin ? "bold" : "normal"
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
              setEmail("");
              setPassword("");
            }}
            style={{
              padding: "0.5rem 1rem",
              margin: "0 0.5rem",
              border: "none",
              borderRadius: "5px",
              background: !isLogin ? "#667eea" : "#f0f0f0",
              color: !isLogin ? "white" : "#333",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: !isLogin ? "bold" : "normal"
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "1rem",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif"
              }}
            />
          </div>

          {/* Password Field with Toggle */}
          <div style={{ marginBottom: "1rem", position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem 2.5rem 0.75rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "1rem",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif"
              }}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                color: "#667eea",
                padding: "0.25rem 0.5rem"
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              color: "#c0392b",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              textAlign: "center",
              backgroundColor: "#fadbd8",
              padding: "0.75rem",
              borderRadius: "5px",
              border: "1px solid #e74c3c",
              lineHeight: "1.4"
            }}>
              {error.includes("rate") || error.includes("wait") ? (
                <>
                  <strong>⏳ Rate Limit</strong>
                  <br />
                  {error}
                </>
              ) : (
                error
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontWeight: "bold"
            }}
          >
            {loading ? "Please wait..." : (isLogin ? "Login" : "Create Account")}
          </button>
        </form>

        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          backgroundColor: "#ecf0f1",
          borderRadius: "5px",
          fontSize: "0.85rem",
          color: "#2c3e50",
          textAlign: "center"
        }}>
          {isLogin ? (
            <>
              <p style={{ margin: "0 0 0.5rem 0" }}>Enter your username and password to login</p>
              <small style={{ color: "#7f8c8d", display: "block" }}>
                No account yet? Click Sign Up above
              </small>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 0.5rem 0" }}>Create an account with a unique username</p>
              <small style={{ color: "#7f8c8d", display: "block" }}>
                Passwords must be at least 6 characters
              </small>
            </>
          )}
        </div>
      </div>
    </div>
  );
}