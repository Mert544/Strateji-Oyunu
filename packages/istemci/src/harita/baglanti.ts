/**
 * Mülk bağdaştırıcısı: haritanın sunucuyla konuştuğu tek yer.
 *
 * İki uygulaması var, ikisi de aynı arayüzü (`MulkBaglantisi`) konuşur; harita kodu hangisinin altında olduğunu bilmez:
 *   - `SahteBaglanti` (burada): bellek içi sahiplik; sunucunun yapacağı doğrulamayı taklit eder (hücre biçimi, ilçede ve
 *     satın alınabilir mi, çakışma, tek sınıf, bitişiklik, ≤72 hücre / ≤%25 sınırı, hazine, yapı yuvası). Varsayılan.
 *   - `WsBaglanti` (`baglanti-ws.ts`): gerçek sunucuya WebSocket; `?sunucu=ws://...` ile seçilir.
 * Fiyat ve `t` istemcide hesaplanmaz: sunucu basar (burada sahte saat). Çekirdekle aynı fiyat işlevi: `parselFiyatiMili`.
 *
 * Arayüzün mülk uzantıları (`tesisInsa`, `ozet`, `dinle`, `ilgi`) isteğe bağlıdır: yürüyüş (L4) gibi yalnız
 * `parselAl`/`sahiplikAl` kullanan tüketiciler etkilenmez.
 */
import type { ArsaSinifi, HucreId, Komut, Mili, MulkKomutu, OyuncuId } from "@bolge/cekirdek";
import { DEFTER_DAMGALARI, DEFTER_GOSTERIM_SIRASI, defterSablonu } from "@bolge/protokol";
import type { Defter, DefterKazanilan, DefterOdulu, DonusOzeti, IlgiKaresi, KamuGrubuKaresi } from "@bolge/protokol";
import { kavramEtkinBos } from "./etkin";
import { arsaSinifi, bitisikMi, ILCE_HUCRE_SINIRI, ILCE_PAY_SINIRI, parselFiyatiMili } from "./fiyat";
import { durumAl, engelNedeni, hucreId, idCoz, izgaraSay } from "./hucre";
import type { Izgara } from "./hucre";
import { kamuAlani, kamuGrubuBul, kamuNedeni, ornekKamu } from "./kamu";
import type { ArastirmaSonucu, TeknolojiDurumu } from "./teknoloji-panel";
import type { OrduDurumu, OrduSonucu } from "./ordu-panel";
import type { TedarikDurumu } from "./tedarik-panel";

export type ParselKomutu = Extract<MulkKomutu, { tur: "parsel_al" }>;

export type TesisKomutu = Extract<MulkKomutu, { tur: "tesis_insa_hucre" }>;

export type ParselHatasi =
  | "sunucu"
  | "baglanti"
  | "zaman_asimi"
  | "hazine"
  | "izgara_yok"
  | "bos_secim"
  | "gecersiz_hucre"
  | "uygunsuz"
  | "kamu"
  | "sahipli"
  | "sinif_uyusmuyor"
  | "bitisik_degil"
  | "hucre_siniri"
  | "pay_siniri"
  | "yinelenen";

export type ParselSonucu =
  | { tamam: true; hucreler: HucreId[]; toplamMili: Mili; t: number }
  | { tamam: false; hata: ParselHatasi; mesaj: string; hucre?: HucreId };

/**
 * Atomik "yapı önce yerleşim" isteği (çekirdek `yapi_yerlestir`): arsa al + inşaatı başlat TEK işlemde; başarısızsa hiçbir şey
 * değişmez. `hucreler` yapının bütün ayak izi (kendi + boş hücreler); `sinif` boş hücrelerin (alınacakların) arsa sınıfı.
 * Boş hücreler birden çok sınıftaysa `siniflar` verilir (`hucreler` ile aynı uzunluk, `siniflar[i]` = `hucreler[i]`'nin sınıfı; sahip
 * olunan hücrenin sınıfı denetlenmez): arsa + yapı yine TEK komuttur, yarım alım olmaz.
 */
export interface YerlestirIstegi {
  ilce: string;
  tesisTuru: string;
  hucreler: HucreId[];
  sinif: ArsaSinifi;
  siniflar?: ArsaSinifi[];
  /** Dükkân türü kimliği (`tesisTuru` `dukkan` iken zorunlu; başka yapıda verilmez). */
  dukkanTuru?: string;
  /** Üretim yöntemi kimliği (yalnız tesis türünde; tür birden çok yöntemliyse seçici koyar). Tanımsız = tür varsayılanı (alan komuta yazılmaz: bugünkü davranış). */
  yontem?: string;
}

/** "Yöntemi değiştir" isteği (çekirdek `yontem_degistir`): `bolge` işletme düğümünün kimliği (`<il>#<oyuncu>`), `tesis` tesis kimliği, `yontem` yeni yöntemin kimliği. Ücretsiz ve anlıktır. */
export interface YontemDegistirIstegi {
  bolge: string;
  tesis: number;
  yontem: string;
}

/** Pazar'da sat (`ticaret_emri`, ihracat): SÜREKLİ saatlik emir. `oranSaat` mili-birim/sa (tamsayı; 0 = emri kaldırır). `bolge`: işletme düğümü kimliği (`<il>#<oyuncu>`). */
export interface TicaretEmriIstegi {
  bolge: string;
  mal: string;
  oranSaat: number;
}

/**
 * Ölçek büyütme isteği (çekirdek `tesis_olcek_yukselt`): `bolge` oyuncunun işletme düğümünün kimliği (`<il>#<oyuncu>`), `tesis`
 * tesis kimliği, `olcek` hedef (1 = M, 2 = L). `ekHucreler` ayak izinin büyümesi için gereken EK bitişik hücreler (ek hücre
 * gerekmiyorsa boş: komuta konmaz); sahipsiz ek hücre varsa `sinif` zorunludur (hepsi aynı sınıfta). Arsa + yükseltme tek işlemdir.
 */
export interface OlcekIstegi {
  bolge: string;
  tesis: number;
  olcek: 1 | 2;
  ekHucreler: HucreId[];
  sinif?: ArsaSinifi;
}

/** Onaydan sonra geri alma: yapının hücreleri ve bu işlemle alınan (bırakılacak) hücreler. */
export interface GeriAlIstegi {
  ilce: string;
  hucreler: HucreId[];
  alinan: HucreId[];
}

/** Komut yolu hataları (sunucu reddi dışında): bağlantı yok ya da yanıt gelmedi. */
export type TesisSonucu = { tamam: true; t: number } | { tamam: false; hata: ParselHatasi | "yapi_yok" | "yuva" | "yapi_var" | "hazine" | "esz_insaat"; mesaj: string; hucre?: HucreId };

export interface HucreSahipligi {
  sahip: OyuncuId;
  sinif: ArsaSinifi;
  degerMili: Mili;
  alinma: number;
  /** Hücredeki biten tesisin kimliği (yoksa tanımsız). */
  tesis?: number;
  /** Hücrede süren inşaatın kimliği (yoksa tanımsız). */
  insaat?: number;
}

