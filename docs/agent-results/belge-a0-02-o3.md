# Belge güncellemesi (O3, Sprint A0-02)

Dal `takim/o3/belge-a0-02`, taban `entegrasyon` (8064ded). Yalnız belge; kod ve test etkisi yok.

- `docs/10-gorev-listesi.md`: başlık notu (güncel durum §5A'dadır; §1.1 sayımları ve §5.0–5.2 öğleden sonranın görüntüsü), §5A tablosuna "Durum" sütunu, G3 notu, E19-G4 satırı "Kısmen".
- `docs/09-sabah-raporu.md`: "Güncel durum (1 Ekim akşam)" bölümü ve üç günlük satırı (Sprint 2, sahip kararları ve takım modeli, G3). Sabahki içerik tarihsel kayıt olarak korundu.
- Durumlar yalnız bilinen kaynaklardan yazıldı: git dalları, kuyruk ve liderlerin bildirimleri. §1.1 sayımları yeniden hesaplanmadı (öğleden sonra görüntüsü; not düşüldü).

Açık: G1–G10 durumları dallar kapıdan geçtikçe güncellenmeli (O3, ayrı küçük commitler).

## İkinci güncelleme (P1 girdikten sonra, `takim/o3/belge-durum-2`)

docs/10 §5A durum sütunu kuyruk ve kapı durumuna göre güncellendi: G1 kapıda (P2), G2 P4 sırasında, G3 ara teslim kapıda (P2), G4 T3 taslağı girdi, G5 K2 dalı kapıya hazır (P3 sonrası), G10 kılavuz girdi; G3b zinciri (K3 → K2 → K1) eklendi. Yalnız belge.

## README geçici çözüm notlarının kaldırılması (pg-saglamlik girdikten sonra)

`packages/sunucu/README.md`: adım 6 "DİKKAT" bloğu ve "Kural dönemi provası" 4. maddenin uyarısı, adım 10 pg düşmesi paragrafı pg-saglamlik (P3, `2819a43`) davranışına göre yeniden yazıldı. Doğrulama P3 ucunda gerçek pg ile: göç, normal kapanış, bayraksız ikinci açılış, `--yedekten-don` (`temizlenenGoruntu:3, gocSonrasiKomut:false`) ve eski içerikle açılış yedekle aynı `durumOzeti`; pg düşmesi: `olumcul` olayı "depo baglantisi koptu; yazar durdu: Connection terminated unexpectedly", çıkış kodu 1, işlenmeyen hata yok, pg dönünce `kalanBasarisiz 0`.
