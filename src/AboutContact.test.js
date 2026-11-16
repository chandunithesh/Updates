import { fireEvent, render, screen } from "@testing-library/react";
import AboutContact from "./AboutContact";

test("explains the service portal and provides support navigation", () => {
  const onNavigate = jest.fn();

  render(<AboutContact onNavigate={onNavigate} />);

  expect(
    screen.getByRole("heading", { name: /service support, made simpler/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /contact customer support/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(/a clear path from request to resolution/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /raise a service request/i }));
  expect(onNavigate).toHaveBeenLastCalledWith("raise");

  fireEvent.click(screen.getByRole("button", { name: /view my requests/i }));
  expect(onNavigate).toHaveBeenLastCalledWith("requests");
});

test("customers can submit feedback from About and Contact", () => {
  const key =
    "servicedesk-customer-feedback-submissions:customer@example.com";
  localStorage.removeItem(key);

  render(
    <AboutContact
      onNavigate={jest.fn()}
      user={{ name: "Customer", email: "customer@example.com" }}
    />,
  );

  fireEvent.change(screen.getByLabelText(/overall satisfaction/i), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText(/request number/i), {
    target: { value: "SR-205" },
  });
  fireEvent.change(screen.getByLabelText(/your feedback/i), {
    target: { value: "The technician was helpful." },
  });
  fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

  expect(JSON.parse(localStorage.getItem(key))).toEqual([
    expect.objectContaining({
      customerName: "Customer",
      customerEmail: "customer@example.com",
      requestNumber: "SR-205",
      rating: "5",
      comments: "The technician was helpful.",
    }),
  ]);
  expect(
    screen.getByText("Thank you. Your feedback has been saved in this browser."),
  ).toBeInTheDocument();
});
