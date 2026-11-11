import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StoredItem, clp, itemStatus } from "./predict";
import { Btn, C, Chip, F, LEVEL_COLOR } from "./ui";

const FILTERS = ["Todas", "Camisa formal", "Jeans", "Hoodie", "Con alerta"] as const;

export default function Inventario({ items, message, onBack, onNew }: { items: StoredItem[]; message: string; onBack: () => void; onNew: () => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todas");
  const [q, setQ] = useState("");

  const rows = useMemo(() => items.map((i) => ({ ...i, st: i.stock != null ? itemStatus({ cat: i.cat, stock: i.stock, days: i.days ?? 0, season: i.season }) : null })), [items]);
  const withData = rows.filter((r) => r.stock != null);
  const totalUnits = withData.reduce((a, r) => a + (r.stock ?? 0), 0);
  const totalValue = withData.reduce((a, r) => a + (r.stock ?? 0) * (r.price ?? 0), 0);
  const alerts = rows.filter((r) => r.st && r.st.level !== "ok").length;

  const text = q.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (filter === "Todas" || (filter === "Con alerta" ? !!r.st && r.st.level !== "ok" : r.cat === filter)) &&
    (!text || `${r.name} ${r.zona ?? ""}`.toLowerCase().includes(text)));

  const sums: [string, string][] = [["Prendas", String(rows.length)], ["Unidades en stock", String(totalUnits)], ["Valor del inventario", clp(totalValue)], ["Con alerta", String(alerts)]];

  return (
    <ScrollView contentContainerStyle={st.scr} keyboardShouldPersistTaps="handled">
      <View style={st.hdr}>
        <Pressable onPress={onBack} style={st.iconBtn} accessibilityRole="button" accessibilityLabel="Volver al panel"><Text style={{ color: C.fg, fontSize: 20 }}>‹</Text></Pressable>
        <Text style={st.over}>INVENTARIO REGISTRADO</Text><View style={{ width: 44 }} />
      </View>
      {!!message && <View style={st.banner}><Text style={{ color: C.fg, fontFamily: F.b, fontSize: 13 }}>{message}</Text></View>}
      <Text style={st.t2}>Tu inventario</Text>

      <View style={st.grid}>
        {sums.map(([k, v]) => (
          <View key={k} style={st.sum}><Text style={st.small}>{k}</Text><Text style={st.sumV} numberOfLines={1}>{v}</Text></View>
        ))}
      </View>

      <TextInput value={q} onChangeText={setQ} placeholder="Buscar prenda…" placeholderTextColor={C.fg2} style={st.input} accessibilityLabel="Buscar prenda" autoCorrect={false} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} on={filter === f} onPress={() => setFilter(f)} />)}
      </View>

      {rows.length === 0 ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
          <Text style={st.t3}>Aún no hay prendas</Text>
          <Text style={[st.muted, { textAlign: "center" }]}>Registra una prenda con su foto y aparecerá aquí.</Text>
        </View>
      ) : shown.length === 0 ? (
        <Text style={[st.muted, { textAlign: "center", paddingVertical: 24 }]}>No hay prendas con ese filtro.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {shown.map((r) => (
            <View key={r.id} style={st.row}>
              <View style={st.thumb}>
                {r.img ? <Image source={{ uri: r.img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Text style={{ fontFamily: F.d8, fontSize: 24, color: C.fg2 }}>{r.cat[0]}</Text>}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.name} numberOfLines={1}>{r.name}</Text>
                <Text style={st.small} numberOfLines={1}>{r.talla ? `Talla ${r.talla}` : "Sin talla"}{r.zona ? ` · ${r.zona}` : ""}</Text>
                {r.st ? (
                  <View style={[st.pill, { borderColor: LEVEL_COLOR[r.st.level] }]}><Text style={[st.pillTx, { color: LEVEL_COLOR[r.st.level] }]}>{r.st.text}</Text></View>
                ) : <Text style={st.small}>Sin datos de stock</Text>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text style={st.price}>{r.price != null ? clp(r.price) : "—"}</Text>
                <Text style={st.small}>{r.stock != null ? `${r.stock} u.` : ""}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Btn label="Registrar otra prenda" onPress={onNew} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scr: { padding: 16, gap: 16 },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  over: { fontFamily: F.d6, fontSize: 11, letterSpacing: 0.9, color: C.accentHi },
  t2: { fontFamily: F.d8, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: C.fg },
  t3: { fontFamily: F.d8, fontSize: 20, color: C.fg },
  muted: { fontFamily: F.b, fontSize: 15, lineHeight: 22, color: C.fg2 },
  small: { fontFamily: F.b, fontSize: 12, color: C.fg2 },
  banner: { backgroundColor: C.accentSoft, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sum: { width: "48.5%", flexGrow: 1, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 12, gap: 2 },
  sumV: { fontFamily: F.d8, fontSize: 20, color: C.fg },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, color: C.fg, paddingHorizontal: 14, fontFamily: F.b, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: C.bg2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  name: { fontFamily: F.d7, fontSize: 15, color: C.fg },
  price: { fontFamily: F.d7, fontSize: 14, color: C.fg },
  pill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillTx: { fontFamily: F.d6, fontSize: 11, letterSpacing: 0.3 },
});
