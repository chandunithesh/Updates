import { useEffect, useRef, useState } from "react";
import {BarChart3,Building2,CheckCircle2,ChevronDown,ChevronRight,
  ClipboardList,LayoutDashboard,LogOut,Menu,Package,Plus,Frown,Meh,Smile,
Search,Users,Warehouse,Wrench,X,} from "lucide-react";
import "./OrgDashboard.css";

const API_KEY = process.env.REACT_APP_APPIAN_API_KEY;
const ENDPOINTS = {
  services: "https://techtamminaapps.appiancloud.com/suite/webapi/R3YL3A",
  // serviceRequests: "https://techtamminaapps.appiancloud.com/suite/webapi/ServiceRequests",
  addUser: "https://techtamminaapps.appiancloud.com/suite/webapi/AddUser",
  addService: "https://techtamminaapps.appiancloud.com/suite/webapi/AddService",
  addProduct: "https://techtamminaapps.appiancloud.com/suite/webapi/Products",
  products: "https://techtamminaapps.appiancloud.com/suite/webapi/getProducts",
  warehouse: "https://techtamminaapps.appiancloud.com/suite/webapi/warehouse",
};

const fallbackUsers = [
  {
    name: "Alex Morgan",
    email: "alex@servicebridge.demo",
    role: "Organization Admin",
    status: "Active",
  },
  {
    name: "Ravi Kumar",
    email: "ravi.kumar@servicebridge.demo",
    role: "Technician",
    status: "Active",
  },
];
const fallbackServices = [
  { name: "Appliance Repair", category: "Home Appliances", status: "Active" },
  {
    name: "Installation Support",
    category: "Customer Services",
    status: "Active",
  },
  { name: "Preventive Maintenance", category: "Maintenance", status: "Draft" },
];

function getList(payload) {
  let value = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") break;
    for (const key of [
      "items",
      "results",
      "services",
      "users",
      "products",
      "warehouses",
      "serviceRequests",
      "requests",
    ]) {
      if (Array.isArray(value[key])) return value[key];
    }
    value = value.response ?? value.data ?? value.result;
  }
  return [];
}

/* Service Requests feature: re-enable with its endpoint, state, and view.
function normalizeServiceRequest(record) {
  const customer = record.customer;
  return {
    ...record,
    id:
      record.serviceRequestId ??
      record.ServiceRequestId ??
      record.requestId ??
      record.RequestId ??
      record.id ??
      record.requestNumber ??
      record.RequestNumber,
    requestNumber:
      record.requestNumber ??
      record.RequestNumber ??
      record.serviceRequestId ??
      record.ServiceRequestId ??
      "—",
    issueTitle:
      record.issueTitle ?? record.title ?? record.issueCategory ?? "Untitled request",
    customer:
      customer && typeof customer === "object"
        ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          customer.email ||
          "—"
        : customer || "—",
    status: record.status || "—",
  };
}
*/

function mergeRecords(remoteRecords, additions, type) {
  const identityFields = {
    user: { primary: ["id", "email"], fallback: ["name"] },
    service: {
      primary: ["id", "serviceCode"],
      fallback: ["serviceName", "name"],
    },
    product: { primary: ["id", "productCode"], fallback: ["productName"] },
    warehouse: {
      primary: ["id", "warehouseName"],
      fallback: ["name"],
    },
  }[type];
  const recordKeys = (record) => {
    const keys = (fields) =>
      fields
        .filter((field) => record[field] != null && record[field] !== "")
        .map((field) => `${field}:${String(record[field]).trim().toLowerCase()}`);
    return {
      primary: keys(identityFields.primary),
      fallback: keys(identityFields.fallback),
    };
  };
  const hasSameIdentity = (left, right) => {
    const leftKeys = recordKeys(left);
    const rightKeys = recordKeys(right);
    const leftPrimary = new Set(leftKeys.primary);
    const hasSharedPrimary = rightKeys.primary.some((key) =>
      leftPrimary.has(key),
    );
    if (hasSharedPrimary) return true;
    if (leftKeys.primary.length && rightKeys.primary.length) return false;
    const leftFallback = new Set(leftKeys.fallback);
    return rightKeys.fallback.some((key) => leftFallback.has(key));
  };

  const merged = [];
  for (const record of [...remoteRecords, ...additions]) {
    if (!merged.some((existing) => hasSameIdentity(existing, record))) {
      merged.push(record);
    }
  }
  return merged;
}

