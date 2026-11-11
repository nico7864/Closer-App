import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import type { Level } from "./predict";

export const C = {
  bg: "#09090b", bg2: "#000000", card: "#18181b", card2: "#202024", fg: "#ffffff", fg2: "#a1a1aa", fg3: "#e4e4e7",
  line: "rgba(255,255,255,0.09)", accent: "#2563eb", accentHi: "#60a5fa", accentSoft: "rgba(37,99,235,0.16)",
  ok: "#22c55e", warn: "#f59e0b", err: "#ef4444",
};
export const F = { b: "Inter_400Regular", bm: "Inter_500Medium", d6: "PlusJakartaSans_600SemiBold", d7: "PlusJakartaSans_700Bold", d8: "PlusJakartaSans_800ExtraBold" };
export const LOGO_URL = "https://fmendezsara.github.io/closer-4/images/logo.png";
export const LEVEL_COLOR: Record<Level, string> = { ok: C.ok, warn: C.warn, crit: C.err };
export const LEVEL_LABEL: Record<Level, string> = { ok: "Normal", warn: "Atención", crit: "Riesgo" };

export const Logo = ({ size = 28 }: { size?: number }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Image source={{ uri: LOGO_URL }} style={{ width: size, height: size }} resizeMode="contain" />
    <Text style={{ fontFamily: F.d8, fontSize: size * 0.8, color: C.fg, letterSpacing: -0.4 }}>closer<Text style={{ color: C.accentHi }}>.</Text></Text>
  </View>
);

export const Btn = ({ label, onPress, kind = "p", disabled }: { label: string; onPress: () => void; kind?: "p" | "s" | "t"; disabled?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.btn, kind === "p" && s.btnP, kind === "s" && s.btnS, kind === "t" && s.btnT, pressed && { transform: [{ scale: 0.97 }] }, disabled && { opacity: 0.45 }]}>
    <Text style={[s.btnTx, kind !== "p" && { color: C.accentHi }, kind === "t" && { fontSize: 15 }]}>{label}</Text>
  </Pressable>
);

export const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[s.chip, on && s.chipOn]}>
    <Text style={[s.chipTx, on && { color: "#fff" }]}>{label}</Text>
  </Pressable>
);

type Opt = { value: string; label: string };
export function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: Opt[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${cur?.label ?? ""}`} onPress={() => setOpen(true)} style={s.dd}>
        <Text style={s.ddTx} numberOfLines={1}>{cur?.label}</Text>
        <Text style={{ color: C.fg2, fontSize: 14 }}>▾</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={[s.fieldLabel, { marginBottom: 4 }]}>{label}</Text>
            {options.map((o) => (
              <Pressable key={o.value} accessibilityRole="button" onPress={() => { onChange(o.value); setOpen(false); }} style={[s.opt, o.value === value && { backgroundColor: C.accentSoft }]}>
                <Text style={[s.ddTx, o.value === value && { color: C.accentHi }]}>{o.label}</Text>
                {o.value === value && <Text style={{ color: C.accentHi }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function SliderField(p: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; shown: string; unit: string; minLabel: string; maxLabel: string }) {
  return (
    <View style={s.ctl}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <Text style={[s.fieldLabel, { marginBottom: 0, flex: 1, color: C.fg3 }]}>{p.label}</Text>
        <Text style={{ fontFamily: F.d7, fontSize: 18, color: C.fg }}>{p.shown}<Text style={{ fontFamily: F.b, fontSize: 12, color: C.fg2 }}> {p.unit}</Text></Text>
      </View>
      <Slider accessibilityLabel={p.label} style={{ height: 36 }} value={p.value} minimumValue={p.min} maximumValue={p.max} step={p.step}
        onValueChange={(v: number) => p.onChange(v)} minimumTrackTintColor={C.accentHi} maximumTrackTintColor="rgba(255,255,255,0.18)" thumbTintColor="#ffffff" />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.small}>{p.minLabel}</Text><Text style={s.small}>{p.maxLabel}</Text>
      </View>
    </View>
  );
}

export const Tile = ({ k, v, level }: { k: string; v: string; level: Level }) => (
  <View style={[s.tile, { borderTopColor: LEVEL_COLOR[level] }]}>
    <Text style={s.small}>{k}</Text>
    <Text style={{ fontFamily: F.d7, fontSize: 15, color: C.fg }} numberOfLines={1}>{v}</Text>
    <Text style={{ fontFamily: F.d6, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: LEVEL_COLOR[level] }}>{LEVEL_LABEL[level]}</Text>
  </View>
);

export const s = StyleSheet.create({
  btn: { height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnP: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  btnS: { borderWidth: 1, borderColor: C.accent },
  btnT: { minHeight: 44, height: undefined, alignSelf: "center" },
  btnTx: { fontFamily: F.d7, fontSize: 16, color: "#fff", textAlign: "center" },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, justifyContent: "center" },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipTx: { fontFamily: F.bm, fontSize: 14, color: C.fg },
  fieldLabel: { fontFamily: F.bm, fontSize: 12, color: C.fg2, marginBottom: 6 },
  small: { fontFamily: F.b, fontSize: 11, color: C.fg2 },
  dd: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ddTx: { fontFamily: F.b, fontSize: 16, color: C.fg, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 2 },
  opt: { minHeight: 48, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ctl: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  tile: { flex: 1, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderTopWidth: 3, borderRadius: 12, padding: 10, gap: 4 },
});
