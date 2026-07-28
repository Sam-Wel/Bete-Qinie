import { Text, View, StyleSheet } from "react-native";

export default function Blog() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ቅኔ አበው</Text>
      <Text>Phase 4 will build the blog list here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontFamily: "NotoSansEthiopic_700Bold", fontSize: 24 },
});