/** Bir yapı (süren inşaat ya da biten tesis): aynı kimliği taşıyan hücreler. */
export interface YapiKaydi {
  /** Tesis ya da inşaat kimliği (sunucu kimlikleri; "t" ya da "i" önekiyle benzersiz anahtar için `anahtar`). */
  id: number;
  anahtar: string;
  durum: "insaat" | "tesis";
  sahip: OyuncuId;
  hucreler: HucreId[];
  /** Tesis türü kimliği (yalnız sahibine bilinir; başkasının yapısı için tanımsız). */
  tur?: string;
  /** İnşaat başlangıcı ve bitişi (sim ms); biliniyorsa. */
  baslangic?: number;
  bitis?: number;
  /** Tesisin ölçeği (0 S, 1 M, 2 L; yalnız sahibine ve karede bildirildiyse; yoksa istemci ayak izinden çıkarır). */
  olcek?: 0 | 1 | 2;
  /**
   * Ölçek büyütme inşaatı (`durum: "insaat"`): büyüyen tesisin kimliği ve (biliniyorsa) hedef ölçek; `hucreler` yalnız EKLENECEK
   * hücrelerdir (ek hücre gerekmiyorsa boş). Hedef ölçek karede yoktur: bu oturumda istenmişse bağdaştırıcı bilir.
   */
  yukseltme?: { tesis: number; olcek?: 1 | 2 };
  /** İnşaatta SEÇİLEN yöntemin kimliği (`kare.oyuncu.insaatYontem`; yalnız sahibinin yöntemli inşaatı; yoksa tanımsız = tür varsayılanı); biten tesiste tesisin üretim yöntemi (`ozel.tesisler`; yalnız sahibine). */
  yontem?: string;
  /** Tesisin aşınması (ppm, > 0; `ozel.tesisAsinma`; yalnız sahibine). Ölçek büyütme inşaatında büyüyen tesisin aşınması. Aşınmasızsa tanımsız. */
  asinmaPpm?: number;
}

export interface IlceSahipligi {
  ilce: string;
  /** Hücre -> sahiplik (yalnız satılmış hücreler). */
  hucreler: Map<HucreId, HucreSahipligi>;
  /** Hücrelerdeki yapılar (inşaat ve tesis). Bağdaştırıcı vermiyorsa tanımsız. */
  yapilar?: YapiKaydi[];
  /** Satılabilir hücre sayısı (satın alınabilir, kamu düşülmüş): fiyat payının ve %25 sınırının paydası. */
  uygun: number;
  satilmis: number;
  /** Yeni oyunculara ayrılmış hücre sayısı (sunucunun `ayrilmisAdet`'i; satılmışlar dahil, değişmez). */
  ayrilmisAdet?: number;
  /**
   * Ayrılmış hücrelerin kümesi (satılmışlar dahil; sunucunun `ayrilmis` listesi). Yalnız oyuncunun ayrılmış hakkı sürerken istenir (katılım
   * ilçesi için); bilinmiyorsa tanımsız (hepsi normal sayılır).
   */
  ayrilmis?: ReadonlySet<HucreId>;
  /**
   * Para ile alınmış ayrılmış hücre sayısı: çekirdek eğrisi `satilmis - ayrilmisSatilmis + k` kullanır (ayrılmışlar eğriyi ilerletmez).
   * Sunucu bildirdiyse o (kesin), değilse satılmış ∩ ayrılmış tahmini; bilinmiyorsa tanımsız (0).
   */
  ayrilmisSatilmis?: number;
  /** Kamu arsası hücre sayısı (sunucu yayınlıyorsa; kamu kuralı kapalıysa tanımsız). */
  kamuAdet?: number;
  /** Kamu arsası grupları (dikdörtgen bloklar, dört uç dahil; dünya kurulurken donar). Satılmaz, yapı kurulmaz. */
  kamu?: KamuGrubuKaresi[];
}

export interface Oyuncu {
  id: OyuncuId;
  ad: string;
}

/** Oyuncunun anlık özeti (başlık çubuğu ve maliyet kartı). */
export interface MulkOzeti {
  /** Hazine (mili-₺), şimdiki sim zamanında; bilinmiyorsa null. */
  hazineMili: number | null;
  /** İstemcinin tahmini sim zamanı (ms). */
  simZamani: number;
  /** Ayrılmış hücre hakkının bitişi (sim ms); hak bittiyse ya da yoksa null; bildirilmediyse tanımsız. */
  ayrilmisBitis?: number | null;
  /** Katılım ilçesi (ayrılmış hücre yalnız burada satılır); bilinmiyorsa null; bildirilmediyse tanımsız. */
  katilimIlcesi?: string | null;
  /** Kalan ilk-yapı indirimi hakkı (kaç yapı daha); bilinmiyorsa null; bildirilmediyse tanımsız (indirim uygulanmaz). */
  indirimliYapiKalan?: number | null;
  baglanti: "bagli" | "kopuk";
  /** Oyuncunun hücre sayısı olan ilçeler: `[ilçe, hücre]`. */
  ilceHucre: Array<[string, number]>;
  /** Süren hücreli inşaat sayısı (eşzamanlı inşaat sınırı için). */
  surenInsaat: number;
  /**
   * Sunucu kapalıyken geçen süreyi yetiştiriyorsa (`durum` mesajı): ilerleme 0–1. Bu sırada komutlar bağdaştırıcıda bekler ve
   * yetişme bitince aynı anahtarla yeniden gönderilir. Yetişmiyorsa null ya da tanımsız.
   */
  yetisiyor?: { ilerleme: number } | null;
}

/** İşletme paneli (mülk kipi kabuğu) için oyuncunun yapısı: süren inşaat ya da biten tesis. */
export interface IsletmeYapisi {
  /** "i<id>" (inşaat) ya da "t<id>" (tesis). */
  anahtar: string;
  durum: "insaat" | "tesis";
  /** Tesis türü ya da ek yapı kimliği (bilinmiyorsa boş). */
  tur: string;
  /** İl (işletme düğümü) ve biliniyorsa ilçe. */
  il?: string;
  ilce?: string;
  hucre?: number;
  baslangic?: number;
  bitis?: number;
  /** Tesis çalışıyor mu (biliniyorsa) ve verim (ppm). */
  aktif?: boolean;
  verimPpm?: number;
  /** Tesisin ölçeği (0 S, 1 M, 2 L; karede bildirildiyse). */
  olcek?: 0 | 1 | 2;
  /** Ölçek büyütme inşaatı (`durum: "insaat"`): büyüyen tesisin kimliği ve (biliniyorsa) hedef ölçek. */
  yukseltme?: { tesis: number; olcek?: 1 | 2 };
  /** İnşaatta SEÇİLEN yöntemin kimliği (`kare.oyuncu.insaatYontem`); yoksa tanımsız (tür varsayılanı). */
  yontem?: string;
  /** Tesisin aşınması (ppm, > 0; `ozel.tesisAsinma`); ölçek büyütme inşaatında büyüyen tesisin aşınması. Aşınmasızsa tanımsız. */
  asinmaPpm?: number;
  /** İşletme düğümünün kimliği (`<il>#<oyuncu>`; yalnız biten tesiste; `yontem_degistir` komutunun `bolge` alanı). */
  bolge?: string;
}

