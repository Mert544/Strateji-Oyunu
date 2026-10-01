/**
 * kill -9 benzetimi (F1), sentetik-50 haritası: son anlık görüntü + komut günlüğünün kalanı ile kurtarılan dünya kesintisiz
 * koşuyla birebir aynıdır. (Eski `serilestir-kurtarma.test.ts`'in ikinci betimlemesinin sentetik-50 testi; ortak gövde:
 * `serilestir-kurtarma-ortak.ts`.)
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { describe } from "vitest";
import { killDokuzTesti } from "./serilestir-kurtarma-ortak";

describe("kill -9 benzetimi: anlik goruntu + gunluk kalani = kesintisiz kosu", () => {
  killDokuzTesti("sentetik-50", varsayilanVeriyiYukle, 4, 3);
});
