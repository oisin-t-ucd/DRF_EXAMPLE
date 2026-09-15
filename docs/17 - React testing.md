## The Frontend Testing Philosophy

Frontend testing ensures your user interface behaves correctly for the end user. Focus on these core principles:

* **Critical User Paths:** Prioritize the absolute necessities first, such as the registration flow, logging in, and logging out.
* **User Interactions:** Simulate typing and button clicks rather than testing internal React state.
* **Error States:** Explicitly verify that failed API calls trigger visible error messages in the UI.
* **Confidence over Coverage:** Do not chase 100% line coverage; aim for enough coverage to deploy your application confidently.


### Setup: Vitest, RTL, and MSW

Navigate to your `frontend/` directory and install the required testing tools:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw

```

Update your `vite.config.js` to define the test environment:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  }
})

```

## Test Structure and Colocation

For organizing your test files, use the **colocation** method. Place test files immediately next to the component they verify within your `frontend/src/` directory:

* `Profile.jsx` paired with `Profile.test.jsx`.


* `Login.jsx` paired with `Login.test.jsx`.


* `Register.jsx` paired with `Register.test.jsx`.



Colocation keeps imports clean and ensures tests serve as direct, easily accessible documentation for how each specific component functions.

## Component Test Examples

Below are the complete test files for the profile and authentication components, which will use vi.mock to simulate API requests. Later on, we'll use MSW, which can help reduce the amount of code required to mock API requests throughout the frontend project tests.

**Profile.test.jsx**
This test verifies that the `Profile` component renders the user's initial data and successfully submits a `FormData` payload containing the updated bio and avatar.

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Profile from './Profile';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';

vi.mock('../../services/api');
global.URL.createObjectURL = vi.fn(() => 'mocked-preview-url');

describe('Profile Component', () => {
  const mockUser = {
    username: 'testuser',
    profile: { bio: 'Initial bio', image: 'test.jpg' }
  };
  const mockSetUser = vi.fn();

  const renderWithContext = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, setUser: mockSetUser }}>
        <Profile />
      </AuthContext.Provider>
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders user profile data initially', () => {
    renderWithContext();
    expect(screen.getByText("testuser's Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial bio')).toBeInTheDocument();
  });

  test('submits updated profile data successfully', async () => {
    api.patch.mockResolvedValueOnce({ data: { bio: 'Updated bio', image: 'new.jpg' } });
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithContext();
    const user = userEvent.setup();

    const bioInput = screen.getByLabelText(/bio/i);
    await user.clear(bioInput);
    await user.type(bioInput, 'Updated bio');

    const submitBtn = screen.getByRole('button', { name: /save profile/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
      expect(api.patch.mock.calls[0][0]).toBe('/api/profile/me/');
      expect(api.patch.mock.calls[0][1].get('bio')).toBe('Updated bio');
    });

    expect(mockSetUser).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('Profile updated successfully!');
    alertMock.mockRestore();
  });
});

```

**Login.test.jsx**
This test ensures the `Login` component submits credentials, saves the access token to memory, fetches the user data, and navigates to the home page upon success.

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import api, { setAccessToken } from '../../services/api.js';
import { AuthContext } from '../../contexts/AuthContext.jsx';

vi.mock('../../services/api.js', () => ({
  default: { post: vi.fn() },
  setAccessToken: vi.fn()
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Login Component', () => {
  const mockFetchUser = vi.fn();

  const renderWithContext = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={{ fetchUser: mockFetchUser }}>
          <Login />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('successfully logs in and navigates', async () => {
    api.post.mockResolvedValueOnce({ data: { access: 'mock-jwt-token' } });
    renderWithContext();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/login/', { username: 'admin', password: 'secret' });
      expect(setAccessToken).toHaveBeenCalledWith('mock-jwt-token');
      expect(mockFetchUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('displays error alert on invalid credentials', async () => {
    api.post.mockRejectedValueOnce(new Error('Unauthorized'));
    renderWithContext();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), 'wrong');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    const errorAlert = await screen.findByText('Invalid username or password');
    expect(errorAlert).toBeInTheDocument();
  });
});

```


## Why We Use Mock Service Worker (MSW)

Frontend tests should never hit your actual Django backend. While you can manually mock JavaScript modules like Axios by using vitest.mock (as we've done above), Mock Service Worker (MSW) is the industry standard for several reasons:

* **Network-Level Interception:** MSW intercepts actual HTTP requests in the browser or Node environment, making your tests behave exactly like production.
* **Decoupled Tests:** Your components do not know they are being mocked, allowing you to refactor your API service files without breaking your entire test suite.
* **Reusable Handlers:** You can define a single set of API mocks in a central file and share them seamlessly across multiple test suites.


### Configuring Mock Service Worker (MSW)

MSW allows you to define network handlers that mimic your Django backend exactly. Create a `src/mocks/handlers.js` file to define your endpoint responses:

```javascript
import { http, HttpResponse } from 'msw'
// you can fill this file with the real responses you receive from your backend (copy/paste from chrome developer tools)
// with msw set up, you don't need to use vi.mock in the tests to mock the api requests within each test

export const handlers = [
  http.post("api/register/", () => {
    return HttpResponse.json(
      {
        status: "SUCCESS",
      },
      { status: 200 },
    );
  }),
  
]

```

Create a `src/mocks/server.js` file to initialize the interception:

```javascript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

```

Finally, initialize MSW and your DOM matchers in `src/setupTests.js`:

```javascript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

```

### Writing Your Tests

With MSW running, your components will automatically receive the mock data without needing to fake any local services. Here is how to test the `Register.jsx` component with MSW set up:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Register from "./Register";
import { server } from "../../mocks/server"; // Import your MSW server node instance
import { http, HttpResponse } from "msw";
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Register Component", () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("registers successfully and redirects to login", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/email address/i), "test@test.com");
    await user.type(screen.getByLabelText(/^password/i), "pass123"); // Matches "Password" exactly
    await user.type(screen.getByLabelText(/confirm password/i), "pass123");

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("displays backend validation errors", async () => {
    // Mock the specific error shape expected by the component
    server.use(
      http.post("*api/register/", () => {
        return HttpResponse.json(
          {"username":["This username is already taken."]},
          { status: 400 },
        );
      }),
    );

    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), "existinguser");
    await user.type(screen.getByLabelText(/email address/i), "test@test.com");
    await user.type(screen.getByLabelText(/^password/i), "pass123");
    await user.type(screen.getByLabelText(/confirm password/i), "pass123");

    await user.click(screen.getByRole("button", { name: /register/i }));

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("This username is already taken.");
  });
});

```
