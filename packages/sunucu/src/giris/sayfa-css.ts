/**
 * Sunucunun kendi sayfalarının (GET /giris/onay, GET /giris/hesap-sil-onay, onay sonuç/hata sayfaları) satır içi stili: istemcinin giriş ekranı
 * (giris.css) yüklenemediğinde bile bağlantıdan gelen kullanıcı aynı görünümü görür. Kaynak: T1 `takim/t1/g3-yedek-css.txt` (açık tema; sınıf adları
 * giris.css ile aynıdır, renkler belirteç değerlerinin sabitlenmiş halidir). Yorumlar ve satır sonları atılmıştır; değiştirirken hash kendiliğinden
 * yeniden hesaplanır (CSP `style-src` yalnız bu stile izin verir).
 */
import { createHash } from "node:crypto";

export const SAYFA_CSS =
  "*{box-sizing:border-box}" +
  "body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:#f5f2ec;color:#1a2731;font:16px/1.5 Inter,system-ui,-apple-system,\"Segoe UI\",sans-serif}" +
  ".gr-kart{width:min(400px,100%);display:flex;flex-direction:column;gap:20px;padding:32px;background:#fcfaf6;border-radius:12px;box-shadow:0 4px 8px rgba(41,31,24,.08),0 24px 56px rgba(41,31,24,.16)}" +
  ".gr-marka{display:flex;align-items:center;gap:8px;font-weight:600;color:#4b5864}" +
  ".gr-marka:before{content:\"\";width:10px;height:10px;border-radius:3px;background:#017783;transform:rotate(45deg)}" +
  ".gr-ekran{display:flex;flex-direction:column;gap:16px}" +
  ".gr-baslik{margin:0;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-.01em}" +
  ".gr-baslik:focus{outline:none}" +
  ".gr-govde{margin:0;color:#4b5864}" +
  ".gr-kucuk{margin:0;font-size:13px;color:#5f6b75}" +
  ".gr-hata{margin:0;font-size:14px;color:#911c20}" +
  ".gr-dugme{width:100%;min-height:48px;border:1px solid #017783;border-radius:8px;background:#017783;color:#fff;font-family:inherit;font-size:16px;font-weight:600;line-height:1.2;cursor:pointer}" +
  ".gr-dugme:hover{background:#006772;border-color:#006772}" +
  ".gr-dugme:disabled{background:#eeebe3;border-color:#eeebe3;color:#9ea6ad;cursor:not-allowed}" +
  ".gr-dugme:focus-visible{outline:2px solid #005b64;outline-offset:2px}" +
  ".gr-baglanti{color:#005b64;text-underline-offset:2px}" +
  "[hidden]{display:none}" +
  "@media (prefers-reduced-motion:no-preference){.gr-kart{animation:g .3s ease-out}@keyframes g{from{opacity:0}}}";

/** CSP `style-src` kaynağı: stilin SHA-256 özeti (`'unsafe-inline'` gerekmez). */
export const SAYFA_CSS_OZETI = `'sha256-${createHash("sha256").update(SAYFA_CSS).digest("base64")}'`;
