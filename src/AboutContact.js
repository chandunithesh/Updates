import { useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import "./AboutContact.css";
const FEEDBACK_KEY_PREFIX = "servicedesk-customer-feedback-submissions:";

const STEPS = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Tell us what you need",
    text: "Describe the issue, share its location and choose a priority when you raise a request.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Follow your request",
    text: "See your service history and check the latest status whenever you need an update.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Stay informed",
    text: "We keep your request details together so the service team can review what needs attention.",
  },
];

export default function AboutContact({ onNavigate, user }) {
  const [rating, setRating] = useState("");
  const [requestNumber, setRequestNumber] = useState("");
  const [comments, setComments] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");

  const submitFeedback = (event) => {
    event.preventDefault();
    setFeedbackError("");
    setFeedbackNotice("");

    if (!comments.trim()) {
      setFeedbackError("Enter your feedback before submitting.");
      return;
    }

    try {
      const email = String(
        user?.email || localStorage.getItem("email") || "customer",
      )
        .trim()
        .toLowerCase();
      const key = `${FEEDBACK_KEY_PREFIX}${email}`;
      const feedback = {
        customerName: user?.name || "",
        customerEmail: email === "customer" ? "" : email,
        requestNumber: requestNumber.trim(),
        rating,
        comments: comments.trim(),
        submittedAt: new Date().toISOString(),
      };
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(saved)) {
        throw new Error("Saved feedback has an invalid format.");
      }
      localStorage.setItem(key, JSON.stringify([feedback, ...saved]));
      setRating("");
      setRequestNumber("");
      setComments("");
      setFeedbackNotice("Thank you. Your feedback has been saved in this browser.");
    } catch (saveError) {
      setFeedbackError(saveError.message || "Your feedback could not be saved.");
    }
  };

  return (
    <main className="sd-main sd-about">
      <section className="sd-about__hero">
        <div className="sd-about__hero-copy">
          <div className="sd-eyebrow">ABOUT YOUR SERVICE PORTAL</div>
          <h1>Service support, made simpler.</h1>
          <p>
            ServiceDesk brings your service requests and their progress together
            in one place. Tell us what needs attention, then return any time to
            see where things stand.
          </p>
          <button
            className="sd-btn sd-btn--primary"
            onClick={() => onNavigate("raise")}
          >
            Raise a service request <ArrowRight size={14} />
          </button>
        </div>
        <div className="sd-about__hero-mark" aria-hidden="true">
          <Wrench size={34} />
        </div>
      </section>

      <section className="sd-about__section" aria-labelledby="sd-about-how">
        <div className="sd-about__section-heading">
          <div className="sd-eyebrow">HOW IT WORKS</div>
          <h2 id="sd-about-how">A clear path from request to resolution</h2>
          <p>Everything you need to get support and keep track of the next steps.</p>
        </div>

        <div className="sd-about__steps">
          {STEPS.map(({ number, icon: Icon, title, text }) => (
            <article className="sd-card sd-about__step" key={number}>
              <div className="sd-about__step-top">
                <span className="sd-about__step-icon"><Icon size={18} /></span>
                <span className="sd-about__step-number">{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="sd-card sd-about__contact"
        aria-labelledby="sd-about-contact"
        id="customer-support"
      >
        <div className="sd-about__contact-icon"><MessageCircle size={19} /></div>
        <div className="sd-about__contact-copy">
          <div className="sd-eyebrow">CUSTOMER SUPPORT</div>
          <h2 id="sd-about-contact">Contact customer support</h2>
          <p>
            Submit a service request with the details of your issue. You can
            return to My Requests to follow its progress.
          </p>
        </div>
        <div className="sd-about__contact-actions">
          <button
            className="sd-btn sd-btn--primary"
            onClick={() => onNavigate("raise")}
          >
            Contact support <ArrowRight size={14} />
          </button>
          <button
            className="sd-link"
            onClick={() => onNavigate("requests")}
          >
            View my requests <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section
        className="sd-card sd-about__feedback"
        aria-labelledby="sd-about-feedback"
      >
        <div className="sd-about__feedback-heading">
          <div className="sd-about__contact-icon"><MessageCircle size={19} /></div>
          <div>
            <div className="sd-eyebrow">YOUR EXPERIENCE MATTERS</div>
            <h2 id="sd-about-feedback">Share feedback</h2>
            <p>
              Tell us how we did. Add a request number if your feedback is about
              a specific service visit.
            </p>
          </div>
        </div>

        {/* <div className="sd-about__feedback-note">
          Feedback is saved in this browser and is not sent to a technician or
          service team.
        </div> */}

        {feedbackError && (
          <div className="sd-about__feedback-message is-error" role="alert">
            {feedbackError}
          </div>
        )}
        {feedbackNotice && (
          <div className="sd-about__feedback-message" role="status">
            {feedbackNotice}
          </div>
        )}

        <form className="sd-about__feedback-form" onSubmit={submitFeedback}>
          <label>
            <span>Overall satisfaction *</span>
            <select
              className="sd-input"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              required
            >
              <option value="">Choose a rating</option>
              <option value="5">Very satisfied</option>
              <option value="4">Satisfied</option>
              <option value="3">Neither satisfied nor dissatisfied</option>
              <option value="2">Dissatisfied</option>
              <option value="1">Very dissatisfied</option>
            </select>
          </label>
          <label>
            <span>Request number (optional)</span>
            <input
              className="sd-input"
              type="text"
              value={requestNumber}
              onChange={(event) => setRequestNumber(event.target.value)}
              placeholder="For example, SR-205"
            />
          </label>
          <label className="sd-about__feedback-comments">
            <span>Your feedback *</span>
            <textarea
              className="sd-input"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
              required
            />
          </label>
          <button type="submit" className="sd-btn sd-btn--primary">
            Submit feedback <ArrowRight size={14} />
          </button>
        </form>
      </section>
    </main>
  );
}
