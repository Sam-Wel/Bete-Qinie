import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer, Card, TextField, Button, ScreenHeader } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

const MIN_LENGTH = 6; // Supabase's default minimum

// Where the "set a new password" email leads. On the web, supabase-js reads the link and
// signs the person in for this; without that (an old or reused link) there is no session.
export default function ResetPassword() {
  const { session, loading, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    clearPasswordRecovery?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  };

  let body;
  if (loading) {
    body = <ActivityIndicator color={colors.primary} />;
  } else if (done) {
    body = (
      <>
        <Text style={[typography.body, { color: colors.textPrimary }]}>Your password is changed, and you're signed in.</Text>
        <Button variant="primary" onPress={() => router.replace("/")}>
          Continue
        </Button>
      </>
    );
  } else if (!session) {
    body = (
      <>
        <Text style={[typography.body, { color: colors.textPrimary }]}>
          This link has expired or was already used. Ask for a new one.
        </Text>
        <Link href="/auth/forgot-password" style={{ alignSelf: "center" }}>
          <Text style={[typography.body, { color: colors.primary }]}>Send a new link</Text>
        </Link>
      </>
    );
  } else {
    body = (
      <>
        {error ? <Text style={[typography.body, { color: colors.danger, textAlign: "center" }]}>{error}</Text> : null}
        <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <TextField label="Type it again" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
        <Button variant="primary" loading={busy} onPress={handleSubmit} style={{ marginTop: spacing.sm }}>
          Set new password
        </Button>
      </>
    );
  }

  return (
    <ScreenContainer scroll keyboardAvoiding center>
      <Card style={{ width: "100%", maxWidth: 420, gap: spacing.md }}>
        <ScreenHeader title="Set a new password" onBack={() => router.replace("/")} />
        {body}
      </Card>
    </ScreenContainer>
  );
}
