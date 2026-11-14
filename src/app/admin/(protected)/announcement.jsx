import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AdminHeader, Button, ScreenContainer, TextField } from "../../../components/ui";
import { AdminOnly, Chips, ConfirmButton, Notice, Panel, adminStyles } from "../../../components/admin";
import { AnnouncementCard } from "../../../components/AnnouncementBanner";
import { useAuth } from "../../../context/AuthContext";
import { adminError, shortDate } from "../../../lib/adminApi";
import { MAX_TEXT, isActive, makeAnnouncement, safeLink } from "../../../lib/announcement";
import { supabase } from "../../../lib/supabaseClient";
import { colors } from "../../../theme";

const ENDS = [
  { value: 0, label: "No end" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

// A short notice at the top of ዛሬ and the Dictionary, for everyone, until it ends or
// each person closes it. Stored in app_settings (key 'announcement').
export default function Announcement() {
  return (
    <AdminOnly>
      <AnnouncementPage />
    </AdminOnly>
  );
}

function AnnouncementPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(undefined);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("value, updated_at").eq("key", "announcement").maybeSingle();
    if (error) {
      setNotice({ tone: "error", text: adminError(error) });
      setCurrent(null);
    } else setCurrent(data ? { ...data.value, updated_at: data.updated_at } : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (value, done) => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "announcement", value, updated_at: new Date().toISOString(), updated_by: user?.id ?? null });
    setBusy(false);
    if (error) {
      setNotice({ tone: "error", text: adminError(error) });
      return false;
    }
    setNotice({ tone: "done", text: done });
    load();
    return true;
  };

  const draft = makeAnnouncement({ text, link, days });
  const linkProblem = link.trim() && !safeLink(link) ? "Use a page of the app (like /today) or an https:// address." : null;
  const showing = isActive(current);

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Announcement" />
      <Text style={adminStyles.hint}>
        A short notice at the top of ዛሬ and the Dictionary, for everyone. Each person can close it; a new announcement
        shows again to everyone.
      </Text>
      <Notice tone={notice?.tone}>{notice?.text}</Notice>

      <Panel title="Showing now">
        {current === undefined ? <ActivityIndicator color={colors.primary} /> : null}
        {current !== undefined && !showing ? <Text style={adminStyles.hint}>Nothing is showing.</Text> : null}
        {showing ? (
          <>
            <AnnouncementCard announcement={current} />
            <Text style={adminStyles.muted}>
              {`Published ${shortDate(current.updated_at)}${current.until ? ` · ends ${shortDate(current.until)}` : " · no end date"}`}
            </Text>
            <ConfirmButton style={{ alignSelf: "flex-start" }} onConfirm={() => save({}, "Cleared. Nothing is showing now.")}>
              Clear it
            </ConfirmButton>
          </>
        ) : null}
      </Panel>

      <Panel title="New announcement">
        <TextField value={text} onChangeText={setText} placeholder="e.g. 120 new verbs added to ዛሬ" multiline maxLength={MAX_TEXT} />
        <Text style={adminStyles.muted}>{`${text.trim().length}/${MAX_TEXT}`}</Text>
        <TextField
          value={link}
          onChangeText={setLink}
          placeholder="Link (optional): /today or https://…"
          autoCapitalize="none"
          error={linkProblem}
        />
        <Chips items={ENDS} value={days} onChange={setDays} />
        {draft.text ? (
          <View style={{ gap: 6 }}>
            <Text style={adminStyles.muted}>Preview</Text>
            <AnnouncementCard announcement={draft} onClose={() => {}} />
          </View>
        ) : null}
        <Button
          size="sm"
          style={{ alignSelf: "flex-start" }}
          loading={busy}
          disabled={!draft.text || Boolean(linkProblem)}
          onPress={() =>
            save(draft, "Published. People see it the next time they open the app.").then((ok) => {
              if (!ok) return;
              setText("");
              setLink("");
            })
          }
        >
          Publish
        </Button>
      </Panel>
    </ScreenContainer>
  );
}
