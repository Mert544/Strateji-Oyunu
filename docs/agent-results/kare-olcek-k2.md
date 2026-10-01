# kare-olcek: tesis ölçeği karede ve ölçek inşaatı tür düzeltmesi (K2)

Dal: `takim/k2/kare-olcek`, taban `entegrasyon` (8064ded). Yalnız `packages/protokol/**` (K2 sahipliği).

## Yapılanlar
1. **Protokole ekleme (`PROTOKOL_SURUMU` değişmez), nesne alanı olarak.** `OzelBolgeKaresi.tesisOlcek?: Array<[id: number, olcek: 1 | 2]>`: yalnız ölçeği
   S olmayan (M = 1, L = 2) tesisler listelenir, listede olmayan tesis S'dir; hiç M/L tesis yoksa alan YAZILMAZ. Şema (`mesajlar.ts`) alanı `.optional()`
   ekler. `OzelBolgeKaresi.tesisler` demeti 6 öğe KALIR.
   - Gerekçe (Kod lideri düzeltmesi): istemci her sunucu mesajını `sunucuMesajiCoz` (zod) ile doğrular ve zod 3 `z.tuple` fazla öğeyi REDDEDER;
     demete öğe eklemek eski istemcinin kareyi tümden atması demektir. `z.object` ise bilinmeyen anahtarı atar, reddetmez. (İlk uygulamam 7. demet
     öğesiydi; "eski istemci fazladan öğeyi yok sayar" notu yanlıştı, geri alındı.)
   - Kural: protokolde demetlere öğe eklenmez, yeni veri isteğe bağlı nesne alanı olarak gelir.
2. **Değer düzeltmesi (`kare.ts`, ilçe karesi hücre türü).** Ölçek inşaatında (`tur === "olcek"`) `hedef` TESİS KİMLİĞİDİR, tür indeksi değil;
   eski kod `tesisTurleri[hedef]` okuyordu, ek hücreler yanlış (çoğu zaman boş) tür adıyla görünüyordu. Artık tür, hedef tesisten alınır
   (ek yapı yükseltiliyorsa onun türü). Demet yapısı değişmedi.

## Testler
- `protokol/test/protokol.test.ts`:
  - `tesisOlcek`: M/L listelenir, S ve tanımsız listelenmez; alan boşsa anahtar hiç yazılmaz; yalnız sahibine; delta ile taşınır; geçersiz kademe (3) reddedilir;
    bütün `ozel.tesisler` demetleri 6 öğeli.
  - GERİYE UYUM: entegrasyon 8064ded'in bölge karesi şeması test içinde dondurulmuş kopya olarak durur; yeni sunucu karesi JSON'dan geçirilip o
    şemadan `tamam` ile geçer (yeni alan sessizce atılır). Aynı testte demete öğe eklenirse eski şemanın reddettiği gösterilir; ileride birinin demete
    öğe eklemesi bu testi kırar.
- `protokol/test/kare-mulk.test.ts`: S mera yükseltilirken ilçe karesinde ek hücre ve tesis hücreleri "mera" türüyle görünür (sahibine ve izleyiciye).
  Düzeltme olmadan bu test kırılıyordu (tür boş geliyordu); düzeltmeyle geçer.

## Doğrulama (bu worktree)
- `npx vitest run` (hedefli, tek işçi): protokol (2 dosya, 24 test), sunucu `mulk-iki-istemci`, `mulk-goruntu`, `iki-istemci`; istemci
  `komut` (istemci komut testi, 33 test), `kare`, `harita-f4-ws`, `harita-mulk`, `mulk-panel`. Toplam 10 dosya, 92 test geçti.
- `tsc --noEmit` (kök) ve `pnpm --filter @bolge/istemci tipkontrol`: temiz. `eslint packages/protokol`: temiz.
- `pnpm dunya` önce/sonra: BU DALDA KOŞULMADI. Kapı kilidi 18:28'den beri doluydu ve "kapı koşarken sessizlik" kuralı (dunya yasak) geçerliydi.
  Bu değişiklik `packages/protokol/` altında olduğundan kapı `pnpm dunya` boyutunu ve Playwright'ı kendiliğinden koşar; önceki ölçüm kapı
  sonuç dosyasındaki bir önceki birleşimdir. İstenirse kapı boşken tek koşu yaparım.

## Aynı yanlış okuma başka yerde (K2 sahipliği dışı; yalnız bildirim)
- `packages/botlar/src/parsel.ts:227` ve `:429`: `i.hucreler !== undefined` süzgeci `tur === "tesis"` ayrımı yapmaz. Ölçek inşaatında
  `hucreler` tanımlıdır (ek hücreler, boş olabilir) ve `hedef` tesis kimliğidir; `tesisTurleri[i.hedef].id` / `bilgi.tur[i.hedef].yontemler`
  tanımsız bir öğeye gidebilir (TypeError) ya da yanlış türü sayar. Çözüm: `i.tur === "tesis"` süzgeci (K3/botlar).
- `packages/sunucu/src/donus/izleyici.ts:59` ve `packages/istemci/src/{arayuz/komut-govde.ts:120,isci/kare.ts:90}` `i.tur === "tesis"` ile korunuyor; sorun yok.
- `kare.ts:370` (oyuncu karesi `insaatlar` demeti) ham `hedef`'i taşır; anlamı türe göredir ve tipin belgesinde "tür: tesis | kenar | olcek | onarim" diye
  belirtilir. İstemci okurken `tur`'a bakmalıdır (K1 G2).
