const UA = "Mozilla/5.0 (compatible; TrayectoApp/1.0)";
const pruebas = {
  "Kopa/Trofeo (Wikipedia Commons thumb)": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Ballon_d%27Or_2022_-_Kopa_Trophy.svg/512px-Ballon_d%27Or_2022_-_Kopa_Trophy.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Ballon_d%27Or_2023.svg/512px-Ballon_d%27Or_2023.svg.png"
  ],
  "Golden Boy (tuttosport)": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Golden_Boy_2022.svg/512px-Golden_Boy_2022.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/f/f8/Golden_Boy_award.jpg"
  ],
  "King Cup (thumb variante)": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/King_Cup_%28Saudi_Arabia%29.svg/512px-King_Cup_%28Saudi_Arabia%29.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/King_Cup.svg/512px-King_Cup.svg.png"
  ]
};

(async () => {
  for (const [t, urls] of Object.entries(pruebas)) {
    console.log(`\n== ${t} ==`);
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: "HEAD", headers: { "User-Agent": UA } });
        const ct = r.headers.get("content-type") || "";
        console.log(`  ${r.status} ${ct} ${u.slice(0, 110)}`);
      } catch (e) { console.log(`  ERR ${e.message}`); }
    }
  }
})();
