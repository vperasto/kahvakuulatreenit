## Kahvakuulatreeni Ohjaajatyökalu

**Verkkopohjainen työkalu kahvakuulakurssien ohjaajille ja itsenäisille harjoittelijoille.**
Tämän sovelluksen avulla voit helposti seurata valmista 11 viikon progressiivista kahvakuulaohjelmaa neljällä eri vaikeustasolla, suorittaa erillisiä lämmittely- ja jäähdyttelyrutiineja sekä hyödyntää ohjauksen ja harjoittelun tueksi ajastimia, kuvia, ohjeita ja äänimerkkejä. Sovellus on suunniteltu käytettäväksi erityisesti tabletin tai tietokoneen näytöltä treenin aikana.

---

## 🔧 Ominaisuudet

- 📅 **11 Viikon Ohjelma:** Strukturoitu kahvakuulaohjelma progressiolla.
- 💪 **4 Vaikeustasoa:** Skaalautuu vasta-alkajasta experttiin.
- 🔥 **Erilliset Lämmittelyt & Jäähdyttelyt:** Valitse sopiva rutiini ennen ja jälkeen treenin.
- 🕒 **Ajastin & Kierroslaskuri:** Selkeä ajastin työ- ja lepoajoille sekä kierrosten seuranta.
- 🔊 **Äänimerkit:** Auttavat pysymään rytmissä ilman jatkuvaa näytön katselua.
- 📸 **Harjoituskuvat & Ohjeet:** Visuaalinen tuki ja tekniikkavinkit joka liikkeelle.
- 📝 **Selkeä JSON-data:** Mahdollistaa ohjelman ja liikkeiden muokkaamisen ja laajentamisen.
- ⏯️ **Keskeytä/Jatka/Lopeta:** Hallitse treenin kulkua joustavasti.
- 📱 **Responsiivinen Design:** Toimii tietokoneella, tabletilla ja mobiilissa (optimoitu isommille näytöille).
- 📂 **Paikallinen Toiminta:** Ei vaadi internetyhteyttä latauksen jälkeen.

---

## 📁 Rakenne

```bash
├── index.html              # Pääsivu (HTML-rakenne)
├── style.css               # Ulkoasun tyylit (CSS)
├── app.js                  # Sovelluksen toimintalogiikka (JavaScript)
├── data/
│   └── exercises.json      # Kaikki data: Liikkeet, 11vk ohjelma, tasot, lämmittelyt, jäähdyttelyt (JSON)
├── img/                    # Harjoituskuvat (.png, .jpg, .gif)
│   ├── logo_small_valkoinen.png # Esim. headerin logo
│   └── ...                 # Muut kuvat
└── audio/                  # Äänitiedostot
    └── beep.mp3            # Äänimerkki ajastimelle
```

---

## 📦 Asennus ja käyttö

1. Lataa tai kloonaa repositorio:
   ```bash
   git clone https://github.com/vesaperasto/kahvakuulatreeni-ohjaaja.git
   ```
2. Avaa `index.html` selaimessa (suositus: laajakuvanäyttö tai läppäri).
3. Valitse treeni ja aloita käyttö.

> Sovellus toimii täysin paikallisesti eikä vaadi internetyhteyttä käytön aikana.

---

## 🔒 Lisenssi

Creative Commons Attribution-NonCommercial 4.0 International License  
Tämä työ on lisensoitu nimellä: **Vesa Perasto**  
[Katso lisenssi](http://creativecommons.org/licenses/by-nc/4.0/)

---

## 🙌 Kiitokset

Sovellus kehitetty omaksi avuksi ja muiden ohjaajien tueksi.  
Jos teet muutoksia tai laajennuksia, säilytä alkuperäinen tekijämerkintä.

---
