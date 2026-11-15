const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
process.env.REACT_APP_APPIAN_API_KEY = "test-api-key";

const React = require("react");
const { fireEvent, render, screen, within } = require("@testing-library/react");
const MyJob = require("./MyJob").default;

afterAll(() => {
  if (originalApiKey === undefined) {
    delete process.env.REACT_APP_APPIAN_API_KEY;
  } else {
    process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test("renders work-order fields from the jobs API and shows them in job details", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      {
        serviceTicketId: 51,
        ticketNumber: "WO-1024",
        status: "ASSIGNED",
        priority: "HIGH",
        customer: { firstName: "Maya", lastName: "Chen" },
        serviceRequest: {
          issueTitle: "Compressor is not cooling",
          address: "12 Main Street",
        },
        distanceKm: 8,
        scheduledStartDate: "2026-11-03T09:00:00",
        scheduledEndDate: "2026-11-03T11:00:00",
      },
    ],
  });

  try {
    render(<MyJob user={{ email: "tech@example.com" }} />);

    expect(await screen.findByText("Compressor is not cooling")).toBeInTheDocument();
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2026-11-03T09:00:00")).toBeInTheDocument();
    expect(screen.getByText("2026-11-03T11:00:00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View job WO-1024" }));

    expect(screen.getByText("12 Main Street")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("displays urgent, high, normal, and low priorities for their jobs", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () =>
      ["URGENT", "HIGH", "NORMAL", "LOW"].map((priority, index) => ({
        serviceTicketId: 60 + index,
        ticketNumber: `WO-${60 + index}`,
        status: "ASSIGNED",
        priority,
      })),
  });

  try {
    render(<MyJob user={{ email: "tech@example.com" }} />);

    await screen.findByText("URGENT");
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("URGENT")).toBeInTheDocument();
    expect(within(rows[2]).getByText("HIGH")).toBeInTheDocument();
    expect(within(rows[3]).getByText("NORMAL")).toBeInTheDocument();
    expect(within(rows[4]).getByText("LOW")).toBeInTheDocument();
  } finally {
    global.fetch = originalFetch;
  }
});

test("requests end-task OTP generation from the server for the selected ticket", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          serviceTicketId: 52,
          ticketNumber: "WO-1025",
          status: "IN PROGRESS",
          repair: { repairStatus: "Completed" },
        },
      ],
    })
    .mockResolvedValueOnce({ ok: true, text: async () => "{\"success\":true}" });

  try {
    render(<MyJob user={{ email: "tech@example.com" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "View job WO-1025" }));
    fireEvent.click(screen.getByRole("button", { name: "End task" }));

    expect(
      await screen.findByText("Completion verification requested. Enter the code provided to the customer."),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://techtamminaapps.appiancloud.com/suite/webapi/endtaskOTP",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ serviceTicketId: 52 }),
      }),
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("shows repair details after start OTP and requires saving them before ending the task", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { serviceTicketId: 54, ticketNumber: "WO-1027", status: "ASSIGNED" },
      ],
    })
    .mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    });

  try {
    render(<MyJob user={{ email: "tech@example.com" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "View job WO-1027" }));
    fireEvent.click(screen.getByRole("button", { name: "Start task" }));
    fireEvent.change(await screen.findByLabelText("Start-task verification code"), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));

    expect(await screen.findByRole("heading", { name: "Repair details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End task" })).not.toBeInTheDocument();

    const requiredRepairFields = [
      "Root cause *",
      "Repair outcome *",
      "Inspection notes *",
      "Diagnosis notes *",
      "Outcome reason *",
      "Testing result *",
      "Work performed *",
      "Testing notes *",
    ];
    requiredRepairFields.forEach((label) => {
      const field = screen.getByLabelText(label);
      const value =
        label === "Repair outcome *" || label === "Testing result *"
          ? field.options[1].value || field.options[1].text
          : "Completed and tested";
      fireEvent.change(field, {
        target: { value },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Save repair details" }));

    expect(
      await screen.findByText("Repair details saved. You can now end the task."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "End task" }));
    expect(
      await screen.findByText("Completion verification requested. Enter the code provided to the customer."),
    ).toBeInTheDocument();

    const calls = global.fetch.mock.calls;
    expect(calls[3][0]).toBe("https://techtamminaapps.appiancloud.com/suite/webapi/TgktCg");
    expect(calls[4][0]).toBe("https://techtamminaapps.appiancloud.com/suite/webapi/repair");
    expect(calls[4][1]).toEqual(expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
    }));
    const repairPayload = JSON.parse(calls[4][1].body);
    expect(repairPayload).toEqual(expect.objectContaining({
      serviceTicketId: 54,
      rootCause: "Completed and tested",
      inspectionNotes: "Completed and tested",
      diagnosisNotes: "Completed and tested",
      repairOutcome: "Repair Completed",
      outcomeReason: "Completed and tested",
      workPerformed: "Completed and tested",
      testingResult: "Passed",
      testingNotes: "Completed and tested",
    }));
    expect(calls[5][0]).toBe("https://techtamminaapps.appiancloud.com/suite/webapi/endtaskOTP");
    expect(calls[5][1].body).toBe(JSON.stringify({ serviceTicketId: 54 }));
  } finally {
    global.fetch = originalFetch;
  }
});

test("displays each image returned as a document ID", async () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:repair-photo");
  URL.revokeObjectURL = jest.fn();
  let unmount;
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          serviceTicketId: 53,
          ticketNumber: "WO-1026",
          ticketId: 27,
          serviceRequestId: 14,
          status: "ASSIGNED",
          serviceRequest: {
            serviceRequestId: 14,
            address: "Chanda Naik Thanda",
            issueTitle: "Vaccum Cleaner Issue",
            issueDescription: "Vaccum Cleaner is not Working Properly",
          },
        },
      ],
    })
    .mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          response: {
            documents: [505117, 505118, 505119],
          },
        }),
    })
    .mockResolvedValue({
      ok: true,
      blob: async () =>
        new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]),
      headers: { get: () => "application/octet-stream" },
    });

  try {
    const rendered = render(<MyJob user={{ email: "tech@example.com" }} />);
    unmount = rendered.unmount;
    fireEvent.click(await screen.findByRole("button", { name: "View job WO-1026" }));

    expect(await screen.findAllByRole("img", { name: "Attachment" })).toHaveLength(3);
    expect(screen.queryByText(/Document \d+/)).not.toBeInTheDocument();

    const documentsUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(documentsUrl.pathname).toBe("/suite/webapi/getDocs");
    expect(documentsUrl.searchParams.get("serviceReqId")).toBe("14");

    const downloadUrls = global.fetch.mock.calls.slice(2).map(([url]) => new URL(url));
    expect(downloadUrls.map((url) => url.pathname)).toEqual([
      "/suite/webapi/documentDownload/505117",
      "/suite/webapi/documentDownload/505118",
      "/suite/webapi/documentDownload/505119",
    ]);
    expect(
      downloadUrls.every((url) => url.searchParams.get("attachment") === "true"),
    ).toBe(true);
  } finally {
    if (unmount) unmount();
    global.fetch = originalFetch;
    if (originalCreateObjectURL) {
      URL.createObjectURL = originalCreateObjectURL;
    } else {
      delete URL.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      URL.revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete URL.revokeObjectURL;
    }
  }
});
