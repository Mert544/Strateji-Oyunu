/**
 * Postgres hesap deposu (`sql/004-hesap.sql`): bellek ve dosya depolarıyla AYNI sözleşme (test/hesap-sozlesmesi.ts). Tablolar dünyadan
 * bağımsızdır. Her işlem tek ifadede ya da tek işlemde (BEGIN/COMMIT) yapılır; yanıt commit sonrası döner. bigint sütunlar dizge gelir
 * (epoch ms 2^53'ün çok altındadır; `Number` güvenlidir).
 */
import type { Pool } from "pg";
import { OyuncuCakismasi } from "./tipler";
import type { BaglantiKaydi, BaglantiTuketimi, HesapDeposu, HesapKaydi, OturumKaydi } from "./tipler";

interface HesapSatiri {
  id: string;
  eposta: string;
  eposta_anahtar: string;
  olusturma: string;
  oyuncu_id: string;
  ad: string | null;
  ad_secildi: boolean;
  ad_degisim_t: string | null;
}

interface BaglantiSatiri {
  ozet: string;
  eposta: string;
  eposta_anahtar: string;
  bitis: string;
  tarayici_ozeti: string | null;
  olusturma: string;
}

interface OturumSatiri {
  id: string;
  hesap_id: string;
  gizli_ozet: string;
  olusturma: string;
  son_kullanim: string;
  bitis: string;
  mutlak_bitis: string;
}

const HESAP_SECIMI = "SELECT h.id, h.eposta, h.eposta_anahtar, h.olusturma, o.oyuncu_id, h.ad, h.ad_secildi, h.ad_degisim_t FROM hesap h JOIN hesap_oyuncu o ON o.hesap_id = h.id";

const hesapKaydi = (x: HesapSatiri): HesapKaydi => {
  const k: HesapKaydi = { id: x.id, eposta: x.eposta, anahtar: x.eposta_anahtar, oyuncu: x.oyuncu_id, olusturma: Number(x.olusturma) };
  if (x.ad !== null) k.ad = x.ad;
  if (x.ad_secildi) k.adSecildi = true;
  if (x.ad_degisim_t !== null) k.adDegisimT = Number(x.ad_degisim_t);
  return k;
};
const baglantiKaydi = (x: BaglantiSatiri): BaglantiKaydi => ({ ozet: x.ozet, eposta: x.eposta, anahtar: x.eposta_anahtar, bitis: Number(x.bitis), tarayiciOzeti: x.tarayici_ozeti, olusturma: Number(x.olusturma) });
const oturumKaydi = (x: OturumSatiri): OturumKaydi => ({
  id: x.id,
  hesap: x.hesap_id,
  gizliOzet: x.gizli_ozet,
  olusturma: Number(x.olusturma),
  sonKullanim: Number(x.son_kullanim),
  bitis: Number(x.bitis),
  mutlakBitis: Number(x.mutlak_bitis),
});

const BENZERSIZLIK_IHLALI = "23505";

export class PostgresHesapDeposu implements HesapDeposu {
  constructor(private readonly havuz: Pool) {}

  async hesapOlustur(h: HesapKaydi): Promise<{ hesap: HesapKaydi; yeni: boolean }> {
    const c = await this.havuz.connect();
    try {
      await c.query("BEGIN");
      const r = await c.query("INSERT INTO hesap (id, eposta, eposta_anahtar, olusturma, ad, ad_secildi, ad_degisim_t) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (eposta_anahtar) DO NOTHING", [h.id, h.eposta, h.anahtar, h.olusturma, h.ad ?? null, h.adSecildi === true, h.adDegisimT ?? null]);
      if (r.rowCount === 0) {
        await c.query("ROLLBACK");
        const m = await c.query<HesapSatiri>(`${HESAP_SECIMI} WHERE h.eposta_anahtar = $1`, [h.anahtar]); // AYNI istemciyle: havuzdan ikinci baglanti alinmaz
        const mevcut = m.rows[0] ? hesapKaydi(m.rows[0]) : null;
        if (!mevcut) throw new Error("hesap olusturulamadi (eszamanli silme)");
        return { hesap: mevcut, yeni: false };
      }
      await c.query("INSERT INTO hesap_oyuncu (hesap_id, oyuncu_id) VALUES ($1,$2)", [h.id, h.oyuncu]);
      await c.query("COMMIT");
      return { hesap: { ...h }, yeni: true };
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      // Oyuncu kimligi (ya da hesap kimligi) çakıştı: çağıran yeni kimlikle yeniden dener.
      if ((e as { code?: string }).code === BENZERSIZLIK_IHLALI) throw new OyuncuCakismasi(h.oyuncu);
      throw e;
    } finally {
      c.release();
    }
  }

