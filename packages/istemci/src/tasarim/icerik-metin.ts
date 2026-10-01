/**
 * İçerik açıklama ve ipucu metinleri (Tasarım; veri kaynağı T3 `icerik-metin.json`): mal, yapı, yöntem ve dükkân türü kimliği ->
 * tek cümlelik açıklama ve (varsa) tek cümlelik ipucu. Sade Türkçe, "sen" kipi, büyük harf yalnız cümle başında, para yazılmaz
 * (tutar değişir; `para()` ile ayrıca gösterilir). Kimlikler `packages/veri/icerik/kimlik-listesi.json` ile aynıdır; yeni kimlik gelince
 * satır eklenir (testler: kimlik, biçim, uzunluk, büyük harf yasağı).
 */
export interface IcerikMetni {
  aciklama: string;
  ipucu?: string;
}
export type IcerikTuru = "mal" | "yapi" | "yontem" | "dukkan";

export const ICERIK_METIN: Readonly<Record<IcerikTuru, Readonly<Record<string, IcerikMetni>>>> = {
  mal: {
    tahil: { aciklama: "Ekmeğin, yemin ve sütün ham maddesi.", ipucu: "Çiftlikte yetişir; değirmen, ahır ve gıda fabrikası alır." },
    gida: { aciklama: "Sofraya hazır temel yiyecek; bakkal, fırın ve şarküteri satar.", ipucu: "Zamanla bozulur: stokta çok bekletme." },
    cevher: { aciklama: "Çeliğin yer altından çıkan ham maddesi.", ipucu: "Çelikhane alır; ocağın yakınına çelikhane kur." },
    komur: { aciklama: "Yüksek fırının ve santralin yakıtı.", ipucu: "Çelikhane de santral de ister; ocağı ikisine yakın aç." },
    celik: { aciklama: "Her yapının iskeleti; parça, doğrama ve inşaat bundan çıkar.", ipucu: "İnşaat için ilk tükenen mal çeliktir; stoğu boş bırakma." },
    bakir: { aciklama: "Elektronik hatlarının teli.", ipucu: "Elektronik için silisle birlikte lazım." },
    silis: { aciklama: "Cam ve elektronik için ocaktan çıkan kum.", ipucu: "Başlangıç malında yok: silis ocağı kur ya da Pazar'dan al." },
    parca: { aciklama: "Makinenin ve yapının vidası, dişlisi.", ipucu: "Çelikle birlikte neredeyse her inşaatta lazım." },
    elektronik: { aciklama: "Pahalı ve küçük; otomatik hat bunu yer.", ipucu: "Bakır, silis ve parçayı bir araya getirmeden başlama." },
    petrol: { aciklama: "Kuyudan çıkar; rafineride yakıta, fabrikada gübreye dönüşür.", ipucu: "İşlemeden satmak yerine rafineriyle zinciri kısalt." },
    yakit: { aciklama: "Makine, fırın ve jeneratörün içtiği; bakkal da satar.", ipucu: "Fırın ve makineler yakıt yer; bedeli şebeke hesabında görünür." },
    muhimmat: { aciklama: "Ordu için üretilen mal.", ipucu: "Sivil raflarda yeri yok; ancak orduya gider." },
    gubre: { aciklama: "Toprağa verilir; ahırlarda yan ürün olarak da çıkar.", ipucu: "Tarlana gübre vermek verimi korur." },
    elektrik: { aciklama: "Şebekeden gelir, depolanmaz; her tesis çalışmak için ister.", ipucu: "Biriktirilemez: üretildiği saatte harcanır." },
    un: { aciklama: "Değirmende öğütülmüş tahıl; fırının ana girdisi.", ipucu: "Değirmenin kepeği de boşa gitmez: ahıra uğrat." },
    ekmek: { aciklama: "Her gün satılır, çabuk bayatlar.", ipucu: "Fırından çıkanı hemen rafa koy." },
    cam: { aciklama: "Pencerenin ve yapı marketin camı.", ipucu: "Cam fırınına silis götür; yakıt ve elektrik şebekeden gelir." },
    pencere: { aciklama: "Çelik ve camdan yapılır; dükkân kurarken de gerekir.", ipucu: "Yapı market satar; başlangıçta birkaç pencere hazır, ikinci dükkân için üretmen gerekir." },
    sut: { aciklama: "Ahırdan gelir; bakkal ve şarküteri satar.", ipucu: "Çabuk bozulur: ahırı dükkâna yakın tut." },
    sut_urunu: { aciklama: "Peynir, yoğurt ve benzerleri; şarküterinin vitrini.", ipucu: "Bakkalda da şarküteride de satılır." },
    findik: { aciklama: "Karadeniz'in kabuklu fındığı.", ipucu: "Kırılıp ayıklanınca fındık içi olur." },
    findik_urunu: { aciklama: "Ayıklanmış fındık; şekerci ve bakkal satar.", ipucu: "Şekerleme yapanlar da bundan çıkar." },
    sekerleme: { aciklama: "Bayram öncesi en çok aranan raf malı.", ipucu: "Bayrama bir hafta kala rafı doldur." },
    kepek: { aciklama: "Değirmenin yan ürünü; gübre ve süt besisinde işe yarar.", ipucu: "Çöpe gitmez: ahırda gübreye ya da süte döner." },
  },
  yapi: {
    ciftlik: { aciklama: "Tahıl yetiştirir; ova arsası ister.", ipucu: "Makineli tarım için yakıt, parça ve elektrik gelsin." },
    gida_fabrikasi: { aciklama: "Tahılı gıdaya, unu ekmeğe çevirir; değirmen ve fırın da burada.", ipucu: "Kurduktan sonra hangi yöntemin çalıştığına bak." },
    cevher_madeni: { aciklama: "Demir cevheri çıkarır; yatağı olan arsa ister.", ipucu: "Çelikhaneye yakın kur." },
    komur_ocagi: { aciklama: "Kömür çıkarır; yatağı olan arsa ister.", ipucu: "Çelikhane ile santral ona yakın olsun." },
    bakir_madeni: { aciklama: "Bakır çıkarır; yatağı olan arsa ister.", ipucu: "Elektronik fabrikasına yakın kur." },
    silis_ocagi: { aciklama: "Cam ve elektronik için silis çıkarır.", ipucu: "Cam fırını ve elektronik hattı silisini buradan alır." },
    petrol_kuyusu: { aciklama: "Ham petrol çıkarır; yatağı olan arsa ister.", ipucu: "Rafineriye ve gübre fabrikasına yakın kur." },
    celikhane: { aciklama: "Cevherden çelik döker.", ipucu: "Cevher ve kömür hazır olmadan kurma." },
    parca_fabrikasi: { aciklama: "Çelikten makine parçası üretir; cam fırını ve çelik doğrama da burada.", ipucu: "Çelik stoğun yetmeden kurma. Bir fabrika bir yöntemle çalışır: cam ve pencere için iki fabrika kur." },
    elektronik_fabrikasi: { aciklama: "Bakır ve silisten elektronik üretir.", ipucu: "Bakır, silis ve parça hazırsa kur." },
    rafineri: { aciklama: "Ham petrolü yakıta çevirir.", ipucu: "Petrol kuyusunun yanına kur." },
    muhimmat_fabrikasi: { aciklama: "Orduya mühimmat üretir.", ipucu: "Çelik ve yakıt gerekir." },
    ahir: { aciklama: "Hayvan besler: gıda, süt ve gübre verir; ova ister.", ipucu: "Değirmenden kepek geliyorsa kepekli yöntemleri dene." },
    mera: { aciklama: "Dağ otlağında hayvancılık; gıda ve biraz gübre verir.", ipucu: "Girdi istemez; dağlık arsa yeter." },
    gubre_fabrikasi: { aciklama: "Petrolden gübre üretir.", ipucu: "Tarlaya yakın olması iyi olur." },
    santral: { aciklama: "Kömür ya da yakıtla elektrik üretir.", ipucu: "Şebekeyi tamamlar; mutlaka kurman gerekmez." },
    hidro_santrali: { aciklama: "Akan suyla elektrik üretir; yakıt istemez.", ipucu: "Dağlık arsa ister." },
    sulama_kanali: { aciklama: "Tarlaya su taşır; kurak mevsimde verimi korur.", ipucu: "Elektrik tüketir: ucu çiftliğe dayansın." },
    ambar: { aciklama: "Deponu büyütür.", ipucu: "Stok taşıyorsa bir tane daha kur." },
    ticaret_ofisi: { aciklama: "Alım satımda komisyonu ve makası düşürür; emir yuvası ekler.", ipucu: "Çok alıp satıyorsan yararlı." },
    muhtarlik: { aciklama: "Mahallenin kamu binası; oyuncular kuramaz." },
    konut: { aciklama: "Mahalleye ev; kendi başına üretim yapmaz." },
    garaj: { aciklama: "Araçların barındığı yapı; kendi başına üretim yapmaz." },
    atolye_lab: { aciklama: "Araç ve parça işleri için çalışma yeri; kendi başına üretim yapmaz." },
    dukkan: { aciklama: "Rafına mal dizip mahalleliye satarsın.", ipucu: "Çeşidi çok tutarsan müşteri artar; raf boş kalırsa satış durur." },
  },
  yontem: {
    geleneksel_tarim: { aciklama: "Girdi istemeyen, işçisi çok olan eski usul ekim.", ipucu: "Başlangıç için yeter; makine gelince geç." },
    mekanize_tarim: { aciklama: "Daha çok tahıl, daha az işçi; yakıt, parça ve elektrik yer.", ipucu: "Teknolojisini açman gerekir." },
    standart_gida_isleme: { aciklama: "Tahılı doğrudan gıdaya çevirir.", ipucu: "Ekmek için değirmen ve fırın yöntemlerine de bak." },
    yuzey_cevher: { aciklama: "Yüzeydeki cevheri çıkarır; az girdi, orta verim.", ipucu: "Derin ocak için teknolojiyi aç." },
    derin_cevher: { aciklama: "Çok daha fazla cevher çıkarır; yakıt ve elektrik ister.", ipucu: "Teknolojisini açman gerekir." },
    yuzey_komur: { aciklama: "Yüzeydeki kömürü çıkarır; az girdi, orta verim.", ipucu: "Derin ocak için teknolojiyi aç." },
    derin_komur: { aciklama: "Çok daha fazla kömür çıkarır; yakıt ve elektrik ister.", ipucu: "Teknolojisini açman gerekir." },
    bakir_cikarim: { aciklama: "Madenden bakır çıkarır.", ipucu: "Elektronik fabrikası bunu bekler." },
    silis_cikarim: { aciklama: "Ocaktan silis çıkarır.", ipucu: "Cam fırınına ve elektroniğe gider." },
    petrol_cikarim: { aciklama: "Kuyudan ham petrol çıkarır.", ipucu: "Rafineriye ya da gübre fabrikasına taşı." },
    yuksek_firin: { aciklama: "Cevher ve kömürden çelik dökülür.", ipucu: "Kömür stoğuna dikkat." },
    elektrik_ark: { aciklama: "Kömür yerine yakıt ve elektrikle, daha az cevherden çelik dökülür.", ipucu: "Teknolojisini açman gerekir." },
    standart_parca: { aciklama: "Çelik ve yakıttan makine parçası üretir.", ipucu: "Parça stoğu inşaatın da makinelerin de ihtiyacı." },
    otomatik_hat: { aciklama: "Çok az işçiyle, elektronik de yiyerek daha çok parça üretir.", ipucu: "Teknolojisini açman gerekir." },
    standart_elektronik: { aciklama: "Bakır, silis ve parçadan elektronik üretir.", ipucu: "Üç girdi de stokta olsun." },
    standart_rafineri: { aciklama: "Ham petrolden yakıt çıkarır.", ipucu: "Yakıtın bakkalda da alıcısı var." },
    standart_muhimmat: { aciklama: "Çelik ve yakıttan mühimmat üretir.", ipucu: "Yalnız orduya gider." },
    ahir_besi: { aciklama: "Tahılla hayvan besler; gıda ve gübre verir.", ipucu: "Gübreyi tarlana götürmeyi unutma." },
    mera_hayvancilik: { aciklama: "Otlakta, girdisiz hayvancılık; gıda ve biraz gübre.", ipucu: "Dağlık arsada en akıllıca yöntem." },
    azotlu_gubre: { aciklama: "Petrolden gübre üretir.", ipucu: "Petrol kuyusuna yakın kur." },
    komur_santrali: { aciklama: "Kömür yakıp elektrik üretir.", ipucu: "Kömür bitince elektrik şebekeden devam eder." },
    yakit_jeneratoru: { aciklama: "Yakıtla elektrik üretir; yakıtı çok yer.", ipucu: "Kendi elektriğini istersen kurarsın; şebeke zaten verir." },
    hidro_santrali: { aciklama: "Akan suyla yakıtsız elektrik üretir.", ipucu: "Dağlık arsa ister." },
    sulama_pompasi: { aciklama: "Kanala su basar; elektrik tüketir.", ipucu: "Kurak mevsim yaklaşırken çalıştır." },
    degirmen: { aciklama: "Tahılı una çevirir; yanında kepek de çıkar.", ipucu: "Kepeği ahıra götür." },
    ekmek_firini: { aciklama: "Unu, yakıt ve elektrikle ekmeğe çevirir.", ipucu: "Ekmek çabuk bayatlar: rafa yakın kur." },
    kepek_gubresi: { aciklama: "Değirmenden artan kepeği gübreye çevirir.", ipucu: "Kepeği çöpe atma." },
    sut_kepekli: { aciklama: "Tahıl ve kepekle hayvan besler; süt ve biraz gübre verir.", ipucu: "Kepek bol ise bu yöntemi seç." },
    cam_firini: { aciklama: "Silisi yakıt ve elektrikle cama çevirir.", ipucu: "Camı pencere hattına ver; hat ayrı bir fabrikada çalışır." },
    celik_dograma: { aciklama: "Çelik, cam ve parçadan pencere yapar.", ipucu: "Camı ayrı bir fabrikada üret; pencere dükkân inşaatında ve yapı markette işe yarar." },
  },
  dukkan: {
    bakkal: { aciklama: "Her şeyden azar azar: gıda, ekmek, süt, şekerleme, yakıt.", ipucu: "Raf dolu ve çeşitli tutulursa mahallelinin ilk uğrağı olur. Başlangıç gıdanı rafın için sakla." },
    firin: { aciklama: "Ekmek ve gıda satar.", ipucu: "Fırından çıkanı hemen rafa koy. Başlangıç gıdanı rafın için sakla." },
    sarkuteri: { aciklama: "Süt, süt ürünü ve gıda satar.", ipucu: "Sütü bozulmadan rafa ulaştır. Başlangıç gıdanı rafın için sakla." },
    sekerci: { aciklama: "Şekerleme ve fındık içi satar.", ipucu: "Şekerleme ve fındık içini üretemezsin; ithal edip satabilirsin, marjı dar." },
    yapi_market: { aciklama: "Pencere, çelik, parça ve cam satar.", ipucu: "Satabilirsin; ama çelik ve parçanın bir kısmını inşaata ayır." },
  },
};

/** Kimliğin açıklaması ve ipucu; bilinmeyen kimlik için `undefined` (arayüz boş bırakır, uydurma metin göstermez). */
export function icerikMetni(tur: IcerikTuru, kimlik: string): IcerikMetni | undefined {
  return ICERIK_METIN[tur][kimlik];
}
