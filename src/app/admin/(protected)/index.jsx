import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

const LINKS = [
  { label: "Add Blog Post", href: "/admin/add-blog" },
  { label: "Add Dictionary Word", href: "/admin/add-word" },
  { label: "Manage Dictionary", href: "/admin/dictionary-edit" },
  { label: "Manage Blog Posts", href: "/admin/blog-list-edit" },
];

export default function AdminDashboard() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardText}>{link.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 26,
    color: "#854d0e",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  logoutText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  grid: {
    gap: 12,
  },
  card: {
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 10,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#44403c",
  },
});
