import { Text } from "react-native";
import { Tabs } from "expo-router";

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: "Dictionary",
          tabBarIcon: () => <TabIcon emoji="📖" />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: "Game",
          tabBarIcon: () => <TabIcon emoji="🎲" />,
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: "ቅኔ አበው",
          tabBarIcon: () => <TabIcon emoji="📝" />,
        }}
      />
    </Tabs>
  );
}
