import { Pressable, StyleSheet, Text, View } from "react-native";
import { DrawerContentScrollView } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { OrnamentDivider } from "./ui";
import { colors, fontFamily, spacing, typography } from "../theme";

function MenuItem({ icon, label, ethiopic, onPress }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[typography.bodySemiBold, ethiopic && { fontFamily: fontFamily.ethiopicBold }, styles.itemLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DrawerContent(props) {
  const { user, isAdmin, signOut } = useAuth();

  const go = (href) => {
    props.navigation.closeDrawer();
    router.push(href);
  };

  const handleSignOut = async () => {
    props.navigation.closeDrawer();
    await signOut();
    router.replace("/");
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <Text style={styles.brand}>ቤተ ቅኔ</Text>

      <MenuItem icon="book-outline" label="Dictionary" onPress={() => go("/")} />
      <MenuItem icon="list-outline" label="ግሲ" ethiopic onPress={() => go("/verb-roots")} />
      <MenuItem icon="grid-outline" label="መዐቀኒ" ethiopic onPress={() => go("/meaqeni")} />
      <MenuItem icon="school-outline" label="ክለሳ" ethiopic onPress={() => go("/review")} />
      <MenuItem icon="game-controller-outline" label="Game" onPress={() => go("/game")} />
      <MenuItem icon="newspaper-outline" label="ቅኔ አበው" ethiopic onPress={() => go("/blog")} />

      <OrnamentDivider style={styles.divider} />

      {user ? (
        <>
          <MenuItem icon="person-circle-outline" label="Account" onPress={() => go("/account")} />
          {isAdmin && (
            <MenuItem icon="shield-checkmark-outline" label="Admin Dashboard" onPress={() => go("/admin")} />
          )}
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleSignOut} />
        </>
      ) : (
        <>
          <MenuItem icon="log-in-outline" label="Sign In" onPress={() => go("/auth/sign-in")} />
          <MenuItem icon="person-add-outline" label="Sign Up" onPress={() => go("/auth/sign-up")} />
        </>
      )}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    flexGrow: 1,
  },
  brand: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 24,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  itemLabel: {
    color: colors.textPrimary,
  },
  divider: {
    marginVertical: spacing.md,
  },
});
