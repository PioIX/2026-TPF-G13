const UA = "TrayectoApp/1.0 (proyecto escolar)";

const candidatos = {
  "Copa MX": ["Copa MX", "Copa Corona MX"],
  "Copa del Rey Saudí": ["King Cup", "Copa del Rey de Campeones", "King's Cup (Saudi Arabia)"],
  "Copa Africana de Naciones": ["2023 Africa Cup of Nations", "Africa Cup of Nations", "Copa Africana de Naciones 2021"],
  "Copa Árabe de la FIFA": ["2021 FIFA Arab Cup", "FIFA Arab Cup", "Copa árabe de la FIFA 2021"],
  "Copa Intercontinental de la FIFA": ["2024 FIFA Intercontinental Cup", "FIFA Intercontinental Cup", "Copa Intercontinental"],
  "Golden Boy": ["Golden Boy (award)", "Golden Boy", "Premio Golden Boy"],
  "Trofeo Kopa": ["Kopa Trophy", "Trofeo Kopa", "Trophée Kopa"]
};

async function verificar(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    return `${r.status} ${r.headers.get("content-type") || ""}`;
  } catch (e) { return `ERR ${e.message}`; }
}

async function buscarImagenArticulo(a) {
  for (const lang of ["es", "en"]) {
    try {
      const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(a)}`, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const d = await r.json();
      const img = (d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source);
      if (img) return { img, lang };
    } catch { }
  }
  return null;
}

(async () => {
  for (const [titulo, articulos] of Object.entries(candidatos)) {
    let encontrado = null;
    for (const a of articulos) {
      const res = await buscarImagenArticulo(a);
      if (!res) continue;
      const estado = await verificar(res.img);
      if (estado.includes("image/")) { encontrado = res.img; console.log(`OK [${titulo}] ${estado.split(" ")[1]} ${res.img}`); break; }
      console.log(`-- [${titulo}] ${estado} ${res.img}`);
    }
    if (!encontrado) console.log(`SIN RESULTADO: ${titulo}`);
  }
})();
