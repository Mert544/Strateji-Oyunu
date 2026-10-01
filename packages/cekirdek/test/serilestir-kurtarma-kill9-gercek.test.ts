/**
 * kill -9 benzetimi (F1), gerçek harita: son anlık görüntü + komut günlüğünün kalanı ile kurtarılan dünya kesintisiz
 * koşuyla birebir aynıdır. (Eski `serilestir-kurtarma.test.ts`'in ikinci betimlemesinin gerçek harita testi; ortak gövde:
 * `serilestir-kurtarma-ortak.ts`.)
 */
import { gercekVeriyiYukle } from "@bolge/veri";
import { describe } from "vitest";
import { killDokuzTesti } from "./serilestir-kurtarma-ortak";

describe("kill -9 benzetimi: anlik goruntu + gunluk kalani = kesintisiz kosu", () => {
  killDokuzTesti("gercek harita", gercekVeriyiYukle, 3, 2);
});
