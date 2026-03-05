import { useState, useEffect, useMemo } from "react";

// 调用本地 Vercel 代理（不再直接请求 AviationStack）
async function fetchFlights(dep, arr) {
  const res = await fetch(`/api/flights?dep_iata=${dep}&arr_iata=${arr}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || json.error);
  return json.data || [];
}

const SA_AIRPORTS = ["RUH", "JED", "DMM", "MED"];
const CN_AIRPORTS = ["PEK", "PKX", "PVG", "SHA", "CAN", "SZX", "CTU", "KMG"];

const STATUS = {
  active:    { label: "飞行中", color: "#60a5fa" },
  scheduled: { label: "待起飞", color: "#a3e635" },
  landed:    { label: "已落地", color: "#a78bfa" },
  delayed:   { label: "延误",   color: "#fb923c" },
  cancelled: { label: "已取消", color: "#f87171" },
  boarding:  { label: "登机中", color: "#fbbf24" },
};

function dedupe(list) {
  const seen = new Set();
  return list.filter(f => {
    const k = f.flight?.iata || f.flight?.icao || Math.random();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

function match(f, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return [
    f.flight?.iata, f.flight?.icao,
    f.departure?.iata, f.arrival?.iata,
    f.airline?.iata, f.airline?.name,
    f.departure?.airport, f.arrival?.airport,
  ].some(v => v?.toLowerCase().includes(s));
}

export default function App() {
  const [saFlights, setSaFlights] = useState([]);
  const [cnFlights, setCnFlights] = useState([]);
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState("");
  const [search,    setSearch   ] = useState("");
  const [tab,       setTab      ] = useState("sa");
  const [lastUpdate,setLastUpdate] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const saPairs = SA_AIRPORTS.flatMap(sa => CN_AIRPORTS.map(cn => [sa, cn]));
      const cnPairs = CN_AIRPORTS.slice(0, 4).flatMap(cn => SA_AIRPORTS.slice(0, 2).map(sa => [cn, sa]));
      const [saRes, cnRes] = await Promise.all([
        Promise.all(saPairs.map(([d, a]) => fetchFlights(d, a))),
        Promise.all(cnPairs.map(([d, a]) => fetchFlights(d, a))),
      ]);
      setSaFlights(dedupe(saRes.flat()));
      setCnFlights(dedupe(cnRes.flat()));
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const flights = tab === "sa" ? saFlights : cnFlights;

  const filtered = useMemo(() =>
    flights.filter(f => match(f, search)).sort((a, b) => {
      const r = s => s === "active" ? 0 : s === "boarding" ? 1 : s === "scheduled" ? 2 : 3;
      return r(a.flight_status) - r(b.flight_status);
    }),
    [flights, search]
  );

  const stats = useMemo(() => ({
    total:   flights.length,
    active:  flights.filter(f => f.flight_status === "active").length,
    delayed: flights.filter(f => (f.departure?.delay || 0) > 15).length,
  }), [flights]);

  return (
    <div style={{ minHeight: "100vh", background: "#070c14", color: "#fff",
      fontFamily: "'Noto Sans SC','PingFang SC',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&family=Noto+Sans+SC:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; }
        input::placeholder { color: rgba(255,255,255,.2); }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:.3} 50%{opacity:1} }
        button { cursor: pointer; transition: all .15s; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "rgba(0,0,0,.3)", position: "sticky", top: 0, zIndex: 99,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#006341,#0057a8)" }}>✈</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>沙中航班监控</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: 1.2 }}>
              SAUDI ↔ CHINA LIVE FLIGHTS
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)",
              fontFamily: "'Space Mono',monospace" }}>
              更新 {lastUpdate.toLocaleTimeString("zh-CN")}
            </span>
          )}
          <button onClick={load} disabled={loading}
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,.7)", fontSize: 12,
              display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block",
              animation: loading ? "spin 1s linear infinite" : "none" }}>↻</span>
            刷新
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>

        {/* Tabs + stats */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          {[["sa","🇸🇦 沙特 → 中国 🇨🇳"], ["cn","🇨🇳 中国 → 沙特 🇸🇦"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ padding: "8px 20px", borderRadius: 99, fontSize: 13,
                fontWeight: tab === k ? 700 : 400,
                background: tab === k ? (k === "sa" ? "rgba(0,99,65,.45)" : "rgba(0,87,168,.45)") : "rgba(255,255,255,.04)",
                border: `1px solid ${tab === k ? (k === "sa" ? "#006341" : "#0057a8") : "rgba(255,255,255,.08)"}`,
                color: tab === k ? "#fff" : "rgba(255,255,255,.45)" }}>{l}</button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            {[[stats.total,"班次","#fff"],[stats.active,"飞行中","#60a5fa"],[stats.delayed,"延误","#fb923c"]].map(([v,l,c]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "rgba(255,255,255,.25)" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="模糊搜索：航班号 / 机场 / 城市 / 航司..."
            style={{ width: "100%", background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)", borderRadius: 10,
              padding: "11px 38px", color: "#fff", fontSize: 13 }} />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 16 }}>✕</button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)",
            borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && [1,2,3,4].map(i => (
          <div key={i} style={{ height: 110, borderRadius: 12, background: "rgba(255,255,255,.04)",
            marginBottom: 10, animation: "blink 1.5s infinite", animationDelay: `${i * .15}s` }} />
        ))}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.2)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✈</div>
            <div>{search ? `未找到匹配 "${search}" 的航班` : "暂无数据"}</div>
          </div>
        )}

        {/* Cards */}
        {!loading && filtered.map((f, i) => {
          const dep = f.departure || {}, arr = f.arrival || {};
          const fl = f.flight || {}, al = f.airline || {}, ac = f.aircraft || {};
          const s = STATUS[f.flight_status] || { label: f.flight_status || "未知", color: "#94a3b8" };
          const delay = dep.delay || 0;
          const accent = f.flight_status === "active" ? "#60a5fa" : f.flight_status === "delayed" ? "#fb923c" : "#006341";
          return (
            <div key={i} style={{ background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)", borderRadius: 14,
              padding: "16px 20px", marginBottom: 10, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>
                    {fl.iata || fl.icao || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{al.name}</span>
                  {ac.icao && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)",
                      background: "rgba(255,255,255,.06)", padding: "1px 8px", borderRadius: 6 }}>{ac.icao}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {delay > 15 && <span style={{ fontSize: 11, color: "#fb923c", fontFamily: "'Space Mono',monospace" }}>+{delay}min</span>}
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color,
                    background: `${s.color}18`, border: `1px solid ${s.color}30`,
                    padding: "3px 10px", borderRadius: 99 }}>{s.label}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <div style={{ minWidth: 64 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 21, fontWeight: 700 }}>{dep.iata}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{dep.airport?.replace("International","Intl").slice(0,16)}</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,.1)", position: "relative" }}>
                    <span style={{ position: "absolute", left: "50%", top: -9, transform: "translateX(-50%)", fontSize: 14 }}>✈</span>
                  </div>
                  {dep.scheduled && <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)" }}>{dep.scheduled.slice(0,10)}</div>}
                </div>
                <div style={{ minWidth: 64, textAlign: "right" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 21, fontWeight: 700 }}>{arr.iata}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{arr.airport?.replace("International","Intl").slice(0,16)}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["计划起飞", dep.scheduled?.slice(11,16)],
                  ["实际起飞", dep.actual?.slice(11,16)],
                  ["预计到达", arr.estimated?.slice(11,16)],
                  ["登机口",   dep.gate ? `${dep.terminal||""}${dep.gate}` : null],
                  ["行李转盘", arr.baggage],
                ].filter(([,v]) => v).map(([k,v]) => (
                  <div key={k} style={{ background: "rgba(255,255,255,.04)", borderRadius: 7, padding: "5px 10px" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{k} </span>
                    <span style={{ fontSize: 12, fontFamily: "'Space Mono',monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "rgba(255,255,255,.2)" }}>
            共 {filtered.length} 条{search && ` · 匹配 "${search}"`}
          </div>
        )}
      </div>
    </div>
  );
}
