# Davetli listesi: Alfa-0 kayıt kapısı (K2)

Dal: `takim/k2/davet`, taban `takim/k2/i2-i3-test-araclari` (bcf645b; zincir: G5 23527a0 → pg-saglamlik 43a4bd5 → `entegrasyon` 8064ded). cli.ts ve README'de i2-i3 ile aynı bölgelere ekleme yapar; i2-i3 girdikten sonra çakışmaz.

## Ne yapıldı

- `--davetli-liste <dosya>` (`BOLGE_DAVETLI_LISTE`), VARSAYILAN KAPALI, yalnız `--kimlik eposta` (geliştirme kimliğiyle verilirse açılış durur).
- Dosya: satır başına bir e-posta, `#` açıklama, boş satırlar ve BOM/CRLF tamam. Adresler G5 `epostaCoz` anahtarına normalleşir (`+takma`, Gmail noktaları, büyük/küçük harf): bir adres, bir hesap kuralıyla aynı.
- `POST /giris/istek`: listede olmayan adrese yanıt davetliyle bayt bayt aynıdır (202, aynı gövde, aynı çerez adları); yalnız bağlantı kaydı ve posta oluşmaz, adres başına sınır kovası da açılmaz (rastgele adreslerle bellek şişirilemez). Biçim ve geçici alan hataları listeden bağımsız aynı kalır.
- `POST /giris/onay`: bağlantı verildikten sonra listeden çıkarılan adres `baglanti_gecersiz` alır (bağlantı tüketilir, hesap açılmaz).
- Liste yok/bozuksa açılış DURUR (kapı sessizce açık kalmaz); dünya açılmadan önce yüklenir (kilit tutulmaz). Liste çalışırken YENİDEN YÜKLENMEZ (baş lider kararı; platforma özel sinyal varsayımı yok): değiştirmek için sunucuyu yeniden başlatmak yeter. `hazir` olayında `davetli: <adet|null>`.
- Sayaçlar: `bolge_giris_olay_toplam{olay="istek.davet_disi"|"onay.davet_disi"}` (adres yok).
- Gizlilik: liste kişisel veridir; sunucuda tutulur, depoya girmez (örnek konum `raporlar/davetli.txt`, git dışı), günlüğe/metriğe/hata iletisine adres yazılmaz (yalnız adet ve satır numarası). KIMLIK.md §7 yeni alt bölüm + §8 KVKK satırı.

## Kararlar ve açık noktalar

- Açık oturumlar listeden çıkarmayla kapanmaz (kapı yalnız YENİ girişi sınırlar). Davetliyi hemen atmak gerekirse `GirisHizmeti.hesapSil` ya da oturum iptali (ayrı iş, `hesap-sil` dalıyla ilgili).
- Ağ zamanlaması: davetsiz yanıt da eşzamanlı verilir (iş arka planda), yanıt süresi farkı yoktur; ince zamanlama yan kanalı için ek bir önlem alınmadı.
- Listeye kimin gireceği sahip kararıdır (baş lider sahip listesinde). Üst sınır 10 000 adres (yanlış dosyayı listeyle karıştırmamak için).
- Alfa-0 sonunda dosya silinmeli (KVKK).

## Testler (`test/davet.test.ts`, 11)

Ayrıştırma ve normalleştirme; hata iletisinde adres yok; dosya yalnız açılışta okunur (çalışırken değişmez); davetsize aynı yanıt + posta yok + depoda kayıt yok + günlükte adres yok; varyantlar (Gmail noktası/+takma/googlemail); çıkarılan adresin onayı reddi; liste yokken kapı açık; açık oturum sürer; gerçek CLI süreci: davetliye posta, davetsize yok, eksik/bozuk dosyada `olumcul`, geliştirme kimliğiyle ret. `giris`, `giris-birim`, `metrik` yeniden koşuldu (yeşil). tsc (sunucu paketi, geçici tsconfig) ve eslint temiz. pg gerekmez (liste dosya tabanlıdır, depoya dokunmaz).

## O3 için

Alfa-0 dağıtımında `deploy/.env` ve compose'a `BOLGE_DAVETLI_LISTE` (örn. bir bağlama dizinindeki dosya) eklenmeli; liste güncellemesi için kap yeniden başlatılır. Liste imajın ya da deponun içine konmaz.
