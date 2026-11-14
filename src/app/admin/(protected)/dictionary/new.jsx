import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AdminHeader, Button, ScreenContainer, TextField } from "../../../../components/ui";
import { Notice, Panel, adminStyles } from "../../../../components/admin";
import { rpc } from "../../../../lib/adminApi";
import { languageLabel } from "../../../../lib/dictionaryAdmin";
import { fontFamily, spacing } from "../../../../theme";

const MEANINGS = ["ti", "am", "en"];

// A new ግዕዝ word with its first meanings; the word editor takes it from there.
// An existing spelling is found instead of doubled.
export default function NewWord() {
  const params = useLocalSearchParams();
  const [geez, setGeez] = useState(typeof params.word === "string" ? params.word : "");
  const [meanings, setMeanings] = useState({ ti: "", am: "", en: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const create = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const made = await rpc("dict_create", { p_text: geez });
      if (made.existed) {
        setNotice({ tone: "info", text: `“${geez.trim()}” is already in the dictionary (#${made.word_id}). Opening it…` });
      }
      for (const lang of MEANINGS) {
        const text = meanings[lang].trim();
        if (text) await rpc("dict_link", { p_word_id: made.word_id, p_lang: lang, p_text: text });
      }
      router.replace(`/admin/dictionary/${made.word_id}`);
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
      setBusy(false);
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Add a word" fallback="/admin/dictionary" />
      <Panel>
        <TextField label="ግዕዝ word" value={geez} onChangeText={setGeez} autoFocus inputStyle={styles.ethiopic} />
        {MEANINGS.map((lang) => (
          <TextField
            key={lang}
            label={`${languageLabel(lang)} meaning (optional)`}
            value={meanings[lang]}
            onChangeText={(text) => setMeanings({ ...meanings, [lang]: text })}
            inputStyle={lang === "en" ? null : styles.ethiopic}
          />
        ))}
        <Text style={adminStyles.hint}>More meanings, ሰዋሰው examples and corrections go in the word's page, which opens next.</Text>
        <Notice tone={notice?.tone}>{notice?.text}</Notice>
        <View style={adminStyles.row}>
          <Button onPress={create} loading={busy} disabled={!geez.trim()}>
            Add the word
          </Button>
        </View>
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  ethiopic: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17 },
  gap: { gap: spacing.md },
});
