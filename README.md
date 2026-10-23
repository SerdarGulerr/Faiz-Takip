# 📱 Aile Faiz & Kasa Takip Uygulaması - Kurulum ve APK Rehberi

Bu uygulama; bankada tek bir vadeli/günlük mevduat hesabında duran **Sizin, Kızınızın ve Eşinizin** paralarını ayrı ayrı takip etmek, günlük bileşik faizi hesaplamak ve girdiğiniz faiz oranını yeni bir oran girene kadar gün gün otomatik işletmek için özel olarak geliştirilmiştir.

---

## 🚀 1. Bilgisayarda Hemen Denemek ve Kullanmak İçin
Masaüstünüzdeki **`FaizHesaplayici`** klasörünün içindeki **`baslat.bat`** dosyasına çift tıklayın:
- Tarayıcınızda uygulama mobil uygulama görünümüyle hemen açılacaktır.
- İstediğiniz zaman doğrudan `index.html` dosyasını tarayıcınıza sürükleyerek de açabilirsiniz.

---

## 📦 2. Saf Android APK Dosyası (.apk) Nasıl Alınır?

Hazırladığımız projeden doğrudan telefonunuza kurulabilir `.apk` dosyası elde etmek için en pratik yöntemler:

### 🌟 Yöntem A: GitHub Actions ile Otomatik APK Çıktısı (En Temiz & Resmi Yöntem)
Projenizin içine `.github/workflows/build-apk.yml` otomatik derleme dosyası eklenmiştir.
1. [GitHub.com](https://github.com) sitesinde ücretsiz bir hesap açın (varsa giriş yapın).
2. **"New Repository"** diyerek yeni bir depo (örn: `faiz-takip`) oluşturun.
3. Masaüstündeki `FaizHesaplayici` klasörünün içindeki tüm dosyaları bu depoya yükleyin (Upload files).
4. Deponuzun üst menüsündeki **"Actions"** sekmesine tıklayın.
5. GitHub sunucuları sizin için Android SDK ve Gradle çalıştırarak uygulamayı derleyecek (yaklaşık 2-3 dakika sürer).
6. İşlem tamamlandığında **"Artifacts"** bölümünde **`AileFaizTakip-Debug-APK`** dosyasını göreceksiniz. Tıklayıp `.apk` dosyasını telefonunuza indirin ve kurun!

---

### ⚡ Yöntem B: Online Web2APK Dönüştürücüler (30 Saniyede APK Alma)
Bilgisayarınızda karmaşık Android Studio veya SDK kurmaya gerek kalmadan:
1. `FaizHesaplayici` klasöründeki dosyaları sağ tıklayıp **.ZIP** haline getirin.
2. [Web2Apk](https://www.web2apk.com/) veya [AppsGeyser](https://appsgeyser.com/) gibi ücretsiz HTML-to-APK platformlarından birini açın.
3. "HTML / Zip Archive" seçeneğini seçip zip dosyanızı yükleyin.
4. "Uygulama Adı: Aile Faiz Takip" yazıp **Generate APK** butonuna basın.
5. İndirdiğiniz `.apk` dosyasını WhatsApp veya kablo ile telefonunuza atıp açın.

---

### 📲 Yöntem C: Telefona Doğrudan "Uygulama Olarak Yükle" (PWA / APK Benzeri)
Bu uygulama bir **Progressive Web App (PWA)** olarak kodlanmıştır.
- Herhangi bir ücretsiz hostinge (örn: Vercel, Netlify veya GitHub Pages) tek tıkla yükleyip linki telefonunuzdaki Chrome tarayıcısında açtığınızda:
- Sağ üstteki 3 noktadan **"Ana Ekrana Ekle"** veya ekranda çıkan **"Uygulamayı Yükle"** butonuna bastığınızda telefonunuzun menüsüne tıpkı Google Play'den indirilmiş gibi logosuyla birlikte yüklenir.
- Tam ekran çalışır ve **hiç internet bağlantısı olmadan da telefonunuzda her gün faizi hesaplamaya devam eder**.

---

## 💡 Uygulamanın Özellikleri
1. **%17,5 Gelir Vergisi (Stopaj) Kesintisi**: Günlük brüt faiz kazancından yasal %17,5 stopaj vergisi otomatik olarak düşülür ve net kazanç anaparaya eklenir.
2. **Otomatik Oran Devamı**: Girdiğiniz faiz oranı, siz yeni bir oran girene kadar gün gün otomatik olarak bir önceki günün oranını kullanır.
3. **Günlük Bileşik Faiz**: Her günün net faizi gün sonunda kişinin anaparasına eklenerek büyüme sağlar.
4. **Kişi Bazlı Şeffaf Dağılım**: Ben, Kızım, Eşim (veya eklediğiniz yeni kişiler) için anapara, net faiz, vergi kesintisi, günlük net getiri ve toplam bakiye anında listelenir.
5. **Günlük Döküm Çizelgesi**: Geçmişten bugüne hangi gün ne kadar brüt faiz, ne kadar vergi (%17,5) ve ne kadar net faiz işlediğini kuruşu kuruşuna inceleyebilirsiniz.
6. **Yedekleme**: Ayarlar menüsünden tüm verilerinizi tek tıkla telefonunuza `.json` olarak yedekleyebilir veya geri yükleyebilirsiniz.
