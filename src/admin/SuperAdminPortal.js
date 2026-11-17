import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Crown,
  Gauge,
  Globe2,
  Layers,
  LogOut,
  Plus,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import "./SuperAdminPortal.css";


const KPI_API_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/getKPiValues";
const SERVICE_REQUESTS_API_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/getServicerequest?organizationId=2";
const ADD_ORGANIZATION_API_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/addOrganization";
const ASSIGN_SUBSCRIPTION_API_URL =
  "https://techtamminaapps.appiancloud.com/suite/webapi/assSubscription";
const APPIAN_API_KEY = process.env.REACT_APP_APPIAN_API_KEY;
const SUBSCRIPTION_COUNT_ADJUSTMENT_KEY = "serviceSphere.subscriptionCountAdjustment";


const organizationSlices = [
  { name: "Series 1", percent: 30, color: "#3b6fb6" },
  { name: "LG Service Center", percent: 10, color: "#2a9d8f" },
  { name: "Tech", percent: 10, color: "#e0a030" },
  { name: "Tech Tammina", percent: 10, color: "#6b5fbf" },
  { name: "TT office", percent: 30, color: "#c4566a" },
  { name: "Voltas", percent: 10, color: "#7a8ca5" },
];


// One shared palette for every chart (steel blue, teal, amber, indigo, rose, slate)
const chartPalette = [
  "#3b6fb6",
  "#2a9d8f",
  "#e0a030",
  "#6b5fbf",
  "#c4566a",
  "#7a8ca5",
];


const subscriptionValues = [
  { name: "Category 1", value: 19 },
  { name: "LG Service Center", value: 15 },
  { name: "Tech", value: 22 },
  { name: "Tech Tammina", value: 25 },
  { name: "TT office", value: 0 },
  { name: "Voltas", value: 18 },
];


const baselineSubscriptionCount = subscriptionValues.reduce(
  (sum, item) => sum + item.value,
  0,
);


const monthlyValues = [
  { month: "May", value: 2 },
  { month: "Jun", value: 3 },
  { month: "Jul", value: 1 },
  { month: "Aug", value: 4 },
  { month: "Sep", value: 2 },
  { month: "Oct", value: 3 },
];


const yearlyValues = [
  { month: "2021", value: 18 },
  { month: "2022", value: 24 },
  { month: "2023", value: 31 },
  { month: "2024", value: 38 },
  { month: "2025", value: 45 },
  { month: "2026", value: 15 },
];


const ticketVolumeValues = [
  { month: "Jan", created: 1320, solved: 580 },
  { month: "Feb", created: 1380, solved: 530 },
  { month: "Mar", created: 1320, solved: 820 },
  { month: "Apr", created: 1820, solved: 450 },
  { month: "May", created: 1410, solved: 730 },
  { month: "Jun", created: 1600, solved: 940 },
  { month: "Sep", created: 1940, solved: 1000 },
  { month: "Oct", created: 1525, solved: 620 },
];
const fallbackTicketAverages = { created: 5, solved: 1995 };
const ticketStatusValues = [
  { label: "New", value: 105, color: "#38bdf8" },
  { label: "Open", value: 24, color: "#0ea5e9" },
  { label: "Pending", value: 45, color: "#fbbf24" },
  { label: "Hold", value: 38, color: "#fb5b5b" },
  { label: "Resolved", value: 21, color: "#65d53f" },
];
const ticketInboxValues = [
  { label: "Support", value: 105, color: "#7c3aed" },
  { label: "Julie", value: 24, color: "#ddd6fe" },
  { label: "Kevin", value: 45, color: "#c4b5fd" },
  { label: "Account Manager", value: 38, color: "#a78bfa" },
  { label: "John", value: 21, color: "#ede9fe" },
];
const overdueTickets = [
  ["michaelboyd@gmail.com", "Dec 30, 5:56 AM"],
  ["ruben carter@kim.com", "Dec 28, 2:46 PM"],
  ["kingdavid@yahoo.com", "Dec 25, 5:00 AM"],
  ["pamela63@gmail.com", "Dec 21, 3:05 AM"],
  ["hwilliams@gmail.com", "Dec 18, 6:48 PM"],
  ["prectorjennifer@yahoo.com", "Dec 10, 8:56 AM"],
  ["donaldherrera@hotmail.com", "Dec 06, 1:56 AM"],
];


const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];


function groupMonthlyValues(monthsPerGroup) {
  const groups = new Map();


  monthlyValues.forEach(({ month, value }) => {
    const monthIndex = monthNames.indexOf(month);
    const groupIndex = Math.floor(monthIndex / monthsPerGroup);
    const group = groups.get(groupIndex) || { value: 0 };
    group.value += value;
    groups.set(groupIndex, group);
  });


  return Array.from(groups, ([groupIndex, group]) => ({
    month:
      monthsPerGroup === 3
        ? `Q${groupIndex + 1}`
        : `${monthNames[groupIndex * monthsPerGroup]}-${monthNames[
            Math.min((groupIndex + 1) * monthsPerGroup - 1, monthNames.length - 1)
          ]}`,
    value: group.value,
  }));
}


const quarterlyValues = groupMonthlyValues(3);


const initialOrganizationForm = {
  planId: "1",
  organizationCode: "",
  organizationName: "",
  websiteURL: "",
  industry: "",
  contactEmail: "",
  phone: "",
  address: "",
  status: "",
  currentPlanId: "",
  customerId: "",
  subscriptionStartDate: "",
  subscriptionEndDate: "",
  isActive: false,
};


