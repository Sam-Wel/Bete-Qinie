import { ScrollViewStyleReset } from "expo-router/html";
import { themeBootScript, themeCss } from "../theme/palettes";
import { SPLASH_LINKS } from "../lib/splashLinks";

// Installed on a phone's home screen, the app should feel native: no browser bars,
// no page bounce, no double-tap zoom. The page itself never scrolls; each screen
// scrolls inside its own container, so the header and the bottom tabs stay put.
const appShellCss = `
html, body { height: 100%; width: 100%; overflow: hidden; overscroll-behavior: none; }
body { position: fixed; inset: 0; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
#root { height: 100%; }
#root div { overscroll-behavior: contain; }
a, button, [role="button"], [role="link"], [role="tab"] { touch-action: manipulation; }
button, [role="button"], [role="link"], [role="tab"], [role="tablist"], div[tabindex] {
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
}
`;

// Menbere, one WOFF2 per weight (about a third of the old TTFs). Each family answers any
// weight, so the browser never fakes bold on top; swap shows the text at once in a system
// font and switches when the file arrives.
const fontCss = [
  ["400Regular", 400],
  ["600SemiBold", 600],
  ["700Bold", 700],
]
  .map(
    ([name, weight]) =>
      `@font-face{font-family:"Menbere_${name}";src:url("/fonts/menbere-${weight}.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}`
  )
  .join("");

// Every page is pre-built in its phone layout, so a phone shows it before the script
// arrives. A wide screen (sidebar layout) keeps it hidden until the app has drawn the real
// layout (data-ready, set in _layout.jsx), so nothing jumps; after 4 s it shows regardless.
const wideCss = `@media (min-width: 900px){html:not([data-ready]) #root{visibility:hidden;animation:show-root 0s 4s forwards}}@keyframes show-root{to{visibility:visible}}`;

// Web page shell. The theme script runs before the app so dark mode doesn't flash light.
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ቤተ ቅኔ" />
        <meta name="theme-color" content="#FBF6EA" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#15100A" media="(prefers-color-scheme: dark)" />
        <link rel="preload" href="/fonts/menbere-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/menbere-700.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {SPLASH_LINKS.map((l) => (
          <link key={l.href} rel="apple-touch-startup-image" href={l.href} media={l.media} />
        ))}
        <ScrollViewStyleReset />
        <style id="app-shell" dangerouslySetInnerHTML={{ __html: appShellCss }} />
        <style id="theme-colors" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <style id="fonts" dangerouslySetInnerHTML={{ __html: fontCss + wideCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
