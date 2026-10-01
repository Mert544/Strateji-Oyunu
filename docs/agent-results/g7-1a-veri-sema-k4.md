# g7-1a-veri-sema (K4): `mulk.perakende` veri şeması ve V1-V12

Dal: `takim/k4/g7-1a-veri-sema`. Taban: `takim/k3/g6-1-sema` 5913d68. Kaynak: şartname `takim/a3/p4-p5-sartname` §4.2, §4.3, §4.5, §17.2 G7-1 (+ A3 8d6a615 §6.5 nüfus alanı).

## Kapsam ve değişen dosyalar (yalnız `packages/veri/src/**` ve yeni testler; HİÇBİR JSON değişmedi)
- `veri/src/tipler.ts`: `MulkPerakendeParametreleri`, `DukkanOlcegi`, `DukkanTuruTanimi`, `YerelTalepParametreleri`, `BayramDalgasi` (şartname §4.3 adlarıyla) ve `MulkParametreleri.perakende?`.
- `veri/src/sema.ts`: `perakendeSema` (T3'ün şema varsayımı üstüne: `olcekler` tam 3'lü demet, `.strict()` her düzeyde; seviye/teknoloji/önkoşul alanı şemada yok) ve `mulkSema.perakende` (isteğe bağlı). Biçim denetimi burada, aralık ve içerik çaprazları Katman 2'de. `Karsilikli<z.infer, Parametreler>` tür eşitliği tsc'den geçer.
- `veri/src/perakende-dogrula.ts`: V1-V12 (`perakendeKurallari`; blok yoksa yalnız "dukkan tek başına olamaz"), V13'te raf (H) tüketici sayılır (`perakende.dukkanTurleri[].mallar`), başlık güncellendi. İletiler şartname §4.5 tablosundaki biçimle ("perakende: ekYapilar.dukkan ile birlikte tanimlanmali", "perakende.talep: raf malinin talebi yok: <mal>", "perakende: kilit alani yasak: <yol>", "perakende: mal listeleri ic ice degil: <tur>" ...); tablonun tek iletiyle verdiği kurallarda alt durumlar için bu biçimde ek iletiler (bilinmeyen mal, depolanamaz mal, yinelenen kimlik/mal, bayram sapması ...).
- `veri/src/kimlik-listesi.ts`: `dogrulaKimlikKilidi` `perakende.dukkanTurleri` kimliklerini artık yapısal cast'siz (tipli) okur (davranış aynı).
- `veri/src/parsel.ts` ve `veri/src/izgara.ts` (A3 §6.5, V9b): `ParselIlceTanimi.nufus?` ve `ParselIzgaraIlce.nufus?`, tamsayı 1..`ILCE_NUFUS_ENCOK` (20 000 000); zod ve `parselIzgaraHatalari`. Aynı fikstür hunk'ı ayrı dalda da var (`takim/k4/ilce-nufus-sema` 07684f6; özdeş metin, çakışmaz).
- Zaten vardı (G6-1): `MulkEkYapiTanimi.olcekHucre?` tipi, zod şeması ve `dogrulaParametreler` kuralı (§4.2: [0] = yuva, monoton, <= 5); G7-1a bunu yalnız TESTLE sabitledi (`[1,2,3]`, `[1,1,1]`, yok geçerli; `[2,2,3]`, `[1,3,2]`, `[1,2,6]`, 2 ve 4 elemanlı demet ret).
- Yeni testler (`veri/test/perakende-g7-*.test.ts`, 32 test; `dogrulama`, `kimlik-listesi`, `perakende-dogrula` testlerine DOKUNULMADI): `perakende-g7-sema` (9: no-op, geçerli blok, `.strict()` her düzeyde, tür/değer, olcekHucre, kimlik kilidi), `perakende-g7-dogrula` (20: V1-V12 ve V13 raf; her kural için geçerli temel pakette tek bozma), `perakende-g7-nufus` (3), yardımcı `perakende-g7-yardimci.ts` (bellekte geçerli blok; JSON'a bağımlı değil: `perakendesizPaket` bloğu bellekte siler).

## Doğrulama
- vitest (tek işçi, hedefli): `perakende-g7-*` 32/32, mevcut `perakende-dogrula` 11, `dogrulama` 34, `kimlik-listesi` 39, `parsel` 14, `izgara` 9 geçti.
- **T3 G7 yaması** (`SP/t3/g7-perakende.patch`) bellekte değil çalışma ağacına UYGULANIP denendi (sonra geri alındı, JSON commit'e girmedi): hem 8bfb39560c4b (Kod liderinin bildirdiği) hem dosyanın o andaki hâli bdb055aa7975 ile `miniVeriyiYukle`, `varsayilanVeriyiYukle` ve `gercekVeriyiYukle`: yükleme tamam, `dogrulaPerakende` hata yok ve perakende uyarısı yok, `dogrulaKimlikKilidi` geçer (V9 bayram aralığı temiz); `dogrulama`, `kimlik-listesi`, `perakende-dogrula` ve yeni testler yamayla da yeşil (116/116). Eski iz 0d9550c3933e ile de geçmişti.
- eslint (`packages/veri`) 0 hata; `tsc` yalnız `packages/veri` kapsamı için 0 hata (worktree'nin `node_modules`'u başka bir K4 worktree'sine sembolik olduğundan paket genelinde tsc anlamlı değil; kapıda koşar). `pnpm install` yapılmadı.
- Bundle: `perakende-dogrula.ts` Katman 2'dir (`saf.ts` içe aktarmaz; istemciye girmez). Yalnız `sema.ts` ve `tipler.ts` büyüdü (şema ≈ +1,5 KB gzip tahmini; `dunya.html` ölçümü kapıda).

## Kararlar ve gözlemler (K3/A3/T3 için)
1. T3'ün "gida/yapi" mal-grup verisi için şemada `gruplar` anahtarı `kimlik` biçimindedir (küçük ASCII); V9 grup kapsaması sorgular: her talep malı TAM bir grupta, grup malları ve talep malları içerikte.
2. V8 "açık ölçeklerle tutarlı": her açık ölçeği en az bir tür taşımalı; `olcekAraligi` boş/yinelenen olamaz; `acikOlcekler` tekil (şartname metninden türetilen ek sıkılık; T3'ün `[0]`/`[0]` verisi geçer).
3. V11 taraması anahtar adlarında `seviye|teknoloji|onkosul|oncekitur|yukseltmesarti|kilit` arar; mal kimliği anahtarlı kayıtlar (`talep1000Saat`, `insaMaliyeti`) ve grup adları taranmaz. Şema zaten `.strict()` olduğundan bu tarama savunmadır.
4. V12 (dukkan inşa malzemeleri içerikte): `dogrulaParametreler` ek yapı malzemelerini denetlemiyordu (çekirdek `icerikDerle` hata fırlatıyordu); artık `dukkan` için veri katmanında da denetlenir (yalnız `dukkan`; diğer ek yapılar dokunulmadı).
5. `dukkan` `insaMaliyeti.pencere` T3 yamasındadır; `pencere` malı içerikte var (G6-3 sonrası değil, bugün de).

## Kapsam dışı (G7-1b, K3 G6'dan sonra)
`cekirdek/src/tipler.ts`, `DerlenmisPerakende`, komut tipleri, K2 zod satırları.

## Geri dönüşü zor karar / açık soru
Yok.
