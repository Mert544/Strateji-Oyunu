# G7-3 dukkan (K4)

Dal: `takim/k4/g7-3-dukkan`. Taban: K3 G7-2 ucu (`fd8e21e`, sonra `8042a58`'e tasindi: `git rebase --onto 8042a58 fd8e21e`). Merge commit yok; tek ozellik commit'i + bu rapor.
Sartname: `docs/arastirma/p4-p5-sartname.md` (74775e3) §7.2-§7.9, §9, §11, §12.6, §16.2.

## Ne yapildi

Dukkan komutlarinin ETKIN yolu (G7-1b'de yalniz tip, alan sozlugu ve DUK-00 vardi):

- `tesis_insa_hucre` ve `yapi_yerlestir` `dukkanTuru`: tesisTuru `dukkan` iken zorunlu (DUK-01), degilken yasak (DUK-02), bilinen tur (DUK-03), olcek `acikOlcekler` icinde (DUK-04) ve turun `olcekAraligi`nda (DUK-05), hucre sayisi mevcut ileti (DUK-08), ilce siniri `ilceBasinaEnFazla` biten + suren (DUK-06, il sinirindan once), il siniri mevcut kural (DUK-07). Insaat `InsaatDurumu.dukkanTuru` tasir. Dukkan icin M/L ayak izi `ekYapilar.dukkan.olcekHucre`'den, bedel tesisle ayni `olcekKademeleri[olcek].insaPpm` tablosundan (G7'de yalniz S acik; `acikOlcekler = [0, 1]` testle sinandi).
- `ekYapiTamamla` dukkan dali: `DukkanDurumu` (bos raf, varsayilan kademe, markasiz; `baslangic` = insaat komut ani, `kurulus` = tamamlanma ani).
- `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik`, sistem yolunda `marka_sifirla`: DUK/MRK ret iletileri sartname §9.3 ile BIREBIR. Kampanya (§7.5b) saf plan + yalniz basarida yazim; etkin kademe durumdan turetilir (durum yazilmaz). Hiz siniri (DUK-18) kalan saat yukari yuvarlanir; ilk doldurma ve bosaltma muaf; dolu yuvada mal degisimi `fiyatT` yazar; mal degisince kademe varsayilana doner.
- `dukkan_yik`: iade YOK, para hareketi 0; yapi ve hucre `tesis` isareti silinir, ek yapi listesi bosalirsa alan silinir; arsa, arazi degeri, ilce sayaclari, indirim sayaci (geri VERILMEZ) ve marka tanimi degismez. Suren insaat kimligi DUK-23, baskasinin dukkani ve bilinmeyen kimlik DUK-10 (bilgi sizdirmaz).
- `marka_tanimla.ad` cekirdekte `adKanonik`ten gecer (gunlukte girilen metin, durumda kanonik kucuk harf). `marka_sifirla`: ad `adsiz marka`, simge/renk/dukkan bagi kalir; perakende kapaliysa `perakende kapali`, oyuncu yolu SIS-01.
- Serilestirme (K3'un dukkan/marka dogrulayicilarina EK): `insaatlar[].dukkanTuru` (dize; yalniz `ekYapi === "dukkan"`; bilinen tur), marka sayisi `<= hesapBasinaEnFazla`, simge/renk sayisi siniri, perakende yokken marka yasak (`dunyaIcerikUyumu`).

## Degisen dosyalar

- `packages/cekirdek/src/mulk/dukkanKomut.ts` (YENI; K3'un `mulk/perakende.ts`'ine dokunulmadi), `mulk/komut.ts`, `mulk/yapi.ts`, `mulk/index.ts`, `motor.ts` (marka_sifirla cagrisi), `serilestir.ts`, `index.ts` (export)
- Testler (yeni): `perakende-komut.test.ts` (19), `perakende-kampanya.test.ts` (8), `marka-sozdizimi.test.ts` (10), `perakende-komut-serilestir.test.ts` (5), `perakende-arbitraj.test.ts` (1), yardimci `perakende-komut-yardimci.ts`
- Guncellenen test: `perakende-komut-bag.test.ts` ("komut yolu G7-3'te: henuz uygulanmadi" iddiasi artik `dukkan bulunamadi`)
- Bu rapor.
G7-2 hesap dosyalarina (`uretim.ts`, `cozum.ts`, `kasa.ts`), `perakende.ts` ve JSON'lara dokunulmadi.

## Olcumler (hedefli, tek isci)

- `perakende*`, `mulk*`, `para-guvenligi`, `serilestir*`, `motor*`, `yontem*`, `sebeke*`, `marka*`, `ad-kurali`, `esik-budama-kanit`, `pazar-regresyon`, `sanayi-regresyon`, `mal-izdusumu-kanit`, `yerel-pazar`, protokol: 538 test gecti (2 onceden atlanan). `mal-izdusumu-kanit` ve `serilestir-goc` botlar paketi cozumu icin worktree'de `packages/botlar/node_modules/@bolge` baglariyla ayrica kosuldu ve gecti.
- tsc (cekirdek, protokol) ve eslint temiz. Bolge kipi altinlari (esik-budama, pazar/sanayi regresyon) birebir.
- Kanitlar: reddedilen komut durumu ve hazineyi degistirmez (her ret testinde ozet ve hazine karsilastirmasi); tohumlu rastgele komut kosusu (3 tohum, 120 adim, kabul ve ret yuzlerce): her adimda para korunumu TAM esitlik, dukkan/marka komutlari para hareketi yapmaz; blok yokken ve bolge kipinde komutlar reddedilir ve ozet degismez; dukkansiz perakendeli dunya = perakendesiz dunya (3 gun); kampanya (a)-(h): tek sicrama = parcali = gunlukten yeniden oynatma; arbitraj: birim gelir en yuksek kademe x R'yi asmaz, ithalat carpani c >= 1,035.

## dunya.html boyutu (baş lider kurali; kapi bos, tek build, ayni makine)

Taban 8042a58: 1322,6 KB ham / **377,8 KB gzip**; G7-3 ucu: 1330,2 KB / **379,4 KB gzip**. Fark: **+7,6 KB ham, +1,6 KB gzip** (butce 400 KB). Cekirdek kodu dukkanKomut.ts (+ komut.ts/yapi.ts kucuk eklemeler); ad kurali ve tablolar veride/ad.ts'te zaten vardi.

## Geri donusu zor kararlar

- `siniflar`/`yapi_yerlestir` siniflar commit'i (ayri dal) ile ayni `yapi_yerlestir` isleyicisine dokunuyor; iki dal birlesirken ufak elle birlestirme gerekebilir (yeni satirlar komsu).
- Hiz siniri: ilk doldurma/bosaltma muaf; `fiyatT` bos iken dolu yuvada ilk degisim muaf (sartname §7.5 "ilk doldurma ve bosaltma muaf"in dogal sonucu).
- Marka sayisi sinirini `dunyaIcerikUyumu`'na koydum (lider onayi); perakende yokken marka bulunmasi hata.

## Acik sorular

- `perakende-arbitraj` yalniz olculebilir yari (gelir tavani, c alt siniri) sinar; "ithal rafi sebeke ve NPC ithalatiyla etkilesmez" kismi `perakende-para` I5 ile (pazar durumu degismez) kapsanir. K3 karari.
- `docs/06` dukkan bolumu K3/T3 islerinde; bu islerde docs'a dokunmadim.
