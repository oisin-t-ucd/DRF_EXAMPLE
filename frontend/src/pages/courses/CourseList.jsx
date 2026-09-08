import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import api from "../../services/api";
import { useState, useEffect } from "react";

export default function App() {
  const [courses, setCourses] = useState([]);

  // State for search and pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchCourses = async () => {
    try {
      // Axios 'params' automatically formats the URL: /api/courses/?page=1&search=xyz
      const response = await api.get("/api/courses/", {
        params: { page: page, search: search },
      });

      // Update state based on the new paginated JSON structure
      console.log(response.data.results)
      setCourses(response.data.results);
      setHasNext(response.data.next !== null);
      setHasPrev(response.data.previous !== null);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Re-run the fetch anytime the page number or search query changes
  useEffect(() => {
    fetchCourses();
  }, [page, search]);

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col md={6}>
          {/* Search Input */}
          <Form.Control
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Always reset to page 1 when starting a new search
            }}
          />
        </Col>
      </Row>

      <Row>
        {courses.map((course) => (
          <Col md={4} className="mb-4" key={course.id}>
            <Card>
              <Card.Body>
                <Card.Title>{course.title}</Card.Title>
                <Card.Text>{course.description}</Card.Text>
                <Card.Footer className="text-muted text-sm">
                  Instructor: {course.instructor || "Unknown"}
                </Card.Footer>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Pagination Controls */}
      <div className="d-flex justify-content-between my-4">
        <Button
          variant="outline-primary"
          disabled={!hasPrev}
          onClick={() => setPage(page - 1)}
        >
          &larr; Previous
        </Button>
        <span className="align-self-center">Page {page}</span>
        <Button
          variant="outline-primary"
          disabled={!hasNext}
          onClick={() => setPage(page + 1)}
        >
          Next &rarr;
        </Button>
      </div>
    </Container>
  );
}
