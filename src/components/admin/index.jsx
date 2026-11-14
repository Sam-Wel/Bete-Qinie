import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Icon, ScreenContainer } from "../ui";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const ETHIOPIC = /[ሀ-፿]/;
export const scriptStyle = (text) => (ETHIOPIC.test(text || "") ? styles.ethiopic : null);

// Pages for admins alone; editors reach the admin area but not these.
export function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return children;
  return (
    <ScreenContainer center>
      <Card style={styles.only}>
        <Text style={styles.onlyTitle}>Admins only</Text>
        <Text style={styles.muted}>This page is for admins. Editors can work on the dictionary, reports, missed searches, the blog and the meters.</Text>
        <Button variant="secondary" onPress={() => router.replace("/admin")}>
          Back to Manage
        </Button>
      </Card>
    </ScreenContainer>
  );
}

// Two taps instead of a browser dialog: the first arms it, the second does it.
export function ConfirmButton({ children, confirmLabel = "Tap again to confirm", onConfirm, variant = "danger", size = "sm", disabled, style }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={armed ? "dangerConfirm" : variant}
      size={size}
      loading={busy}
      disabled={disabled}
      style={style}
      onPress={async () => {
        if (!armed) return setArmed(true);
        setArmed(false);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

// A line of feedback under an action: error, done, or plain information.
export function Notice({ tone = "info", children }) {
  if (!children) return null;
  const color = tone === "error" ? colors.danger : tone === "done" ? colors.success : colors.textSecondary;
  return <Text style={[styles.notice, { color }]}>{children}</Text>;
}

// A number with a label; tappable when it leads somewhere.
export function StatTile({ value, label, onPress, tone }) {
  const body = (
    <>
      <Text style={[styles.tileValue, tone === "alert" && value ? { color: colors.accent } : null, scriptStyle(String(value))]} numberOfLines={1}>
        {value ?? "—"}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ hovered, pressed }) => [styles.tile, (hovered || pressed) && styles.tileOn]} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    <View style={styles.tile}>{body}</View>
  );
}

export function TileRow({ children }) {
  return <View style={styles.tiles}>{children}</View>;
}

// One row of a list: a title, a line under it, something on the right.
export function ListRow({ title, subtitle, right, onPress, last }) {
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, scriptStyle(title)]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, scriptStyle(subtitle) && styles.rowSubEthiopic]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </>
  );
  const style = [styles.row, !last && styles.rowLine];
  return onPress ? (
    <Pressable onPress={onPress} style={({ hovered, pressed }) => [...style, (hovered || pressed) && styles.rowOn]}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

// A titled block of a page.
export function Panel({ title, right, children, style }) {
  return (
    <View style={[styles.panel, style]}>
      {title || right ? (
        <View style={styles.panelHead}>
          {title ? <Text style={[styles.panelTitle, scriptStyle(title)]}>{title}</Text> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Small selectable chips (filters, choices).
export function Chips({ items, value, onChange }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ hovered, pressed }) => [styles.chip, on && styles.chipOn, !on && (hovered || pressed) && styles.chipHover]}
          >
            <Text style={[styles.chipText, scriptStyle(item.label), on && styles.chipTextOn]}>
              {item.label}
              {item.count != null ? <Text style={[styles.chipCount, on && styles.chipTextOn]}>{`  ${item.count}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  page: { gap: spacing.lg },
  muted: { ...typography.caption, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  ethiopic: { fontFamily: fontFamily.ethiopicRegular },
  ethiopicBold: { fontFamily: fontFamily.ethiopicBold },
});

const styles = StyleSheet.create({
  only: { gap: spacing.md, alignItems: "center", maxWidth: 420 },
  onlyTitle: { ...typography.h2, color: colors.textPrimary },
  muted: { ...typography.caption, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
  ethiopic: { fontFamily: fontFamily.ethiopicBold },
  notice: { ...typography.caption, lineHeight: 18 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 76,
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileOn: { borderColor: colors.primary },
  tileValue: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  tileLabel: { ...typography.caption, color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowOn: { backgroundColor: colors.surfaceMuted },
  rowTitle: { ...typography.bodySemiBold, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textSecondary },
  rowSubEthiopic: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, lineHeight: 20 },
  panel: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" },
  panelTitle: { ...typography.label, color: colors.textSecondary, letterSpacing: 0.4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipHover: { backgroundColor: colors.surfaceMuted },
  chipText: { ...typography.label, fontSize: 13, color: colors.textPrimary },
  chipTextOn: { color: colors.onPrimary },
  chipCount: { ...typography.caption, color: colors.textMuted },
});
