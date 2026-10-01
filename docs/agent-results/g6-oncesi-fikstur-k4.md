# g6-oncesi-fikstur (K4)

Dal: `takim/k4/g6-oncesi-fikstur`. Taban: `entegrasyon` 7553b55 (G6'dan önceki çekirdek; `packages/cekirdek/src` ve `packages/veri/src|icerik` de9959c ile aynı).

## Ne yapıldı
G6 ÖNCESİ kodla üretilmiş, para defterli (`mulk.para`) ve kamu kasalı bir mülk görüntüsü dondurulup depoya girdi; göç ve korunum testlerinin "eski görüntü" girdisi olabilir.
- `packages/cekirdek/test/fikstur-goc/mulk-v2-g6oncesi.json` (zarf sürüm 2, 75 KB) ve `.ust.json` (kural sürümü, özet `a6405377651c51bf`, sim zamanı, kasa sayısı, içerik kimlik tablosu).
- `packages/cekirdek/test/fikstur-goc/uret-mulk-v2.ts`: deterministik üretici (tohum 7; iki koşu bayt bayt aynı doğrulandı); başlığında üretim commit'i (7553b55), senaryo ve yeniden üretim komutu.
- `packages/cekirdek/test/fikstur-goc/README.md`: fikstür tablosu (v1 ve v2), commit sha'ları, üretim komutu.
- `packages/cekirdek/test/fikstur-g6-oncesi.test.ts` (yeni, 1 test): fikstür bugünkü kodla yüklenir; zarf sürüm 2 ve özet yazıldığı gibi; fikstürün gerçekten defterli olduğu (musluk hibe ve ihracat, lavabo arsa ve ithalat, 7 kamu kasası); yükleme sonrası özet fikstürdeki özetle BİREBİR aynı; negatif kontrol: defterde tek sayaç değişirse yükleme reddedilir. (Test dosyası lider mesajındaki listede adı geçmeyen yeni bir dosyadır; tek test için gerekliydi.)

## Fikstürün içeriği
mini-6 + mini-6 parsel, kamu arsası açık (`KAMU_KUCUK`), oyuncular a, b, c (bedava yurt), hibe 2e9, arazi vergisi haftalık %10. Adımlar: yurtta Çiftlik, tahıl ve gıda ihracat emri (ilk satış; `ihracatNpc`), b için Çiftlik + Ambar + çelik ithalat emri ve `sistem_odul` (ilk_yapi), c için liman ve şehir ilçelerinde parsel alımı (arsa → kasa), bir parselin bırakılması (iade), toplam ~5,75 gün. Sonuç: 24 hücre, 21 tesis, 3 oyuncu, 7 kamu kasası (il, ilçe, mahalle vergi girişleri; ova taşra ithalat makası), musluk hibe 6e9, ihracatNpc 5,3e8, lavabo arsa 1,35e7, ithalatNpc 4e8, işletme, arazi vergisi; para korunumu zaten tutuyor (koşu bittiğinde `paraUzlastir`).

## Doğrulama
- `vitest` (tek işçi): `fikstur-g6-oncesi` 1/1, `serilestir-goc` 40/40 geçti. eslint (yeni test + üretici) 0 hata.
- Üretim: iki ayrı koşuda `mulk-v2-g6oncesi.json` ve `.ust.json` bayt bayt aynı.
- `tsc` bu worktree'de yalnız sembolik bağlı `node_modules` yüzünden iki ağaç tipini karıştırdığından (k4t) anlamlı değildi; test ve üretici ayrıca eslint'ten ve vitest derlemesinden geçti. Kapıda tam tsc koşar.
- Kapı koşarken `pnpm install` yapılmadı: worktree'nin `node_modules` dizinleri başka bir K4 worktree'sinin (aynı lockfile, aynı çekirdek ve veri kaynağı) dizinlerine sembolik bağdır, depoya girmez.

## Geri dönüşü zor karar
Yok. Fikstür bilinçli olarak G6 sonrası kodla yeniden üretilmez; G6-3 `kuralSurumu`'nu artırınca `.ust.json` içindeki kural ve özet eskide kalır ve testin "özet birebir" dalı otomatik atlanır (göç yolu `eskiDurumOzeti` ile doğrulanır); A3'ün G6-4 testleri bu ayrımı kullanır.

## Açık soru
Yok.