function buildOrganizationPayload(form) {
  return {
    ...form,
    planId: Number(form.planId),
    currentPlanId: form.currentPlanId ? Number(form.currentPlanId) : null,
    customerId: form.customerId ? Number(form.customerId) : null,
    amount: form.amount === "" ? null : Number(form.amount),
  };
}


const initialSubscriptionForm = {
  organizationId: "2",
  planName: "",
  monthlyPrice: "",
  maxUsers: "",
  maxAssets: "",
  predictiveMaintenance: false,
  billingModule: false,
  customerPortal: false,
  aiAssistant: false,
  isActive: false,
};


async function readResponseBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}


function unwrap(data) {
  let value = data;
  for (let depth = 0; depth < 3 && value && !Array.isArray(value); depth += 1) {
    const nested = value.response ?? value.data ?? value.result;
    if (!nested || typeof nested !== "object") break;
    value = nested;
  }
  return value;
}


function getMetric(data, keys) {
  const value = unwrap(data);
  if (value && typeof value === "object") {
    const record = Array.isArray(value) ? value[0] : value;
    if (record && typeof record === "object") {
      const matchingKey = Object.keys(record).find((key) =>
        keys.includes(key.toLowerCase()),
      );
      if (
        matchingKey &&
        record[matchingKey] !== null &&
        record[matchingKey] !== ""
      ) {
        return record[matchingKey];
      }
    }
  }
  if (typeof value === "string") {
    for (const key of keys) {
      const match = value.match(
        new RegExp(`${key}\\s*[:=]\\s*["']?([\\d.]+)`, "i"),
      );
      if (match) return match[1];
    }
  }
  return null;
}


function getRequestCount(data) {
  const value = unwrap(data);
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const records = value.serviceRequests ?? value.requests ?? value.items;
    if (Array.isArray(records)) return records.length;
    const count = value.totalCount ?? value.count ?? value.total;
    if (count !== undefined) return count;
  }
  return null;
}


function displayDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}


function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}


function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


function readSubscriptionCountAdjustment() {
  try {
    const saved = Number(
      window.localStorage.getItem(SUBSCRIPTION_COUNT_ADJUSTMENT_KEY),
    );
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}


function saveSubscriptionCountAdjustment(adjustment) {
  try {
    window.localStorage.setItem(
      SUBSCRIPTION_COUNT_ADJUSTMENT_KEY,
      String(adjustment),
    );
  } catch {
    return;
  }
}


function FieldFlowBrand() {
  return (
    <div className="sphere-brand">
      <div className="sphere-brand-mark">
        <Globe2 size={24} />
        <Building2 size={14} />
      </div>
      <div>
        <strong>Field Flow FSM</strong>
        <span>FIELD SERVICE MANAGEMENT</span>
      </div>
    </div>
  );
}

function getLoggedInName(user) {
  const name = [
    user?.name,
    user?.displayName,
    user?.fullName,
    user?.userFullName,
    user?.userName,
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    [user?.first_name, user?.last_name].filter(Boolean).join(" "),
  ].find((value) => typeof value === "string" && value.trim());

  if (name) return name.trim();

  const username =
    typeof user?.email === "string"
      ? user.email.split("@")[0].replace(/[._-]+/g, " ")
      : "";
  return username
    ? username.replace(/\b[a-z]/g, (character) => character.toUpperCase())
    : "Admin";
}


/* ---------- helpers ---------- */


// Counts a number up once on load (skipped if the user prefers reduced motion)
function useCountUp(target, duration = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return target === null || target === undefined ? "—" : n;
}


// Flips to true after first paint so CSS transitions can animate from 0
function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}


