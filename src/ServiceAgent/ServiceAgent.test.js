import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ServiceAgent from "./ServiceAgent";

const jsonResponse = (value) => ({
  ok: true,
  json: async () => value,
  text: async () => JSON.stringify(value),
});

test("service agent header displays the signed-in user's name", () => {
  render(
    <ServiceAgent
      user={{
        FirstName: "Priya",
        LastName: "Sharma",
        email: "techtammina.agent@gmail.com",
      }}
    />,
  );

  expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  expect(screen.getByLabelText("Signed in as Priya Sharma")).toBeInTheDocument();
});

test("service agent header falls back to the email username when no name is available", () => {
  render(
    <ServiceAgent user={{ email: "techtammina.agent@gmail.com" }} />,
  );

  expect(screen.getByText("Techtammina Agent")).toBeInTheDocument();
});

test("refreshing the request list does not create service requests", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn(() =>
    Promise.resolve(
      jsonResponse([
        {
          ServiceRequestID: 10,
          status: "NEW",
          issueTitle: "Request ten",
          requestRaisedOn: "2026-11-03",
        },
        {
          ServiceRequestID: 11,
          status: "NEW",
          issueTitle: "Request eleven",
          requestRaisedOn: "2026-11-03",
        },
      ]),
    ),
  );

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    expect(await screen.findByText("10")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.queryByText("Warranty Status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Refresh"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    expect(
      global.fetch.mock.calls.every(([, options]) => options?.method !== "POST"),
    ).toBe(true);
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});

test("service agent reads customer and date fields across API casing and wrappers", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  const customerIdRequests = [];
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn((resource) => {
    const url = new URL(resource);

    if (url.pathname.endsWith("/ServiceRequests")) {
      return Promise.resolve(
        jsonResponse([
          {
            ServiceRequestID: 22,
            Customer_ID: 42,
            Status: "NEW",
            IssueTitle: "Inspect API field mapping",
            IssueCategory: "HVAC",
            productName: "AC issue",
          },
        ]),
      );
    }
    if (url.pathname.endsWith("/customerDetailsbyCustId")) {
      customerIdRequests.push(url.searchParams.get("custId"));
      return Promise.resolve(
        jsonResponse({
          SUCCESS: true,
          RESPONSE: {
            CUSTOMER_DETAILS: { FIRST_NAME: "Mira", LAST_NAME: "Rao" },
          },
        }),
      );
    }
    if (url.pathname.endsWith("/serviceRequest")) {
      return Promise.resolve(
        jsonResponse({
          SUCCESS: true,
          RESPONSE: { SERVICE_REQUEST: { DATE_CREATED: "2026-10-28" } },
        }),
      );
    }

    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    await waitFor(() => {
      expect(customerIdRequests).toContain("42");
    });
    expect(await screen.findByText("Mira Rao")).toBeInTheDocument();
    expect(await screen.findByText("28 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Product Name")).toBeInTheDocument();
    expect(await screen.findByText("AC issue")).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});

test("service agent displays tickets from the API after creation", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  let storedRequest = {
    id: 123,
    organizationId: 2,
    customerId: 11,
    requestNumber: "",
    status: "UNDER REVIEW",
    issueTitle: "Repair air conditioner",
    issueCategory: "HVAC",
  };
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn((resource) => {
    const url = new URL(resource);

    if (url.pathname.endsWith("/ServiceRequests")) {
      return Promise.resolve(jsonResponse([storedRequest]));
    }
    if (url.pathname.endsWith("/R3YL3A")) {
      return Promise.resolve(jsonResponse([{ id: 5, serviceName: "Repair" }]));
    }
    if (url.pathname.endsWith("/customerDetailsbyCustId")) {
      return Promise.resolve(
        jsonResponse({ firstName: "Priya", lastName: "Sharma" }),
      );
    }
    if (url.pathname.endsWith("/serviceRequest")) {
      return Promise.resolve(
        jsonResponse({
          SERVICE_REQUEST: {
            REQUEST_RAISED_ON: "2026-03-16",
            CUSTOMER_PRODUCT_ID: 7,
          },
        }),
      );
    }
    if (url.pathname.endsWith("/subServicebyServiceId")) {
      return Promise.resolve(
        jsonResponse([{ id: 10, subServiceName: "Cooling" }]),
      );
    }
    if (url.pathname.endsWith("/createservicereq2")) {
      storedRequest = {
        ...storedRequest,
        serviceTicketId: 78,
        status: "TICKET CREATED",
      };
      return Promise.resolve(
        jsonResponse({ Success: true, response: { serviceTicketId: 78 } }),
      );
    }

    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    const view = render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(await screen.findByText("16 Mar 2026")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(
      global.fetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(0);

    fireEvent.click(
      await screen.findByRole("button", { name: /review & create/i }),
    );
    expect(screen.queryByText("Warranty Status")).not.toBeInTheDocument();
    await screen.findByRole("option", { name: "Repair" });
    const ticketFields = screen.getAllByRole("combobox");
    fireEvent.change(ticketFields[1], {
      target: { value: "5" },
    });
    await screen.findByRole("option", { name: "Cooling" });
    fireEvent.change(ticketFields[2], {
      target: { value: "10" },
    });
    fireEvent.change(ticketFields[3], {
      target: { value: "High" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create ticket/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://techtamminaapps.appiancloud.com/suite/webapi/createservicereq2",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            organizationId: 2,
            customerProductId: 7,
            serviceRequestId: 123,
            serviceId: 5,
            subServiceId: 10,
            priority: "High",
            createdBy: "agent@example.com",
          }),
        }),
      );
    });
    expect(
      await screen.findByText(/sent to available technicians/i),
    ).toBeInTheDocument();
    expect(await screen.findByText("78")).toBeInTheDocument();
    expect(localStorage.getItem("servicedesk-service-agent-tickets:2")).toBeNull();
    expect(
      global.fetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /service tickets/i }));
    expect(await screen.findByText("78")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Refresh"));
    await waitFor(() => {
      expect(
        global.fetch.mock.calls.filter(([resource]) =>
          new URL(resource).pathname.endsWith("/ServiceRequests"),
        ),
      ).toHaveLength(3);
    });
    expect(await screen.findByText("78")).toBeInTheDocument();

    view.unmount();
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );
    expect(await screen.findByText("78")).toBeInTheDocument();
    expect(localStorage.getItem("servicedesk-service-agent-tickets:2")).toBeNull();
    expect(
      global.fetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});

