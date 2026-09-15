# DRF & React Educational Platform

A comprehensive fullstack application demonstrating the integration of a React single-page application with a robust Django REST Framework API. This platform serves as a course management system and reference architecture for fullstack development.

## Features

*   **Secure Authentication:** Complete registration and login system utilizing JWT authentication. Security is maximized by storing tokens securely.
*   **Course & Lesson Management:** Full CRUD capabilities mapping nested relationships. Instructors can create `Courses`, attach `Lessons`, and tag content.
*   **User Profiles & Media:** Dedicated user profile endpoints supporting secure profile image uploads managed and served via Cloudinary.
*   **Optimized Frontend UX:** The React interface includes advanced list pagination, generic views, loading spinners, global 404 error handling, and debounced search filtering.

## Data Architecture

The PostgreSQL database relies on Django's ORM to manage relational integrity. 
*(An ERD detailing the following relationships can be inserted here).*

**Key Models:**
*   `Profile`: Extends the default User model via a One-to-One relationship to store avatars and bios.
*   `Course`: The core entity, linking to a specific instructor.
*   `Lesson`: Holds a Foreign Key to `Course` for nested data retrieval.
*   `Tag`: Utilizes a Many-to-Many field with `Course` to allow flexible categorization.

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite |
| **Backend** | Python, Django, Django REST Framework |
| **Database & Storage** | PostgreSQL, Cloudinary, WhiteNoise |

## Local Setup Instructions

**Backend Setup**
1. Clone the repository and activate a Python virtual environment.
2. Install required packages: `pip install -r requirements.txt`.
3. Duplicate `.env.example` to `.env` and configure your database and Cloudinary credentials.
4. Apply schema migrations: `python manage.py migrate`.
5. Execute the test suite in the `courses` and `profiles` directories: `python manage.py test`.
6. Launch the API: `python manage.py runserver`.

**Frontend Setup**
1. Navigate into the `frontend` application folder: `cd frontend`.
2. Install dependencies: `npm install`.
3. Start the local server: `npm run dev`.

## Deployment

The application is configured for production using Render for web hosting and Neon for serverless PostgreSQL.

**Build Execution:**
Deployment is automated via custom shell scripts. The `build.sh` script handles the backend setup, while `build_frontend.sh` compiles the Vite React application (`npm run build`) and copies the resulting `dist/` directory into Django's `staticfiles/` folder to be served by WhiteNoise.