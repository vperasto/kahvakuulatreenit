// app.js

let harjoituksetData;
let nykyinenTreeni = [];
let nykyinenIndeksi = 0;
let ajastin = null;
let onTauko = false;
let onKeskeytetty = false;

// Lataa data JSON-tiedostosta
fetch("data/exercises.json")
  .then(response => response.json())
  .then(data => {
    harjoituksetData = data;
    naytaTreeniValinnat();
  });

function naytaTreeniValinnat() {
  const valinnat = document.getElementById("treeni-valinnat");

  const rakennaKortti = (treeni, tunniste, tyyppi) => {
    const div = document.createElement("div");
    div.className = "treeni-kortti";
    div.innerText = treeni.nimi;
    div.onclick = () => aloitaTreeni(treeni.harjoitteet);
    valinnat.appendChild(div);
  };

  for (const [avain, treeni] of Object.entries(harjoituksetData.valmiit)) {
    rakennaKortti(treeni, avain, "valmis");
  }

  for (const [avain, treeni] of Object.entries(harjoituksetData.viikot)) {
    rakennaKortti(treeni, avain, "viikko");
  }
}

function aloitaTreeni(harjoitteet) {
  nykyinenTreeni = harjoitteet;
  nykyinenIndeksi = 0;
  onTauko = false;
  onKeskeytetty = false;
  document.getElementById("treeni-valinnat").style.display = "none";
  document.getElementById("harjoitus-naytto").style.display = "block";
  seuraavaHarjoite();
}

function seuraavaHarjoite() {
  if (nykyinenIndeksi >= nykyinenTreeni.length) {
    document.getElementById("nimi").innerText = "Treeni valmis!";
    document.getElementById("aika").innerText = "";
    return;
  }

  const harjoite = nykyinenTreeni[nykyinenIndeksi];
  const vaihe = onTauko ? "Tauko" : harjoite.nimi;
  const kesto = onTauko ? harjoite.tauko : harjoite.kesto;

  document.getElementById("nimi").innerText = vaihe;
  document.getElementById("kuva").src = harjoite.kuva || "";
  kaynnistaAjastin(kesto);
}

function kaynnistaAjastin(sekunnit) {
  let aika = sekunnit;
  paivitaAika(aika);
  clearInterval(ajastin);

  ajastin = setInterval(() => {
    if (onKeskeytetty) return;
    aika--;
    paivitaAika(aika);
    if (aika <= 0) {
      clearInterval(ajastin);
      uusiVaihe();
    }
  }, 1000);
}

function paivitaAika(aika) {
  document.getElementById("aika").innerText = aika + " s";
}

function uusiVaihe() {
  if (!onTauko) {
    onTauko = true;
  } else {
    onTauko = false;
    nykyinenIndeksi++;
  }
  seuraavaHarjoite();
}

function keskeytaTaiJatka() {
  onKeskeytetty = !onKeskeytetty;
  document.getElementById("keskeyta-btn").innerText = onKeskeytetty ? "Jatka" : "Pause";
}

document.getElementById("keskeyta-btn").addEventListener("click", keskeytaTaiJatka);
