/**
 * G6 ÖNCESİ para defterli mülk görüntüsü fikstürünün (mulk-v2-g6oncesi.json ve .ust.json yan dosyası) ÜRETİCİSİ. Vitest'e girmez (*.test.ts değil).
 *
 * NEDEN: göç ve korunum testlerindeki "eski görüntü" çoğu yerde testin içinde, O ANKİ kodla üretilir; eski kodu sınamaz. Bu fikstür G6'dan ÖNCEKİ çekirdekle
 * (zarf sürüm 2, `mulk.para` para defteri ve kamu kasaları VAR; `mulk.sebeke`, `yontem`, yeni mal/yapı YOK) üretilip dondurulmuştur; G6 sonrası kod onu yüklemeli,
 * yüklenen dünyanın `durumOzeti`'ni değiştirmemeli (lazy yaratma: yeni kalem kendiliğinden doğmaz) ve para korunumu tam tutmalıdır.
 *
 * KAYNAK: commit 7553b55 (`entegrasyon`; `packages/cekirdek/src` ve `packages/veri/src|icerik` bu commit'te de-9959c ile aynıdır, G6 henüz girmedi).
 * Senaryo: mini-6 + mini-6 parsel fikstürü, kamu arsası AÇIK (`KAMU_KUCUK`), oyuncular a, b, c (bedava yurt açık, yurtHucre 6); hibe 2e9, başlangıç stoğu
 * celik/parca 5e6 + gida/tahil 2e5, arazi vergisi haftalık %10, eşzamanlı inşaat 10; tohum 7. Ayrıntılı adımlar aşağıdaki koddadır (ihracat satışı, Ticaret ofisi,
 * parsel alım/bırakma, sistem ödülü, vergi ve kasa girişleri dahil).
 *
 * YENİDEN ÜRETİM (dosya bayt bayt aynı çıkmalıdır; deterministiktir):
 *   git worktree add /tmp/v2 7553b55
 *   mkdir -p /tmp/v2/packages/cekirdek/test/fikstur-goc && cp packages/cekirdek/test/fikstur-goc/uret-mulk-v2.ts /tmp/v2/packages/cekirdek/test/fikstur-goc/
 *   (cd /tmp/v2 && ln -s <depo>/node_modules node_modules && for p in packages/*; do ln -s <depo>/$p/node_modules $p/node_modules; done)
 *   mkdir /tmp/v2-cikti && (cd /tmp/v2 && npx tsx packages/cekirdek/test/fikstur-goc/uret-mulk-v2.ts /tmp/v2-cikti/)
 *   git worktree remove --force /tmp/v2
 * (Aynı çıktı 7553b55 ile aynı `packages/cekirdek/src` içeren herhangi bir ağaçta da çıkar; G6 sonrası kodla ÜRETİLMEMELİ: görüntü eski kodu temsil eder.)
 */
import { writeFileSync } from "node:fs";
import { ANLIK_GORUNTU_SURUMU, anlikGoruntuOlustur, kuralSurumuHesapla } from "../../src/serilestir";
import { hucreBul } from "../../src/mulk/durum";
import { kamuHucreMi } from "../../src/mulk/kamu";
import { paraUzlastir } from "../../src/mulk/kasa";
import { DAKIKA, GUN } from "../../src/tipler";
import { KAMU_KUCUK } from "../kamu-yardimci";
import { bitisikCift, mulkSim, mulkVeriTam, tamam } from "../mulk-yardimci";
import { SISTEM_OYUNCUSU } from "../../src/motor";

if (Number(ANLIK_GORUNTU_SURUMU) !== 2) throw new Error("Bu uretici zarf surum 2 yazan G6 oncesi cekirdek (7553b55) icindir; dosya basindaki yeniden uretim komutuna bakin.");
const D = process.argv[2] ?? "./";

interface IcerikGorunumu {
  icerik: { birlikler: { id: string }[]; mallar: { id: string }[]; tarimUrunleri?: { id: string }[]; teknolojiler: { id: string }[]; tesisTurleri: { id: string }[]; yontemler: { id: string }[] };
}
function tablo(v: IcerikGorunumu) {
  return {
    birlikler: v.icerik.birlikler.map((x) => x.id),
    mallar: v.icerik.mallar.map((x) => x.id),
    tarimUrunleri: (v.icerik.tarimUrunleri ?? []).map((x) => x.id),
    teknolojiler: v.icerik.teknolojiler.map((x) => x.id),
    tesisTurleri: v.icerik.tesisTurleri.map((x) => x.id),
    yontemler: v.icerik.yontemler.map((x) => x.id),
  };
}

const LIMAN = "sn_m_liman_merkez";
const SEHIR = "sn_m_sehir_merkez";

