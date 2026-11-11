import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import ModelRunner, { ModelRunnerHandle } from "./src/ModelRunner";
import GuideChat from "./src/GuideChat";
import Inventario from "./src/Inventario";
import { CATS, Cat, Season, StoredItem, clp, formatDias, normLabel, predict } from "./src/predict";
import { Btn, C, Chip, Dropdown, F, LEVEL_COLOR, Logo, SliderField, Tile } from "./src/ui";

const DEFAULT_MODEL = "https://teachablemachine.withgoogle.com/models/9_hWn5f8d/";
type Screen = "login" | "panel" | "resultado" | "inventario";
type Photo = { uri: string; b64: string };
type Result = { cat: Cat; suggested: Cat; conf: number; demo: boolean; photo: Photo };

const PROFILES = [
  { name: "Camila Soto", role: "Dueña · Tienda de ropa, Concepción", av: "CS" },
  { name: "Diego Muñoz", role: "Encargado de bodega", av: "DM" },
  { name: "Valentina Rojas", role: "Vendedora", av: "VR" },
];
const TALLAS = ["S", "M", "L", "XL"].map((t) => ({ value: t, label: t }));
const TEMPORADAS: { value: Season; label: string }[] = [
  { value: "verano", label: "Primavera / Verano" }, { value: "invierno", label: "Otoño / Invierno" }, { value: "todo", label: "Todo el año" },
];
const ZONAS = ["Estante A · Camisas", "Estante B · Pantalones", "Estante C · Abrigo", "Vitrina · Novedades"].map((z) => ({ value: z, label: z }));

