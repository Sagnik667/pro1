"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthPage from "./AuthPage";

export default function Page() {
  const containerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated using localStorage
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.log("Not authenticated");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuth = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = useCallback(async () => {
    const currentToken = token || localStorage.getItem("authToken");

    if (currentToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          }
        });
      } catch (err) {
        console.warn("logout request failed", err);
      }
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);

    // ensure embed script resets global auth too
    if (window.authToken) window.authToken = null;
    if (window.currentUser) window.currentUser = null;
  }, [token]);

  // Load app content when user is authenticated
  useEffect(() => {
    if (!user || !token || loading) return;

    // Inject HTML
    fetch("/embed/index.html")
      .then(res => res.text())
      .then(html => {
        if (containerRef.current) {
          containerRef.current.innerHTML = html;

          // Inject script AFTER HTML exists
          const script = document.createElement("script");
          script.src = "/embed/script.js";
          script.defer = true;
          script.onload = async () => {
            // After script loads, pass user and token to it
            if (window.setAuthData) {
              window.setAuthData(user, token);
              if (window.loadUserFromDB) await window.loadUserFromDB();
              if (window.loadMeetingsFromDB) await window.loadMeetingsFromDB();
              if (window.renderAll) window.renderAll();
            }
          };
          document.body.appendChild(script);

          // Add logout function to window for the HTML to call
          window.logout = handleLogout;
        }
      });
  }, [user, token, loading, handleLogout]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontSize: "1.2rem"
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return <div ref={containerRef} />;
}
