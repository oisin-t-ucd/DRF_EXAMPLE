# 03 - Connecting React to Your DRF API

Now that your Django backend serves raw JSON data, it is time to consume it with a frontend. We will initialize a React application alongside your Django project and build a home page to display your courses.

## Step 1: Initialize the React App

Ensure you are at the root of your project repository (next to `manage.py`), then use Vite to scaffold the frontend:

* Run: `npm create vite@latest frontend -- --template react`
* Navigate inside: `cd frontend`
* Install dependencies: `npm install`
* Add our tools: `npm install axios react-bootstrap bootstrap`
* Start the server: `npm run dev`

Import Bootstrap's CSS inside your `src/main.jsx` file:
`import 'bootstrap/dist/css/bootstrap.min.css';`

## Step 2: Enable CORS in Django

Even when working locally, your browser will block requests from `localhost:5173` (React) to `127.0.0.1:8000` (Django) due to Cross-Origin Resource Sharing (CORS) security rules.

* Install the package: `pip install django-cors-headers`
* Add `"corsheaders"` to `INSTALLED_APPS` in `settings.py`.
* Add `"corsheaders.middleware.CorsMiddleware"` to `MIDDLEWARE` (above `CommonMiddleware`).
* Define the allowed origin at the bottom of `settings.py`: `CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]`

## Step 3: Fetch and Display Data

Clear out `src/App.jsx`. Instead of writing boilerplate UI code, open the [React-Bootstrap documentation](https://react-bootstrap.netlify.app/) and grab the snippets for a `Navbar`, a `Container`, and a `Card`.

Here is the core logic to map your backend data into those Bootstrap components:

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
// Import your React-Bootstrap components here (e.g., Navbar, Container, Card)

export default function App() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Fetch data from the DRF endpoint
    axios.get('http://127.0.0.1:8000/api/courses/')
      .then(response => setCourses(response.data))
      .catch(error => console.error("Error fetching data:", error));
  }, []);

  return (
    <div>
      {/* Paste a Navbar snippet from the React-Bootstrap docs here */}
      
      <div className="container mt-4">
        <div className="row">
          {courses.map(course => (
            <div className="col-md-4 mb-4" key={course.id}>
              {/* Paste a Card snippet here. 
                  Replace static text with {course.title} and {course.description} */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```