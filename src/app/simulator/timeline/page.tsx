"use client";

import { useMemo, useState } from "react";
import { SliderInput } from "@/components/SliderInput";
import { ResultCard } from "@/components/ResultCard";
import { CitationFooter } from "@/components/CitationFooter";
import { EquationDisplay } from "@/components/EquationDisplay";
import { WaterfallChart } from "@/components/WaterfallChart";
import { MissionGantt } from "@/components/MissionGantt";
import { hohmannTransfer } from "@/lib/physics/hohmann";
import { planeChangeDeltaV } from "@/lib/physics/plane-change";
import {
  propellantMass,
  massRatio,
  exhaustVelocity,
} from "@/lib/physics/tsiolkovsky";
import { visViva } from "@/lib/physics/orbit";
import {
  assembleBudget,
  contingencyRow,
  type BudgetRow,
} from "@/lib/physics/delta-v-budget";
import { R_EARTH_KM, G0_M_S2 } from "@/lib/constants";

const TARGETS = {
  geo: { name: "GEO (35 786 km, i = 0°)", altitude_km: 35_786, inc_deg: 0 },
  meo: { name: "MEO (20 200 km, i = 55°)", altitude_km: 20_200, inc_deg: 55 },
  sso: { name: "SSO (800 km, i = 98.6°)", altitude_km: 800, inc_deg: 98.6 },
  leo500: { name: "LEO @ 500 km (i = 51.6°)", altitude_km: 500, inc_deg: 51.6 },
} as const;

type TargetKey = keyof typeof TARGETS;

const PROPULSION = {
  bipropellant: { name: "Bipropellant MMH/N₂O₄", isp: 320, range: [300, 340] as [number, number] },
  monopropellant: { name: "Monopropellant N₂H₄", isp: 230, range: [200, 240] as [number, number] },
  solid: { name: "Solid motor", isp: 280, range: [240, 290] as [number, number] },
  hall: { name: "Hall-effect electric", isp: 1700, range: [1200, 2500] as [number, number] },
  ion: { name: "Ion (gridded)", isp: 3500, range: [2500, 5000] as [number, number] },
} as const;

type PropKey = keyof typeof PROPULSION;

