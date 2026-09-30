/* Bölge Stratejisi — Simülasyon İzleyici: istemci betiği (harici bağımlılık yok). */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var VERI = JSON.parse(document.getElementById("veri-json").textContent);
  var RAPOR_EL = document.getElementById("rapor-json");
  var RAPOR = RAPOR_EL ? JSON.parse(RAPOR_EL.textContent) : null;
  var D = VERI.dizin;
  var K = VERI.kareler;
  var NB = D.bolgeler.length;
  var NM = D.mallar.length;
  var NK = D.kenarlar.length;
  var DEVLET_VAR = ["--d0", "--d1", "--d2", "--d3"];
  var NEDEN = ["yok", "kapasite", "girdi_eksik", "mesafe", "erisim_yok"];
  var DURUM_AD = { karsilanan: "Karşılanan", kismi: "Kısmi", acik: "Açık", engelli: "Engelli", ilgisiz: "Talep yok", sahipsiz: "Sahipsiz" };
  var MAL_RENK = {
    tahil: "#e0b000", gida: "#7cb518", cevher: "#b5542b", komur: "#7a5c48", celik: "#5b8db8", bakir: "#ee7d31",
    silis: "#b59f5f", parca: "#8b72c9", elektronik: "#19b3c9", petrol: "#4f5d9a", yakit: "#e5484d", muhimmat: "#c2388f"
  };
  var SIMGE = {
    liman: "M0 -6 V5 M-4 -2.5 H4 M-6 1 A6 6 0 0 0 6 1 M-1.7 -6 A1.7 1.7 0 1 0 1.7 -6 A1.7 1.7 0 1 0 -1.7 -6",
    dag: "M-7 5 L-1.5 -5 L1.5 0 L3.5 -3 L7.5 5 Z",
    dar_gecit: "M-7 -5 L-2 0 L-7 5 M7 -5 L2 0 L7 5",
    kapasite: "M-5 -5 H5 L0 0 L5 5 H-5 L0 0 Z",
    girdi_eksik: "M-5 -5 H5 V5 H-5 Z",
    mesafe: "M-7 0 H7 M-7 0 L-4 -3 M-7 0 L-4 3 M7 0 L4 -3 M7 0 L4 3",
    erisim_yok: "M-5 -5 L5 5 M5 -5 L-5 5"
  };
  var ETIKET_AD = { liman: "Liman", dag: "Dağ", dar_gecit: "Dar geçit", kiyi: "Kıyı", ova: "Ova" };
  var NEDEN_AD = {
    kapasite: "yol var ama kenar dolu (kapasite)",
    girdi_eksik: "girdi yok, hiçbir yerde fazla üretim yok",
    mesafe: "en yakın kaynak çok uzak",
    erisim_yok: "yol yok, kaynağa erişilemiyor"
  };
  var NEDEN_KISA = { kapasite: "kapasite dolu", girdi_eksik: "girdi yok", mesafe: "kaynak uzak", erisim_yok: "yol yok" };
  var KATEGORI_SEKIL = { ham: "daire", ara: "eşkenar dörtgen", tuketim: "kare", askeri: "üçgen" };
  var SEKIL_YOL = {
    ham: "M-2.8 0 A2.8 2.8 0 1 0 2.8 0 A2.8 2.8 0 1 0 -2.8 0 Z",
    ara: "M0 -3.6 L3.6 0 L0 3.6 L-3.6 0 Z",
    tuketim: "M-2.6 -2.6 H2.6 V2.6 H-2.6 Z",
    askeri: "M0 -3.6 L3.4 2.8 H-3.4 Z"
  };

  var durum = { kare: 0, mal: -1, secim: null, oynat: false, hiz: 1, akis: true, etiket: true };
  var onbellek = [];
  var renk = { u: [], devlet: [], sahipsiz: "", durum: {}, bg: "", ink: "" };
  var geo = { x: [], y: [], r: [], minX: 0, minY: 0, gen: 0, yuk: 0, maxKap: 1 };
  var dom = { dugum: [], dolgu: [], desen: [], merkez: [], sahipHalka: [], kenar: [], kenarUst: [], kenarHedef: [], etiket: [] };
  var noktalar = []; // { el, akis, i }
  var akisListesi = [];
  var animSon = 0;
  var animT = 0;
  var oynatZ = null;

  function $(id) { return document.getElementById(id); }
  function svg(tag, attrs, ust) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (ust) ust.appendChild(e);
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fmt(n, o) { return Number(n).toLocaleString("tr-TR", o || { maximumFractionDigits: 0 }); }
  function fmt1(n) { return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 1 }); }
  function kisalt(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return fmt1(n / 1e6) + " Mn";
    if (a >= 1e4) return fmt1(n / 1e3) + " B";
    return fmt(n);
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function malAd(m) { return D.mallar[m].ad; }
  function devletAd(i) { return D.devletler[i] ? D.devletler[i].ad : "?"; }
  function oyuncuAd(i) { return i < 0 ? "Sahipsiz" : devletAd(D.oyuncular[i].devlet); }
  function ikon(yol, boy, dolgu, sw) {
    return '<svg width="' + boy + '" height="' + boy + '" viewBox="-9 -9 18 18" aria-hidden="true"><path d="' + yol + '" fill="' + (dolgu ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function sekilIkon(mal, boy) {
    var m = D.mallar[mal];
    return '<svg width="' + boy + '" height="' + boy + '" viewBox="-5 -5 10 10" aria-hidden="true"><path d="' + SEKIL_YOL[m.kategori] + '" fill="' + MAL_RENK[m.id] + '" stroke="var(--ink2)" stroke-width="0.6"/></svg>';
  }
  function gunSaat(saat) {
    return "Geçen: " + Math.floor(saat / 24) + " gün " + (saat % 24) + " sa";
  }

  /* ---------- renk ---------- */
  function hexRgb(h) {
    h = (h || "").trim();
    if (h.charAt(0) === "#") {
      if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
    }
    var m = /rgba?\(([^)]+)\)/.exec(h);
    if (m) { var p = m[1].split(","); return [+p[0], +p[1], +p[2]]; }
    return [128, 128, 128];
  }
  function okuRenk() {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    renk.u = ["--u0", "--u1", "--u2", "--u3", "--u4"].map(function (n) { return hexRgb(v(n)); });
    renk.devlet = DEVLET_VAR.map(v);
    renk.sahipsiz = v("--sahipsiz");
    renk.durum = {
      karsilanan: v("--k-karsilanan"), kismi: v("--k-kismi"), acik: v("--k-acik"), engelli: v("--k-engelli"),
      ilgisiz: v("--k-ilgisiz"), sahipsiz: v("--sahipsiz")
    };
    renk.bg = v("--harita-zemin");
    renk.ink = v("--ink");
  }
  function kullanimRengi(u) {
    var t = clamp(u, 0, 1) * 4;
    var i = Math.min(3, Math.floor(t));
    var f = t - i;
    var a = renk.u[i], b = renk.u[i + 1];
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," + Math.round(a[1] + (b[1] - a[1]) * f) + "," + Math.round(a[2] + (b[2] - a[2]) * f) + ")";
  }
  function devletRengi(d) { return renk.devlet[d % 4]; }
  function oyuncuRengi(o) { return o < 0 ? renk.sahipsiz : devletRengi(D.oyuncular[o].devlet); }

  /* ---------- kare türetme ---------- */
  function turet(ki) {
    if (onbellek[ki]) return onbellek[ki];
    var k = K[ki];
    var kap = {};
    for (var i = 0; i < k.kapsam.length; i++) { var c = k.kapsam[i]; kap[c[0] * NM + c[1]] = c; }
    var dokunan = new Array(NM);
    for (var m = 0; m < NM; m++) dokunan[m] = {};
    var gelen = [], giden = [];
    for (var b = 0; b < NB; b++) { gelen.push([]); giden.push([]); }
    for (var j = 0; j < k.akislar.length; j++) {
      var a = k.akislar[j];
      dokunan[a[0]][a[2]] = 1; dokunan[a[0]][a[3]] = 1;
      giden[a[2]].push(a); gelen[a[3]].push(a);
    }
    var sahipSayisi = [];
    for (var o = 0; o < D.oyuncular.length; o++) sahipSayisi.push(0);
    for (var b2 = 0; b2 < NB; b2++) if (k.bolgeler[b2].sahip >= 0) sahipSayisi[k.bolgeler[b2].sahip]++;
    var t = { kap: kap, dokunan: dokunan, gelen: gelen, giden: giden, sahipSayisi: sahipSayisi };
    onbellek[ki] = t;
    return t;
  }
  /** Bölge × mal kapsam durumu: { d, pct, neden, sure }. */
  function hucre(ki, b, m) {
    var k = K[ki], t = turet(ki), bk = k.bolgeler[b];
    if (bk.sahip < 0) return { d: "sahipsiz", pct: 0, neden: "yok", sure: -1 };
    var c = t.kap[b * NM + m];
    if (!c) {
      var ilgili = bk.stok[m] > 0 || bk.uretim[m] > 0 || t.dokunan[m][b] === 1;
      return { d: ilgili ? "karsilanan" : "ilgisiz", pct: 100, neden: "yok", sure: -1 };
    }
    var neden = NEDEN[c[3]];
    var d;
    if (c[2] >= 95) d = "karsilanan";
    else if (neden === "kapasite" || neden === "erisim_yok") d = "engelli";
    else if (c[2] < 50) d = "acik";
    else d = "kismi";
    return { d: d, pct: c[2], neden: neden, sure: c[4] };
  }
  function nedenMetni(h, m) {
    var s = malAd(m) + ": %" + (100 - h.pct) + " eksik — ";
    if (h.neden === "mesafe") return s + "en yakın kaynak çok uzak" + (h.sure >= 0 ? " (" + h.sure + " sa)" : "");
    return s + (NEDEN_AD[h.neden] || "neden bilinmiyor");
  }

  /* ---------- harita kurulumu ---------- */
  function haritaKur() {
    var maxN = 0, minN = 1e12, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, maxKap = 1;
    D.bolgeler.forEach(function (b) {
      maxN = Math.max(maxN, b.nufus0); minN = Math.min(minN, b.nufus0);
      minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x); minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y);
    });
    K.forEach(function (k) { k.kenarlar.forEach(function (e) { if (e[0] > maxKap) maxKap = e[0]; }); });
    geo.maxKap = maxKap;
    var pad = 48;
    geo.minX = minX - pad; geo.minY = minY - pad - 10;
    geo.gen = maxX - minX + 2 * pad; geo.yuk = maxY - minY + 2 * pad + 28;
    D.bolgeler.forEach(function (b, i) {
      geo.x[i] = b.x; geo.y[i] = b.y;
      geo.r[i] = 13 + 9 * Math.sqrt(clamp((b.nufus0 - minN) / Math.max(1, maxN - minN), 0, 1));
    });
    var s = $("harita");
    s.setAttribute("viewBox", geo.minX + " " + geo.minY + " " + geo.gen + " " + geo.yuk);
    s.innerHTML = "";
    var defs = svg("defs", null, s);
    var p1 = svg("pattern", { id: "desen-kismi", width: 6, height: 6, patternUnits: "userSpaceOnUse" }, defs);
    svg("circle", { cx: 3, cy: 3, r: 1.2, style: "fill:var(--desen)" }, p1);
    var p2 = svg("pattern", { id: "desen-acik", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, style: "stroke:var(--desen);stroke-width:2.4" }, p2);
    var p3 = svg("pattern", { id: "desen-engelli", width: 6, height: 6, patternUnits: "userSpaceOnUse" }, defs);
    svg("path", { d: "M0 0 L6 6 M6 0 L0 6", style: "stroke:var(--desen);stroke-width:1.6;fill:none" }, p3);
    var mk = svg("marker", { id: "ok-uc", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, defs);
    svg("path", { d: "M0 0 L10 5 L0 10 Z", style: "fill:var(--savas)" }, mk);

    var gKenar = svg("g", { id: "g-kenar" }, s);
    svg("g", { id: "g-savas" }, s);
    svg("g", { id: "g-akis", "pointer-events": "none" }, s);
    var gDugum = svg("g", { id: "g-dugum" }, s);

    D.kenarlar.forEach(function (e, i) {
      var g = svg("g", null, gKenar);
      var taban = svg("line", { x1: geo.x[e.a], y1: geo.y[e.a], x2: geo.x[e.b], y2: geo.y[e.b], "stroke-linecap": e.tur === "deniz" ? "round" : "butt" }, g);
      var ust = svg("line", { x1: geo.x[e.a], y1: geo.y[e.a], x2: geo.x[e.b], y2: geo.y[e.b], "stroke-linecap": "butt", opacity: 0 }, g);
      var hedef = svg("line", { x1: geo.x[e.a], y1: geo.y[e.a], x2: geo.x[e.b], y2: geo.y[e.b], "stroke-width": 14, class: "kenar-hedef" }, g);
      hedef.addEventListener("mouseenter", function (ev) { ipucuGoster(ev, kenarMetni(i)); });
      hedef.addEventListener("mousemove", ipucuTasi);
      hedef.addEventListener("mouseleave", ipucuGizle);
      hedef.addEventListener("click", function (ev) { ev.stopPropagation(); sec({ t: "kenar", i: i }); });
      dom.kenar[i] = taban; dom.kenarUst[i] = ust; dom.kenarHedef[i] = hedef;
    });

    D.bolgeler.forEach(function (b, i) {
      var r = geo.r[i];
      var g = svg("g", { class: "dugum", tabindex: 0, role: "button", transform: "translate(" + b.x + "," + b.y + ")", "aria-label": b.ad }, gDugum);
      svg("circle", { r: r + 6, class: "secim-halka" }, g);
      dom.sahipHalka[i] = svg("circle", { r: r + 1.5, fill: "none", "stroke-width": 3.2, opacity: 0 }, g);
      dom.dolgu[i] = svg("circle", { r: r, stroke: "var(--harita-zemin)", "stroke-width": 1.5 }, g);
      dom.desen[i] = svg("circle", { r: r, fill: "none", "pointer-events": "none" }, g);
      dom.merkez[i] = svg("g", { "pointer-events": "none" }, g);
      // etiket simgeleri (liman, dağ, dar geçit) düğümün üstünde
      var simgeler = b.etiketler.filter(function (t) { return SIMGE[t] && (t === "liman" || t === "dag" || t === "dar_gecit"); });
      simgeler.forEach(function (t, j) {
        var dx = (j - (simgeler.length - 1) / 2) * 15;
        var sg = svg("g", { transform: "translate(" + dx + "," + (-r - 9) + ")", "pointer-events": "none" }, g);
        svg("circle", { r: 7.5, style: "fill:var(--panel);stroke:var(--line)", "stroke-width": 0.8 }, sg);
        svg("path", { d: SIMGE[t], transform: "scale(0.85)", style: t === "dag" ? "fill:var(--ink2);stroke:var(--ink2)" : "fill:none;stroke:var(--ink)", "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, sg);
      });
      dom.etiket[i] = svg("text", { class: "bolge-adi", y: r + 14, "text-anchor": "middle" }, g);
      dom.etiket[i].textContent = b.ad;
      dom.dugum[i] = g;
      g.addEventListener("mouseenter", function (ev) { ipucuGoster(ev, bolgeIpucu(i)); });
      g.addEventListener("mousemove", ipucuTasi);
      g.addEventListener("mouseleave", ipucuGizle);
      g.addEventListener("click", function (ev) { ev.stopPropagation(); sec({ t: "bolge", i: i }); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); sec({ t: "bolge", i: i }); } });
    });
    s.addEventListener("click", function () { sec(null); });
  }

  /* ---------- ipucu ---------- */
  function ipucuGoster(ev, html) {
    var ip = $("ipucu");
    ip.innerHTML = html;
    ip.hidden = false;
    ipucuTasi(ev);
  }
  function ipucuTasi(ev) {
    var ip = $("ipucu");
    var kap = ip.parentNode.getBoundingClientRect();
    var x = ev.clientX - kap.left + 14, y = ev.clientY - kap.top + 14;
    if (x + ip.offsetWidth > kap.width - 4) x = ev.clientX - kap.left - ip.offsetWidth - 14;
    if (y + ip.offsetHeight > kap.height - 4) y = ev.clientY - kap.top - ip.offsetHeight - 14;
    ip.style.left = Math.max(4, x) + "px";
    ip.style.top = Math.max(4, y) + "px";
  }
  function ipucuGizle() { $("ipucu").hidden = true; }
  function bolgeIpucu(i) {
    var k = K[durum.kare], bk = k.bolgeler[i], b = D.bolgeler[i];
    var s = "<b>" + esc(b.ad) + "</b><br>" + esc(devletAd(b.devlet)) + (bk.sahip >= 0 && D.oyuncular[bk.sahip].devlet !== b.devlet ? " (elinde: " + esc(oyuncuAd(bk.sahip)) + ")" : "");
    s += "<br>Nüfus " + fmt(bk.nufus);
    if (durum.mal >= 0) {
      var h = hucre(durum.kare, i, durum.mal);
      s += "<br>" + esc(malAd(durum.mal)) + ": " + DURUM_AD[h.d] + (h.d !== "karsilanan" && h.d !== "ilgisiz" && h.d !== "sahipsiz" ? " (%" + h.pct + ")" : "");
    }
    return s;
  }
  function kenarMetni(i) {
    var e = D.kenarlar[i], c = K[durum.kare].kenarlar[i];
    var u = c[0] > 0 ? c[1] / c[0] : 0;
    return "<b>" + esc(D.bolgeler[e.a].ad) + " — " + esc(D.bolgeler[e.b].ad) + "</b><br>" + e.tur + " yolu, " + e.sure + " sa<br>Kapasite " + fmt1(c[0]) + "/sa · kullanım %" + Math.round(u * 100) + (c[2] > 0 ? " (askeri " + fmt1(c[2]) + ")" : "") + (u >= 0.9 ? "<br><b>Darboğaz: %90 üstü dolu</b>" : "");
  }

  /* ---------- çizim ---------- */
  function cizKenarlar() {
    var k = K[durum.kare];
    for (var i = 0; i < NK; i++) {
      var e = D.kenarlar[i], c = k.kenarlar[i];
      var u = c[0] > 0 ? c[1] / c[0] : 0;
      var w = 1.6 + 7.4 * Math.sqrt(c[0] / geo.maxKap);
      var taban = dom.kenar[i], ust = dom.kenarUst[i];
      var col = kullanimRengi(u);
      var doygun = u >= 0.9;
      var solukluk = durum.mal >= 0 ? 0.45 : 0.95;
      taban.setAttribute("stroke", col);
      taban.setAttribute("opacity", solukluk);
      if (e.tur === "hava") {
        w = Math.max(1.3, w * 0.5);
        taban.setAttribute("stroke-dasharray", "9 4");
      } else if (e.tur === "deniz") {
        taban.setAttribute("stroke-dasharray", "0.1 " + (w * 1.7 + 1.5));
      } else {
        taban.removeAttribute("stroke-dasharray");
      }
      if (doygun) w = Math.max(w, e.tur === "hava" ? 3 : 4);
      taban.setAttribute("stroke-width", w);
      if (doygun) {
        ust.setAttribute("stroke", renk.bg);
        ust.setAttribute("stroke-width", Math.max(1.1, w * 0.34));
        ust.setAttribute("stroke-dasharray", "4 4");
        ust.setAttribute("opacity", 0.95);
      } else {
        ust.setAttribute("opacity", 0);
      }
      var sec = durum.secim && durum.secim.t === "kenar" && durum.secim.i === i;
      if (sec) { taban.setAttribute("stroke-width", w + 3); }
    }
  }
  function cizDugumler() {
    var k = K[durum.kare];
    var malModu = durum.mal >= 0;
    for (var i = 0; i < NB; i++) {
      var bk = k.bolgeler[i], b = D.bolgeler[i];
      var dolgu = dom.dolgu[i], desen = dom.desen[i], mer = dom.merkez[i];
      mer.innerHTML = "";
      var dsen = "none";
      var fill;
      if (!malModu) {
        fill = bk.sahip < 0 ? renk.sahipsiz : devletRengi(b.devlet);
      } else {
        var h = hucre(durum.kare, i, durum.mal);
        fill = renk.durum[h.d];
        if (h.d === "kismi") dsen = "url(#desen-kismi)";
        else if (h.d === "acik") dsen = "url(#desen-acik)";
        else if (h.d === "engelli") dsen = "url(#desen-engelli)";
        if (h.d === "kismi" || h.d === "acik" || h.d === "engelli") {
          var yol = SIMGE[h.neden];
          if (yol) {
            svg("circle", { r: 7.4, style: "fill:var(--panel);stroke:var(--ink)", "stroke-width": 1 }, mer);
            svg("path", { d: yol, transform: "scale(0.78)", style: "fill:none;stroke:var(--ink)", "stroke-width": 1.9, "stroke-linecap": "round", "stroke-linejoin": "round" }, mer);
          }
        }
      }
      dolgu.setAttribute("fill", fill);
      dolgu.setAttribute("opacity", bk.sahip < 0 ? 0.8 : 1);
      desen.setAttribute("fill", dsen);
      // elden çıkmış bölge: el değiştirdiğinde sahip rengi halka
      var elDegisti = bk.sahip >= 0 && D.oyuncular[bk.sahip].devlet !== b.devlet;
      if (elDegisti) { dom.sahipHalka[i].setAttribute("stroke", oyuncuRengi(bk.sahip)); dom.sahipHalka[i].setAttribute("opacity", 1); }
      else dom.sahipHalka[i].setAttribute("opacity", 0);
      var secili = durum.secim && durum.secim.t === "bolge" && durum.secim.i === i;
      dom.dugum[i].setAttribute("class", "dugum" + (secili ? " secili" : ""));
      var goster = durum.etiket || secili;
      dom.etiket[i].style.display = goster ? "" : "none";
    }
  }
  function cizSavas() {
    var g = $("g-savas");
    g.innerHTML = "";
    var k = K[durum.kare];
    k.savaslar.forEach(function (s) {
      if (s.evre === "bitti") return;
      var x1 = geo.x[s.saldiranBolge], y1 = geo.y[s.saldiranBolge], x2 = geo.x[s.hedefBolge], y2 = geo.y[s.hedefBolge];
      var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var r1 = geo.r[s.saldiranBolge] + 4, r2 = geo.r[s.hedefBolge] + 8;
      svg("line", { x1: x1 + dx / L * r1, y1: y1 + dy / L * r1, x2: x2 - dx / L * r2, y2: y2 - dy / L * r2, class: "savas-ok", "marker-end": "url(#ok-uc)" }, g);
      svg("circle", { cx: x2, cy: y2, r: geo.r[s.hedefBolge] + 7, class: "savas-halka" }, g);
    });
  }

  /* ---------- akış animasyonu ---------- */
  function akisKur() {
    var k = K[durum.kare];
    var g = $("g-akis");
    g.innerHTML = "";
    noktalar = [];
    akisListesi = [];
    var maxO = 1;
    k.akislar.forEach(function (a) { if (a[1] > maxO) maxO = a[1]; });
    k.akislar.forEach(function (a, ai) {
      var mal = a[0];
      var pts = [[geo.x[a[2]], geo.y[a[2]]]];
      var cur = a[2];
      for (var j = 0; j < a[4].length; j++) {
        var e = D.kenarlar[a[4][j]];
        cur = e.a === cur ? e.b : e.a;
        pts.push([geo.x[cur], geo.y[cur]]);
      }
      var lane = ((mal % 4) - 1.5) * 1.9;
      var seg = [], cum = [0], L = 0;
      for (var q = 0; q < pts.length - 1; q++) {
        var dx = pts[q + 1][0] - pts[q][0], dy = pts[q + 1][1] - pts[q][1];
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len * lane, ny = dx / len * lane;
        seg.push({ x: pts[q][0] + nx, y: pts[q][1] + ny, dx: dx, dy: dy, len: len });
        L += len; cum.push(L);
      }
      if (L < 1) return;
      var n = clamp(Math.ceil(a[1] / 50), 1, 5);
      var soluk = durum.mal >= 0 && durum.mal !== mal;
      var f = { seg: seg, cum: cum, L: L, n: n, mal: mal };
      akisListesi.push(f);
      var kat = D.mallar[mal].kategori;
      for (var i = 0; i < n; i++) {
        var el = svg("path", { d: SEKIL_YOL[kat], fill: MAL_RENK[D.mallar[mal].id], stroke: renk.bg, "stroke-width": 0.9, opacity: soluk ? 0.14 : 1 }, g);
        if (durum.mal === mal) el.setAttribute("transform", "scale(1)");
        noktalar.push({ el: el, f: f, i: i, ofs: (i / n) * L + (ai * 37) % L });
      }
    });
    noktaKonumla(animT);
  }
  function noktaKonumla(t) {
    var v = 52; // birim/sn
    for (var i = 0; i < noktalar.length; i++) {
      var p = noktalar[i], f = p.f;
      var s = durum.akis ? (p.ofs + t * v) % f.L : p.ofs % f.L;
      var q = 0;
      while (q < f.seg.length - 1 && s > f.cum[q + 1]) q++;
      var sg = f.seg[q];
      var u = (s - f.cum[q]) / sg.len;
      var sc = durum.mal >= 0 && durum.mal === f.mal ? 1.35 : 1;
      p.el.setAttribute("transform", "translate(" + (sg.x + sg.dx * u).toFixed(1) + "," + (sg.y + sg.dy * u).toFixed(1) + ") scale(" + sc + ")");
    }
  }
  function animDongu(ts) {
    if (!animSon) animSon = ts;
    var dt = (ts - animSon) / 1000;
    animSon = ts;
    if (durum.akis && !document.hidden) { animT += Math.min(dt, 0.1); noktaKonumla(animT); }
    requestAnimationFrame(animDongu);
  }

  /* ---------- neden satırı ---------- */
  function cizNeden() {
    var el = $("neden");
    var ki = durum.kare, m = durum.mal, sc = durum.secim;
    var html = "", ic = "";
    if (sc && sc.t === "bolge") {
      var b = D.bolgeler[sc.i];
      if (m >= 0) {
        var h = hucre(ki, sc.i, m);
        if (h.d === "sahipsiz") { html = "<b>" + esc(b.ad) + "</b>: sahipsiz bölge; lojistiğe katılmaz."; }
        else if (h.d === "karsilanan") html = "<b>" + esc(malAd(m)) + "</b> — " + esc(b.ad) + ": talep karşılanıyor.";
        else if (h.d === "ilgisiz") html = "<b>" + esc(malAd(m)) + "</b> — " + esc(b.ad) + ": bu malın üretimi, stoku veya akışı yok (talep yok sayıldı).";
        else { html = "<b>" + esc(b.ad) + "</b> · " + esc(nedenMetni(h, m)); ic = NEDEN_AD[h.neden] ? ikon(SIMGE[h.neden], 22, h.neden === "girdi_eksik" ? false : false, 1.7) : ""; }
      } else {
        var acik = [];
        for (var mm = 0; mm < NM; mm++) { var hh = hucre(ki, sc.i, mm); if (hh.d !== "karsilanan" && hh.d !== "ilgisiz" && hh.d !== "sahipsiz") acik.push({ m: mm, h: hh }); }
        if (K[ki].bolgeler[sc.i].sahip < 0) html = "<b>" + esc(b.ad) + "</b>: sahipsiz bölge; lojistiğe katılmaz.";
        else if (!acik.length) html = "<b>" + esc(b.ad) + "</b>: tüm mallar karşılanıyor.";
        else html = "<b>" + esc(b.ad) + "</b> · " + acik.slice(0, 3).map(function (x) { return esc(nedenMetni(x.h, x.m)); }).join(" · ") + (acik.length > 3 ? " · +" + (acik.length - 3) + " mal daha" : "");
      }
    } else if (sc && sc.t === "kenar") {
      html = kenarMetni(sc.i).replace(/<br>/g, " · ");
    } else if (m >= 0) {
      var say = { karsilanan: 0, kismi: 0, acik: 0, engelli: 0 }, nd = {}, top = 0;
      for (var i = 0; i < NB; i++) {
        var h2 = hucre(ki, i, m);
        if (h2.d === "sahipsiz" || h2.d === "ilgisiz") continue;
        top++; say[h2.d]++;
        if (h2.d !== "karsilanan") nd[h2.neden] = (nd[h2.neden] || 0) + 1;
      }
      var kalan = say.kismi + say.acik + say.engelli;
      var nn = Object.keys(nd).sort(function (a, b2) { return nd[b2] - nd[a]; }).map(function (n) { return (NEDEN_KISA[n] || n) + " " + nd[n]; }).join(", ");
      html = "<b>" + esc(malAd(m)) + "</b>: " + top + " ilgili bölgenin " + (kalan === 0 ? "hepsi karşılanıyor." : kalan + "'i eksik (açık " + say.acik + ", kısmi " + say.kismi + ", engelli " + say.engelli + ") — başlıca neden: " + esc(nn) + ".") + " <span class='soluk'>Ayrıntı için bir bölgeye tıklayın.</span>";
    } else {
      var kapsam = K[ki].kapsam, nn2 = {};
      kapsam.forEach(function (c) { if (c[3] > 0) nn2[NEDEN[c[3]]] = (nn2[NEDEN[c[3]]] || 0) + 1; });
      var en = Object.keys(nn2).sort(function (a, b2) { return nn2[b2] - nn2[a]; }).map(function (n) { return (NEDEN_KISA[n] || n) + " " + nn2[n]; }).join(", ");
      html = "Şu an " + kapsam.length + " bölge×mal hücresi tam karşılanmıyor" + (en ? " (" + esc(en) + ")" : "") + ". <span class='soluk'>Bir mal seçerek “neresi açık” görünümüne geçin; bir bölgeye tıklayarak nedenini görün.</span>";
    }
    el.innerHTML = (ic ? ic : "") + "<div>" + html + "</div>";
  }

  /* ---------- bölge ayrıntısı ---------- */
  function cizAyrinti() {
    var el = $("bolge-ayrinti");
    var sc = durum.secim;
    if (!sc || sc.t !== "bolge") {
      el.innerHTML = "<p class='ipucu-metin'>Haritada bir bölgeye tıklayın: stoklar, tesisler, üretim ve karşılanma burada görünür.</p>";
      return;
    }
    var ki = durum.kare, i = sc.i, k = K[ki], bk = k.bolgeler[i], b = D.bolgeler[i], t = turet(ki);
    var s = "<div class='ayrinti-baslik'><b>" + esc(b.ad) + "</b><span class='soluk'>" + esc(devletAd(b.devlet)) + "</span></div>";
    s += "<div>" + b.etiketler.map(function (e) { return "<span class='etiket-cip'>" + esc(ETIKET_AD[e] || e) + "</span>"; }).join("") + "</div>";
    s += "<div class='satir'><span class='ad'>Sahip</span><span>" + esc(oyuncuAd(bk.sahip)) + (bk.sahip >= 0 ? " <span class='soluk'>(" + esc(D.oyuncular[bk.sahip].arketip) + ")</span>" : "") + "</span></div>";
    s += "<div class='satir'><span class='ad'>Nüfus</span><span class='sayi'>" + fmt(bk.nufus) + " <span class='soluk'>(başlangıç " + fmt(b.nufus0) + ")</span></span></div>";
    s += "<div class='satir'><span class='ad'>Gıda karşılanma</span><span class='sayi'>%" + bk.gida + " " + yuzdeCubuk(bk.gida) + "</span></div>";
    if (bk.ordu.length) {
      s += "<div class='satir'><span class='ad'>Ordu</span><span class='sayi'>" + bk.ordu.map(function (o) { return fmt(o[1]) + "× " + esc(D.birlikler[o[0]].ad); }).join(", ") + "</span></div>";
      s += "<div class='satir'><span class='ad'>İkmal karşılanma</span><span class='sayi'>%" + bk.ikmal + " " + yuzdeCubuk(bk.ikmal) + "</span></div>";
      s += "<div class='satir'><span class='ad'>Duruş</span><span>" + ["normal", "savunma", "geri çekil"][bk.durus] + "</span></div>";
    }
    s += "<h3>Mallar</h3><div class='tablo-kap'><table class='mini-tablo'><thead><tr><th>Mal</th><th class='sayi'>Stok</th><th class='sayi'>Üretim/sa</th><th>Karşılanma</th></tr></thead><tbody>";
    for (var m = 0; m < NM; m++) {
      var h = hucre(ki, i, m);
      var kars = h.d === "sahipsiz" || h.d === "ilgisiz" ? "<span class='soluk'>—</span>" : h.d === "karsilanan" ? "<span>✓ %100</span>" : "<span>" + DURUM_AD[h.d] + " %" + h.pct + " · " + esc(NEDEN_KISA[h.neden] || "") + "</span>";
      var sel = durum.mal === m ? " style='background:var(--panel2)'" : "";
      s += "<tr" + sel + "><td>" + sekilIkon(m, 11) + " " + esc(malAd(m)) + "</td><td class='sayi'>" + fmt(bk.stok[m]) + "</td><td class='sayi'>" + (bk.uretim[m] ? fmt1(bk.uretim[m]) : "<span class='soluk'>0</span>") + "</td><td>" + kars + "</td></tr>";
    }
    s += "</tbody></table></div>";
    if (bk.tesis.length) {
      s += "<h3>Tesisler (" + bk.tesis.length + ")</h3><div class='tablo-kap'><table class='mini-tablo'><thead><tr><th>Tesis</th><th>Yöntem</th><th class='sayi'>Verim</th><th class='sayi'>İşçi</th></tr></thead><tbody>";
      bk.tesis.forEach(function (x) {
        s += "<tr><td>" + esc(D.tesisTurleri[x[0]].ad) + "</td><td>" + esc(D.yontemler[x[1]].ad) + (x[2] ? "" : " <span class='soluk'>(pasif)</span>") + "</td><td class='sayi'>%" + x[3] + "</td><td class='sayi'>%" + x[4] + "</td></tr>";
      });
      s += "</tbody></table></div>";
    }
    var gel = t.gelen[i], gid = t.giden[i];
    if (gel.length || gid.length) {
      function topla(liste) { var o = {}; liste.forEach(function (a) { o[a[0]] = (o[a[0]] || 0) + a[1]; }); return Object.keys(o).map(function (m2) { return esc(malAd(+m2)) + " " + fmt1(o[m2]); }).join(", "); }
      s += "<h3>Akışlar (birim/sa)</h3>";
      if (gel.length) s += "<div class='satir'><span class='ad' style='flex:none'>Gelen</span><span style='text-align:right;flex:1'>" + topla(gel) + "</span></div>";
      if (gid.length) s += "<div class='satir'><span class='ad' style='flex:none'>Giden</span><span style='text-align:right;flex:1'>" + topla(gid) + "</span></div>";
    }
    el.innerHTML = s;
  }
  function yuzdeCubuk(p) { return "<span class='cubuk-iz'><span style='width:" + clamp(p, 0, 100) + "%'></span></span>"; }

  /* ---------- yan paneller ---------- */
  function cizOyuncular() {
    var k = K[durum.kare], t = turet(durum.kare), s = "";
    D.oyuncular.forEach(function (o, i) {
      var h = k.hazine[i], or = k.hazineOrani[i];
      var ordu = 0;
      k.bolgeler.forEach(function (b) { if (b.sahip === i) b.ordu.forEach(function (x) { ordu += x[1]; }); });
      var yer = K.map(function (kr) { return kr.hazine[i]; });
      var mx = Math.max.apply(null, yer.concat([1])), mn = Math.min.apply(null, yer.concat([0]));
      var pts = yer.map(function (v, j) { return (j / Math.max(1, yer.length - 1) * 100).toFixed(1) + "," + (22 - (v - mn) / Math.max(1, mx - mn) * 20).toFixed(1); }).join(" ");
      var cur = (durum.kare / Math.max(1, K.length - 1) * 100).toFixed(1);
      s += "<div class='oyuncu'><div class='oyuncu-ust'><span class='nokta' style='background:" + devletRengi(o.devlet) + "'></span><span class='ad'>" + esc(devletAd(o.devlet)) + "</span><span class='soluk'>" + esc(o.arketip) + "</span></div>" +
        "<div class='oyuncu-alt'><span>Hazine <b>" + kisalt(h) + "</b></span><span class='" + (or >= 0 ? "yukari" : "asagi") + "'>" + (or >= 0 ? "▲ +" : "▼ ") + fmt(or) + "/sa</span><span>Bölge <b>" + t.sahipSayisi[i] + "</b></span><span>Ordu <b>" + fmt(ordu) + "</b></span></div>" +
        "<svg viewBox='0 0 100 24' width='100%' height='26' preserveAspectRatio='none' aria-label='Hazine geçmişi' role='img' style='margin-top:4px'><polyline points='" + pts + "' fill='none' stroke='" + devletRengi(o.devlet) + "' stroke-width='1.6' vector-effect='non-scaling-stroke'/><line x1='" + cur + "' x2='" + cur + "' y1='0' y2='24' stroke='var(--ink2)' stroke-width='1' vector-effect='non-scaling-stroke' stroke-dasharray='2 2'/></svg></div>";
    });
    $("oyuncular").innerHTML = s;
  }
  function cizFiyat() {
    var k = K[durum.kare], s = "";
    var MN = 0.3, MX = 2.0;
    function poz(v) { return clamp((v - MN) / (MX - MN), 0, 1) * 100; }
    for (var m = 0; m < NM; m++) {
      var v = k.fiyat[m] / 1000;
      var a = poz(1), b = poz(v);
      var sol = Math.min(a, b), gen = Math.abs(b - a);
      var yuk = v >= 1;
      s += "<div class='fiyat-satir tikla' data-mal='" + m + "' tabindex='0' role='button' aria-label='" + esc(malAd(m)) + " seç'><span>" + sekilIkon(m, 11) + " " + esc(malAd(m)) + "</span><span class='fiyat-iz'><span class='fiyat-dolgu' style='left:" + sol + "%;width:" + gen + "%;background:" + (yuk ? "var(--k-acik)" : "var(--k-karsilanan)") + "'></span><span class='fiyat-orta' style='left:" + a + "%'></span></span><span class='sayi'>%" + Math.round(v * 100) + "</span></div>";
    }
    s += "<p class='ipucu-metin' style='margin-top:6px'>Çizgi = taban fiyat (%100). Sağa uzayan: pahalı (talep &gt; arz); sola: ucuz. Tabanın altı %" + Math.round(0.4 * 100) + " ile sınırlıdır.</p>";
    var el = $("fiyatlar");
    el.innerHTML = s;
  }
  function cizSavaslar() {
    var k = K[durum.kare], s = "";
    var aktif = k.savaslar.filter(function (x) { return x.evre !== "bitti"; });
    var biten = k.savaslar.filter(function (x) { return x.evre === "bitti"; }).slice(-5).reverse();
    function satir(w) {
      var ev = w.evre === "hazirlik" ? "hazırlık" : w.evre === "pencere" ? "savaş penceresi" : "bitti";
      var r = "<div class='satir'><span class='ad'><b>" + esc(oyuncuAd(w.saldiran)) + "</b> → " + esc(oyuncuAd(w.savunan)) + "<br><span class='soluk'>" + esc(D.bolgeler[w.saldiranBolge].ad) + " → " + esc(D.bolgeler[w.hedefBolge].ad) + "</span></span><span style='text-align:right'>";
      if (w.evre === "bitti" && w.sonuc) {
        var sal = w.sonuc.kazanan === w.saldiran;
        r += (sal ? "saldıran kazandı" : "savunan kazandı") + "<br><span class='soluk'>güç " + fmt(w.sonuc.saldiranGuc) + " / " + fmt(w.sonuc.savunanGuc) + " · kayıp %" + w.sonuc.kayipYuzde + "</span>";
      } else {
        r += "<span class='rozet belirsiz'>" + ev + "</span><br><span class='soluk'>bitiş: sa " + w.pencereBitis + "</span>";
      }
      return r + "</span></div>";
    }
    if (aktif.length) s += aktif.map(satir).join(""); else s += "<p class='ipucu-metin'>Bu anda aktif savaş yok.</p>";
    if (biten.length) s += "<h3>Son sonuçlar</h3>" + biten.map(satir).join("");
    $("savaslar").innerHTML = s;
  }
  function cizDarbogaz() {
    var k = K[durum.kare];
    var liste = [];
    for (var i = 0; i < NK; i++) { var c = k.kenarlar[i]; if (c[0] > 0) liste.push({ i: i, u: c[1] / c[0], c: c }); }
    liste.sort(function (a, b) { return b.u - a.u; });
    var ust = liste.slice(0, 6).filter(function (x) { return x.u > 0; });
    var s = "";
    ust.forEach(function (x) {
      var e = D.kenarlar[x.i];
      s += "<div class='satir tikla' data-kenar='" + x.i + "' tabindex='0' role='button'><span class='ad'>" + esc(D.bolgeler[e.a].ad) + " — " + esc(D.bolgeler[e.b].ad) + "<br><span class='soluk'>" + e.tur + " · kapasite " + fmt1(x.c[0]) + "/sa</span></span><span class='sayi'><b>%" + Math.round(x.u * 100) + "</b> " + (x.u >= 0.9 ? "<span class='rozet asagi' style='color:var(--kotu)'>dolu</span>" : "") + "</span></div>";
    });
    if (!ust.length) s = "<p class='ipucu-metin'>Kullanılan kenar yok.</p>";
    $("darbogaz").innerHTML = s;
  }

  /* ---------- gösterge (açıklama) ---------- */
  function cizGosterge() {
    var s = "";
    s += "<div><h3>Yol kullanımı (renk) ve kapasite (kalınlık)</h3>";
    s += "<svg class='degrade' width='100%' height='34' viewBox='0 0 220 34' preserveAspectRatio='xMinYMid meet' aria-hidden='true'><defs><linearGradient id='dg'>";
    for (var i = 0; i <= 4; i++) s += "<stop offset='" + (i * 25) + "%' stop-color='var(--u" + i + ")'/>";
    s += "</linearGradient></defs><rect x='0' y='4' width='200' height='12' rx='3' fill='url(#dg)'/><text x='0' y='30' font-size='9' fill='currentColor'>%0</text><text x='92' y='30' font-size='9' fill='currentColor'>%50</text><text x='180' y='30' font-size='9' fill='currentColor'>%100</text></svg>";
    s += "<div class='g-satir'><svg width='44' height='14'><line x1='2' y1='7' x2='42' y2='7' stroke='var(--u4)' stroke-width='7'/><line x1='2' y1='7' x2='42' y2='7' stroke='var(--harita-zemin)' stroke-width='2.4' stroke-dasharray='4 4'/></svg><span>kesikli iç çizgi = %90 üstü dolu (darboğaz)</span></div>";
    s += "<div class='g-satir'><svg width='44' height='14'><line x1='2' y1='7' x2='42' y2='7' stroke='var(--u2)' stroke-width='5'/></svg><span>kara</span></div>";
    s += "<div class='g-satir'><svg width='44' height='14'><line x1='2' y1='7' x2='42' y2='7' stroke='var(--u2)' stroke-width='5' stroke-dasharray='0.1 9' stroke-linecap='round'/></svg><span>deniz (noktalı)</span></div>";
    s += "<div class='g-satir'><svg width='44' height='14'><line x1='2' y1='7' x2='42' y2='7' stroke='var(--u2)' stroke-width='1.8' stroke-dasharray='9 4'/></svg><span>hava (ince, uzun kesikli)</span></div></div>";

    s += "<div><h3>Kapsam durumu (mal seçilince)</h3>";
    var dl = [["karsilanan", "none", "Karşılanan (≥%95)"], ["kismi", "desen-kismi", "Kısmi (%50–95)"], ["acik", "desen-acik", "Açık (<%50)"], ["engelli", "desen-engelli", "Engelli (yol/kapasite)"], ["ilgisiz", "none", "Talep yok"]];
    dl.forEach(function (x) {
      s += "<div class='g-satir'><svg width='22' height='22' viewBox='-11 -11 22 22'><circle r='10' fill='var(--k-" + x[0] + ")'/>" + (x[1] !== "none" ? "<circle r='10' fill='url(#" + x[1] + ")'/>" : "") + "</svg><span>" + x[2] + "</span></div>";
    });
    s += "</div>";

    s += "<div><h3>Neden simgesi</h3>";
    [["kapasite", "Kapasite: yol var ama dolu"], ["girdi_eksik", "Girdi eksik: hiçbir yerde fazla yok"], ["mesafe", "Mesafe: kaynak çok uzak"], ["erisim_yok", "Erişim yok: yol yok"]].forEach(function (x) {
      s += "<div class='g-satir'>" + ikon(SIMGE[x[0]], 18, false, 1.7) + "<span>" + x[1] + "</span></div>";
    });
    s += "<h3 style='margin-top:10px'>Bölge simgeleri</h3>";
    [["liman", "Liman"], ["dag", "Dağ"], ["dar_gecit", "Dar geçit"]].forEach(function (x) {
      s += "<div class='g-satir'>" + ikon(SIMGE[x[0]], 18, x[0] === "dag", 1.5) + "<span>" + x[1] + "</span></div>";
    });
    s += "<div class='g-satir'><svg width='22' height='22' viewBox='-11 -11 22 22'><circle r='9' fill='var(--sahipsiz)'/><circle r='10.5' fill='none' stroke='var(--d1)' stroke-width='3'/></svg><span>Dış halka: bölgeyi fetheden devlet</span></div>";
    s += "<div class='g-satir'><svg width='30' height='14'><line x1='1' y1='7' x2='24' y2='7' stroke='var(--savas)' stroke-width='3' stroke-dasharray='6 4'/><path d='M22 2 L29 7 L22 12 Z' fill='var(--savas)'/></svg><span>Aktif savaş (saldıran → hedef)</span></div></div>";

    s += "<div><h3>Devletler ve mallar</h3>";
    D.oyuncular.forEach(function (o) {
      s += "<div class='g-satir'><span class='nokta' style='background:" + devletRengi(o.devlet) + "'></span><span>" + esc(devletAd(o.devlet)) + " <span class='soluk'>(" + esc(o.arketip) + ")</span></span></div>";
    });
    s += "<div class='g-satir' style='flex-wrap:wrap'>Akış noktası şekli: " + Object.keys(KATEGORI_SEKIL).map(function (kt) { return "<svg width='14' height='14' viewBox='-5 -5 10 10'><path d='" + SEKIL_YOL[kt] + "' fill='var(--ink2)'/></svg> " + { ham: "ham", ara: "ara", tuketim: "tüketim", askeri: "askeri" }[kt]; }).join(" · ") + "</div></div>";
    $("gosterge").innerHTML = s;
  }

  /* ---------- mal seçici ---------- */
  function malSeciciKur() {
    var el = $("mal-secici");
    var s = "<button type='button' class='mal-dugme' data-mal='-1' aria-pressed='true'>Tümü · akışlar</button>";
    for (var m = 0; m < NM; m++) s += "<button type='button' class='mal-dugme' data-mal='" + m + "' aria-pressed='false' title='" + esc(D.mallar[m].ad) + " (" + KATEGORI_SEKIL[D.mallar[m].kategori] + " işaret)'>" + sekilIkon(m, 14) + esc(D.mallar[m].ad) + "</button>";
    el.innerHTML = s;
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest(".mal-dugme");
      if (!b) return;
      malSec(parseInt(b.getAttribute("data-mal"), 10));
    });
  }
  function malSec(m) {
    durum.mal = durum.mal === m && m >= 0 ? -1 : m;
    var dugmeler = document.querySelectorAll(".mal-dugme");
    for (var i = 0; i < dugmeler.length; i++) dugmeler[i].setAttribute("aria-pressed", String(parseInt(dugmeler[i].getAttribute("data-mal"), 10) === durum.mal));
    tumunuCiz();
  }
  function sec(s) {
    if (s && durum.secim && s.t === durum.secim.t && s.i === durum.secim.i) s = null;
    durum.secim = s;
    tumunuCiz();
  }

  /* ---------- ana çizim ---------- */
  function cizZamanEtiketi() {
    var k = K[durum.kare];
    $("zaman-etiketi").textContent = gunSaat(k.saat) + " (sa " + k.saat + ")";
    $("zaman").value = durum.kare;
  }
  function tumunuCiz() {
    okuRenk();
    cizZamanEtiketi();
    cizKenarlar();
    cizDugumler();
    cizSavas();
    akisKur();
    cizNeden();
    cizAyrinti();
    cizOyuncular();
    cizDarbogaz();
    cizSavaslar();
    cizFiyat();
  }

  /* ---------- oynatma ---------- */
  function oynatDuzenle() {
    var b = $("oynat");
    b.innerHTML = durum.oynat ? "&#10074;&#10074; Durdur" : "&#9654; Oynat";
    b.setAttribute("aria-label", durum.oynat ? "Durdur" : "Oynat");
    if (oynatZ) { clearInterval(oynatZ); oynatZ = null; }
    if (durum.oynat) {
      oynatZ = setInterval(function () {
        durum.kare = durum.kare >= K.length - 1 ? 0 : durum.kare + 1;
        tumunuCiz();
      }, 700 / durum.hiz);
    }
  }

  /* ---------- hipotez tablosu ---------- */
  var VERDICT = { gecti: ["Geçti", "✓"], kaldi: ["Kaldı", "✗"], belirsiz: ["Belirsiz", "?"] };
  function verdictRozet(v) {
    var d = VERDICT[v] || [v, "•"];
    return "<span class='rozet " + (VERDICT[v] ? v : "belirsiz") + "'><span aria-hidden='true'>" + d[1] + "</span>" + d[0] + "</span>";
  }
  function raporCiz() {
    var el = $("rapor-icerik");
    if (!el || !RAPOR) return;
    var s = "<div class='tablo-kap'><table class='duyarli'><thead><tr><th>Kimlik</th><th>Hipotez</th><th>Ölçüm</th><th class='sayi'>Değer</th><th>Eşik</th><th>Karar</th><th>Tohumlar</th></tr></thead><tbody>";
    RAPOR.hipotezler.forEach(function (h) {
      var deger = h.deger === null || h.deger === undefined ? "—" : fmt(h.deger, { maximumFractionDigits: 3 });
      s += "<tr><td data-e='Kimlik'><b>" + esc(h.kimlik) + "</b></td><td data-e='Hipotez'>" + esc(h.hipotez) + "</td><td data-e='Ölçüm'>" + esc(h.olcumAd) + "</td><td class='sayi' data-e='Değer'>" + deger + (h.birim && h.birim !== "oran" ? " " + esc(h.birim) : "") + "</td><td data-e='Eşik'>" + esc(h.esik) + "</td><td data-e='Karar'>" + verdictRozet(h.verdict) + "</td><td data-e='Tohumlar'><span>" +
        (h.tohumBasina || []).map(function (t) { return "<span class='tohum-cip' title='Tohum " + t.tohum + ": " + (t.olcum === null ? "ölçülemedi" : fmt(t.olcum, { maximumFractionDigits: 3 })) + "'>#" + t.tohum + " " + verdictRozet(t.verdict) + "</span>"; }).join("") +
        "<br><span class='soluk'>başarı oranı %" + Math.round((h.tohumBasariOrani || 0) * 100) + "</span></span></td></tr>";
    });
    s += "</tbody></table></div>";
    $("rapor-meta").textContent = "Kaynak: " + RAPOR.kaynak + " · tohumlar: " + RAPOR.tohumlar.join(", ") + (RAPOR.hizli ? " · hızlı mod" : "");
    el.innerHTML = s;
  }

  /* ---------- başlatma ---------- */
  function temaGuncelle() {
    var t = document.documentElement.getAttribute("data-theme");
    $("tema").textContent = "Tema: " + (t === "dark" ? "koyu" : t === "light" ? "açık" : "otomatik");
  }
  function baslat() {
    $("meta").textContent = D.bolgeler.length + " bölge · " + D.devletler.length + " devlet · " + D.kenarlar.length + " yol · harita: " + VERI.harita + " · tohum " + VERI.tohum + " · " + VERI.gun + " gün (" + K.length + " anlık görüntü, " + VERI.aralikSaat + " sim-saat aralıkla)";
    var z = $("zaman");
    z.max = K.length - 1;
    z.addEventListener("input", function () { durum.kare = parseInt(z.value, 10); tumunuCiz(); });
    $("oynat").addEventListener("click", function () { durum.oynat = !durum.oynat; oynatDuzenle(); });
    $("hiz").addEventListener("change", function (e) { durum.hiz = parseFloat(e.target.value); if (durum.oynat) oynatDuzenle(); });
    $("sec-akis").addEventListener("change", function (e) { durum.akis = e.target.checked; noktaKonumla(animT); });
    $("sec-etiket").addEventListener("change", function (e) { durum.etiket = e.target.checked; cizDugumler(); });
    $("tema").addEventListener("click", function () {
      var r = document.documentElement, t = r.getAttribute("data-theme");
      var yeni = t === null ? "dark" : t === "dark" ? "light" : null;
      if (yeni) r.setAttribute("data-theme", yeni); else r.removeAttribute("data-theme");
      temaGuncelle(); tumunuCiz(); cizGosterge();
    });
    $("fiyatlar").addEventListener("click", function (ev) { var r = ev.target.closest("[data-mal]"); if (r) malSec(parseInt(r.getAttribute("data-mal"), 10)); });
    $("darbogaz").addEventListener("click", function (ev) { var r = ev.target.closest("[data-kenar]"); if (r) sec({ t: "kenar", i: parseInt(r.getAttribute("data-kenar"), 10) }); });
    document.addEventListener("keydown", function (ev) {
      if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
      if (ev.key === " " && ev.target === document.body) { ev.preventDefault(); durum.oynat = !durum.oynat; oynatDuzenle(); }
    });
    var kucuk = window.matchMedia("(max-width: 640px)").matches;
    if (kucuk) { durum.etiket = false; $("sec-etiket").checked = false; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { durum.akis = false; $("sec-akis").checked = false; }
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var dinle = function () { tumunuCiz(); cizGosterge(); };
      if (mq.addEventListener) mq.addEventListener("change", dinle);
    }
    okuRenk();
    haritaKur();
    malSeciciKur();
    cizGosterge();
    temaGuncelle();
    raporCiz();
    durum.kare = K.length - 1;
    tumunuCiz();
    requestAnimationFrame(animDongu);
  }
  baslat();
})();
