import "./Login.css";
import { useEffect, useState } from "react";
import {
  ArrowRight,CalendarDays, CircleCheck,ClipboardList,
  Clock3,MapPin,ShieldCheck,UserRound, Wrench, } from "lucide-react";

const CUSTOMER_LOGIN_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/LoginPage";
const OPERATIONS_LOGIN_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/userLogin";
const REGISTER_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/Registration";
const API_KEY = process.env.REACT_APP_APPIAN_API_KEY;

const DEMO_PASSWORD = "Appian123";

// Remembers which login (operations / customer) was open, so a browser
// refresh keeps the user on the same page.
const AUDIENCE_KEY = "serviceBridgeAudience";

function readAudienceOnReload() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    const saved = sessionStorage.getItem(AUDIENCE_KEY);
    if (
      nav?.type === "reload" &&
      (saved === "customer" || saved === "operations")
    ) {
      return saved;
    }
  } catch {
    // storage unavailable, ignore
  }
  return null;
}

// Read once when the page loads (only set after a real browser refresh).
let audienceToRestore = readAudienceOnReload();

// Fallback accounts used when the backend can't be reached.
const DEMO_USERS = [
  {
    name: "Alex Morgan",
    email: "alex@servicebridge.demo",
    password: DEMO_PASSWORD,
    role: "Operations Admin",
  },
  {
    name: "Saisree Harsha M",
    email: "saisreeharsha.m@tammina.com",
    password: DEMO_PASSWORD,
    role: "Organization Admin",
    organizationId: 2,
    organizationName: "Field Flow FSM",
  },
  {
    name: "manosaisreeharsha",
    email: "manosaisreeharsha@gmail.com",
    password: DEMO_PASSWORD,
    role: "Super Admin",
  },
  {
    name: "Lalithya Mullapudi",
    email: "lalithya.mullapudi@tammina.com",
    password: DEMO_PASSWORD,
    role: "Technician",
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    password: "$2a$10$aB3cD4eF5gH6iJ7kL8mN9o",
    role: "Customer",
  },
  {
    name: "sravani basavaboyina",
    email: "sravani.basavaboyina@tammina.in",
    password: DEMO_PASSWORD,
    role: "Service Agent",
    organizationId: 2,
  },
];

// Text and icons for the left-hand panel, one set per audience.
const STORY = {
  customer: {
    eyebrow: "CUSTOMER SERVICE PORTAL",
    title: ["Your service.", "In good hands."],
    text: "Request help, follow progress, and keep your service history close at hand.",
    highlights: [
      {
        icon: ClipboardList,
        title: "Requests in one place",
        text: "Submit a request whenever you need us.",
      },
      {
        icon: Clock3,
        title: "Clear progress updates",
        text: "Know what is happening at every step.",
      },
      {
        icon: CircleCheck,
        title: "Service history, ready",
        text: "Find your past visits and updates easily.",
      },
    ],
  },
  operations: {
    eyebrow: "FIELD SERVICE MANAGEMENT",
    title: ["Every service.", "Connected."],
    text: "Manage field operations efficiently with a simple, secure, and user-friendly platform. Schedule jobs, track technicians, and monitor service activities in real time.",
    highlights: [
      {
        icon: CalendarDays,
        title: "Smarter scheduling",
        text: "Keep every service visit on track.",
      },
      {
        icon: MapPin,
        title: "Live field visibility",
        text: "Know where each job stands.",
      },
      {
        icon: ShieldCheck,
        title: "Trusted service network",
        text: "Customers and organizations, connected.",
      },
    ],
  },
};

// Registration form fields in display order. `id` defaults to `key`.
const REGISTRATION_FIELDS = [
  { key: "firstName", label: "First name", autoComplete: "given-name" },
  { key: "lastName", label: "Last name", autoComplete: "family-name" },
  { key: "gender", label: "Gender", type: "select" },
  {
    key: "contactNumber",
    label: "Contact number",
    type: "tel",
    autoComplete: "tel",
  },
  {
    key: "name",
    id: "organizationName",
    label: "Name",
    autoComplete: "organization",
    full: true,
  },
  {
    key: "address",
    label: "Address",
    autoComplete: "street-address",
    full: true,
  },
  {
    key: "email",
    id: "registrationEmail",
    label: "Work email",
    type: "email",
    autoComplete: "email",
    full: true,
  },
  {
    key: "password",
    id: "registrationPassword",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
  },
  {
    key: "confirmPassword",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
  },
];

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const EMPTY_REGISTRATION = {
  firstName: "",
  lastName: "",
  gender: "",
  contactNumber: "",
  name: "",
  address: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Appian-API-Key": API_KEY },
    body: JSON.stringify(body),
  });
}

