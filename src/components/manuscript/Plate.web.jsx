import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { prefersReducedMotion } from "../../lib/motion";
import { colors, typography } from "../../theme";

const src = (art, w) => `/art/${art.base}-${w}.webp`;

// A painting on the page with its credit underneath. On the web it is a real <img> with
// srcset, so the browser fetches only the size it needs, waits until it is near the
// screen (unless `priority`), and decodes it off the main thread. `sweep` runs one
// slow gleam of gold light across the painting when it first comes into view (masked
// to the painting itself; nothing with Reduce Motion).
export function Plate({ art, sizes = "(min-width: 900px) 440px, 86vw", priority = false, sweep = false, style }) {
  const box = useRef(null);
  const img = useRef(null);
  const shine = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!sweep || !el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const layer = shine.current;
        if (!layer?.firstChild?.animate) return;
        const url = `url("${img.current?.currentSrc || src(art, art.widths[0])}")`;
        layer.style.webkitMaskImage = url;
        layer.style.maskImage = url;
        layer.firstChild.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(320%)" }], {
          duration: 1800,
          delay: 300,
          easing: "cubic-bezier(.45,0,.25,1)",
        });
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sweep, art]);

  const width = art.widths[art.widths.length - 1];
  return (
    <View style={style}>
      <div ref={box} style={{ position: "relative", width: "100%", aspectRatio: `1 / ${art.ratio}` }}>
        <img
          ref={img}
          src={src(art, art.widths[1])}
          srcSet={art.widths.map((w) => `${src(art, w)} ${w}w`).join(", ")}
          sizes={sizes}
          width={width}
          height={Math.round(width * art.ratio)}
          alt={art.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
        />
        {sweep ? (
          <div
            ref={shine}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              mixBlendMode: "screen",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "38%",
                transform: "translateX(-120%)",
                background:
                  "linear-gradient(105deg, rgba(255,230,160,0) 0%, rgba(255,226,150,0.5) 48%, rgba(255,246,214,0.62) 52%, rgba(255,230,160,0) 100%)",
              }}
            />
          </div>
        ) : null}
      </div>
      <Text style={styles.credit}>{art.credit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  credit: { ...typography.caption, color: colors.textMuted, marginTop: 8, textAlign: "center" },
});
