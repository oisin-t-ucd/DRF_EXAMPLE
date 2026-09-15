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