function getUserFromResponse(data, fallbackEmail, isCustomer) {
  const result = Array.isArray(data) ? data[0] : data;

  if (!result || typeof result !== "object" || result.success !== true) {
    return null;
  }

  if (isCustomer) {
    if (result.customerId == null) return null;

    return {
      ...result,
      customerId: String(result.customerId),
      role: "Customer",
      email: result.email || fallbackEmail,
    };
  }

  const role = Array.isArray(result.userRole)
    ? result.userRole[0]
    : result.userRole;

  if (!role) return null;

  return {
    ...result,
    userId: Array.isArray(result.userId) ? result.userId[0] : result.userId,
    role: String(role),
    email: result.email || fallbackEmail,
  };
}

function isCustomerUser(user) {
  return String(user?.role || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "") === "customer";
}

function Brand({ audience }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Wrench size={21} />
      </div>
      <div>
        <strong>
          Field Flow FSM
        </strong>
        <small>
          {audience === "customer" ? "CUSTOMER OPERATIONS" : "FIELD OPERATIONS"}
        </small>
      </div>
    </div>
  );
}

function RegistrationField({ field, value, onChange }) {
  const { key, label, type = "text", autoComplete, full } = field;
  const id = field.id || key;

  return (
    <div className={full ? "registration-full" : undefined}>
      <label htmlFor={id}>{label}</label>
      <div className="input-box">
        {type === "select" ? (
          <select id={id} value={value} onChange={onChange} required>
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type={type}
            autoComplete={autoComplete}
            value={value}
            onChange={onChange}
            required
          />
        )}
      </div>
    </div>
  );
}

