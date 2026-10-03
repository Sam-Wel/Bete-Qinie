import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../../context/AuthContext";
import { ScreenContainer, Card, OrnamentDivider } from "../../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../../theme";

const GROUPS = [
  {
    title: "ቅኔ አበው",
    links: [
      { label: "Add a post", note: "Write a new ቅኔ for the blog", href: "/admin/add-blog", icon: "add-circle-outline" },
      { label: "Posts", note: "Edit, publish or remove existing posts", href: "/admin/blog-list-edit", icon: "newspaper-outline" },
    ],
  },
  {
    title: "መዝገበ ቃላት",
    links: [
      { label: "Add a word", note: "New entry with its translations", href: "/admin/add-word", icon: "book-outline" },
      { label: "Dictionary", note: "Edit existing words", href: "/admin/dictionary-edit", icon: "create-outline" },
    ],
  },
  {
    title: "መዐቀኒ",
    links: [
      {
        label: "Measure tables",
        note: "Correct the rules behind the ሰንጠረዥ tab and the checker",
        href: "/admin/meters",
        icon: "grid-outline",
      },
    ],
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <ScreenContainer scroll>
      <View style={styles.head}>
        <Text style={styles.heading}>Manage</Text>
        <Text style={styles.who}>Signed in as {user?.email}</Text>
      </View>

      <OrnamentDivider style={styles.divider} />

      {GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.links.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable>
                <Card style={styles.card}>
                  <View style={styles.badge}>
                    <Icon name={link.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{link.label}</Text>
                    <Text style={styles.note}>{link.note}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  heading: { ...typography.h1, fontSize: 26, color: colors.textPrimary },
  who: { ...typography.caption, color: colors.textMuted },
  divider: { marginVertical: spacing.lg },

  group: { marginBottom: spacing.xl, gap: spacing.sm },
  groupTitle: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.bodySemiBold, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textMuted },
});
