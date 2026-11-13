import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Icon } from "../ui";
import { shared } from "../verbQuiz/shared";
import { useAuth } from "../../context/AuthContext";
import { useStudyPlan } from "../../hooks/useStudyPlan";
import { hasStudied } from "../../lib/daily";
import { colors, fontFamily, spacing, typography } from "../../theme";

// A first visit to ዛሬ: what the page is for, where the guides are, and, for a guest,
// that signing in keeps their progress. It goes away once closed (on this device)
// or once the learner has answered anything, so people who already study never see it.
export function WelcomeCard({ stats }) {
  const { user } = useAuth();
  const [plan, setPlan] = useStudyPlan();
  if (!plan.loaded || plan.welcomed || hasStudied(stats)) return null;

  return (
    <View style={[shared.card, styles.card]} accessibilityLabel="Welcome to ቤተ ቅኔ">
      <Text style={styles.kicker}>WELCOME TO ቤተ ቅኔ</Text>
      <Text style={styles.title}>Learn ግዕዝ a few words a day</Text>
      <Text style={styles.body}>
        Work down this page each day: review the words that are due, learn today's new words, then play with them.
      </Text>
      <View style={styles.tip}>
        <Icon name="help-circle-outline" size={18} color={colors.primaryDark} strokeWidth={2} />
        <Text style={[styles.body, { flex: 1 }]}>Tap ? at the top of any page to see how it works.</Text>
      </View>
      {user ? null : (
        <Text style={styles.body}>Your progress is saved on this device. Sign in to keep it on every device.</Text>
      )}
      <View style={shared.row}>
        <Button size="sm" variant="secondary" onPress={() => setPlan({ welcomed: true })}>
          Got it
        </Button>
        {user ? null : (
          <Button size="sm" variant="ghost" onPress={() => router.navigate("/auth/sign-in")}>
            Sign in
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, borderColor: colors.primary },
  kicker: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  body: { ...typography.body, lineHeight: 22, color: colors.textPrimary },
  tip: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
