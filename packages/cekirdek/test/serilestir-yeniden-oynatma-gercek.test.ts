/**
 * Yeniden oynatma doğruluğu (F1), gerçek harita: sunucu YALNIZ başarılı komutları günlüğe yazar; karışık komutlarla (4 bot +
 * bulanık komutlar) koşulan dünyanın son özeti, yalnız başarılı komutların `yenidenOynat` + aynı `calistirKadar(son t)`
 * sonucuyla birebir aynı olmalıdır. (Eski `serilestir-yeniden-oynatma.test.ts`'in birinci betimlemesinin gerçek harita testi;
 * ortak gövde: `serilestir-yeniden-oynatma-ortak.ts`.)
 */
import { gercekVeriyiYukle } from "@bolge/veri";
import { describe } from "vitest";
import { basariliYenidenOynatmaTesti } from "./serilestir-yeniden-oynatma-ortak";

describe("yeniden oynatma: yalniz basarili komutlar", () => {
  basariliYenidenOynatmaTesti("gercek harita", gercekVeriyiYukle);
});
