const UA = "Mozilla/5.0 (compatible; TrayectoApp/1.0; proyecto educativo)";
const busquedas = {
  "Golden Boy": ["Golden Boy award football", "Tuttosport Golden Boy"],
  "Trofeo Kopa": ["Kopa Trophy 2022", "Ballon d'Or 2022 ceremony", "Trophee Kopa"],
  "Copa MX": ["Copa MX Apertura 2018 logo", "Copa MX Apertura 2014"],
  "Copa del Rey Saudí": ["King Cup football logo", "Crown Prince Cup Saudi Arabia"]
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  for (const [t, qs] of Object.entries(busquedas)) {
    console.log(`\n== ${t} ==`);
    for (const q of qs) {
      try {
        const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
          encodeURIComponent("filetype:bitmap " + q) + "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime&format=json";
        const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
        const texto = await r.text();
        let d;
        try { d = JSON.parse(texto); } catch { console.log(`  (no-json para "${q}")`); continue; }
        const paginas = d.query && d.query.pages ? Object.values(d.query.pages) : [];
        for (const p of paginas) {
          const ii = p.imageinfo && p.imageinfo[0];
          if (ii && ii.mime.startsWith("image/")) console.log(`  ${ii.mime} ${ii.url}  (${p.title})`);
        }
      } catch (e) { console.log(`  ERR ${e.message}`); }
      await sleep(2000);
    }
  }
})();
