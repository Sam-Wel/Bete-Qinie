import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "./ui/Icon";
import { colors, fontFamily, spacing } from "../theme";

// The meter the page works on, written like a measured segment: its name on a gold line
// and a small caption beneath. Tapping it opens the list of meters; picking one folds the
// list again (like ግሲ's word list). `note` replaces the caption's "Meter"; `right` sits
// at the far end of the row (the progress count, say).
export function MeterPicker({ meters, meterId, onPick, note = "Meter", right = null }) {
  const [open, setOpen] = useState(false);
  const meter = meters.find((m) => m.id === meterId) ?? meters[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${meter.title}: choose another meter`}
          style={({ hovered, focused }) => [styles.current, (hovered || focused) && styles.currentHover]}
        >
          <View style={styles.currentLine}>
            <Text style={styles.currentText}>{meter.title}</Text>
            <Icon name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
          </View>
          <Text style={styles.caption}>
            {`${note}  ·  `}
            <Text style={styles.captionAction}>{open ? "close" : "change"}</Text>
          </Text>
        </Pressable>
        {right}
      </View>

      {open ? (
        <View style={styles.list}>
          {meters.map((option) => {
            const on = option.id === meter.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  if (!on) onPick(option);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ hovered, focused }) => [styles.item, (hovered || focused) && !on && styles.itemHover, on && styles.itemOn]}
              >
                <Text style={[styles.itemText, on && styles.itemTextOn]}>{option.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  bar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  current: { alignSelf: "flex-start", gap: 3, outlineStyle: "none" },
  currentHover: { opacity: 0.8 },
  currentLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
  },
  currentText: { fontFamily: fontFamily.latinSemiBold, fontSize: 19, lineHeight: 28, color: colors.textPrimary },
  caption: { fontFamily: fontFamily.latinRegular, fontSize: 10.5, lineHeight: 14, color: colors.textMuted, opacity: 0.8 },
  captionAction: { color: colors.primaryDark, textDecorationLine: "underline" },
  list: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.lg, rowGap: spacing.sm, paddingVertical: spacing.xs },
  item: { borderBottomWidth: 1.5, borderBottomColor: "transparent", paddingBottom: 1, outlineStyle: "none" },
  itemHover: { borderBottomColor: colors.border },
  itemOn: { borderBottomColor: colors.primary },
  itemText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 15, lineHeight: 24, color: colors.textSecondary },
  itemTextOn: { fontFamily: fontFamily.latinSemiBold, color: colors.textPrimary },
});

// The meter last open in the checker, so the tables tab opens on the same one.
let lastMeterId = null;
export const rememberMeter = (id) => {
  lastMeterId = id;
};
export const lastMeter = () => lastMeterId;
