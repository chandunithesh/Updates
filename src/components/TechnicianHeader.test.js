const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";

const React = require("react");
const { fireEvent, render, screen } = require("@testing-library/react");
const TechnicianPortal = require("../technician/TechnicianPortal").default;

afterAll(() => {
  if (originalApiKey === undefined) {
    delete process.env.REACT_APP_APPIAN_API_KEY;
  } else {
    process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("shows the assigned jobs table after clocking in successfully", async () => {
  const originalFetch = global.fetch;
  const availabilityKey = "servicedesk-technician-availability:tech@example.com";
  const screenKey = "servicedesk-technician-screen:tech@example.com";
  localStorage.removeItem(availabilityKey);
  localStorage.removeItem(screenKey);
  global.fetch = jest.fn((url) => {
    if (String(url).includes("updatingAvailability")) {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({
      ok: true,
      json: async () => [
        {
          serviceTicketId: 51,
          ticketNumber: "WO-1024",
          status: "ASSIGNED",
          priority: "HIGH",
          serviceRequest: { issueTitle: "Compressor is not cooling" },
        },
      ],
    });
  });

  try {
    render(<TechnicianPortal user={{ email: "tech@example.com" }} />);

    expect(screen.getByRole("heading", { name: "Feild Flow" })).toBeInTheDocument();
    expect(screen.getByText("FSM")).toBeInTheDocument();
    expect(screen.getByText("tech")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clock in" }));

    expect(await screen.findByText("Compressor is not cooling")).toBeInTheDocument();
    expect(localStorage.getItem(availabilityKey)).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Work Order Number" })).toBeInTheDocument();
    expect(screen.getByText("WO-1024")).toBeInTheDocument();
  } finally {
    global.fetch = originalFetch;
    localStorage.removeItem(availabilityKey);
    localStorage.removeItem(screenKey);
  }
});