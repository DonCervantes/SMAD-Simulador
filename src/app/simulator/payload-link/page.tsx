"use client";

import { useMemo, useState } from "react";
import { SliderInput } from "@/components/SliderInput";
import { ResultCard } from "@/components/ResultCard";
import { CitationFooter, Citation } from "@/components/CitationFooter";
import { EquationDisplay } from "@/components/EquationDisplay";
import { LinkMarginGauge } from "@/components/LinkMarginGauge";
import {
  Band,
  BAND_FREQ_GHZ,
  fspl_dB,
  eirp_dBW,
  carrierPower_dBW,
  CN0_dBHz,
  EbN0_dB,
  linkMargin_dB,
  antennaGain_dBi,
  Modulation,
  REQ_EBN0_dB,
} from "@/lib/physics/link-budget";
import {
  atmosphericLoss_dB,
  rainLoss_dB,
  pointingLoss_dB,
  polarisationLoss_dB,
  beamwidth3dB_deg as bw3dB,
} from "@/lib/physics/itu-losses";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── constants ────────────────────────────────────────────────────────────────
const BANDS: Band[] = ["UHF", "S", "X", "Ku", "Ka"];
const MODULATIONS: Modulation[] = ["BPSK", "QPSK", "BPSK_FEC", "QPSK_FEC"];
const MOD_LABELS: Record<Modulation, string> = {
  BPSK: "BPSK",
  QPSK: "QPSK",
  BPSK_FEC: "BPSK + rate-½ FEC",
  QPSK_FEC: "QPSK + rate-½ FEC",
};

const CITATIONS: Citation[] = [
  { key: "Wertz SMAD (2011) §13.3", locator: "§13.3 eq. 13-15 to 13-20", full: "Link budget methodology, EIRP, G/T, margin threshold (3 dB)" },
  { key: "ITU-R P.676-12 (2019)", locator: "§1–2", full: "Gaseous attenuation by atmospheric oxygen and water vapour" },
  { key: "ITU-R P.618-13 (2017)", locator: "§2.2.1", full: "Rain attenuation on Earth-space paths — effective path length" },
  { key: "ITU-R P.838-3 (2005)", locator: "eq. 1", full: "Specific rain attenuation model coefficients k and α" },
  { key: "Balanis — Antenna Theory (3rd ed.)", locator: "eq. 2-71", full: "Polarisation mismatch loss factor from axial ratio" },
];

