// Busca archivos reales en Commons por título exacto de archivo.
const UA = "Mozilla/5.0 (compatible; TrayectoApp/1.0)";
const consultas = [
  "King Cup logo Saudi Arabia",
  "Copa MX logo Mexico",
  "Kopa Trophy",
  "Golden Boy award football",
  "Arab Cup logo",
  "Intercontinental Cup FIFA badge"
];

(async () => {
  for (const q of consultas) {
    console.log(`\n== ${q} ==`);
    const url = "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent("intitle:" + q) + "&srnamespace=6&srlimit=10&format=json";
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
      const d = await r.json();
      for (const s of (d.query && d.query.search) || []) console.log("  " + s.title);
    } catch (e) { console.log("  ERR " + e.message); }
    await new Promise((r) => setTimeout(r, 1500));
  }
})();
