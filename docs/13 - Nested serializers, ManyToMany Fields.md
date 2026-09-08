# 13 - Complex Relational Data: Nested Serializers and Many-to-Many Fields

Real-world applications rarely consist of a single database table. Courses have multiple lessons (a One-to-Many relationship) and can be categorized by multiple tags (a Many-to-Many relationship).

When building an API, you have to decide how to represent these relationships in your JSON. Do you just send back the ID numbers of the related items, or do you embed the full object data directly inside the parent response?

In this guide, we will implement both relationship types, construct **Nested Serializers** to return rich JSON payloads, and update our manual `create` method to handle Many-to-Many saves.

---

## Step 1: Updating the Database Models

First, we need to define our new entities in Django.

Open `api_app/models.py` and add a `Tag` and a `Lesson` model. We will also update the `Course` model to establish the Many-to-Many connection.

```python
# api_app/models.py
from django.db import models
from django.contrib.auth.models import User

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses', null=True)
    
    # NEW: A Many-to-Many relationship. A course can have many tags, and a tag can belong to many courses.
    tags = models.ManyToManyField(Tag, related_name='courses', blank=True)

    def __str__(self):
        return self.title

class Lesson(models.Model):
    # NEW: A One-to-Many relationship. A course can have many lessons, but a lesson belongs to exactly one course.
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.IntegerField(default=0) # Helps us sort lessons logically

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

```

*(Run `python manage.py makemigrations` and `python manage.py migrate` to apply these database changes!)*

---

## Step 2: Building Nested Serializers

We want our frontend to receive a complete package of data when it asks for a Course. Instead of making three separate API calls (one for the course, one for its lessons, one for its tags), we will "nest" the lessons and tags directly inside the Course JSON.

Open `api_app/serializers.py` and add serializers for the new models at the top of the file:

```python
# api_app/serializers.py
from rest_framework import serializers
from .models import Course, Tag, Lesson

class TagSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=50)

class LessonSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    order = serializers.IntegerField()
    # We do NOT include the 'course' field here. 
    # Since this will be nested inside the Course data, including it would be redundant!

```

### Upgrading the Course Serializer

Now, update your existing `CourseManualSerializer`.

To handle the Many-to-Many relationship gracefully during a `POST` request, we use two separate fields for tags: one for reading the full tag objects, and a "write-only" field that accepts a simple array of tag IDs from the frontend.

```python
class CourseManualSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    is_active = serializers.BooleanField(default=True)
    instructor = serializers.CharField(source='instructor.username', read_only=True)
    
    # 1. READ-ONLY NESTED FIELDS
    # 'many=True' tells DRF to expect a list of objects.
    lessons = LessonSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    # 2. WRITE-ONLY RELATION FIELDS
    # The frontend will send an array of IDs like: { "tag_ids": [1, 3] }
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False
    )

    def create(self, validated_data):
        # Extract the tag_ids before creating the course, because M2M fields 
        # cannot be assigned until the parent object actually exists in the database.
        tag_ids = validated_data.pop('tag_ids', [])
        
        course = Course.objects.create(**validated_data)
        
        # Now that the course has an ID, we can assign the tags
        if tag_ids:
            course.tags.set(tag_ids)
            
        return course

```

*Note: Because `lessons` are strongly bound to a single course, it is usually better to create a completely separate API endpoint (e.g., `POST /api/lessons/`) to add new lessons to an existing course, rather than trying to create them all at once in the Course payload.*

---

## Step 3: Displaying Nested Data in React

With the backend delivering a deeply nested JSON structure, your React frontend can now render a much richer UI without executing any additional `fetch` or `axios` calls.

Open `src/pages/courses/CourseList.jsx`. We will use React-Bootstrap's `Badge` component for the tags, and a `ListGroup` to display the nested lessons.

```jsx
// src/pages/courses/CourseList.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, ListGroup } from 'react-bootstrap';
import api from '../../services/api';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCourses();
  }, [page, search]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/courses/', {
        params: { page, search }
      });
      setCourses(response.data.results);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  return (
    <Container className="mt-4">
      {/* ... keeping your existing search input here ... */}

      <Row>
        {courses.map(course => (
          <Col md={6} lg={4} className="mb-4" key={course.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title className="d-flex justify-content-between align-items-start">
                  {course.title}
                </Card.Title>
                
                {/* Map over the nested tags array */}
                <div className="mb-3">
                  {course.tags?.map(tag => (
                    <Badge bg="info" className="me-1" key={tag.id}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>

                <Card.Text>{course.description}</Card.Text>

                {/* Conditionally render the nested lessons list */}
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
              
              <Card.Footer className="text-muted text-sm bg-white">
                Instructor: {course.instructor || "Unknown"}
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* ... keeping your existing pagination controls here ... */}
    </Container>
  );
}

```

By mapping over `course.tags` and `course.lessons` exactly as we mapped over the `courses` themselves, we turn complex relational database architectures into clean, readable user interfaces.


Here is the additional section you can append directly to the end of Guide 11 to help them manage this new data efficiently.

---

## Step 4: Managing Relational Data in the Django Admin

Building frontend forms to handle nested data and Many-to-Many relationships can be time-consuming. While testing your API, you will need a fast way to populate your database with Courses, Tags, and Lessons.

Instead of creating a Course, saving it, and then navigating to a completely separate page to create Lessons one by one, we can customize the Django Admin using **Inlines**. Inlines allow you to edit a parent model and its related child models on the exact same page.

Open `api_app/admin.py` and register your new models:

```python
# api_app/admin.py
from django.contrib import admin
from .models import Course, Tag, Lesson

# 1. Register the Tag model normally
admin.site.register(Tag)

# 2. Create an Inline for Lessons
class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1 # Provides one blank row for a new lesson by default

# 3. Customize the Course Admin to include the Lesson Inline
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'instructor', 'is_active')
    list_filter = ('is_active', 'tags')
    search_fields = ('title', 'description')
    
    # Attach the inline here!
    inlines = [LessonInline]

# 4. Register the Course model with its custom Admin class
admin.site.register(Course, CourseAdmin)

```

### How to Use the Upgraded Admin Panel

1. Ensure you have created a superuser account (`python manage.py createsuperuser`).
2. Start your server and navigate to `[http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)`.
3. First, click on **Tags** and create a few categories (e.g., "Python", "React", "Beginner").
4. Next, click on **Courses** and click "Add Course".

You will notice two massive improvements on this page:

* **Tags (Many-to-Many):** You will see a multi-select box where you can highlight multiple tags by holding `Ctrl` (Windows) or `Cmd` (Mac).
* **Lessons (One-to-Many):** Scroll to the bottom of the page. Because of the `LessonInline`, you can now type out lesson titles, content, and order numbers directly inside the Course creation page. When you click "Save", Django will create the Course, link the Tags, and create all the Lessons in a single transaction.

---
