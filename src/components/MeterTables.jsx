import { StyleSheet, Text, View } from "react-native";
import { KeneMeasureTable } from "./KeneMeasureTable";
import { OrnamentDivider } from "./ui/OrnamentDivider";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { LINE_TYPES, ORDINALS, buildMeasureTable, haregRows, meterTables } from "../lib/keneMeters";
import { useKeneMeters } from "../hooks/useKeneMeters";

const countSlots = (line) => line.parts.reduce((n, part) => n + (part.kind === "hareg" ? 1 : 2), 0);

function HaregTable({ rows, title, note }) {
  return (
    <View style={styles.hareg}>
      <Text style={styles.haregTitle}>{title}</Text>
      <Text style={styles.haregNote}>{note}</Text>

      <View style={styles.haregGrid}>
        <View style={styles.haregRow}>
          <Text style={[styles.haregCell, styles.haregCorner]} />
          {LINE_TYPES.map((type) => (
            <Text key={type.key} style={[styles.haregCell, styles.haregHead]}>
              {type.label}
            </Text>
          ))}
        </View>

        {rows.map((row, i) => (
          <View key={i} style={[styles.haregRow, styles.haregRowBorder]}>
            <Text style={[styles.haregCell, styles.haregHead]}>
              ቤት {ORDINALS[row.index]}
              {row.required ? `\n${row.label}` : ""}
            </Text>
            {LINE_TYPES.map((type) => (
              <Text key={type.key} style={styles.haregCell}>
                {row.cells[type.key]}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function MeterTables() {
  const { meters } = useKeneMeters();

  return (
    <View>
      {meters.map((meter, index) => {
        const tables = meterTables(meter);
        const singles = haregRows(meter);
        const hareg = singles.filter((row) => !row.required);
        const named = singles.filter((row) => row.required);

        return (
          <View key={meter.id} style={styles.section}>
            {index > 0 ? <OrnamentDivider style={styles.sectionDivider} /> : null}
            <Text style={styles.meterTitle}>{meter.title}</Text>
            <Text style={styles.meterNote}>
              {meter.lines.length} lines · {meter.lines.reduce((n, l) => n + countSlots(l), 0)} segments
            </Text>

            {tables.map((table) => (
              <KeneMeasureTable key={table.id} {...buildMeasureTable(table)} />
            ))}

            {hareg.length ? <HaregTable rows={hareg} title="ሐረግ" note="Optional in every line." /> : null}
            {named.length ? (
              <HaregTable
                rows={named}
                title={[...new Set(named.map((row) => row.label))].join(" · ")}
                note="Measured on their own, not in a pair."
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionDivider: { marginBottom: spacing.xl },
  meterTitle: { ...typography.h2Ethiopic, color: colors.primary },
  meterNote: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },

  hareg: { marginBottom: spacing.xl },
  haregTitle: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 18,
    color: colors.primary,
    marginBottom: 2,
  },
  haregNote: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  haregGrid: {
    borderWidth: 1,
    borderColor: colors.borderInk,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  haregRow: { flexDirection: "row" },
  haregRowBorder: { borderTopWidth: 1, borderColor: colors.borderInk },
  haregCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    textAlign: "center",
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  haregCorner: { backgroundColor: colors.surfaceMuted },
  haregHead: {
    fontFamily: fontFamily.ethiopicBold,
    color: colors.primaryDark,
    backgroundColor: colors.surfaceMuted,
  },
});
