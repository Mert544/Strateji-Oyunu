# yerlestir-cok-sinif (K4)

Dal: `takim/k4/yerlestir-cok-sinif`, taban `d13ba4a`, TEK commit (çekirdek + protokol + testler + bu rapor). Uç sha'sı için `git log -1`.

## Ne yapıldı

`yapi_yerlestir` komutuna isteğe bağlı `siniflar?: ArsaSinifi[]` eklendi (`hucreler` ile aynı uzunluk; `siniflar[i]`, `hucreler[i]`'nin sınıfı).

- Verilirse `alimPlani` her SAHİPSİZ hücreyi kendi sınıfında denetler ve KENDİ sınıf fiyatıyla fiyatlar; artımlı eğri sırası (liste sırası, dizgeye göre sıralı), ayrılmış hücre kuralları, 72 / %25 tavanları, günlük ayrılmış tavan aynen.
- Verilmezse bugünkü `sinif` yolu birebir: `AlimPlani.sinif` yerine `siniflar` (liste ile hizalı) tutulur, tek sınıflı çağrıda hepsi aynı sınıftır; fiyat hücre başına toplanır (eski toplamla tamsayı olarak aynı).
- `siniflar` hücre kimliğine göre eşlenir (komut listesi sıralanmadan önce), yani `hucreler` hangi sırada verilirse verilsin sonuç aynıdır.
- `sinif` alanı hâlâ zorunludur (şema eşitliği, yalnız ekleme); `siniflar` verilince yalnız geçerli bir değer olmalıdır, kullanılmaz.
- Sahip olunan hücrelerin sınıfı denetlenmez (bugünkü `sinif` davranışıyla aynı: yalnız satın alınacak hücreler denetlenir).
- Hata iletileri: uzunluk uyuşmazlığı `siniflar hucrelerle ayni uzunlukta olmali (n / m)`, dizi değil `siniflar dizi olmali`, bilinmeyen değer `gecersiz arsa sinifi`, yanlış sınıf `hucre sinifi uyusmuyor: <hücre> (<gerçek>, komut <istenen>)`.
- Protokol: `KomutSemasi`'na `siniflar: z.array(z.enum([...])).max(5).optional()` (yalnız ekleme); `_KomutDenetimi` eşit. `KOMUT_SEMASI` sözlüğüne `siniflar: "secim"`.
- Eski günlükler alanı taşımadığı için kural sürümü gerekmez. Bölge altınlarına dokunulmadı.

## Değişen dosyalar

- `packages/cekirdek/src/mulk/komut.ts` (alimPlani, alimUygula, yapi_yerlestir, başlık yorumu)
- `packages/cekirdek/src/tipler.ts` (`Komut`)
- `packages/cekirdek/src/komutSemasi.ts`
- `packages/protokol/src/komut-sema.ts`
- `packages/cekirdek/test/mulk-yerlestir-cok-sinif.test.ts` (yeni, 9 test)
- `packages/protokol/test/komut-siniflar.test.ts` (yeni, 5 test; dondurulmuş eski şema kopyası)
- `docs/agent-results/yerlestir-cok-sinif-k4.md`

## Ölçümler (kapı koşarken, tek işçi, hedefli)

- Yeni testler: çekirdek 9, protokol 5; hepsi geçti.
- Birlikte koşanlar: `mulk-yerlestir`, `para-guvenligi`, `mulk-ayrilmis-coklu-hesap`, `mulk-kamu`, `mulk-olcek-kilitsiz`, protokol paketinin tamamı: 183 test geçti.
- `packages/cekirdek/test/mulk*` ve `yontem*` toplu: 16 dosya, 190 test geçti (1 atlanan önceden de vardı). `serilestir-goc` bu worktree'de `@bolge/cekirdek` çözülemediği için yüklenemedi (botlar paketi, ortam artefaktı: worktree'de sembolik `node_modules`), değişiklikle ilgisi yok.
- `tsc --noEmit` (kök): çekirdek ve protokol dosyalarında hata yok (botlar/istemci hataları ortam kaynaklı, aynı artefakt). `eslint` değişen dosyalarda temiz.

## Test içeriği

Atomik başarı (arsa bedeli = her hücrenin kendi sınıf fiyatı, tek komut, inşaat başlar); ters sırada verilen çift aynı durum; zincirle (iki `parsel_al` + `tesis_insa_hucre`) aynı sonuç (hücreler, ilçeler, oyuncu arazi alanları, inşaat, hazine); karma sahiplik; `siniflar` yokken ve tek sınıflıyken birebir aynı özet; yapı denetimi başarısızsa (yetersiz stok, yetersiz hazine) hiçbir sınıftan arsa alınmaz, hazine ve hücreler değişmez; uzunluk uyuşmazlığı, yanlış/geçersiz sınıf, dizi olmayan değer, tekrar ve başkasının hücresi ret.

Not: zincir testinde `araziVergisi.surum` sayacı karşılaştırmadan çıkarıldı (muhasebe sürüm sayacı: gözlenen atomik 2, zincir 1); diğer tüm durum alanları eşittir.

## Geri dönüşü zor kararlar

- `sinif` alanı zorunlu kaldı ve `siniflar` varken yok sayılıyor (alternatif: `sinif`'i isteğe bağlı yapmak, şema eşitliği ve eski istemci uyumu için yapılmadı).
- `siniflar` en çok 5 öğe (`hucreler` ile aynı üst sınır).

## Açık sorular / öneriler

- `docs/06` ve `docs/11` komut açıklamalarında `yapi_yerlestir` için tek cümle (siniflar) eklenmeli; izin dışı olduğundan dokunmadım.
- İstemci `zincir.ts` bu komuta geçince "Arsa alındı ama … kurulamadı" yolu kalkar (K1).
