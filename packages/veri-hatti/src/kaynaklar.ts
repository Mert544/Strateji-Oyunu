/**
 * Kullanılan ham veri kaynakları. Hepsi kamu malıdır (lisanslar DATA_SOURCES.md'de).
 * Sürüm sabitlenir: Natural Earth etiketi v5.1.2 (master ile bayt bayt aynı doğrulandı);
 * USGS MRDS tek anlık görüntüdür (mrds.csv, 2022-08-23). Bayt özetleri kaynak-ozetleri.json'da kilitlidir.
 */
export interface KaynakTanimi {
  kimlik: string;
  /** Önbellekteki dosya adı. */
  dosya: string;
  url: string;
  aciklama: string;
  lisans: string;
}

const NE_TABAN = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson";

export const KAYNAKLAR: readonly KaynakTanimi[] = [
  {
    kimlik: "ne_admin1",
    dosya: "ne_10m_admin_1_states_provinces.geojson",
    url: `${NE_TABAN}/ne_10m_admin_1_states_provinces.geojson`,
    aciklama: "Natural Earth 1:10m Admin 1 - States, Provinces",
    lisans: "Kamu malı (public domain)",
  },
  {
    kimlik: "ne_admin0",
    dosya: "ne_10m_admin_0_countries.geojson",
    url: `${NE_TABAN}/ne_10m_admin_0_countries.geojson`,
    aciklama: "Natural Earth 1:10m Admin 0 - Countries (yalnızca kara/deniz ayrımı için)",
    lisans: "Kamu malı (public domain)",
  },
  {
    kimlik: "ne_ports",
    dosya: "ne_10m_ports.geojson",
    url: `${NE_TABAN}/ne_10m_ports.geojson`,
    aciklama: "Natural Earth 1:10m Ports",
    lisans: "Kamu malı (public domain)",
  },
  {
    kimlik: "ne_places",
    dosya: "ne_10m_populated_places_simple.geojson",
    url: `${NE_TABAN}/ne_10m_populated_places_simple.geojson`,
    aciklama: "Natural Earth 1:10m Populated Places (simple)",
    lisans: "Kamu malı (public domain)",
  },
  {
    kimlik: "usgs_mrds",
    dosya: "mrds-csv.zip",
    url: "https://mrdata.usgs.gov/mrds/mrds-csv.zip",
    aciklama: "USGS Mineral Resources Data System (MRDS) CSV",
    lisans: "Kamu malı (ABD federal hükümeti çalışması)",
  },
];
