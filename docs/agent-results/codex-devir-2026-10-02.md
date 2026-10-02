# Codex devri ve ilk geliştirme dalgası — 2 Ekim 2026

Başlangıç: `1bc1aac`, yerel `work` dalı, temiz çalışma ağacı. Bu belge yeni
oturumun kaydıdır; Claude raporlarındaki sonuçları yeni test sonucu olarak almaz.
Takım rolleri ve iletişim kuralları: [AGENTS.md](../../AGENTS.md).

## Lider toplantısı ve karar

O-L, A-L, T-L ve K-L kaynak kodu, `docs/15-sabah-raporu-2.md` ve ilgili kabul
raporlarını inceledi; bağımlılıklarını doğrudan mesajlaşarak paylaştı.

| Konu | Kanıt ve görüş | Karar |
|---|---|---|
| P13/P13b devri | Mal panelinde satış eylemi yok; F4 testi yalnız satış yönergesini okuyor. Bu checkout'ta P13/P13b veya eski `SP` çıktıları yok. | Mevcut koddan dar satış akışı uygulanacak; eski paketin getirildiği iddia edilmeyecek. |
| İlk ürün teslimi | T-L: fare/klavye/dokunma, odak ve girdi korunmalı. K-L: stok düğüm bazında; liman satış şartı değil. A-L: emir kabulü ile gelir ayrılmalı. O-L: gerçek ekonomik sonuç sınanmalı. | Mal → Pazar'da sat; saatlik emir, ret, satış emrini oran=0 ile durdurma ve odak koruma. Formdan vazgeçmek ayrı eylemdir. Saat sınırından sonra gerçekleşen ihracat, stok ve nakit değişimi doğrulanır. Defter sırası, iki adım sınırı ve yuva ekonomi metinleri sonraki iş. |
| Codex atfı | Kapı belirli eski Claude oturumunu ve Claude ortak yazarlığını zorunlu tutuyor. | Kalite kontrolünü kaldırmadan açık sağlayıcı/oturum yapılandırması; eksik/yanlış atıf reddedilecek. |
| Ölçüm | E5 çıkarıcısı ölçülmedi diyor, çekirdekte satış sayacı mevcut; E4b ve ilçe kırılımı eksik. | Yeni ekonomi ayarı eklenmeyecek; çıkarıcı ve örneklem işi sonraki dalgaya. |
| Alfa-0 kanıtı | Kısa 100 bot koşusu tarihsel 6 gün; yerel PG restore kanıtı üretim provası değil. | Bu dalga Alfa-0 kapısının tümünü kapatmış sayılmayacak. |

## İş sahipliği

| Kimlik | Uygulayıcı | Yazma alanı | İnceleme ve kabul |
|---|---|---|---|
| C0-1 çalışma düzeni | Ana koordinatör | `AGENTS.md`, bu rapor | Dört takım, lider+üç uzman rolü, gerçek eşzamanlı sınır, dosya sahipliği ve kanıt kuralları |
| C0-2 doğru atıf | O-L altında O1 | `scripts/kapi.ts`, küçük atıf yardımcı/testi, gerekirse TS import ayarı | O-L incelemesi; eski Claude uyumu, Codex yapılandırması, yanlış/eksik atıf için negatif testler |
| C0-3 ilk satış | K-L altında K1 | İstemci harita bağlantısı/paneli, satış modülü, ilgili testler ve F4 tarayıcı yolu | K-L kod/WS incelemesi, T-L kaynak incelemesi; kökte tek derleme. Kullanıcının güncel yönlendirmesiyle tarayıcı koşusu kapsam dışı. |

Bu dalgada dört lider ve iki uzman görevlendirildi. Diğer uzman rolleri kuyrukta;
16 alt ajanın aynı anda çalıştığı anlamına gelmez. Ana ajan dahil eşzamanlı sınır
7'dir. Her iş sonunda yeni görev için kontenjan yeniden değerlendirilir.

## Doğrulama kaydı

**Kullanıcının bu turdaki yönlendirmesi:** sürekli testin maliyet, token ve zaman
yükünü azalt; geliştirmeye ağırlık ver. Liderlere iletildi. Tam paket tekrar
edilmeyecek; mevcut iş için kısa hedefli kontrol ve gerektiğinde tek kullanım
denemesi yapılacak. Geniş F4 taraması ve yeni test matrisi bu teslimin dışında.

İlk `pnpm kontrol` denemesi ortamın pnpm 11 kurulumu sırasında
`/home/agent/.local/share/pnpm` için `ENOENT` verdi. Depo bağımlılıkları zaten
kurulu olduğundan aynı kontrol araçları `node_modules/.bin` üzerinden çalıştırıldı.
Başlangıç kök ve istemci tip kontrolü ile ESLint geçti.

İlk Vitest koşusunda sandbox yerel sunucu açılışını `EPERM` ile engelledi;
koşu durduruldu. Yerel soket izniyle `loopback-ok` doğrulandı ve tam koşu yeniden
başlatıldı. Bu, başarısız testi geçti saymak değildir. Sistem tarayıcısı
`/usr/bin/chromium`; eski F4 betiğinin `/opt/pw-browsers` varsayımına açık yol
yapılandırması ekleniyor.

