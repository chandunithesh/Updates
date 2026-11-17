import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OrgDashboard from "./OrgDashboard";

test("shows the logged-in user's first and last name", () => {
  render(
    <OrgDashboard
      user={{
        firstName: "Saisree",
        lastName: "Harsha",
        email: "saisree@example.com",
        role: "Organization Admin",
      }}
      onLogout={jest.fn()}
    />,
  );

  expect(screen.getByText("Saisree Harsha")).toBeInTheDocument();
  expect(screen.getByText("SH")).toBeInTheDocument();
  expect(screen.queryByText("Operations Admin")).not.toBeInTheDocument();
});

test("does not show the email domain when no name is available", () => {
  render(
    <OrgDashboard
      user={{
        email: "techtammina.admin@gmail.com",
        role: "Organization Admin",
      }}
      onLogout={jest.fn()}
    />,
  );

  expect(screen.getByText("Techtammina Admin")).toBeInTheDocument();
  expect(
    screen.queryByText("techtammina.admin@gmail.com"),
  ).not.toBeInTheDocument();
});

test("shows sign out in the user-name dropdown", () => {
  const onLogout = jest.fn();
  render(
    <OrgDashboard
      user={{ name: "Jordan Lee", role: "Organization Admin" }}
      onLogout={onLogout}
    />,
  );

  expect(
    screen.queryByRole("menuitem", { name: "Sign out" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Jordan Lee/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});

test("shows the ticket performance reference metrics on the overview", () => {
  render(
    <OrgDashboard
      user={{ name: "Jordan Lee", role: "Organization Admin" }}
      onLogout={jest.fn()}
    />,
  );

  const ticketPerformance = screen.getByRole("region", {
    name: "Ticket performance",
  });
  expect(ticketPerformance).toHaveTextContent("Reference snapshot");
  expect(ticketPerformance).toHaveTextContent("41.5%");
  expect(ticketPerformance).toHaveTextContent("Positive");
  expect(ticketPerformance).toHaveTextContent("124");
  expect(ticketPerformance).toHaveTextContent("Negative");
  expect(ticketPerformance).toHaveTextContent("80");
  expect(ticketPerformance).toHaveTextContent("Neutral");
  expect(ticketPerformance).toHaveTextContent("94");
  expect(ticketPerformance).toHaveTextContent("6.586 hours");
  expect(ticketPerformance).toHaveTextContent("6.603 hours");
  expect(ticketPerformance).toHaveTextContent("6.690 hours");
  expect(ticketPerformance).toHaveTextContent("Group");
  expect(ticketPerformance).toHaveTextContent("273");
  expect(
    screen.getByRole("img", { name: "Closed: 93 tickets" }),
  ).toBeInTheDocument();
});

test("keeps added users in memory without saving them locally", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify([]),
  });

  const props = {
    user: {
      name: "Jordan Lee",
      email: "orgadmin@servicebridge.demo",
      role: "Organization Admin",
      organizationId: 2,
    },
    onLogout: jest.fn(),
  };

  try {
    const view = render(<OrgDashboard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /add new user/i }));
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Sam" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Taylor" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sam.taylor@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "Technician" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/AddUser"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(screen.getByText("3", { exact: true })).toBeInTheDocument();
    expect(localStorage.getItem("org-dashboard:2:users")).toBeNull();
    view.unmount();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("does not restore organization API records from local storage", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  const products = Array.from({ length: 18 }, (_, index) => ({
    productCode: `P-${index + 1}`,
    productName: `Product ${index + 1}`,
    brand: "ServiceBridge",
    category: "Appliance",
  }));
  const warehouses = [{ warehouseName: "Central Warehouse", address: "Main Road" }];
  const productStorageKey = "org-dashboard:19:products";
  const warehouseStorageKey = "org-dashboard:19:warehouses";
  const previousProducts = localStorage.getItem(productStorageKey);
  const previousWarehouses = localStorage.getItem(warehouseStorageKey);
  localStorage.setItem(productStorageKey, JSON.stringify(products));
  localStorage.setItem(warehouseStorageKey, JSON.stringify(warehouses));
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      text: async () => JSON.stringify([]),
    }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", role: "Organization Admin", organizationId: 19 }}
        onLogout={jest.fn()}
      />,
    );

    expect(
      global.fetch.mock.calls.some(([url]) =>
        /\/(Products|warehouse)(\?|$)/.test(String(url)),
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Products" }));
    expect(screen.queryByText("P-1")).not.toBeInTheDocument();
    expect(screen.queryByText("Product 18")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Warehouse" }));
    expect(screen.queryByText("Central Warehouse")).not.toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    if (previousProducts === null) localStorage.removeItem(productStorageKey);
    else localStorage.setItem(productStorageKey, previousProducts);
    if (previousWarehouses === null) localStorage.removeItem(warehouseStorageKey);
    else localStorage.setItem(warehouseStorageKey, previousWarehouses);
  }
});