test("service tickets remain visible when the API reports an assigned status", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn(() =>
    Promise.resolve(
      jsonResponse([
        {
          ServiceRequestID: 45,
          TicketID: 88,
          Status: "ASSIGNED",
          CustomerName: "Asha Rao",
          IssueTitle: "Repair pump",
          serviceTicket: { user: { email: "technician@example.com" } },
        },
      ]),
    ),
  );

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /service tickets/i }));
    expect(await screen.findByText("88")).toBeInTheDocument();
    expect(await screen.findByText("technician@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("ASSIGNED")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Filter status"), {
      target: { value: "ASSIGNED" },
    });
    expect(screen.getByText("88")).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});

test("newly created ticket stays visible when the request API is stale", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn((resource) => {
    const url = new URL(resource);

    if (url.pathname.endsWith("/ServiceRequests")) {
      return Promise.resolve(
        jsonResponse([{
          serviceRequestId: 321,
          custproduct_ID: 7,
          organizationId: 2,
          customerName: "Asha Rao",
          status: "UNDER REVIEW",
          issueTitle: "Repair pump",
        }]),
      );
    }
    if (url.pathname.endsWith("/R3YL3A")) {
      return Promise.resolve(jsonResponse([{ id: 5, serviceName: "Repair" }]));
    }
    if (url.pathname.endsWith("/subServicebyServiceId")) {
      return Promise.resolve(jsonResponse([{ id: 10, subServiceName: "Cooling" }]));
    }
    if (url.pathname.endsWith("/serviceTicket")) {
      return Promise.resolve(
        jsonResponse({ success: true, response: { serviceTicketId: 88 } }),
      );
    }

    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /review & create/i }));
    await screen.findByRole("option", { name: "Repair" });
    const fields = screen.getAllByRole("combobox");
    fireEvent.change(fields[1], { target: { value: "5" } });
    await screen.findByRole("option", { name: "Cooling" });
    fireEvent.change(fields[2], { target: { value: "10" } });
    fireEvent.change(fields[3], { target: { value: "High" } });
    fireEvent.click(screen.getByRole("button", { name: /create ticket/i }));

    expect(await screen.findByText("88")).toBeInTheDocument();
    expect(screen.getByText("Repair")).toBeInTheDocument();
    expect(screen.getByText("Cooling")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Refresh"));
    expect(await screen.findByText("88")).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});

