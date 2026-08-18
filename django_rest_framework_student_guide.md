# Transitioning to Django REST Framework (DRF): A Student Guide

Welcome to the next phase of your Django journey! Up until now, you have been building applications using Django's **Model-View-Template (MVT)** architecture. You retrieved data from a database, passed it to a Django view, and rendered it directly into an HTML template.

Now, we are going to learn **Django REST Framework (DRF)** to build an **API (Application Programming Interface)**. 

## The Paradigm Shift: Standard Django vs. DRF

When building an API, your Django server no longer cares about HTML, CSS, or how the page looks. Instead, your backend's only job is to provide **raw data**—typically in **JSON** format. 

**Why do this?** 
Separation of concerns. By outputting JSON data instead of HTML, your Django backend becomes platform-agnostic. The exact same API can power a modern JavaScript web frontend (like React), a mobile app, or even a desktop application. 

### Core DRF Concepts

To make this shift, DRF introduces a few new concepts that map closely to what you already know:

1.  **Models:** The exact same Django models you already know. No changes here!
2.  **Serializers (The Translator):** Django models are complex Python objects. Serializers convert these complex objects into native Python datatypes that can easily be rendered into JSON. They also handle the reverse: translating incoming JSON data back into complex types to save to your database.
3.  **Views & ViewSets:** Instead of writing standard HTML views, you will write API views. DRF's **ViewSets** are incredibly powerful—they combine the logic for listing, creating, retrieving, updating, and deleting items into a single class.
4.  **Routers:** Because ViewSets handle multiple actions automatically, Routers automatically generate the necessary URL configurations for you, saving you from manually writing out repetitive URL paths.

---

## Step-by-Step Setup Guide

Install Django, create a project & app:
```bash

pip install Django>=5.2
django-admin startproject project_name .
django-admin startapp courses
```
Let’s build a simple API for a `Course` model from scratch. This assumes you already have a working Django project with an app named `api_app`.

### Step 1: Install and Configure DRF

Open your terminal and install the framework:
```bash
pip install djangorestframework
```

Next, register DRF in your `settings.py` file:
```python
# settings.py
INSTALLED_APPS = [
    # ... your standard django apps
    'rest_framework',  # Add this line
    'api_app',         # Your application
]
```

### Step 2: Create a Simple Model

Let's make sure we have a model to work with in `api_app/models.py`:
```python
# api_app/models.py
from django.db import models

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title
```
*(Don't forget to run `python manage.py makemigrations` and `python manage.py migrate`!)*

### Step 3: Create the Serializer

Create a new file in your app folder called `serializers.py`. We will use a `ModelSerializer`, which automatically generates the translation logic based on your model.

```python
# api_app/serializers.py
from rest_framework import serializers
from .models import Course

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'  # This tells DRF to include all model fields in the JSON
```

### Step 4: Build the ViewSet

In your `views.py`, we will replace standard HTML views with a `ModelViewSet`. This single class will automatically handle GET, POST, PUT, PATCH, and DELETE requests.

```python
# api_app/views.py
from rest_framework import viewsets
from .models import Course
from .serializers import CourseSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
```

### Step 5: Wire Up the URLs with a Router

Create (or open) your `urls.py` in `api_app` and set up the Router.

```python
# api_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r'courses', CourseViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('api/', include(router.urls)),
]
```
Ensure your main project `urls.py` is including the `api_app.urls`.

---

## Testing Your API: The Browsable API

One of the best features of Django REST Framework for development is the **Browsable API**. You don't need a frontend or a tool like Postman to test your endpoints initially.

1. Start your server: `python manage.py runserver`
2. Open your web browser and navigate to: `http://127.0.0.1:8000/api/courses/`

You will see a highly interactive HTML interface provided by DRF!

### How to use the Browsable API:
*   **Making GET Requests (List):** Just by loading the page, you are making a `GET` request. The main window will display an array of JSON objects representing your database records.
*   **Making POST Requests (Create):** Scroll to the bottom of the page. You will see an HTML form generated automatically from your Serializer. Type in a new Course title and description, and click the **"POST"** button. Your new record is now saved to the database.
*   **Detail Views (Retrieve, Update, Delete):** Look at the JSON output for an individual item. If you append its ID to the URL (e.g., `http://127.0.0.1:8000/api/courses/1/`), you will see just that specific record. The form at the bottom now allows you to update it (**PUT/PATCH**) or you can click the red button at the top right to remove it (**DELETE**).

Congratulations! You have successfully decoupled your Django backend and built a fully functional RESTful API.
