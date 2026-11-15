import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RaiseRequest from "./RaiseRequest";

test("customer product selection is linked to the created service request", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  localStorage.setItem("customerId", "11");
  const onSubmit = jest.fn();

  global.fetch = jest.fn((resource, options = {}) => {
    const url = new URL(resource);
    if (url.pathname.endsWith("/2BoXHg")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          response: [{ organizationId: 2, organizationName: "Voltas" }],
        }),
      });
    }
    if (url.pathname.endsWith("/customerProducts")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          response: [
            {
              custproduct_ID: 7,
              product: {
                productName: "Refrigerator",
                model: "Vol_116",
                warrantyEndDate: "2027-10-26",
              },
            },
          ],
        }),
      });
    }
    if (
      url.pathname.endsWith("/serviceTicket") &&
      options.method === "POST"
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          Success: true,
          response: { serviceRequestId: 20 },
        }),
      });
    }
    if (url.pathname.endsWith("/attachments") && options.method === "POST") {
      return Promise.resolve({ ok: true });
    }
    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    render(<RaiseRequest onNavigate={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Registered Phone Number/), {
      target: { value: "9123456789" },
    });
    fireEvent.blur(screen.getByLabelText(/Registered Phone Number/));
    await screen.findByRole("option", { name: "Voltas" });
    fireEvent.change(screen.getByLabelText(/Organization/), {
      target: { value: "2" },
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/Customer product/)).toHaveValue("7");
    });

    fireEvent.change(screen.getByLabelText(/Issue title/), {
      target: { value: "Refrigerator is not cooling" },
    });
    fireEvent.change(screen.getByLabelText(/Issue description/), {
      target: { value: "The refrigerator is not cooling." },
    });
    fireEvent.change(screen.getByLabelText("Street address"), {
      target: { value: "Hitech-city" },
    });
    fireEvent.change(screen.getByLabelText("Attachments"), {
      target: { files: [new File(["proof"], "proof.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create request" }));

    await screen.findByText("Request created successfully");
    expect(screen.getByText(`SR-${new Date().getFullYear()}-0020`)).toBeInTheDocument();
    expect(screen.queryByText("REQUEST SUBMITTED")).not.toBeInTheDocument();
    expect(screen.getByText("Issue category")).toBeInTheDocument();
    expect(screen.getByText("Issue details")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View my requests" }),
    ).toBeInTheDocument();
    const createRequestCall = global.fetch.mock.calls.find(
      ([resource, options]) =>
      new URL(resource).pathname.endsWith("/serviceTicket") &&
        options.method === "POST",
    );
    expect(JSON.parse(createRequestCall[1].body)).toEqual(
      expect.objectContaining({
        customerId: "11",
        organizationId: 2,
        customerProductId: 7,
        issueTitle: "Refrigerator is not cooling",
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ customerProductId: "7", requestId: 20 }),
    );
    const productLookupCall = global.fetch.mock.calls.find(
      ([resource]) => new URL(resource).pathname.endsWith("/customerProducts"),
    );
    expect(productLookupCall[1].method).toBe("POST");
    expect(JSON.parse(productLookupCall[1].body)).toEqual({ orgId: 2, phoneNumber: "9123456789" });

    const attachmentCall = global.fetch.mock.calls.find(
      ([resource]) => new URL(resource).pathname.endsWith("/attachments"),
    );
    const attachmentUrl = new URL(attachmentCall[0]);
    expect(attachmentUrl.searchParams.get("serviceReqId")).toBe("20");
    expect(attachmentCall[1].headers["appian-document-name"]).toBe("proof.png");
  } finally {
    localStorage.removeItem("customerId");
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("no customer products is treated as an empty result so manual entry remains available", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  localStorage.setItem("customerId", "11");

  global.fetch = jest.fn((resource, options = {}) => {
    const url = new URL(resource);
    if (url.pathname.endsWith("/2BoXHg")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          response: [{ organizationId: 2, organizationName: "Voltas" }],
        }),
      });
    }
    if (url.pathname.endsWith("/customerProducts")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ response: "No Customer Products" }),
      });
    }
    throw new Error(`Unexpected API request: ${url.toString()}`);
  });

  try {
    render(<RaiseRequest onNavigate={jest.fn()} onSubmit={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/Registered Phone Number/), {
      target: { value: "9123456789" },
    });
    fireEvent.blur(screen.getByLabelText(/Registered Phone Number/));
    await screen.findByRole("option", { name: "Voltas" });
    fireEvent.change(screen.getByLabelText(/Organization/), {
      target: { value: "2" },
    });

    expect(
      await screen.findByRole("option", {
        name: "No customer products — enter details manually",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "Refrigerator" },
    });
    expect(screen.getByLabelText("Product name")).toHaveValue("Refrigerator");
    const productLookupCall = global.fetch.mock.calls.find(
      ([resource]) => new URL(resource).pathname.endsWith("/customerProducts"),
    );
    expect(productLookupCall[1].method).toBe("POST");
    expect(JSON.parse(productLookupCall[1].body)).toEqual({ orgId: 2, phoneNumber: "9123456789" });
  } finally {
    localStorage.removeItem("customerId");
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});
