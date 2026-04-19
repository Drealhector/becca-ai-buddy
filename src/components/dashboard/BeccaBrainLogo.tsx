import React from "react";

interface Props {
  size?: number;
  className?: string;
}

/**
 * BeccaBrainLogo — faithful recreation of the becca-b-new-logo PNG as an
 * animated SVG. The outer B is a chunky rounded outline; inside sits a
 * hub-and-spoke neural network with twelve satellites wired to a central
 * hub via circuit-board style traces (straight runs + 90° bends + a few
 * T-junctions). The neural layer pulses in sync with `becca-brain-pulse`
 * so the inside flares brightest at the moment each radiating ring is
 * emitted from the orb, then dims as the ring expands outward.
 */
export const BeccaBrainLogo: React.FC<Props> = ({ size = 28, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ animation: "becca-b-luminescent 2.5s ease-in-out infinite" }}
    >
      {/* ───── Outer B shell ─────
          One continuous rounded outline: flat left spine + two bulging
          D-lobes stacked on the right, sharing a waist indent. */}
      <path
        d="
          M 10 6
          L 58 6
          C 92 6, 92 49, 58 49
          C 94 49, 94 94, 58 94
          L 10 94
          Z
        "
        stroke="#22d3ee"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* ───── Neural network interior ─────
          Pulses in sync with the orb's radiating ring. */}
      <g style={{ animation: "becca-b-neural 2.5s ease-in-out infinite" }}>
        {/* Circuit traces — straight runs, 90° bends, and a few T-junctions */}
        <g stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Upper-left satellite → hub (bend) */}
          <path d="M 26 26 L 32 34 L 40 44" />
          {/* Upper-center satellite → hub (straight) */}
          <path d="M 46 19 L 46 39" />
          {/* Upper-right satellite → hub (long bend) */}
          <path d="M 62 19 L 62 30 L 54 40" />
          {/* Right-upper satellite — T-junction (vertical stem + horizontal branch) */}
          <path d="M 78 26 L 78 40 L 70 46" />
          <path d="M 78 34 L 84 34" />
          {/* Left middle satellite → hub (straight) */}
          <path d="M 17 50 L 34 50" />
          {/* Right middle satellite → hub (straight) */}
          <path d="M 76 52 L 60 52" />
          {/* Lower-left satellite — T-junction */}
          <path d="M 22 70 L 34 64 L 40 58" />
          <path d="M 18 70 L 28 70" />
          {/* Lower-center satellite → hub (straight) */}
          <path d="M 44 82 L 44 62" />
          {/* Lower-center-right satellite → hub (bend) */}
          <path d="M 58 78 L 58 68 L 52 62" />
          {/* Lower-right satellite → hub (long bend) */}
          <path d="M 76 72 L 70 64 L 60 58" />
        </g>

        {/* Central hub — the brain core */}
        <circle cx="46" cy="50" r="9.5" fill="#22d3ee" />

        {/* 12 satellite nodes arranged in a ring around the hub */}
        <g fill="#22d3ee">
          {/* Top ring */}
          <circle cx="26" cy="26" r="3.6" />
          <circle cx="46" cy="19" r="3.2" />
          <circle cx="62" cy="19" r="3.6" />
          <circle cx="78" cy="26" r="4.0" />
          {/* Middle row */}
          <circle cx="17" cy="50" r="3.8" />
          <circle cx="76" cy="52" r="3.8" />
          {/* Bottom ring */}
          <circle cx="22" cy="70" r="3.8" />
          <circle cx="44" cy="82" r="3.6" />
          <circle cx="58" cy="78" r="3.2" />
          <circle cx="76" cy="72" r="3.8" />
        </g>
      </g>
    </svg>
  );
};
