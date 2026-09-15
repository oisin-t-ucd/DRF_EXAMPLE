import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import api, { setAccessToken } from '../../services/api.js';
import { AuthContext } from '../../contexts/AuthContext.jsx';

// Mock both the default api and the named export setAccessToken
vi.mock('../../services/api.js', () => ({
  default: { post: vi.fn() },
  setAccessToken: vi.fn()
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
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