import { fireEvent, render, screen } from "@testing-library/react";
import Header from "./Header";

test("opens the mobile navigation and closes it after selecting a page", () => {
  const onNavigate = jest.fn();
  render(
    <Header
      page="home"
      onNavigate={onNavigate}
      onLogout={jest.fn()}
      user={{ role: "Customer" }}
    />,
  );

  const menuToggle = screen.getByRole("button", { name: "Open navigation menu" });
  fireEvent.click(menuToggle);

  expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  fireEvent.click(screen.getByRole("button", { name: /My Requests/ }));

  expect(onNavigate).toHaveBeenCalledWith("requests");
  expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("shows the logged-in customer's name in the account header", () => {
  render(
    <Header
      page="home"
      onNavigate={jest.fn()}
      onLogout={jest.fn()}
      user={{ CustomerName: "Chandu Nithesh Gogineni", role: "Customer" }}
    />,
  );

  expect(screen.getByText("Chandu Nithesh Gogineni")).toBeInTheDocument();
  expect(screen.getByText("CN")).toBeInTheDocument();
});

test("uses the first and last name when no combined customer name is available", () => {
  render(
    <Header
      page="home"
      onNavigate={jest.fn()}
      onLogout={jest.fn()}
      user={{ FirstName: "Priya", LastName: "Sharma", role: "Customer" }}
    />,
  );

  expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  expect(screen.getByText("PS")).toBeInTheDocument();
});

test("loads the customer's name from their customer profile when login only has an ID", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      Success: true,
      response: { FirstName: "Priya", LastName: "Sharma" },
    }),
  });

  try {
    render(
      <Header
        page="home"
        onNavigate={jest.fn()}
        onLogout={jest.fn()}
        user={{ customerId: "customer-456", role: "Customer" }}
      />,
    );

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "?custId=customer-456",
      }),
      expect.objectContaining({
        headers: {
          "Appian-API-Key": "test-api-key",
          Accept: "application/json",
        },
      }),
    );
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("does not show a placeholder name while the customer profile is loading", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn(() => new Promise(() => {}));

  try {
    render(
      <Header
        page="home"
        onNavigate={jest.fn()}
        onLogout={jest.fn()}
        user={{ customerId: "customer-456", role: "Customer" }}
      />,
    );

    expect(screen.queryByText("Customer account")).not.toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});
