import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Profile from './Profile';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the API module
vi.mock('../../services/api');

// Mock URL.createObjectURL since it's not available in jsdom
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
    // Mock the successful PATCH response
    api.patch.mockResolvedValueOnce({ data: { bio: 'Updated bio', image: 'new.jpg' } });
    // Mock the window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithContext();
    const user = userEvent.setup();

    // Type a new bio
    const bioInput = screen.getByLabelText(/bio/i);
    await user.clear(bioInput);
    await user.type(bioInput, 'Updated bio');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /save profile/i });
    await user.click(submitBtn);

    // Verify API was called with FormData containing the bio
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
      expect(api.patch.mock.calls[0][0]).toBe('/api/profile/me/');
      expect(api.patch.mock.calls[0][1].get('bio')).toBe('Updated bio');
    });

    // Verify context was updated and alert was shown
    expect(mockSetUser).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('Profile updated successfully!');
    
    alertMock.mockRestore();
  });
});