function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const w = 160;
  const h = 56;
  const pad = 6;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${h} ${line} ${x(values.length - 1)},${h}`;
  const last = values.length - 1;


  return (
    <svg
      className="kx-spark"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="kx-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" stopOpacity=".45" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#kx-spark-fill)" />
      <polyline points={line} className="kx-spark-line" />
      <circle cx={x(last)} cy={y(values[last])} r="4" className="kx-spark-dot" />
    </svg>
  );
}


/* ---------- 1. Hero: total clients + active/inactive split + trend ---------- */


function HeroKpi({ total, active, inactive, trend }) {
  const ready = useReady();
  const shown = useCountUp(total);
  const sum = (active ?? 0) + (inactive ?? 0);
  const activePct = sum ? (active / sum) * 100 : 0;
  const inactivePct = sum ? (inactive / sum) * 100 : 0;
  const values = trend.map((t) => t.value);
  const delta =
    trend.length > 1
      ? trend[trend.length - 1].value - trend[trend.length - 2].value
      : null;
  const prevMonth = trend.length > 1 ? trend[trend.length - 2].month : "";


  return (
    <article className="kx-card kx-hero">
      <div className="kx-row">
        <span className="kx-icon">
          <Users size={16} />
        </span>
        <span className="kx-label">Total clients</span>
        {delta !== null && (
          <span className={`kx-delta ${delta >= 0 ? "is-up" : "is-down"}`}>
            <TrendingUp size={13} />
            {delta >= 0 ? `+${delta}` : delta} vs {prevMonth}
          </span>
        )}
      </div>


      <div className="kx-hero-main">
        <div>
          <div className="kx-number">{shown}</div>
          <div className="kx-caption">Organizations on record</div>
        </div>
        <div className="kx-spark-wrap">
          <Sparkline values={values} />
          <span className="kx-spark-caption">Onboarded, last 6 months</span>
        </div>
      </div>


      <div>
        <div
          className="kx-split"
          role="img"
          aria-label={`${active ?? 0} active, ${inactive ?? 0} inactive`}
        >
          <i
            className="kx-split-active"
            style={{ width: ready ? `${activePct}%` : 0 }}
          />
          <i
            className="kx-split-inactive"
            style={{ width: ready ? `${inactivePct}%` : 0 }}
          />
        </div>
        <div className="kx-split-legend">
          <span>
            <b className="kx-key kx-key-active" /> {active ?? "—"} active
          </span>
          <span>
            <b className="kx-key kx-key-inactive" /> {inactive ?? "—"} inactive
          </span>
        </div>
      </div>
    </article>
  );
}


/* ---------- 2. Service requests (live from your API) ---------- */


// function RequestsKpi({ requests }) {
//   const shown = useCountUp(requests);


//   return (
//     <article className="kx-card kx-requests">
//       <LifeBuoy className="kx-watermark" size={120} aria-hidden="true" />
//       <div className="kx-row">
//         <span className="kx-icon kx-icon-violet">
//           <LifeBuoy size={16} />
//         </span>
//         <span className="kx-label">Service requests</span>
//       </div>


//       <div>
//         <div className="kx-number kx-number-md">{shown}</div>
//       </div>


//       <div className="kx-caption">Organization 2, from the service desk</div>
//     </article>
//   );
// }


/* ---------- Grid ---------- */


export function KpiGrid({ total, active, inactive, requests, trend = [] }) {
  return (
    <section className="kx-grid" aria-label="Organization overview">
      <HeroKpi
        total={total}
        active={active}
        inactive={inactive}
        trend={trend}
      />
      {/* <RequestsKpi requests={requests} /> */}
    </section>
  );
}


/* ---------- Second KPI row: insights from subscription + onboarding data ---------- */


function InsightStrip({ subscriptions, monthly, totalSubscriptions }) {
  const ready = useReady();
  const total = totalSubscriptions;
  const onboarded = monthly.reduce((sum, item) => sum + item.value, 0);
  const shownTotal = useCountUp(total);
  const shownOnboarded = useCountUp(onboarded);
  if (!subscriptions.length || !monthly.length) return null;


  const top = subscriptions.reduce((a, b) => (b.value > a.value ? b : a));
  const maxSub = Math.max(...subscriptions.map((item) => item.value), 1);
  const maxMonth = Math.max(...monthly.map((item) => item.value), 1);
  const best = monthly.reduce((a, b) => (b.value > a.value ? b : a));
  const unsubscribed = subscriptions.filter((item) => item.value === 0);
  const average = total / subscriptions.length;
  const topShare = total ? Math.round((top.value / total) * 100) : 0;
  const allCovered = unsubscribed.length === 0;


  return (
    <section className="ix-grid" aria-label="Subscription and onboarding insights">
      <article className="ix-card" style={{ "--ix": "#2563eb" }}>
        <div className="ix-head">
          <span className="ix-icon">
            <Layers size={16} />
          </span>
          <span className="ix-label">Total subscriptions</span>
        </div>
        <div className="ix-value">{shownTotal}</div>
        <div className="ix-bars" aria-hidden="true">
          {subscriptions.map((item, index) => (
            <i
              key={item.name}
              className={item === top ? "is-top" : ""}
              title={`${item.name}: ${item.value}`}
              style={{
                "--c": chartPalette[index % chartPalette.length],
                height: ready ? `${Math.max(6, (item.value / maxSub) * 100)}%` : "0%",
              }}
            />
          ))}
        </div>
        <div className="ix-foot">Across {subscriptions.length} organizations</div>
      </article>


      <article className="ix-card" style={{ "--ix": "#0d9488" }}>
        <div className="ix-head">
          <span className="ix-icon">
            <Gauge size={16} />
          </span>
          <span className="ix-label">Average per client</span>
        </div>
        <div className="ix-value">{average.toFixed(1)}</div>
        <div className="ix-meter" aria-hidden="true">
          <i style={{ width: ready ? `${(average / maxSub) * 100}%` : 0 }} />
          <b style={{ left: "100%" }} />
        </div>
        <div className="ix-foot">Highest client holds {top.value}</div>
      </article>


      <article className="ix-card" style={{ "--ix": "#7c3aed" }}>
        <div className="ix-head">
          <span className="ix-icon">
            <Crown size={16} />
          </span>
          <span className="ix-label">Top organization</span>
        </div>
        <div className="ix-value ix-value-text" title={top.name}>
          {top.name}
        </div>
        <div className="ix-meter" aria-hidden="true">
          <i style={{ width: ready ? `${topShare}%` : 0 }} />
        </div>
        <div className="ix-foot">
          {top.value} subscriptions, {topShare}% of all
        </div>
      </article>


      <article
        className={`ix-card ${allCovered ? "is-ok" : "is-warn"}`}
        style={{ "--ix": allCovered ? "#16a34a" : "#d97706" }}
      >
        <div className="ix-head">
          <span className="ix-icon">
            {allCovered ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </span>
          <span className="ix-label">Needs attention</span>
        </div>
        <div className="ix-value">{unsubscribed.length}</div>
        <div className="ix-tags">
          {allCovered ? (
            <span className="ix-tag is-ok">All clients subscribed</span>
          ) : (
            unsubscribed.map((item) => (
              <span className="ix-tag" key={item.name}>
                {item.name}
              </span>
            ))
          )}
        </div>
        <div className="ix-foot">
          {allCovered ? "Nothing to follow up" : "No active subscription yet"}
        </div>
      </article>


      <article className="ix-card" style={{ "--ix": "#e11d48" }}>
        <div className="ix-head">
          <span className="ix-icon">
            <Rocket size={16} />
          </span>
          <span className="ix-label">Onboarded, 6 months</span>
        </div>
        <div className="ix-value">{shownOnboarded}</div>
        <div className="ix-bars is-small" aria-hidden="true">
          {monthly.map((item, index) => (
            <i
              key={item.month}
              className={item === best ? "is-top" : ""}
              title={`${item.month}: ${item.value}`}
              style={{
                "--c": chartPalette[index % chartPalette.length],
                height: ready ? `${Math.max(8, (item.value / maxMonth) * 100)}%` : "0%",
              }}
            />
          ))}
        </div>
        <div className="ix-foot">
          Best month: {best.month} ({best.value})
        </div>
      </article>
    </section>
  );
}


function DonutChart() {
  let current = 0;
  const stops = organizationSlices
    .map((slice) => {
      const start = current;
      current += slice.percent;
      return `${slice.color} ${start}% ${current}%`;
    })
    .join(", ");


  return (
    <div className="sphere-donut-layout">
      <div className="sphere-donut-wrap">
        <div
          className="sphere-donut"
          style={{ background: `conic-gradient(${stops})` }}
          aria-label="Organizations by category"
        />
        <div className="sphere-donut-center">
          <strong>{organizationSlices.length}</strong>
          <span>Categories</span>
        </div>
      </div>
      <ul className="sphere-legend">
        {organizationSlices.map((slice) => (
          <li key={slice.name}>
            <span style={{ backgroundColor: slice.color }} />
            <span>{slice.name}</span>
            <b>{slice.percent}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}


function SubscriptionChart() {
  const topValue = Math.max(...subscriptionValues.map((item) => item.value));
  return (
    <div
      className="sphere-bar-chart"
      aria-label="Subscriptions by organization"
    >
      <div className="sphere-bar-grid">
        {[30, 20, 10, 0].map((tick) => (
          <div className="sphere-bar-gridline" key={tick}>
            <span>{tick}</span>
            <i />
          </div>
        ))}
        <div className="sphere-bars">
          {subscriptionValues.map((item, index) => (
            <div className="sphere-bar-column" key={item.name}>
              <div
                className={`sphere-bar-track${item.value === topValue ? " is-top" : ""
                  }${item.value === 0 ? " is-zero" : ""}`}
                style={{ "--c": chartPalette[index % chartPalette.length] }}
              >
                <span style={{ height: `${(item.value / 30) * 100}%` }}>
                  <em>{item.value}</em>
                </span>
              </div>
              <span className="sphere-bar-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function OnboardingLineChart({ values, period }) {
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 48, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const peak = Math.max(0, ...values.map((item) => item.value));
  const tickStep = Math.max(1, Math.ceil(Math.max(peak, 1) / 4));
  const axisMax = tickStep * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => axisMax - index * tickStep);
  const points = values.map((item, index) => ({
    ...item,
    x:
      values.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index * plotWidth) / (values.length - 1),
    y: padding.top + plotHeight * (1 - item.value / axisMax),
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");


  return (
    <div className="monthly-chart">
      <svg
        className="monthly-line-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${period} onboarding organizations line chart`}
      >
        <title>{period} onboarding organizations</title>
        <text
          className="axis"
          transform={`translate(14 ${padding.top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Organizations
        </text>
        {ticks.map((tick, index) => {
          const y = padding.top + (index * plotHeight) / (ticks.length - 1);
          return (
            <g className="grid" key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
              <text className="axis" x={padding.left - 10} y={y + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        <path className="line" d={linePath} />
        {points.map((point) => (
          <g key={point.month}>
            <circle className="dot" cx={point.x} cy={point.y} r="5" />
            <text className="val" x={point.x} y={point.y - 12} textAnchor="middle">
              {point.value}
            </text>
            <text
              className="axis"
              x={point.x}
              y={height - 12}
              textAnchor="middle"
            >
              {point.month}
            </text>
            <title>{`${point.month}: ${point.value} organizations`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}


function MonthlyOnboardingPanel() {
  const [view, setView] = useState("monthly");
  const views = {
    monthly: { label: "Monthly", unit: "month", values: monthlyValues },
    quarterly: {
      label: "Quarterly",
      unit: "quarter",
      values: quarterlyValues,
    },
    yearly: { label: "Yearly", unit: "year", values: yearlyValues },
  };
  const activeView = views[view];
  const { values, label: period, unit } = activeView;
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const best = values.reduce((a, b) => (b.value > a.value ? b : a));
  const average = (total / values.length).toFixed(1);


  return (
    <article className="sphere-month-panel">
      <div className="sphere-panel-head">
        <div className="sphere-panel-title">
          <h2>{period} Onboarding Organizations</h2>
          <p>New organizations added by {unit}</p>
        </div>
        <label className="sphere-period-control">
          <span>View period</span>
          <select
            className="sphere-period-select"
            aria-label="Onboarding time period"
            value={view}
            onChange={(event) => setView(event.target.value)}
          >
            {Object.entries(views).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sphere-chips">
        <span>
          <b>{total}</b> total
        </span>
        <span>
          <b>{average}</b> avg / {unit}
        </span>
        <span>
          Peak <b>{best.month}</b> ({best.value})
        </span>
      </div>
      <OnboardingLineChart values={values} period={period} />
    </article>
  );
}


function AverageTicketsPanel({ createdAverage, solvedAverage }) {
  const [period, setPeriod] = useState("monthly");
  const periods = {
    monthly: { label: "Monthly", values: ticketVolumeValues },
  };
  const values = periods[period].values;
  const maxValue = Math.max(...values.map((item) => item.created), 1);
  const displayedCreated = createdAverage ?? fallbackTicketAverages.created;
  const displayedSolved = solvedAverage ?? fallbackTicketAverages.solved;


  return (
    <article className="sphere-ticket-panel">
      <div className="sphere-ticket-summary">
        <div className="sphere-panel-head">
          <div className="sphere-panel-title">
            <h2>Average Tickets Created</h2>
            <p>Ticket volume compared with tickets solved</p>
          </div>
          <label className="sphere-chart-select">
            <span className="sr-only">Ticket period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {Object.entries(periods).map(([key, option]) => (
                <option key={key} value={key}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
        </div>
        <div className="sphere-ticket-averages">
          <div>
            <span className="sphere-ticket-key is-created" />
            <span>Avg. Ticket Create</span>
            <strong>{displayedCreated.toLocaleString()}</strong>
          </div>
          <div>
            <span className="sphere-ticket-key is-solved" />
            <span>Avg. Ticket Solved</span>
            <strong>{displayedSolved.toLocaleString()}</strong>
          </div>
        </div>
      </div>


      <div
        className="sphere-ticket-chart"
        role="img"
        aria-label="Monthly average tickets created and solved"
      >
        <div className="sphere-ticket-axis">
          {[2000, 1500, 1000, 500, 0].map((tick) => <span key={tick}>{tick}</span>)}
        </div>
        <div className="sphere-ticket-bars">
          {values.map((item) => (
            <div className="sphere-ticket-column" key={item.month}>
              <div className="sphere-ticket-track">
                <span
                  className="is-created"
                  style={{ height: `${(item.created / maxValue) * 100}%` }}
                  title={`${item.month}: ${item.created} tickets created`}
                />
                <span
                  className="is-solved"
                  style={{ height: `${(item.solved / maxValue) * 100}%` }}
                  title={`${item.month}: ${item.solved} tickets solved`}
                />
              </div>
              <span className="sphere-ticket-month">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}


function TicketOperationsPanel() {
  const statusTotal = ticketStatusValues.reduce((sum, item) => sum + item.value, 0);
  const statusStops = ticketStatusValues.reduce(
    (stops, item) => {
      const start = stops.current;
      stops.current += (item.value / statusTotal) * 100;
      stops.values.push(`${item.color} ${start}% ${stops.current}%`);
      return stops;
    },
    { current: 0, values: [] },
  ).values.join(", ");
  const inboxTotal = ticketInboxValues.reduce((sum, item) => sum + item.value, 0);
  const inboxStops = ticketInboxValues.reduce(
    (stops, item) => {
      const start = stops.current;
      stops.current += (item.value / inboxTotal) * 100;
      stops.values.push(`${item.color} ${start}% ${stops.current}%`);
      return stops;
    },
    { current: 0, values: [] },
  ).values.join(", ");
  const priorityValues = [
    { label: "High", value: 305, color: "#fb5b5b" },
    { label: "Normal", value: 737, color: "#fbbf24" },
    { label: "Low", value: 51, color: "#d1d5db" },
  ];
  const maxPriority = Math.max(...priorityValues.map((item) => item.value));


  return (
    <article className="sphere-ticket-kpi-panel">
      <div className="sphere-ticket-kpi-grid">
        <section className="sphere-ticket-kpi-card">
          <div className="sphere-ticket-kpi-head">
            <h2>Ticket Status</h2>
            <span>Last 7 Days <ChevronDown size={12} /></span>
          </div>
          <div className="sphere-ticket-donut-layout">
            <div className="sphere-ticket-donut" style={{ background: `conic-gradient(${statusStops})` }}>
              <strong>Total<br />{statusTotal}</strong>
            </div>
            <ul className="sphere-ticket-legend">
              {ticketStatusValues.map((item) => (
                <li key={item.label}><i style={{ background: item.color }} />{item.label}<b>{item.value}</b></li>
              ))}
            </ul>
          </div>
        </section>


        <section className="sphere-ticket-kpi-card">
          <div className="sphere-ticket-kpi-head">
            <h2>Ticket by Inbox</h2>
            <span>Last 7 Days <ChevronDown size={12} /></span>
          </div>
          <div className="sphere-ticket-donut-layout">
            <div className="sphere-ticket-donut is-pie" style={{ background: `conic-gradient(${inboxStops})` }} aria-label="Tickets by inbox" />
            <ul className="sphere-ticket-legend">
              {ticketInboxValues.map((item) => (
                <li key={item.label}><i style={{ background: item.color }} />{item.label}<b>{item.value}</b></li>
              ))}
            </ul>
          </div>
        </section>


        <section className="sphere-ticket-kpi-card">
          <div className="sphere-ticket-kpi-head">
            <h2>Ticket by priority</h2>
            <span>Last 7 Days <ChevronDown size={12} /></span>
          </div>
          <div className="sphere-priority-chart" aria-label="Tickets by priority">
            {priorityValues.map((item) => (
              <div className="sphere-priority-column" key={item.label}>
                <strong>{item.value}</strong>
                <i style={{ height: `${(item.value / maxPriority) * 100}%`, background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>


        <section className="sphere-ticket-kpi-card">
          <div className="sphere-ticket-kpi-head">
            <h2>Average Ticket Response Time</h2>
            <span>Last 7 Days <ChevronDown size={12} /></span>
          </div>
          <div className="sphere-response-chart" aria-label="Average ticket response time">
            <span>First Response<br />Time</span><i style={{ width: "72%" }} /><b>7</b>
            <span>Resolution<br />Time</span><i style={{ width: "42%" }} /><b>4</b>
          </div>
        </section>
      </div>


      <section className="sphere-overdue-card">
        <div className="sphere-ticket-kpi-head">
          <h2>Overdue Tickets (48)</h2>
          <span>Last 30 Days <ChevronDown size={12} /></span>
        </div>
        <ul>
          {overdueTickets.map(([email, date]) => (
            <li key={email}>
              <span className="sphere-overdue-avatar">{email[0].toUpperCase()}</span>
              <div><strong>{email}</strong><i /></div>
              <time>{date}</time>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}


function DataModal({ title, onClose, children, className = "" }) {
  return (
    <div
      className="sphere-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`sphere-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sphere-modal-title"
      >
        <header>
          <div>
            <span className="sphere-modal-icon">
              <Building2 size={20} />
            </span>
            <h2 id="sphere-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="sphere-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}


