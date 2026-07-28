import { Text, View, StyleSheet } from "react-native";

export default function Dictionary() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dictionary</Text>
      <Text>Phase 2 will build the search UI here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontFamily: "NotoSansEthiopic_700Bold", fontSize: 24 },
});
