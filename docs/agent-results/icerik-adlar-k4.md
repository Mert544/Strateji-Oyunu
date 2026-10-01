# icerik-adlar (K4)

Dal: `takim/k4/icerik-adlar`, taban `87b01f0` (takim/k4/g6-3-icerik ucu). Uc sha'si icin `git log -1`.

## Ne yapildi

T3 ad yamasi (`SP/t3/ad-degisim.patch`, sha256 on 12 hane `bb9dd18c2a42`, uygulamadan once dogrulandi) DEGISTIRILMEDEN `git apply` ile uygulandi:
`packages/veri/icerik/icerik.json` (47 mal ve yontem `ad` alani cumle biciminde: "Demir Cevheri" -> "Demir cevheri", "Makine Parcasi" -> "Makine parcasi", "Mekanize Tarim" -> "Makineli tarim" vb.) ve `packages/veri/icerik/parametreler.json` (1 satir).
Ayni commit'te `packages/istemci/test/harita-f4-yapi.test.ts:56` beklentisi "Makine Parcasi 10" -> "Makine parcasi 10".

## Degisen dosyalar

- `packages/veri/icerik/icerik.json`, `packages/veri/icerik/parametreler.json`
- `packages/istemci/test/harita-f4-yapi.test.ts`
- `docs/agent-results/icerik-adlar-k4.md`

## Olcumler (kapi kosarken, tek isci, hedefli)

- Bolge altinlari birebir: `esik-budama-kanit` (12), `pazar-regresyon` (7), `sanayi-regresyon` (5), `mal-izdusumu-kanit`, `mulk-yapilar`: toplam 6 dosya 67 test gecti, hicbir altin degismedi.
- `packages/veri` paketinin tamami gecti (veri-hatti `izgara-manifest` "bhiCoz is not a function": worktree sembolik node_modules ortam artefakti, ad degisimiyle ilgisiz, onceki dallarda da ayni).
- `harita-f4-yapi`: 17 test gecti.
- Eski adlarin kalan kullanimlari: `packages/*/src` ve `packages/*/test` taramasinda (dondurulmus `fikstur-*` haric) yalniz test-yerel veriler (`il-imza.test.ts`, `dogrulama.test.ts` rezerv anahtari, `istemci/test/defter.test.ts` kendi `malAdi` tablosu) ve `istemci/src/harita/yerles.ts` icindeki iki sabit yapi adi ("Gida Fabrikasi", "Parca Fabrikasi", yapiAd) cikti; hicbiri icerikten okunmuyor ve testi kirmiyor.

## Geri donusu zor kararlar

Yok (yalniz gorunen ad degisimi; kimlikler ve sayilar degismedi, `kuralSurumu` veri JSON'undan hesaplandigi icin degisir).

## Acik sorular

- `packages/veri/icerik/kimlik-listesi.json` icinde `parca` icin "Makine Parcasi" adi var (yama bu dosyaya dokunmuyor; `ad` alani istege bagli ve icerikle karsilastirilmiyor). Tutarlilik icin lider karar versin.
- `istemci/src/harita/yapi.ts:273` yorumu ve `istemci/src/harita/yerles.ts` yapi adlari (yetki disi dosyalar) K1'e not.
