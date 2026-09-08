import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Container className="text-center mt-5 pt-5">
      <h1 className="display-1 fw-bold text-secondary">404</h1>
      <h2 className="mb-4">Oops! Page Not Found</h2>
      <p className="text-muted mb-4 pb-2">
        The page you are looking for might have been removed, had its name changed, 
        or is temporarily unavailable.
      </p>
      
      {/* We use the React Router Link component but style it as a Bootstrap button */}
      <Button as={Link} to="/" variant="primary" size="lg">
        Return to Home
      </Button>
    </Container>
  );
}
