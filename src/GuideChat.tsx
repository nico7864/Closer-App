import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import WebViewBase from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "./ui";
const WebView = WebViewBase as unknown as React.ComponentType<any>;

// Chat "Guía de Closer" (Botpress) dentro de un WebView. Requiere internet.
// Se abre solo al cargar; si el bot cambia, se actualizan estas dos URLs.
const HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#09090b;color:#a1a1aa;font-family:sans-serif}#w{padding:24px;text-align:center}</style></head><body>
<div id="w">Cargando la guía de Closer…</div>
<script src="https://cdn.botpress.cloud/webchat/v5.0/inject.js"></script>
<script src="https://files.bpcontent.cloud/2026/10/15/17/20261015173800-39HBA8T8.js" defer></script>
<script>
var tries=0;var t=setInterval(function(){
  tries++;
  if(window.botpress&&typeof window.botpress.open==='function'){try{window.botpress.open();document.getElementById('w').style.display='none';}catch(e){}clearInterval(t);}
  if(tries>40){clearInterval(t);document.getElementById('w').textContent='No se pudo cargar el chat. Revisa tu conexión a internet.';}
},500);
</script></body></html>`;

export default function GuideChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, minHeight: 56 }}>
          <View>
            <Text style={{ fontFamily: F.d6, fontSize: 11, letterSpacing: 0.9, color: C.accentHi }}>CHAT DE AYUDA</Text>
            <Text style={{ fontFamily: F.d7, fontSize: 18, color: C.fg }}>Guía de Closer</Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar chat" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.fg, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>
        {visible && <WebView source={{ html: HTML, baseUrl: "https://closer.local" }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled style={{ flex: 1, backgroundColor: C.bg }} />}
      </View>
    </Modal>
  );
}
