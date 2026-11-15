import { useEffect, useState } from "react";
import {
  Wrench,
  Home,
  Plus,
  ClipboardList,
  Building2,
  LogOut,
  Star,
} from "lucide-react";
import "./Header.css";

const CUSTOMER_DETAILS_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/customerDetailsbyCustId";

// `key` is the page id used by the router in App.jsx
const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "raise", label: "Raise a Request", icon: Plus },
  { key: "requests", label: "My Requests", icon: ClipboardList },
  { key: "about", label: "About & Contact", icon: Building2 },
  { key: "feedback", label: "Feedback", icon: Star },
];

function getUserField(user, ...fieldNames) {
  const normalizedNames = new Set(
    fieldNames.map((name) => name.replace(/[^a-z0-9]/gi, "").toLowerCase()),
  );
  const entry = Object.entries(user || {}).find(
    ([name, value]) =>
      normalizedNames.has(name.replace(/[^a-z0-9]/gi, "").toLowerCase()) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "",
  );
  return entry?.[1];
}

function unwrapCustomerRecord(data) {
  if (Array.isArray(data)) return unwrapCustomerRecord(data[0]);
  if (!data || typeof data !== "object") return {};

  const nestedRecord = Object.entries(data).find(
    ([name, value]) =>
      ["response", "data", "result", "customerDetails"].includes(
        name.replace(/[^a-z0-9]/gi, "").toLowerCase(),
      ) &&
      value &&
      typeof value === "object",
  );
  return nestedRecord ? unwrapCustomerRecord(nestedRecord[1]) : data;
}

function getCustomerName(customer) {
  return (
    getUserField(
      customer,
      "name",
      "customerName",
      "fullName",
      "customerFullName",
      "custName",
    ) ||
    [getUserField(customer, "firstName"), getUserField(customer, "lastName")]
      .filter(Boolean)
      .join(" ")
  );
}

function getCustomerInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("") || "C";
}

export default function Header({ page, onNavigate, user, onLogout }) {
  const accountName = getCustomerName(user);
  const customerId = user?.customerId == null ? "" : String(user.customerId);
  const [profileName, setProfileName] = useState(null);
  const resolvedProfileName =
    profileName?.customerId === customerId ? profileName.name : "";
  const displayedName = accountName || resolvedProfileName;

  useEffect(() => {
    if (accountName || !customerId) {
      setProfileName(null);
      return undefined;
    }

    const apiKey = process.env.REACT_APP_APPIAN_API_KEY?.trim();
    if (!apiKey) {
      console.error("Cannot load customer name: Missing REACT_APP_APPIAN_API_KEY");
      return undefined;
    }

    let cancelled = false;
    const loadCustomerName = async () => {
      try {
        const url = new URL(CUSTOMER_DETAILS_URL);
        url.searchParams.set("custId", customerId);
        const response = await fetch(url, {
          headers: { "Appian-API-Key": apiKey, Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Customer details request failed (${response.status}).`);
        }

        const customer = unwrapCustomerRecord(await response.json());
        const name = getCustomerName(customer);
        if (!name) {
          throw new Error("Customer details response did not include a name.");
        }
        if (!cancelled) setProfileName({ customerId, name });
      } catch (error) {
        if (!cancelled) console.error("Could not load the customer name.", error);
      }
    };

    loadCustomerName();
    return () => {
      cancelled = true;
    };
  }, [accountName, customerId]);

  return (
    <header className="sd-header">
      <div className="sd-header__inner">
        <button className="sd-brand" onClick={() => onNavigate("home")} aria-label="ServiceDesk home">
          <span className="sd-brand__logo"><Wrench size={18} /></span>
          <span>
            <span className="sd-brand__name">ServiceDesk.</span>
            <span className="sd-brand__sub">CUSTOMER PORTAL · DEMO BRAND</span>
          </span>
        </button>

        <nav className="sd-nav" aria-label="Primary">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = page === key;
            return (
              <button
                key={key}
                className={`sd-nav__link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(key)}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </nav>

        <div className="sd-header__right">
          <div className="sd-account">
            <span className="sd-avatar">{getCustomerInitials(displayedName)}</span>
            <span className="sd-account__text">
              {displayedName && <strong>{displayedName}</strong>}
              <small>{user?.role || "Signed in"}</small>
            </span>
          </div>
          <button className="sd-btn sd-btn--ghost sd-btn--auto sd-logout" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
            <LogOut size={14} /> <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
