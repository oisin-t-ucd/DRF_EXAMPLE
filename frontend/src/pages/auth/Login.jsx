// src/Login.jsx
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button, Alert } from "react-bootstrap";
import api, { setAccessToken } from "../../services/api.js";
import { AuthContext } from "../../contexts/AuthContext.jsx";
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { fetchUser } = useContext(AuthContext);
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Send credentials to our custom Django view
      const response = await api.post("/api/login/", { username, password });

      // Save the access token in memory (Refresh token is set as a cookie automatically!)
      setAccessToken(response.data.access);
      // Fetch the user details immediately after getting the token!
      await fetchUser();
      navigate("/");
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "400px" }}>
      <h2 className="mb-4">Log In</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleLogin}>
        <Form.Group className="mb-3" controlId="username">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="w-100">
          Login
        </Button>
      </Form>
    </Container>
  );
}
