/**
 * Test dünyası silme ve sayım (insan testi İ3; KVKK silme taahhüdü): `--test-dunya-sil <ad>` bir TEST dünyasının günlüğünü, anlık görüntülerini (yedekler dahil),
 * profil/damga kayıtlarını, oyun oturum kayıtlarını ve o dünyadaki oyuncuların hesap/auth satırlarını TEK komutla, artık bırakmadan siler.
 * `--test-dunya-say <ad>` aynı tabloları sayar (komuttan sonra 0 olmalı; O3 provası kullanır).
 *
 * GÜVENLİK: paylaşılan dünyanın günlüğünden satır SİLİNMEZ.
 * - Dünya adı test önekiyle (`test`, `BOLGE_TEST_DUNYA_ONEKI`) başlamalıdır; dosya deposunda ayrıca dizinin adı da. Aksi halde komut reddedilir.
 * - Dünyanın yazarı çalışıyorsa (pg: advisory kilit, dosya: `yazar.kilit`) reddedilir.
 * - Hesaplar yalnız bu dünyanın oyuncularıysa silinir: aynı oyuncu BAŞKA bir dünyada da (günlük, profil, oturum) varsa hesabı KORUNUR (raporda `korunanHesap`).
 *   Hesap kimliği önekiyle (`--test-hesap-oneki`, G5 testlerindeki `pgh...` gibi) açıkça istenen hesaplar bu korumaya tabi değildir.
 * pg'de hepsi tek işlemdir. Hesap tabloları dünyadan bağımsızdır (G5): eşleme `hesap_oyuncu.oyuncu_id` üzerindendir, `ON DELETE CASCADE` oturum ve eşlemeyi götürür.
 */
import { readFile, readdir, rmdir, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fnv1a32 } from "@bolge/cekirdek";
import { pgHavuzuAc } from "./depo/pg-havuz";

export const TEST_DUNYA_ONEKI = "test";

export interface TestDunyaRaporu {
  dunya: string;
  depo: "pg" | "dosya";
  /** Tablo (ya da dosya) -> silinen satır sayısı. */
  silinen: Record<string, number>;
  /** Dünyanın oyuncuları (günlük, profil ve oturum kayıtlarından). */
  oyuncular: string[];
  /** Başka dünyada da kullanıldığı için silinmeyen hesap sayısı. */
  korunanHesap: number;
  /** Dosya deposu: silmeden sonra BOŞ kalan test dünyası dizininin kendisi de silindi mi (içinde başka dosya varsa silinmez). */
  dizinSilindi?: boolean;
  toplam: number;
}

export interface TestDunyaSecenekleri {
  dunya: string;
  /** Test dünyası adı öneki (varsayılan `test`). */
  onek?: string;
  /** Açıkça istenen test hesapları: hesap kimliği bu önekle başlayanlar da silinir. */
  hesapOneki?: string;
}

/** Öneklerin en kısa uzunluğu: boş ya da çok kısa önek her dünya/hesap adını "test" sayabilir (geri dönüşü olmayan komut). */
export const EN_KISA_ONEK = 3;
/** Hiçbir önekle silinemeyen dünya adı (CLI'nin varsayılan dünyası). */
export const KORUNAN_DUNYA = "ana";
/** Dosya deposunun varsayılan dizini (CLI): asla silinemez. */
export const VARSAYILAN_DOSYA_DIZINI = "raporlar/dunya";

export function onekDenetle(onek: string, ad: string): void {
  if (onek.length < EN_KISA_ONEK) throw new Error(`test dunyasi silme reddedildi: ${ad} en az ${EN_KISA_ONEK} karakter olmali (bos ya da kisa onek her adi kapsar): "${onek}"`);
}

