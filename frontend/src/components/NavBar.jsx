// src/Navigation.jsx
import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { AuthContext } from "../contexts/AuthContext";
import api, { clearAccessToken } from "../services/api";

export default function Navigation() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/api/logout/");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearAccessToken();
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <Navbar bg="dark" variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
          CourseApp
        </Navbar.Brand>
        <Nav className="ms-auto">
          {user ? (
            <>
              {/* Show a link to the protected route only if logged in */}
              <Nav.Link as={Link} to="/create" className="me-3">
                Add Course
              </Nav.Link>
              <Navbar.Text className="me-3">
                Signed in as: <strong>{user.username}</strong>
              </Navbar.Text>
              <Button variant="outline-light" onClick={handleLogout} size="sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Nav.Link as={Link} to="/login">
                Login
              </Nav.Link>
              <Nav.Link as={Link} to="/register">
                Register
              </Nav.Link>
            </>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}
