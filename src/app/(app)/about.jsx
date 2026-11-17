import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Button, Icon } from "../../components/ui";
import { WordCard } from "../../components/WordCard";
import { ART } from "../../components/manuscript/art";
import { Harag } from "../../components/manuscript/Harag";
import { Story } from "../../components/manuscript/Story";
import { useLexicon } from "../../hooks/useLexicon";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const CONTACT_EMAIL = "samuel.fessehaye477@gmail.com";

// Each part of the app, told in the chapter where a learner meets it.
const PART = {
  dictionary: { href: "/", title: "መዝገበ ቃላት", english: "Dictionary", line: "Look up a word in ግዕዝ, ትግርኛ, አማርኛ or English." },
  verbs: { href: "/verb-roots", title: "ግሲ", english: "Verbs", line: "Every verb by its ending, with its head (ርእስ) and its ርባታ." },
  today: { href: "/today", title: "ዛሬ", english: "Today", line: "A small set of new words each day, learned step by step." },
  review: { href: "/review", title: "ክለሳ", english: "Review", line: "Words come back just before you would forget them." },
  quiz: { href: "/verb-quiz", title: "ግሲ ፈተና", english: "Quiz", line: "Test yourself family by family and watch your progress." },
  games: { href: "/game", title: "ጨዋታዎች", english: "Games", line: "ቃል, ርእስ, ቀስት and more, played on the words you are learning." },
  meters: { href: "/meaqeni", title: "መዐቀኒ", english: "Meters", line: "Measure a line of ቅኔ against the meters of each kind." },
  zema: { href: "/zema", title: "ዜማ", english: "Chant", line: "Listen to ቅኔ chanted, and loop a line to learn it." },
  blog: { href: "/blog", title: "ቅኔ አበው", english: "Classical ቅኔ", line: "Classical ቅኔ of the fathers, to read and study." },
};

const SEBERE = { ti: ["ሰበረ"], am: ["ሰበረ"], en: ["break", "shatter"] };
// The paintings on this page, credited again in the colophon.
const PAINTINGS = [ART.ewostatewos, ART.luke];