test("ticket modal displays images for service request document IDs", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  URL.createObjectURL = jest.fn((blob) => `blob:${blob.type}`);
  URL.revokeObjectURL = jest.fn();
  global.fetch = jest.fn((resource) => {
    const url = new URL(resource);

    if (url.pathname.endsWith("/ServiceRequests")) {
      return Promise.resolve(jsonResponse([{
        serviceRequestId: 321,
        organizationId: 2,
        customerName: "Asha Rao",
        status: "NEW",
        issueTitle: "Repair pump",
        requestRaisedOn: "2026-11-03",
      }]));
    }
    if (url.pathname.endsWith("/R3YL3A")) {
      return Promise.resolve(jsonResponse([]));
    }
    if (url.pathname.endsWith("/getDocs")) {
      return Promise.resolve(jsonResponse([505117, 505118]));
    }
    if (url.pathname.endsWith("/documentDownload/505117") ||
        url.pathname.endsWith("/documentDownload/505118")) {
      return Promise.resolve({
        ok: true,
        blob: async () => new Blob([
          new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ]),
        headers: { get: () => "application/octet-stream" },
      });
    }

    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /review & create/i }));
    expect(await screen.findByText("Request Images")).toBeInTheDocument();
    expect(await screen.findAllByRole("img", { name: "Service request attachment" })).toHaveLength(2);
    expect(
      global.fetch.mock.calls
        .map(([resource]) => new URL(resource))
        .filter((url) => url.pathname.endsWith("/getDocs"))
        .map((url) => url.searchParams.get("serviceReqId")),
    ).toContain("321");
    expect(global.fetch.mock.calls.map(([resource]) => new URL(resource).pathname)).toContain(
      "/suite/webapi/documentDownload/505117",
    );
    expect(global.fetch.mock.calls.map(([resource]) => new URL(resource).pathname)).toContain(
      "/suite/webapi/documentDownload/505118",
    );
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    else delete URL.createObjectURL;
    if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
    else delete URL.revokeObjectURL;
    localStorage.clear();
  }
});

test("total service requests excludes ticket-created entries from the count", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  localStorage.clear();
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  global.fetch = jest.fn(() =>
    Promise.resolve(
      jsonResponse([
        {
          ServiceRequestID: 1,
          status: "NEW",
          issueTitle: "Open request one",
          requestRaisedOn: "2026-11-03",
        },
        {
          ServiceRequestID: 2,
          status: "NEW",
          issueTitle: "Open request two",
          requestRaisedOn: "2026-11-03",
        },
        {
          ServiceRequestID: 3,
          status: "TICKET CREATED",
          ticketId: 900,
          issueTitle: "Already converted to ticket",
          requestRaisedOn: "2026-11-03",
        },
      ]),
    ),
  );

  try {
    render(
      <ServiceAgent
        user={{ email: "agent@example.com", organizationId: 2 }}
      />,
    );

    expect(screen.getByText("Total Service Requests")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /service requests 2/i }),
    ).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    localStorage.clear();
  }
});
