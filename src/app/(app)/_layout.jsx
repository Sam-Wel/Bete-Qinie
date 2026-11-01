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
      <Drawer.Screen name="meaqeni" options={{ title: "መዐቀኒ" }} />
      <Drawer.Screen name="zema" options={{ title: "ዜማ" }} />
      <Drawer.Screen name="review" options={{ title: "ክለሳ" }} />
      <Drawer.Screen name="game" options={{ title: "Games" }} />
      <Drawer.Screen name="shooter" options={{ title: "ቀስት" }} />
      <Drawer.Screen name="kal" options={{ title: "ቃል" }} />
      <Drawer.Screen name="memory-match" options={{ title: "Verb Memory Match" }} />
      <Drawer.Screen name="guess-action" options={{ title: "Guess the Action" }} />
      <Drawer.Screen name="unscramble" options={{ title: "Unscramble the Verb" }} />
      <Drawer.Screen name="lightning" options={{ title: "Verb Lightning Round" }} />
      <Drawer.Screen name="verb-sort" options={{ title: "Verb Sorting Challenge" }} />
      <Drawer.Screen name="boss-battle" options={{ title: "Verb Boss Battle" }} />
      <Drawer.Screen name="verb-quiz" options={{ title: "ግሲ ፈተና" }} />
      <Drawer.Screen name="blog" options={{ title: "ቅኔ አበው" }} />
      <Drawer.Screen name="account" options={{ title: "Account" }} />
    </Drawer>
  );
}
