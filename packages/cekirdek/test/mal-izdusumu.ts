/**
 * Mal izdüşümü (docs/06 §15.8): içeriğe SONA yeni mal eklenince eski malların davranışının birebir korunduğunun kanıtı için.
 *
 * `malIzdusumu(d, ic, n)` dünyanın ilk `n` malına izdüşümünü (kopya) verir: mal indeksli tüm diziler (bölge stok/israf/üretim/rezerv/keşif,
 * pazar, savaş stok kaybı, lojistik kapsam) `n` uzunluğuna kısaltılır. Kısaltılan YENİ mal girdilerinin ETKİSİZ (sıfır ya da boş: stok miktarı,
 * oranlar ve artık 0, fiyat = taban, talep/arz 0, keşif 0, kapsam varsayılanı) ve hiçbir olayın, emrin, akışın ya da inşaat ödemesinin yeni
 * mala başvurmadığı DENETLENİR; aksi halde `Error` (etkisizlik kanıtı kırılır). Sonuç, eski içerikle (n mal) üretilmiş dünyayla aynı
 * kanonik metni verir (`kanonikSerilestir`).
 */
import type { DerlenmisIcerik, Dunya } from "../src/tipler";

function yeniEtkisiz(kosul: boolean, ne: string): void {
  if (!kosul) throw new Error(`yeni mal etkisiz degil: ${ne}`);
}

export function malIzdusumu(d: Dunya, ic: DerlenmisIcerik, n: number): Dunya {
  const m = ic.mallar.length;
  if (m === n) return d; // izdüşüm kimlik: kopya yok (çağıran değiştirmez)
  const o = structuredClone(d) as Dunya;
  o.bolgeler.forEach((b, bi) => {
    for (let j = n; j < m; j++) {
      const s = b.stoklar[j];
      yeniEtkisiz(s !== undefined && s.miktar === 0 && s.yerelOran === 0 && s.gelenOran === 0 && s.artik === 0, `bolge ${bi} stok ${j}`);
      yeniEtkisiz(b.israf[j] === 0 && b.uretimToplam[j] === 0 && b.uretimOrani[j] === 0, `bolge ${bi} israf/uretim ${j}`);
      yeniEtkisiz(b.rezervIlk[j] === 0 && b.rezervKalan[j] === 0, `bolge ${bi} rezerv ${j}`);
      if (b.kesifSayisi !== undefined) yeniEtkisiz(b.kesifSayisi[j] === 0, `bolge ${bi} kesif ${j}`);
    }
    b.stoklar.length = n;
    for (const k of ["israf", "uretimToplam", "uretimOrani", "rezervIlk", "rezervKalan"] as const) b[k].length = n;
    if (b.kesifSayisi !== undefined) b.kesifSayisi.length = n;
    b.ticaretEmirleri.forEach((e) => yeniEtkisiz(e.mal < n, `bolge ${bi} ticaret emri mal ${e.mal}`));
  });
  for (let j = n; j < m; j++) {
    yeniEtkisiz(d.pazar.oyuncuTalebi[j] === 0 && d.pazar.oyuncuArzi[j] === 0, `pazar talep/arz ${j}`);
  }
  for (const k of ["fiyat", "oyuncuTalebi", "oyuncuArzi"] as const) o.pazar[k].length = n;
  o.savaslar.forEach((s) => {
    if (s.sonuc === null) return;
    for (let j = n; j < m; j++) yeniEtkisiz(s.sonuc.stokKaybi[j] === 0, `savas stok kaybi ${j}`);
    s.sonuc.stokKaybi.length = n;
  });
  o.insaatlar.forEach((s) => (s.odenenMal ?? []).forEach((c) => yeniEtkisiz(c[0] < n, `insaat odenen mal ${c[0]}`)));
  o.lojistik.akislar.forEach((a) => yeniEtkisiz(a.mal < n, `lojistik akis mal ${a.mal}`));
  o.lojistik.kapsam.forEach((satir, i) => {
    for (let j = n; j < m; j++) {
      const h = satir[j];
      yeniEtkisiz(h !== undefined && (h.karsilanmaPpm === 0 || h.karsilanmaPpm === 1_000_000) && h.enYakinKaynakMs === -1 && h.neden === "yok", `lojistik kapsam ${i}/${j}: ${JSON.stringify(h)}`);
    }
    satir.length = n;
  });
  o.kuyruk.forEach((e) => {
    const v = e.veri;
    if (v.tur === "oran_delta" || v.tur === "esik" || v.tur === "sondaj_bitti") yeniEtkisiz(v.mal < n, `kuyruk olayi mal ${v.mal}`);
  });
  return o;
}
