import { Text, View, StyleSheet } from "react-native";

export default function Game() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dictionary Game</Text>
      <Text>Phase 3 will build the Ge'ez quiz here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontFamily: "NotoSansEthiopic_700Bold", fontSize: 24 },
});
