import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
// src/CreateCourse.jsx
import { useState } from "react";
import api from "../../services/api";

import { useNavigate } from "react-router-dom"; // Hook for programmatic navigation

export default function CreateCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault(); // Stop the page from reloading

    const newCourse = { title, description, is_active: isActive }; // Matches our DRF Serializer fields
    api
      .post("/api/courses/", newCourse)
      .then((response) => {
        // On success, redirect the user back to the list page
        navigate("/");
      })
      .catch((error) => {
        console.error("Error creating course:", error);
        // Bonus: How could you map error.response.data to UI alerts?
      });
  };

  return (
    <div>
      <h2>Add a New Course</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="title">
          <Form.Label>Title</Form.Label>
          <Form.Control
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="Enter title"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="description">
          <Form.Label>Description</Form.Label>
          <Form.Control
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            type="text"
            placeholder="Enter description"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="is_active">
          <Form.Check
            defaultChecked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            type="checkbox"
            label="Active"
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>
    </div>
  );
}
