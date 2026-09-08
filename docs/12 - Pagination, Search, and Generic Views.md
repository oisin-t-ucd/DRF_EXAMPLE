# 12 - Scaling Up: Pagination, Search, and Generic Views

As an application grows, returning every record from the database in a single request becomes a massive performance bottleneck. If you have 10,000 courses, fetching them all at once will crash the browser.

To solve this, we implement **Pagination** (sending data in chunks) alongside **Search and Filtering** (finding specific data).

To do this efficiently, we will upgrade our backend from explicit `APIView` classes to DRF's powerful `GenericAPIView` classes.

## 1. Upgrading to Generic Views

In earlier guides, we wrote explicit `APIView` methods (`def get`, `def post`) to understand exactly how data flows. Now that you know the underlying mechanics, we can graduate to **Generic Views**.

Generic Views handle the boilerplate for you, and crucially, they have built-in support for pagination and filtering which base `APIViews` lack.

Open `api_app/views.py` and refactor your `CourseListCreateAPIView`:

```python
# api_app/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Course
from .serializers import CourseManualSerializer

# Inherit from generics.ListCreateAPIView instead of APIView
class CourseListCreateAPIView(generics.ListCreateAPIView):
    queryset = Course.objects.all().order_by('-id') # Order matters for consistent pagination
    serializer_class = CourseManualSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    # Instead of rewriting the entire def post() method to pass the user, 
    # we simply override perform_create, which DRF calls automatically during a POST.
    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

```

*(Notice how much code we just deleted! Generics automatically handle the `is_valid()` checks and HTTP responses for you.)*

## 2. Enabling Global Pagination

With our Generic View in place, adding pagination takes just two lines of code in your Django settings.

Open your `settings.py` and update your `REST_FRAMEWORK` configuration:

```python
# settings.py
REST_FRAMEWORK = {
    # ... your existing JWT authentication setting ...
    
    # Add these lines to enable global pagination:
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 5, # Limit to 5 items per page for testing
}

```

**The New JSON Structure:**
Your API will no longer return a simple array of objects. If you navigate to `http://localhost:8000/api/courses/`, you will see the response is now wrapped in an object containing navigation data:

```json
{
    "count": 12,
    "next": "http://localhost:8000/api/courses/?page=2",
    "previous": null,
    "results": [
        { "id": 12, "title": "...", ... },
        ...
    ]
}

```

## 3. Adding Search and Filters

Next, we want users to be able to search for specific courses. We will use the `django-filter` package.

Install the package in your terminal:

```bash
pip install django-filter

```

Register it in your `settings.py` under `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... 
    'django_filters',
    # ...
]

```

Now, update your `CourseListCreateAPIView` to enable searching by title/description, and filtering by active status:

```python
# api_app/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Course
from .serializers import CourseManualSerializer

class CourseListCreateAPIView(generics.ListCreateAPIView):
    queryset = Course.objects.all().order_by('-id')
    serializer_class = CourseManualSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    # 1. Register the filter backends
    filter_backends = [DjangoFilterBackend, SearchFilter]
    
    # 2. Define exact-match filters (?is_active=true)
    filterset_fields = ['is_active']
    
    # 3. Define search fields (?search=python)
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

```

## 4. Connecting Pagination and Search in React

Because the backend JSON structure changed (from an array to an object with a `results` array), we must update our React frontend. We also need to pass the current page number and search query to our Axios requests.

Open `src/pages/courses/CourseList.jsx` and refactor it:

```jsx
// src/pages/courses/CourseList.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import api from '../../services/api';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  
  // State for search and pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Re-run the fetch anytime the page number or search query changes
  useEffect(() => {
    fetchCourses();
  }, [page, search]);

  const fetchCourses = async () => {
    try {
      // Axios 'params' automatically formats the URL: /api/courses/?page=1&search=xyz
      const response = await api.get('/api/courses/', {
        params: { page: page, search: search }
      });
      
      // Update state based on the new paginated JSON structure
      setCourses(response.data.results);
      setHasNext(response.data.next !== null);
      setHasPrev(response.data.previous !== null);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

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
        {courses.map(course => (
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

```