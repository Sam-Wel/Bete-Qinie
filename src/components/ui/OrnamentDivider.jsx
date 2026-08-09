import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme";

export function OrnamentDivider({ style }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderGold }} />
      <Svg width={12} height={12} viewBox="0 0 12 12" style={{ marginHorizontal: 8 }}>
        <Path d="M6 0 L12 6 L6 12 L0 6 Z" fill={colors.primary} />
      </Svg>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderGold }} />
    </View>
  );
}
