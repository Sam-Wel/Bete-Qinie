import { useState } from "react";
import { Text } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { ScreenContainer, Card, TextField, Button, ScreenHeader } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

export default function SignUp() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.replace("/");
    } else {
      setMessage("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding center>
      <Card style={{ width: "100%", maxWidth: 420, gap: spacing.md }}>
        <ScreenHeader
          title="Sign Up"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />

        {error ? (
          <Text style={[typography.body, { color: colors.danger, textAlign: "center" }]}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text style={[typography.body, { color: colors.success, textAlign: "center" }]}>
            {message}
          </Text>
        ) : null}

        <TextField
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="What should we call you?"
        />

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <Button variant="primary" loading={loading} onPress={handleSubmit} style={{ marginTop: spacing.sm }}>
          Create Account
        </Button>

        <Link href="/auth/sign-in" style={{ alignSelf: "center", marginTop: spacing.xs }}>
          <Text style={[typography.body, { color: colors.primary }]}>
            Already have an account? Sign in
          </Text>
        </Link>
      </Card>
    </ScreenContainer>
  );
}
