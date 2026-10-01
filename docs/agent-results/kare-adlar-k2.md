# kare.adlar (K2): görünen adın başka oyunculara kare üzerinden gösterimi

Dal: `takim/k2/kare-adlar`. Taban: `takim/k2/gorunen-ad` bd0276b (zincir: G5 → i2-i3 → davet → gorunen-ad; K3 `adKanonik` kopyası orada). Karar: Kod lideri (hosgeldin DEĞİL kare; adlar çekirdek durumuna girmez, `durumOzeti` değişmez, demete öğe eklenmez, geriye uyum testi dondurulmuş şemayla).

## Protokol (yalnız ekleme; `PROTOKOL_SURUMU` değişmedi)

- `IlgiKaresi.adlar?: Record<OyuncuId, string>`: karede görünen oyuncuların adları: bölge sahipleri, İSTENEN ilçelerdeki hücre sahipleri ve isteyenin kendisi. Anahtarlar SIRALI (JSON eşitliği ve delta karşılaştırması deterministik). Adı olmayan oyuncunun girdisi YOK (istemci kimlikten varsayılan gösterir); hiç ad yoksa alan YOK (boş nesne yazılmaz).
- `KareDeltasi.adlar?`: yalnız YENİ ya da DEĞİŞEN girdiler (ad değişince yeni ad gelir); yalnız ad değişimi bile delta üretir (`deltaBosMu` false). **Birikimli**: `deltaUygula` önceki adların üstüne ekler; görünümden çıkan oyuncunun adı bildirilmez/silinmez (istemci önbelleği). Sonuç: `deltaUygula(a, kareFarki(a, b)) ≡ b` yeni/değişen adlar için tam sağlanır; bir sahip görünümden ÇIKARSA sonuç b'nin üst kümesi olur (adı silmek için mesaj yoktur; zararsız).
- `KareSecenekleri.adlar?: (oyuncu) => string | undefined` (saf; sunucu verir). Verilmezse kare ESKİSİYLE bayt bayt aynıdır (testle). Zod: `adlar: record(string 1-32, ad 2-24).optional()` hem karede hem deltada.
- Sunucu: `sunucuBaslat({ adCozucu })` (CLI: `GirisHizmeti.adCoz`, açılışta `adlariYukle` ile dolu bellek önbelleği; eşzamanlı, I/O yok). `adCozucu` yoksa kareye alan hiç yazılmaz.

## Kanıtlar (hedefli, tek işçi)

- `protokol/test/kare-adlar.test.ts` (8): sahip/isteyen/izleyici adları, adsızın girdisizliği, seçenek yokken kare eskisiyle aynı ve `durumOzeti` aynı, bölge sahibi, delta yalnız yeni/değişen, boş delta, birikimli uygulama, şema geçerli; **geriye uyum**: eski istemci şeması (8064ded biçimli `IlgiKaresi`/`KareDeltasi` nesne şemaları, dondurulmuş kopya) adlı kare ve adlı deltayı ayrıştırır, `adlar` atılır, geri kalan aynı; yeni şema adsız eski kareyi kabul eder; demet uzunlukları değişmedi (hücre <= 7, `adlar` yalnız üst düzey nesne).
- `sunucu/test/kare-adlar.test.ts` (3, gerçek WebSocket): ilçede başkasının hücresi olan oyuncunun adı görünür, ad değişince delta yalnız değişeni taşır, delta zinciri sağlam; `adCozucu` yoksa alan yok ve adlı/adsız sunucuda aynı komutlarla AYNI `durumOzeti`, ad dışı alanlar aynı; **uçtan uca**: e-postayla giriş → `POST /giris/ad` (büyük harf küçülür) → bilet → ws → başkasının karesinde ad (kanonik), kendi otomatik adı, e-posta hiçbir mesajda yok, ad değişimi delta ile.
- tsc (sunucu + protokol, geçici tsconfig) ve eslint temiz.

## Kare başına bayt etkisi (sayı)

Sahip başına ~38 bayt (JSON: `"o_xxxxxxxx":"çalışkan değirmenci 427",`; ölçüm: 200 sahip = 7 653 bayt, `kare-adlar.test.ts` bayt testi). Tam karede BİR kez gider; delta'da yalnız değişen girdi (ad değişimi 28 bayt). Gebze ölçeği (ilgi alanında 200 sahip): tam kare başına ≈ 7,7 KB ek (kare zaten hücre başına `[id, sahip, ...]` taşır; adlar sahip başına bir kez, hücre başına değil), kararlı durumda delta etkisi sıfır; yüzlerce hücreli kareye göre küçük, ama ilk abonelikte (ve yeniden tam karede) görünür bir artıştır. Daha büyük ilgi alanında (1000 sahip) ≈ 38 KB; bu durumda adları ayrı, sahip kimliği listesine bağlı bir isteğe (istemci yalnız bilmediği kimlikleri sorar) taşımak ayrı bir tasarım konusu olur (şimdilik gerekmez: Alfa-0 ≤ 200 davetli).

## Notlar

- `donusOzeti` adları kapsam dışı (Kod lideri kararı). Hesap silinince ad kareden de kalkar (önbellekten silinir); istemci eski adı önbelleğinde tutabilir (bildirilmez).
- `girisOrtami` test yardımcısı artık `adCozucu`'yu hizmete bağlar (CLI ile aynı bağ).
