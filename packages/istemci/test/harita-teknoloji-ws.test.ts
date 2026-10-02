/** Tek senaryo: gerçek teklif → araştırma komutu → para/süre → tek slot → tamamlanma. */
import { expect, it } from "vitest";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { icerikTablosu } from "../src/komut/tablo";
import { arastirmaTeklifi, TeknolojiPaneli } from "../src/harita/teknoloji-panel";

async function bekle(kosul: () => boolean): Promise<void> {
  const son = Date.now() + 4000;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("Araştırma karesi gelmedi");
    await new Promise((r) => setTimeout(r, 10));
  }
}

it("mülk araştırması sunucu teklifindeki bedel ve süreyle başlar; ikinci işi reddeder, bitince yöntemi açar", async () => {
  const veri = mulkVerisi();
  const ts = await testSunucusu({ veri });
  let b: WsBaglanti | undefined;
  try {
    const sistem = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(sistem, "bilim", []);
    b = await WsBaglanti.ac({ url: ts.url, token: token("bilim"), istemciKimligi: "arastirma" });
    await bekle(() => !!b!.arastirmaDurumu()?.yayilimPpm);
    const ic = icerikTablosu(veri.icerik, veri.param);
    const tek = ic.teknolojiler.find((t) => t.id === "mekanize_tarim")!;
    const once = b.arastirmaDurumu()!;
    const teklif = arastirmaTeklifi(tek, once)!;
    expect(teklif).not.toBeNull();
    const panel = new TeknolojiPaneli({ ic, durum: () => b!.arastirmaDurumu(), komut: (id) => b!.arastirmaBaslat(id), degisti: () => {} });
    expect(panel.html()).toContain('data-teknoloji-baslat="mekanize_tarim"');
    await panel.baslat(tek.id);
    await bekle(() => b!.arastirmaDurumu()?.arastirma?.teknoloji === tek.id);
    const sonra = b.arastirmaDurumu()!;
    expect(once.hazineMili - sonra.hazineMili).toBe(teklif.maliyet);
    expect(sonra.arastirma!.bitis - once.simZamani).toBe(teklif.sureMs);
    expect(await b.arastirmaBaslat("sulama_sistemi")).toEqual({ tamam: false, mesaj: "Zaten devam eden bir araştırman var." });
    expect(b.arastirmaDurumu()!.hazineMili).toBe(sonra.hazineMili);
    await sistem.zamanIlerlet(sonra.arastirma!.bitis);
    await b.zamanEsitle();
    await bekle(() => b!.arastirmaDurumu()?.acik.has(tek.id) === true);
    expect(b.arastirmaDurumu()!.arastirma).toBeNull();
    expect(b.acikTeknolojiler()!.has(tek.id)).toBe(true);
  } finally {
    b?.kapat();
    await ts.kapat();
  }
});
