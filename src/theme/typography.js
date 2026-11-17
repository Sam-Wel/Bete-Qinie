import { Platform } from "react-native";

// On the web each weight is a WOFF2 file declared in src/app/+html.jsx that arrives after
// the page shows (font-display: swap). Until it does, text uses the device's own sans-serif
// and Ethiopic fonts rather than the browser's default serif.
const WEB_FALLBACK = ", system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Ethiopic', Kefa, Nyala, sans-serif";
const face = (name) => (Platform.OS === "web" ? `${name}${WEB_FALLBACK}` : name);

export const fontFamily = {
  latinRegular: face("Menbere_400Regular"),
  latinSemiBold: face("Menbere_600SemiBold"),
  latinBold: face("Menbere_700Bold"),
  ethiopicRegular: face("Menbere_400Regular"),
  ethiopicBold: face("Menbere_700Bold"),
};

export const typography = {
  h1: { fontFamily: fontFamily.latinBold, fontSize: 28, lineHeight: 34 },
  h1Ethiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 28, lineHeight: 38 },

  h2: { fontFamily: fontFamily.latinBold, fontSize: 22, lineHeight: 28 },
  h2Ethiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30 },

  body: { fontFamily: fontFamily.latinRegular, fontSize: 16, lineHeight: 22 },
  bodyEthiopic: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 24 },

  bodySemiBold: { fontFamily: fontFamily.latinSemiBold, fontSize: 16, lineHeight: 22 },

  label: { fontFamily: fontFamily.latinSemiBold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fontFamily.latinRegular, fontSize: 13, lineHeight: 17 },
  button: { fontFamily: fontFamily.latinSemiBold, fontSize: 16, lineHeight: 20 },
};
