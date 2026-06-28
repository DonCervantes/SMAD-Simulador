"use client";

import { useMemo, useState } from "react";
import { SliderInput } from "@/components/SliderInput";
import { ResultCard } from "@/components/ResultCard";
import { CitationFooter, Citation } from "@/components/CitationFooter";
import { EquationDisplay } from "@/components/EquationDisplay";
import {
  gsdDiffraction_m,
  gsdPixel_m,
  gsdPractical_m,
  maxAltitudeForGSD_m,
  fNumber,
  swathWidth_m,
  pixelsAcrossSwath,
} from "@/lib/physics/diffraction";
import {
  minSatellitesForCoverage,
  ssoInclination_deg,
  accessTimePerPass_s,
  revisitTime_h,
  walkerNotation,
} from "@/lib/physics/walker-constellation";
import { orbitalPeriod, semiMajorAxisFromPerigee } from "@/lib/physics/orbit";
import { R_EARTH_KM } from "@/lib/constants";

// ─── types ────────────────────────────────────────────────────────────────────
type ServiceType = "EO" | "Telecom" | "Navigation";

// ─── wavelength presets (visible / NIR / SWIR / thermal) ─────────────────────
const BAND_PRESETS: { label: string; lambda_um: number }[] = [
  { label: "Visible (550 nm)", lambda_um: 0.55 },
  { label: "NIR (850 nm)",     lambda_um: 0.85 },
  { label: "SWIR (1600 nm)",   lambda_um: 1.6  },
  { label: "Thermal (10 µm)", lambda_um: 10.0  },
];

// ─── DOP geometry helper (navigation) ────────────────────────────────────────
/** Simplified GDOP for a symmetric constellation viewed from a ground point.
 *  For N ≥ 4 satellites evenly distributed above the mask angle, approximate:
 *  PDOP ≈ 1.5 / sin(el_avg)  [Kaplan & Hegarty — GPS §7.3 approximation]
 *  GDOP = sqrt(PDOP² + TDOP²) ≈ PDOP · 1.35 (Kaplan §7.3 rule-of-thumb)
 */
function approximatePDOP(el_avg_deg: number, nSats: number): number {
  if (nSats < 4) return 99;
  const sinEl = Math.sin((el_avg_deg * Math.PI) / 180);
  return Math.max(1, 1.5 / (sinEl * Math.sqrt(nSats / 4)));
}

// ─── citations ────────────────────────────────────────────────────────────────
const CITATIONS: Citation[] = [
  { key: "Wertz SMAD (2011) §9.1", locator: "eq. 9-4", full: "EO payload GSD: Rayleigh diffraction limit GSD = 1.22λh/D" },
  { key: "Wertz SMAD (2011) §7.6", locator: "§7.6, App. C", full: "Walker constellation sizing, street-of-coverage approximation" },
  { key: "Walker (1977)", locator: "RAE TR-77044", full: "Continuous whole-Earth coverage by circular-orbit satellite patterns" },
  { key: "Ballard (1980)", locator: "IEEE TAES 16(5)", full: "Rosette constellations of Earth satellites" },
  { key: "Kaplan & Hegarty — GPS (2nd ed.) §7.3", locator: "§7.3", full: "PDOP / GDOP approximation for N-satellite navigation constellations" },
];

