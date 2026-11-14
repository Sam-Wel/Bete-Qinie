import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../../context/AuthContext";
import { ScreenContainer, Card, OrnamentDivider } from "../../../components/ui";
import { Notice, StatTile, TileRow } from "../../../components/admin";
import { useRpc } from "../../../hooks/useRpc";
import { colors, fontFamily, radii, spacing, typography } from "../../../theme";

// admin: true groups are for admins only; editors see the rest.
const GROUPS = [
  {
    title: "Dictionary",
    links: [
      { label: "Dictionary", note: "Fix meanings, merge duplicates, fill gaps", href: "/admin/dictionary", icon: "book-outline" },
      { label: "Add a word", note: "A new ግዕዝ word, then its meanings", href: "/admin/dictionary/new", icon: "add-circle-outline" },
      { label: "Mistake reports", note: "What learners flagged on word cards", href: "/admin/reports", icon: "flag" },
      { label: "Searches with no result", note: "Words people looked for and didn't find", href: "/admin/searches", icon: "search-x" },
    ],
  },
  {
    title: "ቅኔ አበው · መዐቀኒ",
    links: [
      { label: "Add a post", note: "Write a new ቅኔ for the blog", href: "/admin/add-blog", icon: "add-circle-outline" },
      { label: "Posts", note: "Edit, publish or remove existing posts", href: "/admin/blog-list-edit", icon: "newspaper-outline" },
      { label: "Measure tables", note: "Correct the rules behind the ሰንጠረዥ tab and the checker", href: "/admin/meters", icon: "grid-outline" },
    ],
  },
  {
    title: "Learners",
    admin: true,
    links: [{ label: "Learners & stats", note: "Who is learning, how much, and what they miss", href: "/admin/learners", icon: "users" }],
  },
  {
    title: "Data",
    admin: true,
    links: [{ label: "Data releases", note: "Import a lexicon release, make it live or roll back", href: "/admin/releases", icon: "database" }],
  },
  {
    title: "Settings",
    admin: true,
    links: [
      { label: "Announcement", note: "A short notice on ዛሬ and the Dictionary", href: "/admin/announcement", icon: "megaphone" },
      { label: "Access", note: "Who can edit, and who can manage", href: "/admin/access", icon: "user-cog" },
      { label: "Change log", note: "Every change: who, when, before and after", href: "/admin/activity", icon: "scroll-text" },
    ],
  },
];

export default function AdminDashboard() {
  const { user, isAdmin, role } = useAuth();
  const counts = useRpc("dict_issue_counts");
  const overview = useRpc("admin_overview", {}, { skip: !isAdmin });
  const c = counts.data || {};
  const o = overview.data || {};

  return (
    <ScreenContainer scroll>
      <View style={styles.head}>
        <Text style={styles.heading}>Manage</Text>
        <Text style={styles.who}>
          {user?.email} · {role === "admin" ? "Admin" : "Editor"}
        </Text>
      </View>

      <TileRow>
        <StatTile value={c.reported} label="words with reports" tone="alert" onPress={() => router.push("/admin/reports")} />
        <StatTile value={c.missed_searches} label="searches with no result" onPress={() => router.push("/admin/searches")} />
        <StatTile value={c.missing_en} label="ግዕዝ words without English" onPress={() => router.push({ pathname: "/admin/dictionary", params: { filter: "missing_en" } })} />
        {isAdmin ? <StatTile value={o.active_7d} label="learners active this week" onPress={() => router.push("/admin/learners")} /> : null}
        {isAdmin ? <StatTile value={o.release || "none"} label="live dictionary data" onPress={() => router.push("/admin/releases")} /> : null}
      </TileRow>
      <Notice tone="error">{counts.error || overview.error}</Notice>

      <OrnamentDivider style={styles.divider} />

      {GROUPS.filter((g) => isAdmin || !g.admin).map((group) => (
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
  head: { gap: 2, marginBottom: spacing.md },
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