/** Satış emri belirli bir çıkış düğümüne aittir; mal bütün sahipli işletme ağından karşılanabilir. */
export interface PazarKaynagi {
  bolge: string;
  il: string;
  mal: string;
  /** Yalnız çıkış ilindeki stok ve brüt üretim; satış uygunluğu bunlarla sınırlanmaz. */
  stokMili: number;
  uretimMili: number;
  /** Çıkış düğümündeki istenen ihracat oranı (mili-birim/saat). */
  emirMili: number;
  /** Çıkış düğümündeki son gerçekleşen ihracat oranı; gelir veya kâr değildir. */
  gerceklesenMili?: number;
  /** Aynı sim anında yalnız sahibinin işletme düğümlerinden toplamlar.
   * Gelen akış ayrı bildirilmediyse null: net stok oranından güvenle çıkarılamaz.
   * Alan yoksa eski bağdaştırıcının yerel stok/üretimi kullanılır.
   */
  ag?: { stokMili: number; uretimMili: number; gelenMili: number | null };
  /** Seçilen çıkışın sunucudan gelen net nakit çarpanı; bilinmiyorsa gösterilmez. */
  netPpm?: number;
  uygun: boolean;
  neden?: string;
}
export interface PazarSatisIstegi { bolge: string; mal: string; oranSaat: number }
export type PazarSatisSonucu = { tamam: true; t: number } | { tamam: false; mesaj: string };

/** Oyuncunun işletme özeti (mülk kipi kabuğu): hazine, kalkan, arsalar, yapılar, stok ve satış. Yalnız okunur. */
export interface IsletmeDurumu {
  simZamani: number;
  hazineMili: number | null;
  /** Hazinenin net akışı (mili-₺/saat; biliniyorsa). */
  hazineOraniMili: number | null;
  araziDegeriMili: number | null;
  araziVergisiMili: number | null;
  ilceHucre: Array<[string, number]>;
  /** Yeni oyuncu kalkanının bitişi (sim ms; yoksa null). */
  korumaBitis: number | null;
  /** Ayrılmış hücreleri alabilme bitişi (sim ms; yoksa null). */
  ayrilmisBitis: number | null;
  /** Katılım ilçesi (ayrılmış hücre yalnız burada satılır); bilinmiyorsa null. */
  katilimIlcesi?: string | null;
  indirimliYapiKalan: number | null;
  yapilar: IsletmeYapisi[];
  /** Mal kimliği başına stok (mili-birim), üretim ve satış/alış oranı (mili-birim/saat). */
  mallar: Array<{
    mal: string;
    stokMili: number;
    uretimMili: number;
    satisMili: number;
    alisMili: number;
    /** Pazar'da sat: satış emrinin yeri (emri olan ya da malı en çok tutan işletme düğümü) ve emrin oranı (mili-birim/sa; emir yoksa tanımsız). `satisMili` GERÇEKLEŞEN orandır. */
    satisBolge?: string;
    satisEmirMili?: number;
    /** Emrin yerindeki işletme düğümünün ihracat net çarpanı (ppm; sunucunun `ozel.isletme.ihrNetPpm`'i: makas x (1 - liman primi) x (1 - komisyon), Ticaret ofisi indirimi dahil). Sunucu vermiyorsa tanımsız: "Eline geçen" satırı GİZLENİR (sabit çarpanla rakam gösterilmez). */
    satisNetPpm?: number;
  }>;
  /** Şebekeden son çözümde alınan miktar `[mal, mili-birim/saat]` (`kare.ozel.sebeke`; işletme düğümleri toplanmış; alım yoksa tanımsız). Bedel istemcide: miktar x şebeke fiyatı. */
  sebeke?: Array<[mal: string, miliSaat: number]>;
  /** Sahibinin karede doğrulanan düğüm bazlı satış kaynakları. */
  pazar?: PazarKaynagi[];
  /** Oyuncunun istenen oranı > 0 olan en az bir İHRACAT emri var mı (`kare.ozel.emirler`; yalnız true iken yazılır). Defter "satışın yolda" gösterimi için (`defter.ts` `ilkSatisBekliyor`). */
  ihracatEmriVar?: boolean;
}

/** Dükkân görünümünün kaynağı olan karenin gereken kısmı (`dukkan-kopru.ts` girdisi). */
export type DukkanKaresi = Pick<IlgiKaresi, "t" | "bolgeler" | "oyuncu" | "ilceler" | "fiyat">;

/** Dükkân komutunun (raf, fiyat, marka, yıkım) sonucu: ret nedeni Türkçe (`hata-mulk.ts`; DUK-xx/MRK-xx metin tablosundan). */
export type DukkanKomutSonucu = { tamam: true; t: number } | { tamam: false; mesaj: string };

