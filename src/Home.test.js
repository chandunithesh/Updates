import { fireEvent, render, screen } from "@testing-library/react";
import Home from "./Home";

test("all service action cards use the primary button style", () => {
  render(<Home user={{ isDemo: true }} onNavigate={jest.fn()} />);

  ["New Service Request", "View My Requests", "Get in Touch"].forEach((label) => {
    expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveClass(
      "sd-btn",
      "sd-btn--primary",
    );
  });
});

test("all service action cards use the blue icon style", () => {
  render(<Home user={{ isDemo: true }} onNavigate={jest.fn()} />);

  ["Raise a Service Request", "My Service Requests", "About & Contact"].forEach(
    (title) => {
      const card = screen.getByRole("heading", { name: title }).closest("article");
      expect(card.querySelector(".sd-action__icon")).toHaveClass("is-primary");
    },
  );
});

test("home shows the service response-time expectation", () => {
  render(<Home user={{ isDemo: true }} onNavigate={jest.fn()} />);

  expect(screen.getByText("SLA: 3 days")).toBeInTheDocument();
  expect(
    screen.getByText("A technician may arrive within 1–3 days."),
  ).toBeInTheDocument();
});

test("recent request links toggle the request details", async () => {
  render(
    <Home
      user={{ isDemo: true }}
      submittedRequests={[
        {
          id: "SR-205",
          title: "Repair the air conditioner",
          description: "The unit is not cooling.",
          status: "Under Review",
          category: "Repair",
          location: "12 Main Street, Test City",
          created: "2026-10-29",
        },
      ]}
      onNavigate={jest.fn()}
    />,
  );

  expect(screen.getByText("Category")).toBeInTheDocument();
  expect(screen.getByText("Location")).toBeInTheDocument();
  const locationCell = screen.getByText("12 Main Street").closest(".sd-home-location");
  expect(locationCell.querySelector("br")).toBeInTheDocument();
  expect(locationCell).toHaveTextContent("12 Main StreetTest City");
  expect(screen.getByText("Repair")).toBeInTheDocument();

  const requestId = await screen.findByRole("button", {
    name: "Show details for request SR-205",
  });
  fireEvent.click(requestId);

  expect(screen.getByText("The unit is not cooling.")).toBeInTheDocument();
  expect(requestId).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(
    screen.getByRole("button", {
      name: "Hide details for Repair the air conditioner",
    }),
  );
  expect(screen.queryByText("The unit is not cooling.")).not.toBeInTheDocument();
});

test("resolved requests are included in the completed dashboard count", async () => {
  render(
    <Home
      user={{ isDemo: true }}
      submittedRequests={[
        {
          id: "SR-206",
          title: "Resolved equipment issue",
          status: " Resolved ",
          created: "2026-10-30",
        },
        {
          id: "SR-207",
          title: "Open equipment issue",
          status: "Under Review",
          created: "2026-10-31",
        },
      ]}
      onNavigate={jest.fn()}
    />,
  );

  const completedStat = (await screen.findByText("Completed")).closest(
    ".sd-stat",
  );
  expect(completedStat.querySelector(".sd-stat__value")).toHaveTextContent(
    "01",
  );
});
