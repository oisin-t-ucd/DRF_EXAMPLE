import { useContext } from "react";
// 1. Swap Nav and NavDropdown for standard Dropdown
import { Container, Image, Navbar, Dropdown, NavLink } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
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

  const userProfileIcon = user ? (
    <Image
      src={user.profile?.avatar || "/default_profile.jpeg"}
      alt="User Profile"
      roundedCircle
      width="40"
      height="40"
      className="border m-0 p-0"
      style={{ objectFit: "cover" }}
    />
  ) : null;

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">OfCourse</Navbar.Brand>
        <NavLink as={Link} to="/courses">Course List</NavLink>
        <div className="d-flex align-items-center ms-auto">
          {user ? (
            <Dropdown align="end">
              
              <Dropdown.Toggle 
                id="user-nav-dropdown"
                className="bg-transparent border-0 p-0 d-flex align-items-center"
              >
                {userProfileIcon}
              </Dropdown.Toggle>

              
              <Dropdown.Menu className="position-absolute shadow mt-2">
                <Dropdown.ItemText className="text-muted">
                  Signed in as {user.username}
                </Dropdown.ItemText>
                
                <Dropdown.Divider />
                
                <Dropdown.Item as={Link} to="/create">
                  Add Course
                </Dropdown.Item>
                
                <Dropdown.Item as={Link} to="/profile">
                  Profile
                </Dropdown.Item>
                
                <Dropdown.Item onClick={handleLogout}>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <>
              
              <Link to="/login" className="text-decoration-none text-secondary me-3 px-2">Login</Link>
              <Link to="/register" className="text-decoration-none text-secondary px-2">Register</Link>
            </>
          )}
        </div>
      </Container>
    </Navbar>
  );
}