import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, typography } from "../../theme";

// Native: the same painting and credit through expo-image, which picks the best of the
// sizes for the view. (The web version, Plate.web.jsx, adds the gold gleam.)
export function Plate({ art, priority = false, style }) {
  const sources = art.widths.map((w) => ({ uri: `/art/${art.base}-${w}.webp`, width: w, height: Math.round(w * art.ratio) }));
  return (
    <View style={style}>
      <Image
        source={sources}
        alt={art.alt}
        contentFit="contain"
        priority={priority ? "high" : "normal"}
        style={{ width: "100%", aspectRatio: 1 / art.ratio }}
      />
      <Text style={styles.credit}>{art.credit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  credit: { ...typography.caption, color: colors.textMuted, marginTop: 8, textAlign: "center" },
});
