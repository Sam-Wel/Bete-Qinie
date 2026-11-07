import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Card } from "./ui";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../theme";

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
          <Text style={styles.hereText}>Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

// A player for one recording with a repeat range: drag or nudge the start and
// end to hear just that part over and over, slower if needed. `region`
// ({ start, end, key }) sets the range from outside, e.g. one line of a ቅኔ;
// a new key applies it and jumps to its start.
export function LoopPlayer({ source, region }) {
  const [looping, setLooping] = useState(true);
  const [startRaw, setStartRaw] = useState(0);
  const [endRaw, setEndRaw] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [barWidth, setBarWidth] = useState(0);
  const [slow, setSlow] = useState(false);
  const [dragging, setDragging] = useState(null);
  // Where the playhead is being dragged to; shown instead of the player's time until the seek lands.
  const [scrub, setScrub] = useState(null);
  const seeking = useRef(false);

  const player = useAudioPlayer(source, { updateInterval: POLL_MS });
  const playerRef = useRef(player);
  playerRef.current = player;
  const status = useAudioPlayerStatus(player);

  const duration = Number.isFinite(status?.duration) && status.duration > 0 ? status.duration : 0;
  const position = Number.isFinite(status?.currentTime) ? status.currentTime : 0;
  const end = endRaw == null ? duration : Math.min(endRaw, duration);
  const start = Math.min(Math.max(0, startRaw), Math.max(0, end - MIN_SPAN));
  const ready = duration > 0;
  const shown = scrub ?? position;
  // The player reports a real decode failure; the timeout only covers a silent stall.
  const loadError = status?.error ?? (!ready && slow ? "Still no audio after 8 seconds." : null);

  // Turn the loop over at the B edge. seekTo is async, so guard against stacking seeks.
  useEffect(() => {
    if (!looping || !ready || !status?.playing) return;
    if (position < end || seeking.current) return;

    seeking.current = true;
    Promise.resolve(player.seekTo(start)).finally(() => {
      seeking.current = false;
    });
  }, [position, end, start, looping, ready, status?.playing, player]);

  // A file the browser cannot decode never reports a duration, so say so rather than
  // leaving "Loading audio…" up forever.
  // The wait only counts while the page is on screen: a browser holds back audio in a tab
  // in the background, and the message would otherwise be waiting there on return.
  useEffect(() => {
    if (ready) return undefined;
    let timer = null;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setSlow(true), 8000);
    };
    if (Platform.OS !== "web" || typeof document === "undefined") {
      start();
      return () => clearTimeout(timer);
    }
    const onVisibility = () => (document.visibilityState === "visible" ? start() : clearTimeout(timer));
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready]);

  const seek = (seconds) => {
    if (!ready) return;
    const target = Math.min(Math.max(0, seconds), duration);
    seeking.current = true;
    Promise.resolve(player.seekTo(target)).finally(() => {
      seeking.current = false;
    });
  };

  const toggle = () => (status?.playing ? player.pause() : player.play());

  // A range handed in from outside (a line of the text): loop it from its start.
  useEffect(() => {
    if (!region || !ready) return;
    setStartRaw(region.start);
    setEndRaw(region.end);
    setLooping(true);
    seek(region.start);
    if (!status?.playing) player.play();
  }, [region?.key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Without "high" the player sets preservesPitch to false, which drops the singer's pitch
  // along with the tempo. The melody has to stay where it is to be worth studying.
  const changeSpeed = (rate) => {
    setSpeed(rate);
    player.setPlaybackRate(rate, "high");
  };

  // A drag reads the geometry captured when the grab began, so the responders can be built
  // once without going stale as the edges move.
  const [geometry] = useState(() => ({ start: 0, end: 0, duration: 0, barWidth: 0, position: 0 }));
  useEffect(() => {
    Object.assign(geometry, { start, end, duration, barWidth, position });
  });

  const handles = useMemo(() => {
    const make = (edge) => {
      let grab = null;

      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const { start: s, end: e, duration: d, barWidth: w, position: p } = geometry;
          if (!d || !w) return;
          // The playhead moves only inside the range; the range itself stays put.
          grab =
            edge === "playhead"
              ? { from: Math.min(Math.max(p, s), e), min: s, max: e, perPixel: d / w }
              : {
                  from: edge === "start" ? s : e,
                  min: edge === "start" ? 0 : s + MIN_SPAN,
                  max: edge === "start" ? e - MIN_SPAN : d,
                  perPixel: d / w,
                };
          grab.at = grab.from;
          if (edge === "playhead") setScrub(grab.from);
          setDragging(edge);
        },
        onPanResponderMove: (_, gesture) => {
          if (!grab) return;
          const next = Math.min(Math.max(grab.from + gesture.dx * grab.perPixel, grab.min), grab.max);
          grab.at = next;
          if (edge === "playhead") setScrub(next);
          else if (edge === "start") setStartRaw(next);
          else setEndRaw(next);
        },
        onPanResponderRelease: () => finish(),
        onPanResponderTerminate: () => finish(),
      });

      function finish() {
        // Seek once on release; the playhead holds the dropped spot until the player catches up.
        if (grab && edge === "playhead") {
          const to = grab.at;
          seeking.current = true;
          Promise.resolve(playerRef.current?.seekTo(to)).finally(() => {
            seeking.current = false;
            setScrub(null);
          });
        }
        grab = null;
        setDragging(null);
      }
    };

    return { start: make("start"), end: make("end"), playhead: make("playhead") };
  }, [geometry]);

  const nudgeStart = (delta) => setStartRaw(Math.min(Math.max(0, start + delta), end - MIN_SPAN));
  const nudgeEnd = (delta) => setEndRaw(Math.min(Math.max(start + MIN_SPAN, end + delta), duration));
  const wholeTrack = () => {
    setStartRaw(0);
    setEndRaw(null);
  };

  const pct = (seconds) => (duration > 0 ? `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%` : "0%");

  return (
    <>
          <Card style={styles.player}>
            <Text style={styles.clock}>
              {formatTime(shown)}
              <Text style={styles.clockTotal}> / {formatTime(duration)}</Text>
            </Text>

            <View style={styles.barWrap} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
              <Pressable
                onPress={(e) => {
                  if (barWidth <= 0) return;
                  const at = (e.nativeEvent.locationX / barWidth) * duration;
                  seek(looping ? Math.min(Math.max(at, start), end) : at);
                }}
                style={styles.bar}
              >
                <View style={[styles.region, { left: pct(start), width: pct(end - start) }]} />
                <View style={[styles.playhead, { left: pct(shown) }]} />
              </Pressable>

              <View
                {...handles.playhead.panHandlers}
                accessibilityLabel="Drag to move the playhead within the range"
                style={[styles.scrubHandle, { left: pct(shown) }, dragging === "playhead" && styles.handleOn]}
              >
                <View style={[styles.scrubKnob, dragging === "playhead" && styles.scrubKnobOn]} />
              </View>

              <View
                {...handles.start.panHandlers}
                style={[styles.handle, { left: pct(start) }, dragging === "start" && styles.handleOn]}
              >
                <View style={[styles.grip, dragging === "start" && styles.gripOn]} />
              </View>
              <View
                {...handles.end.panHandlers}
                style={[styles.handle, { left: pct(end) }, dragging === "end" && styles.handleOn]}
              >
                <View style={[styles.grip, dragging === "end" && styles.gripOn]} />
              </View>
            </View>

            <View style={styles.transport}>
              <Pressable onPress={() => seek(start)} disabled={!ready} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>To start</Text>
              </Pressable>

              <Pressable onPress={toggle} disabled={!ready} style={[styles.playButton, !ready && styles.nudgeDisabled]}>
                <Text style={styles.playText}>{status?.playing ? "Pause" : "Play"}</Text>
              </Pressable>

              <Pressable
                onPress={() => setLooping((on) => !on)}
                style={[styles.secondaryButton, looping && styles.secondaryOn]}
              >
                <Text style={[styles.secondaryText, looping && styles.secondaryTextOn]}>Loop</Text>
              </Pressable>
            </View>

            {!ready && !loadError ? <Text style={styles.loading}>Loading audio…</Text> : null}
            {loadError ? <Text style={styles.failedText}>{loadError}</Text> : null}
          </Card>

          <Card style={styles.rangeCard}>
            <View style={styles.rangeHead}>
              <Text style={styles.rangeTitle}>Loop range</Text>
              <Text style={styles.rangeSpan}>{formatTime(Math.max(0, end - start))}</Text>
            </View>

            <Boundary
              title="Start"
              value={start}
              disabled={!ready}
              onNudge={nudgeStart}
              onSetHere={() => setStartRaw(Math.min(position, end - MIN_SPAN))}
            />
            <Boundary
              title="End"
              value={end}
              disabled={!ready}
              onNudge={nudgeEnd}
              onSetHere={() => setEndRaw(Math.max(position, start + MIN_SPAN))}
            />

            <Pressable onPress={wholeTrack} disabled={!ready} style={styles.whole}>
              <Text style={styles.wholeText}>Whole recording</Text>
            </Pressable>
          </Card>

          <Card style={styles.speedCard}>
            <Text style={styles.rangeTitle}>Speed</Text>
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
  );
}

