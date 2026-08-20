import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme";

export function OrnamentDivider({ style }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
      <Svg width={9} height={9} viewBox="0 0 12 12" style={{ marginHorizontal: 10 }}>
        <Path d="M6 0 L12 6 L6 12 L0 6 Z" fill={colors.accent} />
      </Svg>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
    </View>
  );
}
