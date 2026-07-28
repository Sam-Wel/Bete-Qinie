import { Text, View, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ቤተ ቅኔ</Text>
      <Text style={styles.subtitle}>
        Your Ge'ez, Tigrinya, and Amharic dictionary and cultural companion.
      </Text>
      <Link href="/admin" style={styles.adminLink}>
        Admin
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 32,
  },
  subtitle: {
    fontFamily: "NotoSansEthiopic_400Regular",
    fontSize: 16,
    textAlign: "center",
  },
  adminLink: {
    marginTop: 24,
    fontSize: 12,
    opacity: 0.5,
  },
});
