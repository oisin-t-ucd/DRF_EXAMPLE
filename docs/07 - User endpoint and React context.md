# 07 - Managing Global State, Interceptor Bugs, and Protected Routes

While you *can* decode a JWT on the frontend to extract the username, making a request to a dedicated `/api/users/me/` endpoint is the industry standard. It allows you to retrieve additional data later (like an avatar, email, or role) without bloating the token.

To make the user's data accessible globally—so your Navbar, profile page, and course lists all know who is logged in—we will introduce **React Context**. We will also learn a valuable lesson about network interceptors and build a component to protect specific pages from logged-out users.

## Step 1: The DRF `/users/me/` Endpoint

First, we need a secure endpoint that only returns the data of the user making the request.

Add a simple explicit serializer in `drf/serializers.py`:

```python
# drf/serializers.py
from rest_framework import serializers

class UserManualSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField()
    email = serializers.EmailField()

```

Next, create an `APIView` in `drf/views.py` that utilizes the `IsAuthenticated` permission. Because of this permission, we can safely trust that `request.user` exists.

```python
# drf/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserManualSerializer

class CurrentUserAPIView(APIView):
    # The user MUST have a valid token to access this view
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserManualSerializer(request.user)
        return Response(serializer.data)

```

Map it in `drf/urls.py`:

```python
# drf/urls.py
from django.urls import path
from .views import CurrentUserAPIView

urlpatterns = [
    # ... your other endpoints
    path('users/me/', CurrentUserAPIView.as_view(), name='current-user'),
]

```

## Step 2: Global State with React Context

We will create an `AuthContext` to wrap our entire application, ensuring every component can check if a user is logged in.

Create a new file called `src/AuthContext.jsx`:

```jsx
// src/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import api from './api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const response = await api.get('/api/users/me/');
            setUser(response.data);
        } catch (error) {
            setUser(null); // If unauthorized, ensure user is null
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

```

Wrap your `App` inside this provider in `src/main.jsx`:

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

```

## Step 3: A Valuable Lesson — The Infinite Redirect Loop

When setting up interceptors alongside a global context that fetches on load, it is incredibly common to trigger an infinite redirect loop.

**How the trap works:**

1. `AuthContext` loads and requests `/users/me/`.
2. The user has no valid tokens, so Django returns a `401 Unauthorized`.
3. The Axios interceptor catches this, tries to hit `/api/refresh/`, and fails with a `400 Bad Request`.
4. The interceptor reacts by executing `window.location.href = '/login'`.
5. `window.location.href` forces the browser to undergo a *hard reload*.
6. The React app completely restarts, `AuthContext` mounts again, requests `/users/me/` again, fails again, and you are trapped in an endless loop!

**The Solution:**
In a Single Page Application (SPA), routing should be handled by React state, not global network scripts triggering hard reloads. We must remove the hard redirect from our interceptor and let the error propagate gracefully to the component that made the request.

Update your `src/api.js` response interceptor:

```javascript
// src/api.js
// ... request interceptor remains the same

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const res = await axios.post('http://127.0.0.1:8000/api/refresh/', {}, {
                    withCredentials: true 
                });
                
                setAccessToken(res.data.access);
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return api(originalRequest);
            } catch (err) {
                // 1. Clear the token
                clearAccessToken();
                
                // 2. Reject the promise so AuthContext knows the request failed
                // Notice we removed the window.location.href redirect!
                return Promise.reject(err); 
            }
        }
        return Promise.reject(error);
    }
);

```

Now, `AuthContext` catches the rejection, sets the user state to `null`, and stops spinning, allowing your app to load peacefully.

## Step 4: Building a Protected Route

Because we removed the hard redirect from the interceptor, users are no longer forced to the login screen if they visit a protected URL (like `/create`). Instead, we will handle this cleanly at the component level.

Create a new file `src/ProtectedRoute.jsx`:

```jsx
// src/ProtectedRoute.jsx
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

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

```

Now, implement this in `src/App.jsx` by wrapping any routes that require authentication:

```jsx
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CourseList from './CourseList';
import CreateCourse from './CreateCourse';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import Navigation from './Navigation'; // Your Navbar component

export default function App() {
  return (
    <Router>
      <Navigation />
      
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/login" element={<Login />} />
          
          {/* Lock down the creation route */}
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <CreateCourse />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

```

## Step 5: Updating the UI Components

Finally, connect your existing components to the Context so they can react to the user's state.

### The Navbar

Use the Context to conditionally render navigation items:

```jsx
// src/Navigation.jsx
import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { AuthContext } from './AuthContext';
import api, { clearAccessToken } from './api';

export default function Navigation() {
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post('/api/logout/');
        } catch (err) {
            console.error("Logout failed", err);
        } finally {
            clearAccessToken();
            setUser(null); 
            navigate('/login');
        }
    };

    return (
        <Navbar bg="dark" variant="dark">
            <Container>
                <Navbar.Brand as={Link} to="/">CourseApp</Navbar.Brand>
                <Nav className="ms-auto">
                    {user ? (
                        <>
                            {/* Show a link to the protected route only if logged in */}
                            <Nav.Link as={Link} to="/create" className="me-3">Add Course</Nav.Link>
                            <Navbar.Text className="me-3">
                                Signed in as: <strong>{user.username}</strong>
                            </Navbar.Text>
                            <Button variant="outline-light" onClick={handleLogout} size="sm">
                                Logout
                            </Button>
                        </>
                    ) : (
                        <Nav.Link as={Link} to="/login">Login</Nav.Link>
                    )}
                </Nav>
            </Container>
        </Navbar>
    );
}

```

### The Login Component

When the user successfully logs in, call `fetchUser()` to update the global state instantly:

```jsx
// src/Login.jsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import api, { setAccessToken } from './api';
import { AuthContext } from './AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { fetchUser } = useContext(AuthContext); 

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/login/', { username, password });
      
      setAccessToken(response.data.access);
      
      // Fetch the user details immediately!
      await fetchUser(); 
      
      navigate('/'); 
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '400px' }}>
      {/* ... keep your React-Bootstrap Form JSX here ... */}
    </Container>
  );
}

```
