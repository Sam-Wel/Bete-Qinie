import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, radii, shadows, spacing, typography } from "../../theme";

export function Select({ label, value, onValueChange, items, placeholder = "Select...", style }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);
  const progress = useSharedValue(0);

  const selected = items.find((item) => item.value === value);

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
      progress.value = 0;
      progress.value = withTiming(1, { duration: 160 });
    });
  };

  const closeDropdown = () => setOpen(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable ref={triggerRef} style={styles.trigger} onPress={openDropdown}>
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeDropdown}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDropdown} />
        {anchor && (
          <Animated.View
            style={[
              styles.dropdown,
              animatedStyle,
              { top: anchor.y + anchor.height + 4, left: anchor.x, width: anchor.width },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {items.map((item) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    key={String(item.value)}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      closeDropdown();
                    }}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Icon name="checkmark" size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  triggerText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textMuted },
  dropdown: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    borderRadius: radii.md,
    maxHeight: 280,
    overflow: "hidden",
    ...shadows.modal,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { ...typography.body, color: colors.textPrimary },
  optionTextSelected: { ...typography.bodySemiBold, color: colors.primary },
});
