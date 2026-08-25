# 05 - Secure Authentication: The Hybrid JWT Approach

Storing tokens in `localStorage` exposes your application to Cross-Site Scripting (XSS) attacks. If a malicious script runs on your site, it can easily steal a user's token.

To build a production-grade application, we will use the **Hybrid Approach**. We will store the short-lived **Access Token** entirely in React's memory (so it disappears if the tab closes), and we will have Django issue the long-lived **Refresh Token** as an `HttpOnly` cookie. Because JavaScript cannot read `HttpOnly` cookies, XSS theft is impossible.

Here is how to set up this highly secure architecture.

---

## 1. Backend: Customizing Django for HttpOnly Cookies

First, install the library: `pip install djangorestframework-simplejwt`.

Next, we need to intercept SimpleJWT's default behavior so it sets a cookie instead of returning the refresh token in the JSON body.

Create a new file in your Django app called `auth_views.py`:

```python
# api_app/auth_views.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class CookieTokenObtainPairView(TokenObtainPairView):
    """Handles login: Returns access token in JSON, sets refresh token in HttpOnly cookie."""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            refresh_token = response.data.get('refresh')
            # 1. Remove it from the JSON payload
            del response.data['refresh'] 
            
            # 2. Attach it as an HttpOnly cookie
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                max_age=24 * 60 * 60, # 1 day
                httponly=True,
                samesite='Lax', # Required for cross-origin local development
                secure=False, # IMPORTANT: Set to True in production (HTTPS)
            )
        return response

class CookieTokenRefreshView(TokenRefreshView):
    """Handles refreshing: Reads the refresh token from the cookie."""
    def post(self, request, *args, **kwargs):
        # Inject the cookie into the request data so SimpleJWT can validate it
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            request.data['refresh'] = refresh_token
            
        return super().post(request, *args, **kwargs)

class LogoutView(APIView):
    """Handles logout: Deletes the HttpOnly cookie."""
    def post(self, request):
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie('refresh_token')
        return response

```

### Wire Up the URLs and CORS

Update your `urls.py` to route to these new custom views:

```python
# project_name/urls.py
from django.urls import path
from api_app.auth_views import CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView

urlpatterns = [
    # ... your other endpoints
    path('api/login/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
]

```

**Crucial Step:** Because React will now send cookies to Django on a different port, you must update `settings.py` to explicitly allow credentials:

```python
# settings.py
CORS_ALLOW_CREDENTIALS = True
# Ensure CORS_ALLOWED_ORIGINS is still explicitly set to ["http://localhost:5173"]

```

---

## 2. Frontend: In-Memory Storage & Interceptors

We will store the access token in a simple JavaScript variable inside our API file. This ensures it is never saved to the hard drive.

Create a file named `src/api.js`. This Axios instance will handle attaching the token to requests and silently refreshing it when it expires.

```javascript
// src/api.js
import axios from 'axios';

// 1. In-memory storage for the access token
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

// 2. Base Axios instance
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/',
    withCredentials: true, // IMPORTANT: Forces browser to send/receive the HttpOnly cookies
});

// 3. Request Interceptor: Attach the token to outgoing requests
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// 4. Response Interceptor: Handle 401 Unauthorized errors silently
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt to refresh. The browser automatically sends the refresh_token cookie!
                const res = await axios.post('http://127.0.0.1:8000/api/refresh/', {}, {
                    withCredentials: true 
                });
                
                // Update our in-memory variable
                setAccessToken(res.data.access);
                
                // Retry the original failed request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                // If refresh fails (cookie expired), clear everything and redirect
                clearAccessToken();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

```

---

## 3. Frontend: Building the UI (Login & Logout)

Now let's build the interfaces. Grab the `Form`, `Button`, and `Container` components from the [React-Bootstrap documentation](https://react-bootstrap.netlify.app/docs/forms/overview).

### The Login Component

Create `src/Login.jsx`. Notice how we import `setAccessToken` from our `api.js` file to update our in-memory state.

```jsx
// src/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import api, { setAccessToken } from './api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Send credentials to our custom Django view
      const response = await api.post('/api/login/', { username, password });
      
      // Save the access token in memory (Refresh token is set as a cookie automatically!)
      setAccessToken(response.data.access);
      navigate('/'); 
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '400px' }}>
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

```

### Handling the Logout

When a user logs out, we must accomplish two things: clear the in-memory access token, and tell Django to delete the `HttpOnly` refresh cookie.

You can add this logic to your Navbar inside `App.jsx`:

```jsx
// inside your Navbar or App component
import api, { clearAccessToken } from './api';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap'; // Ensure you've grabbed a Navbar snippet too

// ... inside the component function
const navigate = useNavigate();

const handleLogout = async () => {
    try {
        // Tell Django to delete the HttpOnly cookie
        await api.post('/api/logout/');
    } catch (err) {
        console.error("Logout failed", err);
    } finally {
        // Always clear the in-memory token and redirect
        clearAccessToken();
        navigate('/login');
    }
};

// ... inside your JSX return block (e.g., inside the Navbar)
<Button variant="outline-danger" onClick={handleLogout}>
    Logout
</Button>

```


### Handling JWT Auth on our API

Currently, our backend is still working in standard session authentication mode (just the same as it did for our traditional Django projects in Module 5). We need to add this to settings.py to tell Django to accept authentication in the JWT format (which means it should have an 'Authentication' Header on the HTTP request - see the `api.interceptors.request.use` section in `src/api/api.js` from the frontend code):

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    )
}
```

NOTE: This will resolve possible 403 errors you'll see when following the next guide on adding permissions to the DRF framework, as that's the normal 'permission denied' response code when using session authentication.

IMPORTANT: You will need to comment out the above block of code in your settings.py if you want to log in via the admin panel or the DRF Browsable API interface. Alternatively you can use an environment variable to toggle it on/off.