/** Harita ile sunucu arasındaki sözleşme. */
export interface MulkBaglantisi {
  /** Bu istemcinin oyuncusu. */
  readonly ben: Oyuncu;
  /** Oyuncu kimliğinden görünen ad (bilinmiyorsa kimliğin kendisi). */
  oyuncuAdi(id: OyuncuId): string;
  /** Oyuncunun görünen adı (`kare.adlar` birikimli önbelleği); bilinmiyorsa tanımsız (çağıran kimlikten varsayılan gösterir). */
  ad?(oyuncu: OyuncuId): string | undefined;
  parselAl(komut: ParselKomutu): Promise<ParselSonucu>;
  sahiplikAl(ilce: string): Promise<IlceSahipligi | null>;
  /** Hücreli yapı kurar (`tesis_insa_hucre`). */
  tesisInsa?(komut: TesisKomutu): Promise<TesisSonucu>;
  /** Atomik yerleşim (`yapi_yerlestir`): arsa + inşaat tek komut. Yalnız `atomikYerlestirme()` doğruysa kullanılır. */
  yapiYerlestir?(i: YerlestirIstegi): Promise<TesisSonucu>;
  /** Mevcut ticaret_emri komutu; oranSaat mili-birim/saat, 0 iptal eder. */
  pazarSatis?(i: PazarSatisIstegi): Promise<PazarSatisSonucu>;
  /** Biten tesisin yöntemini değiştirir (`yontem_degistir`; ücretsiz, anlık). Tanımsızsa "Yöntemi değiştir" gösterilmez. Ret nedeni Türkçe (`yontem.ret.*`). */
  yontemDegistir?(i: YontemDegistirIstegi): Promise<TesisSonucu>;
  /** Pazar'da sat (`ticaret_emri`, ihracat; mülk kipinde liman şartı yok): sürekli saatlik emir ver/güncelle (`oranSaat` 0 = kaldır). Tanımsızsa Mal sekmesinde "Pazar'da sat" gösterilmez. Ret nedeni Türkçe (`pazar.ret.*`). */
  ticaretEmri?(i: TicaretEmriIstegi): Promise<TesisSonucu>;
  /** Sahibinin işletmelerindeki gerçek stok ve sürekli ithalat emirleri. */
  tedarikDurumu?(): TedarikDurumu | null;
  /** Sürekli ithalat emri ver/güncelle; oranSaat mili-birim/saat, 0 emri kaldırır. */
  tedarikKomutu?(i: TicaretEmriIstegi): Promise<TesisSonucu>;
  /** Oyuncunun araştırdığı teknolojilerin kimlikleri (yöntem seçicide kilitli/açık ayrımı); bilinmiyorsa tanımsız/null (teknoloji isteyen yöntem kilitli sayılır; teknolojisiz yöntemler her zaman açıktır). */
  acikTeknolojiler?(): ReadonlySet<string> | null;
  /** Sahibinin araştırmaları ve sunucudan alınan yayılım teklifi. */
  orduDurumu?(): OrduDurumu | null;
  orduKomutu?(komut: Extract<Komut, { tur: "birlik_uret" | "savunma_emri" }>): Promise<OrduSonucu>;
  arastirmaDurumu?(): TeknolojiDurumu | null;
  arastirmaBaslat?(teknoloji: string): Promise<ArastirmaSonucu>;
  /** Bu bağlantıda (sunucuda) atomik yerleşim komutu var mı? Yoksa zincir (iki komut) kullanılır. */
  atomikYerlestirme?(): boolean;
  /** Onaydan sonra geri alma (`insaat_iptal` + `parsel_birak`). Tanımsızsa "Geri al" gösterilmez. */
  yapiGeriAl?(i: GeriAlIstegi): Promise<TesisSonucu>;
  /** Ölçek büyütme (`tesis_olcek_yukselt`): ek hücrelerin arsası + yükseltme tek işlemde. Tanımsızsa "Büyüt" gösterilmez. */
  olcekYukselt?(i: OlcekIstegi): Promise<TesisSonucu>;
  /** Dükkân görünümü için son birikimli kare (yalnız sunucu bağdaştırıcısı; yoksa null: dükkân yüzeyleri çıkmaz). */
  dukkanKaresi?(): DukkanKaresi | null;
  /** Dükkân komutu (`dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik`, `insaat_iptal`): tek komut, Türkçe ret. */
  dukkanKomutu?(komut: Komut): Promise<DukkanKomutSonucu>;
  /** Oyuncu özeti (eşzamanlı; son bilinen). */
  ozet?(): MulkOzeti | null;
  /** Erken oyun süre çarpanı (0, 1] şimdiki sim zamanında (protokol `erkenOyunCarpani`; yeni oyuncu hızı); formül bilinmiyorsa tanımsız (çağıran 1 sayar). */
  erkenOyunCarpani?(): number;
  /** Esnaf Defteri (`defterIste` → `defter`); okunamazsa null. */
  defterAl?(): Promise<Defter | null>;
  /** Gösterilmemiş "Sen yokken" özeti (`hosgeldin.donusOzeti` ya da `donusOzeti` mesajı); yoksa null. */
  donusOzeti?(): DonusOzeti | null;
  /** Özet gösterildi/onaylandı (`ozetOkundu`): çapa ilerler, özet bir daha gösterilmez. */
  ozetOkundu?(): void;
  /** Sunucunun dünya epoch'u (ms; `hosgeldin.dunyaEpochMs`); bildirilmediyse null (istemci varsayılana düşer). */
  dunyaEpochMs?(): number | null;
  /** İşletme özeti (mülk kipi paneli; eşzamanlı, son bilinen). */
  isletme?(): IsletmeDurumu | null;
  /** Durum değişince (kare, delta, bağlantı) çağrılır; dönen işlev aboneliği kaldırır. */
  dinle?(f: () => void): () => void;
  /** Haritanın ilgilendiği ilçeleri bildirir (`kaynak` başına küme; sunucuda abone listesinin birleşimi). */
  ilgi?(kaynak: string, ilceler: readonly string[]): void;
  /**
   * Hesabı dünyaya katar (Yerleş ekranı; seçilen ilçe yurt için bildirilir). Protokolde oyuncunun kendi katılımı yoktur
   * (`oyuncu_katil` yalnız yönetici): embedder (`window.__katilIste` ya da bir ön yüz servisi) sağlar; yoksa açık hata.
   */
  katil?(ilce: string): Promise<{ tamam: boolean; mesaj?: string }>;
  /** İlk oyuncu karesi gelene kadar bekler (bağlantı kurulduktan sonra `ozet()` dolu olsun). */
  hazirBekle?(): Promise<void>;
  /** Sunucuda bu ilçe var mı? (yoksa false; bilinmiyorsa null). */
  ilceVarMi?(ilce: string): boolean | null;
  kapat?(): void;
}

export interface SahteSecenekler {
  /** İlçenin uygunluk ızgarası (sunucu tarafında BHI1). Yoksa null. */
  izgaraAl: (ilce: string) => Promise<Izgara | null>;
  ben?: Oyuncu;
  /** Gerçekçi görünüm için ilçeye birkaç komşu parsel serp (deterministik). Varsayılan: true. */
  komsular?: boolean;
  /** Sahte saat (ms). */
  saat?: () => number;
  /** Yapay gecikme (ms). */
  gecikme?: number;
  /** Başlangıç hazinesi (mili-₺). Verilmezse para takibi yoktur (sınırsız). */
  hazineMili?: number;
  /** Tesis türü -> yuva, para (mili-₺) ve süre (saat). Verilmezse `tesisInsa` bilinmeyen tür sayar. */
  yapiBilgisi?: (tur: string) => { yuva: number; paraMili: number; sureSaat: number } | null;
  /**
   * Ölçek büyütme bedeli (sunucusuz): tür, hedef ölçek ve tesisin gerçek hücre sayısına göre gereken ek hücre, yükseltme parası
   * (mili-₺) ve süre (saat). Verilmezse `olcekYukselt` yoktur ("Büyüt" gösterilmez).
   */
  olcekBilgisi?: (tur: string, hedef: 1 | 2, hucreSayisi: number) => { ek: number; paraMili: number; sureSaat: number } | null;
  /** Sahte sim hızı: 1 gerçek ms = bu kadar sim ms (varsayılan 3600: 1 sim saati = 1 gerçek saniye). */
  simHizi?: number;
  /** Aynı anda en çok hücreli inşaat (çekirdek `esZamanliInsaat`). Varsayılan 2. */
  esZamanliInsaat?: number;
  /** Sunucusuz kipte örnek kamu arsası blokları üret (`ornekKamu`). Varsayılan: false. */
  kamu?: boolean;
  /** Sunucusuz kipte örnek defter için ödül tablosu (kavram → ödül; `parametreler.odul`'dan, değer hesaplanmış) ve tavan. */
  defterOdulleri?: { tavanMili: number; kavramlar: Record<string, DefterOdulu> };
  /** Sunucusuz örnek defterde kavram ETKİN mi (içerik dizininden: `etkin.ts` `kavramEtkin`, protokol kuralı); verilmezse boş içerik kuralı (dükkân ve G8 kavramları kapalı). */
  defterEtkin?: (kavram: string) => boolean;
  /** Sunucusuz kipte örnek "Sen yokken" özeti (gösterim ve sınama; `?donus=ornek`). */
  donusOrnegi?: DonusOzeti;
}

const MESAJ: Record<ParselHatasi, string> = {
  izgara_yok: "Bu ilçenin arsa ızgarası henüz yok",
  bos_secim: "Hücre seçilmedi",
  gecersiz_hucre: "Geçersiz hücre kimliği",
  uygunsuz: "Satın alınamaz hücre",
  kamu: "Kamu arsası: satışa kapalı",
  sahipli: "Hücre başkasına ait",
  sinif_uyusmuyor: "Hücre sınıfı komuttakiyle uyuşmuyor",
  sunucu: "Sunucu isteği reddetti",
  baglanti: "Sunucuyla bağlantı yok",
  hazine: "Hazinede yeterli para yok",
  zaman_asimi: "Sunucudan yanıt gelmedi",
  bitisik_degil: "Seçilen hücreler bitişik olmalı",
  hucre_siniri: `İlçede en çok ${ILCE_HUCRE_SINIRI} hücre`,
  pay_siniri: "İlçe payı sınırı aşılıyor",
  yinelenen: "Aynı hücre iki kez seçildi",
};

