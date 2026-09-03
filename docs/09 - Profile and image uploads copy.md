# Guide: Implementing a User Profile with Cloudinary Image Uploads

In this guide, we will extend our user authentication system by adding a `Profile` model. This allows users to have additional details (like a biography and profile picture) without cluttering the core `User` model.

We will configure **Cloudinary** to handle our media files (image uploads) and **WhiteNoise** to serve our static files (CSS, JS). Finally, we'll expose this data through our `/users/me/` endpoint and handle the image upload process on the frontend using React and `FormData`.

---

## Part 1: Backend Storage Configuration

First, we need to set up our file storage. We'll use WhiteNoise for static files and Cloudinary for user-uploaded media.

### 1. Install Dependencies

Run the following command in your terminal to install the necessary packages:

```bash
pip install cloudinary django-cloudinary-storage whitenoise pillow python-dotenv

```

*(Note: `pillow` is required by Django to handle image fields).*

### 2. Update `settings.py`

You will need an account on [Cloudinary](https://cloudinary.com/). Once logged in, grab your **Cloudinary API Environment Variable** (it looks like `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`) and add it to your `.env` file:

```env
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

```

Now, update your `settings.py`. **The order of apps in `INSTALLED_APPS` is strict here.** `cloudinary_storage` must come before `staticfiles`, followed by `cloudinary`.

```python
# settings.py
import os
from dotenv import load_dotenv

load_dotenv()

# ...

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    
    # Cloudinary & Static apps - ORDER IS IMPORTANT
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    
    # Your other apps...
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise must be placed directly after the Django SecurityMiddleware
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'django.contrib.sessions.middleware.SessionMiddleware',
    # ...
]

# Django 5.2+ Storage Configuration
STORAGES = {
    "default": {
        # Handles user-uploaded media files via Cloudinary
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        # Handles static files (CSS, JS) via WhiteNoise
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]

# Media Settings (URLs)
MEDIA_URL = '/media/'

```

---

## Part 2: The Profile Model & Signals

We want a `Profile` to be created automatically whenever a new `User` registers.

### 1. Create the app and Model

Create a new 'profiles' app

```
django-admin startapp profiles
```

Add it to your INSTALLED_APPS in settings.py:


```python
INSTALLED_APPS = [
    
    # Your other apps...
    'profiles' # NEW
]

```
In your app's `models.py`, add the `Profile` model with a One-to-One link to the User.

```python
# profiles/models.py
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    bio = models.TextField(blank=True, max_length=500)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

# Signal to auto-create a profile when a User is created
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

```

*Don't forget to run `python manage.py makemigrations` and `python manage.py migrate` after creating the model!*

NOTE: Your current users will not have an existing profile assigned (this only happens automatically for newly created users via signals). You can manually create profiles for any pre-existing users via the admin panel:

In your app's `admin.py`, register the profile model

```python
# profiles/admin.py
from django.contrib import admin

# Register your models here.
from .models import Profile

admin.site.register(Profile)

```

Then you would login to the admin panel (http://localhost:8000/admin/) and create a profile for each of your existing users (this will prevent errors when attempting to update profiles for pre-existing users later).

---

## Part 3: Serializers and API Endpoints

We need to include the profile data inside our `/users/me/` endpoint so the frontend context gets all the user data in a single fetch.

Because Django REST Framework struggles to parse nested multipart form data (which is required for file uploads), the cleanest approach is to make the nested profile **read-only** on the User endpoint, and create a **dedicated endpoint** to handle profile updates.

### 1. Update Serializers

```python
# serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

# NEW SERIALIZER:
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'bio', 'avatar']

# UPDATED SERIALIZER:
class UserManualSerializer(serializers.ModelSerializer):
    # Nest the profile serializer. read_only=True ensures we don't 
    # break standard JSON user updates with complex multipart payloads.
    profile = ProfileSerializer(read_only=True) 

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']

```

### 2. Create a Dedicated Profile Update View

Add a view specifically for updating the profile. This will easily accept `multipart/form-data` from the frontend.

```python
# views.py
from rest_framework import generics, permissions
from .models import Profile
from .serializers import ProfileSerializer

class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Always return/update the profile of the currently logged-in user
    def get_object(self):
        return self.request.user.profile

```

### 3. Add to `urls.py`

```python
# urls.py
from django.urls import path
from .views import ProfileUpdateView
# ... import your user views ...

urlpatterns = [
    # Assuming you have a user endpoint like this:
    # path('users/me/', CurrentUserView.as_view(), name='current_user'),
    
    path('profile/me/', ProfileUpdateView.as_view(), name='update_profile'),
]

```

---

## Part 4: Frontend Implementation (React)

Now we move to the frontend. We need to store the extended user data in our Context, and build a form that uses `FormData` to send the image and text fields to our new profile endpoint.

### 1. User Context

Because we nested the `ProfileSerializer` inside the `UserSerializer`, your existing `/users/me/` fetch will automatically retrieve the profile.



### 2. The Profile Update Form (Handling File Uploads)

When sending files via HTTP, you cannot use standard JSON. You **must** use the browser's built-in `FormData` object.

Here is a functional component that allows users to edit their bio and upload an avatar:

```jsx
// src/pages/auth/Profile.jsx
import { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

import { Container, Form, Button, Image, Spinner } from 'react-bootstrap';

const Profile = () => {
    const { user, setUser } = useContext(AuthContext);
    const [bio, setBio] = useState(user?.profile?.bio || '');
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(user?.profile?.image || '');
    const [loading, setLoading] = useState(false);

    // Handle file selection and create a preview URL
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // 1. Initialize FormData (Required for sending files)
        const formData = new FormData();
        
        // 2. Append our data
        formData.append('bio', bio);
        if (avatar) {
            formData.append('avatar', avatar);
        }

        try {
            // 3. Send the PATCH request to our dedicated profile endpoint
            // Note: api.js automatically attaches the Authorization header
            const response = await api.patch('/api/profile/me/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // 4. Update the global user context with the new profile data
            setUser(prevUser => ({
                ...prevUser,
                profile: response.data
            }));
            
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <p>Loading profile...</p>;

    
    return (
        <Container className="mt-4" style={{ maxWidth: '600px' }}>
            <h2 className="mb-4">{user.username}'s Profile</h2>
            
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4" controlId="profileAvatar">
                    <Form.Label>Profile Picture</Form.Label>
                    <div className="d-flex flex-column align-items-start gap-3">
                        {preview && (
                            <Image 
                                src={preview} 
                                alt="Profile Preview" 
                                roundedCircle
                                style={{ width: '150px', height: '150px', objectFit: 'cover' }} 
                                thumbnail
                            />
                        )}
                        <Form.Control 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange} 
                        />
                    </div>
                </Form.Group>

                <Form.Group className="mb-4" controlId="profileBio">
                    <Form.Label>Bio</Form.Label>
                    <Form.Control 
                        as="textarea" 
                        rows={4} 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Tell us about yourself..."
                    />
                </Form.Group>

                <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                            />
                            Saving...
                        </>
                    ) : (
                        'Save Profile'
                    )}
                </Button>
            </Form>
        </Container>
    );
};

export default Profile;
```

### Summary of Workflow so far:

1. The **Backend** is configured to catch any file saved to an `ImageField` and automatically pipe it to Cloudinary using `django-cloudinary-storage`.
2. When the user logs in, the `/users/me/` request fetches their base details *and* their nested profile details, saving it all into the React **Context**.
3. When updating, the frontend builds a `FormData` object containing the binary image file and text, posting it to a dedicated `/api/profile/me/` endpoint.
4. Cloudinary hosts the image, returns the secure URL to Django, and Django updates the database. The frontend re-fetches `/users/me/` to refresh the Context with the new image URL.


# Adding the Profile to Your Navbar

Now that our users can upload a profile picture and save their bio, let's make that data visible across the app. We will update the main navigation bar to display the user's profile picture and provide a direct link to the edit page.

---

## Step 1: Create the Profile Route

First, ensure you have set up a route for the `Profile` component we built in the previous section. Open your main routing file (usually `App.jsx` or `main.jsx`) and add the route using `react-router-dom`.

```jsx
// App.jsx (Excerpt)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Profile from './components/Profile';
import Navbar from './components/Navbar';

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                {/* ... your other routes ... */}
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Router>
    );
}

export default App;

```

---

## Step 2: Update the Navbar Component

Next, we will modify our `Navbar.jsx` to consume the global `UserContext`. We will conditionally render the user's profile picture if they are logged in, or standard "Login" links if they are not.

We should also handle the scenario where a user is logged in but hasn't uploaded an image yet by providing a default fallback avatar. The default_profile.jpeg file can be added to the public folder.
Note: we're now using the user profile icon as a dropdown, so the collabsible nav has been removed, as the dropdown stays the same on mobile/desktop:

```jsx
import { useContext } from "react";

import { Container, Image, Navbar, Dropdown, NavLink } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import api, { clearAccessToken } from "../services/api";

export default function Navigation() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/api/logout/");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearAccessToken();
      setUser(null);
      navigate("/login");
    }
  };

  const userProfileIcon = user ? (
    <Image
      src={user.profile?.avatar || "/default_profile.jpeg"}
      alt="User Profile"
      roundedCircle
      width="40"
      height="40"
      className="border m-0 p-0"
      style={{ objectFit: "cover" }}
    />
  ) : null;

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">OfCourse</Navbar.Brand>
        <NavLink as={Link} to="/courses">Course List</NavLink>
        <div className="d-flex align-items-center ms-auto">
          {user ? (
            <Dropdown align="end">
              
              <Dropdown.Toggle 
                id="user-nav-dropdown"
                className="bg-transparent border-0 p-0 d-flex align-items-center"
              >
                {userProfileIcon}
              </Dropdown.Toggle>

              
              <Dropdown.Menu className="position-absolute shadow mt-2">
                <Dropdown.ItemText className="text-muted">
                  Signed in as {user.username}
                </Dropdown.ItemText>
                
                <Dropdown.Divider />
                
                <Dropdown.Item as={Link} to="/create">
                  Add Course
                </Dropdown.Item>
                
                <Dropdown.Item as={Link} to="/profile">
                  Profile
                </Dropdown.Item>
                
                <Dropdown.Item onClick={handleLogout}>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <>
              
              <Link to="/login" className="text-decoration-none text-secondary me-3 px-2">Login</Link>
              <Link to="/register" className="text-decoration-none text-secondary px-2">Register</Link>
            </>
          )}
        </div>
      </Container>
    </Navbar>
  );
}
```

### How it all comes together:

1. When the app loads, `UserContext` fetches the user data (including the nested Cloudinary image URL).
2. The `Navbar` reads `user.profile.avatar`.
3. If an image exists, it renders the Cloudinary URL. If it's `null`, it renders the `defaultAvatar` fallback link.
4. Clicking the 'profile' link routes the user to `/profile`, where they can use the `FormData` component from the previous guide to upload a new picture!