import { ScrollViewStyleReset } from "expo-router/html";
import { themeBootScript, themeCss } from "../theme/palettes";

// Installed on a phone's home screen, the app should feel native: no browser bars,
// no page bounce, no double-tap zoom. The page itself never scrolls; each screen
// scrolls inside its own container, so the header and the bottom tabs stay put.
const appShellCss = `
html, body { height: 100%; width: 100%; overflow: hidden; overscroll-behavior: none; }
body { position: fixed; inset: 0; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
#root { height: 100%; }
#root div { overscroll-behavior: contain; }
a, button, [role="button"], [role="link"], [role="tab"] { touch-action: manipulation; }
`;

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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style id="app-shell" dangerouslySetInnerHTML={{ __html: appShellCss }} />
        <style id="theme-colors" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
