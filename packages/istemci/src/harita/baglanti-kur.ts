/**
 * Bağdaştırıcı seçimi (harita yığınında, tembel): `?sunucu=ws://host:port&token=...` varsa gerçek sunucuya WebSocket
 * (`WsBaglanti`), yoksa tanımsız döner (görünüm bellek içi `SahteBaglanti` kullanır). Gerçek bağlantı sayfa başına bir kezdir;
 * denetçi ve Yerleş ekranı aynı bağlantıyı paylaşır.
 */
import type { MulkBaglantisi } from "./baglanti";
import { sunucuSecenekleri, WsBaglanti } from "./baglanti-ws";

export async function baglantiKur(arama: string): Promise<MulkBaglantisi | undefined> {
  const s = sunucuSecenekleri(arama);
  if (!s) return undefined;
  // Geliştirme/sınama köprüsü: sayfa, hesabı dünyaya katan bir işlev sağlayabilir (protokolde oyuncunun kendi katılımı yok).
  const katil = (window as unknown as { __katilIste?: (ilce: string) => Promise<void> }).__katilIste;
  return WsBaglanti.ac({ url: s.url, token: s.token, ...(katil ? { katilIste: katil } : {}) });
}
