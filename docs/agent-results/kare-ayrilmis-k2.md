# kare-ayrilmis: ilçe karesinde `ayrilmisSatilmis` (K2)

Dal: `takim/k2/kare-ayrilmis`, taban `entegrasyon` 7553b55 (kare-olcek dahil; `kare-mulk.test.ts` çakışması iki dalın testleri korunarak çözüldü). Yalnız `packages/protokol/**`; çekirdeğe dokunulmadı.

## Yapılan (yalnız ekleme, `PROTOKOL_SURUMU` değişmez)
`IlceKaresi.ayrilmisSatilmis?: number` (isteğe bağlı nesne alanı; şemada `.optional()`): `satilmisHucre`'nin PARA ile satılmış AYRILMIŞ hücre kısmı. Parsel fiyat eğrisi
`satilmisHucre − ayrilmisSatilmis + k` üzerinden ilerler (çekirdek `hucreFiyatiMili`); istemci artık eğriyi karedeki iki alandan kurabilir. Değer 0 ise alan YAZILMAZ.

## Çekirdek durumundaki yeri (doğrulandı)
`IlceDurumu.ayrilmisSatilmis` (`tipler.ts`) çekirdek durumunun kendisidir, türetme gerekmedi: `parsel_al` ayrılmış hücre alınca artar (`mulk/komut.ts` `plan.ilce.ayrilmisSatilmis += plan.ayrilmis`),
parsel bırakılınca azalır, 0 olunca silinir (yalnız > 0 iken yazılır; kare de aynı kuralı izler). Yurt (`mulk/yurt.ts`) bedelsiz hücreleri `satilmisHucre`'ye ekler ama bu sayaca YAZMAZ:
yurt, ayrılmış hücreyi yedek olarak içerse bile sayılmaz. Delta: `ilceAyni` karşılaştırması kalan alanları JSON olarak kıyasladığı için alan kendiliğinden delta ile taşınır.

## Testler (`protokol/test/kare-mulk.test.ts`, hedefli, tek işçi: protokol 2 dosya, 24 test geçti)
- Değer: yeni oyuncu katılım ilçesinde PARA ile ayrılmış hücre alınca alan 1 olur (çekirdek durumuyla aynı, `satilmisHucre` 1); sonra normal hücre alınca `ayrilmisSatilmis` 1 kalır, `satilmisHucre` 2 olur (fiyat eğrisi sayacı = 1); alan 0 iken anahtar yok; `deltaUygula(a, kareFarki(a, b)) = b`; şema geçerli.
- Yurt: bedelsiz yurt (4 hücre) `satilmisHucre` 4 yapar, `ayrilmisSatilmis` alanı yazılmaz ve çekirdekte tanımsız kalır (bu durum üretilebildi, açıkça sınandı).
- Geriye uyum: entegrasyon 8064ded ilçe karesi şemasının dondurulmuş kopyası yeni kareyi kabul eder; alan sessizce atılır.
- `eslint packages/protokol`: temiz. Tam `tsc` kapı koşarken koşulmadı (sessizlik kuralı); yalnız ekleme ve isteğe bağlı alan.

Not: bu worktree'ye `pnpm install` yerine `node_modules` sabit bağlarla (`cp -al`) kuruldu (kapı koşarken install yasaktı).