export function SuperAdminPortal({ user, onLogout }) {
  const [kpis, setKpis] = useState(null);
  const [requestCount, setRequestCount] = useState(null);
  const [totalSubscriptions, setTotalSubscriptions] = useState(
    () => baselineSubscriptionCount + readSubscriptionCountAdjustment(),
  );
  const [apiError, setApiError] = useState("");
  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [organizationForm, setOrganizationForm] = useState(
    initialOrganizationForm,
  );
  const [subscriptionForm, setSubscriptionForm] = useState(
    initialSubscriptionForm,
  );

  function updateOrganizationField(event) {
    const { name, value, type, checked } = event.target;
    setOrganizationForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }


  useEffect(() => {
    document.title = "Field Flow FSM | Super Admin";
    let cancelled = false;
    const headers = {
      "Appian-API-Key": APPIAN_API_KEY?.trim() || "",
      Accept: "application/json",
    };


    const loadDashboardData = async () => {
      if (!APPIAN_API_KEY?.trim()) {
        setApiError(
          "Configure REACT_APP_APPIAN_API_KEY to load live dashboard values.",
        );
        return;
      }


      const results = await Promise.allSettled([
        Promise.resolve()
          .then(() => fetch(KPI_API_URL, { headers }))
          .then(async (response) => {
            if (!response.ok)
              throw new Error(`KPI request failed (${response.status}).`);
            return readResponseBody(response);
          }),
        Promise.resolve()
          .then(() => fetch(SERVICE_REQUESTS_API_URL, { headers }))
          .then(async (response) => {
            if (!response.ok)
              throw new Error(
                `Service request request failed (${response.status}).`,
              );
            return readResponseBody(response);
          }),
      ]);


      if (cancelled) return;
      const errors = [];
      if (results[0].status === "fulfilled") setKpis(unwrap(results[0].value));
      else errors.push("KPI values could not be loaded.");
      if (results[1].status === "fulfilled") {
        setRequestCount(getRequestCount(results[1].value));
      } else {
        errors.push("Service requests could not be loaded.");
      }
      setApiError([...new Set(errors)].join(" "));
    };


    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);


  async function submitForm(event, endpoint, payload, successMessage) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (!APPIAN_API_KEY?.trim())
        throw new Error("Appian API key is not configured.");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Appian-API-Key": APPIAN_API_KEY.trim(),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await readResponseBody(response);
      if (!response.ok) {
        throw new Error(
          typeof result === "string"
            ? result
            : `Request failed (${response.status}).`,
        );
      }
      if (
        endpoint === ASSIGN_SUBSCRIPTION_API_URL ||
        (endpoint === ADD_ORGANIZATION_API_URL && payload.planName)
      ) {
        setTotalSubscriptions((count) => {
          const updatedCount = count + 1;
          saveSubscriptionCountAdjustment(
            updatedCount - baselineSubscriptionCount,
          );
          return updatedCount;
        });
      }
      setNotice(successMessage);
      setModal("");
    } catch (error) {
      setNotice(error.message || "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }


  const totalOrganizations = getMetric(kpis, [
    "totalorganizations",
    "totalorganization",
    "totalclients",
    "totalclient",
    "totalcount",
    "totalorgs",
  ]);
  const activeOrganizations = getMetric(kpis, [
    "activeorganizations",
    "activeorganization",
    "activeclients",
    "activeclient",
    "activecount",
    "activeorgs",
  ]);
  const inactiveOrganizations = getMetric(kpis, [
    "inactiveorganizations",
    "inactiveorganization",
    "inactiveclients",
    "inactiveclient",
    "inactivecount",
    "inactiveorgs",
  ]);
  const averageTicketsCreated = toNumber(getMetric(kpis, [
    "averageticketscreated",
    "averageticketcreated",
    "ticketcreatedaverage",
    "ticketcreateaverage",
  ]));
  const averageTicketsSolved = toNumber(getMetric(kpis, [
    "averageticketssolved",
    "averageticketsolved",
    "ticketsolvedaverage",
    "ticketsolveaverage",
  ]));

  const totalNum = toNumber(totalOrganizations);
  const apiInactiveCount = toNumber(inactiveOrganizations);
  const inactiveCount = apiInactiveCount || 2;
  const activeCount =
    totalNum === null
      ? toNumber(activeOrganizations)
      : Math.max(totalNum - inactiveCount, 0);


  const welcomeName = getLoggedInName(user);
  const completedSubscriptionFields = [
    subscriptionForm.planName,
    subscriptionForm.monthlyPrice,
    subscriptionForm.maxUsers,
    subscriptionForm.maxAssets,
  ].filter(Boolean).length;
  const subscriptionCompletion = Math.round(
    (completedSubscriptionFields / 4) * 100,
  );
  const organizationProfileFields = [
    organizationForm.organizationCode,
    organizationForm.organizationName,
    organizationForm.websiteURL,
    organizationForm.industry,
    organizationForm.contactEmail,
    organizationForm.phone,
    organizationForm.address,
    organizationForm.status,
    organizationForm.subscriptionStartDate,
    organizationForm.subscriptionEndDate,
    organizationForm.billingCycle,
    organizationForm.subscriptionStatus,
    organizationForm.amount,
  ];
  const completedOrganizationSubscriptionFields = organizationProfileFields.filter(
    Boolean,
  ).length;
  const organizationSubscriptionCompletion = Math.round(
    (completedOrganizationSubscriptionFields / organizationProfileFields.length) * 100,
  );


  return (
    <main className="sphere-admin-root">
      <div className="sphere-orb sphere-orb-1" aria-hidden="true" />
      <div className="sphere-orb sphere-orb-2" aria-hidden="true" />


      <header className="sphere-header">
        <FieldFlowBrand />
        <div className="sphere-header-actions">
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setModal("organization");
            }}
          >
            <Plus size={15} /> Add Organisation
          </button>
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setModal("subscription");
            }}
          >
            <Plus size={15} /> Add Subscription
          </button>
          <button
            type="button"
            className="sphere-user-button"
            aria-label={`${welcomeName} ${user?.role || "SuperAdmin"}`}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span>
              {welcomeName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            {welcomeName}
            <ChevronDown size={14} />
          </button>
          {profileOpen && (
            <div className="sphere-profile-menu" role="menu">
              <div>
                <strong>{welcomeName}</strong>
                <small>{user?.email}</small>
              </div>
              <button type="button" role="menuitem" onClick={onLogout}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>


      <section className="sphere-welcome">
        <div>
          <span className="sphere-eyebrow">
            <Sparkles size={13} /> Super Admin Console
          </span>
          <h1>
            {greeting()}, {welcomeName}
          </h1>
          <p>Centralized View of Organizational Operations and Performance</p>
        </div>
        <span className="sphere-date">{displayDate()}</span>
      </section>


      {apiError && (
        <p className="sphere-api-message" role="status">
          {apiError}
        </p>
      )}
      {notice && (
        <p className="sphere-notice" role="status">
          {notice}
        </p>
      )}


      <KpiGrid
        total={totalNum}
        active={activeCount}
        inactive={inactiveCount}
        requests={toNumber(requestCount)}
        trend={monthlyValues}
      />


      <InsightStrip
        subscriptions={subscriptionValues}
        monthly={monthlyValues}
        totalSubscriptions={totalSubscriptions}
      />


      <section className="sphere-ticket-charts" aria-label="Ticket performance">
        <AverageTicketsPanel
          createdAverage={averageTicketsCreated}
          solvedAverage={averageTicketsSolved}
        />
        <TicketOperationsPanel />
      </section>


      <section className="sphere-primary-charts">
        <article className="sphere-chart-panel">
          <div className="sphere-panel-title">
            <h2>Organizations</h2>
            <p>Share of clients by category</p>
          </div>
          <DonutChart />
        </article>
        <article className="sphere-chart-panel">
          <div className="sphere-panel-title">
            <h2>Subscriptions</h2>
            <p>Active subscriptions per organization</p>
          </div>
          <SubscriptionChart />
        </article>
      </section>


      <section
        className="sphere-onboarding-charts sphere-onboarding-single"
        aria-label="Monthly onboarding organizations"
      >
        <MonthlyOnboardingPanel />
      </section>


      <footer className="sphere-footer">
        <span>
          {requestCount === null
            ? "Service requests for organization 2"
            : `${requestCount} service requests for organization 2`}
        </span>
      </footer>


      {modal === "organization" && (
        <DataModal
          title="Organization Subscription Management"
          onClose={() => setModal("")}
          className="sphere-subscription-modal"
        >
          <p className="sphere-modal-description">
            Central repository for Organization Subscription Management used in
            request routing and reporting.
          </p>
          <form
            className="sphere-subscription-layout"
            onSubmit={(event) =>
              submitForm(
                event,
                ADD_ORGANIZATION_API_URL,
                buildOrganizationPayload(organizationForm),
                "Organisation created successfully.",
              )
            }
          >
            <div className="sphere-subscription-fields">
              <label>
                Plan ID *
                <input
                  required
                  min="1"
                  type="number"
                  name="planId"
                  value={organizationForm.planId}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Organization Code
                <input
                  name="organizationCode"
                  value={organizationForm.organizationCode}
                  onChange={updateOrganizationField}
                />
              </label>
              <label className="sphere-field-full">
                Organization Name *
                <input
                  required
                  name="organizationName"
                  value={organizationForm.organizationName}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Website URL
                <input
                  type="url"
                  name="websiteURL"
                  value={organizationForm.websiteURL}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Industry
                <input
                  name="industry"
                  value={organizationForm.industry}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Contact Email
                <input
                  type="email"
                  name="contactEmail"
                  value={organizationForm.contactEmail}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={organizationForm.phone}
                  onChange={updateOrganizationField}
                />
              </label>
              <label className="sphere-field-full">
                Address
                <input
                  name="address"
                  value={organizationForm.address}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  value={organizationForm.status}
                  onChange={updateOrganizationField}
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label>
                Current Plan ID
                <input
                  min="0"
                  type="number"
                  name="currentPlanId"
                  value={organizationForm.currentPlanId}
                  onChange={updateOrganizationField}
                />
              </label>
              <label>
                Customer ID
                <input
                  min="0"
                  type="number"
                  name="customerId"
                  value={organizationForm.customerId}
                  onChange={updateOrganizationField}
                />
              </label>
              <div className="sphere-form-row">
                <label>
                  Subscription Start Date
                  <input
                    type="date"
                    name="subscriptionStartDate"
                    value={organizationForm.subscriptionStartDate}
                    onChange={updateOrganizationField}
                  />
                </label>
                <label>
                  Subscription End Date
                  <input
                    type="date"
                    name="subscriptionEndDate"
                    value={organizationForm.subscriptionEndDate}
                    onChange={updateOrganizationField}
                  />
                </label>
              </div>
              <label>
                Billing Cycle
                <select
                  name="billingCycle"
                  value={organizationForm.billingCycle}
                  onChange={updateOrganizationField}
                >
                  <option value="">Select cycle</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </label>
              <label>
                Subscription Status
                <select
                  name="subscriptionStatus"
                  value={organizationForm.subscriptionStatus}
                  onChange={updateOrganizationField}
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  value={organizationForm.amount}
                  onChange={updateOrganizationField}
                />
              </label>
              <label className="sphere-feature-toggle">
                <span>Is Active</span>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={organizationForm.isActive}
                  onChange={updateOrganizationField}
                />
              </label>
            </div>
            <aside className="sphere-subscription-preview">
              <h3>Preview</h3>
              <section className="sphere-preview-card">
                <h4>Profile Completion</h4>
                <span>{organizationSubscriptionCompletion}%</span>
                <progress
                  value={organizationSubscriptionCompletion}
                  max="100"
                  aria-label="Organization profile completion"
                />
              </section>
              <section className="sphere-preview-card sphere-plan-preview">
                <h4>Organization Preview</h4>
                <strong>
                  {organizationForm.organizationName || "Organization name"}
                </strong>
                <div>
                  <span>
                    <b>Plan ID</b>
                    <small>{organizationForm.planId || "-"}</small>
                  </span>
                  <span>
                    <b>Current Plan ID</b>
                    <small>{organizationForm.currentPlanId || "-"}</small>
                  </span>
                  <span>
                    <b>Amount</b>
                    <small>{organizationForm.amount || "-"}</small>
                  </span>
                </div>
              </section>
            </aside>
            <div className="sphere-form-actions">
              <button
                type="button"
                className="sphere-secondary"
                onClick={() => setModal("")}
              >
                Back
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create Org"}
              </button>
            </div>
          </form>
        </DataModal>
      )}


      {modal === "subscription" && (
        <DataModal
          title="Plan Details"
          onClose={() => setModal("")}
          className="sphere-subscription-modal"
        >
          <p className="sphere-modal-description">
            Basic identification for this subscription tier
          </p>
          <form
            className="sphere-subscription-layout"
            onSubmit={(event) =>
              submitForm(
                event,
                ASSIGN_SUBSCRIPTION_API_URL,
                subscriptionForm,
                "Subscription assigned successfully.",
              )
            }
          >
            <div className="sphere-subscription-fields">
              <label className="sphere-field-full">
                Plan Name *
                <input
                  required
                  type="text"
                  placeholder="Plan Name"
                  value={subscriptionForm.planName}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      planName: event.target.value,
                    })
                  }
                />
              </label>
              <label className="sphere-field-full">
                Monthly Price *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monthly Price"
                  value={subscriptionForm.monthlyPrice}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      monthlyPrice: event.target.value,
                    })
                  }
                />
              </label>
              <div className="sphere-form-row">
                <label>
                  Maximum Users *
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Maximum Users"
                    value={subscriptionForm.maxUsers}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        maxUsers: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Maximum Assets *
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Maximum Assets"
                    value={subscriptionForm.maxAssets}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        maxAssets: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {[
                ["predictiveMaintenance", "Predictive Maintenance"],
                ["billingModule", "Billing Module"],
                ["customerPortal", "Customer Portal"],
                ["aiAssistant", "AI Assistant"],
              ].map(([field, label]) => (
                <label className="sphere-feature-toggle" key={field}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={subscriptionForm[field]}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        [field]: event.target.checked,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <aside className="sphere-subscription-preview">
              <h3>Preview</h3>
              <section className="sphere-preview-card">
                <h4>PROFILE COMPLETION</h4>
                <span>{subscriptionCompletion}%</span>
                <progress
                  value={subscriptionCompletion}
                  max="100"
                  aria-label="Subscription profile completion"
                />
              </section>
              <section className="sphere-preview-card sphere-plan-preview">
                <strong>
                  Plan Name : {subscriptionForm.planName || "------"}
                </strong>
                <p>
                  <b>$ {subscriptionForm.monthlyPrice || "0"}</b> /month
                </p>
                <div>
                  <span>
                    <b>Users</b>
                    <small>{subscriptionForm.maxUsers || "------"}</small>
                  </span>
                  <span>
                    <b>Assets</b>
                    <small>{subscriptionForm.maxAssets || "------"}</small>
                  </span>
                </div>
                <label className="sphere-active-toggle">
                  <span>Is Active</span>
                  <input
                    type="checkbox"
                    checked={subscriptionForm.isActive}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  <small>Available to new subscribers</small>
                </label>
              </section>
            </aside>
            <div className="sphere-form-actions">
              <button
                type="button"
                className="sphere-secondary"
                onClick={() => setModal("")}
              >
                Cancel
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create Plan"}
              </button>
            </div>
          </form>
        </DataModal>
      )}
    </main>
  );
}

