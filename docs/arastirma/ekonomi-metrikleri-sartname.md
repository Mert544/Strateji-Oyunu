# Ekonomi metrikleri: ilçe etiketli kısa şartname (üç ilçeden sonraki dilim)

> **Durum.** Yalnız belge; hiçbir şey koşulmadı. Taban 5c8e704 (kod okuması; dosya:satır bu ağaçtandır). Kaynak: A2 izleme listesi 28b1537 (E2, E3b, E4a/b, E5, E6, E9, E11) ve metrik okuma f78f1b4 §3 ("gauge ile okunamayanlar"). Kardinalite ve süre sayıları öneridir (doğrulanmadı).

## 1. Göstergeler (ilçe etiketli; oyuncu etiketi YOK)

| Gösterge | Çıktı (etiket) | Kaynak (çekirdek durumu, saf okuma) | Katman |
|---|---|---|---|
| **E4a/b** ilk dükkân: `kurulus − katılım`, `ilkSatisT − katılım` | `{ilce}`: n, medyan | `OyuncuDurumu.katilmaZamani` (`cekirdek/src/tipler.ts:498`), `MulkOyuncuDurumu.katilimIlcesi` (`:929`), `DukkanDurumu.kurulus`, `ilkSatisT` (`:935`) | durumdan türetme (A) |
| **E5** dükkân geri ödemesi | `{ilce}`: n, medyan | `ek net = (p_kademe − ihrNet) × q − giderMiliSaat`; **`ihrNet` = düğümün GERÇEK ihracat nakit çarpanı** (`ticaretNakitCarpanlari(...).ihracatPpm`, `pazar/fiyat.ts:118-130`: liman primi `:65-70,88` ve Ticaret ofisi indirimi dahil; Gebze/Körfez 0,862, Gemlik 0,880, limansız ilde 0,891; ortak sabit 0,891 KULLANILMAZ); `q` = `RafYuvasi.satisOran` (`tipler.ts:421`) × etkin kademe; yatırım = dükkân bedeli + hücre (indirim: `indirimliYapi` `:920`) | (A) |
| **E3/E3b** ZP8, ZP11 | `{ilce}`: oran | oyuncu `paraAkisi.yerel/ihracat` oranları ilçeye `katilimIlcesi` ile toplanır; ZP11 = Σ min(ithalat `gerceklesenSaat` (`:242`), dükkân `satisOran`) / Σ `satisOran`, düğüm ve mal başına | (A) |
| **E11** prim, kademe payı (**K2-9**) | `{ilce, kademe}`: satış birim/sa, dükkân sayısı | yuva `fiyat` + `etkinKademe` ve `satisOran` (çözüm çağrılmaz) | (A) |
| **E6** M | `{ilce, yontem}`: anlık adet (`gida_fabrikasi`) | tesis `yontem`; "≥ 24 sa / ilk 7 gün" koşulu durumda yok (yöntem değişim zamanı saklanmaz) | anlık (A); koşullu kısım (C) |
| **E2** r | `{ilce, kaynak}`: Σ sermaye farkı; ilçe başına oyuncu çeyrekleri | komut anında hazine farkı: `SermayeSayaci` (`sunucu/src/ekonomi-metrik.ts:140-`) ilçe parametresi kazanır | olay sayacı (B) |
| **E9** bakım oranı | `{ilce}`: bakımlı/bakımsız oranı | `bakimDuzeyi` (`tipler.ts:503`) × aşınma; oyuncu karşılaştırması gerekir | (C) O2 oynatması |

## 2. `/metrik` neden yetmiyor, yerine ne gelmeli

**Bugün (5c8e704).** (1) İlçe etiketi yok: ekonomi aileleri yalnız `kalem, mal, tur, yontem, komut, kaynak, ceyrek` taşır (`sunucu/src/ekonomi-metrik.ts:17-28`; `metrik.ts:200-229`, ör. `bolge_tesis_yontem{tur,yontem}` `:217`). (2) Oyuncu kırılımı bilerek yok (`ekonomi-metrik.ts:3-4`): sermaye yalnız çeyrekler, kimliksiz (`metrik.ts:224-227`). (3) `SermayeSayaci` oyuncu başına değerleri bellekte tutar ve süreç ömrüyle sınırlıdır (`ekonomi-metrik.ts:137-142`; yeniden başlatmada sıfırlanır). (4) K2-8/K2-9 yok: `metrik.ts`'te `dukkan` geçmez; `bolge_dukkan_kademe_satis` okuma kılavuzunda "bekliyor". (5) Dükkân zamanı ve satış oranı durumda var ama dışarı çıkmıyor.