Yerel soket izniyle tam Vitest kontrolü tamamlandı: **302 dosya geçti, 5 dosya
atlandı; 3180 test geçti, 43 test atlandı, 2 todo** (toplam 307 dosya / 3225 test;
230,95 saniye). Günlük: `raporlar/codex-devir-2026-10-02/baslangic-test.log`.
Bu koşunun dosya keşfinden sonra eklenen yeni testler ayrıca, aşağıdaki dar
kapsamda çalıştırıldı.

**C0-2 tamamlandı:** açık Claude/Codex sağlayıcı ve gerçek oturum satırı
yapılandırması eklendi. Yanlış/eksik yapılandırma kapı işlerinden önce reddedilir;
eski Claude varsayılanı korunur. Eski yalnız `KAPI_OTURUM_SATIRI` ayarı artık
`KAPI_ATIF_SAGLAYICI=claude` ile birlikte verilmelidir; geçiş
`scripts/kapi-atif.md` içinde belgeli. Node'un yerleşik TypeScript çalıştırma
yolu korunur. O1'in hedefli **26/26 testi**, ilgili ESLint ve kök tip kontrolü
geçti; O-L diff'i inceledi. Aynı kontroller koordinatör tarafından tekrarlanmadı.
Tam entegrasyon kapısı, commit/push veya dağıtım yapılmadı.

**C0-3 uygulandı:** Mal paneline işletme/il bazında "Pazar'da sat" eylemi ve
saatlik miktar formu eklendi; mevcut `ticaret_emri` yolu kullanılır. Emir kabulü,
saat başı işleme, ret ve oran=0 ile satış emrini durdurma ayrı gösterilir.
Liman şartı eklenmedi. Girdi/değer/seçim ve form düğmelerinin odağı yenilemelerde
korunur; yöntem kartının fareyle seçim odağı da düzeltildi. T-L'nin son kaynak
incelemesinde bilinen görsel/erişilebilirlik bulguları kapandı.

**Derleme geçti:** `tsx packages/istemci/scripts/derle.ts`;
`istemci/dunya.html` gzip **378,3 KB**, 400 KB bütçe içinde. Günlük:
`raporlar/codex-devir-2026-10-02/derleme.log`. İlk çağrı sandbox'ın tsx yerel IPC
izninde durdu; yerel soket izniyle tek gerçek derleme tamamlandı.
Yürüyüş karosu `gebze-z15.pmtiles` bu checkout'ta yok; derlemenin bildirdiği
mevcut ortam sınırı. Kullanıcının yönlendirmesiyle bu tur tarayıcı/telefon
görsel kabulü veya tam F4 koşusu yapılmadı. F4 için `CHROMIUM_PATH` seçeneği
eklendi; gelecekte sistem Chromium'u açıkça seçilebilir.

**C0-3 hedefli doğrulama:** 8 satış controller testi ve 10 mevcut Mal paneli
testi geçti. Tek gerçek WebSocket satış testi de geçti (test 310 ms; toplam
koşu 1,60 sn): limansız sahip düğümde emir ve günlük kaydı, stok hareketi,
`paraAkisi.ihracat > 0`, sonraki aralıkta hazine artışı, oran=0 ile iptal ve
Türkçe geçersiz mal reddi doğrulandı. İlk denemelerdeki ekonomik assertion
varsayımları düzeltildi: ilk saat satış oranını açar; emir iptal edilse de normal
tahıl gideri sürer. Ürün kodu bu testleri geçirmek için değiştirilmedi.
İstemci tip kontrolü geçti. K-L ve T-L kaynak incelemelerinde kalan bloklayıcı
bildirmedi. Başlangıç geniş paket yeniden çalıştırılmadı.

## Sonraki dalga

1. Ar-Ge A2 + Operasyon O2: mevcut satış sayacından E4b/E5 ve ilçe kırılımıyla
   ölçüm çıkarıcısı. E4 için en az 5 uygun oyuncu; E5 için ayrıca en az 3 dükkân,
   en az 7 günlük dükkân yaşı ve 7 günlük sayaç farkı koşulları ayrı uygulanır.
2. Tasarım T2 + Kodlama K1/K3: güncel ilk saat kararına göre Defter sırası;
   öneriler oyuncunun diğer eylemlerini kilitlemeyecek.
3. T3/K1/O1: üç ilçede gerçek ızgarayla masaüstü/mobil akış, yerleş kartındaki
   nüfus/dükkân düzeyi ve doğrulanmış ilçe metinleri.
4. O2/O3: uzun yük ölçümü ve oynatılabilir günlük; yedek/geri yükleme ve dağıtım
   provası için bugünkü ortamı ayrıca doğrulama.

Gerçek davet/yayın için hâlâ SMTP sağlayıcısı ve gönderen alanı, barındırma/site
adresi, KVKK/destek bilgileri ve insan test katılımcıları gibi dış girdiler var.
Bunlar bu yerel uygulama işlerinin başlamasını engellemiyor.
