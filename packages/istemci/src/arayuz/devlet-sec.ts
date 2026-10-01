/**
 * Açılışta "Devlet seç" katmanı: dört devletin özeti (bölge sayısı, nüfus, kaynak profili) ve "Yalnızca izle".
 * Seçim URL kısmında basit bir belirteçle (#korvan, #izle) hatırlanır; yalnızca düz #anchor kullanılır.
 */
import type { HaritaDosyasi, IcerikDosyasi } from "@bolge/veri";
import { esc, fmt1 } from "./bicim";

export interface DevletKarti {
  idx: number;
  id: string;
  ad: string;
  bolgeSayisi: number;
  nufus: number;
  liman: number;
  dag: number;
  /** Ham kaynakların dünya toplamındaki payı (%), büyükten küçüğe. */
  kaynaklar: Array<{ ad: string; pay: number }>;
}

export function devletKartlari(harita: HaritaDosyasi, icerik: IcerikDosyasi): DevletKarti[] {
  const hamlar = icerik.mallar.filter((m) => m.kategori === "ham");
  const dunya: Record<string, number> = {};
  for (const b of harita.bolgeler) for (const [m, q] of Object.entries(b.rezervler)) dunya[m] = (dunya[m] ?? 0) + q;
  return harita.devletler.map((d, idx) => {
    const bs = harita.bolgeler.filter((b) => b.devlet === d.id);
    const kaynaklar = hamlar
      .map((m) => ({ ad: m.ad, pay: Math.round(((bs.reduce((t, b) => t + (b.rezervler[m.id] ?? 0), 0) / Math.max(1, dunya[m.id] ?? 0)) * 100)) }))
      .filter((k) => k.pay >= 8)
      .sort((x, y) => y.pay - x.pay)
      .slice(0, 3);
    return {
      idx,
      id: d.id,
      ad: d.ad,
      bolgeSayisi: bs.length,
      nufus: bs.reduce((t, b) => t + b.nufus, 0),
      liman: bs.filter((b) => b.etiketler.includes("liman")).length,
      dag: bs.filter((b) => b.etiketler.includes("dag")).length,
      kaynaklar,
    };
  });
}

/** URL parçasından seçim: devlet indeksi, -1 (yalnızca izle) ya da null (seçim yok). `?devlet=` sorgusu da kabul edilir. */
export function secimCoz(hash: string, sorgu: string, idler: readonly string[]): number | null {
  const belirtec = (new URLSearchParams(sorgu).get("devlet") ?? hash.replace(/^#/, "")).trim().toLowerCase();
  if (belirtec === "izle") return -1;
  const i = idler.indexOf(belirtec);
  return i >= 0 ? i : null;
}

export function secimBelirteci(idx: number, idler: readonly string[]): string {
  return idx < 0 ? "izle" : (idler[idx] ?? "izle");
}

export function devletSecimiHtml(kartlar: DevletKarti[], oyunda: boolean): string {
  const k = kartlar
    .map(
      (d) => `<button type="button" class="ds-kart" data-devlet="${d.idx}" style="--renk:var(--d${d.idx % 4})">
<span class="ds-ad"><i class="nokta"></i>${esc(d.ad)}</span>
<span class="ds-satir"><b>${d.bolgeSayisi}</b> bölge · <b>${fmt1(d.nufus / 1e6)} Mn</b> nüfus</span>
<span class="ds-satir">${d.liman} liman · ${d.dag} dağ bölgesi</span>
<span class="ds-profil">Kaynaklar: ${d.kaynaklar.length ? d.kaynaklar.map((x) => `${esc(x.ad)} %${x.pay}`).join(" · ") : "dengeli"}</span>
<span class="ds-git">Bu devleti yönet</span></button>`,
    )
    .join("");
  return `<div class="ds-kutu"><h1 id="devlet-sec-baslik">Devlet seç</h1>
<p>Dört devletten birini siz yönetin; diğer üçünü botlar oynar. Küre üzerinden bölgelerinizi seçip tesis kurar, ticaret yapar, ordu kurarsınız.${oyunda ? " <b>Devlet değiştirirseniz oyun baştan başlar.</b>" : ""}</p>
<div class="ds-kartlar">${k}</div>
<div class="ds-alt"><button type="button" class="ds-izle" data-devlet="-1">Yalnızca izle</button><span class="soluk">Dört bot da oynar; komut veremezsiniz.</span>${oyunda ? `<button type="button" class="ds-izle" data-devlet-kapat>Vazgeç</button>` : ""}</div></div>`;
}
