# Hesap silme kontrol listesi adımı (O3)

Dal `takim/o3/hesap-sil-kilavuz`, taban main 0691310. Dosyalar: `packages/sunucu/README.md` (adım 15, adım 7 düzeltmesi, sonuç ölçütü), `docs/alfa0-isletim.md` (bölüm 2 madde 5, hızlı başvuru satırı).

- **Adım 15:** K2 `hesap-sil` raporuna ve kaynak koduna göre yazıldı (uçlar `POST /giris/hesap-sil`, `GET` ve `POST /giris/hesap-sil-onay`; 202, 200, 400, 401). Komutlar adım 11'in değişkenlerini (`$U`, `$H`, `cerez.txt`) kullanır. Önce/sonra `durumOzeti`, günlük satır sayısı (`log.hesap` opak oyuncu kimliğidir) ve günlükte adres olmaması denetlenir.
- **DENENMEDİ:** adım gerçek pg'de koşulmadı. Provası P6 PG adımından hemen sonra, tek pg süreciyle yapılacak ve adımın başlığındaki "DOĞRULAMA" cümlesi sonuçla güncellenecek. Docker daemon yok; adım Docker'sız biçimiyle (unix soketli pg 16, `BOLGE_DEPO=pg`, e-posta kipi) denenecek.
- **Düzeltme:** adım 7 hâlâ "şema sürümü = 5" yazıyordu; 006 (görünen ad) ile güncel sürüm 6.
