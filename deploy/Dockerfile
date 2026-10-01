# syntax=docker/dockerfile:1.7
# Bolge Stratejisi sunucusu: cok asamali, root olmayan kullanici, healthcheck.
#   Derleme baglami: DEPO KOKU.   docker build -f deploy/Dockerfile -t bolge-sunucu .
# Yapilandirma YALNIZ ortam degiskenleriyle (BOLGE_*; bkz. `deploy/.env.ornek` ve packages/sunucu/README.md "Alfa-0 isletim").

ARG NODE_SURUMU=22
ARG PNPM_SURUMU=10.33.0

# --- 1. asama: bagimliliklar (yalniz sunucunun ve kullandigi paketlerin; istemci/olcum/veri-hatti kurulmaz) ---------------------
FROM node:${NODE_SURUMU}-bookworm-slim AS bagimliliklar
ARG PNPM_SURUMU
ENV CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@${PNPM_SURUMU} --activate
WORKDIR /uygulama
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `Dockerfile.dockerignore`: buyuk paketlerde (istemci, veri-hatti, olcum, izleyici) yalniz package.json kalir; kilit dosyasi tutarli kalir.
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter "@bolge/sunucu..." --filter .

# --- 2. asama: calisma imaji ---------------------------------------------------------------------------------------------------
FROM node:${NODE_SURUMU}-bookworm-slim AS calisma
ENV NODE_ENV=production \
    BOLGE_HOST=0.0.0.0 \
    BOLGE_PORT=8787 \
    BOLGE_DIZIN=/veri
WORKDIR /uygulama
# Kod ve node_modules kopyalanir (sunucu TypeScript'i `tsx` ile calistirir: kok devDependency, imajda kalir).
COPY --from=bagimliliklar --chown=node:node /uygulama /uygulama
# Dosya deposu (BOLGE_DEPO=dosya) icin kalici veri dizini; pg kullaniliyorsa kullanilmaz.
RUN mkdir -p /veri && chown node:node /veri
VOLUME ["/veri"]
USER node
EXPOSE 8787
# /saglik: yazar yasiyorsa 200 (kapali sureyi yetistirirken de); olumcul/kapaniyor 503. /hazir yetisme bitince 200.
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.BOLGE_PORT||8787)+'/saglik').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# SIGTERM: kuyruk yazilir, kapanis goruntusu alinir (docker stop icin `stop_grace_period` yeterli verilmeli).
STOPSIGNAL SIGTERM
CMD ["node", "--import", "tsx", "packages/sunucu/src/cli.ts"]
