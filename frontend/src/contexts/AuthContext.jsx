// src/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../api/api"; // Import your Axios interceptor

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      // Our interceptor will automatically attach the access token!
      const response = await api.get("/api/users/me/");
      setUser(response.data);
    } catch (error) {
      setUser(null); // If unauthorized or failed, ensure user is null
    } finally {
      setLoading(false);
    }
  };

  // Check for the user immediately when the app loads
  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
