# Parsel ölçümü — ayrıştırma (v1-ayristirma)

Aynı bot dağılımı ve aynı tohumlarla, üç ayarın etkisini ayrı ayrı ölçer: **P3d yurt kuralı** (yurt önce ayrılmış dışından), **P3b çok hesap kuralları** (ayrılmış hücre yalnız katılım ilçesinde + günlük ilçe tavanı) ve **ilceSec ayrılmış önceliği** (ayak izine yeten ilçe önce). P3b kapatma yalnız koşucu seçeneğidir (veri kopyası; parametreler.json değişmez).

**Bulgular ve yorum (elle yazılmış):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Koşular

| Etiket | Dosya | Ayarlar | Bot tohumu | Koşu tohumları |
|---|---|---|---|---|
| v1-ayristirma-a | parsel-v1-ayristirma-a.json | P3b AÇIK · ilceSec önceliği KAPALI · yurt kuralı AÇIK | 7 | 1, 2, 3 |
| v1-ayristirma-b | parsel-v1-ayristirma-b.json | P3b KAPALI · ilceSec önceliği AÇIK · yurt kuralı AÇIK | 7 | 1, 2, 3 |
| v1-ayristirma-c | parsel-v1-ayristirma-c.json | P3b AÇIK · ilceSec önceliği AÇIK · yurt kuralı AÇIK | 7 | 1, 2, 3 |
| v1-ayristirma-d | parsel-v1-ayristirma-d.json | P3b AÇIK · ilceSec önceliği AÇIK · yurt kuralı KAPALI | 7 | 1, 2, 3 |
| v1-ayristirma-e | parsel-v1-ayristirma-e.json | P3b KAPALI · ilceSec önceliği KAPALI · yurt kuralı KAPALI | 7 | 1, 2, 3 |

## 2. Özet (tohumlar üzerinden ortalama; en düşük–en yüksek parantezde)

| Etiket | Ayrılmış kalan (geç katılımdan önce, boş) | Açılış (i) tutan olgu | Y7 ölçülebilen olgu | H6 yeni (tohum başına) | H6 eski tanım (tohum başına) | Genç spekülatör ayrılmış | Yerleşik + yurt ayrılmış | Yaşlı spekülatör | Geç katılan |
|---|---|---|---|---|---|---|---|---|---|
| v1-ayristirma-a | 536.7 (534–541) / 897 | 9 / 9 (tohum başına 3–3 / 3) | 4 / 9 (tohum başına 1–2 / 3) | GEÇTİ · GEÇTİ · GEÇTİ | KALDI · KALDI · KALDI | 138.7 (134–144) | 221.7 (218–229) | 0 | 12.3 (11–15) |
| v1-ayristirma-b | 242 (230–255) / 897 | 9 / 9 (tohum başına 3–3 / 3) | 1 / 9 (tohum başına 0–1 / 3) | BELİRSİZ · BELİRSİZ · GEÇTİ | KALDI · KALDI · KALDI | 467.3 (462–471) | 187.7 (180–196) | 0 | 9 (6–15) |
| v1-ayristirma-c | 536.7 (534–541) / 897 | 9 / 9 (tohum başına 3–3 / 3) | 4 / 9 (tohum başına 1–2 / 3) | GEÇTİ · GEÇTİ · GEÇTİ | KALDI · KALDI · KALDI | 138.7 (134–144) | 221.7 (218–229) | 0 | 12.3 (11–15) |
| v1-ayristirma-d | 342 (326–358) / 897 | 9 / 9 (tohum başına 3–3 / 3) | 1 / 9 (tohum başına 0–1 / 3) | BELİRSİZ · GEÇTİ · BELİRSİZ | KALDI · KALDI · KALDI | 171.3 (158–190) | 342 (334–350) | 41.7 (39–47) | 5.3 (4–8) |
| v1-ayristirma-e | 92.3 (86–102) / 897 | 0 / 9 (tohum başına 0–0 / 3) | 5 / 9 (tohum başına 1–2 / 3) | KALDI · KALDI · KALDI | KALDI · KALDI · KALDI | 461 | 302 (295–311) | 41.7 (39–47) | 0 |

## 3. Tohum başına döküm

| Etiket | Tohum | Ayrılmış kalan | Açılış (i) | Y7 ölçülebilen | H6 yeni | H6 eski | Genç spekülatör | Yerleşik + yurt | Yaşlı | Geç |
|---|---|---|---|---|---|---|---|---|---|---|
| v1-ayristirma-a | 1 | 541 / 897 | 3 / 3 | 2 / 3 | GEÇTİ | KALDI | 138 | 218 | 0 | 11 |
| v1-ayristirma-a | 2 | 535 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 144 | 218 | 0 | 15 |
| v1-ayristirma-a | 3 | 534 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 134 | 229 | 0 | 11 |
| v1-ayristirma-b | 1 | 255 / 897 | 3 / 3 | 0 / 3 | BELİRSİZ | KALDI | 462 | 180 | 0 | 15 |
| v1-ayristirma-b | 2 | 241 / 897 | 3 / 3 | 0 / 3 | BELİRSİZ | KALDI | 469 | 187 | 0 | 6 |
| v1-ayristirma-b | 3 | 230 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 471 | 196 | 0 | 6 |
| v1-ayristirma-c | 1 | 541 / 897 | 3 / 3 | 2 / 3 | GEÇTİ | KALDI | 138 | 218 | 0 | 11 |
| v1-ayristirma-c | 2 | 535 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 144 | 218 | 0 | 15 |
| v1-ayristirma-c | 3 | 534 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 134 | 229 | 0 | 11 |
| v1-ayristirma-d | 1 | 358 / 897 | 3 / 3 | 0 / 3 | BELİRSİZ | KALDI | 158 | 334 | 47 | 8 |
| v1-ayristirma-d | 2 | 326 / 897 | 3 / 3 | 1 / 3 | GEÇTİ | KALDI | 190 | 342 | 39 | 4 |
| v1-ayristirma-d | 3 | 342 / 897 | 3 / 3 | 0 / 3 | BELİRSİZ | KALDI | 166 | 350 | 39 | 4 |
| v1-ayristirma-e | 1 | 89 / 897 | 0 / 3 | 2 / 3 | KALDI | KALDI | 461 | 300 | 47 | 0 |
| v1-ayristirma-e | 2 | 102 / 897 | 0 / 3 | 2 / 3 | KALDI | KALDI | 461 | 295 | 39 | 0 |
| v1-ayristirma-e | 3 | 86 / 897 | 0 / 3 | 1 / 3 | KALDI | KALDI | 461 | 311 | 39 | 0 |

Notlar: "H6 yeni" = Y7 + açılış koşulu (i) (docs/12 §13); "H6 eski tanım" = Y7 + ucuz hücre payı ≥ %20 (bilgi). Ayrılmış hücre sayıları koşu sonundaki sahiplik (yurt dahil). "Yerleşik + yurt": spekülatör ve geç katılan dışındaki tüm oyuncular (yurt hücrelerinin ayrılmış payı dahil).
