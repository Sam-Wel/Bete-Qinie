import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Icon, ScreenContainer } from "../../components/ui";
import { CrossMenuIcon } from "../../components/ui/CrossMenuIcon";
import { useLexicon } from "../../hooks/useLexicon";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const CONTACT_EMAIL = "samuel.fessehaye477@gmail.com";

// What each part of the app is for, in the order a learner meets them.
const PARTS = [
  { href: "/", title: "መዝገበ ቃላት", english: "Dictionary", line: "Look up a word in ግዕዝ, ትግርኛ, አማርኛ or English." },
  { href: "/verb-roots", title: "ግሲ", english: "Verbs", line: "Every verb by its ending, with its head (ርእስ) and its ርባታ." },
  { href: "/today", title: "ዛሬ", english: "Today", line: "A small set of new words each day, learned step by step." },
  { href: "/review", title: "ክለሳ", english: "Review", line: "Words come back just before you would forget them." },
  { href: "/verb-quiz", title: "ግሲ ፈተና", english: "Quiz", line: "Test yourself family by family and watch your progress." },
  { href: "/game", title: "ጨዋታዎች", english: "Games", line: "ቃል, ርእስ, ቀስት and more, played on the words you are learning." },
  { href: "/meaqeni", title: "መዐቀኒ", english: "Meters", line: "Measure a line of ቅኔ against the meters of each kind." },
  { href: "/zema", title: "ዜማ", english: "Chant", line: "Listen to ቅኔ chanted, and loop a line to learn it." },
  { href: "/blog", title: "ቅኔ አበው", english: "Classical ቅኔ", line: "Classical ቅኔ of the fathers, to read and study." },
];

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ስለ ቤተ ቅኔ: what the app is for, what is in it, where its words come from, which
// version is running, and whom to write to.
export default function About() {
  const { release } = useLexicon();
  const appVersion = Constants.expoConfig?.version;

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <CrossMenuIcon size={44} color={colors.primaryDark} ground={colors.primaryLight} />
        </View>
        <Text style={styles.heroTitle}>ቤተ ቅኔ</Text>
        <Text style={styles.heroLine}>Learn ግዕዝ the way the ቅኔ ቤት teaches it.</Text>
      </View>

      <Section title="What it's for">
        <Text style={styles.body}>
          ቤተ ቅኔ is for anyone learning ግዕዝ, the language of the church's books, prayers and ቅኔ. It starts where the
          church schools start: the verbs (ግሲ), what they mean in ትግርኛ, አማርኛ and English, and how each one is
          conjugated (ርባታ) after its head verb (ርእስ). From there it goes on to the meters of ቅኔ, ቅኔ chanted aloud,
          and classical ቅኔ to read.
        </Text>
        <Text style={styles.body}>
          Learn a few new words every day, review them just before you would forget them, and practise with games. Your
          progress stays on this device, or in your account if you sign in.
        </Text>
      </Section>

      <Section title="What's inside">
        <View style={styles.parts}>
          {PARTS.map((part, i) => (
            <Pressable
              key={part.href}
              onPress={() => router.navigate(part.href)}
              accessibilityRole="link"
              style={({ hovered, pressed }) => [styles.part, i < PARTS.length - 1 && styles.partLine, (hovered || pressed) && styles.partHover]}
            >
              <View style={styles.partText}>
                <Text style={styles.partTitle}>
                  {part.title} <Text style={styles.partEnglish}>{part.english}</Text>
                </Text>
                <Text style={styles.partLine2}>{part.line}</Text>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Where the words come from">
        <Text style={styles.body}>
          The meanings come from ቤተ ቅኔ's own dictionary. Each verb's head (ርእስ) and its printed forms (ርባታ) come from the
          church-school verb book መጽሐፈ ግስ ወሰዋስው, read page by page. They are being checked against ፈለገ ግስ and other
          books, and corrections arrive in new versions of the data.
        </Text>
      </Section>

      <Section title="Version">
        <View style={styles.versions}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>App</Text>
            <Text style={styles.versionValue}>{appVersion || "—"}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Dictionary data</Text>
            <Text style={styles.versionValue}>
              {release ? `${release.tag.replace(/^data-/, "")} · released ${release.released_on}` : "—"}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Contact">
        <Text style={styles.body}>Questions, corrections, or ideas for ቤተ ቅኔ? Write to:</Text>
        <Pressable
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("ቤተ ቅኔ")}`)}
          accessibilityRole="link"
          style={({ hovered }) => [styles.mail, hovered && styles.partHover]}
        >
          <Icon name="mail-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.mailText} selectable>
            {CONTACT_EMAIL}
          </Text>
        </Pressable>
      </Section>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, maxWidth: 760, width: "100%", alignSelf: "center" },
  hero: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  heroArt: {
    width: 72,
    height: 72,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 32, lineHeight: 44, color: colors.textPrimary },
  heroLine: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  card: {
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg + 4,
    padding: spacing.lg + 2,
  },
  sectionTitle: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark, textTransform: "uppercase" },
  body: { fontFamily: fontFamily.latinRegular, fontSize: 16, lineHeight: 26, color: colors.textPrimary },
  parts: { borderWidth: 1, borderColor: colors.borderMuted, borderRadius: radii.md, overflow: "hidden" },
  part: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  partLine: { borderBottomWidth: 1, borderBottomColor: colors.borderMuted },
  partHover: { backgroundColor: colors.surfaceMuted },
  partText: { flex: 1, gap: 2 },
  partTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  partEnglish: { fontFamily: fontFamily.latinRegular, fontSize: 13, color: colors.textSecondary },
  partLine2: { fontFamily: fontFamily.latinRegular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  versions: { gap: 6 },
  versionRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  versionLabel: { ...typography.body, color: colors.textSecondary },
  versionValue: { fontFamily: fontFamily.latinSemiBold, fontSize: 16, color: colors.textPrimary },
  mail: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mailText: { fontFamily: fontFamily.latinSemiBold, fontSize: 16, color: colors.primaryDark },
});
