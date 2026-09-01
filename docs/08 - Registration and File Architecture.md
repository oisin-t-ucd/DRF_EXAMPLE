# 08 - User Registration and Organizing Your React Project

As your application grows, dumping every file directly into the `src/` folder quickly becomes unmanageable. Before we build our User Registration feature, we are going to restructure the frontend to use a domain-driven folder layout.

This guide covers how to organize a modern React codebase and how to wire up a secure registration flow from the backend to the UI.

---

## Step 1: Restructuring the React Project

Industry-standard React applications group files by their feature "domain" (like `auth` or `courses`) and separate reusable UI pieces from full-page layouts.

Inside your `frontend/src/` folder, create the following directory structure and move your existing files into their new homes:

```text
src/
├── components/           # Reusable UI parts (buttons, navbars, modals)
│   ├── Navigation.jsx
│   └── ProtectedRoute.jsx
├── context/              # Global state providers
│   └── AuthContext.jsx
├── pages/                # Full-screen views, grouped by domain
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx  # We will create this next
│   └── courses/
│       ├── CourseList.jsx
│       └── CreateCourse.jsx
├── services/             # API configuration and external connections
│   └── api.js
├── App.jsx               # Main router
└── main.jsx              # Application entry point

```

**Crucial Update:** Because you moved these files, you must update the import paths in your `App.jsx`, `main.jsx`, and inside the components themselves. For example, in `App.jsx`, your imports will now look like this:

```jsx
import CourseList from './pages/courses/CourseList';
import CreateCourse from './pages/courses/CreateCourse';
import Login from './pages/auth/Login';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';

```

*(Take a moment to fix the import paths across your app. If your server is running, Vite's error overlay will tell you exactly which files have broken imports!)*

Note: VSCode usually prompts to automatically adjust imports when moving these files.

---

## Step 2: The Django Registration Endpoint

To register a user, we need a new endpoint that accepts a username, email, and password, validates them, and securely hashes the password before saving to the database.

Create a new explicit serializer in `drf/serializers.py`:

```python
# drf/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User

class RegisterManualSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    # write_only=True ensures passwords are NEVER sent back in the JSON response
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        # 1. Check if passwords match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        # 2. Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
            
        return data

    def create(self, validated_data):
        # Use create_user (not create) so Django automatically hashes the password!
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

```

Next, add the APIView in `drf/auth_views.py` (where your custom JWT views live):

```python
# drf/auth_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .serializers import RegisterManualSerializer

class RegisterAPIView(APIView):
    # Registration must be public (we could just skip this line, but it makes the intent more explicit)
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterManualSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

```

Finally, wire it up in `project_name/urls.py`:

```python
# project_name/urls.py
from api_app.auth_views import RegisterAPIView

urlpatterns = [
    # ... your existing urls
    path('api/register/', RegisterAPIView.as_view(), name='register'),
]

```

---

## Step 3: The React Registration Form

Now, let's build the UI. Create `src/pages/auth/Register.jsx`.

This form will look similar to the Login component, but we will add a confirmation field and route the user to the Login page upon successful registration.

```jsx
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

```

## Step 4: Add the Route and Navigation Link

To finish the flow, add the new `<Register/>` page to your router in `App.jsx`:

```jsx
// src/App.jsx
import Register from './pages/auth/Register';

// ... inside your <Routes> block:
<Route path="/register" element={<Register />} />

```

Finally, update `src/components/Navigation.jsx` so unauthenticated users have an easy way to find the registration page:

```jsx
// src/components/Navigation.jsx

// ... inside the logged-out conditional block:
) : (
    <>
        <Nav.Link as={Link} to="/login">Login</Nav.Link>
        <Nav.Link as={Link} to="/register">Register</Nav.Link>
    </>
)}

```
