import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { CloudflareLogo, VoidZeroLogo } from "./logos";

// Dark bluish-green sampled from the first frame of the "Wake up babe" segment.
const BACKGROUND = "#2b4d43";
const CF_ORANGE = "#F6821F";

const WIDTH = 1280;
const HEIGHT = 720;
const SEAM = WIDTH / 2; // 640: the invisible slit, dead center of the screen
const CENTER_Y = HEIGHT / 2; // 360

// Logo sizing. "Roughly the same size" => matched height.
const VOID_HEIGHT = 42;
const VOID_WIDTH = VOID_HEIGHT * (91 / 15); // wordmark aspect ratio
const CF_BOX = 140; // square viewBox; visible cloud fills ~full width, ~half height

const SEAM_GAP = 64; // gap between each logo and the centerline

// Resting positions.
const VOID_LEFT = SEAM - SEAM_GAP - VOID_WIDTH; // left edge of VoidZero
const VOID_TOP = CENTER_Y - VOID_HEIGHT / 2;
const CF_LEFT = SEAM + SEAM_GAP; // left edge of Cloudflare box
const CF_TOP = CENTER_Y - CF_BOX / 2;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();

  // Logos slide apart, emerging from the central slit.
  const voidTx = interpolate(frame, [5, 35], [SEAM - VOID_LEFT, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const cfTx = interpolate(frame, [5, 35], [-(CF_BOX + (CF_LEFT - SEAM)), 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const logoOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The slit line flashes at center, then fades as the logos take over.
  const slitOpacity = interpolate(frame, [0, 4, 12, 28], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slitScaleY = interpolate(frame, [0, 6], [0.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  // Faint arrow revealed between the two logos, pointing VoidZero -> Cloudflare.
  const arrowOpacity = interpolate(frame, [35, 52], [0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowDx = interpolate(frame, [35, 52], [-8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND }}>
      {/* Left half, clipped at the seam: VoidZero emerges and slides left. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SEAM,
          height: HEIGHT,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: VOID_LEFT,
            top: VOID_TOP,
            opacity: logoOpacity,
            transform: `translateX(${voidTx}px)`,
          }}
        >
          <VoidZeroLogo height={VOID_HEIGHT} color="#FFFFFF" />
        </div>
      </div>

      {/* Right half, clipped at the seam: Cloudflare emerges and slides right. */}
      <div
        style={{
          position: "absolute",
          left: SEAM,
          top: 0,
          width: WIDTH - SEAM,
          height: HEIGHT,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: CF_LEFT - SEAM,
            top: CF_TOP,
            opacity: logoOpacity,
            transform: `translateX(${cfTx}px)`,
          }}
        >
          <CloudflareLogo size={CF_BOX} color={CF_ORANGE} />
        </div>
      </div>

      {/* The slit line at dead center. */}
      <div
        style={{
          position: "absolute",
          left: SEAM - 1.5,
          top: CENTER_Y - 110,
          width: 3,
          height: 220,
          backgroundColor: "#FFFFFF",
          boxShadow: `0 0 16px 2px ${CF_ORANGE}`,
          opacity: slitOpacity,
          transform: `scaleY(${slitScaleY})`,
        }}
      />

      {/* Faint arrow between the logos. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: arrowOpacity,
        }}
      >
        <svg
          width={60}
          height={40}
          viewBox="0 0 60 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `translateX(${arrowDx}px)` }}
        >
          <path
            d="M8 20 H46 M36 11 L50 20 L36 29"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
