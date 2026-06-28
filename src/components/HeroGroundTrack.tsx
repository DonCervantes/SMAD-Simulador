"use client";

import { useMemo } from "react";
import { GroundTrackPlot } from "@/components/GroundTrackPlot";
import { computeGroundTrack } from "@/lib/physics/ground-track";
import { semiMajorAxisFromPerigee, orbitalPeriod } from "@/lib/physics/orbit";
import { centralAngle } from "@/lib/physics/coverage";

const DEG = Math.PI / 180;

/**
 * Live ISS-like ground track used as the landing-page "signature element."
 * Pure presentation — no controls, no state. Mirrors the same propagator and
 * coverage geometry used by Module 1, so what you see on the homepage is the
 * exact tool you get behind the login.
 */
export function HeroGroundTrack() {
  const { points, swathDeg } = useMemo(() => {
    const a = semiMajorAxisFromPerigee(420, 0); // ISS-ish
    const T = orbitalPeriod(a);
    const points = computeGroundTrack(
      {
        a_km: a,
        e: 0,
        i_rad: 51.6 * DEG,
        raan0_rad: 0,
        argPerigee_rad: 0,
        M0_rad: 0,
      },
      2 * T,
      200,
    );
    const swathDeg = (centralAngle(10 * DEG, a) * 180) / Math.PI;
    return { points, swathDeg };
  }, []);

  return <GroundTrackPlot points={points} swathCentralAngleDeg={swathDeg} />;
}
