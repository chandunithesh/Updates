import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import Feedback from "./Feedback";

const feedbackUrl =
  "https://techtamminaapps.appiancloud.com/suite/webapi/customerFeedback";
const requestsUrl =
  "https://techtamminaapps.appiancloud.com/suite/webapi/iOdIEw?customerId=203";

const requestsResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    Success: true,
    response: [
      {
        serviceRequestId: 13,
        requestNumber: "SR-13",
        organizationId: 1,
        issueTitle: "AC repair",
      },
    ],
  }),
};

function chooseRequestAndRatings() {
  fireEvent.change(screen.getByLabelText("Service request"), {
    target: { value: "13" },
  });
  fireEvent.click(
    within(
      screen.getByRole("radiogroup", { name: "Rate the technician" }),
    ).getByRole("radio", { name: /5 stars — excellent/i }),
  );
  fireEvent.click(
    within(
      screen.getByRole("radiogroup", { name: "Rate the service" }),
    ).getByRole("radio", { name: /4 stars — good/i }),
  );
}

function setUpApi(postResponse) {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  const originalCustomerId = localStorage.getItem("customerId");
  process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";
  localStorage.setItem("customerId", "203");
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(requestsResponse)
    .mockResolvedValueOnce(postResponse);

  return () => {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) {
      delete process.env.REACT_APP_APPIAN_API_KEY;
    } else {
      process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
    }
    if (originalCustomerId == null) {
      localStorage.removeItem("customerId");
    } else {
      localStorage.setItem("customerId", originalCustomerId);
    }
  };
}

test("maps feedback to database fields and sends it to the API", async () => {
  const restore = setUpApi({ ok: true, status: 200 });
  const key = "servicedesk-customer-feedback-submissions:customer@example.com";
  localStorage.removeItem(key);

  try {
    render(
      <Feedback
        onNavigate={jest.fn()}
        user={{
          name: "Customer",
          email: "customer@example.com",
          customerId: 203,
          organizationId: 99,
        }}
      />,
    );

    await screen.findByRole("option", { name: /SR-13 — AC repair/i });
    chooseRequestAndRatings();
    fireEvent.change(screen.getByLabelText(/comments/i), {
      target: { value: "Technician was professional." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit rating/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(String(global.fetch.mock.calls[0][0])).toBe(requestsUrl);
    expect(global.fetch.mock.calls[1][0]).toBe(feedbackUrl);
    expect(global.fetch.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: {
        "Appian-API-Key": "test-api-key",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      organizationId: 1,
      customerId: 203,
      technicianRating: 5,
      comments: "Technician was professional.",
      verificationStatus: "VERIFIED",
      submittedOn: expect.any(String),
      serviceRating: 4,
      serviceRequestId: 13,
    });
    expect(JSON.parse(localStorage.getItem(key))).toEqual([
      expect.objectContaining({
        organizationId: 1,
        customerId: 203,
        technicianRating: 5,
        serviceRating: 4,
        serviceRequestId: 13,
      }),
    ]);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your feedback was sent successfully.",
    );
  } finally {
    restore();
  }
});

test("shows an API error when feedback submission fails", async () => {
  const restore = setUpApi({ ok: false, status: 500 });

  try {
    render(
      <Feedback
        onNavigate={jest.fn()}
        user={{ email: "customer@example.com", customerId: 203 }}
      />,
    );
    await screen.findByRole("option", { name: /SR-13 — AC repair/i });
    chooseRequestAndRatings();
    fireEvent.click(screen.getByRole("button", { name: /submit rating/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Feedback submission failed (500).",
    );
  } finally {
    restore();
  }
});

test("feedback cannot be submitted without both ratings", async () => {
  const restore = setUpApi({ ok: true, status: 200 });

  try {
    render(
      <Feedback
        onNavigate={jest.fn()}
        user={{ email: "customer@example.com", customerId: 203 }}
      />,
    );
    await screen.findByRole("option", { name: /SR-13 — AC repair/i });

    fireEvent.click(screen.getByRole("button", { name: /submit rating/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a rating for both the technician and the service.",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    restore();
  }
});