interface SahteInsaat {
  id: number;
  ilce: string;
  tur: string;
  hucreler: HucreId[];
  baslangic: number;
  bitis: number;
  /** Atomik işlemle ödenen yapı bedeli, alınan hücreler ve arsa tutarı (geri alma için). */
  odenenMili?: number;
  alinan?: HucreId[];
  arsaMili?: number;
  /** Tesisin ölçeği (biten tesiste; yoksa S). */
  olcek?: 0 | 1 | 2;
  /** Ölçek büyütme inşaatı: büyüyen tesis ve hedef ölçek; `hucreler` yalnız eklenecek hücrelerdir. Bitince tesise katılır. */
  yukseltme?: { tesis: number; olcek: 1 | 2 };
}

interface IlceKaydi {
  izgara: Izgara;
  sahiplik: IlceSahipligi;
  insaatlar: SahteInsaat[];
}

const KOMSU_OYUNCULAR: Oyuncu[] = [
  { id: "bot-ayse", ad: "Ayşe Tarım" },
  { id: "bot-kerem", ad: "Kerem Lojistik" },
  { id: "bot-selin", ad: "Selin Yapı" },
];

/** Sahte yeni oyuncu kalkanı ve ayrılmış hücre hakkı: sahte saatin başından 14 gün (çekirdeğin `kalkanGun` varsayılanı). */
const KALKAN_MS = 14 * 24 * 3_600_000;

/** Bellek içi sahte sunucu. */
export class SahteBaglanti implements MulkBaglantisi {
  readonly ben: Oyuncu;
  private ilceler = new Map<string, Promise<IlceKaydi | null>>();
  private adlar = new Map<OyuncuId, string>();
  private hazine: number | null;
  private sonInsaat = 0;
  private dinleyiciler = new Set<() => void>();
  private ilk = Date.now();

  constructor(private s: SahteSecenekler) {
    this.hazine = s.hazineMili ?? null;
    this.ben = s.ben ?? { id: "ben", ad: "Sen" };
    for (const o of [this.ben, ...KOMSU_OYUNCULAR]) this.adlar.set(o.id, o.ad);
  }

  oyuncuAdi(id: OyuncuId): string {
    return this.adlar.get(id) ?? id;
  }

  private saat(): number {
    return this.s.saat ? this.s.saat() : Date.now();
  }

  /** Sahte sim zamanı (ms): gerçek zamanın `simHizi` katı. */
  private simZamani(): number {
    return Math.round((this.saat() - this.ilk) * (this.s.simHizi ?? 3600));
  }

  private degisti(): void {
    for (const f of [...this.dinleyiciler]) f();
  }

  dinle(f: () => void): () => void {
    this.dinleyiciler.add(f);
    return () => this.dinleyiciler.delete(f);
  }

  ozet(): MulkOzeti {
    const ilceHucre: Array<[string, number]> = [];
    let suren = 0;
    for (const p of this.ilceler.values()) {
      // Yüklenmiş ilçeler eşzamanlı okunur (Promise çözüldüyse); çözülmemişler henüz hücre içermez.
      const k = this.cozulmus.get(p);
      if (!k) continue;
      this.yukseltmeleriTamamla(k);
      let n = 0;
      for (const h of k.sahiplik.hucreler.values()) if (h.sahip === this.ben.id) n++;
      if (n) ilceHucre.push([k.sahiplik.ilce, n]);
      const simdi = this.simZamani();
      suren += k.insaatlar.filter((i) => i.bitis > simdi).length;
    }
    return { hazineMili: this.hazine, simZamani: this.simZamani(), baglanti: "bagli", ilceHucre, surenInsaat: suren };
  }

  private donus: DonusOzeti | null | undefined;
  /** İlk satın alma anı (sim ms; örnek defterin ilk arsa damgası). */
  private ilkParselT: number | null = null;

  donusOzeti(): DonusOzeti | null {
    if (this.donus === undefined) this.donus = this.s.donusOrnegi ?? null;
    return this.donus;
  }

  ozetOkundu(): void {
    this.donus = null;
  }

  /**
   * Örnek defter (sunucusuz): ilk arsa damgası (hücre varsa), ilk yapı ödülü (biten yapı varsa); sıradakiler ödül tablosundan
   * kritik yol sırasıyla (ilk_dukkan ve ilk_sozlesme yer tutucu: `etkin: false`).
   */
  async defterAl(): Promise<Defter | null> {
    const t = this.s.defterOdulleri;
    if (!t) return null;
    const simdi = this.simZamani();
    let hucre = 0;
    let bitenT: number | null = null;
    for (const p of this.ilceler.values()) {
      const k = this.cozulmus.get(p);
      if (!k) continue;
      for (const h of k.sahiplik.hucreler.values()) if (h.sahip === this.ben.id) hucre++;
      for (const i of k.insaatlar) if (i.bitis <= simdi) bitenT = bitenT === null ? i.bitis : Math.min(bitenT, i.bitis);
    }
    const kazanilan: DefterKazanilan[] = [];
    if (hucre > 0) kazanilan.push({ kavram: DEFTER_DAMGALARI[0], sablon: defterSablonu(DEFTER_DAMGALARI[0]), tur: "damga", t: this.ilkParselT ?? simdi });
    if (bitenT !== null) kazanilan.push({ kavram: "ilk_yapi", sablon: defterSablonu("ilk_yapi"), tur: "odul", t: bitenT, ...(t.kavramlar["ilk_yapi"] ? { odul: t.kavramlar["ilk_yapi"] } : {}) });
    const alinan = new Set(kazanilan.map((k) => k.kavram));
    const siradaki = DEFTER_GOSTERIM_SIRASI.filter((k) => !alinan.has(k) && t.kavramlar[k]).map((k) => ({ kavram: k, sablon: defterSablonu(k), etkin: (this.s.defterEtkin ?? kavramEtkinBos)(k), odul: t.kavramlar[k]! }));
    const toplam = kazanilan.reduce((s, k) => s + (k.odul?.degerMili ?? 0), 0);
    return { kazanilan, siradaki, toplamOdulMili: toplam, tavanMili: t.tavanMili };
  }

