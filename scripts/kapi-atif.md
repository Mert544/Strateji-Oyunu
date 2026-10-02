# Kapı atıf yapılandırması

`KAPI_ATIF_SAGLAYICI` ve `KAPI_OTURUM_SATIRI` birlikte açıkça verilir.
Sağlayıcı değeri `claude` veya `codex` olmalıdır. Oturum satırı tek satırdır:
`Claude-Session: <GERÇEK_OTURUM_KİMLİĞİ_VEYA_URL>` veya
`Codex-Session: <GERÇEK_OTURUM_KİMLİĞİ_VEYA_URL>`.
Buradaki köşeli yer tutucular örnektir; gerçek oturum bilgisi dışarıdan sağlanır.
Oturum değeri boş olamaz, başında/sonunda boşluk bulunamaz; kapı değerin
kimliğini dış hizmetten doğrulamaz.

Denetlenen her commit mesajında yapılandırılan oturum satırı tam olarak bulunmalıdır.
Codex ortak yazarı `Co-Authored-By: Codex <codex@openai.com>` olmalıdır.
Claude ortak yazarı `Co-Authored-By: Claude <model> <noreply@anthropic.com>`
olmalıdır; model adı önceki davranış gibi denetlenmez. Ortak yazar denetimi
büyük/küçük harfe duyarsızdır. Bir koşudaki tüm commitler aynı sağlayıcı ve
oturumla denetlenir.

Yalnız iki ortam değişkeni de hiç verilmezse tarihsel Claude oturum varsayılanı
korunur. Eski `KAPI_OTURUM_SATIRI` özelleştirmeleri artık ayrıca
`KAPI_ATIF_SAGLAYICI=claude` gerektirir. Codex çalışmasında sağlayıcı ve gerçek
Codex oturum satırı mutlaka birlikte açıkça verilmelidir; tarihsel Claude satırı
yeni Codex çalışmasına kopyalanmaz.

Eksik, boş, bilinmeyen veya uyuşmayan yapılandırma; çok satırlı oturum değeri
ve sağlayıcıya ait olmayan ortak yazar reddedilir. Yapılandırma hatası kapı
başlangıcında, kilit/dizin/worktree/ref değişikliklerinden önce kullanım hatası
(çıkış kodu 2) verir. `--yardim` yapılandırma gerektirmez.
