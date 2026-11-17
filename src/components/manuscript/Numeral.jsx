import { Text } from "react-native";
import { toGeez } from "../../lib/geezNumerals";

// A number written in ግዕዝ numerals (፩ ፪ ፫), read aloud as `label` (or the plain number)
// by screen readers. For order and chapters; counts and scores stay 1, 2, 3.
export function Numeral({ n, label, style }) {
  return (
    <Text style={style} accessibilityLabel={label ?? String(n)}>
      {toGeez(n)}
    </Text>
  );
}
