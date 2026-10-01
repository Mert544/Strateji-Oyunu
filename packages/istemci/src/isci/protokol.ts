/** Ana iş parçacığı <-> simülasyon işçisi mesaj sözleşmesi. */
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "@bolge/veri";
import type { Komut, KomutSonucu } from "@bolge/cekirdek";
import type { Dizin, Kare } from "../veri/kare-tipleri";

/** İşçiye verilen veri paketi (işçi node:fs kullanmaz; JSON'lar ana iş parçacığında içe aktarılır). */
export interface IsciVeriPaketi {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
}

/** "Önerilen eylemler" kutusunun bir satırı (botlar paketindeki planlayıcıdan; oyuncu için). */
export interface Oneri {
  komut: Komut;
  /** Planlayıcının tahmini net faydası (para; kabaca bir haftalık net getiri − maliyet). */
  fayda: number;
  /** Planlayıcı kategorisi (arayüz "neden" metnini buradan seçer). */
  kategori: string;
  /** Komutun bölgesi (indeks), yoksa -1. */
  bolge: number;
}

export type IsciyeMesaj =
  | {
      tur: "baslat";
      veri: IsciVeriPaketi;
      tohum: number;
      botlar: string[];
      hiz: number;
      duraklat: boolean;
      ileriSaat?: number;
      /** Oyuncunun yönettiği devletin indeksi; yoksa/negatifse yalnızca izleme (dört bot oynar). O devletin botu yoktur. */
      oyuncuDevlet?: number;
    }
  | { tur: "hiz"; hiz: number }
  | { tur: "duraklat"; duraklat: boolean }
  /** Oyuncu komutu: işçi, o anki sim zamanında `sim.uygula({t, oyuncu, komut})` çağırır. `id` yanıtı eşler. */
  | { tur: "komut"; id?: number; komut: Komut }
  /** Önerilen eylemleri hesaplat (yanıt: `oneriler`). */
  | { tur: "oneriIste" };

export type IsciMesaji =
  | { tur: "hazir"; dizin: Dizin }
  | { tur: "kare"; kare: Kare; simMs: number }
  /** Sık, hafif zaman bildirimi (güneş ve saat göstergesi için). */
  | { tur: "zaman"; simMs: number; hiz: number; duraklat: boolean; gerideMi: boolean; adimMs: number }
  /** Komut sonucu (çekirdeğin ham hata metniyle; arayüz Türkçeye çevirir). `saat` komutun uygulandığı sim-saat. */
  | { tur: "komutSonuc"; id?: number; komut: Komut; sonuc: KomutSonucu; saat: number }
  | { tur: "oneriler"; saat: number; liste: Oneri[] }
  | { tur: "hata"; mesaj: string };

/** Dünya hızı seçenekleri: sim saniyesi / gerçek saniye. */
export const HIZ_SECENEKLERI: ReadonlyArray<{ hiz: number; ad: string }> = [
  { hiz: 600, ad: "600×" },
  { hiz: 3600, ad: "3600×" },
  { hiz: 21600, ad: "21600×" },
  { hiz: 86400, ad: "86400×" },
];