  async hesapBulAnahtar(anahtar: string): Promise<HesapKaydi | null> {
    const r = await this.havuz.query<HesapSatiri>(`${HESAP_SECIMI} WHERE h.eposta_anahtar = $1`, [anahtar]);
    return r.rows[0] ? hesapKaydi(r.rows[0]) : null;
  }

  async hesapBulId(id: string): Promise<HesapKaydi | null> {
    const r = await this.havuz.query<HesapSatiri>(`${HESAP_SECIMI} WHERE h.id = $1`, [id]);
    return r.rows[0] ? hesapKaydi(r.rows[0]) : null;
  }

  async adYaz(hesap: string, ad: string, secildi: boolean, degisimT: number | null): Promise<boolean> {
    const r = await this.havuz.query("UPDATE hesap SET ad = $2, ad_secildi = $3, ad_degisim_t = $4 WHERE id = $1", [hesap, ad, secildi, degisimT]);
    return (r.rowCount ?? 0) > 0;
  }

  async adVarMi(ad: string): Promise<boolean> {
    const r = await this.havuz.query("SELECT 1 FROM hesap WHERE ad = $1 LIMIT 1", [ad]);
    return (r.rowCount ?? 0) > 0;
  }

  async adlariListele(): Promise<Array<{ hesap: string; oyuncu: string; ad: string | null }>> {
    const r = await this.havuz.query<{ id: string; oyuncu_id: string; ad: string | null }>("SELECT h.id, o.oyuncu_id, h.ad FROM hesap h JOIN hesap_oyuncu o ON o.hesap_id = h.id");
    return r.rows.map((x) => ({ hesap: x.id, oyuncu: x.oyuncu_id, ad: x.ad }));
  }

