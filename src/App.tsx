import { useEffect, useMemo, useState } from "react";

const LOGO = "https://i.imgur.com/T0JGkj4.png";
const SUPABASE_URL = "https://wcrzzoigetsnjgcmbvqr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjcnp6b2lnZXRzbmpnY21idnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzM4NDEsImV4cCI6MjA5MzQ0OTg0MX0.X7CE1I2OJPnMrBNlHqO5ufCC7zu4QyVGfYoTiIWm1gE";

type Role = "Admin" | "Vorstand" | "Trainer" | "Mitglied";
type Category = "Platz" | "Kabine" | "Raum" | "Sperre";

type User = {
  id?: string;
  name: string;
  email?: string;
  role: Role;
  team?: string | null;
  phone?: string;
};

type Booking = {
  id: string | number;
  category: Category;
  resource: string;
  team?: string;
  time: string;
  reason?: string;
  weekly?: boolean;
};

type Profile = {
  id: string;
  name?: string;
  email?: string;
  role?: Role;
  team?: string;
  phone?: string;
};

const teams = ["1. Mannschaft", "2. Mannschaft", "A-Jugend", "B-Jugend", "F-Jugend"];

const teamColors: Record<string, string> = {
  "1. Mannschaft": "#dc2626",
  "2. Mannschaft": "#2563eb",
  "A-Jugend": "#16a34a",
  "B-Jugend": "#f59e0b",
  "F-Jugend": "#9333ea",
};

