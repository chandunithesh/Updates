import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LandingPage from "./LandingPage";

test("submits the contact form to the contact API", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

  try {
    render(<LandingPage onLogin={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Enquiry Type *" }), {
      target: { value: "Request a demo" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Tell us about your field service needs, team size, and any specific requirements…",
      ),
      { target: { value: "Please contact me." } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /privacy policy/i }));
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://techtamminaapps.appiancloud.com/suite/webapi/contactForm",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Appian-API-Key": expect.any(String),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      }),
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({
      name: "Test User",
      email: "test@example.com",
      type: "Request a demo",
      message: "Please contact me.",
      consent: true,
      products: [],
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Message Sent Successfully!",
    );
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});
