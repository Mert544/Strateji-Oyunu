/**
 * Yeniden oynatma doğruluğu (F1), sentetik-50: sunucu YALNIZ başarılı komutları günlüğe yazar; karışık komutlarla (4 bot +
 * bulanık komutlar) koşulan dünyanın son özeti, yalnız başarılı komutların `yenidenOynat` + aynı `calistirKadar(son t)`
 * sonucuyla birebir aynı olmalıdır. (Eski `serilestir-yeniden-oynatma.test.ts`'in birinci betimlemesinin sentetik-50 testi;
 * ortak gövde: `serilestir-yeniden-oynatma-ortak.ts`.)
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { describe } from "vitest";
import { basariliYenidenOynatmaTesti } from "./serilestir-yeniden-oynatma-ortak";

describe("yeniden oynatma: yalniz basarili komutlar", () => {
  basariliYenidenOynatmaTesti("sentetik-50", varsayilanVeriyiYukle);
});