test("shows API service names when records use serviceName", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      text: async () =>
        JSON.stringify(
          String(url).includes("R3YL3A")
            ? [
                {
                  serviceCode: "REP",
                  serviceName: "Repair",
                  defaultDurationMinutes: 240,
                  defaultServiceCharge: 2850,
                },
              ]
            : [],
        ),
    }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", role: "Organization Admin", organizationId: 29 }}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(await screen.findByText("Repair")).toBeInTheDocument();
    expect(screen.getByText("REP")).toBeInTheDocument();
    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText("2850")).toBeInTheDocument();
    const serviceLookup = global.fetch.mock.calls.find(([url]) =>
      new URL(url).pathname.endsWith("/R3YL3A"),
    );
    expect(new URL(serviceLookup[0]).searchParams.get("orgId")).toBe("29");
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("loads products for the logged-in user's organization", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      text: async () =>
        JSON.stringify(
          String(url).includes("getProducts")
            ? [{ productCode: "P-19", productName: "Organization Product" }]
            : [],
        ),
    }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", role: "Organization Admin", organizationId: 19 }}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Products" }));
    expect(await screen.findByText("Organization Product")).toBeInTheDocument();
    const productRow = screen.getByText(/Organization Product/, {
      selector: ".org-table__row",
    });
    const productHeader = screen.getByText(/Product Code/, {
      selector: ".org-table__row",
    });
    expect(productRow).toHaveStyle({
      gridTemplateColumns: "1.2fr 1.5fr 1fr 1fr 1fr",
    });
    expect(productHeader).toHaveStyle({
      gridTemplateColumns: productRow.style.gridTemplateColumns,
    });
    expect(screen.queryByText("Action")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Products item" }),
    ).not.toBeInTheDocument();
    const productLookup = global.fetch.mock.calls.find(([url]) =>
      new URL(url).pathname.endsWith("/getProducts"),
    );
    expect(new URL(productLookup[0]).searchParams.get("orgId")).toBe("19");
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("submits new products to the add-product API", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, text: async () => "{}" }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", role: "Organization Admin", organizationId: 19 }}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Products" }));
    fireEvent.click(screen.getByRole("button", { name: "Add product" }));
    fireEvent.change(screen.getByLabelText("Product code"), {
      target: { value: "P-20" },
    });
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "New product" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Appliance" },
    });
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "ServiceBridge" },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "SB-1" },
    });
    fireEvent.change(screen.getByLabelText("Warranty (months)"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://techtamminaapps.appiancloud.com/suite/webapi/AddProduct",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(JSON.parse(global.fetch.mock.calls.at(-1)[1].body).organizationId).toBe(19);
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("does not restore a locally saved service when the API returns its list", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  const storageKey = "org-dashboard:31:services";
  const previousServices = localStorage.getItem(storageKey);
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  localStorage.setItem(
    storageKey,
    JSON.stringify([
      {
        serviceCode: "LOCAL-ONLY",
        serviceName: "Browser-only service",
      },
    ]),
  );
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      text: async () =>
        JSON.stringify([
          {
            id: 102,
            serviceCode: "ES-102",
            serviceName: "Wireing Issue",
            defaultDurationMinutes: 450,
            defaultServiceCharge: 500,
          },
        ]),
    }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", role: "Organization Admin", organizationId: 31 }}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    await waitFor(() => {
      expect(screen.getAllByText("ES-102")).toHaveLength(1);
    });
    expect(screen.getAllByText("Wireing Issue")).toHaveLength(1);
    expect(screen.queryByText("LOCAL-ONLY")).not.toBeInTheDocument();
    expect(screen.queryByText("Browser-only service")).not.toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    if (previousServices === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, previousServices);
  }
});

test("does not restore locally saved warehouse records", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  const storageKey = "org-dashboard:41:warehouses";
  const previousWarehouses = localStorage.getItem(storageKey);
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  localStorage.setItem(
    storageKey,
    JSON.stringify([
      {
        Branch: "Memphis",
        warehouseManager: "Jordan Lee",
        warehouseName: "Central Warehouse",
        capacity: "5000",
        AvailableSpace: "1200",
        address: "Main Road",
      },
    ]),
  );
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, text: async () => "[]" }),
  );

  try {
    render(
      <OrgDashboard
        user={{ name: "Jordan Lee", organizationId: 41 }}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Warehouse" }));
    expect(screen.queryByText("Memphis")).not.toBeInTheDocument();
    expect(screen.queryByText("Central Warehouse")).not.toBeInTheDocument();
    expect(screen.queryByText("5000")).not.toBeInTheDocument();
    expect(screen.queryByText("1200")).not.toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined)
      delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    if (previousWarehouses === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, previousWarehouses);
  }
});