const styles = StyleSheet.create({
  failedText: { ...typography.caption, color: colors.dangerDark, textAlign: "center" },

  player: { gap: spacing.md, marginBottom: spacing.lg },

  clock: { fontFamily: fontFamily.latinBold, fontSize: 30, color: colors.textPrimary, textAlign: "center" },
  clockTotal: { fontFamily: fontFamily.latinRegular, fontSize: 16, color: colors.textMuted },

  // The top lane holds the playhead knob, clear of the range handles inside the bar.
  barWrap: { justifyContent: "center", paddingTop: 26 },
  bar: {
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "center",
  },
  region: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.primaryLight },
  playhead: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.accent },
  handle: {
    position: "absolute",
    top: 20,
    bottom: -6,
    width: 34,
    marginLeft: -17,
    alignItems: "center",
    justifyContent: "center",
  },
  handleOn: { zIndex: 2 },
  grip: {
    width: 12,
    height: "100%",
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.onPrimary,
    ...shadows.card,
  },
  gripOn: { backgroundColor: colors.accent, width: 16 },
  scrubHandle: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 28,
    marginLeft: -20,
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
  },
  scrubKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.onPrimary,
    ...shadows.card,
  },
  scrubKnobOn: { width: 22, height: 22, borderRadius: 11 },

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