const DEG = Math.PI / 180;

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function TimelinePage() {
  // ── Mission inputs ──────────────────────────────────────────────
  const [leoAlt, setLeoAlt] = useState(400);
  const [leoInc, setLeoInc] = useState(28.5);
  const [targetKey, setTargetKey] = useState<TargetKey>("geo");
  const [propKey, setPropKey] = useState<PropKey>("bipropellant");
  const [isp, setIsp] = useState<number>(PROPULSION.bipropellant.isp);
  const [mDry, setMDry] = useState(500);
  const [lifetime, setLifetime] = useState(7);
  const [ascentDv, setAscentDv] = useState(9_400);
  const [contingencyPct, setContingencyPct] = useState(10);

  // ── Mission phases (years) ──────────────────────────────────────
  const [tDesign, setTDesign] = useState(2);
  const [tIntegration, setTIntegration] = useState(1.5);
  const [tTest, setTTest] = useState(1);

  const target = TARGETS[targetKey];
  const prop = PROPULSION[propKey];

  function pickPropulsion(k: PropKey) {
    setPropKey(k);
    setIsp(PROPULSION[k].isp);
  }

  // ── Δv budget ──────────────────────────────────────────────────
  const budget = useMemo(() => {
    const r1 = R_EARTH_KM + leoAlt;
    const r2 = R_EARTH_KM + target.altitude_km;
    const transfer = hohmannTransfer(r1, r2);

    // Plane change at the transfer apoapsis (cheapest spot).
    const vApo = visViva(r2, transfer.aTransfer_km);
    const deltaInc = Math.abs(target.inc_deg - leoInc) * DEG;
    const planeChange_m_s = planeChangeDeltaV(vApo, deltaInc) * 1_000;

    // Station-keeping budget by regime.
    const skAnnual_m_s = targetKey === "geo" ? 52 : 30;
    const sk_m_s = skAnnual_m_s * lifetime;

    // Disposal Δv per IADC-02-01.
    const disposal_m_s = targetKey === "geo" ? 11 : 120;

    const rows: BudgetRow[] = [
      {
        label: "Ascent to LEO",
        dv_m_s: ascentDv,
        category: "ascent",
        note: "Includes ~7.8 km/s ideal + ~1.5 km/s gravity / drag / steering (Curtis §11.6).",
      },
      {
        label: "Hohmann Δv₁",
        dv_m_s: transfer.dv1_km_s * 1_000,
        category: "transfer",
        note: "Periapsis burn (Wertz §6.3 eq. 6-39).",
      },
      {
        label: "Hohmann Δv₂",
        dv_m_s: transfer.dv2_km_s * 1_000,
        category: "transfer",
        note: "Apoapsis burn (Wertz §6.3 eq. 6-40).",
      },
      {
        label: "Plane change",
        dv_m_s: planeChange_m_s,
        category: "plane-change",
        note: `Δi = ${(target.inc_deg - leoInc).toFixed(1)}°, applied at apogee (v_apo = ${(vApo * 1000).toFixed(0)} m/s).`,
      },
      {
        label: `Station-keeping (${lifetime} yr)`,
        dv_m_s: sk_m_s,
        category: "station-keeping",
        note:
          targetKey === "geo"
            ? "N-S 50 + E-W 2 m/s/yr from luni-solar + tesseral (Wertz §10.7)."
            : "Drag / atmospheric compensation ≈ 30 m/s/yr.",
      },
      {
        label: "Disposal",
        dv_m_s: disposal_m_s,
        category: "disposal",
        note:
          targetKey === "geo"
            ? "Re-orbit +300 km above GEO (IADC-02-01)."
            : "Controlled re-entry (IADC-02-01).",
      },
    ];

    const baseTotal = rows.reduce((s, r) => s + r.dv_m_s, 0);
    const margin = contingencyRow(baseTotal, contingencyPct / 100);
    return assembleBudget([...rows, margin]);
  }, [leoAlt, leoInc, targetKey, lifetime, ascentDv, contingencyPct, target.altitude_km, target.inc_deg]);

  // ── Propellant sizing ─────────────────────────────────────────
  const sizing = useMemo(() => {
    const dvTotal_m_s = budget.total_m_s;
    const mProp = propellantMass(dvTotal_m_s, isp, mDry);
    const mr = massRatio(dvTotal_m_s, isp);
    const ve = exhaustVelocity(isp);
    return {
      mProp,
      mWet: mDry + mProp,
      mr,
      ve,
    };
  }, [budget.total_m_s, isp, mDry]);

  // ── Lifecycle Gantt ───────────────────────────────────────────
  const ganttPhases = [
    { label: "Design", durationYears: tDesign, color: "#5cf0ff" },
    { label: "Integration", durationYears: tIntegration, color: "#b9a4ff" },
    { label: "Test", durationYears: tTest, color: "#ffb547" },
    { label: "Operation", durationYears: lifetime, color: "#5dffa0" },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Module 2 · Δv & mission timeline
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1 max-w-3xl">
          Builds the per-phase Δv waterfall (ascent, Hohmann transfer, plane
          change, station-keeping, disposal, margin), sizes propellant via
          Tsiolkovsky, and lays out the lifecycle Gantt.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* ── Inputs ────────────────────────────────────────────── */}
        <aside className="space-y-5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-5 h-fit">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Source & target
            </h2>
            <SliderInput
              label="Parking LEO altitude"
              unit="km"
              value={leoAlt}
              min={200}
              max={1_000}
              step={10}
              onChange={setLeoAlt}
            />
            <div className="mt-3">
              <SliderInput
                label="Launch inclination"
                unit="°"
                value={leoInc}
                min={0}
                max={90}
                step={0.1}
                onChange={setLeoInc}
                hint="28.5° = Cape Canaveral, 51.6° = Baikonur, 5.2° = Kourou."
              />
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium block mb-1">
                Target orbit
              </label>
              <select
                value={targetKey}
                onChange={(e) => setTargetKey(e.target.value as TargetKey)}
                className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2 py-1 text-sm text-[var(--color-readout)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                {Object.entries(TARGETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border-default)]">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Propulsion
            </h2>
            <label className="text-sm font-medium block mb-1">Technology</label>
            <select
              value={propKey}
              onChange={(e) => pickPropulsion(e.target.value as PropKey)}
              className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2 py-1 text-sm text-[var(--color-readout)] focus:border-[var(--color-accent)] focus:outline-none mb-3"
            >
              {Object.entries(PROPULSION).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
            <SliderInput
              label="Specific impulse Isp"
              unit="s"
              value={isp}
              min={prop.range[0]}
              max={prop.range[1]}
              step={5}
              onChange={setIsp}
              hint={`v_e = Isp · g₀ = ${(isp * G0_M_S2).toFixed(0)} m/s.`}
            />
            <div className="mt-3">
              <SliderInput
                label="Dry mass m_dry"
                unit="kg"
                value={mDry}
                min={50}
                max={10_000}
                step={10}
                onChange={setMDry}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border-default)]">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Operations
            </h2>
            <SliderInput
              label="Mission lifetime"
              unit="yr"
              value={lifetime}
              min={1}
              max={15}
              step={0.5}
              onChange={setLifetime}
            />
            <div className="mt-3">
              <SliderInput
                label="Ascent Δv to LEO"
                unit="m/s"
                value={ascentDv}
                min={8_000}
                max={10_500}
                step={50}
                onChange={setAscentDv}
                hint="Editable: depends on launcher + trajectory (Falcon 9 to LEO ≈ 9.4 km/s)."
              />
            </div>
            <div className="mt-3">
              <SliderInput
                label="Contingency margin"
                unit="%"
                value={contingencyPct}
                min={0}
                max={30}
                step={1}
                onChange={setContingencyPct}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border-default)]">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Lifecycle (yr)
            </h2>
            <SliderInput
              label="Design"
              unit="yr"
              value={tDesign}
              min={0.5}
              max={5}
              step={0.25}
              onChange={setTDesign}
            />
            <div className="mt-3">
              <SliderInput
                label="Integration"
                unit="yr"
                value={tIntegration}
                min={0.5}
                max={4}
                step={0.25}
                onChange={setTIntegration}
              />
            </div>
            <div className="mt-3">
              <SliderInput
                label="Test"
                unit="yr"
                value={tTest}
                min={0.25}
                max={3}
                step={0.25}
                onChange={setTTest}
              />
            </div>
          </div>
        </aside>

        {/* ── Outputs ──────────────────────────────────────────── */}
        <section className="space-y-6">
          {/* Sizing summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard
              label="Total Δv (with margin)"
              value={fmt(budget.total_m_s / 1000, 3)}
              unit="km/s"
              tone="primary"
            />
            <ResultCard
              label="Mass ratio m₀/m_f"
              value={fmt(sizing.mr, 3)}
              tone={sizing.mr > 5 ? "warn" : "ok"}
              caption="MR > 5 ⇒ very fuel-heavy"
            />
            <ResultCard
              label="Propellant mass"
              value={fmt(sizing.mProp, 0)}
              unit="kg"
              tone="primary"
            />
            <ResultCard
              label="Wet mass m₀"
              value={fmt(sizing.mWet, 0)}
              unit="kg"
              tone="primary"
              caption={`m_dry = ${fmt(mDry, 0)} kg`}
            />
          </div>

          {/* Waterfall */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
              Δv waterfall by phase
            </h2>
            <WaterfallChart
              rows={budget.rows}
              cumulativeBefore={budget.cumulativeBefore}
            />
            <table className="w-full mt-4 text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] border-b border-[var(--color-border-default)]">
                  <th className="text-left py-1">Phase</th>
                  <th className="text-right py-1">Δv (m/s)</th>
                  <th className="text-right py-1">Cumulative</th>
                  <th className="text-left pl-3 py-1">Source</th>
                </tr>
              </thead>
              <tbody className="readout">
                {budget.rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--color-border-default)]/40"
                  >
                    <td className="py-1 text-[var(--color-fg)]">{r.label}</td>
                    <td className="py-1 text-right text-[var(--color-readout)]">
                      {fmt(r.dv_m_s, 1)}
                    </td>
                    <td className="py-1 text-right text-[var(--color-fg-muted)]">
                      {fmt(budget.cumulativeAfter[i], 1)}
                    </td>
                    <td className="py-1 pl-3 text-[var(--color-fg-dim)] text-[11px]">
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gantt */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
                Mission lifecycle
              </h2>
              <span className="text-[10px] text-[var(--color-fg-dim)] readout">
                total: {(tDesign + tIntegration + tTest + lifetime).toFixed(1)} yr
              </span>
            </div>
            <MissionGantt
              phases={ganttPhases}
              markers={[{ label: "Launch", afterIndex: 3, color: "#ff6b6b" }]}
            />
          </div>

          {/* Equations */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Equations on this page
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-[var(--color-fg)]">
              <EquationDisplay
                tex={String.raw`\Delta v_{1} = \sqrt{\tfrac{\mu}{r_{1}}}\!\left(\!\sqrt{\tfrac{2 r_{2}}{r_{1}+r_{2}}} - 1\!\right)`}
                caption="Hohmann burn 1 (Wertz §6.3)"
              />
              <EquationDisplay
                tex={String.raw`\Delta v_{2} = \sqrt{\tfrac{\mu}{r_{2}}}\!\left(\!1 - \sqrt{\tfrac{2 r_{1}}{r_{1}+r_{2}}}\!\right)`}
                caption="Hohmann burn 2"
              />
              <EquationDisplay
                tex={String.raw`\Delta v_{\text{plane}} = 2 v \sin(\Delta i / 2)`}
                caption="Plane change (Wertz §6.3)"
              />
              <EquationDisplay
                tex={String.raw`m_{\text{prop}} = m_{\text{dry}}\!\left(e^{\Delta v / (I_{sp} g_{0})} - 1\right)`}
                caption="Tsiolkovsky inverted (Wertz §17.4)"
              />
            </div>
          </div>
        </section>
      </div>

      <CitationFooter
        title="Sources for the formulas on this page"
        citations={[
          {
            key: "Wertz SMAD",
            locator:
              "§6.3 Hohmann and plane change · §10.7 station-keeping · §17.4 Tsiolkovsky sizing",
            full: "Wertz, J. R., Everett, D. F., Puschell, J. J. — Space Mission Engineering: The New SMAD, 2011.",
          },
          {
            key: "Curtis",
            locator: "§6.2 Hohmann · §6.5 rocket eq · §11.6 ascent losses",
            full: "Curtis, H. D. — Orbital Mechanics for Engineering Students, 3rd ed.",
          },
          {
            key: "IADC-02-01",
            locator:
              "LEO controlled re-entry (~120 m/s) · GEO graveyard offset +300 km (~11 m/s)",
            full: "Inter-Agency Space Debris Coordination Committee, Space Debris Mitigation Guidelines, 2007.",
          },
          {
            key: "Standard gravity",
            locator: "g₀ = 9.80665 m/s² (CGPM 1901; ISO 80000-3)",
          },
        ]}
      />
    </div>
  );
}
