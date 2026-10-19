/* Packshot: ilustración de producto para cuando todavía no hay foto.
   Elige el envase por el nombre (tubo, gotero, dosificador, pote, perfume, aerosol, caja, paquete, botella),
   lo pinta con los colores de la marca e imprime marca, nombre y tamaño en la etiqueta. */
(function () {
  var BRAND = {
    "la roche-posay": ["#FFFFFF", "#1E5BB0"], "cerave": ["#FFFFFF", "#1663B0"], "vichy": ["#FFFFFF", "#1C5E44"],
    "isdin": ["#FFFFFF", "#D4006F"], "eucerin": ["#FFFFFF", "#C8102E"], "bioderma": ["#FFFFFF", "#E2007A"],
    "avene": ["#FFFFFF", "#E2231A"], "avène": ["#FFFFFF", "#E2231A"], "dermaglos": ["#FFFFFF", "#138A8A"], "dermaglós": ["#FFFFFF", "#138A8A"],
    "benetton": ["#2E9E4F", "#FFFFFF"], "reminiscencia": ["#EADFCC", "#7A4E26"], "nivea": ["#0B2D7D", "#FFFFFF"],
    "dove": ["#FFFFFF", "#0B2D63"], "rexona": ["#1A1A1A", "#E4202A"], "star nutrition": ["#161616", "#E4202A"],
    "ena": ["#161616", "#F2C200"], "gentech": ["#161616", "#25A9E0"], "pampers": ["#2BB3B1", "#FFFFFF"],
    "huggies": ["#E3262B", "#FFFFFF"], "hipoglós": ["#FFFFFF", "#E7342B"], "hipoglos": ["#FFFFFF", "#E7342B"],
    "johnson's": ["#FFF2CF", "#E0578A"], "johnsons": ["#FFF2CF", "#E0578A"], "curitas": ["#E3262B", "#FFFFFF"],
    "omron": ["#FFFFFF", "#0A5BAA"], "bagovit": ["#FFFFFF", "#0E7C3A"], "purafarma": ["#F5F1EB", "#CC2A69"], "purafarma sport": ["#0B0B0B", "#FF5000"]
  };
  var FALL = [["#CC2A69", "#FFFFFF"], ["#1E1C1A", "#F5F1EB"], ["#2F5D8A", "#FFFFFF"], ["#0E6B5C", "#FFFFFF"],
              ["#FFFFFF", "#CC2A69"], ["#E9DCCB", "#2A2522"], ["#FFFFFF", "#2F5D8A"], ["#F7D3E0", "#8E1D4B"]];
  function norm(s) { return String(s || "").toLowerCase().trim(); }
  function hash(s) { var h = 0; s = String(s || ""); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function colors(p) {
    var b = norm(p.marca); if (BRAND[b]) return BRAND[b];
    return FALL[hash(b || p.nombre) % FALL.length];
  }
  function lum(hex) { var n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function kind(p) {
    var n = norm(p.nombre) + " " + norm(p.descripcion).slice(0, 60), c = p.categoria || "";
    if (/pañal|panal/.test(n)) return "pack";
    if (/perfume|eau de|toilette|colonia|fragancia|body splash/.test(n) || c === "perfumeria") return "perfume";
    if (/desodorante|aerosol|spray|antitranspirante/.test(n)) return "can";
    if (/s[eé]rum|gotas|ampolla|concentrado/.test(n)) return "dropper";
    if (/whey|prote[ií]na|creatina|amino|bcaa|pre.?entreno|suplemento|col[aá]geno|polvo|\b\d+\s?(lb|kg)\b/.test(n) || c === "nutricion-deportiva") return "jar";
    if (/ap[oó]sito|curita|venda|gasa|caja|comprimido|c[aá]psula|tableta|term[oó]metro|tensi[oó]metro|test/.test(n)) return "box";
    if (/shampoo|champ[uú]|acondicionador|jab[oó]n l[ií]quido|ba[nñ]o|loci[oó]n/.test(n)) return "bottle";
    if (/limpiador|micelar|t[oó]nico|corporal|\b(2\d\d|3\d\d|4\d\d|5\d\d)\s?(ml|g)\b/.test(n)) return "pump";
    if (/crema|gel|protector|fluido|pomada|b[aá]lsamo|emulsi[oó]n|tubo|cola/.test(n)) return "tube";
    if (c === "maternidad-bebe") return "bottle";
    return "bottle";
  }
  function size(p) { var m = String(p.nombre || "").match(/(\d+(?:[.,]\d+)?)\s?(ml|g|gr|lb|kg|l|mg|un)\b|x\s?(\d+)/i); return m ? (m[3] ? "x " + m[3] : (m[1] + " " + m[2]).toLowerCase()) : ""; }
  function shortName(p, brand) {
    var n = String(p.nombre || "").replace(/\d+(?:[.,]\d+)?\s?(ml|g|gr|lb|kg|l|mg|un)\b/ig, "").replace(/\bx\s?\d+\b/ig, "");
    if (brand) n = n.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
    var w = n.trim().split(/\s+/).filter(Boolean);
    var l1 = [], l2 = [];
    w.forEach(function (x) { if ((l1.join(" ") + " " + x).trim().length <= 14 && !l2.length) l1.push(x); else if ((l2.join(" ") + " " + x).trim().length <= 14) l2.push(x); });
    var tidy = function (a) { while (a.length > 1 && /^(y|de|del|la|el|los|las|para|con|anti|sin|en|a)$/i.test(a[a.length - 1])) a.pop(); return a.join(" "); };
    return [tidy(l1), tidy(l2)].filter(Boolean);
  }
  function fit(text, maxW, base) { var w = String(text).length * 0.62; return Math.max(5.5, Math.min(base, maxW / Math.max(1, w))); }

  /* Etiqueta: marca, nombre (2 líneas) y tamaño, centrados en (cx, y) dentro de un ancho w */
  function label(p, cx, y, w, ink, accent) {
    var brand = (p.marca || "").toUpperCase(), lines = shortName(p, p.marca), sz = size(p), out = "";
    var bf = fit(brand, w, 11);
    out += '<text x="' + cx + '" y="' + y + '" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="700" letter-spacing=".06em" font-size="' + bf.toFixed(1) + '" fill="' + accent + '">' + esc(brand) + "</text>";
    var yy = y + bf + 5;
    out += '<rect x="' + (cx - 12) + '" y="' + (yy - 4) + '" width="24" height="2" rx="1" fill="' + accent + '" opacity=".7"/>';
    yy += 10;
    lines.forEach(function (l) {
      var f = fit(l, w, 10.5);
      out += '<text x="' + cx + '" y="' + yy + '" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="500" font-size="' + f.toFixed(1) + '" fill="' + ink + '">' + esc(l) + "</text>";
      yy += f + 3;
    });
    if (sz) out += '<text x="' + cx + '" y="' + (yy + 4) + '" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="600" font-size="8" fill="' + ink + '" opacity=".7">' + esc(sz) + "</text>";
    return out;
  }

  var DEFS = '<defs>' +
    '<linearGradient id="psh-cyl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".16" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity=".08"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".24"/></linearGradient>' +
    '<linearGradient id="psh-cap" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".22" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
    '<linearGradient id="psh-glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".12" stop-color="#fff" stop-opacity=".7"/><stop offset=".2" stop-color="#fff" stop-opacity=".1"/><stop offset=".85" stop-color="#fff" stop-opacity="0"/><stop offset=".93" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="psh-floor"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '</defs>';

  function svg(p, opts) {
    p = p || {}; opts = opts || {};
    var c = colors(p), body = c[0], acc = c[1], k = opts.kind || kind(p);
    var light = lum(body) > 0.6, edge = light ? "rgba(0,0,0,.14)" : "rgba(0,0,0,.25)";
    var ink = light ? "#1C1A18" : "#FFFFFF", capC = light ? acc : (lum(acc) > 0.6 ? "#E9E6E1" : acc);
    var s = '<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(p.nombre || "Producto") + '">' + DEFS;
    s += '<ellipse cx="100" cy="250" rx="78" ry="9" fill="url(#psh-floor)"/>';
    if (k === "tube") {
      s += '<rect x="66" y="196" width="68" height="50" rx="7" fill="' + capC + '"/><rect x="66" y="196" width="68" height="50" rx="7" fill="url(#psh-cap)"/>';
      s += '<path d="M38 26h124l-14 172H52z" fill="' + body + '" stroke="' + edge + '"/><path d="M38 26h124l-14 172H52z" fill="url(#psh-cyl)"/>';
      s += '<rect x="36" y="16" width="128" height="14" rx="2" fill="' + body + '" stroke="' + edge + '"/><g stroke="' + edge + '">' + [44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140, 148, 156].map(function (x) { return '<line x1="' + x + '" y1="18" x2="' + x + '" y2="28"/>'; }).join("") + "</g>";
      s += '<rect x="46" y="64" width="108" height="5" fill="' + acc + '" opacity=".9"/>';
      s += label(p, 100, 92, 92, ink, acc);
    } else if (k === "dropper") {
      s += '<rect x="83" y="20" width="34" height="54" rx="17" fill="#1E1C1A"/><rect x="83" y="20" width="34" height="54" rx="17" fill="url(#psh-cap)"/>';
      s += '<rect x="74" y="70" width="52" height="22" rx="3" fill="' + capC + '"/><rect x="74" y="70" width="52" height="22" rx="3" fill="url(#psh-cap)"/>';
      s += '<path d="M84 92h32v10c18 4 30 14 30 30v100c0 9-7 16-16 16H70c-9 0-16-7-16-16V132c0-16 12-26 30-30z" fill="' + (light ? "#C9A27A" : body) + '" opacity=".95"/>';
      s += '<path d="M84 92h32v10c18 4 30 14 30 30v100c0 9-7 16-16 16H70c-9 0-16-7-16-16V132c0-16 12-26 30-30z" fill="url(#psh-glass)"/>';
      s += '<rect x="62" y="146" width="76" height="80" rx="4" fill="' + (light ? "#FFFFFF" : "#F7F4EF") + '"/>';
      s += label(p, 100, 164, 66, "#1C1A18", light ? acc : body);
    } else if (k === "pump") {
      s += '<path d="M80 30h46v12h18v8h-18v4H80z" fill="' + capC + '"/><rect x="94" y="52" width="12" height="22" fill="' + capC + '"/>';
      s += '<rect x="76" y="70" width="48" height="18" rx="4" fill="' + capC + '"/><rect x="76" y="70" width="48" height="18" rx="4" fill="url(#psh-cap)"/>';
      s += '<path d="M84 86h32v8c22 3 36 12 36 30v112c0 7-5 12-12 12H60c-7 0-12-5-12-12V124c0-18 14-27 36-30z" fill="' + body + '" stroke="' + edge + '"/>';
      s += '<path d="M84 86h32v8c22 3 36 12 36 30v112c0 7-5 12-12 12H60c-7 0-12-5-12-12V124c0-18 14-27 36-30z" fill="url(#psh-cyl)"/>';
      s += '<rect x="48" y="128" width="104" height="6" fill="' + acc + '" opacity=".9"/>';
      s += label(p, 100, 158, 92, ink, acc);
    } else if (k === "jar") {
      s += '<rect x="30" y="96" width="140" height="152" rx="16" fill="' + body + '" stroke="' + edge + '"/><rect x="30" y="96" width="140" height="152" rx="16" fill="url(#psh-cyl)"/>';
      s += '<rect x="24" y="56" width="152" height="44" rx="9" fill="' + capC + '"/><rect x="24" y="56" width="152" height="44" rx="9" fill="url(#psh-cap)"/>';
      s += '<g stroke="#000" stroke-opacity=".18">' + [36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168].map(function (x) { return '<line x1="' + x + '" y1="62" x2="' + x + '" y2="94"/>'; }).join("") + "</g>";
      s += '<rect x="30" y="122" width="140" height="100" fill="' + acc + '"/><rect x="30" y="122" width="140" height="100" fill="url(#psh-cyl)" opacity=".7"/>';
      var jarInk = lum(acc) > 0.6 ? "#1C1A18" : "#FFFFFF";
      s += label(p, 100, 144, 120, jarInk, lum(acc) > 0.6 ? "#1C1A18" : (light ? "#1C1A18" : body === "#161616" ? "#FFFFFF" : body));
    } else if (k === "perfume") {
      var glass = light ? "#E9DCC6" : body;
      s += '<rect x="70" y="18" width="60" height="50" rx="6" fill="' + (light ? "#B8925A" : acc) + '"/><rect x="70" y="18" width="60" height="50" rx="6" fill="url(#psh-cap)"/>';
      s += '<rect x="88" y="66" width="24" height="16" fill="#C9A45C"/><rect x="88" y="66" width="24" height="16" fill="url(#psh-cap)"/>';
      s += '<rect x="30" y="80" width="140" height="166" rx="30" fill="' + glass + '" opacity=".92"/>';
      s += '<rect x="40" y="128" width="120" height="108" rx="22" fill="' + glass + '" opacity=".9"/>';
      s += '<rect x="30" y="80" width="140" height="166" rx="30" fill="url(#psh-glass)"/>';
      s += '<rect x="58" y="140" width="84" height="58" rx="3" fill="#FFFFFF" opacity=".92"/>';
      s += label(p, 100, 156, 76, "#1C1A18", light ? "#7A5A2E" : body);
    } else if (k === "can") {
      s += '<path d="M64 74c0-26 16-46 36-46s36 20 36 46z" fill="' + capC + '"/><path d="M64 74c0-26 16-46 36-46s36 20 36 46z" fill="url(#psh-cap)"/>';
      s += '<rect x="58" y="72" width="84" height="12" rx="4" fill="#C9C6C1"/>';
      s += '<rect x="56" y="82" width="88" height="164" rx="12" fill="' + body + '" stroke="' + edge + '"/><rect x="56" y="82" width="88" height="164" rx="12" fill="url(#psh-cyl)"/>';
      s += '<rect x="56" y="118" width="88" height="6" fill="' + acc + '"/>';
      s += label(p, 100, 146, 76, ink, acc);
    } else if (k === "box") {
      s += '<path d="M40 66l18-16h118l-18 16z" fill="' + body + '" stroke="' + edge + '"/><path d="M40 66l18-16h118l-18 16z" fill="#fff" opacity=".25"/>';
      s += '<path d="M158 66l18-16v176l-18 20z" fill="' + body + '" stroke="' + edge + '"/><path d="M158 66l18-16v176l-18 20z" fill="#000" opacity=".18"/>';
      s += '<rect x="40" y="66" width="118" height="180" fill="' + body + '" stroke="' + edge + '"/>';
      s += '<rect x="40" y="66" width="118" height="30" fill="' + acc + '"/>';
      s += label(p, 99, 122, 100, ink, acc);
    } else if (k === "pack") {
      s += '<path d="M34 64c0-14 10-22 24-22h84c14 0 24 8 24 22v164c0 12-8 20-20 20H54c-12 0-20-8-20-20z" fill="' + body + '" stroke="' + edge + '"/>';
      s += '<path d="M34 64c0-14 10-22 24-22h84c14 0 24 8 24 22v164c0 12-8 20-20 20H54c-12 0-20-8-20-20z" fill="url(#psh-cyl)"/>';
      s += '<rect x="80" y="50" width="40" height="10" rx="5" fill="#000" opacity=".22"/>';
      s += '<circle cx="100" cy="176" r="40" fill="#FFFFFF" opacity=".95"/><path d="M76 176c6 14 42 14 48 0" stroke="' + acc + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += label(p, 100, 90, 116, ink, lum(acc) > 0.6 ? ink : acc);
    } else {
      s += '<rect x="72" y="30" width="56" height="40" rx="8" fill="' + capC + '"/><rect x="72" y="30" width="56" height="40" rx="8" fill="url(#psh-cap)"/>';
      s += '<path d="M78 68h44c22 6 34 22 34 44v120c0 9-7 16-16 16H60c-9 0-16-7-16-16V112c0-22 12-38 34-44z" fill="' + body + '" stroke="' + edge + '"/>';
      s += '<path d="M78 68h44c22 6 34 22 34 44v120c0 9-7 16-16 16H60c-9 0-16-7-16-16V112c0-22 12-38 34-44z" fill="url(#psh-cyl)"/>';
      s += '<rect x="44" y="128" width="112" height="6" fill="' + acc + '" opacity=".9"/>';
      s += label(p, 100, 156, 96, ink, acc);
    }
    return s + "</svg>";
  }
  window.Packshot = { svg: svg, kind: kind };
})();
