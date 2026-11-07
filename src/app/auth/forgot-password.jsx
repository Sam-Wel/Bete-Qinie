import { useState } from "react";
import { Platform, Text } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { ScreenContainer, Card, TextField, Button, ScreenHeader } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

// Asks Supabase to email a link for setting a new password. The reply is the same whether
// or not the address has an account, so the page can't be used to find out who does.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const address = email.trim();
    if (!address) {
      setError("Enter the email you signed up with.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: Platform.OS === "web" ? `${window.location.origin}/auth/reset-password` : undefined,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <ScreenContainer scroll keyboardAvoiding center>
      <Card style={{ width: "100%", maxWidth: 420, gap: spacing.md }}>
        <ScreenHeader
          title="Forgot password"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/auth/sign-in"))}
        />

        {sent ? (
          <>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              If an account uses {email.trim()}, a link to set a new password is on its way. It can take a minute; check
              the spam folder too.
            </Text>
            <Link href="/auth/sign-in" style={{ alignSelf: "center", marginTop: spacing.xs }}>
              <Text style={[typography.body, { color: colors.primary }]}>Back to sign in</Text>
            </Link>
          </>
        ) : (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a link to set a new password.
            </Text>

            {error ? <Text style={[typography.body, { color: colors.danger, textAlign: "center" }]}>{error}</Text> : null}

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Button variant="primary" loading={loading} onPress={handleSubmit} style={{ marginTop: spacing.sm }}>
              Send the link
            </Button>
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}