function Root() {
  const insets = useSafeAreaInsets();
  const [fontsOk] = useFonts({ Inter_400Regular, Inter_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [screen, setScreen] = useState<Screen>("login");
  const [profile, setProfile] = useState(0);
  const [pin, setPin] = useState("1234");
  const [pinErr, setPinErr] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [talla, setTalla] = useState("M");
  const [season, setSeason] = useState<Season>("invierno");
  const [zona, setZona] = useState(ZONAS[0].value);
  const [stock, setStock] = useState(18);
  const [price, setPrice] = useState(29990);
  const [days, setDays] = useState(20);
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState("");
  const [guide, setGuide] = useState(false);
  const [toast, setToast] = useState("");
  const [items, setItems] = useState<StoredItem[]>([]);
  const [okMsg, setOkMsg] = useState("");
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const runner = useRef<ModelRunnerHandle>(null);
  const run = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem("closer.items").then((v) => { if (v) { try { setItems(JSON.parse(v)); } catch { /* lista dañada: se ignora */ } } }).catch(() => {});
  }, []);

  // Botón "atrás" de Android: vuelve una pantalla en lugar de cerrar la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (guide) { setGuide(false); return true; }
      if (screen === "resultado" || screen === "inventario") { setOkMsg(""); setScreen("panel"); return true; }
      if (screen === "panel") { setScreen("login"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [guide, screen]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  async function handlePicked(res: ImagePicker.ImagePickerResult) {
    if (res.canceled || !res.assets?.length) return;
    setReadingPhoto(true);
    try {
      const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 480 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
      const b64 = out.base64 ?? "";
      setPhoto({ uri: "data:image/jpeg;base64," + b64, b64 });
    } catch {
      Alert.alert("No pudimos leer la foto", "Prueba con otra imagen.");
    }
    setReadingPhoto(false);
  }
  async function camera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permiso de cámara", "Activa la cámara para Closer en los ajustes del teléfono, o elige una foto de la galería."); return; }
    handlePicked(await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }));
  }
  async function gallery() { handlePicked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 })); }

  function login() {
    if (pin !== "1234") { setPinErr(true); return; }
    setPinErr(false); setScreen("panel");
  }

  async function analizar() {
    if (!photo) { Alert.alert("Falta la foto", "Toma o elige una foto de la prenda para clasificarla."); return; }
    const id = ++run.current;
    setResult(null); setNote(""); setScreen("resultado");
    let cat: Cat; let conf: number; let demo = true;
    if (modelStatus === "ready" && runner.current) {
      try { const p = await runner.current.classify(photo.b64); cat = normLabel(p.label); conf = p.prob; demo = false; }
      catch { cat = CATS[photo.b64.length % 3]; conf = 0.55 + (photo.b64.length % 40) / 100; }
    } else {
      await new Promise((r) => setTimeout(r, 900));
      cat = CATS[photo.b64.length % 3]; conf = 0.55 + (photo.b64.length % 40) / 100;
    }
    if (id !== run.current) return;
    setResult({ cat, suggested: cat, conf, demo, photo });
  }

  const pred = useMemo(() => (result ? predict({ cat: result.cat, conf: result.conf, stock, price, days, season }) : null), [result, stock, price, days, season]);

  async function guardar() {
    if (!result) return;
    try {
      const n = items.filter((i) => i.cat === result.cat).length + 1;
      const item: StoredItem = { id: Date.now(), name: `${result.cat} ${String(n).padStart(2, "0")}`, cat: result.cat, img: result.photo.uri, talla, stock, price, days, zona, season };
      const list = [item, ...items];
      await AsyncStorage.setItem("closer.items", JSON.stringify(list));
      setItems(list);
      setOkMsg(`Guardaste ${item.name} en tu inventario.`);
      setPhoto(null); setResult(null); setScreen("inventario");
    } catch { say("No se pudo guardar. Intenta de nuevo."); }
  }
  function otra() { setPhoto(null); setResult(null); setScreen("panel"); }

  if (!fontsOk) return <View style={[st.fill, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={C.accentHi} /></View>;

  let body: React.ReactNode = null;

  if (screen === "login") {
    body = (
      <ScrollView contentContainerStyle={st.scr} keyboardShouldPersistTaps="handled">
        <Logo size={34} />
        <View style={{ gap: 8 }}>
          <Text style={st.over}>VISIÓN ARTIFICIAL PARA TU INVENTARIO</Text>
          <Text style={st.t1}>Cada prenda en su lugar, <Text style={{ color: C.accentHi }}>automáticamente.</Text></Text>
          <Text style={st.muted}>De una fotografía a un catálogo organizado. Closer sugiere la categoría de cada prenda con inteligencia artificial y tú confirmas.</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={st.fl}>Perfil de operador</Text>
          {PROFILES.map((p, i) => (
            <Pressable key={p.name} accessibilityRole="button" accessibilityState={{ selected: profile === i }} onPress={() => setProfile(i)} style={[st.profile, profile === i && st.profileOn]}>
              <View style={st.avatar}><Text style={st.avatarTx}>{p.av}</Text></View>
              <View style={{ flex: 1 }}><Text style={st.itemT}>{p.name}</Text><Text style={st.small}>{p.role}</Text></View>
            </Pressable>
          ))}
        </View>
        <View>
          <Text style={st.fl}>Clave</Text>
          <TextInput value={pin} onChangeText={(v) => { setPin(v); setPinErr(false); }} secureTextEntry keyboardType="number-pad" maxLength={8} style={[st.input, pinErr && { borderColor: C.err }]} placeholderTextColor={C.fg2} accessibilityLabel="Clave" />
          {pinErr && <Text style={{ color: C.err, fontFamily: F.b, fontSize: 13, marginTop: 6 }}>Clave incorrecta. En la demostración es 1234.</Text>}
        </View>
        <Btn label="Ingresar al panel" onPress={login} />
        <Text style={[st.small, { textAlign: "center" }]}>Acceso simulado para la demostración.</Text>
        <Btn kind="t" label="💬 ¿Cómo funciona Closer?" onPress={() => setGuide(true)} />
      </ScrollView>
    );
  } else if (screen === "panel") {
    body = (
      <ScrollView contentContainerStyle={st.scr} keyboardShouldPersistTaps="handled">
        <View style={st.hdr}>
          <Logo size={24} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={st.small}>{PROFILES[profile].name.split(" ")[0]}</Text>
            <View style={[st.avatar, { width: 30, height: 30 }]}><Text style={[st.avatarTx, { fontSize: 12 }]}>{PROFILES[profile].av}</Text></View>
          </View>
        </View>
        <View><Text style={st.over}>PANEL DE INGRESO</Text><Text style={[st.t2, { marginTop: 4 }]}>Registra una prenda</Text>{items.length > 0 && <Text style={st.small}>{items.length} prendas guardadas en este teléfono</Text>}</View>

        <Text style={st.sec}>Foto de la prenda</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Btn kind="s" label="📷 Tomar foto" onPress={camera} disabled={readingPhoto} /></View>
          <View style={{ flex: 1 }}><Btn kind="s" label="Elegir de la galería" onPress={gallery} disabled={readingPhoto} /></View>
        </View>
        {readingPhoto && <View style={{ alignItems: "center" }}><ActivityIndicator color={C.accentHi} /></View>}
        {photo && (
          <View style={st.prev}>
            <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel="Vista previa de la prenda" />
            <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Quitar foto" style={st.rm}><Text style={{ color: "#fff" }}>✕</Text></Pressable>
          </View>
        )}
        <Text style={st.small}>Ubica la prenda completa, con buena luz y un fondo sencillo.{modelStatus !== "ready" ? (modelStatus === "loading" ? " Cargando el modelo de Teachable Machine…" : " Sin modelo: la categoría será de ejemplo.") : ""}</Text>

        <Text style={st.sec}>Datos del inventario</Text>
        <Dropdown label="Talla" value={talla} options={TALLAS} onChange={setTalla} />
        <Dropdown label="Temporada" value={season} options={TEMPORADAS} onChange={(v) => setSeason(v as Season)} />
        <Dropdown label="Sección de la bodega" value={zona} options={ZONAS} onChange={setZona} />

        <SliderField label="Unidades en stock" value={stock} min={0} max={100} step={1} onChange={setStock} shown={String(stock)} unit="u." minLabel="0" maxLabel="100" />
        <SliderField label="Precio de venta" value={price} min={5000} max={80000} step={500} onChange={setPrice} shown={clp(price)} unit="CLP" minLabel="$5.000" maxLabel="$80.000" />
        <SliderField label="Días en bodega" value={days} min={0} max={180} step={1} onChange={setDays} shown={String(days)} unit="días" minLabel="0" maxLabel="180" />

        <Btn label="Clasificar y analizar con IA" onPress={analizar} />
        <Btn kind="t" label={`Ver inventario registrado (${items.length})`} onPress={() => { setOkMsg(""); setScreen("inventario"); }} />
      </ScrollView>
    );
  } else if (screen === "inventario") {
    body = <Inventario items={items} message={okMsg} onBack={() => { setOkMsg(""); setScreen("panel"); }} onNew={() => { setOkMsg(""); setScreen("panel"); }} />;
  } else {
    if (!result || !pred) {
      body = (
        <View style={[st.fill, { alignItems: "center", justifyContent: "center", gap: 16 }]}>
          <ActivityIndicator size="large" color={C.accentHi} />
          <Text style={st.muted}>Analizando la foto y el inventario…</Text>
        </View>
      );
    } else {
      const lv = pred.levels;
      const gc = LEVEL_COLOR[lv.global];
      const same = result.cat === result.suggested;
      body = (
        <ScrollView contentContainerStyle={st.scr}>
          <View style={st.hdr}>
            <Pressable onPress={() => setScreen("panel")} style={st.iconBtn} accessibilityRole="button" accessibilityLabel="Volver"><Text style={{ color: C.fg, fontSize: 20 }}>‹</Text></Pressable>
            <Text style={st.over}>SUGERENCIA DE LA IA</Text><View style={{ width: 44 }} />
          </View>
          <Text style={st.small}>{zona} · Talla {talla} · {TEMPORADAS.find((t) => t.value === season)?.label}</Text>

          <View style={st.sug}>
            <Image source={{ uri: result.photo.uri }} style={st.sugImg} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={st.small}>{same ? (result.demo ? "Sugerencia de ejemplo" : "Parece una") : "Categoría que elegiste"}</Text>
              <Text style={st.sugT}>{result.cat}</Text>
              <Text style={st.small}>{same ? `Confianza ${Math.round(result.conf * 100)}%` : "Corregida por ti"}</Text>
            </View>
          </View>

          <View style={[st.status, { borderColor: gc }]}>
            <View style={[st.lamp, { backgroundColor: gc }]}><Text style={st.lampTx}>{lv.global === "ok" ? "✓" : lv.global === "warn" ? "!" : "✕"}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[st.t3, { color: gc }]}>{lv.global === "ok" ? "Todo en orden" : lv.global === "warn" ? "Revisa antes de guardar" : "Requiere revisión manual"}</Text>
              <Text style={st.small}>{lv.global === "ok" ? "Clasificación confiable y stock sano." : lv.global === "warn" ? "Hay puntos que conviene confirmar." : "Hay un problema de clasificación, stock o rotación."}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Tile k="Clasificación" v={`${Math.round(result.conf * 100)}%`} level={lv.clasificacion} />
            <Tile k="Stock" v={`${stock} u.`} level={lv.stock} />
            <Tile k="Rotación" v={`${days} días`} level={lv.rotacion} />
          </View>

          <Text style={st.sec}>Métricas estimadas</Text>
          <View style={st.metric}>
            <View style={st.mTop}><Text style={[st.small, { flex: 1, fontSize: 13 }]}>Probabilidad de quiebre de stock (30 días)</Text><Text style={[st.mV, { color: LEVEL_COLOR[lv.stock] }]}>{pred.probQuiebre}%</Text></View>
            <View style={st.bar}><View style={{ width: `${pred.probQuiebre}%`, height: "100%", borderRadius: 4, backgroundColor: LEVEL_COLOR[lv.stock] }} /></View>
          </View>
          <View style={st.metric}><View style={st.mTop}><Text style={[st.small, { flex: 1, fontSize: 13 }]}>Tiempo estimado hasta agotar stock</Text><Text style={st.mV}>{formatDias(pred, stock)}</Text></View></View>
          <View style={st.metric}><View style={st.mTop}><Text style={[st.small, { flex: 1, fontSize: 13 }]}>Ingreso proyectado (30 días)</Text><Text style={st.mV}>{clp(pred.ingreso30d)}</Text></View></View>

          <View style={st.chat}>
            <Text style={st.chatHd}>ASISTENTE CLOSER IA</Text>
            <View style={st.bubble}>
              {note ? <Text style={st.bubbleTx}>{note}</Text> : (
                <>
                  <Text style={st.bubbleTx}>{pred.headline}</Text>
                  {pred.items.map((t, i) => <Text key={i} style={[st.bubbleTx, { marginTop: 6 }]}>• {t}</Text>)}
                </>
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Chip label="¿Cómo llegaste a esto?" on={false} onPress={() => setNote(`Comparé la foto con las categorías del modelo (camisa formal, jeans, hoodie). La confianza es ${Math.round(result.conf * 100)}%. Para el stock usé la demanda típica de la categoría (≈${Math.round(pred.ventasSemana)} u. por semana) y la temporada.`)} />
              <Chip label="¿Cómo mejoro la foto?" on={false} onPress={() => setNote("Prenda completa dentro del encuadre, luz pareja y un fondo sencillo. Evita sombras fuertes y pliegues que tapen el cuello o los bolsillos.")} />
            </View>
            <Btn kind="s" label="💬 Ayuda: Guía de Closer" onPress={() => setGuide(true)} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={st.fl}>¿Es correcta? Tú decides.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{CATS.map((c) => <Chip key={c} label={c} on={result.cat === c} onPress={() => { setResult({ ...result, cat: c }); setNote(""); }} />)}</View>
          </View>
          <Btn label="Confirmar y guardar en el catálogo" onPress={guardar} />
          <Btn kind="t" label="Registrar otra prenda" onPress={otra} />
        </ScrollView>
      );
    }
  }

  return (
    <View style={[st.fill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>{body}</View>
      {!!toast && <View style={[st.toast, { bottom: 24 + insets.bottom }]}><Text style={{ color: C.bg, fontFamily: F.bm }}>{toast}</Text></View>}
      <GuideChat visible={guide} onClose={() => setGuide(false)} />
      <ModelRunner key={DEFAULT_MODEL} ref={runner} modelUrl={DEFAULT_MODEL} onStatus={setModelStatus} />
    </View>
  );
}

export default function App() { return <SafeAreaProvider><Root /></SafeAreaProvider>; }

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  scr: { padding: 16, gap: 16 },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  over: { fontFamily: F.d6, fontSize: 11, letterSpacing: 0.9, color: C.accentHi },
  t1: { fontFamily: F.d8, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: C.fg },
  t2: { fontFamily: F.d8, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: C.fg },
  t3: { fontFamily: F.d8, fontSize: 20, lineHeight: 24, color: C.fg },
  muted: { fontFamily: F.b, fontSize: 15, lineHeight: 22, color: C.fg2 },
  small: { fontFamily: F.b, fontSize: 12, color: C.fg2 },
  fl: { fontFamily: F.bm, fontSize: 12, color: C.fg2, marginBottom: 6 },
  sec: { fontFamily: F.d7, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: C.fg2 },
  itemT: { fontFamily: F.d6, fontSize: 15, color: C.fg },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, color: C.fg, paddingHorizontal: 14, fontFamily: F.b, fontSize: 16 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 10 },
  profileOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" },
  avatarTx: { fontFamily: F.d7, fontSize: 14, color: C.accentHi },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  prev: { aspectRatio: 1, maxHeight: 260, borderRadius: 16, overflow: "hidden", backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1 },
  rm: { position: "absolute", top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  sug: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 14 },
  sugImg: { width: 76, height: 76, borderRadius: 14, backgroundColor: C.bg2 },
  sugT: { fontFamily: F.d8, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: C.fg },
  status: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderWidth: 1, borderRadius: 18, padding: 16 },
  lamp: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  lampTx: { fontFamily: F.d8, fontSize: 22, color: "#04130a" },
  metric: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  mTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  mV: { fontFamily: F.d8, fontSize: 22, color: C.fg },
  bar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  chat: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  chatHd: { fontFamily: F.d7, fontSize: 12, letterSpacing: 1, color: C.accentHi },
  bubble: { backgroundColor: C.card2, borderRadius: 14, borderTopLeftRadius: 4, padding: 12 },
  bubbleTx: { fontFamily: F.b, fontSize: 14, lineHeight: 21, color: C.fg3 },
  toast: { position: "absolute", left: 16, right: 16, backgroundColor: C.fg, padding: 12, borderRadius: 12 },
});
