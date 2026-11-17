import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./ui";
import { Sheet } from "./ui/Sheet";
import { playOpening } from "./manuscript/BookOpening";
import { setLabOn, setLabPiece, useLab } from "../hooks/useLab";
import { LAB_PIECES } from "../lib/lab";
import { colors, fontFamily, radii, spacing, typography } from "../theme";

// The design lab's panel: a small "Lab" button, only on a device that opened the app
// with ?lab=1, and a sheet of switches for the motion pieces being tried.
export function DesignLab() {
  const lab = useLab();
  const [open, setOpen] = useState(false);
  if (!lab.on) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.button} accessibilityRole="button" accessibilityLabel="Design lab">
        <Text style={styles.buttonText}>Lab</Text>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} label="Design lab">
        <View style={styles.body}>
          <Text style={styles.title}>Design lab</Text>
          <Text style={styles.note}>Motion being tried, on this device only. Switch pieces on to see them.</Text>
          {LAB_PIECES.map((p) => {
            const on = lab.pieces[p.key] === true;
            return (
              <Pressable
                key={p.key}
                onPress={() => setLabPiece(p.key, !on)}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.label}</Text>
                  <Text style={styles.rowNote}>{p.note}</Text>
                </View>
                <View style={[styles.track, on && styles.trackOn]}>
                  <View style={[styles.knob, on && styles.knobOn]} />
                </View>
              </Pressable>
            );
          })}
          <View style={styles.actions}>
            <Button
              variant="secondary"
              onPress={() => {
                setOpen(false);
                setTimeout(playOpening, 250);
              }}
            >
              Play the opening now
            </Button>
            <Button
              variant="plain"
              onPress={() => {
                setOpen(false);
                setLabOn(false);
              }}
            >
              Turn the lab off
            </Button>
          </View>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 12,
    bottom: 96,
    zIndex: 900,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.rubric,
  },
  buttonText: { fontFamily: fontFamily.latinBold, fontSize: 13, color: "#fff" },
  body: { gap: spacing.md, padding: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  rowTitle: { ...typography.bodySemiBold, color: colors.textPrimary },
  rowNote: { ...typography.caption, color: colors.textSecondary },
  track: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 3 },
  trackOn: { backgroundColor: colors.rubric },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface },
  knobOn: { transform: [{ translateX: 16 }] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
});