function readStoredRecords(key) {
  try {
    const records = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

async function request(url, options = {}) {
  if (!API_KEY?.trim()) {
    throw new Error(
      "Missing REACT_APP_APPIAN_API_KEY. Configure it and restart the app.",
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Appian-API-Key": API_KEY.trim(),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? /<\/?(doctype|html|head|body|pre)\b/i.test(payload)
          ? `Request failed (${response.status})`
          : payload
        : payload?.message || payload?.error || payload?.detail;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return payload;
}

function titleCase(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function getCellValue(row, column) {
  const aliases = {
    serviceName: ["name"],
    category: ["serviceCategory"],
  };
  const fields = [column, `${column}Name`, ...(aliases[column] || [])];
  return fields.map((field) => row[field]).find((value) => value != null && value !== "");
}

function StatCard({ icon: Icon, label, value, tone, onClick }) {
  return (
    <button
      className={`org-stat org-stat--${tone}`}
      onClick={onClick}
      type="button"
    >
      <span className="org-stat__icon">
        <Icon size={19} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <ChevronRight className="org-stat__arrow" size={16} />
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div
      className="org-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="org-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="org-modal__head">
          <div>
            <span className="org-kicker">ORGANIZATION MANAGEMENT</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="org-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function OrgDashboard({ user, onLogout }) {
  const organizationId = user?.organizationId || user?.orgId || 2;
  const userStorageKey = `org-dashboard:${organizationId}:users`;
  const warehouseStorageKey = `org-dashboard:${organizationId}:warehouses`;
  const viewStorageKey = `servicedesk-organization-view:${String(user?.email || "demo").toLowerCase()}`;
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem(viewStorageKey);
    return ["Overview", "Users", "Services", "Products", "Warehouse"].includes(savedView)
      ? savedView
      : "Overview";
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [modal, setModal] = useState(null);
  const [users, setUsers] = useState(() =>
    mergeRecords(fallbackUsers, readStoredRecords(userStorageKey), "user"),
  );
  const [services, setServices] = useState(fallbackServices);
  // const [serviceRequests, setServiceRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState(() =>
    readStoredRecords(warehouseStorageKey),
  );
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const organizationName =
    user?.organizationName || user?.organization || "Field Flow FSM";
  const displayName = [
    user?.name,
    user?.displayName,
    user?.fullName,
    user?.userFullName,
    user?.userName,
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    typeof user?.email === "string"
      ? titleCase(user.email.split("@")[0].replace(/[._-]+/g, " "))
      : undefined,
  ].find((value) => typeof value === "string" && value.trim())?.trim() ||
    "Organization Admin";
  const navigateView = (view) => {
    setActiveView(view);
    localStorage.setItem(viewStorageKey, view);
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    // { label: "Service Requests", icon: ClipboardList },
    { label: "Users", icon: Users },
    { label: "Services", icon: Wrench },
    { label: "Products", icon: Package },
    { label: "Warehouse", icon: Warehouse },
  ];

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        request(
          `${ENDPOINTS.services}?orgId=${encodeURIComponent(organizationId)}`,
        ),
        request(
          `${ENDPOINTS.products}?orgId=${encodeURIComponent(organizationId)}`,
        ),
        // request(
        //   `${ENDPOINTS.serviceRequests}?orgId=${encodeURIComponent(organizationId)}`,
        // ),
      ]);
      if (!active) return;

      const loadErrors = [];
      if (results[0].status === "fulfilled") {
        const remoteServices = getList(results[0].value);
        if (remoteServices.length) setServices(remoteServices);
      } else {
        loadErrors.push(
          `Live services could not be loaded: ${results[0].reason.message}`,
        );
      }
      if (results[1].status === "fulfilled") {
        const remoteProducts = getList(results[1].value);
        if (remoteProducts.length) setProducts(remoteProducts);
      } else {
        loadErrors.push(
          `Live products could not be loaded: ${results[1].reason.message}`,
        );
      }
      // Service Requests feature: restore setServiceRequests and its load errors here.
      setNotice(loadErrors.join(" "));
    };
    load();
    return () => {
      active = false;
    };
  }, [organizationId]);

  const stats = [
    // {
    //   label: "Total service requests",
    //   value: serviceRequests.length,
    //   icon: ClipboardList,
    //   tone: "blue",
    //   view: "Service Requests",
    // },
    {
      label: "Total products",
      value: products.length,
      icon: Package,
      tone: "pink",
      view: "Products",
    },
    {
      label: "Total users",
      value: users.length,
      icon: Users,
      tone: "orange",
      view: "Users",
    },
    {
      label: "Active services",
      value: services.filter(
        (item) => String(item.status || "Active").toLowerCase() === "active",
      ).length,
      icon: Wrench,
      tone: "purple",
      view: "Services",
    },
    {
      label: "Warehouses",
      value: warehouses.length,
      icon: Warehouse,
      tone: "green",
      view: "Warehouse",
    },
  ];

  const openAdd = (type) => {
    setFormError("");
    setModal(type);
  };
  const closeModal = () => setModal(null);
  const submitForm = async (event, type) => {
    event.preventDefault();
    if (isSubmitting) return;
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const endpoint =
      type === "user"
        ? ENDPOINTS.addUser
        : type === "service"
          ? ENDPOINTS.addService
          : type === "product"
            ? ENDPOINTS.addProduct
            : ENDPOINTS.warehouse;
    const record =
      type === "user"
        ? {
            name: `${values.firstName} ${values.lastName}`,
            email: values.email,
            role: values.role,
            status: "Active",
          }
        : type === "service"
          ? {
              ...values,
              status: "Active",
            }
          : { ...values, status: "Active" };
    setFormError("");
    setIsSubmitting(true);
    try {
      await request(endpoint, {
        method: "POST",
        body: JSON.stringify({ ...values, organizationId }),
      });
      const currentRecords = {
        user: users,
        service: services,
        product: products,
        warehouse: warehouses,
      }[type];
      const updatedRecords = mergeRecords(currentRecords, [record], type);
      if (type === "user" || type === "warehouse") {
        const storageKey = type === "user" ? userStorageKey : warehouseStorageKey;
        const savedRecords = mergeRecords(readStoredRecords(storageKey), [record], type);
        localStorage.setItem(storageKey, JSON.stringify(savedRecords));
      }
      setNotice(`${titleCase(type)} added successfully.`);
      if (type === "user")
        setUsers(updatedRecords);
      if (type === "service")
        setServices(updatedRecords);
      if (type === "product")
        setProducts(updatedRecords);
      if (type === "warehouse") {
        setWarehouses(updatedRecords);
      }
      closeModal();
    } catch (error) {
      setFormError(error.message || `Unable to add ${type}. Try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="org-shell">
      <aside className={`org-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="org-brand">
          <span className="org-brand__mark">
            <Wrench size={20} />
          </span>
          <span>
            <strong>
              Field Flow FSM
            </strong>
            <small>OPERATIONS HUB</small>
          </span>
        </div>
        <div className="org-workspace">
          <span>WORKSPACE</span>
          <strong>{organizationName}</strong>
          <small>Organization account</small>
        </div>
        <nav className="org-nav" aria-label="Organization navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeView === label ? "is-active" : ""}
              onClick={() => {
                navigateView(label);
                setMobileNav(false);
              }}
            >
              <Icon size={17} />
              {label}
              {label === "Users" && <em>{users.length}</em>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="org-content">
        <header className="org-topbar">
          <button
            className="org-menu"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div>
            <span className="org-kicker">OPERATIONS LOGIN</span>
            <h1>{activeView}</h1>
          </div>
          <div className="org-topbar__right">
            <div className="org-user-menu" ref={userMenuRef}>
              <button
                className="org-user"
                type="button"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls={userMenuOpen ? "org-user-menu" : undefined}
                onClick={() => setUserMenuOpen((isOpen) => !isOpen)}
              >
                <span>
                  {String(displayName)
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <strong>{displayName}</strong>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {userMenuOpen && (
                <div className="org-user-dropdown" id="org-user-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {notice && (
          <div className="org-notice">
            <CheckCircle2 size={16} />
            {notice}
            <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}

        {activeView === "Overview" && (
          <Overview
            organizationName={organizationName}
            stats={stats}
            services={services}
            onAdd={openAdd}
            onNavigate={navigateView}
          />
        )}
        {activeView === "Users" && (
          <DataView
            title="Users"
            description="Manage user accounts, roles, and permissions with secure access control."
            icon={Users}
            rows={users}
            columns={["name", "email", "role", "status"]}
            actionLabel="Add new user"
            onAdd={() => openAdd("user")}
          />
        )}
        {/* {activeView === "Service Requests" && (
          <DataView
            title="Service Requests"
            description="Review service requests submitted to your organization."
            icon={ClipboardList}
            rows={serviceRequests}
            columns={["requestNumber", "issueTitle", "customer", "status"]}
            empty="No service requests are available."
          />
        )} */}
        {activeView === "Services" && (
          <DataView
            title="Services"
            description="Track and maintain the services available to your organization."
            icon={Wrench}
            rows={services}
            columns={[
              "serviceCode",
              "serviceName",
              "defaultDurationMinutes",
              "defaultServiceCharge",
            ]}
            actionLabel="Add service"
            onAdd={() => openAdd("service")}
          />
        )}
        {activeView === "Products" && (
          <DataView
            title="Products"
            description="Manage and organize your organization's products."
            icon={Package}
            rows={products}
            columns={[
              "productCode",
              "productName",
              "brand",
              "category",
              "status",
            ]}
            empty="No products have been added yet."
            emptyDetail="No product list API is documented; showing records saved in this browser."
            actionLabel="Add product"
            onAdd={() => openAdd("product")}
          />
        )}
        {activeView === "Warehouse" && (
          <DataView
            title="Warehouse"
            description="Monitor inventory and streamline warehouse operations."
            icon={Warehouse}
            rows={warehouses}
            columns={[
              "Branch",
              "warehouseManager",
              "warehouseName",
              "capacity",
              "AvailableSpace",
              "address",
            ]}
            empty="No warehouses have been added yet."
            emptyDetail="No warehouse list API is documented; showing records saved in this browser."
            actionLabel="Add warehouse"
            onAdd={() => openAdd("warehouse")}
          />
        )}
      </main>
      {modal === "user" && (
        <Modal title="Add new user" onClose={closeModal}>
          <Form
            type="user"
            error={formError}
            isSubmitting={isSubmitting}
            onSubmit={(event) => submitForm(event, "user")}
          />
        </Modal>
      )}
      {modal === "service" && (
        <Modal title="Add service" onClose={closeModal}>
          <Form
            type="service"
            error={formError}
            isSubmitting={isSubmitting}
            onSubmit={(event) => submitForm(event, "service")}
          />
        </Modal>
      )}
      {modal === "product" && (
        <Modal title="Add product" onClose={closeModal}>
          <Form
            type="product"
            error={formError}
            isSubmitting={isSubmitting}
            onSubmit={(event) => submitForm(event, "product")}
          />
        </Modal>
      )}
      {modal === "warehouse" && (
        <Modal title="Add warehouse" onClose={closeModal}>
          <Form
            type="warehouse"
            error={formError}
            isSubmitting={isSubmitting}
            onSubmit={(event) => submitForm(event, "warehouse")}
          />
        </Modal>
      )}
    </div>
  );
}

function Overview({ organizationName, stats, services, onAdd, onNavigate }) {
  return (
    <div className="org-page">
      <div className="org-hero">
        <div>
          <span className="org-kicker">WELCOME BACK</span>
          <h2>{organizationName}</h2>
          <p>
            Manage users, assets, inventory, and services from one centralized
            hub.
          </p>
        </div>
        <button className="org-primary" onClick={() => onAdd("user")}>
          <Plus size={16} />
          Add new user
        </button>
      </div>
      <section className="org-stats">
        {stats.map(({ view, ...stat }) => (
          <StatCard
            key={stat.label}
            {...stat}
            onClick={() => onNavigate(view)}
          />
        ))}
      </section>
      <TicketInsights />
      <div className="org-grid">
        <section className="org-panel org-panel--wide">
          <div className="org-panel__head">
            <div>
              <span className="org-kicker">SERVICE CATALOG</span>
              <h2>Services by organization</h2>
            </div>
            <button
              className="org-text-button"
              onClick={() => onAdd("service")}
            >
              Manage services <ChevronRight size={15} />
            </button>
          </div>
          <div className="org-bars">
            {services.slice(0, 5).map((service, index) => (
              <div className="org-bar-row" key={service.name || index}>
                <span>
                  {service.name || service.serviceName || "Unnamed service"}
                </span>
                <div>
                  <i style={{ width: `${Math.max(28, 90 - index * 13)}%` }} />
                </div>
                <strong>{index + 2}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="org-panel">
          <div className="org-panel__head">
            <div>
              <span className="org-kicker">PROFILE</span>
              <h2>Organization details</h2>
            </div>
          </div>
          <div className="org-profile-progress">
            <strong>68%</strong>
            <span>Profile completion</span>
            <div>
              <i />
            </div>
          </div>
          <dl className="org-details">
            <div>
              <dt>
                <Building2 size={15} />
                Organization
              </dt>
              <dd>{organizationName}</dd>
            </div>
            <div>
              <dt>
                <BarChart3 size={15} />
                Industry
              </dt>
              <dd>Home Appliances</dd>
            </div>
            <div>
              <dt>
                <ClipboardList size={15} />
                Contact
              </dt>
              <dd>Not provided</dd>
            </div>
            <div>
              <dt>
                <CheckCircle2 size={15} />
                Plan
              </dt>
              <dd>Premium Plan</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

const ticketSentiment = [
  { label: "Positive", value: 124, icon: Smile, tone: "positive" },
  { label: "Negative", value: 80, icon: Frown, tone: "negative" },
  { label: "Neutral", value: 94, icon: Meh, tone: "neutral" },
];

const currentTicketStatuses = [
  ["New", 299],
  ["Closed", 167],
  ["On Hold", 29],
  ["Escalated", 50],
  ["Backlog", 97],
  ["Overdue", 206],
  ["Individual", 26],
  ["Group", 273],
  ["Unresolved", 225],
  ["Resolved", 74],
];

const ticketStatusBars = [
  ["Closed", 93],
  ["Resolved", 74],
  ["Pending Fix", 35],
  ["Open", 35],
  ["Pending", 32],
];

function TicketInsights() {
  return (
    <section className="org-ticket-insights" aria-label="Ticket performance">
      <p className="org-ticket-reference">
        Reference snapshot - figures match the supplied dashboard image.
      </p>
      <article className="org-panel org-ticket-panel">
        <div className="org-panel__head">
          <div>
            <span className="org-kicker">CUSTOMER FEEDBACK</span>
            <h2>Customer satisfaction</h2>
          </div>
          <span className="org-csat-score">41.5%</span>
        </div>
        <div className="org-sentiment-list">
          {ticketSentiment.map(({ label, value, icon: Icon, tone }) => (
            <div className={`org-sentiment org-sentiment--${tone}`} key={label}>
              <Icon size={25} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="org-panel org-ticket-panel">
        <div className="org-panel__head">
          <div>
            <span className="org-kicker">RESPONSE PERFORMANCE</span>
            <h2>Average ticket times</h2>
          </div>
        </div>
        <dl className="org-ticket-times">
          <div>
            <dt>First reply time</dt>
            <dd>6.586 <span>hours</span></dd>
          </div>
          <div>
            <dt>Response time</dt>
            <dd>6.603 <span>hours</span></dd>
          </div>
          <div>
            <dt>Resolution time</dt>
            <dd>6.690 <span>hours</span></dd>
          </div>
        </dl>
      </article>

      <article className="org-panel org-ticket-panel">
        <div className="org-panel__head">
          <div>
            <span className="org-kicker">TICKET WORKLOAD</span>
            <h2>Current ticket statuses</h2>
          </div>
        </div>
        <dl className="org-ticket-statuses">
          {currentTicketStatuses.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="org-panel org-ticket-panel org-ticket-chart">
        <div className="org-panel__head">
          <div>
            <span className="org-kicker">TICKET BREAKDOWN</span>
            <h2>Tickets by status</h2>
          </div>
        </div>
        <div className="org-ticket-bars">
          {ticketStatusBars.map(([label, value]) => (
            <div className="org-ticket-bar" key={label}>
              <span>{label}</span>
              <div
                className="org-ticket-bar__track"
                role="img"
                aria-label={`${label}: ${value} tickets`}
              >
                <i style={{ width: `${(value / 100) * 100}%` }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="org-ticket-caption">Illustrative metrics from the dashboard reference.</p>
      </article>
    </section>
  );
}

function DataView({
  title,
  description,
  icon: Icon,
  rows,
  columns,
  empty,
  emptyDetail,
  actionLabel,
  onAdd,
}) {
  const rowStyle =
    title === "Warehouse"
      ? undefined
      : {
          gridTemplateColumns:
            columns.length === 5
              ? "1.2fr 1.5fr 1fr 1fr 1fr"
              : `repeat(${columns.length}, minmax(0, 1fr))`,
        };

  return (
    <div className="org-page">
      <div className="org-page-heading">
        <div className="org-page-heading__title">
          <span className="org-page-icon">
            <Icon size={22} />
          </span>
          <div>
            <span className="org-kicker">CENTRALIZED MANAGEMENT</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        {actionLabel && onAdd && (
          <button className="org-primary" onClick={onAdd}>
            <Plus size={16} />
            {actionLabel}
          </button>
        )}
      </div>
      <section className="org-panel org-table-panel">
        <div className="org-table-tools">
          <div className="org-search">
            <Search size={16} />
            <input
              placeholder={`Search ${title.toLowerCase()}...`}
              aria-label={`Search ${title}`}
            />
          </div>
          <button className="org-filter">Filter</button>
        </div>
        {rows.length ? (
          <div
            className={`org-table ${title === "Warehouse" ? "org-table--warehouse" : ""}`}
          >
            <div className="org-table__row org-table__head" style={rowStyle}>
              {columns.map((column) => (
                <span key={column}>{titleCase(column)}</span>
              ))}
            </div>
            {rows.map((row, index) => (
              <div
                className="org-table__row"
                key={row.id || row.email || row.name || index}
                style={rowStyle}
              >
                {columns.map((column) => (
                  <span key={column}>
                    {column === "status" ? (
                      <b
                        className={`org-status org-status--${String(row[column] || "Active").toLowerCase()}`}
                      >
                        {row[column] || "Active"}
                      </b>
                    ) : (
                      getCellValue(row, column) ?? "—"
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="org-empty">
            <Icon size={28} />
            <strong>{empty}</strong>
            <p>
              {emptyDetail || "Use the button above to create the first record."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Form({ type, error, isSubmitting, onSubmit }) {
  const fields =
    type === "user"
      ? [
          ["firstName", "First name"],
          ["lastName", "Last name"],
          ["email", "Email"],
          ["role", "Role"],
        ]
      : type === "service"
        ? [
            ["serviceCode", "Service code"],
            ["serviceName", "Service name"],
            ["defaultDurationMinutes", "Default duration (minutes)"],
            ["defaultServiceCharge", "Default service charge"],
          ]
        : type === "product"
          ? [
              ["productCode", "Product code"],
              ["productName", "Product name"],
              ["category", "Category"],
              ["brand", "Brand"],
              ["model", "Model"],
              ["warrantyMonth", "Warranty (months)"],
            ]
          : [
              ["Branch", "Branch"],
              ["warehouseManager", "Warehouse manager"],
              ["warehouseName", "Warehouse name"],
              ["capacity", "Capacity"],
              ["AvailableSpace", "Available space"],
              ["address", "Address"],
            ];
  return (
    <form className="org-form" onSubmit={onSubmit}>
      {error && (
        <div
          className="org-form-error"
          role="alert"
          style={{ color: "#b42318", gridColumn: "1 / -1" }}
        >
          {error}
        </div>
      )}
      {fields.map(([name, label]) => (
        <label key={name}>
          {label}
          <input
            name={name}
            required
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </label>
      ))}
      <button className="org-primary" type="submit" disabled={isSubmitting}>
        <CheckCircle2 size={16} />
        {isSubmitting ? "Saving..." : `Save ${type}`}
      </button>
    </form>
  );
}
