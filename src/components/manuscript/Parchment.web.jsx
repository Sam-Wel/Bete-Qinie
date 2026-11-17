// Parchment under the page: a faint fibre (one small noise tile the browser draws once)
// and, on wide screens, the ruling a scribe draws before writing, which doubles as the
// layout grid. Colours come from the theme's custom properties, so it follows dark mode.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0 0.15 0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
)}")`;

export function Parchment({ ruled = false }) {
  const layers = [GRAIN];
  const sizes = ["180px 180px"];
  if (ruled) {
    layers.push("linear-gradient(to right, var(--c-border) 1px, transparent 1px)", "linear-gradient(to bottom, var(--c-border) 1px, transparent 1px)");
    sizes.push("160px 160px", "160px 160px");
  }
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: layers.join(", "), backgroundSize: sizes.join(", ") }}
    />
  );
}
