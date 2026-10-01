/**
 * Göç fikstürlerinin (bolge-v1.json, mulk-v1.json ve .ust.json yan dosyaları) ÜRETİCİSİ. Vitest'e girmez (*.test.ts değil).
 *
 * KAYNAK: zarf SÜRÜM 1'i yazan son çekirdek = commit 71c8616 (packages/cekirdek/src o commit'ten G8'e kadar değişmedi; depo HEAD'i
 * o sırada 95b472d). Fikstürler bu commit'te, aşağıdaki parametrelerle üretildi:
 *  - bolge-v1: harita mini-6 (miniVeriyiYukle), tohum 21, 3 gün (senaryoKos: 4 bot + 6 bulanık komut/karar anı, serilestir-yardimci.ts).
 *  - mulk-v1: mini-6 + mini-6 parsel fikstürü (mulkVeriTam; hibe 2e9, baslangicStok celik/parca 5e6 + gida 2e5, indirimliYapiSayisi 0,
 *    ayrilmisHucrePpm 0, esZamanliInsaat 10), tohum 7, oyuncular a ve b; a: ambar (hücre 0) + ticaret_ofisi (hücre 1) inşaatı,
 *    5 saat koşu, konut (hücre 2), ardından 2 gün koşu.
 *  - .ust.json: { kural, ozet, zaman, tablo[, ekYapi] } = görüntünün yazıldığı andaki kural sürümü, durumOzeti, sim zamanı ve
 *    içerik kimlik tablosu (testler `eskiTablo` olarak kullanır).
 *
 * YENİDEN ÜRETİM (v1 zarfı ancak eski çekirdekle yazılabilir; güncel çekirdek sürüm 2 yazar ve bu betik hata verir):
 *   git worktree add /tmp/v1 71c8616
 *   mkdir -p /tmp/v1/packages/cekirdek/test/fikstur-goc && cp packages/cekirdek/test/fikstur-goc/uret-v1.ts /tmp/v1/packages/cekirdek/test/fikstur-goc/
 *   (cd /tmp/v1 && ln -s <depo>/node_modules node_modules && for p in packages/*; do ln -s <depo>/$p/node_modules $p/node_modules; done)
 *   mkdir /tmp/v1-cikti && (cd /tmp/v1 && npx tsx packages/cekirdek/test/fikstur-goc/uret-v1.ts /tmp/v1-cikti/)
 *   git worktree remove --force /tmp/v1
 * Üretilen dosyalar fikstur-goc/ altındakilerle bayt bayt aynı olmalıdır (deterministik).
 *
 * ICERIK KILIDI (icerik-kimlik-kilidi.json): icerik.json'daki bugünkü kimlik sırasıdır (`icerikKimlikTablosuOlustur`). İçeriğe
 * kimlik SONA eklenince güncellenmez (test önek denetimi yapar). Kasıtlı kırıcı değişiklikte (silme/yeniden sıralama) kilit
 * bilinçli güncellenir ve görüntü dönüşüm aracı gerekir. (P3: Alfa-0'ın 10 malı sona eklendi; kilit BİLİNÇLİ olarak 14 → 24 malla yeniden üretildi, önek
 * denetimi eski 14 malı aynen korur.) Güncelleme komutu:
 *   npx tsx -e 'import {writeFileSync} from "node:fs"; import {miniVeriyiYukle} from "@bolge/veri"; import {Simulasyon} from "./packages/cekirdek/src/motor"; import {icerikKimlikTablosuOlustur as t} from "./packages/cekirdek/src/goc"; writeFileSync("packages/cekirdek/test/fikstur-goc/icerik-kimlik-kilidi.json", JSON.stringify(t(Simulasyon.olustur(miniVeriyiYukle(),1).ic),null,1)+"\n")'
 */
import { writeFileSync } from "node:fs";
import { miniVeriyiYukle } from "@bolge/veri";
import { ANLIK_GORUNTU_SURUMU, anlikGoruntuOlustur, kuralSurumuHesapla } from "../../src/serilestir";
import { GUN } from "../../src/tipler";
import { mulkSim, mulkVeriTam, tamam } from "../mulk-yardimci";
import { senaryoKos } from "../serilestir-yardimci";

if (Number(ANLIK_GORUNTU_SURUMU) !== 1) throw new Error("Bu uretici surum 1 zarf yazan eski cekirdek (71c8616) icindir; dosya basindaki yeniden uretim komutuna bakin.");
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

// Bölge kipi
{
  const v = miniVeriyiYukle();
  const r = senaryoKos({ veri: v, tohum: 21, sureMs: 3 * GUN, bulanikAdet: 6 });
  const metin = anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(v));
  writeFileSync(D + "bolge-v1.json", metin);
  writeFileSync(D + "bolge-v1.ust.json", JSON.stringify({ kural: kuralSurumuHesapla(v), ozet: r.sim.durumOzeti(), zaman: r.sim.dunya.zaman, tablo: tablo(v) }, null, 1) + "\n");
}
// Mülk kipi
{
  const v = mulkVeriTam((x) => {
    const m = x.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
  });
  const s = mulkSim(["a", "b"], v, 7);
  const d = s.dunya;
  const hs = d.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
  const ILCE = "sn_m_ova_merkez";
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ambar", hucreler: [hs[0]!] });
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ticaret_ofisi", hucreler: [hs[1]!] });
  s.calistirKadar(5 * 3600_000);
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "konut", hucreler: [hs[2]!] });
  s.calistirKadar(2 * GUN);
  const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(v));
  writeFileSync(D + "mulk-v1.json", metin);
  const ekYapi = d.bolgeler.flatMap((b) => (b.ekYapilar ?? []).map((e) => e.tur)).sort();
  writeFileSync(D + "mulk-v1.ust.json", JSON.stringify({ kural: kuralSurumuHesapla(v), ozet: s.durumOzeti(), zaman: s.dunya.zaman, tablo: tablo(v), ekYapi }, null, 1) + "\n");
}
