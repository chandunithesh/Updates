import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Login } from "./Login";

test("customer registration sends the address to the registration API", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn().mockResolvedValue({ ok: true });

  try {
    render(<Login onLogin={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Customer sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));

    const values = {
      "First name": "Alex",
      "Last name": "Morgan",
      Gender: "Prefer not to say",
      "Contact number": "5551234567",
      Name: "Alex Morgan",
      Address: "12 Main Street, Springfield",
      "Work email": "alex@example.com",
      Password: "secret123",
      "Confirm password": "secret123",
    };

    Object.entries(values).forEach(([label, value]) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://techtamminaapps.appiancloud.com/suite/webapi/Registration",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"address":"12 Main Street, Springfield"'),
        }),
      );
    });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toHaveProperty(
      "Address",
      "12 Main Street, Springfield",
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Registration successful",
    );
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("operations registration does not display or send an address", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn().mockResolvedValue({ ok: true });

  try {
    render(<Login onLogin={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));

    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();

    const values = {
      "First name": "Alex",
      "Last name": "Morgan",
      Gender: "Prefer not to say",
      "Contact number": "5551234567",
      Name: "Alex Morgan",
      "Work email": "alex@example.com",
      Password: "secret123",
      "Confirm password": "secret123",
    };

    Object.entries(values).forEach(([label, value]) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://techtamminaapps.appiancloud.com/suite/webapi/Registration",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).not.toHaveProperty(
      "address",
    );
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});
