import { useState } from "react";
import Header from "./Header.js";
import Home from "./Home.js";
import AboutContact from "./AboutContact.js";
import Feedback from "./Feedback.js";
import RaiseRequest from "./RaiseRequest.js";
import MyRequests from "./MyRequests.js";
import TechnicianPortal from "./technician/TechnicianPortal.js";
import { CustomerLogin as LoginPage } from "./Login.js";
import { Dashboard } from "./admin/SuperAdminDashboard.js";
import { INITIAL_REQUESTS, nextRequestId, todayISO } from "./data.js";
import "./shared.css";
import "./App.css";
import ServiceAgent from "./ServiceAgent/ServiceAgent.js";
import LandingPage from "./landing/LandingPage.js";
import OrgDashboard from "./Organization/OrgDashboard.js";

const REQUESTS_KEY_PREFIX = "servicedesk-customer-requests:";
const AUTH_USER_KEY = "servicedesk-demo-user";
const AUTH_SCREEN_KEY = "servicedesk-auth-screen";
const PAGE_KEY_PREFIX = "servicedesk-page:";

const getRequestsKey = () =>
  `${REQUESTS_KEY_PREFIX}${localStorage.getItem("customerId") || "demo"}`;

const getPageKey = (authenticatedUser) =>
  `${PAGE_KEY_PREFIX}${String(authenticatedUser?.email || localStorage.getItem("email") || "demo").toLowerCase()}`;

const readSavedPage = (authenticatedUser) => {
  const savedPage = localStorage.getItem(getPageKey(authenticatedUser));
  return ["home", "raise", "requests", "about", "feedback"].includes(savedPage)
    ? savedPage
    : "home";
};

const sanitizeUser = (authenticatedUser) =>
  Object.fromEntries(
    Object.entries(authenticatedUser).filter(
      ([key]) => !/password|token|secret|credential/i.test(key),
    ),
  );

const readAuthenticatedUser = () => {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_SCREEN_KEY);
    const savedUser = JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) || "null");
    if (!savedUser || typeof savedUser !== "object" || Array.isArray(savedUser))
      return null;
    const safeUser = sanitizeUser(savedUser);
    if (JSON.stringify(safeUser) !== JSON.stringify(savedUser)) {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(safeUser));
    }
    return safeUser;
  } catch {
    sessionStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

const persistAuthenticatedUser = (authenticatedUser) => {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(sanitizeUser(authenticatedUser)));
};

const readSavedRequests = () => {
  try {
    const savedRequests = JSON.parse(
      localStorage.getItem(getRequestsKey()) || "[]",
    );
    return Array.isArray(savedRequests) ? savedRequests : [];
  } catch {
    return [];
  }
};

const getUserRole = (user) => {
  const roleValue =
    user?.role ||
    user?.Role ||
    user?.userRole ||
    user?.UserRole ||
    user?.user_role ||
    user?.userType ||
    user?.UserType ||
    user?.roleName ||
    user?.RoleName ||
    user?.role_name ||
    user?.userTypeName;
  const roleEntry = Array.isArray(roleValue) ? roleValue[0] : roleValue;
  const role =
    roleEntry && typeof roleEntry === "object"
      ? roleEntry.role ||
        roleEntry.roleName ||
        roleEntry.name ||
        roleEntry.value
      : roleEntry;
  return String(role || "").toLowerCase().replace(/[\s_-]/g, "");
};

export default function App() {
  const [initialUser] = useState(readAuthenticatedUser);
  const [authScreen, setAuthScreen] = useState(() =>
    sessionStorage.getItem(AUTH_SCREEN_KEY) === "login" ? "login" : "landing",
  );
  const [requests, setRequests] = useState(readSavedRequests);
  const [user, setUser] = useState(initialUser);
  const [page, setPage] = useState(() => readSavedPage(initialUser));

  const handleLogin = (authenticatedUser) => {
    localStorage.removeItem("password");
    persistAuthenticatedUser(authenticatedUser);
    sessionStorage.removeItem(AUTH_SCREEN_KEY);
    setPage(readSavedPage(authenticatedUser));
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("customerId");
    localStorage.removeItem("email");
    localStorage.removeItem("password");
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_SCREEN_KEY);
    setUser(null);
    setPage("home");
    setAuthScreen("landing");
  };

  const navigate = (next) => {
    setPage(next);
    localStorage.setItem(getPageKey(user), next);
    window.scrollTo({ top: 0 });
  };

  const handleSubmit = (values) => {
    const id =
      values.requestId ?? nextRequestId([...INITIAL_REQUESTS, ...requests]);
    if (user?.isDemo) {
      const updatedRequests = [
        {
          id: String(id),
          title: values.title.trim(),
          description: values.description.trim(),
          organization: values.organization,
          category: values.category,
          location: values.location.trim(),
          status: "Under Review",
          priority: values.priority,
          created: todayISO(),
          scheduled: values.date || null,
          updated: todayISO(),
        },
        ...requests,
      ];
      localStorage.setItem(getRequestsKey(), JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
    }
  };

  if (!user) {
    return authScreen === "landing" ? (
      <LandingPage
        onLogin={() => {
          sessionStorage.setItem(AUTH_SCREEN_KEY, "login");
          setAuthScreen("login");
        }}
      />
    ) : (
      <LoginPage
        onLogin={handleLogin}
        onBackToLanding={() => {
          sessionStorage.removeItem(AUTH_SCREEN_KEY);
          setAuthScreen("landing");
        }}
      />
    );
  }

  const role = getUserRole(user);
  if (role.includes("serviceagent")) {
    return <ServiceAgent user={user} onLogout={handleLogout} />;
  }
  if (role.includes("technician")) {
    return <TechnicianPortal user={user} onLogout={handleLogout} />;
  }
  if (
    ["superadmin", "operationsadmin", "admin"].includes(role) ||
    role.startsWith("operation")
  ) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }
  if (role.includes("organizationadmin") || role.includes("orgadmin")) {
    return <OrgDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="sd">
      <Header
        page={page}
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
      />

      {page === "home" && (
        <Home
          onNavigate={navigate}
          submittedRequests={requests}
          user={user}
        />
      )}
      {page === "raise" && (
        <RaiseRequest onNavigate={navigate} onSubmit={handleSubmit} />
      )}
      {page === "requests" && (
        <MyRequests onNavigate={navigate} localRequests={requests} user={user} />
      )}
      {page === "about" && (
        <AboutContact onNavigate={navigate} user={user} />
      )}
      {page === "feedback" && (
        <Feedback onNavigate={navigate} user={user} />
      )}
    </div>
  );
}
