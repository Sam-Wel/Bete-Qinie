import { useState } from "react";
import { Text } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { ScreenContainer, Card, TextField, Button, ScreenHeader } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/");
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding center>
      <Card style={{ width: "100%", maxWidth: 420, gap: spacing.md }}>
        <ScreenHeader
          title="Sign In"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />

        {error ? (
          <Text style={[typography.body, { color: colors.danger, textAlign: "center" }]}>
            {error}
          </Text>
        ) : null}

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
          Sign in
        </Button>

        <Link href="/auth/sign-up" style={{ alignSelf: "center", marginTop: spacing.xs }}>
          <Text style={[typography.body, { color: colors.primary }]}>
            Don't have an account? Sign up
          </Text>
        </Link>
      </Card>
    </ScreenContainer>
  );
}
