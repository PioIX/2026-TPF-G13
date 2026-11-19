const UA = "TrayectoApp/1.0 (proyecto escolar)";
const busquedas = {
  "Copa MX": "Copa MX logo",
  "Copa del Rey Saudí": "King Cup Saudi logo",
  "Copa Africana de Naciones": "Africa Cup of Nations logo",
  "Copa Árabe de la FIFA": "FIFA Arab Cup logo",
  "Golden Boy": "Golden Boy award logo",
  "Trofeo Kopa": "Kopa Trophy logo",
  "Copa Intercontinental": "FIFA Intercontinental Cup logo"
};

(async () => {
  for (const [t, q] of Object.entries(busquedas)) {
    try {
      const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
        encodeURIComponent("filetype:bitmap " + q) + "&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&format=json";
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      const d = await r.json();
      const paginas = d.query && d.query.pages ? Object.values(d.query.pages) : [];
      console.log(`\n== ${t} ==`);
      for (const p of paginas) {
        const ii = p.imageinfo && p.imageinfo[0];
        if (ii) console.log(`  ${ii.mime} ${ii.url}`);
      }
    } catch (e) { console.log(`${t} ERR ${e.message}`); }
  }
})();
