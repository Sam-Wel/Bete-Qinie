import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAnnouncement } from "../hooks/useAnnouncement";
import { isInternal, safeLink } from "../lib/announcement";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { Icon } from "./ui/Icon";

const ETHIOPIC = /[ሀ-፿]/;

// The banner itself, also used as the preview on the admin Announcement page.
export function AnnouncementCard({ announcement, onClose }) {
  const link = safeLink(announcement.link);
  const open = () => {
    if (!link) return;
    if (isInternal(link)) router.push(link);
    else Linking.openURL(link).catch(() => {});
  };
  return (
    <View style={styles.banner}>
      <Icon name="megaphone" size={18} color={colors.primaryDark} />
      <View style={styles.body}>
        <Text style={[styles.text, ETHIOPIC.test(announcement.text) && styles.textEthiopic]}>{announcement.text}</Text>
        {link ? (
          <Pressable onPress={open} accessibilityRole="link" hitSlop={6}>
            <Text style={styles.link}>{isInternal(link) ? "Open ›" : "Read more ›"}</Text>
          </Pressable>
        ) : null}
      </View>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close the announcement">
          <Icon name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The current announcement (set on the admin page), on ዛሬ and the Dictionary until it
// ends or this device closes it.
export function AnnouncementBanner() {
  const { announcement, close } = useAnnouncement();
  if (!announcement) return null;
  return <AnnouncementCard announcement={announcement} onClose={close} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  body: { flex: 1, gap: 4 },
  text: { ...typography.body, lineHeight: 22, color: colors.textPrimary },
  textEthiopic: { fontFamily: fontFamily.ethiopicRegular, lineHeight: 24 },
  link: { ...typography.label, color: colors.primaryDark, textDecorationLine: "underline" },
});
