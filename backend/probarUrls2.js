// Busca logos de ligas/torneos en football-logos.cc (fuente del proyecto ya usada).
const UA = "Mozilla/5.0 (compatible; TrayectoApp/1.0)";
const candidatos = {
  "Copa MX": [
    "https://assets.football-logos.cc/logos/mexico/256x256/copa-mx.png",
    "https://logodetimes.com/wp-content/uploads/2019/03/copa-mx.png",
    "https://seeklogo.com/images/C/copa-mx-logo-F7FEEC9644-seeklogo.com.png"
  ],
  "Copa del Rey Saudí": [
    "https://assets.football-logos.cc/logos/saudi-arabia/256x256/king-cup.png",
    "https://logos-world.net/wp-content/uploads/2020/06/Saudi-Arabia-Logo.png"
  ],
  "Golden Boy": [
    "https://assets.football-logos.cc/logos/awards/256x256/golden-boy.png",
    "https://static.wikia.nocookie.net/football/images/7/7e/Golden_Boy.png/revision/latest?cb=20210101000000"
  ],
  "Trofeo Kopa": [
    "https://assets.football-logos.cc/logos/awards/256x256/kopa-trophy.png",
    "https://static.wikia.nocookie.net/football/images/a/a8/Kopa_Trophy.png/revision/latest?cb=20210101000000"
  ]
};

(async () => {
  for (const [t, urls] of Object.entries(candidatos)) {
    console.log(`\n== ${t} ==`);
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: "HEAD", headers: { "User-Agent": UA } });
        const ct = r.headers.get("content-type") || "";
        console.log(`  ${r.status} ${ct} ${u.slice(0, 95)}`);
        if (r.ok && ct.startsWith("image/")) break;
      } catch (e) { console.log(`  ERR ${u.slice(0, 60)} ${e.message}`); }
    }
  }
})();
