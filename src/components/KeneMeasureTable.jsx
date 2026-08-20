import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii, spacing } from "../theme";

const CELL_MIN_WIDTH = 640;

function Cell({ children, flex = 1, bold, header, last, style }) {
  return (
    <View
      style={[
        styles.cell,
        { flex },
        header && styles.cellHeader,
        !last && styles.cellBorderRight,
        style,
      ]}
    >
      <Text style={[styles.cellText, bold && styles.cellTextBold, header && styles.cellTextHeader]}>{children}</Text>
    </View>
  );
}

function SubHeaderRow({ last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorderBottom]}>
      <Cell flex={1}>ወዳቂ</Cell>
      <Cell flex={1}>ተጣይ</Cell>
      <Cell flex={1}>ተነሽ</Cell>
      <Cell flex={1} last>
        ስያፍ
      </Cell>
    </View>
  );
}

function QuadRow({ values, borderBottom }) {
  return (
    <View style={[styles.row, borderBottom && styles.rowBorderBottom]}>
      <Cell flex={1}>{values.wedaqi}</Cell>
      <Cell flex={1}>{values.tetay}</Cell>
      <Cell flex={1}>{values.tenesh}</Cell>
      <Cell flex={1} last>
        {values.siyaf}
      </Cell>
    </View>
  );
}

export function KeneMeasureTable({ title, rowGroupLabel, receivingLabel, houseLabel, mewqeHeaderLabel, rows }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: "100%" }}>
        <View style={[styles.table, { minWidth: CELL_MIN_WIDTH }]}>
          {/* Header row A */}
          <View style={[styles.row, styles.rowBorderBottom]}>
            <Cell flex={1.3} header bold>
              መደብ
            </Cell>
            <Cell flex={4} header bold>
              ተቀባሊ መደብ
            </Cell>
            <Cell flex={1.3} header bold>
              {"መውቀዒ ቤት"}
            </Cell>
            <Cell flex={4} header bold last>
              ቤት
            </Cell>
          </View>

          {/* Header row B + C, with column 1 and 3 spanning both */}
          <View style={[styles.row, styles.rowBorderBottom]}>
            <Cell flex={1.3} header bold style={styles.rowGroupCell}>
              {rowGroupLabel}
            </Cell>
            <View style={{ flex: 4 }}>
              <View style={[styles.row, styles.rowBorderBottom]}>
                <Cell flex={4} header bold last>
                  {receivingLabel}
                </Cell>
              </View>
              <SubHeaderRow last />
            </View>
            <Cell flex={1.3} header bold style={styles.rowGroupCell}>
              {mewqeHeaderLabel}
            </Cell>
            <View style={{ flex: 4 }}>
              <View style={[styles.row, styles.rowBorderBottom]}>
                <Cell flex={4} header bold last>
                  {houseLabel}
                </Cell>
              </View>
              <SubHeaderRow last />
            </View>
          </View>

          {/* Data rows */}
          {rows.map((row, i) => (
            <View key={i} style={[styles.row, i !== rows.length - 1 && styles.rowBorderBottom]}>
              <Cell flex={1.3} bold>
                {row.medeb}
              </Cell>
              <View style={{ flex: 4 }}>
                <QuadRow values={row.tekebali} />
              </View>
              <Cell flex={1.3}>{row.mewqe}</Cell>
              <View style={{ flex: 4 }} testID="bet-col">
                {row.bet.map((entry, j) => (
                  <QuadRow key={j} values={entry} borderBottom={j !== row.bet.length - 1} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.xl },
  title: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.borderInk,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  rowBorderBottom: {
    borderBottomWidth: 1,
    borderColor: colors.borderInk,
  },
  rowGroupCell: {
    alignSelf: "stretch",
  },
  cell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  cellHeader: {
    backgroundColor: colors.surfaceMuted,
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderColor: colors.borderInk,
  },
  cellText: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: "center",
  },
  cellTextBold: {
    fontFamily: fontFamily.ethiopicBold,
  },
  cellTextHeader: {
    fontFamily: fontFamily.ethiopicBold,
    color: colors.primaryDark,
  },
});
