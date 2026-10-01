# hesap-sil (K2): e-posta onaylı hesap silme (KVKK)

Dal: `takim/k2/hesap-sil`. Taban: `takim/k2/gorunen-ad` 9b4bb9d (zincir: G5 → i2-i3 → davet → davet-pg-duzelt → gorunen-ad; K3 `adKanonik` kopyası ve görünen ad orada). Kapsam (Kod lideri): oturum açık → `POST /giris/hesap-sil` → e-postaya onay bağlantısı (G5 bağlantı altyapısı) → onay → `hesapSil`; oyuncu günlükte anonim kalır, mülk devredilmez, bütün oturumlar ve biletler düşer; G5'teki "silinen hesap" testlerinin devamı; KIMLIK.md §6.

## Ne yapıldı

- **Uçlar** (protokol `giris.ts`, yalnız ekleme): `POST /giris/hesap-sil` (çerez + izinli Origin, gövdesiz; 202 `{ tamam, gecerlilikSn }`; HİÇBİR ŞEY SİLMEZ), `GET /giris/hesap-sil-onay?j=` (yan etkisiz sayfa: kalıcılık uyarısı + düğme), `POST /giris/hesap-sil-onay {j}` (JSON ya da sayfanın formu; Origin/CSRF; hesabı siler, çerezi temizler). Hata kodları (G-6 için): istek `oturum_yok` 401, `hiz_siniri` 429 (hesap başına saatte 3), `origin` 403; onay `baglanti_gecersiz` 400, `hiz_siniri` 429 (IP başına), `origin` 403, `gecersiz_istek` 400.
- **Silme bağlantısı** (`jeton.ts`): `sil1.<hesapId>.<nonce>.<bitis>.<imza>`, HMAC alt anahtarı AMAÇ `hesap-sil` (giriş bağlantısı silme ucunda, silme bağlantısı giriş ucunda geçmez; testle). Süre 30 dk (`hesapSilBaglantiOmruMs`). DURUMSUZ: tek kullanımlıktır çünkü hesap kimliğine bağlıdır (kullanılınca hesap kalmaz; aynı adresle yeniden kayıttan sonra da eski jeton yeni hesabı SİLMEZ: yeni hesabın kimliği farklıdır; testle). Bağlantı sunucunun KENDİ onay sayfasına gider (`silmeBaglantiTabani`; CLI: `<genel>/giris/hesap-sil-onay`; `--giris-baglanti` istemci sayfası yalnız girişe aittir).
- **Silme** (`GirisHizmeti.hesapSilOnayla` → mevcut `hesapSil`): hesap, e-posta bağı, bekleyen bağlantılar, BÜTÜN oturumlar ve biletler (iptal kümesi), açık ws bağlantıları (kod 4003), görünen ad (depo + bellek önbelleği). **Oyuncu günlükte anonim kalır** (opak `oyuncuId`; e-posta/ad/hesap kimliği günlükte yok: testle), **mülk devredilmez**, dünya durumu ve `durumOzeti` aynı, silme günlüğe komut yazmaz (testle). Aynı adresle yeniden kayıt: yeni hesap + yeni opak oyuncu + yeni otomatik ad; eski mülk eskisinin kalır.
- Posta: `hesapSilmePostasi` (Türkçe; kalıcılık, anonim kalma ve mülkün devredilmediği açıkça yazar; "isteği siz yapmadıysanız yok sayın"). Metrik (`bolge_giris_olay_toplam{olay="hesap_sil.*"}`): istek, hiz_siniri, posta_gonderildi, posta_hata, onay, baglanti_gecersiz, onay_hiz_siniri; adres/kimlik yok. Günlük olayı `giris_hesap_silindi` (alansız).

## Testler (`hesap-sil.test.ts`, 10; hedefli, tek işçi)

Onaysız istek hiçbir şeyi silmez (hesap, oturum, ad, açık ws, bekleyen bilet yerinde) ve CSRF/oturum denetimi; GET sayfası yan etkisiz (önizleme botu tekrarları hesabı silmez); hız sınırı; sahte/bozuk/başka sırla imzalı/hesap kimliği değiştirilmiş jeton ve giriş bağlantısı reddedilir, silme jetonu giriş açmaz; süre (30 dk sınırı); IP başına onay sınırı; onay: hesap/oturumlar/ws/bilet/ad düşer, çerez temizlenir, ikinci kullanım ve yeniden kayıt sonrası eski jeton reddedilir; form yolu ve CSRF; mülk devredilmez + durumOzeti aynı + günlükte kişisel veri yok + yeniden kayıt yeni hesap/oyuncu/ad; görünen ad kapalıyken de çalışır. `giris` (35), `gorunen-ad` (19), `giris-birim`, `metrik` yeniden koşuldu. tsc (sunucu + protokol) ve eslint temiz. pg gerekmez (mevcut `hesapSil` sözleşmesi; yeni şema yok).

## Notlar

- KIMLIK.md: §2 uç tablosu, §6 "Hesap silme" paragrafı (silinen adın yalnız açık oturumların belleğinde, yeniden bağlanınca gideceği cümlesi dahil), §8 KVKK satırı ("silme talebinde 30 gün" → onaylanınca hemen).
- Davetli listesi kullanılıyorsa silinen kişinin adresi liste dosyasında kalır (sunucu operatörü dosyadan çıkarır; kod dokunmaz).
- `oyun_oturum` (insan testi kaydı) opak oyuncu kimliğiyle kalır; kişiye geri bağlanamaz (KIMLIK.md §6).
