# kare-sebeke (K2)

Dal `takim/k2/kare-sebeke`, taban entegrasyon 0691310 (K1/K4 yigin dalina tasinirken taban degisir; yalniz protokol dosyalari).

- `protokol/src/kare.ts`: `OzelBolgeKaresi.sebeke?: Array<[mal: string, miliSaat: Mili]>` (sartname 10.2). Yalniz sahibine: once elektrik (`b.elektrik.sebekeMili`; mal kimligi `param.mulk.sebeke.elektrik.mal` veya "elektrik"), sonra stoksuz tuketim (`b.sebekeTuketim`, mal kimligine gore sirali); yalniz > 0. Sebeke blogu yokken/alim yokken alan YAZILMAZ. Demete oge eklenmez. Birim fiyat kareye girmez (veri paketinden `param.mulk.sebeke`); bedel istemcide miktar x fiyat (odenen bedel karede ayri alan DEGIL: sartname bunu istemedi, `ParaAkisi.sebeke` oyuncu duzeyindedir ve karede yok).
- `protokol/src/mesajlar.ts`: `ozel.sebeke` istege bagli `[string, tam]` dizisi.
- `protokol/test/kare-sebeke.test.ts` (5): sebekesiz/alimsiz dunyada alan yok ve kare ayni; elektrik once + mal sirasi + yalniz > 0; yalniz sahibine; delta (baslama, degisim, bitis); DONDURULMUS eski sema yeni kareyi kabul eder ve alani atar, demete oge eklenemez.
- ISTEMCI FARKI 0: `pnpm dunya` taban ve dal bayt bayt ayni (dunya.html ham 1.377.310 B, gzip -9 392.955 B); protokol kare/mesaj semalari kabuga girmiyor.
- Sonuc: protokol 51 test gecti; tsc temiz.
