"use client";

import { useMemo, useState } from "react";
import { SliderInput } from "@/components/SliderInput";
import { ResultCard } from "@/components/ResultCard";
import { CitationFooter, Citation } from "@/components/CitationFooter";
import { EquationDisplay } from "@/components/EquationDisplay";
import {
  rSingle, rSeries, rParallel, rKofN, rColdStandby,
  evaluateArchitecture, mtbf_h,
  ARCHITECTURES, MIL217_COMPONENTS,
  fitToLambda, yearsToHours,
  type ArchitectureId,
} from "@/lib/physics/reliability";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";

// ─── constants ────────────────────────────────────────────────────────────────
const ARCH_COLORS: Record<ArchitectureId, string> = {
  FCSSTV:  "#5cf0ff",
  CSSTV:   "#38bdf8",
  CBTV:    "#a78bfa",
  FCSSC:   "#34d399",
  FCSBSC:  "#fbbf24",
  CBSC:    "#f87171",
};

const CITATIONS: Citation[] = [
  { key: "MIL-HDBK-217F Notice 2 (1995)", locator: "§5–9, §14", full: "Reliability Prediction of Electronic Equipment — failure rate tables" },
  { key: "Wertz SMAD (2011) §19", locator: "§19.2–19.4", full: "Spacecraft reliability, redundancy architectures, MTBF" },
  { key: "Birolini — Reliability Engineering (7th ed.)", locator: "§2.2, 2.5, 2.6", full: "Exponential law, k-of-n voting, cold standby (Poisson sum)" },
  { key: "Fortescue — Spacecraft Systems Engineering (4th ed.) ch. 14", locator: "ch. 14", full: "Reliability and fault tolerance in spacecraft design" },
];

