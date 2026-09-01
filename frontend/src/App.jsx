import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CourseList from "./pages/courses/CourseList";
import CreateCourse from "./pages/courses/CreateCourse";
import NavBar from "./components/NavBar";
import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/auth/Register";

export default function App() {
  return (
    <Router>
      <NavBar />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
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
