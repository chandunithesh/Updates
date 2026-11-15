import { fireEvent, render, screen } from "@testing-library/react";
import Home from "./Home";

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
          priority: "Normal",
          created: "2026-10-29",
        },
      ]}
      onNavigate={jest.fn()}
    />,
  );

  expect(screen.queryByText("Priority")).not.toBeInTheDocument();

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