// ─── component ────────────────────────────────────────────────────────────────
export default function ReliabilityPage() {
  const [compIdx, setCompIdx]   = useState(0);
  const [customFit, setCustomFit] = useState(100);
  const [lifetime_yr, setLifetime] = useState(5);
  const [n_parallel, setNParallel] = useState(2);
  const [k_vote, setKvote]     = useState(2);
  const [n_vote, setNvote]     = useState(3);
  const [m_spares, setMspares] = useState(1);

  const comp = MIL217_COMPONENTS[compIdx];
  const fit  = compIdx === MIL217_COMPONENTS.length - 1 ? customFit : comp.lambda_fit;
  const lambda = fitToLambda(fit);
  const t_h    = yearsToHours(lifetime_yr);

  // ── single-component curve ──
  const curve = useMemo(() => {
    const pts = 100;
    return Array.from({ length: pts + 1 }, (_, i) => {
      const yr = (i / pts) * lifetime_yr * 1.5;
      const h  = yearsToHours(yr);
      return {
        yr: parseFloat(yr.toFixed(2)),
        single:    parseFloat(rSingle(lambda, h).toFixed(4)),
        parallel:  parseFloat(rParallel(lambda, n_parallel, h).toFixed(4)),
        kofn:      parseFloat(rKofN(lambda, k_vote, n_vote, h).toFixed(4)),
        coldsby:   parseFloat(rColdStandby(lambda, m_spares, h).toFixed(4)),
      };
    });
  }, [lambda, lifetime_yr, n_parallel, k_vote, n_vote, m_spares]);

  // ── architecture bar chart at mission end ──
  const archBar = useMemo(() =>
    ARCHITECTURES.map((a) => ({
      id: a.id,
      label: a.label,
      R: parseFloat((evaluateArchitecture(a, lambda, t_h) * 100).toFixed(2)),
    })),
  [lambda, t_h]);

  // ── key results at t = mission end ──
  const R_s  = rSingle(lambda, t_h);
  const R_p  = rParallel(lambda, n_parallel, t_h);
  const R_kn = rKofN(lambda, k_vote, n_vote, t_h);
  const R_cs = rColdStandby(lambda, m_spares, t_h);
  const mtbf = mtbf_h(lambda);

  const rTone = (r: number) =>
    r >= 0.99 ? "ok" : r >= 0.95 ? "warn" : "danger";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mb-1">
          Module 5
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reliability &amp; risk
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          R(t) = e^(−λt) · redundancy architectures · MIL-HDBK-217F failure
          rates · the six SMAD architectures (FC-SS-TV, C-SS-TV, CB-TV,
          FC-SS-C, FC-SB-SC, CB-SC).
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* ── LEFT: inputs ── */}
        <div className="space-y-4">
          {/* Component selector */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Component (MIL-HDBK-217F)
            </h2>
            <div className="flex flex-col gap-1">
              {MIL217_COMPONENTS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setCompIdx(i)}
                  className={`text-left px-3 py-1.5 rounded text-xs border transition ${
                    compIdx === i
                      ? "bg-[var(--color-accent)] text-[#08111c] border-[var(--color-accent)]"
                      : "border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-dim)]"
                  }`}
                >
                  <span className="font-mono">{c.lambda_fit.toLocaleString()} FIT</span>
                  <span className="ml-2 opacity-80">{c.label}</span>
                </button>
              ))}
            </div>
            {compIdx === MIL217_COMPONENTS.length - 1 && (
              <SliderInput
                label="Custom FIT"
                unit="FIT"
                value={customFit}
                min={1}
                max={10000}
                step={1}
                onChange={setCustomFit}
                hint="1 FIT = 1 failure per 10⁹ hours"
              />
            )}
            <div className="text-[11px] text-[var(--color-fg-dim)] readout">
              λ = {lambda.toExponential(2)} /h &nbsp;·&nbsp;
              MTBF = {(mtbf / 8760).toFixed(0)} yr &nbsp;·&nbsp;
              Source: {comp.note}
            </div>
          </section>

          {/* Mission lifetime */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Mission lifetime
            </h2>
            <SliderInput label="Lifetime" unit="yr" value={lifetime_yr} min={0.5} max={20} step={0.5} onChange={setLifetime} hint="Mission design lifetime (EOL reliability target)" />
          </section>

          {/* Redundancy parameters */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Redundancy parameters
            </h2>
            <div className="border-b border-[var(--color-border-default)] pb-3 mb-3">
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-2 uppercase tracking-wider">Active parallel</p>
              <SliderInput label="Units n" unit="" value={n_parallel} min={1} max={6} step={1} onChange={setNParallel} hint="n identical units, system fails when all fail" />
            </div>
            <div className="border-b border-[var(--color-border-default)] pb-3 mb-3">
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-2 uppercase tracking-wider">k-of-n voting</p>
              <SliderInput label="Required k" unit="" value={k_vote} min={1} max={6} step={1} onChange={(v) => setKvote(Math.min(v, n_vote))} hint="Minimum units that must survive" />
              <SliderInput label="Total n" unit="" value={n_vote} min={k_vote} max={8} step={1} onChange={setNvote} hint="Total units in voting group" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-2 uppercase tracking-wider">Cold standby</p>
              <SliderInput label="Spares m" unit="" value={m_spares} min={0} max={5} step={1} onChange={setMspares} hint="Cold spares (0 = no redundancy)" />
            </div>
          </section>

          {/* Equations */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Governing equations
            </h2>
            <div>
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Exponential reliability (Wertz §19.2)</p>
              <EquationDisplay tex={String.raw`R(t) = e^{-\lambda t}`} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Active parallel (Wertz §19.3 eq. 19-5)</p>
              <EquationDisplay tex={String.raw`R_p = 1 - \prod_{i=1}^{n}(1 - R_i)`} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">k-of-n voting (Birolini §2.5)</p>
              <EquationDisplay tex={String.raw`R_{k/n} = \sum_{i=k}^{n}\binom{n}{i}R^i(1-R)^{n-i}`} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Cold standby — Poisson sum (Birolini §2.6)</p>
              <EquationDisplay tex={String.raw`R_{cs}(t) = e^{-\lambda t}\sum_{k=0}^{m}\frac{(\lambda t)^k}{k!}`} />
            </div>
          </section>
        </div>

        {/* ── RIGHT: results ── */}
        <div className="space-y-4">
          {/* Key results */}
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Single R(EOL)" value={(R_s * 100).toFixed(2)} unit="%" caption={`λ=${lambda.toExponential(1)} /h`} tone={rTone(R_s)} />
            <ResultCard label="Parallel R(EOL)" value={(R_p * 100).toFixed(2)} unit="%" caption={`n=${n_parallel} units`} tone={rTone(R_p)} />
            <ResultCard label="k-of-n R(EOL)" value={(R_kn * 100).toFixed(2)} unit="%" caption={`${k_vote}-of-${n_vote}`} tone={rTone(R_kn)} />
            <ResultCard label="Cold standby R(EOL)" value={(R_cs * 100).toFixed(2)} unit="%" caption={`m=${m_spares} spares`} tone={rTone(R_cs)} />
            <ResultCard label="MTBF" value={(mtbf / 8760).toFixed(0)} unit="yr" caption="1/λ" tone={mtbf / 8760 > lifetime_yr * 5 ? "ok" : "warn"} />
            <ResultCard label="P(failure) EOL" value={((1 - R_s) * 100).toFixed(2)} unit="%" caption="single unit" tone={R_s >= 0.95 ? "ok" : "danger"} />
          </div>

          {/* R(t) curve */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-4">
              R(t) — four primitives
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={curve} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                <XAxis dataKey="yr" tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }}
                  label={{ value: "Time (years)", position: "insideBottom", offset: -10, fill: "var(--color-fg-dim)", fontSize: 10 }} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--color-bg-panel)", border: "1px solid var(--color-border-default)", borderRadius: 4, fontSize: 11 }}
                  formatter={(v) => { const n = typeof v === "number" ? v : Number(v); return [`${(n * 100).toFixed(2)}%`]; }}
                  labelFormatter={(l) => `t = ${l} yr`}
                />
                <ReferenceLine y={0.99} stroke="var(--color-ok)" strokeDasharray="3 2" />
                <ReferenceLine y={0.95} stroke="var(--color-warn)" strokeDasharray="3 2" label={{ value: "95%", fill: "var(--color-warn)", fontSize: 9, position: "right" }} />
                <ReferenceLine x={lifetime_yr} stroke="var(--color-accent)" strokeDasharray="3 3" label={{ value: "EOL", fill: "var(--color-accent)", fontSize: 9 }} />
                <Line type="monotone" dataKey="single"   stroke="var(--color-danger)"  dot={false} strokeWidth={2} name="Single"       />
                <Line type="monotone" dataKey="parallel" stroke="var(--color-accent)"  dot={false} strokeWidth={2} name={`Parallel n=${n_parallel}`} />
                <Line type="monotone" dataKey="kofn"     stroke="#a78bfa"               dot={false} strokeWidth={2} name={`${k_vote}-of-${n_vote}`}    />
                <Line type="monotone" dataKey="coldsby"  stroke="var(--color-ok)"      dot={false} strokeWidth={2} name={`Cold-standby m=${m_spares}`} />
                <Legend wrapperStyle={{ fontSize: 10, color: "var(--color-fg-muted)", paddingTop: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 6-architecture bar chart */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-1">
              Six SMAD architectures — R at EOL
            </h2>
            <p className="text-[10px] text-[var(--color-warn)] mb-3">
              ⚠ Acronym definitions not found in MIL-HDBK-217F or Birolini — modeled from structural
              interpretation of token components. See citations.
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={archBar} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                <XAxis dataKey="label" tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--color-bg-panel)", border: "1px solid var(--color-border-default)", borderRadius: 4, fontSize: 11 }}
                  formatter={(v) => { const n = typeof v === "number" ? v : Number(v); return [`${n.toFixed(2)}%`, "R(EOL)"]; }}
                />
                <ReferenceLine y={99} stroke="var(--color-ok)" strokeDasharray="3 2" />
                <ReferenceLine y={95} stroke="var(--color-warn)" strokeDasharray="3 2" />
                <Bar dataKey="R" name="R(EOL) %">
                  {archBar.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={ARCH_COLORS[entry.id as ArchitectureId]}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Architecture table */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Architecture details
            </h2>
            <div className="space-y-3">
              {ARCHITECTURES.map((a) => {
                const R = evaluateArchitecture(a, lambda, t_h);
                return (
                  <div key={a.id} className="border border-[var(--color-border-default)] rounded p-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-mono font-semibold" style={{ color: ARCH_COLORS[a.id] }}>
                        {a.label}
                      </span>
                      <span className={`text-sm font-semibold readout tabular-nums`}
                        style={{ color: R >= 0.99 ? "var(--color-ok)" : R >= 0.95 ? "var(--color-warn)" : "var(--color-danger)" }}>
                        {(R * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-fg-muted)] leading-snug">{a.description}</p>
                    <p className="text-[10px] text-[var(--color-warn)] mt-1 leading-snug">{a.sourceNote}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CitationFooter citations={CITATIONS} />
    </div>
  );
}