/** Ad test önekiyle başlamıyorsa (örn. `ana`) reddeder; `ana` hiçbir önekle silinemez; önek boş/kısa olamaz. */
export function testDunyaAdiniDenetle(ad: string, onek: string = TEST_DUNYA_ONEKI): void {
  onekDenetle(onek, "dunya oneki");
  if (ad === KORUNAN_DUNYA) throw new Error(`test dunyasi silme reddedildi: "${ad}" varsayilan/canli dunyadir ve hicbir onekle silinemez`);
  if (ad === "" || !ad.startsWith(onek)) throw new Error(`test dunyasi silme reddedildi: dunya adi "${ad}" "${onek}" oneki ile baslamiyor (paylasilan dunya silinmez; BOLGE_TEST_DUNYA_ONEKI)`);
}

export interface SilmeDenetimi {
  dunya: string;
  onek: string;
  hesapOneki?: string | undefined;
  /** CLI'nin etkin `--dunya` değeri (varsayılan `ana` ya da BOLGE_DUNYA): canlı dünya sayılır. */
  canliDunya: string;
  /** Dosya deposu dizini (çözülmüş) ve varsayılan dizin (çözülmüş); pg'de verilmez. */
  dizin?: string;
  varsayilanDizin?: string;
  uretim: boolean;
  /** `--evet-sil <dünya adı>` ya da BOLGE_TEST_DUNYA_SIL_ONAY: adın ikinci kez yazılması. */
  onay?: string | undefined;
}

/**
 * CLI silme sertleştirmesi (saf): önekler >= 3 karakter; `ana`, CLI'nin etkin dünyası ve varsayılan dosya dizini hiçbir önekle silinemez; `--uretim`'de adın
 * ikinci kez yazılması (onay) şarttır. Kütüphane işlevleri ayrıca adı/öneki kendileri denetler.
 */
export function silmeyiDenetle(d: SilmeDenetimi): void {
  testDunyaAdiniDenetle(d.dunya, d.onek);
  if (d.hesapOneki !== undefined) onekDenetle(d.hesapOneki, "hesap oneki");
  if (d.dunya === d.canliDunya) throw new Error(`test dunyasi silme reddedildi: "${d.dunya}" bu sunucunun varsayilan/canli dunyasidir (--dunya / BOLGE_DUNYA)`);
  if (d.dizin !== undefined && d.varsayilanDizin !== undefined && d.dizin === d.varsayilanDizin) throw new Error(`test dunyasi silme reddedildi: varsayilan dosya dizini (${VARSAYILAN_DOSYA_DIZINI}) silinemez`);
  if (d.uretim && d.onay !== d.dunya) throw new Error(`test dunyasi silme reddedildi: --uretim kipinde dunya adi ikinci kez yazilmali: --evet-sil ${d.dunya} (ya da BOLGE_TEST_DUNYA_SIL_ONAY=${d.dunya})`);
}

const DUNYA_TABLOLARI = ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit", "profil_damga", "oyun_oturum", "oyun_oturum_gunluk"] as const;

