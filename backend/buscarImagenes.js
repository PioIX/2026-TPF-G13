// Busca una imagen válida (Content-Type image/*) en Wikipedia para cada título.
const UA = "TrayectoApp/1.0 (proyecto escolar)";

const candidatos = {
  "Premier League": ["Premier League"],
  "Serie A": ["Serie A"],
  "Ligue 1": ["Ligue 1"],
  "Copa Argentina": ["Copa Argentina"],
  "Liga MX": ["Liga MX", "Liga MX (fútbol)"],
  "Austrian Bundesliga": ["Austrian Football Bundesliga", "Bundesliga (Austria)"],
  "J1 League": ["J1 League"],
  "Copa MX": ["Copa MX"],
  "Copa del Rey Saudí": ["Copa del Rey de Arabia Saudita", "King Cup"],
  "Copa Africana de Naciones": ["Copa Africana de Naciones", "Africa Cup of Nations"],
  "Copa Árabe de la FIFA": ["Copa Árabe de la FIFA", "FIFA Arab Cup"],
  "Copa Intercontinental de la FIFA": ["Copa Intercontinental de la FIFA", "FIFA Intercontinental Cup"],
  "Golden Boy": ["Golden Boy (award)", "Golden Boy (premio)"],
  "Trofeo Kopa": ["Trofeo Kopa", "Kopa Trophy"]
};

async function verificar(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    const ct = r.headers.get("content-type") || "";
    return `${r.status} ${ct}`;
  } catch (e) {
    return `ERR ${e.message}`;
  }
}

async function buscar(articulos) {
  for (const a of articulos) {
    for (const lang of ["es", "en"]) {
      try {
        const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(a)}`, { headers: { "User-Agent": UA } });
        if (!r.ok) continue;
        const d = await r.json();
        const img = (d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source);
        if (!img) continue;
        const estado = await verificar(img);
        if (estado.includes("image/")) {
          // Si es SVG o thumb, forzar PNG de 512px cuando sea posible
          let finaL = img;
          const m = img.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)thumb\/(.+)\/([^\/]+\.svg)\.png\/.*$/);
          console.log(`OK [${a}] ${estado.split(" ")[1]} ${img}`);
          return img;
        }
        console.log(`-- [${a}] ${estado} ${img}`);
      } catch (e) { /* seguir */ }
    }
  }
  return null;
}

(async () => {
  for (const [titulo, articulos] of Object.entries(candidatos)) {
    const url = await buscar(articulos);
    if (!url) console.log(`SIN RESULTADO: ${titulo}`);
  }
})();
