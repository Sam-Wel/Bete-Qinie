import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { Button, Card, Icon, ScreenContainer, ScreenHeader } from "../../components/ui";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

// Tight enough that the loop turns over without an audible overshoot.
const POLL_MS = 50;
const MIN_SPAN = 0.3;
const SPEEDS = [0.5, 0.75, 1];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const whole = Math.floor(seconds);
  const tenths = Math.floor((seconds - whole) * 10);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
}

function Nudge({ label, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.nudge, disabled && styles.nudgeDisabled]}>
      <Text style={styles.nudgeText}>{label}</Text>
    </Pressable>
  );
}

function Boundary({ title, value, onNudge, onSetHere, disabled }) {
  return (
    <View style={styles.boundary}>
      <View style={styles.boundaryHead}>
        <Text style={styles.boundaryTitle}>{title}</Text>
        <Text style={styles.boundaryValue}>{formatTime(value)}</Text>
      </View>
      <View style={styles.boundaryRow}>
        <Nudge label="−1" onPress={() => onNudge(-1)} disabled={disabled} />
        <Nudge label="−.1" onPress={() => onNudge(-0.1)} disabled={disabled} />
        <Nudge label="+.1" onPress={() => onNudge(0.1)} disabled={disabled} />
        <Nudge label="+1" onPress={() => onNudge(1)} disabled={disabled} />
        <Pressable onPress={onSetHere} disabled={disabled} style={[styles.here, disabled && styles.nudgeDisabled]}>
          <Text style={styles.hereText}>አሁን</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Zema() {
  const [track, setTrack] = useState(null);
  const [looping, setLooping] = useState(true);
  const [startRaw, setStartRaw] = useState(0);
  const [endRaw, setEndRaw] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [barWidth, setBarWidth] = useState(0);
  const [error, setError] = useState(null);
  const seeking = useRef(false);

  const player = useAudioPlayer(track?.uri ?? null, { updateInterval: POLL_MS });
  const status = useAudioPlayerStatus(player);

  const duration = Number.isFinite(status?.duration) && status.duration > 0 ? status.duration : 0;
  const position = Number.isFinite(status?.currentTime) ? status.currentTime : 0;
  const end = endRaw == null ? duration : Math.min(endRaw, duration);
  const start = Math.min(Math.max(0, startRaw), Math.max(0, end - MIN_SPAN));
  const ready = duration > 0;

  // Turn the loop over at the B edge. seekTo is async, so guard against stacking seeks.
  useEffect(() => {
    if (!looping || !ready || !status?.playing) return;
    if (position < end || seeking.current) return;

    seeking.current = true;
    Promise.resolve(player.seekTo(start)).finally(() => {
      seeking.current = false;
    });
  }, [position, end, start, looping, ready, status?.playing, player]);

  const pick = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        base64: false,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      // On web the File object gives a clean blob URL; elsewhere the cached uri is fine.
      const uri = Platform.OS === "web" && asset.file ? URL.createObjectURL(asset.file) : asset.uri;

      setTrack({ uri, name: asset.name });
      setStartRaw(0);
      setEndRaw(null);
      setSpeed(1);
    } catch (e) {
      setError(e?.message ?? "Could not open that file.");
    }
  };

  const seek = (seconds) => {
    if (!ready) return;
    const target = Math.min(Math.max(0, seconds), duration);
    seeking.current = true;
    Promise.resolve(player.seekTo(target)).finally(() => {
      seeking.current = false;
    });
  };

  const toggle = () => (status?.playing ? player.pause() : player.play());

  const changeSpeed = (rate) => {
    setSpeed(rate);
    player.setPlaybackRate(rate);
  };

  const nudgeStart = (delta) => setStartRaw(Math.min(Math.max(0, start + delta), end - MIN_SPAN));
  const nudgeEnd = (delta) => setEndRaw(Math.min(Math.max(start + MIN_SPAN, end + delta), duration));
  const wholeTrack = () => {
    setStartRaw(0);
    setEndRaw(null);
  };

  const pct = (seconds) => (duration > 0 ? `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%` : "0%");

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="ዜማ" titleEthiopic />

      {!track ? (
        <Card style={styles.intro}>
          <Icon name="musical-notes-outline" size={30} color={colors.primary} />
          <Text style={styles.introTitle}>ድምፅ ይጫኑ</Text>
          <Text style={styles.introBody}>
            Load an audio file, then mark a start and an end to hear just that part over and over. Widen or shorten the
            range as you go — the file itself is never changed.
          </Text>
          <Button onPress={pick}>ድምፅ ይምረጡ</Button>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
      ) : (
        <>
          <Card style={styles.player}>
            <View style={styles.trackRow}>
              <Text style={styles.trackName} numberOfLines={1}>
                {track.name}
              </Text>
              <Pressable onPress={pick} hitSlop={8}>
                <Text style={styles.change}>ይቀይሩ</Text>
              </Pressable>
            </View>

            <Text style={styles.clock}>
              {formatTime(position)}
              <Text style={styles.clockTotal}> / {formatTime(duration)}</Text>
            </Text>

            <Pressable
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              onPress={(e) => barWidth > 0 && seek((e.nativeEvent.locationX / barWidth) * duration)}
              style={styles.bar}
            >
              <View style={[styles.region, { left: pct(start), width: pct(end - start) }]} />
              <View style={[styles.playhead, { left: pct(position) }]} />
            </Pressable>

            <View style={styles.transport}>
              <Pressable onPress={() => seek(start)} disabled={!ready} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>ወደ መጀመሪያ</Text>
              </Pressable>

              <Pressable onPress={toggle} disabled={!ready} style={[styles.playButton, !ready && styles.nudgeDisabled]}>
                <Text style={styles.playText}>{status?.playing ? "አቁም" : "አጫውት"}</Text>
              </Pressable>

              <Pressable
                onPress={() => setLooping((on) => !on)}
                style={[styles.secondaryButton, looping && styles.secondaryOn]}
              >
                <Text style={[styles.secondaryText, looping && styles.secondaryTextOn]}>ድገማ</Text>
              </Pressable>
            </View>

            {!ready ? <Text style={styles.loading}>Loading audio…</Text> : null}
          </Card>

          <Card style={styles.rangeCard}>
            <View style={styles.rangeHead}>
              <Text style={styles.rangeTitle}>የሚደገመው ክፍል</Text>
              <Text style={styles.rangeSpan}>{formatTime(Math.max(0, end - start))}</Text>
            </View>

            <Boundary
              title="መጀመሪያ"
              value={start}
              disabled={!ready}
              onNudge={nudgeStart}
              onSetHere={() => setStartRaw(Math.min(position, end - MIN_SPAN))}
            />
            <Boundary
              title="መጨረሻ"
              value={end}
              disabled={!ready}
              onNudge={nudgeEnd}
              onSetHere={() => setEndRaw(Math.max(position, start + MIN_SPAN))}
            />

            <Pressable onPress={wholeTrack} disabled={!ready} style={styles.whole}>
              <Text style={styles.wholeText}>ሙሉውን ይያዙ</Text>
            </Pressable>
          </Card>

          <Card style={styles.speedCard}>
            <Text style={styles.rangeTitle}>ፍጥነት</Text>
            <View style={styles.speedRow}>
              {SPEEDS.map((rate) => (
                <Pressable
                  key={rate}
                  onPress={() => changeSpeed(rate)}
                  style={[styles.speedChip, speed === rate && styles.speedChipOn]}
                >
                  <Text style={[styles.speedText, speed === rate && styles.speedTextOn]}>{rate}×</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: "center", gap: spacing.md },
  introTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.primary },
  introBody: { ...typography.caption, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
  error: { ...typography.caption, color: colors.dangerDark },

  player: { gap: spacing.md, marginBottom: spacing.lg },
  trackRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  trackName: { flex: 1, fontFamily: fontFamily.ethiopicRegular, fontSize: 15, color: colors.textPrimary },
  change: { ...typography.caption, color: colors.primary, fontFamily: fontFamily.ethiopicRegular },

  clock: { fontFamily: fontFamily.latinBold, fontSize: 30, color: colors.textPrimary, textAlign: "center" },
  clockTotal: { fontFamily: fontFamily.latinRegular, fontSize: 16, color: colors.textMuted },

  bar: {
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "center",
  },
  region: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.primaryLight },
  playhead: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.accent },

  transport: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  playButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    ...shadows.card,
  },
  playText: { fontFamily: fontFamily.ethiopicBold, fontSize: 15, color: colors.onPrimary },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryOn: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  secondaryText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 13, color: colors.textSecondary },
  secondaryTextOn: { fontFamily: fontFamily.ethiopicBold, color: colors.accentDark },
  loading: { ...typography.caption, color: colors.textMuted, textAlign: "center" },

  rangeCard: { gap: spacing.md, marginBottom: spacing.lg },
  rangeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rangeTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.textPrimary },
  rangeSpan: { fontFamily: fontFamily.latinBold, fontSize: 14, color: colors.primary },

  boundary: { gap: spacing.xs },
  boundaryHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  boundaryTitle: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
  boundaryValue: { fontFamily: fontFamily.latinBold, fontSize: 16, color: colors.textPrimary },
  boundaryRow: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  nudge: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  nudgeDisabled: { opacity: 0.45 },
  nudgeText: { fontFamily: fontFamily.latinSemiBold, fontSize: 13, color: colors.textPrimary },
  here: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  hereText: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.primaryDark },

  whole: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  wholeText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 13, color: colors.primary },

  speedCard: { gap: spacing.sm, marginBottom: spacing.xl },
  speedRow: { flexDirection: "row", gap: spacing.sm },
  speedChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  speedChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  speedText: { fontFamily: fontFamily.latinSemiBold, fontSize: 14, color: colors.textSecondary },
  speedTextOn: { color: colors.primaryDark },
});
