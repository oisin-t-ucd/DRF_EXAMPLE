# 04 - Routing and Submitting Data in React

Displaying data is only half the battle. Now, we need to allow users to navigate between different pages and submit new courses to the database using a `POST` request.

To handle navigation without reloading the page, we will use **React Router**.

## 1. Install and Configure Routing

First, install the industry-standard routing library for React:
`npm install react-router-dom`

Next, refactor your application. Move the course-fetching logic you wrote in the last lesson out of `App.jsx` and into a new file called `CourseList.jsx`. Then, update `App.jsx` to handle your routes:

```jsx
// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CourseList from './CourseList';
import CreateCourse from './CreateCourse'; // We will build this next

export default function App() {
  return (
    <Router>
      {/* Grab a React-Bootstrap Navbar snippet. 
          Replace standard <a href="..."> tags with React Router's <Link to="..."> */}
      
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/create" element={<CreateCourse />} />
        </Routes>
      </div>
    </Router>
  );
}

```

## 2. Build the Creation Form Component

Create a new file called `CreateCourse.jsx`. We need to track what the user types into the form using React state.

* Grab a **Form** and **Button** snippet from the React-Bootstrap documentation.
* Assign a `value` and an `onChange` handler to each input to create "controlled components."

```jsx
// src/CreateCourse.jsx
import { useState } from 'react';

export default function CreateCourse() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div>
      <h2>Add a New Course</h2>
      {/* Paste your React-Bootstrap Form here. Example of wiring up an input:
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
          /> 
      */}
    </div>
  );
}

```

## 3. Handle the POST Request and Redirection

When the user clicks submit, we must prevent the browser's default form refresh, send the payload to Django via `axios.post`, and then automatically redirect the user back to the home page to see their new course.

Update `CreateCourse.jsx` with the submission logic:

```jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Hook for programmatic navigation

export default function CreateCourse() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault(); // Stop the page from reloading

    const newCourse = { title, description }; // Matches our DRF Serializer fields

    axios.post('http://127.0.0.1:8000/api/courses/', newCourse)
      .then(response => {
        // On success, redirect the user back to the list page
        navigate('/');
      })
      .catch(error => {
        console.error("Error creating course:", error);
        // Bonus: How could you map error.response.data to UI alerts?
      });
  };

  return (
    <form onSubmit={handleSubmit}>
       {/* Your form inputs and submit button go here */}
    </form>
  );
}

```