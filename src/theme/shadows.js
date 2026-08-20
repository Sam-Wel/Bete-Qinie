function makeShadow(level) {
  const config = {
    1: { offset: 1, opacity: 0.05, radius: 3, elevation: 1 },
    2: { offset: 3, opacity: 0.07, radius: 8, elevation: 3 },
    3: { offset: 6, opacity: 0.1, radius: 16, elevation: 6 },
  }[level];

  return {
    shadowColor: "#2B2013",
    shadowOffset: { width: 0, height: config.offset },
    shadowOpacity: config.opacity,
    shadowRadius: config.radius,
    elevation: config.elevation,
  };
}

export const shadows = {
  card: makeShadow(1),
  raised: makeShadow(2),
  modal: makeShadow(3),
};
