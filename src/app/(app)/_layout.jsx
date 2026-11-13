import { View } from "react-native";
import { useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { colors } from "../../theme";
import { AppHeader } from "../../components/AppHeader";
import { DrawerContent } from "../../components/DrawerContent";
import { BottomTabs } from "../../components/nav/BottomTabs";
import { useIsWide } from "../../hooks/useIsWide";
import { pageInfo, sectionOf } from "../../lib/navigation";

// Wide screens: a permanent sidebar. Phones: bottom tabs, hidden inside a game
// (pages with a Back to a hub) so nothing gets tapped by accident.
export default function AppLayout() {
  const wide = useIsWide();
  const route = useSegments()[1] || "index";
  const showTabs = !wide && !pageInfo(route).backTo;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Drawer
        screenOptions={{
          headerShown: true,
          header: (props) => <AppHeader {...props} />,
          drawerType: wide ? "permanent" : "front",
          swipeEnabled: false,
          drawerStyle: {
            width: 264,
            backgroundColor: colors.surface,
            borderRightWidth: 1,
            borderRightColor: colors.border,
          },
          overlayColor: "transparent",
        }}
        drawerContent={(props) => <DrawerContent {...props} />}
      >
        <Drawer.Screen name="index" options={{ title: "መዝገበ ቃላት" }} />
        <Drawer.Screen name="verb-roots" options={{ title: "ግሲ" }} />
        <Drawer.Screen name="meaqeni" options={{ title: "መዐቀኒ" }} />
        <Drawer.Screen name="zema" options={{ title: "ዜማ" }} />
        <Drawer.Screen name="today" options={{ title: "ዛሬ" }} />
        <Drawer.Screen name="review" options={{ title: "ክለሳ" }} />
        <Drawer.Screen name="game" options={{ title: "ጨዋታዎች" }} />
        <Drawer.Screen name="shooter" options={{ title: "ቀስት" }} />
        <Drawer.Screen name="kal" options={{ title: "ቃል" }} />
        <Drawer.Screen name="memory-match" options={{ title: "Memory Match" }} />
        <Drawer.Screen name="guess-action" options={{ title: "Guess the Action" }} />
        <Drawer.Screen name="unscramble" options={{ title: "Unscramble the Verb" }} />
        <Drawer.Screen name="lightning" options={{ title: "Lightning Round" }} />
        <Drawer.Screen name="verb-sort" options={{ title: "Sorting Challenge" }} />
        <Drawer.Screen name="boss-battle" options={{ title: "Boss Battle" }} />
        <Drawer.Screen name="heads" options={{ title: "ርእስ" }} />
        <Drawer.Screen name="verb-quiz" options={{ title: "ግሲ ፈተና" }} />
        <Drawer.Screen name="blog" options={{ title: "ቅኔ አበው" }} />
        <Drawer.Screen name="account" options={{ title: "Account" }} />
        <Drawer.Screen name="about" options={{ title: "ስለ ቤተ ቅኔ" }} />
        <Drawer.Screen name="more" options={{ title: "ቤተ ቅኔ" }} />
      </Drawer>
      {showTabs ? <BottomTabs section={sectionOf(route)} /> : null}
    </View>
  );
}
