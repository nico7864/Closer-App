// Lógica predictiva de Closer. Funciones puras, sin React ni red.
export const CATS = ["Camisa formal", "Jeans", "Hoodie", "Otra prenda"] as const;
export type Cat = (typeof CATS)[number];
export type Level = "ok" | "warn" | "crit";
export type Season = "verano" | "invierno" | "todo";

export type Inputs = { cat: Cat; conf: number; stock: number; price: number; days: number; season: Season };
export type Prediction = {
  levels: { clasificacion: Level; stock: Level; rotacion: Level; global: Level };
  probQuiebre: number; // 0-100
  diasHastaAgotar: number; // Infinity si no se vende
  ventasSemana: number;
  ingreso30d: number;
  headline: string;
  items: string[];
};

// Unidades vendidas por semana en condiciones normales (valores de ejemplo para la demostración).
const DEMAND: Record<Cat, number> = { "Camisa formal": 14, Jeans: 10, Hoodie: 9, "Otra prenda": 8 };

export function normLabel(l: string): Cat {
  const s = l.toLowerCase();
  if (s.includes("jean") || s.includes("pantal")) return "Jeans";
  if (s.includes("hood") || s.includes("sudadera") || s.includes("polerón") || s.includes("poleron")) return "Hoodie";
  if (s.includes("camis") || s.includes("shirt")) return "Camisa formal";
  return "Otra prenda";
}

const worst = (ls: Level[]): Level => (ls.includes("crit") ? "crit" : ls.includes("warn") ? "warn" : "ok");
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function predict(i: Inputs): Prediction {
  let weekly = DEMAND[i.cat];
  if (i.cat === "Hoodie") {
    if (i.season === "invierno") weekly *= 1.6;
    if (i.season === "verano") weekly *= 0.4;
  }
  if (i.days > 90) weekly *= 0.7;
  const perDay = weekly / 7;
  const diasHastaAgotar = i.stock <= 0 ? 0 : perDay > 0 ? i.stock / perDay : Infinity;
  const probQuiebre = i.stock <= 0 ? 100 : clamp(Math.round(100 * (1 - Math.min(1, diasHastaAgotar / 30))), 2, 98);
  const ingreso30d = Math.min(i.stock, perDay * 30) * i.price;

  const clasificacion: Level = i.conf >= 0.8 ? "ok" : i.conf >= 0.6 ? "warn" : "crit";
  const stock: Level = probQuiebre <= 30 ? "ok" : probQuiebre <= 65 ? "warn" : "crit";
  const rotacion: Level = i.days <= 60 ? "ok" : i.days <= 120 ? "warn" : "crit";
  const global = worst([clasificacion, stock, rotacion]);

  const items: string[] = [];
  if (clasificacion !== "ok") items.push("La confianza de la clasificación es baja: revisa la categoría antes de guardar o saca otra foto con buena luz y fondo liso.");
  if (stock === "crit") items.push(`Repón pronto: a este ritmo (≈${Math.round(weekly)} u. por semana) el stock dura ${i.stock <= 0 ? 0 : Math.round(diasHastaAgotar)} días.`);
  else if (stock === "warn") items.push("Programa la reposición este mes para no quedar sin tallas.");
  if (rotacion === "crit") items.push(`Lleva ${i.days} días en bodega: considera una promoción o moverla a la vitrina.`);
  else if (rotacion === "warn") items.push("Rotación lenta: súmala a la sección de novedades.");
  if (!items.length) items.push("Guárdala en el catálogo y publícala el mismo día.");

  const headline = {
    ok: "La categoría se ve clara y el inventario está sano.",
    warn: "Te sugiero revisar un par de cosas antes de guardar.",
    crit: "Antes de guardar, revisa lo siguiente.",
  }[global];

  return { levels: { clasificacion, stock, rotacion, global }, probQuiebre, diasHastaAgotar, ventasSemana: weekly, ingreso30d, headline, items };
}

// Prenda guardada en el teléfono. Los campos opcionales faltan en prendas guardadas por versiones anteriores.
export type StoredItem = { id: number; name: string; cat: Cat; img?: string; talla?: string; stock?: number; price?: number; days?: number; zona?: string; season?: Season };

export function itemStatus(it: { cat: Cat; stock: number; days: number; season?: Season }): { level: Level; text: string } {
  const p = predict({ cat: it.cat, conf: 1, stock: it.stock, price: 0, days: it.days, season: it.season ?? "todo" });
  if (it.stock <= 0) return { level: "crit", text: "Agotado" };
  if (p.probQuiebre > 65) return { level: "crit", text: "Quiebre próximo" };
  if (it.days > 120) return { level: "warn", text: "Rotación lenta" };
  if (p.probQuiebre > 30) return { level: "warn", text: "Stock bajo" };
  return { level: "ok", text: "Stock sano" };
}

export function clp(n: number): string {
  return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDias(p: Prediction, stock: number): string {
  if (stock <= 0) return "Agotado";
  if (p.diasHastaAgotar >= 90) return "+90 días";
  return "≈ " + Math.round(p.diasHastaAgotar) + " días";
}
