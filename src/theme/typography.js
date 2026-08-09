export const fontFamily = {
  latinRegular: "Inter_400Regular",
  latinSemiBold: "Inter_600SemiBold",
  latinBold: "Inter_700Bold",
  ethiopicRegular: "NotoSansEthiopic_400Regular",
  ethiopicBold: "NotoSansEthiopic_700Bold",
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