function Parts({ items }) {
  return (
    <View style={styles.parts}>
      {items.map((part, i) => (
        <Pressable
          key={part.href}
          onPress={() => router.navigate(part.href)}
          accessibilityRole="link"
          style={({ hovered, pressed }) => [styles.part, i < items.length - 1 && styles.partLine, (hovered || pressed) && styles.partHover]}
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
  );
}

// ስለ ቤተ ቅኔ: what the app is for, told in seven chapters like a manuscript, ending with
// a colophon (version, sources, the paintings' credits, and whom to write to).
export default function About() {
  const { release } = useLexicon();
  const appVersion = Constants.expoConfig?.version;

  const chapters = [
    {
      key: "school",
      title: "ቅኔ ቤት",
      english: "The school",
      art: ART.ewostatewos,
      motion: "pushin",
      lead: (
        <View>
          <Text style={styles.opening}>ቤተ ቅኔ</Text>
          <Text style={styles.openingLine}>Learn ግዕዝ the way the ቅኔ ቤት teaches it.</Text>
        </View>
      ),
      body: (
        <Text style={styles.body}>
          ቤተ ቅኔ is for anyone learning ግዕዝ, the language of the church's books, prayers and ቅኔ. It starts where the church
          schools start: the verbs (ግሲ), what they mean in ትግርኛ, አማርኛ and English, and how each one is conjugated (ርባታ)
          after its head verb (ርእስ).
        </Text>
      ),
    },
    {
      key: "books",
      title: "መጻሕፍት",
      english: "The books",
      art: ART.luke,
      sweep: true,
      body: (
        <>
          <Text style={styles.body}>
            For centuries these books were copied by hand on parchment, with holy names and openings written in red and each
            chapter opened by a woven ሐረግ.
          </Text>
          <Text style={styles.body}>
            ቤተ ቅኔ's words come from two of them: <Text style={styles.rubric}>መጽሐፈ ግስ ወሰዋስው</Text> and{" "}
            <Text style={styles.rubric}>ፈለገ ግስ</Text>.
          </Text>
        </>
      ),
    },
    {
      key: "words",
      title: "ቃላት",
      english: "The words",
      body: (
        <>
          <Text style={styles.body}>
            Look a word up in ግዕዝ, ትግርኛ, አማርኛ or English. Every verb comes with its ending, its head (ርእስ) and its ርባታ, set
            under an arch like the canon tables at the front of a Gospel book.
          </Text>
          <WordCard word="ሰበረ" meanings={SEBERE} formsOpen />
          <Parts items={[PART.dictionary, PART.verbs]} />
        </>
      ),
    },
    {
      key: "day",
      title: "ዕለት",
      english: "The daily practice",
      body: (
        <>
          <Text style={styles.body}>
            Learn a few new words every day, review them just before you would forget them, and test yourself as you go. Your
            progress stays on this device, or in your account if you sign in.
          </Text>
          <Parts items={[PART.today, PART.review, PART.quiz]} />
        </>
      ),
    },
    {
      key: "qine",
      title: "ቅኔ ወዜማ",
      english: "ቅኔ and ዜማ",
      body: (
        <>
          <Text style={styles.body}>
            From the verbs it goes on to ቅኔ itself: the meters each kind is measured by, ቅኔ chanted aloud to learn line by
            line, and the classical ቅኔ of the fathers to read and study.
          </Text>
          <Parts items={[PART.meters, PART.zema, PART.blog]} />
        </>
      ),
    },
    {
      key: "games",
      title: "ጨዋታ",
      english: "The games",
      body: (
        <>
          <Text style={styles.body}>
            Practise with games played on the words you are learning: ቃል, the daily puzzle; quick rounds against the clock;
            and Boss Battle, where your lamp carries you past four adversaries.
          </Text>
          <Parts items={[PART.games]} />
        </>
      ),
    },
    {
      key: "begin",
      title: "ዛሬ",
      english: "Begin today",
      body: (
        <>
          <Text style={styles.body}>Start with today's words. A few minutes a day is enough.</Text>
          <Button onPress={() => router.navigate("/today")} style={styles.begin}>
            Start ዛሬ
          </Button>
        </>
      ),
    },
  ];

  const colophon = (
    <View style={styles.colophon}>
      <Harag pattern="checker" thickness={13} />
      <Text style={styles.colophonTitle}>Colophon</Text>
      <Text style={styles.body}>ቤተ ቅኔ is still being developed. More features are coming soon.</Text>
      <View style={styles.versions}>
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>App</Text>
          <Text style={styles.versionValue}>{appVersion || "—"}</Text>
        </View>
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>Dictionary data</Text>
          <Text style={styles.versionValue}>{release ? `${release.tag.replace(/^data-/, "")} · released ${release.released_on}` : "—"}</Text>
        </View>
      </View>
      <Text style={styles.label}>Reference books</Text>
      <Text style={styles.body}>መጽሐፈ ግስ ወሰዋስው · ፈለገ ግስ</Text>
      <Text style={styles.label}>Paintings</Text>
      {PAINTINGS.map((art) => (
        <Text key={art.base} style={styles.credit}>
          {art.credit}
        </Text>
      ))}
      <Text style={styles.label}>Contact</Text>
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
    </View>
  );

  return <Story chapters={chapters} footer={colophon} />;
}

const styles = StyleSheet.create({
  opening: { fontFamily: fontFamily.ethiopicBold, fontSize: 56, lineHeight: 78, color: colors.rubric },
  openingLine: { ...typography.bodySemiBold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  body: { fontFamily: fontFamily.latinRegular, fontSize: 17, lineHeight: 27, color: colors.textPrimary, maxWidth: 620 },
  rubric: { fontFamily: fontFamily.ethiopicBold, color: colors.rubric },
  begin: { alignSelf: "flex-start" },
  parts: { borderWidth: 1, borderColor: colors.borderMuted, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.surface },
  part: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  partLine: { borderBottomWidth: 1, borderBottomColor: colors.borderMuted },
  partHover: { backgroundColor: colors.surfaceMuted },
  partText: { flex: 1, gap: 2 },
  partTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  partEnglish: { fontFamily: fontFamily.latinRegular, fontSize: 13, color: colors.textSecondary },
  partLine2: { fontFamily: fontFamily.latinRegular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  colophon: { paddingTop: 72, gap: spacing.sm + 2 },
  colophonTitle: { ...typography.label, color: colors.rubric, letterSpacing: 1.5, textTransform: "uppercase", marginTop: spacing.sm },
  label: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark, textTransform: "uppercase", marginTop: spacing.md },
  credit: { ...typography.caption, color: colors.textSecondary },
  versions: { gap: 6, maxWidth: 520 },
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
