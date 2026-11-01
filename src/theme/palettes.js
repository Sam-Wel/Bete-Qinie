// Light is the original parchment look; dark keeps the same gold and red on warm
// near-black. Tokens used as text (primaryDark, accentDark, dangerDark, success)
// get lighter in dark so they stay readable; the *Light tokens become dark tints.
export const palettes = {
  light: {
    primary: "#C0850C",
    primaryDark: "#8F5F08",
    primaryLight: "#F6E2AC",
    onPrimary: "#fffaf0",

    accent: "#A23B26",
    accentDark: "#7A2B1B",
    accentLight: "#F4DCD3",

    background: "#FBF6EA",
    surface: "#FFFFFF",
    surfaceMuted: "#F4EEDD",
    border: "#EBE0C4",
    borderMuted: "#F1E9D4",
    borderGold: "#C0850C",
    borderInk: "#8a6d47",

    textPrimary: "#2B2013",
    textSecondary: "#6b5233",
    textMuted: "#9c8760",

    danger: "#7a2e2e",
    dangerDark: "#5c1f1f",
    dangerLight: "#ecd7d2",
    dangerHover: "#5c1f1f",

    success: "#4a5d3a",
    successLight: "#dbe4cf",

    warning: "#f3dfa0",
    warningText: "#7a5609",

    white: "#fffaf0",

    backdrop: "rgba(43, 32, 19, 0.45)",
    parchment1: "#FDFAF1",
    parchment2: "#FBF6EA",
    parchment3: "#F6EDD4",
  },
  dark: {
    primary: "#C98E1A",
    primaryDark: "#E6B85C",
    primaryLight: "#3A2C12",
    onPrimary: "#fffaf0",

    accent: "#C9543B",
    accentDark: "#EE9A84",
    accentLight: "#3E1F17",

    background: "#15100A",
    surface: "#211910",
    surfaceMuted: "#2A2116",
    border: "#3D3020",
    borderMuted: "#2F2519",
    borderGold: "#C98E1A",
    borderInk: "#9C8158",

    textPrimary: "#F3E8D0",
    textSecondary: "#CDB68C",
    textMuted: "#9A855F",

    danger: "#A8443A",
    dangerDark: "#EE9C90",
    dangerLight: "#3B1C19",
    dangerHover: "#8A3229",

    success: "#9DBB7C",
    successLight: "#26301C",

    warning: "#3F3211",
    warningText: "#EBC96C",

    white: "#fffaf0",

    backdrop: "rgba(0, 0, 0, 0.6)",
    parchment1: "#1B140C",
    parchment2: "#15100A",
    parchment3: "#100C07",
  },
};

export const THEME_KEY = "bete-qinie:theme:v1";

// CSS for the web page: every token as a custom property, swapped by data-theme.
export function themeCss() {
  const vars = (p) => Object.entries(p).map(([k, v]) => `--c-${k}:${v};`).join("");
  return (
    `:root{${vars(palettes.light)}color-scheme:light}` +
    `:root[data-theme="dark"]{${vars(palettes.dark)}color-scheme:dark}` +
    `html,body{background-color:var(--c-background)}`
  );
}

// Runs before the app paints, so the saved or system theme shows with no flash.
export const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_KEY)};var m=window.matchMedia("(prefers-color-scheme: dark)");function apply(){var p;try{p=localStorage.getItem(k)}catch(e){}p=p||"system";var t=p==="dark"||(p==="system"&&m.matches)?"dark":"light";document.documentElement.setAttribute("data-theme",t);}apply();m.addEventListener("change",apply);window.__beteQinieApplyTheme=apply;}catch(e){}})();`;