  async hesapSil(id: string): Promise<string[] | null> {
    const c = await this.havuz.connect();
    try {
      await c.query("BEGIN");
      const h = await c.query<{ eposta_anahtar: string }>("SELECT eposta_anahtar FROM hesap WHERE id = $1 FOR UPDATE", [id]);
      if (!h.rows[0]) {
        await c.query("ROLLBACK");
        return null;
      }
      const o = await c.query<{ id: string }>("SELECT id FROM oturum WHERE hesap_id = $1", [id]);
      await c.query("DELETE FROM giris_baglanti WHERE eposta_anahtar = $1", [h.rows[0].eposta_anahtar]);
      await c.query("DELETE FROM hesap WHERE id = $1", [id]); // hesap_oyuncu ve oturum ON DELETE CASCADE
      await c.query("COMMIT");
      return o.rows.map((x) => x.id);
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  async baglantiEkle(k: BaglantiKaydi): Promise<void> {
    const c = await this.havuz.connect();
    try {
      await c.query("BEGIN");
      // Aynı adresin eşzamanlı iki isteği sıralansın (eski bağlantılar düşer, yalnız biri kalır).
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`giris_baglanti:${k.anahtar}`]);
      await c.query("DELETE FROM giris_baglanti WHERE eposta_anahtar = $1", [k.anahtar]);
      await c.query("INSERT INTO giris_baglanti (ozet, eposta, eposta_anahtar, bitis, tarayici_ozeti, olusturma) VALUES ($1,$2,$3,$4,$5,$6)", [k.ozet, k.eposta, k.anahtar, k.bitis, k.tarayiciOzeti, k.olusturma]);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  async baglantiTuket(ozet: string, simdi: number, tarayiciOzeti: string | null): Promise<BaglantiTuketimi> {
    // Tek ifade: geçerli ve tarayıcı uyumluysa sil ve döndür (iki eşzamanlı onaydan yalnız biri satır alır).
    const r = await this.havuz.query<BaglantiSatiri>(
      `DELETE FROM giris_baglanti WHERE ozet = $1 AND bitis > $2 AND (tarayici_ozeti IS NULL OR tarayici_ozeti = $3)
       RETURNING ozet, eposta, eposta_anahtar, bitis, tarayici_ozeti, olusturma`,
      [ozet, simdi, tarayiciOzeti],
    );
    if (r.rows[0]) return { durum: "tamam", kayit: baglantiKaydi(r.rows[0]) };
    const bekleyen = await this.havuz.query("SELECT 1 FROM giris_baglanti WHERE ozet = $1 AND bitis > $2", [ozet, simdi]);
    return { durum: (bekleyen.rowCount ?? 0) > 0 ? "tarayici" : "yok" };
  }

  async oturumEkle(o: OturumKaydi): Promise<void> {
    await this.havuz.query("INSERT INTO oturum (id, hesap_id, gizli_ozet, olusturma, son_kullanim, bitis, mutlak_bitis) VALUES ($1,$2,$3,$4,$5,$6,$7)", [o.id, o.hesap, o.gizliOzet, o.olusturma, o.sonKullanim, o.bitis, o.mutlakBitis]);
  }

  async oturumBul(id: string): Promise<OturumKaydi | null> {
    const r = await this.havuz.query<OturumSatiri>("SELECT id, hesap_id, gizli_ozet, olusturma, son_kullanim, bitis, mutlak_bitis FROM oturum WHERE id = $1", [id]);
    return r.rows[0] ? oturumKaydi(r.rows[0]) : null;
  }

  async oturumUzat(id: string, sonKullanim: number, bitis: number): Promise<void> {
    await this.havuz.query("UPDATE oturum SET son_kullanim = $2, bitis = $3 WHERE id = $1", [id, sonKullanim, bitis]);
  }

  async oturumSil(id: string): Promise<boolean> {
    const r = await this.havuz.query("DELETE FROM oturum WHERE id = $1", [id]);
    return (r.rowCount ?? 0) > 0;
  }

  async hesabinOturumlariniSil(hesap: string): Promise<string[]> {
    const r = await this.havuz.query<{ id: string }>("DELETE FROM oturum WHERE hesap_id = $1 RETURNING id", [hesap]);
    return r.rows.map((x) => x.id);
  }

  async sureGecmisleriSil(simdi: number): Promise<{ baglanti: number; oturum: number }> {
    const b = await this.havuz.query("DELETE FROM giris_baglanti WHERE bitis <= $1", [simdi]);
    const o = await this.havuz.query("DELETE FROM oturum WHERE bitis <= $1 OR mutlak_bitis <= $1", [simdi]);
    return { baglanti: b.rowCount ?? 0, oturum: o.rowCount ?? 0 };
  }

  async sayilar(): Promise<{ hesap: number; oturum: number; baglanti: number }> {
    const r = await this.havuz.query<{ hesap: string; oturum: string; baglanti: string }>(
      "SELECT (SELECT count(*) FROM hesap) AS hesap, (SELECT count(*) FROM oturum) AS oturum, (SELECT count(*) FROM giris_baglanti) AS baglanti",
    );
    const x = r.rows[0];
    return { hesap: Number(x?.hesap ?? 0), oturum: Number(x?.oturum ?? 0), baglanti: Number(x?.baglanti ?? 0) };
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}
}
