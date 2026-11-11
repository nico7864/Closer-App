import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import WebViewBase, { WebViewMessageEvent } from "react-native-webview";
const WebView = WebViewBase as unknown as React.ComponentType<any>;

export type Prediction = { label: string; prob: number };
export type ModelRunnerHandle = { classify: (b64: string) => Promise<Prediction> };

// Un WebView oculto carga TensorFlow.js + Teachable Machine y clasifica la foto.
// Funciona dentro de Expo Go porque no requiere módulos nativos propios.
const html = (modelUrl: string) => `<!doctype html><html><body><script>
const base=${JSON.stringify(modelUrl.replace(/\/?$/, "/"))};
const send=o=>window.ReactNativeWebView.postMessage(JSON.stringify(o));
const add=s=>new Promise((r,j)=>{const e=document.createElement('script');e.src=s;e.onload=r;e.onerror=j;document.head.appendChild(e)});
let model=null;
(async()=>{try{
 await add('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
 await add('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js');
 model=await tmImage.load(base+'model.json',base+'metadata.json');send({type:'ready'});
}catch(e){send({type:'fatal',error:String(e)})}})();
async function onMsg(ev){
 let m;try{m=JSON.parse(ev.data)}catch(e){return}
 if(m.type!=='classify')return;
 try{
  const img=new Image();img.src='data:image/jpeg;base64,'+m.b64;await img.decode();
  const p=await model.predict(img);p.sort((a,b)=>b.probability-a.probability);
  send({type:'result',id:m.id,label:p[0].className,prob:p[0].probability});
 }catch(e){send({type:'error',id:m.id,error:String(e)})}
}
document.addEventListener('message',onMsg);window.addEventListener('message',onMsg);
</script></body></html>`;

type Props = { modelUrl: string; onStatus: (s: "loading" | "ready" | "error") => void };

export default forwardRef<ModelRunnerHandle, Props>(function ModelRunner({ modelUrl, onStatus }, ref) {
  const web = useRef<any>(null);
  const ready = useRef(false);
  const pending = useRef(new Map<number, { ok: (p: Prediction) => void; ko: (e: Error) => void }>());
  const seq = useRef(0);

  useImperativeHandle(ref, () => ({
    classify: (b64) =>
      new Promise((ok, ko) => {
        if (!ready.current) return ko(new Error("Modelo aún cargando"));
        const id = ++seq.current;
        pending.current.set(id, { ok, ko });
        web.current?.postMessage(JSON.stringify({ type: "classify", id, b64 }));
        setTimeout(() => {
          if (pending.current.delete(id)) ko(new Error("Tiempo agotado"));
        }, 20000);
      }),
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data);
    if (m.type === "ready") { ready.current = true; onStatus("ready"); }
    else if (m.type === "fatal") { ready.current = false; onStatus("error"); }
    else if (m.type === "result") { pending.current.get(m.id)?.ok({ label: m.label, prob: m.prob }); pending.current.delete(m.id); }
    else if (m.type === "error") { pending.current.get(m.id)?.ko(new Error(m.error)); pending.current.delete(m.id); }
  };

  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }} pointerEvents="none">
      <WebView
        ref={web}
        source={{ html: html(modelUrl), baseUrl: "https://closer.local" }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        onLoadStart={() => onStatus("loading")}
        javaScriptEnabled
      />
    </View>
  );
});
