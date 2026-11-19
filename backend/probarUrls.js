const UA = "Mozilla/5.0 (compatible; TrayectoApp/1.0)";
const candidatos = {
  "Copa MX": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Copa_MX_logo.svg/512px-Copa_MX_logo.svg.png",
    "https://images.seeklogo.com/logo-png/29/1/copa-mx-logo-png_seeklogo-296660.png",
    "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/2098.png&transparent=true",
    "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/234.png&transparent=true"
  ],
  "Copa del Rey Saudí": [
    "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/234.png&transparent=true",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/King_Cup_logo.svg/512px-King_Cup_logo.svg.png",
    "https://logos-world.net/wp-content/uploads/2023/09/Saudi-Pro-League-Logo.png"
  ],
  "Golden Boy": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Golden_Boy_award.svg/512px-Golden_Boy_award.svg.png",
    "https://a.espncdn.com/combiner/i?img=/i/espn/misc_logos/500/soccer.png&transparent=true",
    "https://cdn.sofifa.net/flags/10.png"
  ],
  "Trofeo Kopa": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Kopa_Trophy.svg/512px-Kopa_Trophy.svg.png",
    "https://cdn.sofifa.net/flags/2.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Ballon_d%27Or_2019.svg/512px-Ballon_d%27Or_2019.svg.png"
  ]
};

(async () => {
  for (const [t, urls] of Object.entries(candidatos)) {
    console.log(`\n== ${t} ==`);
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: "HEAD", headers: { "User-Agent": UA } });
        const ct = r.headers.get("content-type") || "";
        console.log(`  ${r.status} ${ct} ${u.slice(0, 90)}`);
        if (r.ok && ct.startsWith("image/")) break;
      } catch (e) { console.log(`  ERR ${u.slice(0, 60)} ${e.message}`); }
    }
  }
})();
