import { Drawer } from "expo-router/drawer";
import { colors } from "../../theme";
import { DrawerContent } from "../../components/DrawerContent";
import { TopNavBar } from "../../components/TopNavBar";

export default function AppLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        header: (props) => <TopNavBar {...props} />,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
        drawerStyle: { backgroundColor: colors.background },
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="index" options={{ title: "Dictionary" }} />
      <Drawer.Screen name="verb-roots" options={{ title: "ግሲ" }} />
      <Drawer.Screen name="review" options={{ title: "ክለሳ" }} />
      <Drawer.Screen name="game" options={{ title: "Game" }} />
      <Drawer.Screen name="blog" options={{ title: "ቅኔ አበው" }} />
      <Drawer.Screen name="account" options={{ title: "Account" }} />
    </Drawer>
  );
}
