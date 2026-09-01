// src/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  // We must wait for the initial /users/me/ check to finish.
  // If we don't, React will immediately redirect the user before the API responds!
  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  // If the check finishes and there is no user, redirect them to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If they are logged in, render the protected component.
  return children;
}