**Karar: üç katman, tek kural "oyuncu kimliği hiçbir etikette yok".**
- **(A) Durumdan türetme (ana yol):** her scrape'te `ekonomiOlcumu` kalıbı (`sunucu.ts:261`) çekirdek durumunu saf okur; ilçe etiketli yeni aileler aynı fonksiyona eklenir. Gerekçe: E4, E5, E11, E3b'nin girdisi zaten durumdadır (zaman damgaları, `satisOran`, ticaret emirleri); sayaç eklemek çekirdeği değiştirir (reddedildi: "yatırım kalemi eklenmez"). Pahalı `yerelPazarGorunumu` (çözüm) ÇAĞRILMAZ; `satisOran` yeter.
- **(B) Etiketli olay sayacı yalnız E2 için:** yatırım yalnız komut anında ölçülebilir (hazine farkı). `SermayeSayaci.kaydet(oyuncu, kaynak, komut, fark)` (`sunucu/src/yazar.ts:1151-1153`) `ilce` alır (`parsel_al`, `yapi_yerlestir`, `tesis_insa_hucre` komutta var; `tesis_olcek_yukselt`, `kenar_gelistir` tesisin hücresinden).
- **(C) Oyuncu başına ham değer:** yalnız O2 günlük oynatması (`olcum/src/insan-cikarma.ts`); /metrik'e çıkmaz (KVKK, kardinalite). E6 koşulu ve E9 oranı buradadır.

**Kardinalite ve bellek (öneri).** Etiketler: `ilce` (3 Alfa-0; üst sınır 45 ilçe), `kademe` (4), `kaynak` (2), `yontem` (yalnız `gida_fabrikasi`, ≈ 3). Yeni seri: kademe (satış, dükkân sayısı) 2×4×I, E4/E5 özeti (n, c25, c50, c75) 2×4×I, E6 3×I, E2 2×I, ZP8/ZP11 2×I ⇒ **≈ 70 seri (I = 3), ≈ 1 000 (I = 45)**; Prometheus tarafı ≈ 1 KB/seri ⇒ ≈ 1 MB. Sunucu belleği: scrape başına geçici dizi O(oyuncu + dükkân) (≤ ~200 + ~400), kalıcı yalnız `SermayeSayaci` (oyuncu ≤ 200 + ilçe×komut×kaynak ≤ 45×5×2 = 450 giriş). **Gizlilik:** ilçede n < 5 oyuncuysa çeyrek/medyan YAZILMAZ, yalnız n (k-anonimlik; izleme "n < 5 ⇒ ölçülmedi" kuralıyla aynı).

## 3. Kabul ölçütleri

1. **Etiket kuralı:** yeni ailelerde `ilce` vardır, oyuncu kimliği geçmez (test: `/metrik` çıktısında hiçbir oyuncu kimliği ve e-posta parçası yok); toplam yeni seri ≤ 80 (I = 3).
2. **n < 5:** ilçede < 5 oyuncuda çeyrek/medyan satırı yok, n satırı var (3 ilçe, tohumlu test dünyası).
3. **Doğruluk:** aynı durumdan O2 oynatmasının E4, E5 ve E11 değerleri ile /metrik gauge'ları eşit (tamsayılar birebir, oranlar ±1e-4); E5 `ihrNet` düğümün gerçek ihracat çarpanıdır (Gebze/Körfez 0,862, Gemlik 0,880; testte ikisi de).
4. **Saflık:** çekirdek ve `veri/src` değişmez; bölge kipi `/metrik` baytları ve `durumOzeti` altınları aynı (mülk/perakende yokken yeni aileler yazılmaz).
5. **E2 tutarlılığı:** ilçe başına Σ sermaye farkı = komut başına toplamların toplamı (tohumlu koşu); yeniden başlatma sınırı belgelenmiş (süreç ömrü).
6. **Maliyet:** 200 oyuncu, 400 dükkânlı dünyada scrape p95 ≤ 50 ms (O2 ölçer; öneri eşik, doğrulanmadı).
