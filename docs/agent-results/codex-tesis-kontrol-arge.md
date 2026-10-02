# S3 — Gerçek üretim tesisinin çalışma kararı

2 Ekim 2026. [Kesin sözleşme](codex-s3-tesis-kontrol-sozlesmesi.md) uygulanmıştır;
çekirdek ve arayüz READY bildirildi, root entegrasyon incelemesini uygun buldu.
Bu not test sonucu değildir; kabul kanıtı [devam kaydında](codex-devam-durumu.md) tutulur.

**Oyuncu eylemi.** İşletmem → Yapılar'da Durdur/Başlat yalnız tamamlanmış
kendi üretim tesisinde görünür: gerçek işletme düğümü, güvenli `t<ID>`, boolean
aktif bilgisi, türün desteklediği bilinen mevcut yöntem ve pozitif çıktı gerekir.
İnşaat, eksik veri ve yardımcı yapı/Ordugâh/depo bu kontrolle yönetilmez.

Düğme tesis adı, konumu, numarası, görülen aktif durum ve açık hedef durumuyla
onay açar. Varsayılan odak Vazgeç'tir; canlı kare onayı başka işleme dönüştürmez.
Bekleyen komutta yinelenen onay ve Escape engellenir. Gerçek komut kabulü
başarıdır; ret açıklanır, otomatik tekrar yoktur. Yeni istemci
`tesis_durum.oncekiAktif` booleanını false dahil taşır: çekirdek mevcut durum
değişmişse mutasyon öncesi reddeder. Alanı taşımayan eski çağrı aynı kalır.

**Gerçek etki.** `ekonomi/uretim.ts` pasif tesise işçi atamaz; üretim girdisi
ve çıktı oranını sıfırlar. `lojistik/cozum.ts` aktif tesis işletme giderini
kaldırır. Bakım girdileri aktiflikten bağımsız tüketilir; `sanayi/gunluk.ts`
pasif tesiste günlük aşınma/iyileşmeyi atlar. Durma stokları silmez, ticaret
emirlerini kaldırmaz; arazi vergisini, birlik ikmal/maaşını veya askerî/taşıma
kapasitesini kapatmaz. Başlatma tedarik, onarım veya verim sorununu çözmez;
tesis mevcut üretim/lojistik kurallarıyla yeniden değerlendirilir. Ekonomi
değeri, yöntem, satış emri veya kalıcı durum eklenmedi.

**Sonraki bakım düzeyi dilimi — bu tur uygulanmadı.** Mevcut `bakim_duzeyi`
oyuncunun bütün işletmelerinde bakım girdisi/işletme gideri ile günlük aşınma
tercihini değiştirir; önce gerçek özel mevcut düzey ve kapsam görünümü gerekir.
