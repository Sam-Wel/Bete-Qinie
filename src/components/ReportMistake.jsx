import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "../hooks/useWindowDimensions";
import { supabase } from "../lib/supabaseClient";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { TextField } from "./ui/TextField";
import { Sheet } from "./ui/Sheet";
import { toast } from "./Toast";

const KINDS = ["Wrong meaning", "Spelling", "Missing meaning", "Other"];

// "Report a mistake" under a word card: a short sheet that sends the word and what's
// wrong to the editors' queue (supabase/admin_tools.sql report_word). Guests can
// report too; nothing else about them is kept.
export function ReportMistake({ wordId, word }) {
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(null);
  const [text, setText] = useState("");
  const [state, setState] = useState("idle"); // idle | sending
  const [error, setError] = useState(null);

  const message = [kind, text.trim()].filter(Boolean).join(": ");
  const close = () => setOpen(false);

  const send = async () => {
    setState("sending");
    setError(null);
    const { error: e } = await supabase.rpc("report_word", { p_word_id: wordId, p_word: word, p_message: message });
    if (!e) {
      setOpen(false);
      setKind(null);
      setText("");
      setState("idle");
      toast("Report sent. Thank you! An editor will look at it.");
      return;
    }
    setState("idle");
    setError(
      e.code === "PGRST202" ? "Reporting isn't available yet. Please try again later." : e.message || "Couldn't send it. Please try again."
    );
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityRole="button" style={styles.link}>
        <Icon name="flag" size={14} color={colors.textMuted} />
        <Text style={styles.linkText}>Report a mistake</Text>
      </Pressable>

      <Sheet visible={open} onClose={close} label={`Report a mistake in ${word}`}>
        <View style={styles.head}>
          <Text style={styles.kicker}>REPORT A MISTAKE</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.word}>{word}</Text>
        <ScrollView style={{ maxHeight: Math.max(260, height * 0.6) }} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.body}>What's wrong?</Text>
          <View style={styles.kinds}>
            {KINDS.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(kind === k ? null : k)}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === k }}
                style={({ hovered, pressed }) => [styles.kind, kind === k && styles.kindOn, kind !== k && (hovered || pressed) && styles.kindHover]}
              >
                <Text style={[styles.kindText, kind === k && styles.kindTextOn]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <TextField value={text} onChangeText={setText} placeholder="What should it be? (optional)" multiline maxLength={400} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button onPress={send} loading={state === "sending"} disabled={!message} style={styles.full}>
            Send
          </Button>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 2 },
  linkText: { ...typography.caption, color: colors.textMuted, textDecorationLine: "underline" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 26, lineHeight: 36, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textPrimary },
  form: { gap: spacing.sm },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  kind: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  kindOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindHover: { backgroundColor: colors.surfaceMuted },
  kindText: { ...typography.label, fontSize: 13, color: colors.textPrimary },
  kindTextOn: { color: colors.onPrimary },
  error: { ...typography.caption, color: colors.dangerDark },
  full: { alignSelf: "stretch", marginTop: spacing.xs },
});
