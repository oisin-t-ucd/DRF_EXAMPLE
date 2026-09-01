import Card from "react-bootstrap/Card";
import api from "../../services/api";
import { useState, useEffect } from "react";
import axios from "axios";
// Import your React-Bootstrap components here (e.g., Navbar, Container, Card)

export default function App() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Fetch data from the DRF endpoint

    api
      .get("/api/courses/")
      .then((response) => {
        console.log(response.data);
        setCourses(response.data);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div>
      <div className="container mt-4">
        <div className="row">
          {courses.map((course) => (
            <div className="col-md-4 mb-4" key={course.id}>
              <Card>
                <Card.Title>{course.title}</Card.Title>
                <Card.Body>{course.description}</Card.Body>
                <Card.Subtitle>
                  {course.is_active ? "Active" : "Inactive"}
                </Card.Subtitle>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
