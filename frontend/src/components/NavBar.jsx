// inside your Navbar or App component
import api, { clearAccessToken } from "../api/api";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap"; // Ensure you've grabbed a Navbar snippet too
// src/App.jsx
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

export default function NavBar() {
  // ... inside the component function
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Tell Django to delete the HttpOnly cookie
      await api.post("/api/logout/");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      // Always clear the in-memory token and redirect
      clearAccessToken();
      navigate("/login");
    }
  };

  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand to="/" as={Link}>
          Courses
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link to="/login" as={Link}>
              Login
            </Nav.Link>
            <Nav.Link to="/create" as={Link}>
              Create Course
            </Nav.Link>
            <Button variant="outline-danger" onClick={handleLogout}>
              Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