export function Login({
  onLogin,
  onBackToLanding,
  initialAudience = "operations",
}) {
  // After a browser refresh, restore the last audience instead of the default.
  const [audience, setAudience] = useState(
    () => audienceToRestore || initialAudience,
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registration, setRegistration] = useState(EMPTY_REGISTRATION);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  // Use the restored value only once, so later visits from the landing page
  // still open the audience they ask for.
  useEffect(() => {
    audienceToRestore = null;
  }, []);

  // Remember the current audience for the next refresh.
  useEffect(() => {
    try {
      sessionStorage.setItem(AUDIENCE_KEY, audience);
    } catch {
      // storage unavailable, ignore
    }
  }, [audience]);

  const isCustomer = audience === "customer";
  const story = STORY[audience];

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleRegistrationChange = (key) => (e) =>
    setRegistration({ ...registration, [key]: e.target.value });

  const handleRegistration = async (e) => {
    e.preventDefault();
    clearMessages();

    if (registration.password !== registration.confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setBusy(true);
    try {
      const registrationWithoutAddress = { ...registration };
      delete registrationWithoutAddress.address;
      const registrationData = isCustomer
        ? { ...registration, Address: registration.address }
        : registrationWithoutAddress;
      const response = await postJson(REGISTER_URL, registrationData);

      if (!response.ok) {
        setError(
          "Registration failed. Please check your details and try again.",
        );
        return;
      }

      // Send them back to sign in with the email they just used.
      setEmail(registration.email);
      setPassword("");
      setIsRegistering(false);
      setSuccess(
        "Registration successful. Please sign in with your new account.",
      );
    } catch {
      setError("Could not reach the registration service. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter your work email and password.");
      return;
    }

    setBusy(true);
    clearMessages();

    // 1. Try the real backend.
    try {
      const response = await postJson(
        isCustomer ? CUSTOMER_LOGIN_URL : OPERATIONS_LOGIN_URL,
        isCustomer
          ? { username: trimmedEmail, password: trimmedPassword }
          : { email: trimmedEmail, password: trimmedPassword },
      );

      if (!response.ok) {
        setError("Invalid email or password. Please try again.");
        setBusy(false);
        return;
      }

      const user = getUserFromResponse(
        await response.json(),
        trimmedEmail,
        isCustomer,
      );
      if (!user) {
        setError("The login response did not contain valid user details.");
        setBusy(false);
        return;
      }

      if (isCustomer) {
        localStorage.setItem("customerId", user.customerId);
        console.log("Customer ID saved to localStorage:", user.customerId);
      } else {
        localStorage.removeItem("customerId");
        console.log("Customer ID removed from localStorage.");
      }
      localStorage.setItem("email", user.email);
      localStorage.setItem("orgId", user.orgId);
      console.log("User id saved to localStorage:", user.userId);
      console.log("The total user object is:", user);
      console.log("User email saved to localStorage:", user.email);

      onLogin(user);
      return;
    } catch {
      // Backend unavailable, so fall through to the demo accounts.
    }

    // 2. Fall back to the demo accounts.
    const demoUser = DEMO_USERS.find(
      (user) =>
        user.email === trimmedEmail.toLowerCase() &&
        user.password === trimmedPassword,
    );

    if (demoUser) {
      if (isCustomer && !isCustomerUser(demoUser)) {
        setError(
          "This account is for the operations portal. Please use Operations sign in.",
        );
        setBusy(false);
        return;
      }
      localStorage.removeItem("customerId");
      console.log("Customer ID removed from localStorage.");
      onLogin({ ...demoUser, email: trimmedEmail, isDemo: true });
      return;
    }

    setError("Invalid email or password. Please try again.");
    setBusy(false);
  };

  const toggleRegistering = () => {
    setIsRegistering(!isRegistering);
    clearMessages();
  };

  const toggleAudience = () => {
    setAudience(isCustomer ? "operations" : "customer");
    clearMessages();
  };

  let intro = "Sign in to manage service requests and field operations.";
  if (isRegistering) intro = "Enter your details to get started.";
  else if (isCustomer)
    intro = "Sign in to raise requests and follow your service updates.";

  let submitLabel = isCustomer
    ? "Sign in to customer portal"
    : "Sign in to workspace";
  if (isRegistering) submitLabel = "Create account";
  if (busy) submitLabel = isRegistering ? "Creating account…" : "Signing in…";

  return (
    <div className={`login-shell${isCustomer ? " login-shell--customer" : ""}`}>
      <aside className="login-story">
        <div className="login-brand">
          <Brand audience={audience} />
        </div>

        <div className="story-content">
          <div className="eyebrow light">
            <span className="pulse-dot" /> {story.eyebrow}
          </div>
          <h1>
            {story.title[0]}
            <br />
            {story.title[1]}
          </h1>
          <p>{story.text}</p>

          <div className="story-highlights">
            {story.highlights.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="highlight-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <b>{title}</b>
                  <small>{text}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="story-footer">
          <span>© 2026 Field Flow FSM</span>
          <span>One bridge. Better service.</span>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-topline">
          {onBackToLanding ? (
            <button
              type="button"
              className="login-back-button"
              onClick={onBackToLanding}
            >
              Back to landing page
            </button>
          ) : (
            <span>
              {isCustomer
                ? "Your service account"
                : "Welcome to your workspace"}
            </span>
          )}
          <span className="secure">
            <ShieldCheck size={15} /> Secure demo environment
          </span>
        </div>

        <form
          className={`login-card${isRegistering ? " login-card--register" : ""}`}
          onSubmit={isRegistering ? handleRegistration : handleLogin}
        >
          <div className="login-icon">
            {isCustomer ? <ClipboardList size={23} /> : <Wrench size={23} />}
          </div>
          <div className="form-eyebrow">
            {isCustomer ? "CUSTOMER PORTAL" : "OPERATIONS PORTAL"}
          </div>
          <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
          <p className="form-intro">{intro}</p>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="success-box" role="status">
              {success}
            </div>
          )}

          {isRegistering ? (
            <div className="registration-grid">
              {REGISTRATION_FIELDS.filter(
                (field) => isCustomer || field.key !== "address",
              ).map((field) => (
                <RegistrationField
                  key={field.key}
                  field={field}
                  value={registration[field.key]}
                  onChange={handleRegistrationChange(field.key)}
                />
              ))}
            </div>
          ) : (
            <>
              <label htmlFor="email">Work email</label>
              <div className="input-box">
                <UserRound size={18} />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-box">
                <ShieldCheck size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="inline-eye"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </>
          )}

          <button
            className="primary-btn login-submit"
            type="submit"
            disabled={busy}
          >
            {submitLabel} <ArrowRight size={18} />
          </button>

          <div className="login-mode-switch">
            <span>
              {isRegistering
                ? "Already have an account?"
                : "New to Field Flow FSM?"}
            </span>
            <button
              type="button"
              className="text-button"
              onClick={toggleRegistering}
            >
              {isRegistering ? "Sign in" : "Create an account"}
            </button>
          </div>

          {!isRegistering && (
            <>
              <div className="audience-switch">
                <span>{isCustomer ? "Team member?" : "Customer?"}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={toggleAudience}
                >
                  {isCustomer ? "Operations sign in" : "Customer sign in"}
                </button>
              </div>
              <div className="login-terms">
                By signing in, you agree to the platform's demo terms and
                privacy policy.
              </div>
            </>
          )}
        </form>

        <div className="login-bottom">
          <span>Need help accessing your account?</span>
          <a href="mailto:support@servicebridge.demo">Contact support</a>
        </div>
      </main>
    </div>
  );
}

export function CustomerLogin({ onLogin, onBackToLanding }) {
  return (
    <Login
      onLogin={onLogin}
      onBackToLanding={onBackToLanding}
      initialAudience="customer"
    />
  );
}