const v = mulkVeriTam((x) => {
  const m = x.param.mulk!;
  m.yeniOyuncu.hibe = 2_000_000_000;
  m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 200_000 };
  m.yeniOyuncu.indirimliYapiSayisi = 0;
  m.yeniOyuncu.ayrilmisHucrePpm = 0;
  m.esZamanliInsaat = 10;
  m.araziVergisiHaftalikPpm = 100_000;
  m.kamu = structuredClone(KAMU_KUCUK);
});
const s = mulkSim(["a", "b", "c"], v, 7);
const d = s.dunya;
const yurt = (o: string) => d.mulk!.hucreler.filter((h) => h.sahip === o);
/** Oyuncunun yurt ilçesi ve ili (yurt ilçesi doluluğa göre seçilir; kodla belirlenir). */
const ilceOf = (o: string) => yurt(o)[0]!.ilce;
const ilOf = (o: string) => s.ic.mulk!.ilceler.get(ilceOf(o))!.il;

// 1. a: yurtta Çiftlik; 20 dk sonra tahıl ihracat emri (ilk satış)
tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ilceOf("a"), tesisTuru: "ciftlik", hucreler: bitisikCift(yurt("a").map((h) => h.id)) });
s.calistirKadar(d.zaman + 20 * DAKIKA);
tamam(s, "a", { tur: "ticaret_emri", bolge: `${ilOf("a")}#a`, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
// 2. b: yurtta Ambar + Çiftlik; sistem ödülü (ilk_yapi) ve tahıl ihracatı
const hb = yurt("b").map((h) => h.id);
const cb = bitisikCift(hb);
tamam(s, "b", { tur: "tesis_insa_hucre", ilce: ilceOf("b"), tesisTuru: "ciftlik", hucreler: cb });
tamam(s, "b", { tur: "tesis_insa_hucre", ilce: ilceOf("b"), tesisTuru: "ambar", hucreler: [hb.filter((i) => !cb.includes(i))[0]!] });
s.calistirKadar(d.zaman + 6 * 3600_000);
tamam(s, "b", { tur: "ticaret_emri", bolge: `${ilOf("b")}#b`, mal: "tahil", yon: "ihracat", oranSaat: 50_000 });
tamam(s, "b", { tur: "ticaret_emri", bolge: `${ilOf("b")}#b`, mal: "celik", yon: "ithalat", oranSaat: 20_000 });
const odul = s.uygula({ t: d.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "sistem_odul", oyuncu: "b", kavram: "ilk_yapi" } });
if (!odul.tamam) throw new Error(`sistem_odul basarisiz: ${odul.hata}`);
s.calistirKadar(d.zaman + GUN);
// 3. c: liman ve şehir ilçelerinde parsel alımı (arsa bedeli kasaya), bir parselin bırakılması (iade)
/** İlçenin `sinif` sınıfındaki uygun, sahipsiz ve kamu olmayan ilk `n` hücresi (fikstür sırasıyla). */
const serbest = (ilce: string, sinif: "kirsal" | "kasaba" | "sehir", n: number): string[] =>
  s.ic.mulk!.ilceler.get(ilce)!.hucreler.filter((h) => h.uygun && h.sinif === sinif && hucreBul(d, h.id) === undefined && !kamuHucreMi(d, ilce, h.id)).map((h) => h.id).slice(0, n);
const lk = serbest(LIMAN, "kirsal", 4);
tamam(s, "c", { tur: "parsel_al", ilce: LIMAN, hucreler: lk, sinif: "kirsal" });
tamam(s, "c", { tur: "parsel_al", ilce: SEHIR, hucreler: serbest(SEHIR, "kasaba", 3), sinif: "kasaba" });
s.calistirKadar(d.zaman + 12 * 3600_000);
tamam(s, "c", { tur: "parsel_birak", ilce: LIMAN, hucreler: [lk[3]!] });
tamam(s, "a", { tur: "ticaret_emri", bolge: `${ilOf("a")}#a`, mal: "gida", yon: "ihracat", oranSaat: 10_000 });
// 4. 4 gün koşu: satışlar, vergi, işletme gideri, kamu kasası, kamu hazine
s.calistirKadar(d.zaman + 4 * GUN);
paraUzlastir(d, s.ic); // kontrol noktası: hazineler ve defter d.zaman'a uzlaşık (nötr)

const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(v));
writeFileSync(D + "mulk-v2-g6oncesi.json", metin);
const p = d.mulk!.para!;
writeFileSync(
  D + "mulk-v2-g6oncesi.ust.json",
  JSON.stringify({ kural: kuralSurumuHesapla(v), ozet: s.durumOzeti(), zaman: d.zaman, kasaSayisi: p.kasalar.length, tablo: tablo(v) }, null, 1) + "\n",
);
console.log(`yazildi: ${metin.length} bayt; kasa ${p.kasalar.length}; musluk.hibe n=${p.musluk.hibe.n}; ihracatNpc n=${p.musluk.ihracatNpc.n}; arsa n=${p.lavabo.arsa.n}`);
