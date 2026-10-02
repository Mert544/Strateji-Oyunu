# f4 uretim (P14-1 + P14-2) teslim raporu (K4)

- **Dal:** `takim/k4/f4-uretim` (tek dogrusal yigin). **Taban:** 45ac5b0 (main ucu). Commitler: c631012 (f4 `--uretim`, uretim-katilim), ba9c2ed (P14-2: katilim/kamu/kilitsizlik), 2480904 (P14-1: ilce basina yurtlu, masaustu + telefon).
- **Degisen dosyalar:** `packages/istemci/scripts/{f4-sunucu,f4-uctan-uca}.ts`, `packages/sunucu/test/{uretim-yardimci,uretim-katilim.test,uretim-kamu.test,uretim-kilitsizlik.test}.ts`. Cekirdek, veri, protokol, sunucu kodu degismedi.
- **Temiz agac:** evet (yalniz izlenmeyen `node_modules` baglantisi, onceki worktree kurulumundan).

## P14-1 (2480904)
- `f4-uctan-uca.ts`: yeni kucuk blok `yurtluIlce(tarayici, adres, ts, konsol, ilce, mobil)`; `main`'de yalniz `--uretim` iken ali/can/ayse/derya/sahte'den sonra 3 ilce (gebze, gemlik, korfez) x (masaustu 1440x900, mobil 390x844 dokunma) = 6 kosu. Oyuncu `yu-<ilce>-<cihaz>`; konsol suzgeci `[yu-`.
- Her kosu: Yerles ilce karti (gerekirse "Baska ilce oner") -> Tarim -> "Burada basla" -> varis "Yurdun hazir: 6 hucre, ucretsiz." (birincil "Yurdunda kur", ikincil "Arsa satin al"; telefonda tasma yok) -> sunucuda yurt o ilcede 6 hucre, bedel 0, `katilimIlcesi` dogru -> "Yurdunda kur": "Ciftlik kuruluyor; bedel N" bildirimi, insaat +1, hazine dususu bildirimdeki bedelle birebir, insaat hucreleri yalnizca yurtta; telefonda kurulum sonrasi tasma yok; konsol hatasi yok.
- Bayraksiz (Gebze fikstur) senaryo AYNEN: senaryo fonksiyonlarina (ali, can, ayse, derya, sahteYerles) dokunulmadi; yeni blok `URETIM` kosuluna bagli.
- Dogrulama: `tsc --noEmit -p packages/istemci` temiz (35 sn); eslint temiz. **Playwright kosulmadi** (lider talimati): 6 yeni kosunun gercek tarayicida gecmesi KANITLANMADI.

## Olcumler (P14-2 testleri; tek dosya, 1 isci)
uretim-katilim ~9,9 sn (katilim <= 33 ms), uretim-kamu ~15,6 sn, uretim-kilitsizlik ~8,8 sn.

## Geri donmesi zor kararlar
Yok (yalniz betik/test; ekleme).

## Acik sorular
1. Ciftlik yurt bedelini 4.200 diye sabitlemedim (Gemlik/Korfez icin tarayicida dogrulanmadi); bildirimdeki bedelle hazine dususu esitligi denetlenir. Istenirse Gebze icin 4.200 sabiti eklenir.
2. Gemlik'te `data-acilis='tarim'` dugmesinin her ilcede gorundugu varsayildi (Yerles ekrani ilceden bagimsiz ACILIS_SIRASI cizer); ilk gercek kosuda dogrulanmali.
