import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../../context/AuthContext";
import { ScreenContainer, Card, Button, ScreenHeader } from "../../../components/ui";
import { colors, spacing, typography } from "../../../theme";

const LINKS = [
  { label: "Add Blog Post", href: "/admin/add-blog", icon: "add-circle-outline" },
  { label: "Add Dictionary Word", href: "/admin/add-word", icon: "book-outline" },
  { label: "Manage Dictionary", href: "/admin/dictionary-edit", icon: "create-outline" },
  { label: "Manage Blog Posts", href: "/admin/blog-list-edit", icon: "newspaper-outline" },
];

export default function AdminDashboard() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  return (
    <ScreenContainer scroll>
      <ScreenHeader
        title="Admin Dashboard"
        right={
          <Button variant="danger" size="sm" pill onPress={handleLogout}>
            Logout
          </Button>
        }
      />

      <View style={styles.grid}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} asChild>
            <Pressable>
              <Card style={styles.linkCard}>
                <Icon name={link.icon} size={22} color={colors.primary} />
                <Text style={styles.cardText}>{link.label}</Text>
                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardText: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
    flex: 1,
  },
});
