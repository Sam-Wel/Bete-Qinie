import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeneMeasureTable } from "./KeneMeasureTable";
import { MeterPicker, lastMeter } from "./MeterPicker";
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

// One meter's tables at a time, chosen with the same picker as the checker and opening
// on the meter last used there. A table's own name is shown only when a meter has more
// than one, so a single table isn't headed by the meter's name a second time.
export function MeterTables() {
  const { meters } = useKeneMeters();
  const [meterId, setMeterId] = useState(() => lastMeter() ?? meters[0].id);
  const meter = meters.find((m) => m.id === meterId) ?? meters[0];

  const tables = meterTables(meter);
  const singles = haregRows(meter);
  const hareg = singles.filter((row) => !row.required);
  const named = singles.filter((row) => row.required);
  const segments = meter.lines.reduce((n, l) => n + countSlots(l), 0);

  return (
    <View style={styles.section}>
      <MeterPicker
        meters={meters}
        meterId={meter.id}
        onPick={(next) => setMeterId(next.id)}
        note={`${meter.lines.length} lines · ${segments} segments`}
      />

      <View style={styles.tables}>
        {tables.map((table) => {
          const built = buildMeasureTable(table);
          return <KeneMeasureTable key={table.id} {...built} title={tables.length > 1 ? built.title : null} />;
        })}

        {hareg.length ? <HaregTable rows={hareg} title="ሐረግ" note="Optional in every line." /> : null}
        {named.length ? (
          <HaregTable
            rows={named}
            title={[...new Set(named.map((row) => row.label))].join(" · ")}
            note="Measured on their own, not in a pair."
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg, gap: spacing.lg },
  tables: { gap: spacing.xs },

  hareg: { marginBottom: spacing.xl },
  haregTitle: {
    fontFamily: fontFamily.latinSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
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
