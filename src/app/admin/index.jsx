import { Text, View, StyleSheet } from "react-native";

export default function Admin() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>
      <Text>Phase 5 will add login and CRUD screens here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontFamily: "NotoSansEthiopic_700Bold", fontSize: 24 },
});