// ─── component ────────────────────────────────────────────────────────────────
export default function PayloadLinkPage() {
  // ── transmitter ──
  const [P_tx_W, setPtx] = useState(5);
  const [D_tx_m, setDtx] = useState(0.5);

  // ── receiver ──
  const [D_rx_m, setDrx] = useState(3.0);
  const [T_sys_K, setTsys] = useState(150);

  // ── link geometry ──
  const [slant_km, setSlant] = useState(1500);
  const [el_deg, setEl] = useState(30);

  // ── band / modulation ──
  const [band, setBand] = useState<Band>("X");
  const [modulation, setModulation] = useState<Modulation>("BPSK_FEC");
  const [Rb_kbps, setRb] = useState(100);

  // ── ITU-R losses ──
  const [rho_gm3, setRho] = useState(7.5);
  const [R_mmh, setRain] = useState(10);
  const [axialRatio, setAR] = useState(1.5);
  const [pointErr_deg, setPointErr] = useState(0.5);

  // ── derived ──
  const result = useMemo(() => {
    const f_GHz = BAND_FREQ_GHZ[band];
    const f_hz = f_GHz * 1e9;
    const d_m = slant_km * 1e3;

    const G_tx = antennaGain_dBi(D_tx_m, f_hz);
    const G_rx = antennaGain_dBi(D_rx_m, f_hz);
    const bw_tx = bw3dB(D_tx_m, f_hz);

    const EIRP = eirp_dBW(P_tx_W, G_tx);

    const L_fs = fspl_dB(d_m, f_hz);
    const L_atm = atmosphericLoss_dB(f_GHz, el_deg, rho_gm3);
    const L_rain = rainLoss_dB(f_GHz, el_deg, R_mmh);
    const L_point = pointingLoss_dB(pointErr_deg, bw_tx);
    const L_pol = polarisationLoss_dB(axialRatio);
    const L_misc = L_atm + L_rain + L_point + L_pol;

    const C = carrierPower_dBW(EIRP, G_rx, L_fs, L_misc);
    const cn0 = CN0_dBHz(C, T_sys_K);
    const Rb_bps = Rb_kbps * 1e3;
    const ebn0 = EbN0_dB(cn0, Rb_bps);
    const req = REQ_EBN0_dB[modulation].ber1e5;
    const margin = linkMargin_dB(ebn0, req);

    // margin vs slant range curve (500 km → 45 000 km)
    const curve = Array.from({ length: 50 }, (_, i) => {
      const r_km = 500 + (i / 49) * 44500;
      const lfs = fspl_dB(r_km * 1e3, f_hz);
      const latm = atmosphericLoss_dB(f_GHz, el_deg, rho_gm3);
      const lrain = rainLoss_dB(f_GHz, el_deg, R_mmh);
      const c2 = carrierPower_dBW(EIRP, G_rx, lfs, latm + lrain + L_point + L_pol);
      const cn2 = CN0_dBHz(c2, T_sys_K);
      const ebn2 = EbN0_dB(cn2, Rb_bps);
      return { r_km: Math.round(r_km), margin: parseFloat(linkMargin_dB(ebn2, req).toFixed(2)) };
    });

    return {
      f_GHz, G_tx, G_rx, EIRP, L_fs, L_atm, L_rain, L_point, L_pol, L_misc,
      C, cn0, ebn0, req, margin, curve, bw_tx,
    };
  }, [
    P_tx_W, D_tx_m, D_rx_m, T_sys_K, slant_km, el_deg, band, modulation,
    Rb_kbps, rho_gm3, R_mmh, axialRatio, pointErr_deg,
  ]);

  const marginColor =
    result.margin >= 3
      ? "var(--color-ok)"
      : result.margin >= 0
        ? "var(--color-warn)"
        : "var(--color-danger)";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mb-1">
          Module 3
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payload &amp; link budget
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          FSPL + ITU-R P.676 gaseous + P.618 rain + pointing + polarisation
          losses; margin graded by Wertz 3 dB threshold.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* ── LEFT: inputs ── */}
        <div className="space-y-6">
          {/* Band selector */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Frequency band
            </h2>
            <div className="flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBand(b)}
                  className={`px-3 py-1 rounded text-xs font-mono border transition ${
                    band === b
                      ? "bg-[var(--color-accent)] text-[#08111c] border-[var(--color-accent)]"
                      : "border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-dim)]"
                  }`}
                >
                  {b} ({BAND_FREQ_GHZ[b]} GHz)
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[var(--color-fg-dim)] readout">
              f = {result.f_GHz} GHz &nbsp;·&nbsp; λ ={" "}
              {((3e8 / (result.f_GHz * 1e9)) * 100).toFixed(2)} cm
            </div>
          </section>

          {/* Modulation */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Modulation
            </h2>
            <div className="flex flex-wrap gap-2">
              {MODULATIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setModulation(m)}
                  className={`px-3 py-1 rounded text-xs font-mono border transition ${
                    modulation === m
                      ? "bg-[var(--color-accent)] text-[#08111c] border-[var(--color-accent)]"
                      : "border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-dim)]"
                  }`}
                >
                  {MOD_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[var(--color-fg-dim)] readout">
              Required Eb/N₀ (BER 10⁻⁵) = {result.req.toFixed(1)} dB
              &nbsp;·&nbsp; (BER 10⁻⁶) = {REQ_EBN0_dB[modulation].ber1e6.toFixed(1)} dB
              &nbsp; [Wertz Table 13-10]
            </div>
          </section>

          {/* Transmitter */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Transmitter (spacecraft)
            </h2>
            <SliderInput label="Tx power" unit="W" value={P_tx_W} min={0.1} max={200} step={0.1} onChange={setPtx} hint="Typical LEO S/C: 1–20 W" />
            <SliderInput label="Tx antenna diameter" unit="m" value={D_tx_m} min={0.05} max={3} step={0.05} onChange={setDtx} hint="Deployable dish or phased array effective aperture" />
            <div className="text-[11px] text-[var(--color-fg-dim)] readout">
              G_tx = {result.G_tx.toFixed(1)} dBi &nbsp;·&nbsp; θ₃dB = {result.bw_tx.toFixed(2)}° &nbsp;·&nbsp; EIRP = {result.EIRP.toFixed(1)} dBW
            </div>
          </section>

          {/* Receiver */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Receiver (ground station)
            </h2>
            <SliderInput label="Rx antenna diameter" unit="m" value={D_rx_m} min={0.3} max={20} step={0.1} onChange={setDrx} hint="3 m dish typical small ground station" />
            <SliderInput label="System noise temperature" unit="K" value={T_sys_K} min={20} max={1000} step={5} onChange={setTsys} hint="T_sys = T_ant + T_LNA (100–300 K typical)" />
            <div className="text-[11px] text-[var(--color-fg-dim)] readout">
              G_rx = {result.G_rx.toFixed(1)} dBi &nbsp;·&nbsp; G/T = {(result.G_rx - 10 * Math.log10(T_sys_K)).toFixed(1)} dB/K
            </div>
          </section>

          {/* Geometry */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Link geometry
            </h2>
            <SliderInput label="Slant range" unit="km" value={slant_km} min={200} max={42164} step={10} onChange={setSlant} hint="Module 1 slant range or manual override" />
            <SliderInput label="Elevation angle" unit="°" value={el_deg} min={5} max={90} step={1} onChange={setEl} hint="Minimum 5° recommended (atmospheric model valid > 5°)" />
            <SliderInput label="Data rate" unit="kbps" value={Rb_kbps} min={1} max={1000000} step={1} onChange={setRb} hint="Downlink data rate" />
          </section>

          {/* ITU-R losses */}
          <section className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              ITU-R atmospheric losses
            </h2>
            <SliderInput label="Water vapour density" unit="g/m³" value={rho_gm3} min={0} max={30} step={0.5} onChange={setRho} hint="7.5 g/m³ = ITU midlatitude standard (P.676-12)" />
            <SliderInput label="Rain rate (0.01% exceedance)" unit="mm/h" value={R_mmh} min={0} max={150} step={1} onChange={setRain} hint="10 mm/h = light rain; 50 mm/h = heavy tropical rain (P.618-13)" />
            <SliderInput label="Axial ratio" unit="" value={axialRatio} min={1} max={5} step={0.1} onChange={setAR} hint="1 = perfect circular, ∞ = linear (Balanis eq. 2-71)" />
            <SliderInput label="Pointing error" unit="°" value={pointErr_deg} min={0} max={5} step={0.05} onChange={setPointErr} hint="One-sigma pointing error of Tx antenna (Wertz §13.3)" />
          </section>
        </div>

        {/* ── RIGHT: results ── */}
        <div className="space-y-4">
          {/* Margin gauge */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <LinkMarginGauge margin_dB={result.margin} />
          </div>

          {/* Loss stack */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Loss stack
            </h2>
            {[
              { label: "Free-space path loss", val: result.L_fs, cite: "Wertz §13.3 eq. 13-15" },
              { label: "Gaseous attenuation (O₂ + H₂O)", val: result.L_atm, cite: "ITU-R P.676-12" },
              { label: "Rain attenuation", val: result.L_rain, cite: "ITU-R P.618-13 / P.838-3" },
              { label: "Pointing loss", val: result.L_point, cite: "Wertz §13.3 eq. 13-20" },
              { label: "Polarisation loss", val: result.L_pol, cite: "Balanis eq. 2-71" },
              { label: "Total additional losses", val: result.L_misc, cite: "" },
            ].map(({ label, val, cite }) => (
              <div key={label} className="flex items-baseline justify-between text-xs gap-2">
                <span className="text-[var(--color-fg-muted)] flex-1">{label}</span>
                {cite && <span className="text-[var(--color-fg-dim)] readout text-[10px] hidden sm:inline">{cite}</span>}
                <span className="readout tabular-nums text-[var(--color-readout)] min-w-[70px] text-right">
                  {val.toFixed(2)} dB
                </span>
              </div>
            ))}
          </div>

          {/* Key results */}
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="EIRP" value={result.EIRP.toFixed(1)} unit="dBW" caption="P_tx · G_tx" tone="primary" />
            <ResultCard label="FSPL" value={result.L_fs.toFixed(1)} unit="dB" caption={`at ${slant_km} km`} tone="muted" />
            <ResultCard label="Received power" value={result.C.toFixed(1)} unit="dBW" caption="C = EIRP + G_r − ΣL" tone="primary" />
            <ResultCard label="C/N₀" value={result.cn0.toFixed(1)} unit="dB·Hz" caption="carrier/noise density" tone="primary" />
            <ResultCard label="Achieved Eb/N₀" value={result.ebn0.toFixed(2)} unit="dB" caption={`req ${result.req.toFixed(1)} dB`} tone={result.ebn0 >= result.req ? "ok" : "danger"} />
            <ResultCard label="Link margin" value={(result.margin >= 0 ? "+" : "") + result.margin.toFixed(2)} unit="dB" caption="≥ 3 dB target" tone={result.margin >= 3 ? "ok" : result.margin >= 0 ? "warn" : "danger"} />
          </div>

          {/* Margin vs slant range curve */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-4">
              Margin vs slant range
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.curve} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                <XAxis
                  dataKey="r_km"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }}
                  label={{ value: "Slant range (km)", position: "insideBottom", offset: -2, fill: "var(--color-fg-dim)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }} unit=" dB" />
                <Tooltip
                  contentStyle={{ background: "var(--color-bg-panel)", border: "1px solid var(--color-border-default)", borderRadius: 4, fontSize: 11 }}
                  formatter={(v) => { const n = typeof v === "number" ? v : Number(v); return [`${n.toFixed(1)} dB`, "Margin"] as [string, string]; }}
                  labelFormatter={(l) => `Range: ${l} km`}
                />
                <ReferenceLine y={3} stroke="var(--color-ok)" strokeDasharray="4 2" label={{ value: "3 dB", fill: "var(--color-ok)", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="4 2" />
                <ReferenceLine x={slant_km} stroke={marginColor} strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="var(--color-accent)"
                  dot={false}
                  strokeWidth={2}
                  name="Margin"
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-fg-muted)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Equations */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              Governing equations
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Free-space path loss (Wertz §13.3 eq. 13-15)</p>
                <EquationDisplay tex={String.raw`L_{fs} = \left(\frac{4\pi d f}{c}\right)^{\!2}`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Link equation — received power</p>
                <EquationDisplay tex={String.raw`C = \text{EIRP} + G_r - L_{fs} - \sum L_i \quad [\text{dBW}]`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">C/N₀ (Wertz §13.3 eq. 13-16)</p>
                <EquationDisplay tex={String.raw`\frac{C}{N_0} = C - k_B - 10\log_{10}T_{sys} \quad [\text{dB·Hz}]`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Eb/N₀ (Wertz §13.3 eq. 13-17)</p>
                <EquationDisplay tex={String.raw`\frac{E_b}{N_0} = \frac{C}{N_0} - 10\log_{10}R_b \quad [\text{dB}]`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Pointing loss (Wertz §13.3 eq. 13-20)</p>
                <EquationDisplay tex={String.raw`L_{pt} = 12\left(\frac{\theta_e}{\theta_{3\text{dB}}}\right)^{\!2} \quad [\text{dB}]`} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-fg-dim)] mb-1">Specific rain attenuation (ITU-R P.838-3 eq. 1)</p>
                <EquationDisplay tex={String.raw`\gamma_R = k \cdot R^{\alpha} \quad [\text{dB/km}]`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CitationFooter citations={CITATIONS} />
    </div>
  );
}
