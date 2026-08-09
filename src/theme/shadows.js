function makeShadow(level) {
  const config = {
    1: { offset: 1, opacity: 0.08, radius: 2, elevation: 1 },
    2: { offset: 2, opacity: 0.1, radius: 4, elevation: 3 },
    3: { offset: 4, opacity: 0.12, radius: 8, elevation: 6 },
  }[level];

  return {
    shadowColor: "#3b2a1a",
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
