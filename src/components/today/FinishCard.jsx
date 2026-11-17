import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Button } from "../ui";
import { GoldLeaf } from "../manuscript/GoldLeaf";
import { shared } from "../verbQuiz/shared";
import { colors, fontFamily, spacing, typography } from "../../theme";

// After a ዛሬ session: what was done, the streak, and what happens next. Gold leaf falls
// when a word was learned (or shown already known).
export function FinishCard({ session, streak, left, onKeepGoing, onClose }) {
  const won = session.learned + session.skipped;
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={[shared.card, styles.card]}>
      {won ? <GoldLeaf /> : null}
      <Text style={styles.title}>{won ? "Well done!" : "Session saved"}</Text>
      <Text style={styles.line}>
        {[
          session.learned ? `${session.learned} learned` : null,
          session.skipped ? `${session.skipped} you already knew` : null,
          session.asked ? `${session.right}/${session.asked} right` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Nothing answered yet."}
      </Text>
      {streak ? (
        <View style={styles.streak}>
          <Animated.Text entering={ZoomIn.delay(250).springify().damping(7)} style={styles.flame}>
            🔥
          </Animated.Text>
          <Text style={styles.streakText}>{`${streak}-day streak`}</Text>
        </View>
      ) : null}
      <Text style={shared.hint}>
        {session.learned ? "They come back tomorrow in ክለሳ." : left ? "Pick up where you left off any time." : "See you tomorrow."}
      </Text>
      <View style={styles.actions}>
        {left ? <Button onPress={onKeepGoing}>{`Keep learning (${left} left)`}</Button> : null}
        <Button variant={left ? "ghost" : "secondary"} onPress={onClose}>
          Close
        </Button>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, borderColor: colors.primary, overflow: "visible" },
  title: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  line: { ...typography.bodySemiBold, color: colors.success },
  streak: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flame: { fontSize: 30, lineHeight: 38 },
  streakText: { ...typography.bodySemiBold, color: colors.primaryDark },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
});