  isletme(): IsletmeDurumu {
    const oz = this.ozet();
    const simdi = this.simZamani();
    const yapilar: IsletmeYapisi[] = [];
    for (const p of this.ilceler.values()) {
      const k = this.cozulmus.get(p);
      if (!k) continue;
      this.yukseltmeleriTamamla(k);
      for (const i of k.insaatlar) {
        const bitti = i.bitis <= simdi;
        yapilar.push({
          anahtar: `${bitti ? "t" : "i"}${i.id}`,
          durum: bitti ? "tesis" : "insaat",
          tur: i.tur,
          ilce: i.ilce,
          hucre: i.hucreler.length,
          baslangic: i.baslangic,
          bitis: i.bitis,
          ...(bitti ? { aktif: true, verimPpm: 1_000_000, ...(i.olcek !== undefined ? { olcek: i.olcek } : {}) } : {}),
          ...(i.yukseltme ? { yukseltme: { ...i.yukseltme } } : {}),
        });
      }
    }
    return { simZamani: simdi, hazineMili: this.hazine, hazineOraniMili: null, araziDegeriMili: null, araziVergisiMili: null, ilceHucre: oz.ilceHucre, korumaBitis: KALKAN_MS > simdi ? KALKAN_MS : null, ayrilmisBitis: KALKAN_MS > simdi ? KALKAN_MS : null, katilimIlcesi: oz.ilceHucre[0]?.[0] ?? null, indirimliYapiKalan: null, yapilar, mallar: [] };
  }

  private async bekle(): Promise<void> {
    const g = this.s.gecikme ?? 0;
    if (g > 0) await new Promise((coz) => setTimeout(coz, g));
  }

  private cozulmus = new WeakMap<Promise<IlceKaydi | null>, IlceKaydi>();

  private kayit(ilce: string): Promise<IlceKaydi | null> {
    let p = this.ilceler.get(ilce);
    if (!p) {
      p = this.s.izgaraAl(ilce).then((izgara) => {
        if (!izgara) return null;
        const say = izgaraSay(izgara);
        const kamu = this.s.kamu ? ornekKamu(izgara, ilce) : [];
        const kamuAdet = kamuAlani(kamu);
        // Ayrılmış hücre: satılabilir hücrenin %20'si (çekirdeğin `ayrilmisPpm` varsayılanı; sunucusuz örnek)
        const sahiplik: IlceSahipligi = { ilce, hucreler: new Map(), uygun: say.uygun - kamuAdet, satilmis: 0, ayrilmisAdet: Math.floor((say.uygun - kamuAdet) * 0.2), ...(kamu.length ? { kamu, kamuAdet } : {}) };
        const k: IlceKaydi = { izgara, sahiplik, insaatlar: [] };
        if (this.s.komsular !== false) this.komsulariSerp(k);
        this.cozulmus.set(p!, k);
        return k;
      });
      this.ilceler.set(ilce, p);
    }
    return p;
  }

