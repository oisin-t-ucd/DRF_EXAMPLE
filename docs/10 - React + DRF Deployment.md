# 10 - Deploying React and Django to Production

When developing locally, we ran two separate servers: Vite on port `5173` and Django on port `8000`. This is a **Cross-Origin** architecture.

To deploy our application simply and cost-effectively, we are going to combine them into a single **Same-Origin** application. We will compile the React app into static HTML, CSS, and JavaScript files, and configure Django to serve those files directly.

Here is the step-by-step guide to preparing the codebase and deploying to a platform like Render.

---

## Step 1: Dynamic API URLs in React

Right now, your React app is hardcoded to communicate with `http://localhost:8000/`. If you deploy this, the live website will literally try to make requests to the user's own computer!

We need React to use `localhost` during development, but use a relative URL (`/api/...`) in production since the frontend and backend will share the same domain.

Update your `src/services/api.js` file to check Vite's environment variables:

```javascript
// src/services/api.js
import axios from 'axios';

// import.meta.env.DEV is true when running 'npm run dev', and false after 'npm run build'
const baseURL = import.meta.env.DEV ? 'http://localhost:8000' : '';

// 2. Base Axio

const api = axios.create({
    baseURL: baseURL,
    withCredentials: true,
});

// ... update the refresh URL in your response interceptor:
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // ... inside the 401 catch block:

                    
                const res = await axios.post(
          `${baseURL}/api/refresh/`,
          {},
          {
            withCredentials: true,
          },
        );
        // ... remainder of interceptor

```

## Step 2: Build the Frontend

We need to transform the React code into static files that a standard web server can read.

1. Open your terminal and navigate to your `frontend` directory.
2. Run the build command: `npm run build`
3. Vite will create a new folder called `dist` (distribution) containing your compiled `index.html` and an `assets` folder with your JS and CSS.
4. Run this command to create the `staticfiles` folder and collect the static files required to run your django project: `python manage.py collectstatic --no-input`
5. Move or copy this entire `dist` folder from the `frontend` folder into the new `staticfiles` folder. Your path should look like this: `staticfiles/dist/index.html`.
6. If your .gitignore file includes a `dist` entry, it will ignore the new files, therefore you can add this to your .gitignore to include the new files in your GitHub repository: `!staticfiles/dist`

#### **IMPORTANT: Every time you make changes to your react app and want those changes to be deployed, you need to perform the 6 steps above again.**

You can also use the `build_frontend.sh` bash script included in this repo to run the above steps automatically after making changes to your react app. Just run this command in your terminal (use GitBash if on Windows):

```bash
./build_frontend.sh
```

If you get a `permission denied` error then you'll need to ensure your user has execution permission for the script (after this you'll be able to run the above command):

```bash
chmod +x build_frontend.sh 
```

---

## Step 3: Configuring Django to Serve React

Django needs to know where to find this new `index.html` file to serve it as a template.

Open your Django `settings.py` and update the `TEMPLATES` configuration to point to the `dist` folder:

```python
# settings.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # Add the path to your React build folder here:
        'DIRS': [BASE_DIR / 'staticfiles' / 'dist'], 
        'APP_DIRS': True,
        # ... remainder of template settings
    },
]

```

Next, install **Whitenoise**, a package that allows Django to serve static files (like your React CSS and JS) incredibly fast in production:

```bash
pip install whitenoise

```

Add it to your `settings.py` middleware (it must go directly *after* `SecurityMiddleware`):

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Add this line
    # ... other middleware
]

# Tell Whitenoise to serve files from the React dist folder at the root URL
WHITENOISE_ROOT = BASE_DIR / "staticfiles" / "dist"

```

**Why `WHITENOISE_ROOT`?** When `index.html` loads, it will ask the server for `/assets/index.js`. By setting `WHITENOISE_ROOT` to the `dist` folder, Whitenoise intercepts that request and successfully returns the compiled React JavaScript file.

---

## Step 4: Routing and the "Catch-All" View

If a user visits `https://your-site.com/login`, Django's router will look for a `/login` URL path. It won't find one (since only `/api/` paths exist in Django), and will throw a 404 error. We need to tell Django: *"If the URL doesn't start with `/api/`, give it to React and let React Router handle it."*

Update your main `urls.py`:

```python
# project_name/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api_app.urls')), # Your API routes
    
    # Catch-all route: sends all non-API requests to the React index.html
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
]

```

---

## Step 5: Securing Cookies for Same-Origin Production

Because React and Django now live on the exact same domain, our previous Cross-Origin cookie fixes are no longer needed, and will actually break the authentication flow in production.

We need to update our authentication view to dynamically handle cookies based on the environment.

Open `api_app/auth_views.py`:

```python
# api_app/auth_views.py
from django.conf import settings

class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            refresh_token = response.data.get('refresh')
            del response.data['refresh'] 
            
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                max_age=24 * 60 * 60,
                httponly=True,
                # Revert to Lax because we are same-origin now
                samesite='Lax', 
                secure=True, 
            )
        return response

```

### Ready for Deployment

Ensure you have installed all of the packages required for the deployment (i.e `gunicorn`, `dj-database-url`, `psycopg2-binary` etc.)

Your codebase is now completely configured for a single-server deployment! Ensure you have a `requirements.txt` file (generated via `pip freeze > requirements.txt`), push your code to GitHub, then deploy your app on render.

To see the steps for Render + Neon Postgres deployment, review the deployment document  11 - Render + Neon deployment.md