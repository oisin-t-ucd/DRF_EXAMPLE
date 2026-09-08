# 15 - Handling Unknown Routes: Building a 404 Error Page

When users manually type a URL incorrectly or click a broken link, they should not be met with a blank screen or a crashed application. Instead, they should see a friendly "404 Not Found" page that guides them back to safety.

In a traditional web architecture, the backend server handles 404 errors. However, because our Django backend forwards all non-API requests to our React frontend (via the catch-all `re_path` we set up during deployment), React Router is entirely responsible for figuring out what to show the user.

Here is how to create a catch-all route in React to handle unknown URLs.

---

## Step 1: Create the 404 Component

First, let's build a simple, clean UI for the error page.

Create a new file called `src/components/NotFound.jsx`:

```jsx
// src/components/NotFound.jsx
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

```

## Step 2: Implement the "Catch-All" Route

React Router evaluates your defined `<Route>` paths from top to bottom, looking for a match.

To catch unknown URLs, we use an asterisk (`*`) as the path. This wildcard tells React Router: *"If the URL does not match any of the specific paths defined above, render this component instead."*

Because it catches everything, **the wildcard route must always be placed at the very bottom of your `<Routes>` list**.

Open `src/App.jsx` and add the `NotFound` component:

```jsx
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CourseList from './pages/courses/CourseList';
import CreateCourse from './pages/courses/CreateCourse';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotFound from './pages/NotFound'; // 1. Import the new component
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';

export default function App() {
  return (
    <Router>
      <Navigation />
      
      <div className="container mt-4">
        <Routes>
          {/* Specific Routes */}
          <Route path="/" element={<CourseList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <CreateCourse />
              </ProtectedRoute>
            } 
          />

          {/* 2. Catch-All Route for 404s (Must be the last route!) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

```

### How to Test It

1. Start your React development server (`npm run dev`).
2. Navigate to an existing route, like `http://localhost:5173/login`, to ensure normal pages still load.
3. Manually type a non-existent route into your browser's address bar, like `http://localhost:5173/nonsense-url-that-doesnt-exist`.
4. You should immediately see your custom 404 page, and clicking the "Return to Home" button should smoothly transition you back to the main course list without refreshing the browser.

