# G3b (K3): kompakt hücre dizini, BHI1'den dünya

Dal: `takim/k3/hucre-dizini` (G3 sonrası taban 7553b55; ilk yazım 8064ded üzerindeydi). Tasarım: docs/06 §15.11. Boyut: M (L'ye yakın).

## 1. Ne değişti
- `@bolge/veri`: `izgara.ts` (saf BHI1 okuyucusu: `bhiCoz`, `Bit`, `arsaSinifi`, `engelAdi`, `ilceSinifiTuret`, `ParselIzgaraGirdisi`, `parselIzgaraHatalari`); girdi açılmış `Uint8Array`, Node bağımlılığı yok. `veri/saf`'tan da dışa açık.
- `@bolge/cekirdek`: `mulk/hucreDizini.ts` (`HucreDizini`, `AyrilmisKumesi`, `HucreDiziniBuyukHatasi`, `TEMBEL_HUCRE_SINIRI = 50 000`); `CekirdekVeriPaketi.parselIzgara?` (`parsel` ile birlikte verilemez); `DerlenmisMulk.dizin`; `hucreler` ve `ayrilmis` aynı tip adıyla uyum görünümleri.
- `kamu.ts`, `geometri.ts`, `yurt.ts`, `serilestir.ts`, `derle.ts` dizinden çalışır. `sunucu`, `istemci`, `protokol`, `botlar`, `olcum` dosyalarına DOKUNULMADI.
- Yazma yolu (komut.ts, ayrılmış hücre fiyatı) değişmedi: dizin ayrılmış üyeliğini (`has`, `size`, yineleme sırası) bugünkü Set ile aynı verir; fiyat davranışı aynen korunur.
- Ölçüm betiği: `packages/cekirdek/bench/hucre-dizini-olcum.ts`.

## 2. Kanıtlar (testler `cekirdek/test/hucre-dizini.test.ts` 49 test, `veri/test/izgara.test.ts` 9 test)
- Ayrılmış eşdeğerliği: mini-6, sentetik-50, yoğun 70x70; ppm {1, 200 000, 333 333, 999 999, 1 000 000}; kamu açık/kapalı: `has`, `size`, yineleme sırası, ilçe sayıları ve listeler eski Set (test içi referans) ile aynı; `add/delete/clear` örtüsü; "10:2" < "9:1" tuzağı (karma eşitliği eşik grubunun ortasında).
- Kamu sahip numarası ve kıyı sırası: kamu kümeleri (sahip, tür, kıyı) JSON ve dizin yolunda aynı; `mulk-kamu*` testleri değişmeden geçer.
- Bayt eşlemesi: 256 bayt için çekirdek kopyası = `@bolge/veri` = istemci `bhiCoz/durumSinifi/arsaSinifi/satinAlinabilir`.
- Dünya eşdeğerliği: aynı BHI1'den ızgara girdisi ve JSON fikstürü 12 kontrol noktasında AYNI tam `durumOzeti` ve aynı komut sonuçları (bedava yurtlu katılımlar, `parsel_al`, `yapi_yerlestir`, `parsel_birak`; kamu + ayrılmış hücre var). 60x60 ve Gebze'nin ~1/10'u (~54 bin hücre, kapı boyutu; bellekte üretilir, depoya ikili girmez). Ters hücre sırası aynı özeti verir; anlık görüntü ızgara→JSON yüklemesi aynı özet.
- Getter: ≤ 50 bin hücrede dizi (numaralandırılamaz); büyükte `HucreDiziniBuyukHatasi` ("... ilceHucreleri() ya da hucreDurum() kullan"); komut ortasında atılırsa dünya, hazine ve günlük değişmez (parsel_al, yapi_yerlestir, oyuncu_katil).
- tsc (tüm depo) ve eslint temiz. Hedefli koşular geçti: cekirdek mulk*/kamu/para/kurulum/mal-kimlik/serilestir-temel/sanayi-regresyon/cozum-onbellek, botlar parsel + pazar-regresyon, protokol, sunucu (kamu, katil, katilim-ilcesi, mulk-goruntu, parsel-dosya), veri (parsel*, kimlik-listesi), olcum parsel-kosu (2 test `BOLGE_AGIR_TEST` bayrağıyla atlanır; önceden var).
- Altın ve bölge kipi özetleri değişmedi (hiçbir altın dosyası düzenlenmedi).

## 3. K2 için: büyük BHI1 ilçesinde `tanim.hucreler` hata atar
| Yer | Kullanım | Çözüm |
|---|---|---|
| `protokol/src/kare.ts:272-273` | `mk.ilceler.get(ilce).hucreler.filter(ayrilmis).map(id).sort()` | `mk.dizin.ayrilmisListe(ilce)` (önbellekli, kimliğe göre sıralı) |
| `botlar/src/parsel.ts:335, 349, 697, 772` (O2 dosyası) | `ilce.hucreler` / `tanim.hucreler` | `mk.dizin.ilceHucreleri(id)` ya da `hucreDurum(x, y)` |
| `sunucu`, `istemci`, `olcum/src` | `ilceler.get(id).hucreler` kullanımı YOK (`mulk.hucreler.get(id)?.ilce` uyum görünümüyle çalışır) | gerekmez |
| `cekirdek/src/mulk/kasa.ts:167` | `mk.fikstur.ilceler` yalnız `il`, `id` okur (getter tetiklenmez) | gerekmez |
Not: JSON fikstür dünyasında hiçbiri değişmez. Küçük (≤ 50 bin hücre) BHI1 ilçesinde getter çalışır.

## 4. Ölçümler
Betik: `packages/cekirdek/bench/hucre-dizini-olcum.ts` (kullanım dosya başlığında; çıktı sonunda tek satır `SONUC {json}`). İki biçim, aynı komut:
```
node --expose-gc --max-old-space-size=6144 --import tsx packages/cekirdek/bench/hucre-dizini-olcum.ts --bicim json   [--uc-ilce] [--oyuncu 20]
node --expose-gc --max-old-space-size=6144 --import tsx packages/cekirdek/bench/hucre-dizini-olcum.ts --bicim izgara [--uc-ilce] [--oyuncu 20]
```
- "Önce" = 8064ded çıkışında `--bicim json` (betik dosyası oraya kopyalanır; yalnız `Simulasyon` ve `miniVeriyiYukle` kullanır). "Sonra" = bu dalın ucu (bd4dbca + sonrası) `--bicim izgara`. İki biçimin `OZET` (durumOzeti) satırı AYNI olmalıdır.
- `--uc-ilce`: Gebze + Körfez + Gemlik (`packages/veri/haritalar/odbl/izgara/` altında; G3 girdisi; `IZGARA_DIZINI` ile başka klasör).
- Ölçüm O2 AĞIR satırında koşar (ÖNCE ve SONRA, 3'er tekrar; Kod lideri istedi). Kapı koşarken koşturulmaz. Süreler iş parçacığı CPU süresidir; bellek `gc()` sonrası `memoryUsage` + `resourceUsage().maxRSS`.

Ara sonuç (K3, tek koşu, Gebze, BHI1 yolu, 508 634 hücre; makine yükü ~16, paylaşımlı; CPU süresi yükten az etkilenir, RSS değil):

| ölçüt | değer |
|---|---|
| `Simulasyon.olustur` | 566 ms CPU, 888 ms duvar |
| RSS / heapUsed (kurulum sonrası, gc sonrası) | 118 MB / 11 MB (tepe RSS 145 MB) |
| yurt (`oyuncu_katil`, 20 ardışık) | CPU p50 913 ms, p95 1208 ms, en yüksek 1236 ms |
| yurt sonrası RSS / tepe RSS | 485 MB / 665 MB (geçici; heapUsed 11 MB) |
| yurtta süre dağılımı | `kumeSec` ≈ 1,08 sn, aday listesi ≈ 65 ms, `ilceMerkezi` ≈ 24 ms |
| `OZET` | 271481a23f2c5df6 |

Önce (JSON, 8064ded) ve üç ilçe (BHI1) sonuçları: **O2 AĞIR satırında; sonuç gelince bu tabloya eklenir (yer tutucu).** Yurt süresi dizinle değişmez (algoritma aynı); yurt halka dalı ayrı (aşağıda).

## 5. `pnpm dunya` önce / sonra (aynı ağaç, tek koşu) ve istemci boyutu düzeltmesi
| | önce (8064ded) | ilk teslim (bd4dbca; eski 701e938) | düzeltme (bu uç) |
|---|---|---|---|
| `istemci/dunya.html` | 1304,6 KB / gzip 372,5 KB | 1315,1 KB / gzip 376,1 KB (+3,6) | 1292,6 KB / gzip 367,6 KB (-4,9) |
| `dist/assets/index-*.js` | 1241,5 KB / 359,0 KB | 1252,1 KB / 362,7 KB | 1229,5 KB / 354,3 KB |
| `gorunum-*.js`, `harita.js`, `yuru.js` | aynı | aynı | aynı |
Bütçe 400 KB gzip: tamam (367,6 KB).

**Modül dökümü** (geçici betik, commit'lenmedi: vite `generateBundle` kancasıyla `chunk.modules[*].renderedLength`; `mode: "tek"`; hem ana pakette hem `worker.plugins` ile işçide). Tarayıcı simülasyon işçisi (`sim.worker`, ana pakete satır içi gömülü):
| işçi paketi | ham | gzip | `hucreDizini.ts` | `mulk/kamu.ts` | `derle.ts` |
|---|---|---|---|---|---|
| önce | 299 849 | 90 470 | - | 21 512 | 9 553 |
| ilk teslim | 310 662 | 94 064 | 23 358 | 22 431 | 8 387 |
| düzeltme | 287 594 | 86 259 | 389 | 3 427 | 4 329 |
Kaynak: artışın TAMAMI çekirdekteki `HucreDizini` sınıfından (tek başına küçültülmüş ~12 KB, gzip 4,5 KB) gelir; `veri/src/izgara.ts` işçiye yalnız 245 bayt girer (BHI1 okuyucusu ağaç sallamayla düşer; ayrı `@bolge/veri/bhi` girişine gerek kalmadı). İstemci işçisi `Simulasyon.olustur`'u parselsiz (bölge kipi) çağırır, ama `derle.ts` `mulkDerle`'yi statik gösterdiği için mülk kipi kodu (kamu, dizin) pakete giriyordu.
**Çözüm:** `derle.ts`'te derleme zamanı anahtarı `__BOLGE_MULKSUZ__` (vite `define`, yalnız `command === "build"`; `packages/istemci/vite.config.ts`'te 3 satır): true iken `mulkDerle` parsel dünyası açmayı okunur hatayla reddeder, böylece `HucreDizini` ve yalnız `mulkDerle`'den erişilen kamu kodu istemci işçisinde ağaç sallamayla düşer. Sunucu, testler, ölçüm ve geliştirme sunucusunda sabit TANIMSIZDIR: mülk kipi tam çalışır, davranış ve altınlar değişmez; `hucre-dizini.test.ts` 4c anahtarı true/tanımsız olarak sınar. `kamu.ts` dizin ayrımı `instanceof` yerine yapısal (`"ilceNo" in f`) yapıldı (sınıf değeri okunmasın). Sonuç: işçi önceki sürümden de küçük (-4,2 KB gzip), hücre dizininin istemciye net maliyeti negatif (hedef ≤ +1 KB). Yan etki: istemci işçisi artık mülk kipini hiç taşımaz; tarayıcı yerel mülk simülasyonu gerekirse (ör. çevrimdışı parsel demo) anahtar kaldırılmalıdır (şu an böyle bir yol yok: `sim.worker.ts` parselsiz).

## 6. Yurt süresi (BHI1 yolunda) ve halka önerisi
(a) BHI1 yolunda yurt: katılım başına CPU p50 0,91 sn, p95 1,21 sn; geçici tepe RSS 665 MB (Gebze, 508 bin hücre). Neden: `ilcePlani` tüm uygun serbest hücreleri aday listesine alır (486 bin nesne) ve `kumeSec` hepsini (uzaklık², kimlik) sıralayıp `Map`'e koyar, oysa küme 6 hücredir. Bu davranış dizinden önce de vardı (algoritma değişmedi).
(b) Öneri (docs/06 §15.11 sonundaki "Yurt halka araması"): merkezden dışa yarıçapı ikiye katlayan halkalarla tohumları (uzaklık², kimlik dizesi) sırasıyla üret; bileşen kararını n'de kesen taşkın doldurmayla ver; üyelik yüklemini doğrudan dizinden/dünyadan sor; sonuç eski `kumeSec` ile birebir aynı (tümevarım kanıtı + eski işlev test içinde kâhin + geniş fark testi). Beklenen: katılım başına 10-30 ms CPU, geçici bellek < 5 MB; 20 eşzamanlı (ardışık işlenen) katılımda p95 ≤ 300 ms hedefinin çok altında. Dal: `takim/k3/yurt-halka` (Kod lideri/baş lider onayladı; sıra: hücre dizini → yurt-halka → test-bol → G6).

## 7. Başka
- `veri-hatti/test/izgara-manifest.test.ts`: `bhiCoz` içe aktarması `@bolge/veri`'ye çevrildi (G3 entegrasyonda; yeniden tabanlandı, başka satır değişmedi; `izgaraSay` istemciden kalır). İstemci `bhiCoz` değişmedi (eşdeğerlik testi bağlar).
- T3 sinyalleri (keşifte): `mal-izdusumu-kanit` "bilinmeyen mal: un" ve `mulk-yapilar.test.ts:50` G6 şema dalında ele alınır; bu dalda DEĞİŞMEDİ.
- Satır sonu LF; test verisi bellekte üretilir (depoda ikili dosya yok, tüm dosyalar < 1 MB).
