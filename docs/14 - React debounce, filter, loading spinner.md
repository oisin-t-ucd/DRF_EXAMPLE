# 14 - Enhancing the UI: Debouncing, Filtering, and Loading States

As your application grows and interacts with real database queries, user experience (UX) becomes critical.

Currently, typing in the search bar triggers an API request for every single keystroke. If a user types "React" quickly, it fires five separate network requests, wasting server resources and potentially causing race conditions where an older request finishes last and overwrites the correct data.

In this guide, we will implement a **Debounce** to fix the search bar, add a **Checkbox Filter** for active courses, and introduce a **Loading Spinner** so users know the app is working in the background.

---

## 1. Debouncing the Search Bar

"Debouncing" is a programming pattern that forces a function to wait a certain amount of time before running.

Instead of searching immediately, we will start a 500-millisecond timer when the user types. If they type another letter before the timer finishes, we clear the timer and start over. The API request only fires once they stop typing for half a second.

We achieve this in React by splitting our search into two state variables:

1. `search`: Updates instantly as the user types (keeps the input field feeling responsive).
2. `debouncedSearch`: Updates only after the timer finishes (triggers the API call).

## 2. Adding the Active Filter Checkbox

In the Django backend, we previously added `is_active` to our `filterset_fields`.

To use this in React, we will add a boolean state variable (`isActiveFilter`). When it is checked, we will attach `is_active=true` to our Axios request parameters.

## 3. Implementing the Loading Spinner

Network requests take time. We will add a `loading` state that turns `true` right before the Axios request begins and turns `false` inside a `finally` block when the request finishes (whether it succeeded or failed). We can then use React-Bootstrap's `<Spinner>` component to display a visual indicator.

---

## 4. The Complete Updated Component

Let's combine all three features into our `CourseList.jsx`.

Open `src/pages/courses/CourseList.jsx` and replace the existing code with this updated version:

```jsx
// src/pages/courses/CourseList.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, ListGroup, Spinner } from 'react-bootstrap';
import api from '../../services/api';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search and Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // 1. The Debounce Effect
  useEffect(() => {
    // Start a timer when 'search' changes
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when a new search executes
    }, 500);

    // Cleanup function: clears the timer if the user types again before 500ms
    return () => {
      clearTimeout(handler);
    };
  }, [search]); // Only re-runs when the user types

  // 2. The Fetch Effect
  useEffect(() => {
    // Now we depend on 'debouncedSearch' instead of the raw 'search' state
    fetchCourses();
  }, [page, debouncedSearch, isActiveFilter]);

  const fetchCourses = async () => {
    setLoading(true); // Show spinner
    
    try {
      const params = { 
        page: page, 
        search: debouncedSearch 
      };
      
      // Only append the is_active parameter if the checkbox is checked
      if (isActiveFilter) {
          params.is_active = true;
      }

      const response = await api.get('/api/courses/', { params });
      
      setCourses(response.data.results);
      setHasNext(response.data.next !== null);
      setHasPrev(response.data.previous !== null);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false); // Hide spinner
    }
  };

  return (
    <Container className="mt-4">
      {/* Filters and Search Row */}
      <Row className="mb-4 align-items-center">
        <Col md={6} className="mb-3 mb-md-0">
          <Form.Control 
            type="text" 
            placeholder="Search courses (waits until you stop typing)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Check 
            type="checkbox" 
            id="active-filter"
            label="Show only active courses" 
            checked={isActiveFilter}
            onChange={(e) => {
                setIsActiveFilter(e.target.checked);
                setPage(1); // Reset to page 1 when filter changes
            }}
          />
        </Col>
      </Row>

      {/* Conditional Rendering: Spinner vs Course Grid */}
      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {courses.length === 0 ? (
            <div className="text-center text-muted my-5">
              No courses found matching your criteria.
            </div>
          ) : (
            <Row>
              {courses.map(course => (
                <Col md={6} lg={4} className="mb-4" key={course.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Body>
                      <Card.Title>{course.title}</Card.Title>
                      
                      <div className="mb-3">
                        {course.tags?.map(tag => (
                          <Badge bg="info" className="me-1" key={tag.id}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>

                      <Card.Text>{course.description}</Card.Text>

                      {course.lessons && course.lessons.length > 0 && (
                        <div className="mt-3">
                          <h6 className="text-muted mb-2">Curriculum:</h6>
                          <ListGroup variant="flush">
                            {course.lessons.map(lesson => (
                              <ListGroup.Item key={lesson.id} className="px-0 py-1 border-0 text-sm">
                                &bull; {lesson.title}
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </div>
                      )}
                    </Card.Body>
                    <Card.Footer className="text-muted text-sm bg-white d-flex justify-content-between">
                      <span>Instructor: {course.instructor || "Unknown"}</span>
                      {/* Optional: Show a badge if the course is inactive */}
                      {!course.is_active && <Badge bg="secondary">Inactive</Badge>}
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
      
      {/* Pagination Controls */}
      <div className="d-flex justify-content-between my-4">
        <Button 
          variant="outline-primary" 
          disabled={!hasPrev || loading} 
          onClick={() => setPage(page - 1)}
        >
          &larr; Previous
        </Button>
        <span className="align-self-center">Page {page}</span>
        <Button 
          variant="outline-primary" 
          disabled={!hasNext || loading} 
          onClick={() => setPage(page + 1)}
        >
          Next &rarr;
        </Button>
      </div>
    </Container>
  );
}

```
