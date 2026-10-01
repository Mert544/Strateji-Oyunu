# Defter P4/P5 dedektoru (K2) - takim/k2/defter-p4p5

Taban `bc6087c`, dogrusal, hedef P8. Kaynak: `SP/t3/defter-p4p5.md` (A2 dogrulamali).

## Degisen dosyalar
- `packages/sunucu/src/odul/dedektor.ts`: `ilk_ekmek` ve `ilk_pencere` izgara kavrami (kritik yol sirasinda: ilk_isleme, ilk_ekmek, zincir, ilk_dukkan, ilk_pencere); damga yolu `DAMGA_IZGARA_KAVRAMLARI = [ilk_uretim, ilk_raf, ilk_cam]` + `damgaSaglandi`; `ilkRaf`; `kavramEtkin` (etkin kurali). Yalniz `@bolge/cekirdek`'e bagli kalir (kalip: kavram dogrudan cekirdek durumundan okunur; K3'un ayri okuyucusu kodda YOK, `ekYapilar[].dukkan.raf[].mal` dogrudan okunur).
- `packages/sunucu/src/odul/defter.ts`: `etkin` artik `kavramEtkin(ic, kavram)`.
- `packages/sunucu/src/yazar.ts`: izgara damgalari dongusu (`ilk_uretim` ozel yolu genellendi).
- `packages/protokol/src/defter.ts`: `DEFTER_ODUL_SIRASI` (+`ilk_ekmek`, `ilk_pencere`, eski goreli sira korunur), `DEFTER_DAMGALARI` (+`ilk_raf`, `ilk_cam` SONA; indeksler kaymaz, istemci `[0]` = ilk_parsel). Sema DEGISMEDI (`kavram` serbest dize).
- `packages/istemci/src/harita/defter.ts` (AYRI commit): `DEFTER_METINLERI` 4 satir (T3 metinleri; damgalarda `siradaki` yalnizca tipi/testi saglamak icin, listede gorunmez). T1/K1 kendi metinlerini getirirse bu commit atilabilir.
- Testler: `protokol/test/defter-p4p5.test.ts` (yeni; DONMUS ESKI SEMA: eski liste alt dizi, eski damga basta, eski defter yuku aynen gecerli, yeni kavramlar tasinir), `protokol/test/protokol.test.ts` (sira beklentisi), `sunucu/test/odul-p4p5.test.ts` (yeni, 11 test), `sunucu/test/odul-yontem.test.ts` (fabrika zincirinde `ilk_ekmek` de saglanir), `sunucu/test/odul.test.ts` (:185 `ilk_dukkan` etkin false: bu icerikte dukkan yok), `sunucu/README.md`.

## Kurallar
- `ilk_pencere`: pencere URETIMI (`uretimToplam` + tembel oran). Kit pencere stoku (`baslangicStok.pencere` 3000) uretim sayacina girmez: testte kit stoku >= 3000 ve 3 gun sonra bile tetiklemez.
- `ilk_raf`: dukkanin en az bir yuvasinda `mal` tanimli ve bos degil; stok ve satis sarti yok (testte stoksuz mal ve satis geliri 0 iken damga).
- `ilk_dukkan` yalniz dukkan satisiyla, `ilk_satis` yalniz ihracatla (degismedi).
- Etkin kurali (`kavramEtkin`, istemci ayni kurali icerik dizininden uygulamali): `ilk_ekmek`/`ilk_pencere`/`ilk_cam` = icerikte o mali CIKTI veren en az bir yontem var; `ilk_dukkan`/`ilk_raf` = `mulk.perakende` tanimli; `ilk_sozlesme` her zaman false; digerleri true. Gercek icerikte bugun: ekmek true; pencere, cam, dukkan, raf false. DIKKAT: bu yuzden `ilk_dukkan` bu icerikte artik `etkin:false` (onceden true idi); perakende verisi gelince kendiliginden true.
- K1 notu: `istemci/src/harita/baglanti.ts:430` etkin hesabi sabittir (`k !== ilk_dukkan && k !== ilk_sozlesme`); yeni kavramlar tabloya girince icerik kuralina baglanmali (bu daliyla dokunulmadi).

## G8-1 sonrasi
`odul.kavramlar` (+`ilk_ekmek` mal ekmek 5000, +`ilk_pencere` mal parca 8000) ve pencere/cam yontemleri K3'un G8-1 veri commit'iyle gelecek. O zamana kadar testler fikstur icerik kullanir (bellekte yontem ve odul satiri eklenir). G8-1 inince gercek icerikle ayni senaryolarin tekrari eklenecek (`odul-p4p5.test.ts`'te "gercek icerik" blogu).

## Dogrulama
- `tsc` (gecici tsconfig, yalniz sunucu/protokol src + ilgili testler): temiz.
- vitest tek isci: `protokol/test/{defter-p4p5,protokol}` 22/22; `sunucu/test/{odul,odul-sureci,odul-yontem,odul-dukkan,odul-p4p5}` 35 gecti 1 atlandi (onceden atlanan); `istemci/test/defter.test.ts` 7/7. pg testi yok (bu dalda pg yolu degismedi).
- Istemci gzip (`pnpm dunya` esdegeri, ayni makinede once/sonra): `dunya.html` 376.2 -> 376.2 KB (0), `harita.js` 424.0 -> 424.2 KB (+0.2), toplam JS gzip 828.2 -> 828.4 KB (+0.2). Butce 400 KB.

## Ek commit: etkin kurali protokole tasindi (lider sarti)
- `@bolge/protokol` `defter.ts`: saf `kavramEtkin(girdi: DefterEtkinGirdisi, kavram)` (`girdi = { yontemCiktilari: Iterable<string>; perakende: boolean }`) ve `DEFTER_YER_TUTUCULARI`. Istemci ayni islevi cagirir (K1 baglayacak; `baglanti.ts` degismedi).
- Sunucu: `src/odul/etkin.ts` ince sarmalayici (`DerlenmisIcerik` -> girdi, `ic` basina onbellekli); `defter.ts` etkin bayragini, `yazar.ts` de kavram/damga degerlendirmesini (`odulUygunMu`, damga dongusu) ayni yoldan gecirir. `dedektor.ts` kurali tasimaz ve protokole BAGLANMAZ (yalniz `@bolge/cekirdek`).
- Testler: sunucu `kavramEtkin` testleri sarmalayici uzerinden aynen gecer; protokol testine saf islev testleri eklendi (yer tutucu hep false, mal/perakende kosullari, tek kullanimlik Iterable). Dogrulama: tsc (protokol+sunucu) temiz; vitest tek isci 67 gecti 1 atlandi (protokol 2, sunucu 5 odul dosyasi, istemci defter).
