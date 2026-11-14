import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AdminHeader, Badge, Button, ScreenContainer, TextField } from "../../../components/ui";
import { AdminOnly, Chips, ConfirmButton, Notice, Panel, adminStyles } from "../../../components/admin";
import { useAuth } from "../../../context/AuthContext";
import { useRpc } from "../../../hooks/useRpc";
import { ago, rpc } from "../../../lib/adminApi";
import { colors, spacing, typography } from "../../../theme";

const ROLES = [
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

// Who can edit and who can manage. Roles are given by email to existing accounts
// (admin_set_role): never your own, and never the last admin.
export default function Access() {
  return (
    <AdminOnly>
      <AccessPage />
    </AdminOnly>
  );
}

function AccessPage() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const staff = useRpc("admin_staff");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const setAccess = async (address, next) => {
    setNotice(null);
    try {
      const r = await rpc("admin_set_role", { p_email: address, p_role: next });
      setNotice({
        tone: "done",
        text: next === "user" ? `${r.email} no longer has access.` : `${r.email} is now ${next === "admin" ? "an admin" : "an editor"}.`,
      });
      staff.reload();
      return true;
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
      return false;
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Access" help="admin-access" />
      <Text style={adminStyles.hint}>
        Editors work on the dictionary, mistake reports, missed searches, the blog and the meters. Admins can also see
        learners, change access, publish data releases and the announcement, and read the change log.
      </Text>

      <Panel title="Give access">
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="Their account's email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="off"
        />
        <Chips items={ROLES} value={role} onChange={setRole} />
        <Text style={adminStyles.muted}>They need to have created an account first.</Text>
        <Button
          size="sm"
          style={{ alignSelf: "flex-start" }}
          loading={busy}
          disabled={!email.trim()}
          onPress={async () => {
            setBusy(true);
            if (await setAccess(email.trim(), role)) setEmail("");
            setBusy(false);
          }}
        >
          {`Make ${role === "admin" ? "admin" : "editor"}`}
        </Button>
      </Panel>
      <Notice tone={notice?.tone}>{notice?.text}</Notice>

      <Panel title="Editors and admins">
        <Notice tone="error">{staff.error}</Notice>
        {staff.loading && !staff.data ? <ActivityIndicator color={colors.primary} /> : null}
        {(staff.data || []).map((s) => {
          const me = s.user_id === user?.id;
          return (
            <View key={s.user_id} style={styles.person}>
              <View style={styles.personHead}>
                <Text style={styles.email}>{s.email}</Text>
                <Badge label={s.role} tone={s.role === "admin" ? "primary" : "muted"} />
                {me ? <Text style={adminStyles.muted}>you</Text> : null}
              </View>
              <Text style={adminStyles.muted}>{`last signed in ${ago(s.last_sign_in)}`}</Text>
              {me ? null : (
                <View style={adminStyles.row}>
                  <Button size="sm" variant="secondary" onPress={() => setAccess(s.email, s.role === "admin" ? "editor" : "admin")}>
                    {s.role === "admin" ? "Make editor" : "Make admin"}
                  </Button>
                  <ConfirmButton onConfirm={() => setAccess(s.email, "user")}>Remove access</ConfirmButton>
                </View>
              )}
            </View>
          );
        })}
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  person: { gap: 4, paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  personHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  email: { ...typography.bodySemiBold, color: colors.textPrimary },
});
