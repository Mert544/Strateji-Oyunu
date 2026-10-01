# Takım modeli (1 Ekim 2026)

Sahip kararı: oyunu geliştirmeye devam etmeden önce takım modeli büyütüldü. Dört takım var; her takımda bir lider ve üç çalışan bulunuyor. Baş lider tüm takımların lideri ve operasyonun üst sorumlusu. Toplam 17 ajan çalışıyor.

Liderler Opus, çalışanlar Sonnet. Orkestra bulut ortamında çalışıyor; sahibin bilgisayarına yük bindirmiyor.

## Örgüt

| Takım | Rol | Sorumluluk | Dosya sahipliği |
|---|---|---|---|
| — | **Baş lider** | Genel kararlar, takımlar arası öncelik, son onay ve push, sahiple iletişim, operasyonun üst sorumlusu | docs/12, oyun tasarım belgesi, toplantı notları, docs/14 |
| Ar-Ge | **Lider** | Araştırmayı yönlendirir, raporları denetler, sentez yazar | docs/arastirma/** |
| Ar-Ge | A1 oyun tasarımı ve deneyim | İlk saat, rehberlik, insan testi, oyuncu akışları | kendi raporu |
| Ar-Ge | A2 ekonomi ve denge | Kalibrasyon, sayısal öneriler, ölçüm yorumu | kendi raporu |
| Ar-Ge | A3 sistemler ve teknik tasarım | Askeri, dükkân, zincir şemaları; geliştirme için girdi | kendi raporu |
| Operasyon | **Lider** | Entegrasyon kapısı, birleştirme sırası, kaynak ve kuyruk kuralları | docs/09, docs/10 |
| Operasyon | O1 entegrasyon | Teslim dallarını temiz worktree'de birleştirir, tam kapıyı koşar | `entegrasyon` dalı, scripts/kapi* |
| Operasyon | O2 ölçüm ve yük | Ölçüm ve yük koşuları, kararsız test takibi; ağır koşuların tek sahibi | packages/olcum/**, packages/botlar/**, docs/olcum/** |
| Operasyon | O3 altyapı, veri hattı ve belge | Arsa ızgarası ve harita verisi üretimi; Postgres, Docker ve yedek provaları; açılış kontrol listesi; belge bakımı | packages/veri-hatti/**, packages/veri/haritalar/**, deploy/**, packages/sunucu/README.md, docs/09–10 |
| Kod | **Lider** | Kod incelemesi, mimari kararlar, arayüz sözleşmeleri, onay | — |
| Kod | K1 frontend | İstemci mantığı: bağlantı, harita etkileşimi, komutlar, paneller; istemci giriş noktası | packages/istemci/src/{harita,komut,arayuz,isci}/*.ts, packages/istemci/src/main.ts, packages/istemci/test |
| Kod | K2 backend | Sunucu, protokol, kimlik | packages/sunucu/{src,test,sql}, packages/protokol/** |
| Kod | K3 oyun motoru | Çekirdek simülasyon ve veri doğrulama (tek yazar) | packages/cekirdek/**, packages/veri/src/**, docs/06 |
| Tasarım | **Lider** | Görsel kimlik, arayüz tutarlılığı, içerik ve denge kararları | docs/arastirma/gorsel-kimlik-ve-arayuz.md |
| Tasarım | T1 arayüz ve deneyim | Panel düzenleri, telefon düzeni, metin ve biçim, erişilebilirlik | packages/istemci/src/tasarim/**, *.css, istemci metin tabloları |
| Tasarım | T2 görsel ve 3B | Küre, harita stili, yürüyüş sahnesi, binalar, karakter | packages/istemci/src/{kure,yuru}/**, packages/istemci/src/harita/stil.ts |
| Tasarım | T3 oyun içeriği ve denge verisi | Mallar, tarifler, yapı ve dükkân verisi, kimlik listesi | packages/veri/icerik/**, docs/arastirma/kimlik-listesi-v1.md |

`main.ts`'e Tasarım yalnız kablolama bloğu ekler (ayrı commit). Bir dosyaya iki rol dokunmak zorundaysa iki lider önce sırayı kararlaştırır, baş lidere bildirir. Böyle durumlarda dosyanın sahibi önce teslim eder.

## İletişim
- Çalışan raporunu kendi liderine gönderir.
- Lider denetler, gerekirse düzeltme ister, onaylayınca baş lidere teslim notu gönderir.
- Takımlar arası istek liderden lidere gider, kopyası baş lidere.
- Bütün ajanları baş lider başlatır. Liderler ajan açamaz; çalışanların mesajlarıyla yeniden devreye girerler.
- Sahip kararı gereken her konu baş lidere çıkar. Ajanlar sahip adına karar vermez. Açık sahip soruları (docs/13 §4) çözülene kadar parametre ya da varsayılan olarak kalır.

## Çalışma kuralları
1. **Ayrı worktree ve dal.**
   - Dosya yazan her çalışan kendi git worktree'sinde ve kendi yerel dalında çalışır. Dal adı `takim/<rol>/<is>` biçimindedir.
   - Taban, güncel `entegrasyon` dalıdır; raporda `git log -1` yer alır.
   - Teslim, o dalda bir commit'tir. Ana çalışma ağacına ve başkasının dalına kimse yazmaz.
2. **Entegrasyon kapısı.**
   - Liderin onayladığı dalı O1, temiz bir worktree'de `entegrasyon` dalının üzerine alır. Doğrusal geçmiş için yeniden tabanlar.
   - Ardından kapı koşar:
     - tip denetimi, lint ve tüm testler;
     - `pnpm dunya` boyutu (dunya.html gzip ≤ 400 KB);
     - istemci değiştiyse Playwright betikleri.
   - Kırık çıkarsa dal sahibine geri döner.
   - Operasyon lideri sonucu baş lidere bildirir. Push'u yalnız baş lider yapar: `entegrasyon` ana dala ileri sarılır.
3. **Kaynak kuralları (4 çekirdek).**
   - Aynı anda en çok bir tam kapı koşusu yapılır.
   - Ağır ölçüm ve yük koşuları yalnız O2'nin kuyruğunda ve kapıyla çakışmadan koşar.
   - Geliştiriciler yalnız kendi paketlerinin hedefli testlerini koşar.
   - Postgres kümesi yalnız O2 ve O3'te açılır, iş bitince kapatılır.
   - Başlatılan her süreç kapatılır.
4. **Değişmezler.**
   - Çekirdek deterministiktir: Math.random, Date ve kayan nokta transandantal yok.
   - Bölge kipi altınları birebir korunur.
   - Protokole yalnız ekleme yapılır. Demetlere öğe eklenmez; yeni veri isteğe bağlı nesne alanı olarak gelir ve geriye uyumu dondurulmuş eski şemayla bir testte gösterilir.
   - Tutar taşıyan sistem ya da ajan komutu yoktur.
   - Test atlanmaz ve devre dışı bırakılmaz.
   - Arayüzde büyük harf yoktur.
   - Her şey Türkçedir; kod tanımlayıcıları ASCII Türkçedir.
   - Çekirdek ya da protokol değiştiğinde istemci komut testi koşulur ve `pnpm dunya` önce ve sonra raporlanır.
5. **Commit.**
   - Dosyalar açık yollarla eklenir; `git add -A` kullanılmaz.
   - Mesajın sonunda iki satır yer alır:
     - `Co-Authored-By: Claude <model> <noreply@anthropic.com>`: ajan kendi modelini yazar (liderler Opus, çalışanlar Sonnet);
     - `Claude-Session: https://claude.ai/code/session_01YQaN9Xy6JqWQSadMfNhyVn`: birebir ve zorunlu.
   - Kapı yalnız Claude-Session satırını ve Co-Authored-By adresini denetler; model adını denetlemez.
6. **Rapor biçimi.** Raporda şunlar bulunur:
   - dal ve taban;
   - değişen dosyalar;
   - temiz ağaç doğrulaması;
   - yapılanların özeti;
   - geri dönüşü zor kararlar;
   - açık sorular.

## Sprint A0-02 görev dağılımı ([10 §5A](10-gorev-listesi.md))
| Görev | Rol | Not |
|---|---|---|
| G1 istemci kusur turu ve `1.234 ₺` | T1 (metin, biçim, telefon), T2 (küre renkleri, yakın plan arsa), K1 (il etiketi, geri al şeridi) | Önce/sonra ekran görüntüleri Tasarım liderinde toplanır |
| G2 yükseltme formu `ekHucreler` | K1 | |
| G3 Alfa-0 ilçelerinde arsa ızgarası | O3 | Önce Gemlik ve Körfez |
| G4 P4/P5 uygulama şartnamesi | A3 (yapı ve komutlar), A2 (sayılar), T3 (içerik verisi taslağı) | Baş lider onayı olmadan çekirdek işi başlamaz |
| G5 e-posta bağlantısıyla giriş | K2 | Google yok |
| G6–G8 çekirdek P4a, P4b, P5 | K3 (motor), T3 (içerik verisi) | Çekirdekte tek yazar; G4 onayından sonra |
| G9 giriş ekranı ve dükkân paneli | K1, T1 | G2, G5, G7'den sonra |
| G10 uçtan uca, dogfood, insan testi kılavuzu | O1, O2, A1 | |
| Sürekli | O1 kapı betiği, O2 ölçüm temel çizgisi ve kararsız test takibi | |

Teslim raporları `docs/agent-results/<gorev>.md` olarak işle birlikte commit'lenir.

## Akış
çalışan (dal) → takım lideri (onay) → O1 (kapı, `entegrasyon`) → operasyon lideri (rapor) → baş lider (son doğrulama, push)
