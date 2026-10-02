# D4 — 12 GPT-6.1 Sol ajanla geliştirme

2 Ekim 2026. Ana koordinatör hariç 12 ayrı ajan; ortamda aynı anda en çok
6 alt ajan çalışır. Bitiren ilk dalga ajanının yerine ikinci dalga başlar.
Ana koordinatör entegrasyon ve trafik sorumlusudur.

| Ajan | Uzmanlık / somut görev | Dosya sahipliği |
|---|---|---|
| A1 d4_a1_simulasyon | Gerçek ilçe dükkân satışları / hane ihtiyacı okuması | packages/cekirdek (tek yazar) |
| A2 d4_a2_harita | Yerel TopoJSON girişi ve salt okunur harita hazırlık kontrolü | veri-hatti/src/osm ızgara CLI ve yardımcılar |
| A3 d4_a3_tedarik | Mevcut ithalat komutuna bağlı tedarik paneli | harita/tedarik-panel.ts + css |
| A4 d4_a4_uretim | Gerçek üretim tarifeleri ve stoklarla üretim ağı paneli | harita/uretim-agi-panel.ts + css |
| A5 d4_a5_ordu | Mal bazında ikmal stok kapsamı ve tedarik yönlendirmesi | harita/ordu-panel.ts + css |
| A6 d4_a6_arge | PvE çelişkileri, minimum sonraki dilim, kamu yetki sınırları | codex-d4-pve-karari.md |
| B1 d4_b1_protokol | A1 alanlarını geriye uyumlu özel/genel karelere bağlama | packages/protokol |
| B2 d4_b2_baglanti | Tedarik okuma/komut bağdaştırıcısı | harita/baglanti.ts + baglanti-ws.ts |
| B3 d4_b3_ilce | Gerçek yerel satış/ihtiyaç göstergesi | harita/ilce-yasam-panel.ts + css |
| B4 d4_b4_gorsel | Üretim zincirlerinin okunabilir görsel düzeni | A4 tesliminden sonra üretim-agi-panel.ts + css |
| B5 d4_b5_harita_kabul | Kilimli kaynak listesi + A2 offline veri yolu kontrolü | yuruyus-kaynak.ts, yeni dar veri-hattı testi/kanıt |
| B6 d4_b6_operasyon | Tek doğrulama; gerçek ithalat komutu/yerel satış ve tip/build | ilgili hedef testler, ürün dosyası yok |

Root: mulk-panel.ts içindeki sekme ve olay/odak bağları, AGENTS ve birleşik
rapor. Ajanlar başka dosya ihtiyacını root'a bildirir, aynı dosyada iki yazar
olmaz. Lider/sahipler API kararlarında birbirine doğrudan mesaj gönderir.

## Teslim hedefi

Oyuncu girdi tedarikini gerçek ithalat emriyle yönetebilsin; üretim zincirini
ve teknolojiyi mevcut içerikten okuyabilsin; ordunun gerçek ikmal kalemlerini
ve ilçe dükkânlarının hane ihtiyacına katkısını görebilsin. Kilimli için gerçek
sınırı kullanan yerel veri yolu hazırlansın. Eksik karo/ızgara oluşturulmadan
ilçe oynanabilir ilan edilmez. PvE için çözümlenmemiş kayıp/takvim kuralları
oyuncuya sessizce açılmaz.

## Doğrulama

B6 son doğrulamanın tek sahibi. A2'nin salt okunur --hazirlik çağrısını B5
bir kez kontrol eder; B6 aynı işi tekrar etmez. Yeni para komutu ve gerçek
satış toplamasını kapsayan küçük senaryolar + tek kök/istemci tip/build.
Tarayıcı/mobil, tam paket ve ağır yük testi bu dalganın varsayılanı değildir.

## Uygulama/devir durumu

A1–A6 ve B1–B6 görevlerini bitirdi. B6: 18 hedef test, kök/istemci tip kontrolü ve tek build geçti. Sonuçlar codex-d4-2026-10-02.md içindedir.
A3'e entegrasyon incelemesinde tespit edilen somut form sorunu için bir dar
follow-up verildi: kabuk form odağında çizimi ertelerken yeni il/mal taslağı
ve sonuçları native select'i yeniden kurmadan yamalama. Çözüm uygulandı.
B1/B2, emir yuvası ve ithalat nakit çarpanını mevcut çekirdek hesabından taşıdı;
istemci ekonomi kuralını kopyalamadan son fiyatla tahmini bedeli gösteriyor.

B5 tek offline hazırlık kabulü: Kilimli gerçek Polygon ve kaynak SHA doğru;
165 canonical ODbL dosyası önce/sonra aynı, hedef veya manifest yaratılmadı.
Beklenen eksikler: z15 karo, pmtiles, tippecanoe. Kilimli yalnız gelecekte
var olabilecek gerçek yürüyüş karosunun allowlist'ine alındı; yayımlanmış
manifest ve dosya varlığı guard'ı korunuyor, oynanabilir ilçe sayısı değişmedi.

A6 PvE/kamu kararı `codex-d4-pve-karari.md` içinde. D4 kayıp/yağma motorunu
ve oyuncu kamu harcama yetkisini açmadı; gerçek ordu ve ilçe okuması geliştirildi.