  /** Izgara merkezine yakın uygun hücrelerde 3 küçük komşu parsel (3×3'e kadar). Deterministik. */
  private komsulariSerp(k: IlceKaydi): void {
    const iz = k.izgara;
    const cx = iz.x0 + Math.floor(iz.genislik / 2);
    const cy = iz.y0 + Math.floor(iz.yukseklik / 2);
    const ofset: Array<[number, number]> = [
      [-14, -6],
      [9, 4],
      [-3, 12],
    ];
    ofset.forEach(([ox, oy], i) => {
      const o = KOMSU_OYUNCULAR[i]!;
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++) {
          const x = cx + ox + dx;
          const y = cy + oy + dy;
          const d = durumAl(iz, x, y);
          if (engelNedeni(d) || kamuGrubuBul(k.sahiplik.kamu, x, y)) continue;
          const sinif = arsaSinifi(d);
          k.sahiplik.hucreler.set(hucreId(x, y), { sahip: o.id, sinif, degerMili: parselFiyatiMili(sinif, 0, k.sahiplik.uygun, 1), alinma: 0 });
          k.sahiplik.satilmis++;
        }
    });
  }

  async sahiplikAl(ilce: string): Promise<IlceSahipligi | null> {
    await this.bekle();
    const k = await this.kayit(ilce);
    if (!k) return null;
    const s = k.sahiplik;
    this.yukseltmeleriTamamla(k);
    const simdi = this.simZamani();
    // Biten inşaatlar tesise döner (sahte sunucu zamanla ilerler).
    const yapilar: YapiKaydi[] = k.insaatlar.map((i) => ({
      id: i.id,
      anahtar: `${i.bitis > simdi ? "i" : "t"}${i.id}`,
      durum: i.bitis > simdi ? "insaat" : "tesis",
      sahip: this.ben.id,
      hucreler: [...i.hucreler],
      tur: i.tur,
      baslangic: i.baslangic,
      bitis: i.bitis,
      ...(i.bitis <= simdi && i.olcek !== undefined ? { olcek: i.olcek } : {}),
      ...(i.yukseltme ? { yukseltme: { ...i.yukseltme } } : {}),
    }));
    // Kopya: çağıran tarafın değişikliği sahte sunucu durumunu bozmasın.
    const hucreler = new Map<HucreId, HucreSahipligi>();
    for (const [id, h] of s.hucreler) hucreler.set(id, { ...h });
    for (const y of yapilar) for (const id of y.hucreler) {
      const h = hucreler.get(id);
      if (h) {
        if (y.durum === "insaat") h.insaat = y.id;
        else h.tesis = y.id;
      }
    }
    return { ...s, hucreler, yapilar };
  }

  async parselAl(komut: ParselKomutu): Promise<ParselSonucu> {
    await this.bekle();
    const k = await this.kayit(komut.ilce);
    const red = (hata: ParselHatasi, hucre?: HucreId): ParselSonucu => ({ tamam: false, hata, mesaj: MESAJ[hata], ...(hucre ? { hucre } : {}) });
    if (!k) return red("izgara_yok");
    if (komut.hucreler.length === 0) return red("bos_secim");
    const s = k.sahiplik;
    const gorulen = new Set<HucreId>();
    for (const id of komut.hucreler) {
      const h = idCoz(id);
      if (!h) return red("gecersiz_hucre", id);
      if (gorulen.has(id)) return red("yinelenen", id);
      gorulen.add(id);
      const d = durumAl(k.izgara, h.x, h.y);
      const neden = engelNedeni(d);
      if (neden) return { tamam: false, hata: "uygunsuz", mesaj: `${MESAJ.uygunsuz}: ${neden}`, hucre: id };
      const kg = kamuGrubuBul(s.kamu, h.x, h.y);
      if (kg) return { tamam: false, hata: "kamu", mesaj: kamuNedeni(kg.tur), hucre: id };
      if (s.hucreler.has(id)) return red("sahipli", id);
      if (arsaSinifi(d) !== komut.sinif) return red("sinif_uyusmuyor", id);
    }
    const benim = new Set<HucreId>();
    for (const [id, h] of s.hucreler) if (h.sahip === this.ben.id) benim.add(id);
    if (!bitisikMi(komut.hucreler, benim)) return red("bitisik_degil");
    const sonra = benim.size + komut.hucreler.length;
    if (sonra > ILCE_HUCRE_SINIRI) return red("hucre_siniri");
    if (sonra > Math.floor(ILCE_PAY_SINIRI * s.uygun)) return red("pay_siniri");
    // Çekirdekle aynı: hücre başına artımlı fiyat (k. hücre için pay = (satılmış + k) / uygun).
    const adet = komut.hucreler.length;
    const toplam = parselFiyatiMili(komut.sinif, s.satilmis, s.uygun, adet);
    if (this.hazine !== null && this.hazine < toplam) return red("hazine");
    const t = this.saat();
    komut.hucreler.forEach((id, i) => {
      const deger = parselFiyatiMili(komut.sinif, s.satilmis + i, s.uygun, 1);
      s.hucreler.set(id, { sahip: this.ben.id, sinif: komut.sinif, degerMili: deger, alinma: t });
    });
    s.satilmis += adet;
    this.ilkParselT ??= this.simZamani();
    if (this.hazine !== null) this.hazine -= toplam;
    this.degisti();
    return { tamam: true, hucreler: [...komut.hucreler], toplamMili: toplam, t };
  }

  atomikYerlestirme(): boolean {
    return true;
  }

  /** Atomik: önce HER ŞEY doğrulanır, sonra durum değişir (başarısızsa hiçbir şey değişmez). */
  async yapiYerlestir(i: YerlestirIstegi): Promise<TesisSonucu> {
    await this.bekle();
    const k = await this.kayit(i.ilce);
    const red = (hata: Extract<TesisSonucu, { tamam: false }>["hata"], mesaj: string, hucre?: HucreId): TesisSonucu => ({ tamam: false, hata, mesaj, ...(hucre ? { hucre } : {}) });
    if (!k) return red("izgara_yok", MESAJ.izgara_yok);
    const yapi = this.s.yapiBilgisi?.(i.tesisTuru) ?? null;
    if (!yapi) return red("yapi_yok", "Bu yapı türü kurulamaz");
    if (i.hucreler.length !== yapi.yuva) return red("yuva", `Bu yapı ${yapi.yuva} hücre kaplar (verilen ${i.hucreler.length})`);
    const s_ = k.sahiplik;
    if (i.siniflar && i.siniflar.length !== i.hucreler.length) return red("sinif_uyusmuyor", `Sınıf listesi hücrelerle aynı uzunlukta olmalı (${i.siniflar.length} / ${i.hucreler.length})`);
    const sinifi = (id: HucreId): ArsaSinifi => (i.siniflar ? (i.siniflar[i.hucreler.indexOf(id)] ?? i.sinif) : i.sinif);
    const dolu = new Set<HucreId>();
    for (const ins of k.insaatlar) for (const id of ins.hucreler) dolu.add(id);
    const alinacak: HucreId[] = [];
    for (const id of i.hucreler) {
      const h = idCoz(id);
      if (!h) return red("gecersiz_hucre", MESAJ.gecersiz_hucre, id);
      const d = durumAl(k.izgara, h.x, h.y);
      const sh = s_.hucreler.get(id);
      if (sh) {
        if (sh.sahip !== this.ben.id) return red("sahipli", "Hücre başkasına ait", id);
        if (dolu.has(id)) return red("yapi_var", "Hücrede zaten yapı var", id);
      } else {
        const neden = engelNedeni(d);
        if (neden) return red("uygunsuz", `${MESAJ.uygunsuz}: ${neden}`, id);
        const kg = kamuGrubuBul(s_.kamu, h.x, h.y);
        if (kg) return red("kamu", kamuNedeni(kg.tur), id);
        if (arsaSinifi(d) !== sinifi(id)) return red("sinif_uyusmuyor", MESAJ.sinif_uyusmuyor, id);
        alinacak.push(id);
      }
    }
    // Çekirdek `alimPlani` gibi: hücreler kimliğe göre sıralı, her biri kendi sınıfında, eğri sırası alım sırasıyla ilerler
    alinacak.sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
    let benim = 0;
    for (const h of s_.hucreler.values()) if (h.sahip === this.ben.id) benim++;
    if (benim + alinacak.length > ILCE_HUCRE_SINIRI) return red("hucre_siniri", MESAJ.hucre_siniri);
    if (benim + alinacak.length > Math.floor(ILCE_PAY_SINIRI * s_.uygun)) return red("pay_siniri", MESAJ.pay_siniri);
    const simdi = this.simZamani();
    const suren = k.insaatlar.filter((x) => x.bitis > simdi).length;
    if (suren >= (this.s.esZamanliInsaat ?? 2)) return red("esz_insaat", `Aynı anda en çok ${this.s.esZamanliInsaat ?? 2} inşaat sürebilir`);
    const deger = alinacak.map((id, n) => parselFiyatiMili(sinifi(id), s_.satilmis + n, s_.uygun, 1));
    const arsa = deger.reduce((t, x) => t + x, 0);
    if (this.hazine !== null && this.hazine < arsa + yapi.paraMili) return red("hazine", "Hazinede yeterli para yok");
    // Değişiklikler (artık başarısız olamaz)
    const t = this.saat();
    alinacak.forEach((id, n) => s_.hucreler.set(id, { sahip: this.ben.id, sinif: sinifi(id), degerMili: deger[n]!, alinma: t }));
    s_.satilmis += alinacak.length;
    if (alinacak.length) this.ilkParselT ??= simdi;
    if (this.hazine !== null) this.hazine -= arsa + yapi.paraMili;
    k.insaatlar.push({ id: ++this.sonInsaat, ilce: i.ilce, tur: i.tesisTuru, hucreler: [...i.hucreler], baslangic: simdi, bitis: simdi + yapi.sureSaat * 3_600_000, odenenMili: yapi.paraMili, alinan: alinacak, arsaMili: arsa });
    this.degisti();
    return { tamam: true, t };
  }

  /** Geri al (sahte): inşaat kalkar, bu işlemle alınan hücreler bırakılır, ödenen para tam iade edilir. */
  async yapiGeriAl(i: GeriAlIstegi): Promise<TesisSonucu> {
    await this.bekle();
    const k = await this.kayit(i.ilce);
    if (!k) return { tamam: false, hata: "izgara_yok", mesaj: MESAJ.izgara_yok };
    const konum = k.insaatlar.findIndex((x) => x.hucreler.length === i.hucreler.length && x.hucreler.every((h) => i.hucreler.includes(h)));
    if (konum < 0) return { tamam: false, hata: "yapi_yok", mesaj: "Geri alınacak inşaat yok" };
    const ins = k.insaatlar[konum]!;
    k.insaatlar.splice(konum, 1);
    let iade = ins.odenenMili ?? 0;
    for (const id of ins.alinan ?? []) {
      if (!i.alinan.includes(id)) continue;
      const h = k.sahiplik.hucreler.get(id);
      if (h && h.sahip === this.ben.id) {
        iade += h.degerMili;
        k.sahiplik.hucreler.delete(id);
        k.sahiplik.satilmis--;
      }
    }
    if (this.hazine !== null) this.hazine += iade;
    this.degisti();
    return { tamam: true, t: this.saat() };
  }

  /** Biten ölçek büyütmeleri tesise katılır (sahte sunucu zamanla ilerler): ek hücreler tesisin hücreleri olur, ölçek yükselir. */
  private yukseltmeleriTamamla(k: IlceKaydi): void {
    const simdi = this.simZamani();
    for (const y of [...k.insaatlar]) {
      if (!y.yukseltme || y.bitis > simdi) continue;
      k.insaatlar.splice(k.insaatlar.indexOf(y), 1);
      const hedef = k.insaatlar.find((t) => t.id === y.yukseltme!.tesis);
      if (!hedef) continue;
      hedef.hucreler = [...hedef.hucreler, ...y.hucreler].sort();
      hedef.olcek = y.yukseltme.olcek;
    }
  }

  /** Ölçek büyütme (sahte): çekirdeğin sırasıyla önce HER ŞEY doğrulanır, sonra arsa + yükseltme tek işlemde uygulanır. */
  async olcekYukselt(i: OlcekIstegi): Promise<TesisSonucu> {
    await this.bekle();
    const red = (hata: Extract<TesisSonucu, { tamam: false }>["hata"], mesaj: string, hucre?: HucreId): TesisSonucu => ({ tamam: false, hata, mesaj, ...(hucre ? { hucre } : {}) });
    if (!this.s.olcekBilgisi) return red("yapi_yok", "Bu bağlantı büyütmeyi desteklemiyor");
    let k: IlceKaydi | null = null;
    let tesis: SahteInsaat | undefined;
    for (const p of this.ilceler.values()) {
      const c = this.cozulmus.get(p);
      if (!c) continue;
      this.yukseltmeleriTamamla(c);
      const t = c.insaatlar.find((x) => x.id === i.tesis && !x.yukseltme && x.bitis <= this.simZamani());
      if (t) {
        k = c;
        tesis = t;
        break;
      }
    }
    if (!k || !tesis) return red("yapi_yok", "Bu tesis artık yok");
    const simdi = this.simZamani();
    if (k.insaatlar.some((x) => x.yukseltme?.tesis === tesis!.id)) return red("yapi_var", "Bu tesiste büyütme zaten sürüyor");
    if ((tesis.olcek ?? 0) >= i.olcek) return red("yapi_var", "Tesis zaten bu ölçekte ya da daha büyük");
    const bilgi = this.s.olcekBilgisi(tesis.tur, i.olcek, tesis.hucreler.length);
    if (!bilgi) return red("yapi_yok", "Bu yapı büyütülemez");
    if (i.ekHucreler.length !== bilgi.ek) return red("yuva", `Bu büyütme ${bilgi.ek} ek hücre ister (seçilen ${i.ekHucreler.length})`);
    const s_ = k.sahiplik;
    const dolu = new Set<HucreId>();
    for (const x of k.insaatlar) for (const id of x.hucreler) dolu.add(id);
    const alinacak: HucreId[] = [];
    for (const id of i.ekHucreler) {
      const h = idCoz(id);
      if (!h) return red("gecersiz_hucre", MESAJ.gecersiz_hucre, id);
      const sh = s_.hucreler.get(id);
      if (sh) {
        if (sh.sahip !== this.ben.id) return red("sahipli", "Hücre başkasına ait", id);
        if (dolu.has(id)) return red("yapi_var", "Hücrede zaten yapı var", id);
      } else {
        const neden = engelNedeni(durumAl(k.izgara, h.x, h.y));
        if (neden) return red("uygunsuz", `${MESAJ.uygunsuz}: ${neden}`, id);
        const kg = kamuGrubuBul(s_.kamu, h.x, h.y);
        if (kg) return red("kamu", kamuNedeni(kg.tur), id);
        if (!i.sinif) return red("sinif_uyusmuyor", "Satın alınacak hücrelerin arsa sınıfı belirtilmedi", id);
        if (arsaSinifi(durumAl(k.izgara, h.x, h.y)) !== i.sinif) return red("sinif_uyusmuyor", MESAJ.sinif_uyusmuyor, id);
        alinacak.push(id);
      }
    }
    if (!bitisikMi([...tesis.hucreler, ...i.ekHucreler])) return red("bitisik_degil", "Ek hücreler yapıya kenar kenara bitişik olmalı");
    let benim = 0;
    for (const h of s_.hucreler.values()) if (h.sahip === this.ben.id) benim++;
    if (benim + alinacak.length > ILCE_HUCRE_SINIRI) return red("hucre_siniri", MESAJ.hucre_siniri);
    if (benim + alinacak.length > Math.floor(ILCE_PAY_SINIRI * s_.uygun)) return red("pay_siniri", MESAJ.pay_siniri);
    const suren = k.insaatlar.filter((x) => x.bitis > simdi).length;
    if (suren >= (this.s.esZamanliInsaat ?? 2)) return red("esz_insaat", `Aynı anda en çok ${this.s.esZamanliInsaat ?? 2} inşaat sürebilir`);
    const arsa = alinacak.length ? parselFiyatiMili(i.sinif as ArsaSinifi, s_.satilmis, s_.uygun, alinacak.length) : 0;
    if (this.hazine !== null && this.hazine < arsa + bilgi.paraMili) return red("hazine", "Hazinede yeterli para yok");
    const t = this.saat();
    alinacak.forEach((id, n) => s_.hucreler.set(id, { sahip: this.ben.id, sinif: i.sinif as ArsaSinifi, degerMili: parselFiyatiMili(i.sinif as ArsaSinifi, s_.satilmis + n, s_.uygun, 1), alinma: t }));
    s_.satilmis += alinacak.length;
    if (this.hazine !== null) this.hazine -= arsa + bilgi.paraMili;
    k.insaatlar.push({
      id: ++this.sonInsaat,
      ilce: tesis.ilce,
      tur: tesis.tur,
      hucreler: [...i.ekHucreler],
      baslangic: simdi,
      bitis: simdi + bilgi.sureSaat * 3_600_000,
      odenenMili: bilgi.paraMili,
      alinan: alinacak,
      arsaMili: arsa,
      yukseltme: { tesis: tesis.id, olcek: i.olcek },
    });
    this.degisti();
    return { tamam: true, t };
  }

  async tesisInsa(komut: TesisKomutu): Promise<TesisSonucu> {
    await this.bekle();
    const k = await this.kayit(komut.ilce);
    const red = (hata: Extract<TesisSonucu, { tamam: false }>["hata"], mesaj: string, hucre?: HucreId): TesisSonucu => ({ tamam: false, hata, mesaj, ...(hucre ? { hucre } : {}) });
    if (!k) return red("izgara_yok", MESAJ.izgara_yok);
    const yapi = this.s.yapiBilgisi?.(komut.tesisTuru) ?? null;
    if (!yapi) return red("yapi_yok", "Bu yapı türü kurulamaz");
    if (komut.hucreler.length !== yapi.yuva) return red("yuva", `Bu yapı ${yapi.yuva} hücre kaplar (verilen ${komut.hucreler.length})`);
    const simdi = this.simZamani();
    const dolu = new Set<HucreId>();
    for (const i of k.insaatlar) for (const id of i.hucreler) dolu.add(id);
    for (const id of komut.hucreler) {
      const h = k.sahiplik.hucreler.get(id);
      if (!h || h.sahip !== this.ben.id) return red("sahipli", "Hücre senin değil", id);
      if (dolu.has(id)) return red("yapi_var", "Hücrede zaten yapı var", id);
    }
    const suren = k.insaatlar.filter((i) => i.bitis > simdi).length;
    if (suren >= (this.s.esZamanliInsaat ?? 2)) return red("esz_insaat", `Aynı anda en çok ${this.s.esZamanliInsaat ?? 2} inşaat sürebilir`);
    if (this.hazine !== null && this.hazine < yapi.paraMili) return red("hazine", "Hazinede yeterli para yok");
    if (this.hazine !== null) this.hazine -= yapi.paraMili;
    k.insaatlar.push({ id: ++this.sonInsaat, ilce: komut.ilce, tur: komut.tesisTuru, hucreler: [...komut.hucreler], baslangic: simdi, bitis: simdi + yapi.sureSaat * 3_600_000 });
    this.degisti();
    return { tamam: true, t: this.saat() };
  }
}
