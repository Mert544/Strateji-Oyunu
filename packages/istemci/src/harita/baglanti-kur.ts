/**
 * Bağdaştırıcı seçimi (harita yığınında, tembel): `?sunucu=ws://host:port&token=...` varsa (yoksa barındırılan sayfada kendi köken, `kokenSunucusu`) gerçek sunucuya WebSocket
 * (`WsBaglanti`), yoksa tanımsız döner (görünüm bellek içi `SahteBaglanti` kullanır). Gerçek bağlantı sayfa başına bir kezdir;
 * denetçi ve Yerleş ekranı aynı bağlantıyı paylaşır.
 */
import { kokenSunucusu } from "../giris/kip";
import type { MulkBaglantisi } from "./baglanti";
import { sunucuSecenekleri, WsBaglanti } from "./baglanti-ws";

export async function baglantiKur(arama: string): Promise<MulkBaglantisi | undefined> {
  const s = sunucuSecenekleri(arama, kokenSunucusu(location, arama));
  if (!s) return undefined;
  // Geliştirme/sınama köprüsü: sayfa, hesabı dünyaya katan bir işlev sağlayabilir (protokolde oyuncunun kendi katılımı yok).
  const katil = (window as unknown as { __katilIste?: (ilce: string) => Promise<void> }).__katilIste;
  // E-posta girişi (G9): kabuk her bağlanışta taze bilet veren işlevi sağlar; geliştirme token'ında (`?token=`) tanımsızdır
  const bilet = (window as unknown as { __girisBilet?: () => Promise<string> }).__girisBilet;
  return WsBaglanti.ac({ url: s.url, token: s.token === "" && bilet ? bilet : s.token, ...(katil ? { katilIste: katil } : {}) });
}
