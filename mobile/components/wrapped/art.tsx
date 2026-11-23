// The shapes on the Wrapped posters, as plain SVG. They don't move by
// themselves: a card wraps them in <Rise>/<Loop> (motion.tsx) to make them
// drift, spin or pulse, which works the same on phones and in the browser.

import Svg, { Circle, Path, Rect } from "react-native-svg";

type Sized = { size: number; color: string };

/** An outlined circle (the intro's sonar rings). */
export function Ring({ size, color, stroke = 6 }: Sized & { stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - stroke} stroke={color} strokeWidth={stroke} fill="none" />
    </Svg>
  );
}

/** A filled circle. */
export function Disc({ size, color }: Sized) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Circle cx={5} cy={5} r={5} fill={color} />
    </Svg>
  );
}

// Soft, lumpy shapes in a 200 x 200 box
const BLOBS = [
  "M100 8C150 6 192 40 194 96C196 150 160 194 102 194C46 194 6 160 8 104C10 50 48 10 100 8Z",
  "M108 6C162 14 196 58 186 112C176 166 132 198 80 188C28 178 0 132 10 82C20 34 58 -2 108 6Z",
  "M96 10C140 0 186 30 192 84C198 138 172 186 118 194C64 202 14 172 8 116C2 60 52 20 96 10Z",
];

export function Blob({ size, color, shape = 0 }: Sized & { shape?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d={BLOBS[shape % BLOBS.length]} fill={color} />
    </Svg>
  );
}

/** Straight bands, `thickness` wide with an equal gap. Rotate the parent for diagonals. */
export function Stripes({ width, height, color, thickness }: { width: number; height: number; color: string; thickness: number }) {
  const count = Math.ceil(width / (thickness * 2)) + 1;
  return (
    <Svg width={width} height={height}>
      {Array.from({ length: count }, (_, i) => (
        <Rect key={i} x={i * thickness * 2} y={0} width={thickness} height={height} fill={color} />
      ))}
    </Svg>
  );
}

/** A grid of polka dots. */
export function Dots({ width, height, color, gap, radius }: { width: number; height: number; color: string; gap: number; radius: number }) {
  const cols = Math.ceil(width / gap) + 1;
  const rows = Math.ceil(height / gap) + 1;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Every other row shifts half a gap, like the polka-dot poster
      dots.push(<Circle key={`${r}-${c}`} cx={c * gap + (r % 2 ? gap / 2 : 0)} cy={r * gap} r={radius} fill={color} />);
    }
  }
  return <Svg width={width} height={height}>{dots}</Svg>;
}

/** A leaf, tip up. */
export function Leaf({ size, color, vein }: Sized & { vein: string }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 50 70">
      <Path d="M25 2C44 18 48 44 25 68C2 44 6 18 25 2Z" fill={color} />
      <Path d="M25 12V62" stroke={vein} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** A loose hand-drawn loop, like the scribbles on the inspiration posters. */
export function Scribble({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 300 120">
      <Path
        d="M2 90C40 20 70 110 110 60C140 22 120 4 98 30C76 58 150 104 190 70C226 40 210 12 196 34C180 60 250 100 298 40"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * The two recycling arrows from the Sortify logo (assets/redesign/sortify-logo.svg),
 * in its own 0-100 box: two arcs round the middle, each with an arrowhead.
 */
export function RecycleArrows({ size, top, bottom }: { size: number; top: string; bottom: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M21.00 36.48 A32 32 0 0 1 73.78 28.59" fill="none" stroke={top} strokeWidth={19} />
      <Path d="M84.18 19.22 L80.91 41.72 L63.38 37.96 Z" fill={top} stroke={top} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M79.00 63.52 A32 32 0 0 1 26.22 71.41" fill="none" stroke={bottom} strokeWidth={19} />
      <Path d="M15.82 80.78 L19.09 58.28 L36.62 62.04 Z" fill={bottom} stroke={bottom} strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}