type Sorgulayici = { query<T = Record<string, unknown>>(sql: string, p?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> };

async function tabloVar(c: Sorgulayici, t: string): Promise<boolean> {
  const r = await c.query<{ var: boolean }>("SELECT to_regclass($1) IS NOT NULL AS var", [t]);
  return r.rows[0]?.var === true;
}

/** Bir dünyanın oyuncuları: günlükteki katılımlar ve komut sahipleri, profil, oyun oturumu. `dunyaKosulu`: "=" (bu dünya) ya da "<>" (diğerleri). */
async function oyuncular(c: Sorgulayici, dunya: string, kosul: "=" | "<>", var_: ReadonlySet<string>): Promise<Set<string>> {
  const k = new Set<string>();
  const ekle = async (sql: string): Promise<void> => {
    for (const r of (await c.query<{ o: string | null }>(sql, [dunya])).rows) if (r.o) k.add(r.o);
  };
  if (var_.has("log")) {
    await ekle(`SELECT DISTINCT komut->>'oyuncu' AS o FROM log WHERE dunya ${kosul} $1 AND komut->>'tur' = 'oyuncu_katil'`);
    await ekle(`SELECT DISTINCT hesap AS o FROM log WHERE dunya ${kosul} $1 AND hesap <> 'sistem'`);
  }
  if (var_.has("profil_capa")) await ekle(`SELECT DISTINCT oyuncu AS o FROM profil_capa WHERE dunya ${kosul} $1`);
  if (var_.has("oyun_oturum")) await ekle(`SELECT DISTINCT oyuncu AS o FROM oyun_oturum WHERE dunya ${kosul} $1`);
  return k;
}

async function mevcutTablolar(c: Sorgulayici): Promise<Set<string>> {
  const s = new Set<string>();
  for (const t of [...DUNYA_TABLOLARI, "hesap", "hesap_oyuncu", "giris_baglanti", "oturum"]) if (await tabloVar(c, t)) s.add(t);
  return s;
}

/** pg: test dünyasını ve (başka dünyada kullanılmayan) hesaplarını tek işlemde siler. */
export async function pgTestDunyasiSil(baglanti: string, s: TestDunyaSecenekleri): Promise<TestDunyaRaporu> {
  testDunyaAdiniDenetle(s.dunya, s.onek);
  if (s.hesapOneki !== undefined) onekDenetle(s.hesapOneki, "hesap oneki");
  const havuz = await pgHavuzuAc({ connectionString: baglanti, max: 2 }); // error dinleyicili: kapanışta yönetici kesmesi (57P01) süreci düşürmez
  const c = await havuz.connect();
  const kilitAnahtari = fnv1a32(`bolge-dunya:${s.dunya}`) | 0;
  try {
    const kilit = await c.query<{ alindi: boolean }>("SELECT pg_try_advisory_lock($1) AS alindi", [kilitAnahtari]);
    if (kilit.rows[0]?.alindi !== true) throw new Error(`test dunyasi silme reddedildi: dunya acik, baska bir yazar calisiyor (advisory lock): ${s.dunya}`);
    const tablolar = await mevcutTablolar(c);
    await c.query("BEGIN");
    try {
      const benim = await oyuncular(c, s.dunya, "=", tablolar);
      const baskasi = await oyuncular(c, s.dunya, "<>", tablolar);
      const korunan = new Set([...benim].filter((o) => baskasi.has(o)));
      const silinecek = [...benim].filter((o) => !korunan.has(o)).sort();
      const silinen: Record<string, number> = {};
      let korunanHesap = 0;
      if (tablolar.has("hesap") && tablolar.has("hesap_oyuncu")) {
        const k = await c.query<{ n: number }>("SELECT count(*)::int AS n FROM hesap_oyuncu WHERE oyuncu_id = ANY($1::text[])", [[...korunan]]);
        korunanHesap = k.rows[0]?.n ?? 0;
        const h = await c.query<{ id: string; eposta_anahtar: string }>(
          `SELECT h.id, h.eposta_anahtar FROM hesap h LEFT JOIN hesap_oyuncu o ON o.hesap_id = h.id
            WHERE o.oyuncu_id = ANY($1::text[]) ${s.hesapOneki === undefined ? "" : "OR h.id LIKE $2"}`,
          s.hesapOneki === undefined ? [silinecek] : [silinecek, `${s.hesapOneki}%`],
        );
        const idler = h.rows.map((x) => x.id);
        const anahtarlar = h.rows.map((x) => x.eposta_anahtar);
        if (tablolar.has("oturum")) silinen["oturum"] = (await c.query("SELECT 1 FROM oturum WHERE hesap_id = ANY($1::text[])", [idler])).rowCount ?? 0;
        if (tablolar.has("giris_baglanti")) silinen["giris_baglanti"] = (await c.query("DELETE FROM giris_baglanti WHERE eposta_anahtar = ANY($1::text[])", [anahtarlar])).rowCount ?? 0;
        silinen["hesap_oyuncu"] = (await c.query("SELECT 1 FROM hesap_oyuncu WHERE hesap_id = ANY($1::text[])", [idler])).rowCount ?? 0;
        silinen["hesap"] = (await c.query("DELETE FROM hesap WHERE id = ANY($1::text[])", [idler])).rowCount ?? 0; // hesap_oyuncu ve oturum ON DELETE CASCADE
      }
      for (const t of DUNYA_TABLOLARI) if (tablolar.has(t)) silinen[t] = (await c.query(`DELETE FROM ${t} WHERE dunya = $1`, [s.dunya])).rowCount ?? 0;
      await c.query("COMMIT");
      const toplam = Object.values(silinen).reduce((a, b) => a + b, 0);
      return { dunya: s.dunya, depo: "pg", silinen, oyuncular: [...benim].sort(), korunanHesap, toplam };
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock($1)", [kilitAnahtari]).catch(() => undefined);
    c.release();
    await havuz.end();
  }
}

export interface TestDunyaSayimi {
  dunya: string;
  depo: "pg" | "dosya";
  /** Tablo (ya da dosya) -> kalan satır. */
  kalan: Record<string, number>;
  toplam: number;
}

/**
 * pg: test dünyasına ve test koduna ait KALAN satırları tablo tablo sayar. `oyuncular`: dünyanın oyuncuları (silme raporundaki liste; dünya silindikten sonra günlükten
 * türetilemez) için `hesap_oyuncu`/`hesap`/`oturum`; `hesapOneki`: hesap kimliği öneki.
 */
export async function pgTestDunyasiSay(baglanti: string, s: { dunya: string; oyuncular?: readonly string[]; hesapOneki?: string }): Promise<TestDunyaSayimi> {
  const havuz = await pgHavuzuAc({ connectionString: baglanti, max: 1 });
  try {
    const tablolar = await mevcutTablolar(havuz);
    const kalan: Record<string, number> = {};
    const say = async (ad: string, sql: string, p: unknown[]): Promise<void> => {
      kalan[ad] = (await havuz.query<{ n: number }>(sql, p)).rows[0]?.n ?? 0;
    };
    for (const t of DUNYA_TABLOLARI) if (tablolar.has(t)) await say(t, `SELECT count(*)::int AS n FROM ${t} WHERE dunya = $1`, [s.dunya]);
    const oy = [...(s.oyuncular ?? [])];
    const onek = s.hesapOneki === undefined ? null : `${s.hesapOneki}%`;
    if (tablolar.has("hesap_oyuncu")) {
      await say("hesap_oyuncu", "SELECT count(*)::int AS n FROM hesap_oyuncu WHERE oyuncu_id = ANY($1::text[]) OR hesap_id LIKE $2", [oy, onek ?? ""]);
      await say("hesap", "SELECT count(*)::int AS n FROM hesap h WHERE id LIKE $2 OR EXISTS (SELECT 1 FROM hesap_oyuncu o WHERE o.hesap_id = h.id AND o.oyuncu_id = ANY($1::text[]))", [oy, onek ?? ""]);
    }
    if (tablolar.has("oturum")) await say("oturum", "SELECT count(*)::int AS n FROM oturum t WHERE hesap_id LIKE $2 OR EXISTS (SELECT 1 FROM hesap_oyuncu o WHERE o.hesap_id = t.hesap_id AND o.oyuncu_id = ANY($1::text[]))", [oy, onek ?? ""]);
    if (tablolar.has("giris_baglanti") && onek !== null) await say("giris_baglanti", "SELECT count(*)::int AS n FROM giris_baglanti WHERE eposta_anahtar LIKE $1", [onek]);
    return { dunya: s.dunya, depo: "pg", kalan, toplam: Object.values(kalan).reduce((a, b) => a + b, 0) };
  } finally {
    await havuz.end();
  }
}

// --- dosya deposu ----------------------------------------------------------------------------------------------------------

const DOSYA_JSONL = ["gunluk.jsonl", "profil.jsonl", "hesap.jsonl", "oyun-oturum.jsonl"] as const;

async function satirSay(yol: string): Promise<number> {
  const m = await readFile(yol, "utf8").catch(() => "");
  return m === "" ? 0 : m.split("\n").filter((x) => x !== "").length;
}

async function dosyaOyunculari(dizin: string): Promise<string[]> {
  const k = new Set<string>();
  const m = await readFile(join(dizin, "gunluk.jsonl"), "utf8").catch(() => "");
  for (const satir of m.split("\n")) {
    if (satir === "") continue;
    try {
      const o = JSON.parse(satir) as { oyuncu?: string; komut?: { tur?: string; oyuncu?: string } };
      if (o.komut?.tur === "oyuncu_katil" && o.komut.oyuncu) k.add(o.komut.oyuncu);
      if (o.oyuncu && o.oyuncu !== "sistem") k.add(o.oyuncu);
    } catch {
      // yarım son satır
    }
  }
  return [...k].sort();
}

function dosyaAdiniDenetle(dizin: string, onek: string): void {
  const ad = basename(resolve(dizin));
  if (!ad.startsWith(onek)) throw new Error(`test dunyasi silme reddedildi: dizin adi "${ad}" "${onek}" oneki ile baslamiyor (paylasilan dunya dizini silinmez)`);
}

/** Dosya deposu: test dünyası dizinindeki bilinen dosyaları siler (başka dosyaya dokunmaz). Dizin adı test önekiyle başlamalı; yazar kilidi tutuluyorsa reddedilir. */
export async function dosyaTestDunyasiSil(dizin: string, s: TestDunyaSecenekleri): Promise<TestDunyaRaporu> {
  const onek = s.onek ?? TEST_DUNYA_ONEKI;
  testDunyaAdiniDenetle(s.dunya, onek);
  dosyaAdiniDenetle(dizin, onek);
  if (resolve(dizin) === resolve(VARSAYILAN_DOSYA_DIZINI)) throw new Error(`test dunyasi silme reddedildi: varsayilan dosya dizini (${VARSAYILAN_DOSYA_DIZINI}) silinemez`);
  const { kilitAl } = await import("./depo/dosya");
  const birak = await kilitAl(dizin); // yazar çalışıyorsa fırlatır
  let rapor: TestDunyaRaporu;
  try {
    const silinen: Record<string, number> = {};
    const oy = await dosyaOyunculari(dizin);
    for (const ad of DOSYA_JSONL) {
      silinen[ad] = await satirSay(join(dizin, ad));
      await rm(join(dizin, ad), { force: true });
      await rm(join(dizin, `${ad}.tmp`), { force: true });
    }
    const gd = join(dizin, "goruntu");
    silinen["goruntu"] = (await readdir(gd).catch(() => [] as string[])).length;
    await rm(gd, { recursive: true, force: true });
    rapor = { dunya: s.dunya, depo: "dosya", silinen, oyuncular: oy, korunanHesap: 0, toplam: Object.values(silinen).reduce((a, b) => a + b, 0) };
  } finally {
    await birak(); // yazar.kilit kalkar
  }
  // Boş kalan test dünyası dizininin kendisi de silinir: YALNIZ boşsa (rmdir özyinelemesizdir; başka dosya varsa ENOTEMPTY ile atlanır, elle konan dosyaya dokunulmaz).
  // Dizin adı test önekiyle başlar (yukarıda denetlendi) ve varsayılan dizin değildir.
  rapor.dizinSilindi = await rmdir(dizin).then(() => true, () => false);
  return rapor;
}

/** Dosya deposu: test dünyası dizininde kalan dosya/satır sayısı (silmeden sonra 0). */
export async function dosyaTestDunyasiSay(dizin: string, dunya: string): Promise<TestDunyaSayimi> {
  const kalan: Record<string, number> = {};
  for (const ad of DOSYA_JSONL) kalan[ad] = await satirSay(join(dizin, ad));
  kalan["goruntu"] = (await readdir(join(dizin, "goruntu")).catch(() => [] as string[])).length;
  if (!(await stat(dizin).catch(() => null))) for (const k of Object.keys(kalan)) kalan[k] = 0;
  return { dunya, depo: "dosya", kalan, toplam: Object.values(kalan).reduce((a, b) => a + b, 0) };
}