// ─── component ────────────────────────────────────────────────────────────────
export default function UsersDemandPage() {
  const [service, setService] = useState<ServiceType>("EO");

  // EO inputs
  const [h_km, setH] = useState(500);
  const [D_m, setD] = useState(0.3);
  const [lambda_um, setLambda] = useState(0.55);
  const [f_m, setFocal] = useState(1.5);
  const [p_um, setPixel] = useState(5.5);
  const [fov_half_deg, setFov] = useState(1.5);
  const [gsd_req_m, setGsdReq] = useState(5.0);

  // Telecom / coverage inputs
  const [h_cov_km, setHcov] = useState(1200);
  const [epsilon_deg, setEpsilon] = useState(10);
  const [lat_target_deg, setLatTarget] = useState(25);

  // Navigation inputs
  const [el_mask_deg, setElMask] = useState(15);
  const [n_sats_vis, setNSatsVis] = useState(8);

  // ── EO derived ──
  const eo = useMemo(() => {
    const h_m = h_km * 1e3;
    const lambda_m = lambda_um * 1e-6;
    const p_m = p_um * 1e-6;

    const gsdDiff = gsdDiffraction_m(lambda_m, h_m, D_m);
    const gsdPix  = gsdPixel_m(p_m, h_m, f_m);
    const gsdPrac = gsdPractical_m(gsdDiff, gsdPix);
    const hMax    = maxAltitudeForGSD_m(gsd_req_m, lambda_m, D_m) / 1e3; // km
    const fn      = fNumber(f_m, D_m);
    const swath   = swathWidth_m(h_m, fov_half_deg);
    const npix    = pixelsAcrossSwath(swath, gsdPix);

    const a   = semiMajorAxisFromPerigee(h_km, 0);
    const T_s = orbitalPeriod(a);

    return { gsdDiff, gsdPix, gsdPrac, hMax, fn, swath, npix, T_s };
  }, [h_km, D_m, lambda_um, f_m, p_um, fov_half_deg, gsd_req_m]);

  // ── Coverage / Walker derived ──
  const cov = useMemo(() => {
    const { T, P, S, alpha_deg } = minSatellitesForCoverage(h_cov_km, epsilon_deg);
    const a   = semiMajorAxisFromPerigee(h_cov_km, 0);
    const T_s = orbitalPeriod(a);
    const access_s  = accessTimePerPass_s(alpha_deg, T_s);
    const revisit_h = revisitTime_h(alpha_deg, T_s, lat_target_deg, T);
    const i_sso = ssoInclination_deg(h_cov_km);
    const notation = walkerNotation(i_sso, T, P);
    return { T, P, S, alpha_deg, access_s, revisit_h, i_sso, notation, T_s };
  }, [h_cov_km, epsilon_deg, lat_target_deg]);

  // ── Navigation derived ──
  const nav = useMemo(() => {
    const el_avg = el_mask_deg + 20; // average elevation above mask
    const pdop = approximatePDOP(el_avg, n_sats_vis);
    const gdop = pdop * 1.35;
    const pos_err_m = pdop * 1.5; // assumed URE = 1.5 m (GPS SPS)
    return { pdop, gdop, pos_err_m };
  }, [el_mask_deg, n_sats_vis]);

  const gsdColor = (v: number) =>
    v <= gsd_req_m ? "var(--color-ok)" : "var(--color-danger)";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mb-1">
          Module 4
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Users &amp; demand
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          GSD from the Rayleigh diffraction limit · Walker constellation for
          continuous coverage · Navigation DOP geometry.
        </p>
      </div>

      {/* Service selector */}
      <div className="flex gap-2 flex-wrap">
        {(["EO", "Telecom", "Navigation"] as ServiceType[]).map((s) => (
          <button
            key={s}
            onClick={() => setService(s)}
            className={`px-4 py-2 rounded text-sm font-mono border transition ${
              service === s
                ? "bg-[var(--color-accent)] text-[#08111c] border-[var(--color-accent)]"
                : "border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-dim)]"
            }`}
          >
            {s === "EO" ? "Earth Observation" : s === "Telecom" ? "Telecom / Coverage" : "Navigation / DOP"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ EARTH OBSERVATION ═══════════════════════ */}
      {service === "EO" && (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-4">
            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Optical payload
              </h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {BAND_PRESETS.map((b) => (
                  <button
                    key={b.label}
                    onClick={() => setLambda(b.lambda_um)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      Math.abs(lambda_um - b.lambda_um) < 0.01
                        ? "bg-[var(--color-accent)] text-[#08111c] border-[var(--color-accent)]"
                        : "border-[var(--color-border-default)] text-[var(--color-fg-dim)] hover:border-[var(--color-accent-dim)]"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <SliderInput label="Wavelength λ" unit="µm" value={lambda_um} min={0.3} max={15} step={0.05} onChange={setLambda} hint="0.55 µm visible green, 1.6 µm SWIR, 10 µm thermal" />
              <SliderInput label="Aperture diameter D" unit="m" value={D_m} min={0.05} max={3} step={0.01} onChange={setD} hint="Primary mirror / lens diameter" />
              <SliderInput label="Focal length f" unit="m" value={f_m} min={0.1} max={10} step={0.05} onChange={setFocal} hint="Effective focal length of optical system" />
              <SliderInput label="Pixel pitch p" unit="µm" value={p_um} min={2} max={20} step={0.5} onChange={setPixel} hint="Detector pixel pitch (typical: 5–10 µm)" />
              <SliderInput label="Half-FOV" unit="°" value={fov_half_deg} min={0.1} max={15} step={0.1} onChange={setFov} hint="Half-angle field of view of sensor" />
              <div className="text-[11px] text-[var(--color-fg-dim)] readout">
                F/# = {eo.fn.toFixed(1)} &nbsp;·&nbsp; T_orbital = {(eo.T_s / 60).toFixed(1)} min
              </div>
            </section>

            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Orbital altitude
              </h2>
              <SliderInput label="Altitude h" unit="km" value={h_km} min={200} max={2000} step={10} onChange={setH} hint="Perigee altitude (circular orbit assumed)" />
              <SliderInput label="Required GSD" unit="m" value={gsd_req_m} min={0.1} max={100} step={0.1} onChange={setGsdReq} hint="Mission requirement on ground sample distance" />
              <div className="text-[11px] text-[var(--color-fg-dim)] readout">
                h_max for GSD req = {eo.hMax.toFixed(0)} km (diffraction limit)
              </div>
            </section>

            {/* Equations */}
            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Governing equations
              </h2>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Rayleigh diffraction GSD (Wertz §9.1 eq. 9-4)</p>
                <EquationDisplay tex={String.raw`\text{GSD}_{diff} = \frac{1.22\,\lambda\,h}{D}`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Detector-pitch GSD</p>
                <EquationDisplay tex={String.raw`\text{GSD}_{pix} = \frac{p\,h}{f}`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Practical GSD (system-limited)</p>
                <EquationDisplay tex={String.raw`\text{GSD} = \max(\text{GSD}_{diff},\;\text{GSD}_{pix})`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Max altitude for required GSD</p>
                <EquationDisplay tex={String.raw`h_{max} = \frac{\text{GSD}_{req}\cdot D}{1.22\,\lambda}`} />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="GSD diffraction"
                value={eo.gsdDiff >= 1 ? eo.gsdDiff.toFixed(2) : (eo.gsdDiff * 100).toFixed(1) + " cm → " + eo.gsdDiff.toFixed(3)}
                unit={eo.gsdDiff >= 1 ? "m" : ""}
                caption="Rayleigh 1.22·λ·h / D"
                tone={eo.gsdDiff <= gsd_req_m ? "ok" : "danger"}
              />
              <ResultCard
                label="GSD pixel"
                value={eo.gsdPix >= 1 ? eo.gsdPix.toFixed(2) : (eo.gsdPix * 100).toFixed(1)}
                unit={eo.gsdPix >= 1 ? "m" : "cm"}
                caption="p · h / f"
                tone={eo.gsdPix <= gsd_req_m ? "ok" : "danger"}
              />
              <ResultCard
                label="Practical GSD"
                value={eo.gsdPrac >= 1 ? eo.gsdPrac.toFixed(2) : (eo.gsdPrac * 100).toFixed(1)}
                unit={eo.gsdPrac >= 1 ? "m" : "cm"}
                caption="max(diff, pixel)"
                tone={eo.gsdPrac <= gsd_req_m ? "ok" : "danger"}
              />
              <ResultCard
                label="h_max (GSD req)"
                value={eo.hMax.toFixed(0)}
                unit="km"
                caption="diffraction-limited ceiling"
                tone={h_km <= eo.hMax ? "ok" : "danger"}
              />
              <ResultCard
                label="Swath width"
                value={(eo.swath / 1e3).toFixed(1)}
                unit="km"
                caption={`at ±${fov_half_deg}° FOV`}
                tone="primary"
              />
              <ResultCard
                label="Pixels across swath"
                value={eo.npix >= 1000 ? (eo.npix / 1000).toFixed(1) + "k" : eo.npix.toFixed(0)}
                unit=""
                caption="focal plane columns"
                tone="primary"
              />
            </div>

            {/* Derived-requirements table */}
            <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
                Derived requirements
              </h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-fg-dim)] border-b border-[var(--color-border-default)]">
                    <th className="text-left pb-2 font-normal">User need</th>
                    <th className="text-left pb-2 font-normal">Constraint</th>
                    <th className="text-right pb-2 font-normal readout">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {[
                    { need: `GSD ≤ ${gsd_req_m} m`, constr: "Max altitude (diff)", val: `h ≤ ${eo.hMax.toFixed(0)} km`, ok: h_km <= eo.hMax },
                    { need: `GSD ≤ ${gsd_req_m} m`, constr: "Aperture D required", val: `D ≥ ${((1.22 * lambda_um * 1e-6 * h_km * 1e3) / gsd_req_m).toFixed(3)} m`, ok: D_m >= (1.22 * lambda_um * 1e-6 * h_km * 1e3) / gsd_req_m },
                    { need: "Pixel-limited GSD", constr: "Focal length required", val: `f ≥ ${((p_um * 1e-6 * h_km * 1e3) / gsd_req_m).toFixed(2)} m`, ok: f_m >= (p_um * 1e-6 * h_km * 1e3) / gsd_req_m },
                    { need: "Swath coverage", constr: "Data volume / orbit", val: `~${(((eo.swath / eo.gsdPrac) * (eo.T_s * 7.5 * 1e3 / eo.gsdPrac)) / 1e9).toExponential(1)} Gbit`, ok: true },
                  ].map(({ need, constr, val, ok }) => (
                    <tr key={need + constr} className="py-1">
                      <td className="py-1.5 text-[var(--color-fg-muted)]">{need}</td>
                      <td className="py-1.5 text-[var(--color-fg-dim)]">{constr}</td>
                      <td className="py-1.5 text-right readout" style={{ color: ok ? "var(--color-ok)" : "var(--color-danger)" }}>
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ TELECOM / COVERAGE ════════════════════════ */}
      {service === "Telecom" && (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-4">
            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Coverage parameters
              </h2>
              <SliderInput label="Altitude h" unit="km" value={h_cov_km} min={200} max={36000} step={50} onChange={setHcov} hint="Orbital altitude of constellation" />
              <SliderInput label="Min elevation angle ε" unit="°" value={epsilon_deg} min={5} max={60} step={1} onChange={setEpsilon} hint="Minimum acceptable elevation angle at ground" />
              <SliderInput label="Target latitude" unit="°" value={lat_target_deg} min={0} max={80} step={1} onChange={setLatTarget} hint="Latitude of the coverage zone of interest" />
              <div className="text-[11px] text-[var(--color-fg-dim)] readout">
                T_orbital = {(cov.T_s / 60).toFixed(1)} min &nbsp;·&nbsp; α_half = {cov.alpha_deg.toFixed(1)}° &nbsp;·&nbsp; SSO i = {cov.i_sso.toFixed(1)}°
              </div>
            </section>

            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Governing equations
              </h2>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Coverage half-angle per satellite (Wertz §8.2)</p>
                <EquationDisplay tex={String.raw`\alpha = \arccos\!\left(\frac{R_\oplus}{R_\oplus + h}\cos\varepsilon\right) - \varepsilon`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Minimum planes for global coverage (Walker §7.6)</p>
                <EquationDisplay tex={String.raw`P \geq \left\lceil\frac{\pi}{2\alpha}\right\rceil`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Revisit time (Wertz §7.4)</p>
                <EquationDisplay tex={String.raw`T_{rev} \approx \frac{T \cdot 180°}{\alpha \cdot \cos\phi \cdot N_{sat}}`} />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Total satellites T" value={String(cov.T)} unit="" caption={`Walker ${cov.notation}`} tone="primary" />
              <ResultCard label="Orbital planes P" value={String(cov.P)} unit="" caption={`${cov.S} sats/plane`} tone="primary" />
              <ResultCard label="Coverage half-angle α" value={cov.alpha_deg.toFixed(1)} unit="°" caption="Earth central angle" tone="primary" />
              <ResultCard label="Access time / pass" value={cov.access_s.toFixed(0)} unit="s" caption="per overhead pass" tone="primary" />
              <ResultCard
                label="Revisit time"
                value={cov.revisit_h < 1 ? (cov.revisit_h * 60).toFixed(1) : cov.revisit_h.toFixed(1)}
                unit={cov.revisit_h < 1 ? "min" : "h"}
                caption={`at ${lat_target_deg}° lat`}
                tone={cov.revisit_h <= 3 ? "ok" : cov.revisit_h <= 12 ? "warn" : "danger"}
              />
              <ResultCard label="SSO inclination" value={cov.i_sso.toFixed(1)} unit="°" caption="for sun-synchronous" tone="muted" />
            </div>

            <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
                Derived requirements
              </h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-fg-dim)] border-b border-[var(--color-border-default)]">
                    <th className="text-left pb-2 font-normal">Service need</th>
                    <th className="text-right pb-2 font-normal readout">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {[
                    { need: "Global continuous coverage (ε_min)", val: `T ≥ ${cov.T} satellites` },
                    { need: "Walker notation (SSO i)", val: cov.notation },
                    { need: `Revisit at ${lat_target_deg}° latitude`, val: cov.revisit_h < 1 ? `${(cov.revisit_h * 60).toFixed(0)} min` : `${cov.revisit_h.toFixed(1)} h` },
                    { need: "Access time per pass", val: `${cov.access_s.toFixed(0)} s` },
                    { need: "Orbital period", val: `${(cov.T_s / 60).toFixed(1)} min` },
                  ].map(({ need, val }) => (
                    <tr key={need}>
                      <td className="py-1.5 text-[var(--color-fg-muted)]">{need}</td>
                      <td className="py-1.5 text-right readout text-[var(--color-readout)]">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-[var(--color-fg-dim)] mt-3 leading-snug">
                ⚠ Street-of-coverage lower bound (Wertz §7.6). Optimal Walker solutions from
                Ballard (1980) tables may require fewer satellites for specific coverage ratios.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ NAVIGATION / DOP ════════════════════════ */}
      {service === "Navigation" && (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-4">
            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Navigation geometry
              </h2>
              <SliderInput label="Elevation mask angle" unit="°" value={el_mask_deg} min={5} max={40} step={1} onChange={setElMask} hint="Minimum elevation for satellite to be used" />
              <SliderInput label="Visible satellites N" unit="" value={n_sats_vis} min={1} max={20} step={1} onChange={setNSatsVis} hint="Satellites above mask angle at receiver location" />
              <div className="text-[10px] text-[var(--color-fg-dim)] leading-relaxed mt-2">
                Minimum 4 satellites required for 3D fix + clock bias.
                {n_sats_vis < 4 && (
                  <span className="text-[var(--color-danger)]"> ⚠ Fewer than 4 — no 3D fix possible.</span>
                )}
              </div>
            </section>

            <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
                Governing equations
              </h2>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">PDOP approximation (Kaplan §7.3)</p>
                <EquationDisplay tex={String.raw`\text{PDOP} \approx \frac{1.5}{\sin\!\bar\theta\sqrt{N/4}}`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">GDOP from PDOP and TDOP</p>
                <EquationDisplay tex={String.raw`\text{GDOP} = \sqrt{\text{PDOP}^2 + \text{TDOP}^2} \approx 1.35\,\text{PDOP}`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Position error estimate</p>
                <EquationDisplay tex={String.raw`\sigma_{pos} = \text{PDOP} \times \sigma_{URE}`} />
              </div>
              <div className="text-[10px] text-[var(--color-fg-dim)] mt-2 leading-relaxed">
                URE (User Range Error) = 1.5 m assumed (GPS SPS signal-in-space).
                Actual positioning accuracy adds atmospheric, multipath, and receiver errors.
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="PDOP"
                value={nav.pdop >= 99 ? "∞" : nav.pdop.toFixed(2)}
                unit=""
                caption="position dilution"
                tone={nav.pdop < 2 ? "ok" : nav.pdop < 4 ? "warn" : "danger"}
              />
              <ResultCard
                label="GDOP"
                value={nav.gdop >= 99 ? "∞" : nav.gdop.toFixed(2)}
                unit=""
                caption="geometric dilution"
                tone={nav.gdop < 3 ? "ok" : nav.gdop < 6 ? "warn" : "danger"}
              />
              <ResultCard
                label="Position error (1σ)"
                value={nav.pos_err_m >= 100 ? ">" + "100" : nav.pos_err_m.toFixed(1)}
                unit="m"
                caption="PDOP × URE (1.5 m)"
                tone={nav.pos_err_m < 5 ? "ok" : nav.pos_err_m < 15 ? "warn" : "danger"}
              />
              <ResultCard
                label="Visible sats"
                value={String(n_sats_vis)}
                unit=""
                caption={n_sats_vis >= 4 ? "3D fix possible" : "insufficient"}
                tone={n_sats_vis >= 6 ? "ok" : n_sats_vis >= 4 ? "warn" : "danger"}
              />
            </div>

            <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
                DOP quality scale
              </h2>
              <div className="space-y-2 text-xs">
                {[
                  { range: "PDOP < 1", label: "Ideal", tone: "var(--color-ok)" },
                  { range: "1 ≤ PDOP < 2", label: "Excellent", tone: "var(--color-ok)" },
                  { range: "2 ≤ PDOP < 5", label: "Good", tone: "var(--color-warn)" },
                  { range: "5 ≤ PDOP < 10", label: "Moderate", tone: "var(--color-warn)" },
                  { range: "PDOP ≥ 10", label: "Poor / no fix", tone: "var(--color-danger)" },
                ].map(({ range, label, tone }) => (
                  <div key={range} className="flex justify-between">
                    <span className="readout text-[var(--color-fg-dim)]">{range}</span>
                    <span style={{ color: tone }} className="font-semibold">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--color-border-default)]">
                <p className="text-[10px] text-[var(--color-fg-dim)] leading-relaxed">
                  Current PDOP&nbsp;
                  <span className="readout text-[var(--color-readout)]">{nav.pdop >= 99 ? "∞" : nav.pdop.toFixed(2)}</span>
                  &nbsp;—&nbsp;
                  {nav.pdop < 2 ? "Excellent geometry." : nav.pdop < 5 ? "Acceptable for most applications." : "Poor geometry — increase visible satellites or lower mask angle."}
                </p>
              </div>
            </div>

            <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
                Derived requirements
              </h2>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {[
                    { need: "Minimum constellation size", val: "≥ 24 sats (GPS-class)" },
                    { need: "Minimum visible per user", val: "≥ 4 for 3D fix" },
                    { need: "Target PDOP", val: "< 2 (excellent)" },
                    { need: `Position accuracy (1σ, URE=1.5 m)`, val: `${nav.pos_err_m.toFixed(1)} m` },
                    { need: "Mask angle", val: `${el_mask_deg}°` },
                  ].map(({ need, val }) => (
                    <tr key={need}>
                      <td className="py-1.5 text-[var(--color-fg-muted)]">{need}</td>
                      <td className="py-1.5 text-right readout text-[var(--color-readout)]">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <CitationFooter citations={CITATIONS} />
    </div>
  );
}
