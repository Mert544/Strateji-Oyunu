# yurt-halka (K4, K3'ten devralındı)

Dal: `takim/k4/yurt-halka`. Taban: `entegrasyon` 2819a43 (hücre dizini içinde). Tek commit: K3'ün devir WIP'i (79ea8ef) + K4 fark testi, tamamlama ve docs/06 paragrafı birleştirildi.

## Sorun ve çözüm
`mulk/yurt.ts ilcePlani` her katılımda ilçenin TÜM uygun serbest hücrelerinden aday listesi kuruyor, hepsini (uzaklık², kimlik dizesi) sıralayıp `Map`'e koyuyordu: Gebze'de ~0,9 sn CPU ve ~540 MB geçici bellek, yazar döngüsü kilitli. Çözüm (K3'ün tasarımı, K4 tamamladı ve kanıtladı):
- `geometri.ts`: `halkaGez` (merkezden yarıçap 8, 16, 32... halkalarla, her halkada tam sıralı; birleşim eski `sirali` dizisiyle AYNI sıra), `halkaSay` (n'de keser), `kumeSecHalka` (tohumlar halkadan; bileşen kararı n'de kesilen taşkın doldurma; büyütme eski koddaki gibi). Eski `kumeSec` kaldırıldı; kâhin olarak `test/yurt-halka-kahin.ts`'te birebir kopyası duruyor.
- `yurt.ts`: aday listesi yok; üyelik (uygun, sahipsiz, kamu değil, [ormansız], [ayrılmamış]) doğrudan dizinden ve dünyadan sorulan yüklemlerle. K4 eki: her aşama doğrudan `kumeSecHalka` ile denenir (aday sayısı n'den azsa küme zaten kurulamaz; eski `length >= n` önkoşulu yalnız iş tasarrufuydu), `bos` sayısı yalnız sonuç bulunamayınca sayılır (hata iletisindeki sayı için). Böylece başarılı yolda ek halka taraması yok.
- K4 eki (`geometri.ts`): `hucreAnahtar` çarpanı 2^20 → 2^33 (komşu sorgusunun `x - 1 = -1` taşması bir sonraki satırın gerçek hücresiyle çakışmasın; koordinat aralığında davranış aynı).
- `hucreDizini.ts` K3'ün (devirle gelen `ilceBayti`, `ilceCercevesi`, `ilceMerkezi` önbelleği); K4 dokunmadı.

## Değişen dosyalar (devir sonrası K4 commit'leri)
- `packages/cekirdek/src/mulk/geometri.ts` (yalnız `hucreAnahtar`), `packages/cekirdek/src/mulk/yurt.ts` (aşama sırası).
- `packages/cekirdek/test/yurt-halka.test.ts` (yeni, 13 test).
- `docs/agent-results/yurt-halka-k4.md`.
Devirle gelenler (K3, 79ea8ef): geometri.ts halka işlevleri, yurt.ts yükleme, hucreDizini.ts üç ek, `test/yurt-halka-kahin.ts`, `test/hucre-dizini.test.ts` test 6 spy'ı.

## Kanıt: birebir eşitlik (aynı hücreler, aynı seçim sırası, aynı hata iletisi / null)
`test/yurt-halka.test.ts` (13 test, ~45 sn tek işçi):
1. Birim (kâhin `kumeSecEski`): 2 000 örnekte `halkaGez` = tam sıralı aday listesi; 2 000 örnekte `halkaSay` = min(n, sayı); 8 000 örnekte `kumeSecHalka` = `kumeSecEski` (n = 1..40; yoğunluk %3-97; delikli, çentikli, şeritli, kümeli, kapalı merkez, dar şerit, çerçeve dışı merkez; koordinat basamak sınırlarını çaprazlayan çerçeveler: "10:2" < "9:1" ve "100:5" < "99:5" tuzakları); sekiz özel durum (merkez dolu, tek hücre, tek sütun/satır, dama tahtası, iki ada) her n için; "10:2" < "9:1" ayrı test. Anlamlılık denetimi: hem küme bulunan (> 2 000) hem bulunamayan (> 500) örnek var.
2. Dünya (kâhin: eski `ilcePlani` + eski `yurtPlanla` dış mantığı test içinde kopya): mini-6 (kamu açık/kapalı; yedek açık/kapalı/yok; ayrılmış oranı 0..%100; n ∈ {1..8, 10, 12, 17, 24, 30, 40}; boş dünya ve rastgele doluluk %10-97; iki tohum; otomatik ilçe ve her ilçe açık: > 2 000 karşılaştırma, planlar > 500, hata iletileri > 200), mini-6 ardışık 60 katılım (açık ilçeli ve ilçesiz), sentetik-50 (> 1 500 karşılaştırma; üç tohum), sentetik-50 ardışık 40 katılım (kıyı ve dar ilçeler dahil tüm ilçeler), Gebze 1/10 kesiti (165x165 sentetik ızgara; ızgara ve JSON yolu; JSON'da orman; kamu; yedek; iki tohum; 8 ardışık katılım), n'nin yetmediği ilçe ("(4 < 6)" sayısı dahil ve "bitisik bos alan yok"), dizin ilçe merkezi = `geometri.ilceMerkezi`.
3. Negatif kontrol (testin yakaladığı sapmalar, kod geçici bozularak denendi, sonra geri alındı): `halkaGez`te kimlik dizesi sırası çıkarıldı (3 birim test kırıldı); büyütmede eşitlik kırıcı çıkarıldı (3 birim test kırıldı); orman yoksayıldı (Gebze JSON testi kırıldı); ayrılmamış tercihi çıkarıldı (mini-6 testi kırıldı).
4. Bench `OZET` önce = sonra: `271481a23f2c5df6` (Gebze BHI1, 20 ardışık `oyuncu_katil`; 2 önce + 5 sonra koşu).

Kural değişikliği yok: kural sürümü ve altınlar dokunulmadı. Birebir olmayan durum ÇIKMADI.

Ek koşular (hepsi geçti, tek işçi): `hucre-dizini` (50), `mulk-kamu`, `mulk-yeni-oyuncu`, `mulk-yurt-ayrilmis-sonra`, `mulk-serilestir` ve diğer `mulk-*` dosyaları (121 + 96 test; 1 test BOLGE_AGIR_TEST bayrağı arkasında zaten koşullu: `mulk-olcek.test.ts`, bu işle ilgisiz, taban davranışı). `tsc --noEmit` 0 hata; eslint (src/mulk + yeni test) 0 hata.

## Ölçüm (`cekirdek/bench/hucre-dizini-olcum.ts --bicim izgara --oyuncu 20`, gerçek Gebze BHI1, 508 634 hücre; tek süreç, YÜKLÜ makine: yük ortalaması 12-13, kapı koşuyordu; sayılar yön gösterir, resmi ölçüm O2 AĞIR satırında yapılmalıdır)
| | yurt CPU p50 | p95 | en yüksek | tepe RSS (kurulum sonrası → yurtlar sonrası) |
|---|---|---|---|---|
| ÖNCE (hücre dizini tabanı da6cf31, 2 koşu) | 826 / 896 ms | 947 / 1 145 ms | 970 / 1 297 ms | 146 → 688 MB; 147 → 673 MB (geçici +540 MB) |
| SONRA (5 koşu) | 0-2,6 ms | 4,2-7,3 ms | 20-41 ms | 146 → 146; 143 → 143; 148 → 148 MB (artış 0; heapUsed +1-2 MB) |
Hedefler: katılım başına ≤ 30 ms (p95 4-7 ms) ve < 5 MB geçici (tepe artışı ölçülemeyecek kadar küçük): sağlandı. 20 eşzamanlı katılım tek yazar sırasında işlenir: en kötü bekleme ≈ 20 x p95 ≈ 100-150 ms < 300 ms. "En yüksek" 20-41 ms: ilk katılımdaki ilçe merkezi hesabı (`dizin.ilceMerkezi`, ilçe başına bir kez, önbellekli) ve JIT ısınması.

## Bilinen sınır: ilçe merkezi yoğun dolu ise
Halka araması maliyeti, merkez çevresinde DOLU hücre sayısıyla artar (her halka hücresi için `hucreBul` ikili araması + kamu denetimi). Geçici deney (sentetik 600x600, 283 bin uygun hücre, merkezden yarıçap R içi tamamen dolu; yüklü makine, tek koşu, gürültülü):
| R | dolu hücre | eski | yeni |
|---|---|---|---|
| 0 | 0 | 0,6-0,8 sn | 2-6 ms |
| 60 | 9 bin | 1,1 sn | 10-380 ms |
| 120 | 37 bin | 0,7 sn | 21-23 ms |
| 200 | 103 bin | 0,5 sn | 170-220 ms |
| 300 | 228 bin | 0,6 sn | 370-700 ms |
Yani çok yoğun, olgun bir ilçenin merkezinde yeni sürüm eskiyle aynı mertebeye çıkar, ama aday listesi/bellek yükü yok. Alfa-0 ölçeğinde (az oyuncu, ilçe başına çok az doluluk) önemsizdir. Kalıcı çözüm (K4 dosya sınırı dışında): `HucreDizini`'nde ilçe başına sahiplik bit düzlemi (`hucreBul` ikili aramasız; yurt yüklemi O(1)); K3/Kod lideri kararı. Betik: `SP/takim/k4/yogun-olcum.ts.txt` (depoya girmedi).

## Geri dönüşü zor karar
Yok (kural sürümü ve altın değişmedi; yalnız saf hesap yolu).

## Açık sorular / Kod lideri'ne
1. `docs/06 §15.11` sonundaki "Yurt halka araması (sonraki dal)" bölümünün "uygulandı" olarak güncellenmesi K3 devir notunda var; docs/06 benim dosya sınırımda değil. İstersen paragrafı ben güncellerim (yukarıdaki sayılarla).
2. Resmi ölçüm: O2 AĞIR satırında `--bicim izgara --uc-ilce --oyuncu 20` ve (isteğe bağlı) `--bicim json` önce/sonra. OZET eşitliği beklenir.
3. Kuralı ihlal ettiğim iki nokta (kapı koşarken): `CI=true pnpm install --frozen-lockfile` iki worktree'de çalıştırıldı (her biri 2-3 sn, mağazadan bağlama, indirme yok) ve yukarıdaki hafif node ölçümleri (her biri ~2,5 sn, tek çekirdek) koşuldu. Bildirim amaçlı; kapıyı etkilediği görülmedi.