const areas: Record<string, string[]> = {
  Platz: ["Hauptplatz komplett", "Hauptplatz vordere Hälfte", "Hauptplatz hintere Hälfte", "Kleinfeld"],
  Kabine: ["Kabine 1", "Kabine 2", "Kabine 3", "Kabine 4"],
  Raum: ["Besprechungsraum", "Massageraum", "OBO Lounge"],
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function authLogin(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function addHours(time: string, hours = 2) {
  const [h, m] = time.split(":").map(Number);
  return `${String(h + hours).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function timeRange(item: Booking) {
  const [start, end] = item.time.split("–");
  return { start: toMinutes(start), end: toMinutes(end) };
}

function overlaps(a: Booking, b: Booking) {
  const x = timeRange(a);
  const y = timeRange(b);
  return x.start < y.end && y.start < x.end;
}

function areaConflict(a: Booking, b: Booking) {
  if (a.resource === b.resource) return true;

  const group = ["Hauptplatz komplett", "Hauptplatz vordere Hälfte", "Hauptplatz hintere Hälfte"];

  return (
    group.includes(a.resource) &&
    group.includes(b.resource) &&
    (a.resource === "Hauptplatz komplett" || b.resource === "Hauptplatz komplett")
  );
}

function teamForProfile(p: Profile) {
  return p.team || (p.role === "Trainer" ? "1. Mannschaft" : "");
}

const css = `
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f4f5}
.page{min-height:100vh;display:flex;justify-content:center;align-items:center;padding:16px}
.phone{width:100%;max-width:430px;min-height:860px;background:white;border-radius:34px;overflow:hidden;box-shadow:0 30px 80px #0004}
.login{min-height:860px;padding:28px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#063B24,#007A3D)}
.loginCard{background:#fffffff5;border-radius:30px;padding:26px 22px;width:100%;text-align:center;box-shadow:0 24px 60px #0005}
.logoBig{width:112px;height:112px;border-radius:50%;object-fit:cover;border:5px solid white;box-shadow:0 12px 28px #0003}
.title{font-weight:1000;font-size:24px;color:#063B24;letter-spacing:-.04em}
.sub{font-size:13px;color:#64748b;margin-top:6px}
.header{padding:22px 18px 18px;background:linear-gradient(135deg,#063B24,#007A3D);color:white;border-radius:0 0 30px 30px}
.top{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;gap:12px;align-items:center}
.logo{width:52px;height:52px;border-radius:50%;object-fit:cover;border:4px solid #ffffff55}
.hTitle{font-weight:1000;font-size:20px}
.hSub{font-size:12px;opacity:.8}
.logout{border:0;border-radius:14px;width:40px;height:40px;background:#ffffff22;color:white;font-size:18px}
.badge{display:inline-block;margin-top:12px;padding:7px 11px;border-radius:999px;background:#ffffff22;font-size:12px;font-weight:900}
.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}
.tab{border:0;border-radius:17px;padding:9px 4px;background:#ffffff1d;color:white;font-weight:900;font-size:12px}
.tab.on{background:white;color:#007A3D}
.content{padding:20px}
h1{margin:0;font-size:25px;line-height:1.08;color:#18181b;letter-spacing:-.03em}
.muted{color:#71717a;font-size:14px;line-height:1.35;margin-top:7px}
.card{background:white;border:1px solid #eee;border-radius:24px;padding:15px;box-shadow:0 8px 20px #18181b0d;margin-top:12px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.icon{width:42px;height:42px;border-radius:16px;background:#ecfdf3;color:#007A3D;display:flex;align-items:center;justify-content:center;font-size:20px}
.cardTop{display:flex;justify-content:space-between}
.pill{font-size:10px;font-weight:1000;border-radius:999px;padding:6px 9px}
.free{background:#dcfce7;color:#166534}
.busy{background:#fee2e2;color:#991b1b}
.locked{opacity:.55}
.btn{width:100%;height:54px;border:0;border-radius:19px;background:#007A3D;color:white;font-weight:1000;font-size:15px;margin-top:14px;cursor:pointer}
.btn.dark{background:#18181b}
.btn:disabled{opacity:.45}
.seg{display:flex;gap:8px;margin:16px 0}
.seg button{border:0;border-radius:999px;padding:10px 16px;font-weight:1000;background:#f4f4f5;color:#52525b}
.seg button.on{background:#007A3D;color:white}
label{display:block;font-size:12px;font-weight:1000;color:#71717a;margin-bottom:7px}
.field{margin-top:12px}
input,select{width:100%;border:1px solid #e4e4e7;border-radius:17px;padding:12px;font-weight:800;background:white;color:#18181b}
.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.choices button{border:0;border-radius:16px;padding:12px 4px;font-weight:1000;background:#f4f4f5;color:#52525b}
.choices button.on{background:#007A3D;color:white}
.warn{background:#fffbeb;border:1px solid #fde68a;color:#78350f;border-radius:16px;padding:12px;margin-top:12px;font-size:13px}
.ok{background:#ecfdf3;border:1px solid #bbf7d0;color:#14532d;border-radius:16px;padding:12px;margin-top:12px;font-size:13px}
.info{background:#ecfdf3;border:1px solid #bbf7d0;color:#14532d;border-radius:22px;padding:14px;margin-top:12px}
.row{display:grid;grid-template-columns:58px 1fr;border-bottom:1px solid #eee;min-height:72px}
.cal{border:1px solid #eee;border-radius:24px;overflow:hidden;margin-top:12px}
.hour{padding:12px;color:#a1a1aa;border-right:1px solid #eee;font-size:12px;font-weight:900}
.slot{padding:8px}
.booking{border-radius:15px;padding:8px 10px;margin-bottom:6px;font-size:12px}
.booking b{display:block}
.red{background:#fee2e2;color:#7f1d1d}
.green{background:#dcfce7;color:#14532d}
.amber{background:#fef3c7;color:#78350f}
.black{background:#27272a;color:white}
.month{border:1px solid #eee;border-radius:24px;padding:12px;margin-top:12px}
.weekdays,.monthGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.weekdays div{text-align:center;color:#007A3D;font-size:11px;font-weight:1000;padding:6px 0}
.day{min-height:82px;border:1px solid #e4e4e7;border-radius:11px;padding:5px;background:#fafafa;font-size:10px;overflow:hidden}
.mi{background:white;border-left:4px solid #64748b;border-radius:7px;padding:4px;margin-top:4px;font-size:8.5px}
.userRow{display:flex;gap:12px;align-items:center}
.avatar{width:40px;height:40px;border-radius:15px;background:#ecfdf3;color:#007A3D;display:flex;align-items:center;justify-content:center;font-weight:1000}
.role{font-size:10px;font-weight:1000;border-radius:999px;padding:6px 8px;background:#f4f4f5}
.wa,.waBig{display:inline-block;text-decoration:none;color:white;background:#25D366;border-radius:999px;padding:6px 8px;font-size:10px;font-weight:1000;margin-top:6px}
.waBig{display:block;text-align:center;border-radius:16px;padding:11px;font-size:13px}
.small{font-size:12px;color:#71717a}
.switch{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:12px;margin-top:12px}
.toggle{width:54px;height:30px;border:0;border-radius:999px;background:#d4d4d8;padding:3px}
.toggle.on{background:#007A3D}
.knob{display:block;width:24px;height:24px;border-radius:50%;background:white;transition:.2s}
.toggle.on .knob{transform:translateX(24px)}
.noticeBox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:18px;padding:12px;margin-top:12px}
.noticeTitle{font-weight:1000;color:#14532d}
.noticeMeta{font-size:12px;color:#166534;margin-top:3px}
@media print{.header,.seg,.field,.btn{display:none!important}.phone{max-width:none;box-shadow:none;border-radius:0}.page{padding:0}.day{min-height:95px}}
`;

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<"Live" | "Demo">("Live");
  const [role, setRole] = useState<Role>("Admin");
  const [email, setEmail] = useState("ingo@sf-hueingsen.de");
  const [password, setPassword] = useState("Ingo2026!");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function live() {
    setBusy(true);
    setErr("");
    try {
      const auth = await authLogin(email, password);
      const profiles = await api<Profile[]>(`profiles?select=*&id=eq.${auth.user.id}`);
      const p = profiles?.[0];

      onLogin({
        id: auth.user.id,
        name: p?.name || auth.user.email,
        email: auth.user.email,
        role: p?.role || "Mitglied",
        team: p?.team || null,
        phone: p?.phone || "",
      });
    } catch {
      setErr("Live-Login fehlgeschlagen. User, Passwort oder profiles prüfen.");
    } finally {
      setBusy(false);
    }
  }

  function demoLogin() {
    onLogin({
      name: role === "Trainer" ? "Christian Rausch" : role,
      email: `${role.toLowerCase()}@sfh.de`,
      role,
      team: role === "Trainer" ? "1. Mannschaft" : null,
    });
  }

  return (
    <div className="login">
      <div className="loginCard">
        <img src={LOGO} className="logoBig" />
        <div className="title">OBO-Arena Manager</div>
        <div className="sub">Interne Vereins-App der Sportfreunde Hüingsen</div>

        <div className="seg">
          <button className={mode === "Live" ? "on" : ""} onClick={() => setMode("Live")}>Live</button>
          <button className={mode === "Demo" ? "on" : ""} onClick={() => setMode("Demo")}>Demo</button>
        </div>

        {mode === "Live" ? (
          <>
            <div className="field"><label>E-Mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>Passwort</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {err && <div className="warn">⛔ {err}</div>}
            <button className="btn" onClick={live} disabled={busy}>{busy ? "Prüfe..." : "Live einloggen"}</button>
          </>
        ) : (
          <>
            <div className="field">
              <label>Demo-Rolle</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option>Admin</option><option>Vorstand</option><option>Trainer</option><option>Mitglied</option>
              </select>
            </div>
            <button className="btn" onClick={demoLogin}>Demo einloggen</button>
          </>
        )}
      </div>
    </div>
  );
}

function Header({ user, active, setActive, logout }: {
  user: User;
  active: string;
  setActive: (v: string) => void;
  logout: () => void;
}) {
  const tabs = [
    ["dashboard", "🏠", "Heute"],
    ["kalender", "📅", "Kalender"],
    ["buchung", "➕", "Buchen"],
  ];

  if (user.role === "Admin" || user.role === "Vorstand") {
    tabs.push(["admin", "🛡️", "Admin"]);
  }

  return (
    <div className="header">
      <div className="top">
        <div className="brand">
          <img src={LOGO} className="logo" />
          <div>
            <div className="hTitle">OBO-Arena Manager</div>
            <div className="hSub">Sportfreunde Hüingsen 1950 e.V.</div>
          </div>
        </div>
        <button className="logout" onClick={logout}>↩</button>
      </div>
      <div className="badge">{user.role} · {user.name}{user.team ? ` · ${user.team}` : ""}</div>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t[0]} className={`tab ${active === t[0] ? "on" : ""}`} onClick={() => setActive(t[0])}>
            <span>{t[1]}</span><br />{t[2]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ user, db, setActive }: { user: User; db: string; setActive: (v: string) => void }) {
  const cards = [
    ["Hauptplatz", "belegt", "18:00–20:00", "⚽"],
    ["Kleinfeld", "belegt", "17:00–18:30", "⚽"],
    ["Kabine 2", "frei", "heute frei", "🚪"],
    ["Massageraum", "frei", "heute frei", "💪"],
  ];

  return (
    <div className="content">
      <h1>Heute in der OBO-Arena</h1>
      <div className="muted">Angemeldet als {user.role}{user.team ? ` (${user.team})` : ""}.</div>

      <div className="grid2">
        {cards.map((x) => (
          <div className="card" key={x[0]}>
            <div className="cardTop">
              <div className="icon">{x[3]}</div>
              <span className={`pill ${x[1] === "frei" ? "free" : "busy"}`}>{x[1].toUpperCase()}</span>
            </div>
            <b>{x[0]}</b>
            <div className="small">{x[2]}</div>
          </div>
        ))}
      </div>

      {user.role !== "Mitglied" ? (
        <button className="btn" onClick={() => setActive("buchung")}>➕ Neue Buchung</button>
      ) : (
        <div className="info">🔒 Mitglieder können nur lesen.</div>
      )}

      <div className="info"><b>Datenstatus</b><br /><span className="small">{db}</span></div>
      <div className="info"><b>Konfliktprüfung aktiv</b><br /><span className="small">Hauptplatz komplett blockiert beide Hälften.</span></div>
    </div>
  );
}

function Calendar({ bookings, blocks, user }: { bookings: Booking[]; blocks: Booking[]; user: User }) {
  const [view, setView] = useState("Woche");
  const [filter, setFilter] = useState(user.role === "Trainer" ? user.team || "1. Mannschaft" : "Alle");

  const shown = filter === "Alle" ? bookings : bookings.filter((b) => b.team === filter);
  const hours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const fakeDay = (i: number) => [4, 6, 9, 13, 18, 22, 27][i % 7];

  return (
    <div className="content">
      <h1>Kalender</h1>
      <div className="muted">Teamfilter, Wochenliste und Monatsplan.</div>

      <div className="seg">
        {["Tag", "Woche", "Monat"].map((v) => (
          <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v}</button>
        ))}
      </div>

      <div className="field">
        <label>Team-Filter</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} disabled={user.role === "Trainer"}>
          {user.role !== "Trainer" && <option>Alle</option>}
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <button className="btn dark" onClick={() => window.print()}>🖨️ Drucken / PDF speichern</button>

      {view !== "Monat" ? (
        <div className="cal">
          {hours.map((h) => (
            <div className="row" key={h}>
              <div className="hour">{h}</div>
              <div className="slot">
                {blocks.filter((b) => b.time.startsWith(h.slice(0, 2))).map((b) => (
                  <div className="booking black" key={b.id}><b>⛔ {b.resource}</b>{b.reason} · {b.time}</div>
                ))}
                {shown.filter((b) => b.time.startsWith(h.slice(0, 2))).map((b) => (
                  <div className={`booking ${b.category === "Platz" ? "red" : b.category === "Kabine" ? "green" : "amber"}`} key={b.id}>
                    <b>{b.resource}</b>
                    <span style={{ color: teamColors[b.team || ""] || "#64748b", fontWeight: 900 }}>{b.team}</span> · {b.time}
                    {b.weekly && " · ↻ wöchentlich"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="month">
          <h1 style={{ fontSize: 20 }}>Monatsplan Mai 2026</h1>
          <div className="weekdays">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="monthGrid">
            {days.map((day) => (
              <div className="day" key={day}>
                <b>{day}</b>
                {blocks.filter((_, i) => fakeDay(i) === day).map((b) => (
                  <div className="mi" style={{ background: "#27272a", color: "white" }} key={b.id}>⛔ {b.resource}</div>
                ))}
                {shown.filter((_, i) => fakeDay(i) === day).slice(0, 3).map((b) => (
                  <div className="mi" style={{ borderLeftColor: teamColors[b.team || ""] || "#64748b" }} key={b.id}>
                    {b.team}<br />{b.resource}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingForm({ user, save }: { user: User; save: (b: Booking) => Promise<{ ok: boolean; conflict?: Booking }> }) {
  const trainer = user.role === "Trainer";
  const [category, setCategory] = useState<"Platz" | "Kabine" | "Raum">("Platz");
  const [resource, setResource] = useState(areas.Platz[0]);
  const [team, setTeam] = useState(user.team || "1. Mannschaft");
  const [time, setTime] = useState("18:00");
  const [weekly, setWeekly] = useState(false);
  const [msg, setMsg] = useState("");

  function changeCat(c: "Platz" | "Kabine" | "Raum") {
    setCategory(c);
    setResource(areas[c][0]);
  }

  async function submit() {
    setMsg("");
    const result = await save({
      id: Date.now(),
      category,
      resource,
      team,
      weekly,
      time: `${time}–${addHours(time)}`,
    });

    if (result.ok) setMsg("✅ Buchung gespeichert");
    else setMsg(`⛔ Konflikt: ${result.conflict?.resource} ist ${result.conflict?.time} belegt.`);
  }

  return (
    <div className="content">
      <h1>{user.role === "Mitglied" ? "Keine Berechtigung" : "Buchung erstellen"}</h1>
      <div className="muted">Konfliktprüfung vor dem Speichern.</div>

      <div className={`card ${user.role === "Mitglied" ? "locked" : ""}`}>
        <label>Kategorie</label>
        <div className="choices">
          {(["Platz", "Kabine", "Raum"] as const).map((c) => (
            <button key={c} className={category === c ? "on" : ""} onClick={() => changeCat(c)}>{c}</button>
          ))}
        </div>

        <div className="field"><label>Bereich</label><select value={resource} onChange={(e) => setResource(e.target.value)}>{areas[category].map((a) => <option key={a}>{a}</option>)}</select></div>
        <div className="field"><label>Zeit</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>

        <div className="field">
          <label>Team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} disabled={trainer}>
            {teams.map((t) => <option key={t}>{t}</option>)}
          </select>
          {trainer && <div className="small">🔒 deinem Team zugeordnet</div>}
        </div>

        <div className="switch">
          <div><b>Wöchentlich wiederholen</b><div className="small">Training jede Woche einplanen</div></div>
          <button className={`toggle ${weekly ? "on" : ""}`} onClick={() => setWeekly(!weekly)}><span className="knob" /></button>
        </div>

        {resource === "Hauptplatz komplett" && <div className="warn">⚠️ Blockiert vordere und hintere Hälfte.</div>}
        {msg && <div className={msg.startsWith("✅") ? "ok" : "warn"}>{msg}</div>}

        <button className="btn" disabled={user.role === "Mitglied"} onClick={submit}>Buchung speichern</button>
      </div>
    </div>
  );
}

function Admin({
  user,
  profiles,
  blocks,
  bookings,
  addBlock,
}: {
  user: User;
  profiles: Profile[];
  blocks: Booking[];
  bookings: Booking[];
  addBlock: (b: Booking) => void;
}) {
  const [res, setRes] = useState("Hauptplatz komplett");
  const [reason, setReason] = useState("Wetter / Platz nicht bespielbar");
  const [time, setTime] = useState("16:00");
  const [lastBlock, setLastBlock] = useState<Booking | null>(null);

  const canBlock = user.role === "Admin" || user.role === "Vorstand";
  const blockRange = `${time}–${addHours(time)}`;
  const blockCandidate: Booking = { id: "candidate", category: "Sperre", resource: res, time: blockRange };

  const affectedTeams = [...new Set(
    bookings.filter((b) => areaConflict(b, blockCandidate) && overlaps(b, blockCandidate)).map((b) => b.team).filter(Boolean)
  )] as string[];

  const affectedProfiles = profiles.filter((p) => {
    if (!p.phone) return false;
    if (affectedTeams.length === 0) return ["Admin", "Vorstand", "Trainer"].includes(p.role || "");
    return affectedTeams.includes(teamForProfile(p)) || ["Admin", "Vorstand"].includes(p.role || "");
  });

  const text = (name?: string) =>
    `Hallo ${name || "zusammen"}, Hinweis aus dem OBO-Arena Manager: ${res} ist ab ${time} Uhr gesperrt. Grund: ${reason}. Bitte im Team weitergeben.`;

  const wa = (phone: string, name?: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text(name))}`;

  function doBlock() {
    const block: Booking = { id: Date.now(), category: "Sperre", resource: res, reason, time: blockRange };
    addBlock(block);
    setLastBlock(block);
  }

  return (
    <div className="content">
      <h1>Admin-Bereich</h1>
      <div className="muted">Live-Daten aus profiles. Aktuelle Rolle: {user.role}</div>

      <div className="card">
        <b>Platz sperren</b>
        <div className={canBlock ? "" : "locked"}>
          <div className="field"><label>Bereich</label><select value={res} onChange={(e) => setRes(e.target.value)} disabled={!canBlock}>{areas.Platz.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label>Grund</label><input value={reason} onChange={(e) => setReason(e.target.value)} disabled={!canBlock} /></div>
          <div className="field"><label>Startzeit</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!canBlock} /></div>
          <button className="btn" disabled={!canBlock} onClick={doBlock}>⛔ Platz sperren + WhatsApp vorbereiten</button>
        </div>

        <div className="small">Aktive Sperren: {blocks.length}</div>

        {lastBlock && (
          <div className="noticeBox">
            <div className="noticeTitle">WhatsApp-Verteiler vorbereitet</div>
            <div className="noticeMeta">Sperre: {lastBlock.resource} · {lastBlock.time}</div>
            <div className="noticeMeta">Betroffene Teams: {affectedTeams.length ? affectedTeams.join(", ") : "keine konkrete Buchung gefunden · Info an Orga/Trainer"}</div>
            <div className="noticeMeta">Empfänger mit Nummer: {affectedProfiles.length}</div>
            {affectedProfiles.map((p) => (
              <a key={p.id} className="waBig" target="_blank" rel="noreferrer" href={wa(p.phone!, p.name)}>
                WhatsApp an {p.name || p.role}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="info"><b>Live-Benutzer</b><br /><span className="small">{profiles.length} Profile geladen</span></div>

      {profiles.map((p) => (
        <div className="card userRow" key={p.id}>
          <div className="avatar">{(p.name || "?").slice(0, 1)}</div>
          <div style={{ flex: 1 }}>
            <b>{p.name || "Ohne Namen"}</b>
            <div className="small">{p.email || "E-Mail nur in Auth"}</div>
            {p.team && <div className="small">⚽ {p.team}</div>}
            <div className="small">📱 {p.phone || "keine Nummer"}</div>
          </div>
          <div>
            <div className="role">{p.role || "Mitglied"}</div>
            {p.phone && <a className="wa" target="_blank" rel="noreferrer" href={wa(p.phone, p.name)}>WhatsApp</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState("dashboard");
  const [db, setDb] = useState("Demo-Daten geladen");
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [blocks, setBlocks] = useState<Booking[]>([
    { id: "b1", category: "Sperre", resource: "Hauptplatz komplett", reason: "Platzpflege / Wetter", time: "21:00–22:00" },
  ]);

  const [bookings, setBookings] = useState<Booking[]>([
    { id: 1, category: "Platz", resource: "Hauptplatz komplett", team: "1. Mannschaft", time: "18:00–20:00", weekly: true },
    { id: 2, category: "Platz", resource: "Kleinfeld", team: "F-Jugend", time: "17:00–18:30", weekly: true },
    { id: 3, category: "Raum", resource: "OBO Lounge", team: "Vorstandsrunde", time: "19:00–21:00" },
  ]);

  useEffect(() => {
    api<Booking[]>("bookings?select=*&order=created_at.desc")
      .then((data) => {
        if (data.length) setBookings(data);
        setDb("Mit Supabase verbunden");
      })
      .catch(() => setDb("Demo-Modus · bookings prüfen"));

    api<Profile[]>("profiles?select=*&order=created_at.desc")
      .then((data) => setProfiles(data || []))
      .catch(() => setProfiles([]));
  }, []);

  function conflict(newBooking: Booking) {
    return bookings.find((b) => areaConflict(b, newBooking) && overlaps(b, newBooking))
      || blocks.find((b) => areaConflict(b, newBooking) && overlaps(b, newBooking));
  }

  async function saveBooking(newBooking: Booking): Promise<{ ok: boolean; conflict?: Booking }> {
    const found = conflict(newBooking);
    if (found) return { ok: false, conflict: found };

    const local = { ...newBooking, id: Date.now() };
    setBookings((prev) => [local, ...prev]);
    setActive("kalender");

    try {
      const inserted = await api<Booking[]>("bookings", {
        method: "POST",
        body: JSON.stringify({
          category: newBooking.category,
          resource: newBooking.resource,
          team: newBooking.team,
          time: newBooking.time,
          weekly: newBooking.weekly || false,
        }),
      });

      if (inserted?.[0]) {
        setBookings((prev) => prev.map((b) => (b.id === local.id ? inserted[0] : b)));
      }

      setDb("Buchung in Supabase gespeichert");
    } catch {
      setDb("Nur lokal gespeichert · bookings Rechte/Spalten prüfen");
    }

    return { ok: true };
  }

  const addBlock = (b: Booking) => setBlocks((prev) => [b, ...prev]);

  const screen = useMemo(() => {
    if (!user) return null;

    return {
      dashboard: <Dashboard user={user} db={db} setActive={setActive} />,
      kalender: <Calendar user={user} bookings={bookings} blocks={blocks} />,
      buchung: <BookingForm user={user} save={saveBooking} />,
      admin: <Admin user={user} profiles={profiles} blocks={blocks} bookings={bookings} addBlock={addBlock} />,
    }[active];
  }, [active, user, db, bookings, blocks, profiles]);

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="phone">
          {!user ? (
            <Login onLogin={(u) => { setUser(u); setActive("dashboard"); }} />
          ) : (
            <>
              <Header user={user} active={active} setActive={setActive} logout={() => { setUser(null); setActive("dashboard"); }} />
              {screen}
            </>
          )}
        </div>
      </div>
    </>
  );
}
