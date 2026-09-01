// src/pages/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import api from '../../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Send the payload to our new endpoint
      await api.post('/api/register/', formData);
      
      // On success, send them to the login page
      navigate('/login');
    } catch (err) {
      // DRF sends errors in err.response.data. 
      // For simplicity, we stringify the object to show the exact backend validation errors.
      if (err.response && err.response.data) {
        setError(JSON.stringify(err.response.data));
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '400px' }}>
      <h2 className="mb-4">Create an Account</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form onSubmit={handleRegister}>
        <Form.Group className="mb-3" controlId="username">
          <Form.Label>Username</Form.Label>
          <Form.Control 
            type="text" 
            name="username"
            value={formData.username} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email Address</Form.Label>
          <Form.Control 
            type="email" 
            name="email"
            value={formData.email} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control 
            type="password" 
            name="password"
            value={formData.password} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password_confirm">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control 
            type="password" 
            name="password_confirm"
            value={formData.password_confirm} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>

        <Button variant="success" type="submit" className="w-100 mb-3">
          Register
        </Button>
      </Form>
      
      <div className="text-center">
        Already have an account? <Link to="/login">Log in here.</Link>
      </div>
    </Container>
  );
}

