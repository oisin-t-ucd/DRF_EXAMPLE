// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CourseList from "./components/CourseList";
import CreateCourse from "./components/CreateCourse";
import NavBar from "./components/NavBar";
import Login from "./components/Login";

export default function App() {
  return (
    <Router>
      <NavBar />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create" element={<CreateCourse />} />
        </Routes>
      </div>
    </Router>
  );
}
