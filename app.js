// app.js (Versio 10 - Palautettu puuttuvat osat, lisätty round-info parannus)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const appDiv = document.getElementById('app');
    const header = document.querySelector('header');
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area');
    const selectionArea = document.getElementById('selection-area');
    const warmupSelectionDiv = document.getElementById('warmup-selection');
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container');
    const startWarmupBtn = document.getElementById('start-warmup-btn');
    const trainingSelectionDiv = document.getElementById('training-selection');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelSelectionDiv = document.getElementById('level-selection');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const startWorkoutBtn = document.getElementById('start-workout-btn');
    const cooldownSelectionDiv = document.getElementById('cooldown-selection');
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container');
    const startCooldownBtn = document.getElementById('start-cooldown-btn');
    const mainLayout = document.querySelector('main.main-layout'); // Tarvitaan skrollaukseen
    const sidebar = document.getElementById('sidebar');
    const infoArea = document.getElementById('info-area');
    const infoHeader = document.querySelector('.info-header');
    const infoAreaTitleH2 = document.getElementById('info-area-title');
    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    const toggleInfoTextSpan = toggleInfoBtn.querySelector('.toggle-info-text');
    const infoContentWrapper = document.getElementById('info-content');
    const infoAreaNotesContainer = document.getElementById('info-area-notes-container');
    const infoAreaNotesP = document.getElementById('info-area-notes');
    const stepsListArea = document.getElementById('steps-list-area');
    const stepsListTitleH2 = document.getElementById('steps-list-title');
    const stepsListUl = document.getElementById('steps-items');
    const activeDisplaySection = document.getElementById('active-display');
    const titleAreaDiv = document.getElementById('title-area');
    const prevBtn = document.getElementById('prev-btn');
    const itemNameH2 = document.getElementById('item-name');
    const nextBtn = document.getElementById('next-btn');
    const contentSplitDiv = document.getElementById('content-split');
    const itemDetailsDiv = document.getElementById('item-details');
    const itemImageImg = document.getElementById('item-image');
    const itemDescriptionP = document.getElementById('item-description');
    const timerAndControlsDiv = document.getElementById('timer-and-controls');
    const roundInfoP = document.getElementById('round-info'); // TÄTÄ MUOKATAAN
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const controlButtonContainer = document.querySelector('.control-button-container');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    // --- Ääniobjekti ---
    const beepSound = new Audio('audio/beep.mp3');
    beepSound.load();
    function playSound(audioElement) {
        // Yritä pysäyttää ja kelata alkuun, jos ääni soi jo
        if (!audioElement.paused) {
             audioElement.pause();
             audioElement.currentTime = 0;
        }
        // Aseta äänenvoimakkuus (jos haluat säätää)
        audioElement.volume = 1.0;
        // Soita ääni
        audioElement.play().catch(error => console.warn("Audio playback failed:", error)); // Vaimenna mahdolliset virheet
    } // playSound loppuu

    // --- Sovelluksen tila ---
    let fullProgramData = null; // Koko ohjelmadata JSONista
    let warmupData = null; // Lämmittelydata
    let cooldownData = null; // Jäähdyttelydata
    let currentWorkoutExercises = []; // Nykyisen valitun TREENIN harjoitukset (käytetäänkö tätä?)
    let currentRoutineSteps = []; // Nykyisen aktiivisen rutiinin (lämm., treeni, jää.) vaiheet
    let currentStepIndex = 0; // Nykyisen vaiheen indeksi currentRoutineSteps-listassa
    let activeRoutineType = 'none'; // Mikä rutiini on valittuna ('none', 'warmup', 'workout', 'cooldown')
    let currentWorkoutInfo = { // Valitun TREENIN tiedot
        week: null,
        phaseIndex: null,
        level: '2', // Oletustaso
        rounds: 0,
        restBetweenRounds: 0,
        notes: '',
        focus: ''
    };
    let currentRound = 1; // Nykyinen kierros (treenissä)
    let timerInterval = null; // Ajastimen setInterval ID
    let remainingTime = 0; // Jäljellä oleva aika sekunteina
    // Ajastimen eri tilat
    const TimerState = {
        IDLE: 'idle', // Odottaa aloitusta
        RUNNING_EXERCISE: 'running_exercise', // Treenin työaika käynnissä
        RUNNING_REST: 'running_rest', // Treenin lepoaika käynnissä
        RUNNING_ROUND_REST: 'running_round_rest', // Treenin kierroslepo käynnissä
        PAUSED: 'paused', // Treeni tauolla
        FINISHED: 'finished', // Rutiini suoritettu loppuun
        RUNNING_STEP: 'running_step' // Lämmittelyn/Jäähdyttelyn vaihe käynnissä (ei ajastinta)
    };
    let timerState = TimerState.IDLE; // Ajastimen nykyinen tila
    let pausedState = null; // Mihin tilaan palataan paussilta
    let isAudioUnlocked = false; // Onko käyttäjäinteraktio sallinut äänet

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            // Hae data
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); // Virhe jos haku epäonnistui
            fullProgramData = await response.json(); // Muunna JSON-teksti objektiksi
            console.log("Program data loaded.");

            // Tarkista, että datan perusrakenne on ok
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.warmup || !fullProgramData.cooldown || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect or incomplete.");
                itemNameH2.textContent = "Virheellinen ohjelmadata."; // Näytä virhe käyttäjälle
                return; // Lopeta alustus
            }

            // Tallenna osiot omiin muuttujiin
            warmupData = fullProgramData.warmup;
            cooldownData = fullProgramData.cooldown;

            // Täytä käyttöliittymän valinnat datalla
            populateWarmupSelector();
            populateCooldownSelector();
            populateWeekSelectors();
            addLevelButtonListeners(); // Lisää kuuntelijat taso-napeille

            initializeInfoArea(); // Alusta info-alueen piilotus/näyttö
            resetAppState(); // Aseta sovellus alkutilaan

        } catch (error) {
            // Jos datan haku tai käsittely epäonnistui
            console.error("Could not load or process program data:", error);
            itemNameH2.textContent = "Virhe ladattaessa ohjelmaa."; // Näytä virhe
            resetAppState(); // Yritä resetoida tila
        }
    } // loadAppData loppuu

    // --- UI Populointi ja Kuuntelijat ---

    // Luo Lämmittely-valintanapin
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (warmupData && warmupData.description) { // Tarkista onko dataa
            const button = document.createElement('button');
            button.textContent = `Lämmittely (${warmupData.durationMinutes} min)`; // Napin teksti
            button.classList.add('routine-button'); // CSS-luokka
            button.dataset.routine = 'warmup'; // Tieto napille itselleen
            button.addEventListener('click', () => selectRoutine('warmup')); // Kuuntelija klikkaukselle
            warmupButtonsContainer.appendChild(button); // Lisää nappi sivulle
            // Start-nappi otetaan käyttöön vasta kun rutiini on VALITTU, ei tässä
        } else {
            // Jos dataa ei löytynyt
            warmupButtonsContainer.innerHTML = '<p>Lämmittelytietoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true; // Varmistetaan disabled tila
        }
    } // populateWarmupSelector loppuu

    // Luo Jäähdyttely-valintanapin
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (cooldownData && cooldownData.description) { // Tarkista onko dataa
            const button = document.createElement('button');
            button.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            button.classList.add('routine-button');
            button.dataset.routine = 'cooldown';
            button.addEventListener('click', () => selectRoutine('cooldown'));
            cooldownButtonsContainer.appendChild(button);
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelytietoja ei löytynyt.</p>';
            startCooldownBtn.disabled = true; // Varmistetaan disabled tila
        }
    } // populateCooldownSelector loppuu

    // Luo Viikko-valintanapit
    function populateWeekSelectors() {
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return; // Varmista data
        weekButtonsContainer.innerHTML = ''; // Tyhjennä
        const totalWeeks = 11; // Ohjelman pituus viikkoina
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`;
            button.classList.add('week-button');
            button.dataset.weekNumber = i; // Tallenna viikkonumero nappiin
            button.addEventListener('click', (e) => {
                e.currentTarget.blur(); // Poista fokus napilta klikkauksen jälkeen (visuaalinen siistiminen)
                handleWeekSelect(i); // Käsittele viikon valinta
            });
            weekButtonsContainer.appendChild(button);
        }
    } // populateWeekSelectors loppuu

    // Lisää tapahtumakuuntelijat Taso-napeille
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => {
            // Kun taso-nappia klikataan, kutsu handleLevelSelect sen data-level arvolla
            button.addEventListener('click', () => handleLevelSelect(button.dataset.level));
        });
    } // addLevelButtonListeners loppuu

    // Käsittelee rutiinin (lämm., jää.) valinnan
    function selectRoutine(routineType) {
        console.log(`Routine selected: ${routineType}`);
        activeRoutineType = routineType; // Aseta aktiivinen tyyppi
        resetAppState(false); // Resetoi tila, mutta säilytä yläpalkin valinnat (esim. level)
        currentRoutineSteps = []; // Tyhjennä edellisen rutiinin vaiheet

        // Poista 'active'-luokka kaikilta viikko- ja rutiininapeilta
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));
        // Lisää 'active'-luokka klikatulle rutiininapeille
        const selectedBtn = document.querySelector(`.routine-button[data-routine="${routineType}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');

        // Lataa ja näytä valitun rutiinin tiedot
        if (routineType === 'warmup' && warmupData) {
            infoAreaTitleH2.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
            updateInfoAreaNotes(warmupData.description); // Päivitä infoteksti
            // Luo vaihelista ja lisää indeksi jokaiseen vaiheeseen
            currentRoutineSteps = warmupData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps); // Täytä sivupalkin lista
            displayStep(0); // Näytä ensimmäinen vaihe päänäkymässä
        } else if (routineType === 'cooldown' && cooldownData) {
            infoAreaTitleH2.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            updateInfoAreaNotes(cooldownData.description);
            currentRoutineSteps = cooldownData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps);
            displayStep(0);
        } else {
            // Jos jokin muu valittu (tai data puuttuu), näytä oletus
            updateInfoAreaNotes("Valitse toiminto yläpuolelta.");
            populateStepsList([]);
        }
        updateButtonStates(); // Päivitä nappien tila (ESIM. NÄYTÄ OIKEA START-NAPPI)
        updateRoundDisplay(); // Päivitä myös round/vaihe-info heti valinnan jälkeen
    } // selectRoutine loppuu

    // Käsittelee tason valinnan
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; // Älä tee mitään jos taso on sama
        console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel; // Tallenna uusi taso

        // Päivitä nappien ulkoasu (lisää/poista 'active'-luokka)
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === selectedLevel);
        });

        // Jos viikko on jo valittu, lataa sen tiedot uudelleen tällä uudella tasolla
        if (currentWorkoutInfo.week !== null && activeRoutineType === 'workout') {
            handleWeekSelect(currentWorkoutInfo.week);
        } else {
            // Jos viikkoa ei ole valittu, päivitä vain infoteksti (jos treeni olisi valittu)
            updateInfoAreaNotes();
        }
    } // handleLevelSelect loppuu

    // Käsittelee viikon valinnan (lataa treenin)
    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout'; // Aseta tyypiksi treeni
        resetAppState(false); // Resetoi tila, säilytä taso

        // Varmista, että tarvittava data on ladattu
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Workout data missing."); resetAppState(true); return; // Resetoi kaikki jos data puuttuu
        }

        // Etsi oikea vaihe (phase) viikkonumeron perusteella JSONista
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) { // Jos vaihetta ei löydy
            console.error(`Workout phase not found for week ${weekNumber}.`);
            resetAppState(true); itemNameH2.textContent = `Vaihetta ei löytynyt viikolle ${weekNumber}.`; return;
        }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx];

        // Hae valitun tason (level) tiedot tästä vaiheesta
        const level = currentWorkoutInfo.level;
        const levelData = phase.levels?.[level];
        // Tarkistetaan timeBased, koska sitä käytetään treenin ajastuksessa
        if (!levelData?.timeBased) {
            console.error(`Workout level data (timeBased) not found for phase ${phaseIdx + 1}, level ${level}.`);
            resetAppState(true); itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt viikolle ${weekNumber}.`; return;
        }

        // Hae työ- ja lepoajat tälle tasolle
        const workTime = levelData.timeBased.workSeconds;
        const restTime = levelData.timeBased.restSeconds;

        // Hae harjoituslista tälle vaiheelle (huomioi vaiheen 3 eri rakenne)
        let exerciseListSource = [];
        if (phaseIdx === 2 && phase.exampleWeeklyExercises) { // Vaihe 3 (0-indeksi = 2)
            exerciseListSource = phase.exampleWeeklyExercises;
        } else if (phase.weeklyExercises) { // Vaiheet 1 ja 2
            exerciseListSource = phase.weeklyExercises;
        } else {
            console.error(`No 'weeklyExercises' or 'exampleWeeklyExercises' found in phase ${phaseIdx + 1}.`);
            resetAppState(true); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return;
        }

        // Yhdistä harjoitustiedot yleisestä `exercises`-listasta ja vaihekohtaisista tiedoista (`exerciseListSource`)
        const mappedEx = exerciseListSource.map((pEx, index) => {
            if (!pEx?.exerciseId) return null; // Skip jos ei ID:tä
            // Etsi vastaava harjoitus päälistasta ID:n perusteella
            const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId);
            if (!fEx) { // Jos harjoitusta ei löytynyt päälistasta
                console.warn(`Exercise with ID ${pEx.exerciseId} not found in main exercises list.`);
                return null; // Skip
            }
            // Luo uusi objekti, jossa yhdistetty tietoja
            return {
                ...fEx, // Kaikki perustiedot (id, name, image, description...)
                displayTitle: pEx.displayTitle || fEx.name, // Käytä displayTitle jos annettu, muuten perusnimeä
                notes: pEx.notes || '', // Lisää muistiinpanot jos on
                workTime, // Lisää työaika tältä tasolta
                restTime, // Lisää lepoaika tältä tasolta
                index // Lisää alkuperäinen indeksi listassa
            };
        }).filter(ex => ex !== null); // Poista null-arvot (skipatut harjoitukset)

        // Tarkista, saatiinko kelvollisia harjoituksia
        if (mappedEx.length === 0) {
            console.error(`No valid exercises mapped for workout (Week ${weekNumber}, Level ${level}).`);
            resetAppState(true); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return;
        }

        // Päivitä sovelluksen tila valitulla treenillä
        currentWorkoutExercises = mappedEx; // Tallenna treenin harjoitukset (ei välttämättä tarvita erikseen?)
        currentRoutineSteps = mappedEx; // Aseta nämä aktiiviseksi rutiiniksi
        currentStepIndex = 0; // Aloita ensimmäisestä vaiheesta
        currentRound = 1; // Aloita ensimmäiseltä kierrokselta

        // Päivitä treenin yleistiedot
        currentWorkoutInfo = {
            ...currentWorkoutInfo, // Säilytä level
            week: weekNumber,
            phaseIndex: phaseIdx,
            // Hae kierrosmäärä (muunna numeroksi, oletus 1)
            rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1,
            // Hae kierroslepo (muunna numeroksi, oletus 0)
            restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0,
            notes: phase.phaseInfo.focus || '', // Käytä fokusta muistiinpanoina (tai jokin muu?)
            focus: phase.phaseInfo.focus || '' // Tallenna fokus erikseen
        };

        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);

        // Päivitä käyttöliittymä vastaamaan uutta tilaa
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`;
        populateStepsList(currentRoutineSteps); // Täytä sivupalkin lista
        updateInfoAreaNotes(); // Päivitä infotekstit
        displayStep(currentStepIndex); // Näytä ensimmäinen harjoitus
        updateButtonStates(); // Päivitä napit (Start Workout näkyviin)
        highlightWeekButton(weekNumber); // Korosta valittu viikko
        updateRoundDisplay(); // Näytä kierrostiedot
    } // handleWeekSelect loppuu

    // Päivittää sivupalkin Info-alueen muistiinpanot
    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) {
            // Jos funktiolle annettiin oma teksti, käytä sitä
            noteText = customNote;
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            // Jos treeni on valittu, rakenna infoteksti sen tiedoista
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            const roundsText = `Kierrokset: ${currentWorkoutInfo.rounds || 'Ei määritelty'}`;
            const roundRestText = `Kierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}${roundsText}\n${roundRestText}`;
        } else if (activeRoutineType === 'warmup' && warmupData) {
             // Jos lämmittely valittu, käytä sen kuvausta
             noteText = warmupData.description;
        } else if (activeRoutineType === 'cooldown' && cooldownData) {
             // Jos jäähdyttely valittu, käytä sen kuvausta
             noteText = cooldownData.description;
        } else {
            // Muussa tapauksessa oletusteksti
            noteText = "Valitse toiminto yläpuolelta.";
        }
        // Aseta teksti elementtiin, varmista ettei ole tyhjä
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta.";
    } // updateInfoAreaNotes loppuu

    // Korostaa aktiivisen viikko-napin
    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            // Lisää/poista 'active'-luokka sen mukaan, vastaako napin viikko valittua
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    } // highlightWeekButton loppuu

    // Luo sivupalkkiin listan rutiinin vaiheista
    function populateStepsList(steps) {
        stepsListUl.innerHTML = ''; // Tyhjennä vanha lista
        if (!steps || steps.length === 0) {
            // Jos ei vaiheita, näytä oletusviesti
            stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>';
            stepsListTitleH2.textContent = "Vaiheet";
            return;
        }

        // Päivitä listan otsikko rutiinityypin mukaan
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";

        // Luo listaelementti (li) jokaiselle vaiheelle
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name}`; // Näytä numero ja nimi
            li.dataset.index = index; // Tallenna indeksi data-attribuuttiin
            li.classList.add('step-item'); // Lisää CSS-luokka
            // Lisää klikkauskuuntelija vaiheeseen hyppäämistä varten (vain kun ajastin ei käy)
            li.addEventListener('click', () => {
                if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                    jumpToStep(index); // Hyppää klikattuun vaiheeseen
                }
            });
            stepsListUl.appendChild(li); // Lisää elementti listaan
        });
    } // populateStepsList loppuu

    // Hyppää tiettyyn vaiheeseen (kun klikataan sivupalkista)
    function jumpToStep(index) {
        // Tarkista, että indeksi on validi
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer(); // Pysäytä ajastin jos oli käynnissä (varmuuden vuoksi)
            currentStepIndex = index; // Aseta uusi aktiivinen indeksi
            currentRound = 1; // Nollaa kierros aina hypätessä
            timerState = TimerState.IDLE; // Varmista IDLE-tila
            displayStep(currentStepIndex); // Näytä valittu vaihe päänäkymässä
            updateButtonStates(); // Päivitä napit (navigointi aktiiviseksi)
            clearNextUpHighlight(); // Poista mahdollinen seuraavan korostus
            updateRoundDisplay(); // Päivitä round/vaihe-info
        }
    } // jumpToStep loppuu

    // Näyttää aktiivisen vaiheen tiedot päänäkymässä (otsikko, kuvaus, kuva, ajastin)
    function displayStep(index) {
        // Tarkista indeksin validius
        if (index < 0 || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.error(`Invalid step index: ${index}`);
            resetAppState(); // Resetoi jos indeksi on huono
            itemNameH2.textContent = "Virhe vaiheen näyttämisessä";
            itemDescriptionP.textContent = `Vaihetta ei löytynyt indeksillä ${index}.`;
            // Varmista että kuva ja ajastin piilotetaan
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            return;
        }

        const step = currentRoutineSteps[index]; // Hae nykyisen vaiheen data
        itemNameH2.textContent = step.displayTitle || step.name; // Aseta otsikko

        // --- Päivitä sisältö rutiinityypin mukaan ---
        if (activeRoutineType === 'workout') {
            // Treenin näyttö
            let descriptionText = step.description || ''; // Hae kuvaus
            if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`; // Lisää muistiinpanot
            itemDescriptionP.textContent = descriptionText.trim(); // Aseta teksti

            // Näytä kuva jos sellainen on määritelty
            if (step.image) {
                itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name;
                itemImageImg.style.display = 'block';
            } else { // Muuten piilota kuvaelementti
                itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            }

            // Ajastin näkyviin treenissä
            timerDiv.style.visibility = 'visible';
            // Jos ollaan IDLE/FINISHED -tilassa, näytä työaika ajastimessa
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 remainingTime = step.workTime || 0; // Aseta työaika
                 updateTimerDisplay(remainingTime); // Päivitä ajastimen numerot ja label
            }
            // Round display päivitetään erikseen updateRoundDisplay-funktiossa

        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Lämmittelyn / Jäähdyttelyn näyttö
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan."; // Käytä JSONista lisättyä kuvausta
            // Piilota kuva ja ajastin
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden';
            // Round display päivitetään erikseen updateRoundDisplay-funktiossa
            // Nollaa ajastimen tekstit jos IDLE/FINISHED
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 timeRemainingSpan.textContent = '--:--';
                 timerLabelP.textContent = '';
            } else if (timerState === TimerState.RUNNING_STEP){ // Jos käynnissä, näytä ohje
                  timeRemainingSpan.textContent = '--:--';
                  timerLabelP.textContent = 'Suorita vaihe';
             }
        } else {
            // Oletustila (ei rutiinia valittu)
            itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden';
            timeRemainingSpan.textContent = '00:00'; timerLabelP.textContent = 'Odottamassa...';
            roundInfoP.textContent = ''; // Tyhjennä round info
        }

        highlightCurrentStep(); // Korosta nykyinen vaihe sivupalkin listassa
        // Päivitä round/vaihe-info AINA kun näyttö päivitetään
        updateRoundDisplay();
    } // displayStep loppuu

    // --- Info Area Collapse Toiminnot ---
    function initializeInfoArea() {
        // Aseta oletustila (piilotettu) ja ARIA-attribuutti
        infoContentWrapper.classList.add('collapsed');
        toggleInfoBtn.setAttribute('aria-expanded', 'false');
        // Aseta napin teksti
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä";
        // Lisää kuuntelija napille
        toggleInfoBtn.addEventListener('click', toggleInfoArea);
    } // initializeInfoArea loppuu

    // Käsittelee info-alueen piilotus/näyttö -napin klikkauksen
    function toggleInfoArea() {
        const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); // Vaihda luokkaa
        const isExpanded = !isCollapsed; // Päivitä tila
        toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded)); // Päivitä ARIA
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä"; // Vaihda napin teksti
        console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`);
    } // toggleInfoArea loppuu

    // --- Ajastimen ja Rutiinin Etenemisen toiminnot ---

    // Käynnistää valitun rutiinin (kutsutaan Start-napeista)
    function startSelectedRoutine() {
        // Tarkista ehdot: rutiini valittu, vaiheita on, ajastin IDLE-tilassa
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
            console.warn("Start conditions not met. Type:", activeRoutineType, "Steps:", currentRoutineSteps.length, "State:", timerState);
            return;
        }

        // Skrollaa päänäkymä (main-layout) näkyviin (etenkin mobiilissa hyödyllinen)
        if (mainLayout) {
             const targetOffsetTop = mainLayout.offsetTop; // Haetaan elementin yläreunan sijainti
             console.log(`Scrolling to main layout top: ${targetOffsetTop}px`);
             window.scrollTo({ top: targetOffsetTop, behavior: 'smooth' }); // Skrollaa pehmeästi
        }

        // Jos kyseessä on treeni, yritä avata äänikonteksti ennen jatkamista
        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { // Jos ääni jo sallittu, aloita suoraan
                 proceedWithWorkoutStart();
                 return;
            }
            // Jos ääntä ei ole avattu, yritä sitä nyt pienellä testisoitolla
            console.log("Attempting to unlock audio context...");
            beepSound.volume = 0.001; // Pieni äänenvoimakkuus, ettei kuulu häiritsevästi
            beepSound.play().then(() => {
                // Onnistui: pysäytä, kelaa alkuun, palauta volyymi, merkitse avatuksi
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true; console.log("Audio context unlocked.");
                proceedWithWorkoutStart(); // Jatka treenin aloitukseen
            }).catch(error => {
                // Epäonnistui (esim. selain estää automaattisoiton): merkitse yritetyksi ja jatka silti
                console.warn("Audio context unlock failed (maybe browser policy):", error);
                beepSound.volume = 1.0; // Palauta volyymi
                isAudioUnlocked = true; // Merkitään yritetyksi, jottei yritetä joka kerta uudelleen
                proceedWithWorkoutStart(); // Jatka treenin aloitukseen ilman ääntä
            });
        } else {
            // Lämmittely/Jäähdyttely: aloita suoraan ilman äänitarkistusta
            proceedWithRoutineStart();
        }
    } // startSelectedRoutine loppuu

    // Jatkaa TREENIN aloitukseen (kun äänilupa on kunnossa)
    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting WORKOUT...");
        currentStepIndex = 0; // Aloita ekasta vaiheesta
        currentRound = 1; // Aloita ekalta kierrokselta

        // displayStep ja updateRoundDisplay kutsutaan startTimerForPhase:n kautta

        // Piilota yläosan valinta-alue
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        // Palauta headerin napin teksti (jos elementti löytyy)
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }

        timerDiv.style.visibility = 'visible'; // Treenissä ajastin näkyviin
        // Aloita ajastin ensimmäiselle työvaiheelle
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    } // proceedWithWorkoutStart loppuu

    // Aloittaa LÄMMITTELYN tai JÄÄHDYTTELYN
    function proceedWithRoutineStart() {
        // Tarkista ehdot
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`);
        currentStepIndex = 0; currentRound = 1; // Nollaa kierrokset (vaikkei käytetä)

        displayStep(currentStepIndex); // Näytä ensimmäinen vaihe (ja päivitä round/vaihe-info)

        // Piilota yläosan valinta-alue
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }

        // Aseta tila, piilota ajastin, aseta tekstit
        timerState = TimerState.RUNNING_STEP;
        timerDiv.style.visibility = 'hidden';
        timeRemainingSpan.textContent = '--:--';
        timerLabelP.textContent = "Suorita vaihe";

        updateButtonStates(); // Päivitä napit (Stop, Next Step näkyviin)
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // proceedWithRoutineStart loppuu

    // Käsittelee Tauko/Jatka -napin klikkauksen (vain treenille)
    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return; // Tauko vain treenille

        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Jos ajastin käynnissä -> Pauselle
            pausedState = timerState; // Tallenna mistä tilasta tultiin pauselle
            stopTimerInterval(); // Pysäytä sekuntikello
            timerState = TimerState.PAUSED; // Aseta tila pauselle
            console.log("Workout Paused");
            // Päivitä napin teksti ja ulkoasu
            pauseResumeBtn.textContent = "▶ Jatka";
            pauseResumeBtn.classList.add('paused');
            timerDiv.classList.add('timer-paused'); // Lisää visuaalinen efekti ajastimeen
        } else if (timerState === TimerState.PAUSED) {
            // Jos pausella -> Jatka
            console.log("Workout Resumed");
            timerState = pausedState || TimerState.RUNNING_EXERCISE; // Palauta tila (tai oletuksena työtila)
            pausedState = null; // Nollaa tallennettu pausetila
            runTimerInterval(); // Käynnistä sekuntikello uudelleen
            // Päivitä napin teksti ja ulkoasu
            pauseResumeBtn.textContent = "⏸ Tauko";
            pauseResumeBtn.classList.remove('paused');
            timerDiv.classList.remove('timer-paused');
            // Lisää lepotilaefekti (.timer-resting) takaisin, jos jatketaan levosta
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                timerDiv.classList.add('timer-resting');
                highlightNextStep(); // Korosta seuraava vaihe levon aikana
            } else {
                timerDiv.classList.remove('timer-resting');
                clearNextUpHighlight(); // Poista korostus työn aikana
            }
        }
        updateButtonStates(); // Päivitä kaikki napit
        updateRoundDisplay(); // Varmista että round-info on oikein pausen/resumen jälkeen
    } // pauseResumeTimer loppuu

    // Käsittelee Lopeta-napin klikkauksen
    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`);
        stopTimer(); // Pysäytä ajastin ja nollaa sen sisäiset tilat
        clearNextUpHighlight(); // Poista seuraavan korostus
        const previouslyActiveType = activeRoutineType; // Tallenna tyyppi ennen resetointia
        timerState = TimerState.IDLE; // Aseta sovelluksen tila IDLEksi

        // Jos pysäytettiin kesken rutiinin, näytetään sen hetkinen vaihe IDLE-tilassa
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
             // displayStep näyttää oikean sisällön ja kutsuu updateRoundDisplay
             displayStep(currentStepIndex);
             // Jos pysäytettiin treeni, näytä sen työaika ajastimessa IDLE-tilassa
             if(previouslyActiveType === 'workout') {
                 updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
             }
        }
        else {
            // Jos ei ollut vaiheita tai indeksi oli outo, resetoi kokonaan
            resetAppState(); // Tämä kutsuu myös updateButtonStates ja updateRoundDisplay
            return;
        }

        updateButtonStates(); // Päivitä napit IDLE-tilaan (piilottaa Stop/Pause/Next, näyttää oikean Start)
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // stopActiveRoutine loppuu

    // Käsittelee Seuraava Vaihe / Valmis -napin klikkauksen (lämmittely/jäähdyttely)
    function handleNextStep() {
         // Vain lämmittelylle ja jäähdyttelylle
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
         // Vain jos ollaan aktiivisesti suorittamassa vaihetta
         if (timerState !== TimerState.RUNNING_STEP) return;

         currentStepIndex++; // Siirry seuraavaan indeksiin
         if (currentStepIndex >= currentRoutineSteps.length) {
              // Jos indeksi meni yli vaiheiden määrän -> rutiini valmis
              finishRoutine();
         } else {
             // Muuten näytä seuraava vaihe
             displayStep(currentStepIndex); // Tämä kutsuu myös updateRoundDisplay
             highlightCurrentStep(); // Korosta uusi vaihe listassa
         }
         updateButtonStates(); // Päivitä napin teksti ("Valmis ✅" jos viimeinen vaihe)
    } // handleNextStep loppuu

    // Suoritetaan kun rutiini päättyy (normaalisti tai viimeisen vaiheen jälkeen)
    function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`);
         const finishedType = activeRoutineType; // Tallenna tyyppi ennen tilan muutosta
         stopTimerInterval(); // Pysäytä ajastin (jos oli käynnissä treenissä)
         timerState = TimerState.FINISHED; // Aseta tila valmiiksi
         clearNextUpHighlight(); // Poista korostus

         // Päivitä näyttö valmis-tilaan
         itemNameH2.textContent = `${finishedType.charAt(0).toUpperCase() + finishedType.slice(1)} Valmis!`; // Otsikko
         itemDescriptionP.textContent = "Hyvää työtä!"; // Kuvaus
         itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; // Piilota kuva
         updateTimerDisplay(0); timerLabelP.textContent = "Valmis"; // Nollaa ajastin ja aseta label
         updateRoundDisplay(); // Tyhjentää round/vaihe-infon

         // Päivitä infoteksti
         updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         // Soita loppupiippaus (vain jos ääni sallittu ja oli treeni)
         if (isAudioUnlocked && finishedType === 'workout') {
             playSound(beepSound);
         }
         updateButtonStates(); // Päivitä napit (salli Prev/Next navigointi)
     } // finishRoutine loppuu

    // --- Ajastimen sisäiset toiminnot ---

    // Pysäyttää ajastimen intervallin ja nollaa tilat
    function stopTimer() {
        stopTimerInterval(); // Pysäytä setInterval
        pausedState = null; // Nollaa paused-tila
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Poista erikoistyylit
        console.log("Timer interval stopped.");
    } // stopTimer loppuu

    // Pysäyttää setInterval-ajastuksen
    function stopTimerInterval() {
        if (timerInterval) { // Jos intervalli on olemassa
            clearInterval(timerInterval); // Pysäytä se
            timerInterval = null; // Nollaa muuttuja
        }
    } // stopTimerInterval loppuu

    // Käynnistää ajastimen tietylle vaiheelle (työ, lepo, kierroslepo)
    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); // Varmista, ettei vanha jää päälle
        timerState = phaseState; // Aseta nykyinen ajastimen tila
        remainingTime = duration; // Aseta kesto
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Nollaa visuaaliset tilat
        clearNextUpHighlight(); // Poista vanha "seuraava"-korostus

        // Päivitä päänäyttö sen mukaan, ollaanko aloittamassa työtä vai lepoa
        if (phaseState === TimerState.RUNNING_EXERCISE) {
            // Työvaihe: Näytä nykyinen harjoitus ja korosta se listassa
             if (currentStepIndex < currentRoutineSteps.length) {
                 displayStep(currentStepIndex); // Kutsuu myös updateRoundDisplay
             } else { // Turvatarkistus, jos indeksi jotenkin pielessä
                 console.error("Error in startTimerForPhase: currentStepIndex out of bounds for RUNNING_EXERCISE.");
                 resetAppState(); return;
             }
             highlightCurrentStep(); // Korosta nykyinen vaihe listassa
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            // Lepovaihe: Näytä SEURAAVA harjoitus ja korosta se "next-up" tyylillä
            timerDiv.classList.add('timer-resting'); // Lisää lepotyyli ajastimeen
            // Määritä seuraavan harjoituksen indeksi (kierroslevossa = 0, muuten +1)
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1;
            // Jos seuraava indeksi on validi
            if (nextIdx < currentRoutineSteps.length) {
                displayStep(nextIdx); // Näytä seuraavan tiedot (kutsuu updateRoundDisplay)
                highlightNextStep(nextIdx); // Korosta seuraava listassa
            } else {
                // Jos ollaan viimeisen harjoituksen jälkeen (menossa kierroslepoon tai lopetukseen),
                // näytetään silti viimeinen harjoitus
                if (currentStepIndex < currentRoutineSteps.length) {
                    displayStep(currentStepIndex); // Näytä viimeisen tiedot (kutsuu updateRoundDisplay)
                    highlightCurrentStep(); // Korosta nykyinen (viimeinen)
                } else {
                    console.error("Error in startTimerForPhase: currentStepIndex out of bounds during rest phase end.");
                    resetAppState(); return;
                }
            }
        }

        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime); // Päivitä ajastimen numero ja label
        updateButtonStates(); // Päivitä kontrollinapit (Pause/Stop)
        // updateRoundDisplay kutsuttiin jo displayStepin kautta

        // Käynnistä sekuntikello vain jos kesto >= 0 (jotta 0s lepo toimii)
        if (remainingTime >= 0) {
             runTimerInterval();
         } else { // Jos kesto olisi negatiivinen, siirry heti loppuun
             handleTimerEnd();
         }
    } // startTimerForPhase loppuu

    // Sekuntikellon intervalli, joka vähentää aikaa ja soittaa ääniä
    function runTimerInterval() {
        if (timerInterval) return; // Estä useampi intervalli samanaikaisesti
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Älä tee mitään pausella

            remainingTime--; // Vähennä aikaa yhdellä sekunnilla
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1; // Aika ennen vähennystä äänimerkkiä varten

            // Äänimerkit (jos ääni sallittu)
            if(isAudioUnlocked){
                if (isWork) { // Työn viimeiset sekunnit (10s, 5s, 4s, 3s, 2s, 1s)
                    if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) {
                        playSound(beepSound);
                    }
                } else if (isRest) { // Lepon viimeiset sekunnit (3s, 2s, 1s)
                    if (checkTime >= 1 && checkTime <= 3) {
                        playSound(beepSound);
                    }
                }
            }

            // Päivitä näkyvä aika
            updateTimerDisplay(remainingTime);

            // Tarkista, loppuiko aika (aika menee alle nollan)
            if (remainingTime < 0) {
                handleTimerEnd(); // Käsittele vaiheen loppu
            }
        }, 1000); // Suorita tämä funktio joka 1000 ms (1 sekunti)
    } // runTimerInterval loppuu

    // Käsittelee ajastimen päättymisen (kun remainingTime < 0)
    function handleTimerEnd() {
        stopTimerInterval(); // Pysäytä kello
        timerDiv.classList.remove('timer-resting'); // Poista lepotyyli
        // Älä tee mitään, jos ei olla aktiivisessa tilassa
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;

        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

        // --- Jos TYÖAIKA päättyi ---
        if (timerState === TimerState.RUNNING_EXERCISE) {
            // Tarkista ettei indeksi ole epäkelpo
            if (currentStepIndex >= currentRoutineSteps.length) {
                console.error("Error in handleTimerEnd: currentStepIndex out of bounds after exercise.");
                resetAppState(); return;
            }
            const currentEx = currentRoutineSteps[currentStepIndex]; // Hae nykyinen harjoitus
            if (!currentEx) { resetAppState(); return; } // Turvatarkistus

            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1; // Oliko kierroksen viimeinen?
            const isLastR = currentRound >= currentWorkoutInfo.rounds; // Oliko treenin viimeinen kierros?
            const restDur = currentEx.restTime ?? 0; // Hae lepoaika (oletus 0)

            if (isLastEx) { // Jos oli kierroksen viimeinen harjoitus
                if (isLastR) { // Jos oli myös treenin viimeinen kierros
                    moveToNextPhase(); // Siirrytään lopputulokseen (finishRoutine)
                } else { // Ei ollut viimeinen kierros -> Kierroslepo tai suoraan uusi kierros
                    const roundRest = currentWorkoutInfo.restBetweenRounds || 0; // Hae kierroslepo
                    if (roundRest > 0) {
                        // Aloita kierroslepoajastin
                        startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest);
                    } else {
                        // Ei kierroslepoa, siirry suoraan seuraavan kierroksen alkuun
                        moveToNextPhase();
                    }
                }
            } else { // Ei ollut kierroksen viimeinen harjoitus -> Normaali lepo tai suoraan seuraava
                if (restDur > 0) {
                    // Aloita normaali lepoajastin
                    startTimerForPhase(TimerState.RUNNING_REST, restDur);
                } else {
                    // Ei lepoa, siirry suoraan seuraavaan harjoitukseen
                    moveToNextPhase();
                }
            }
        // --- Jos LEPOAIKA päättyi ---
        } else if (wasResting) {
            // Lepoaika (normaali tai kierros) päättyi
            clearNextUpHighlight(); // Poista seuraavan korostus
            moveToNextPhase(); // Siirry seuraavaan työvaiheeseen
        }
    } // handleTimerEnd loppuu

    // Logiikka seuraavaan vaiheeseen siirtymiseksi (kutsutaan handleTimerEndistä tai 0s lepojen jälkeen)
    function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;

        // Päivitä kierros- ja vaiheindeksit sen mukaan, mistä tilasta tultiin
        if (comingFromRoundRest) {
            // Kierroslepo päättyi -> aloita uusi kierros
            currentRound++;
            currentStepIndex = 0; // Kierroksen alkuun
        } else if (comingFromRest) {
            // Normaali lepo päättyi -> siirry seuraavaan harjoitukseen samalla kierroksella
            currentStepIndex++;
        } else { // Tultiin suoraan työstä (0s lepo)
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { // Viimeinen harjoitus, muttei viimeinen kierros -> uusi kierros
                currentRound++;
                currentStepIndex = 0;
            } else if (!isLastEx) { // Ei ollut viimeinen harjoitus -> seuraava harjoitus
                currentStepIndex++;
            }
            // Jos oli viimeinen harjoitus JA viimeinen kierros, indeksi/kierros ei muutu,
            // vaan alla oleva ehto johtaa finishRoutine()-kutsuun.
        }

        // Tarkista, onko treeni valmis vai jatketaanko
        if (currentRound > currentWorkoutInfo.rounds) {
            finishRoutine(); // Kaikki määritellyt kierrokset tehty
        } else if (currentStepIndex < currentRoutineSteps.length) {
            // Jos vaiheindeksi on validi, jatka seuraavaan työvaiheeseen
            const nextEx = currentRoutineSteps[currentStepIndex]; // Hae seuraavan vaiheen data
             if (!nextEx) { // Turvatarkistus
                 console.error("Error in moveToNextPhase: nextEx is undefined.");
                 resetAppState(); return;
             }
            // displayStep ja updateRoundDisplay kutsutaan startTimerForPhase:n kautta
            // Aloita seuraavan harjoituksen työaika
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else {
            // Tänne ei pitäisi päätyä normaalisti (indeksi meni yli, mutta kierrokset eivät?)
            console.error("State mismatch error during workout progression. currentStepIndex out of bounds?");
            resetAppState();
        }
    } // moveToNextPhase loppuu

    // Päivittää ajastimen näyttämän ajan ja labelin
    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds); // Varmista ettei näytetä negatiivista
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`; // Päivitä aika

        // Päivitä label tilan mukaan
        let label = "Odottamassa...";
        if (timerState === TimerState.RUNNING_EXERCISE) label = "Työaika";
        else if (timerState === TimerState.RUNNING_REST) label = "Lepo";
        else if (timerState === TimerState.RUNNING_ROUND_REST) label = "Kierroslepo";
        else if (timerState === TimerState.RUNNING_STEP) label = "Suorita vaihe";
        else if (timerState === TimerState.PAUSED) label = "Tauko";
        else if (timerState === TimerState.FINISHED) label = "Valmis";
        else if (timerState === TimerState.IDLE) { // IDLE-tilassa eri tekstit
            if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
                 label = ""; timeRemainingSpan.textContent = '--:--'; // Tyhjä lämm./jääh.
            } else if (activeRoutineType === 'workout' && currentRoutineSteps.length > 0) {
                 // Näytä tuleva työaika treenille
                 const step = currentRoutineSteps[currentStepIndex];
                 const idleTime = step?.workTime ?? 0;
                 const idleMinutes = Math.floor(idleTime / 60).toString().padStart(2, "0");
                 const idleSeconds = (idleTime % 60).toString().padStart(2, "0");
                 timeRemainingSpan.textContent = `${idleMinutes}:${idleSeconds}`;
                 label = "Valmiina";
            } else { // Oletus IDLE ilman valintaa
                timeRemainingSpan.textContent = '00:00'; label = 'Odottamassa...';
            }
        }
        timerLabelP.textContent = label; // Aseta label-teksti
    } // updateTimerDisplay loppuu

    // Päivittää kierrosinformaation TAI lämmittelyn/jäähdyttelyn vaiheen
    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') {
            // Näytä kierrokset treenille, jos kierroksia > 0 ja vaiheita ladattu, eikä olla FINISHED-tilassa
            if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) {
                 if (timerState === TimerState.IDLE) {
                      // IDLE-tilassa näytetään vain kokonaismäärä
                      roundInfoP.textContent = `Kierrokset: ${currentWorkoutInfo.rounds}`;
                 } else { // RUNNING_*, PAUSED
                      // Muissa tiloissa näytetään nykyinen/kokonaismäärä
                      roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
                 }
            } else {
                roundInfoP.textContent = ''; // Tyhjennä muulloin (esim. FINISHED)
            }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Näytä vaihe lämmittelylle/jäähdyttelylle, jos vaiheita on ladattu eikä olla FINISHED-tilassa
            if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) {
                 const totalSteps = currentRoutineSteps.length;
                 const currentStepNumber = currentStepIndex + 1; // Indeksi alkaa 0:sta, näyttö 1:stä
                 roundInfoP.textContent = `Vaihe ${currentStepNumber} / ${totalSteps}`;
            } else {
                 roundInfoP.textContent = ''; // Tyhjennä muulloin (esim. FINISHED)
            }
        } else {
            // Oletustila (ei rutiinia valittu)
            roundInfoP.textContent = '';
        }
    } // updateRoundDisplay loppuu

    // Navigoi edelliseen vaiheeseen (vain IDLE/FINISHED-tilassa)
    function prevStep() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
            if (currentStepIndex > 0) { // Varmista ettei mennä alle nollan
                jumpToStep(currentStepIndex - 1);
            }
        }
    } // prevStep loppuu

    // Navigoi seuraavaan vaiheeseen (vain IDLE/FINISHED-tilassa)
    function nextStepNav() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
             if (currentStepIndex < currentRoutineSteps.length - 1) { // Varmista ettei mennä yli
                jumpToStep(currentStepIndex + 1);
            }
        }
    } // nextStepNav loppuu

    // Päivittää kaikkien kontrollinappien tilan (näkyvyys, teksti, disabled)
    function updateButtonStates() {
        // Piilota aktiivisen rutiinin kontrollit oletuksena
        pauseResumeBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        nextStepBtn.style.display = 'none';

        // Piilota start-napit oletuksena
        startWarmupBtn.style.display = 'none';
        startWorkoutBtn.style.display = 'none';
        startCooldownBtn.style.display = 'none';

        // Määritä, onko jokin rutiini valittu ja ollaanko IDLE-tilassa
        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;

        // Näytä ja aseta oikea Start-nappi, JOS rutiini on valittu ja ollaan IDLE-tilassa
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block';
                startWarmupBtn.disabled = !warmupData; // Päällä jos data löytyy
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block';
                // Päällä jos viikko on valittu (tarkoittaa että treeni on ladattu)
                startWorkoutBtn.disabled = currentWorkoutInfo.week === null;
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block';
                startCooldownBtn.disabled = !cooldownData; // Päällä jos data löytyy
            }
        }

        // Määritä Prev/Next -navigointinappien tila (sallittu IDLE/FINISHED-tiloissa)
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0; // Pois päältä jos ei voi navigoida tai ollaan ekassa
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1; // Pois päältä jos ei voi navigoida tai ollaan vikassa

        // Määritä aktiivisen rutiinin kontrollien tila ajastimen tilan mukaan
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Treeni käynnissä (työ tai lepo) -> Näytä Pause ja Stop
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            // Lämmittely/Jäähdyttely käynnissä -> Näytä Stop ja Next Step
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block';
            stopBtn.disabled = false; nextStepBtn.disabled = false;
            // Päivitä "Seuraava Vaihe" / "Valmis" -teksti
            if (currentStepIndex === currentRoutineSteps.length - 1) {
                nextStepBtn.textContent = "Valmis ✅";
            } else {
                nextStepBtn.textContent = "Seuraava Vaihe ⏭";
            }
        } else if (timerState === TimerState.PAUSED) {
            // Treeni pausella -> Näytä Resume (Jatka) ja Stop
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
        // IDLE tai FINISHED: Kontrollit piilossa (hoidettu yllä oletuksilla)

    } // updateButtonStates loppuu

    // Palauttaa sovelluksen alkutilaan
    function resetAppState(resetSelections = true) {
        stopTimerInterval(); // Pysäytä ajastin

        // Nollaa ydintila
        currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1;
        remainingTime = 0; timerState = TimerState.IDLE; pausedState = null;
        isAudioUnlocked = false; // Nollaa äänilupa

        // Nollaa tietorakenne, säilytä taso jos resetSelections = false
        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };

        // Päivitä UI oletustilaan
        itemNameH2.textContent = "Valitse toiminto";
        itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
        infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes(); // Asettaa oletustekstin
        itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; // Piilota kuva
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>'; // Tyhjennä lista
        stepsListTitleH2.textContent = "Vaiheet"; // Oletusotsikko listalle
        updateTimerDisplay(0); // Nollaa ajastinnäyttö
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Poista tilaluokat
        timerDiv.style.visibility = 'hidden'; // Piilota ajastin
        highlightCurrentStep(); // Poistaa korostuksen listasta
        clearNextUpHighlight(); // Poistaa seuraavan korostuksen
        updateRoundDisplay(); // Tyhjentää round/vaihe-infon

         // Jos halutaan resetoida myös yläpalkin valinnat (esim. sovelluksen alussa)
         if (resetSelections) {
             activeRoutineType = 'none'; // Nollaa valittu rutiinityyppi
             currentWorkoutInfo.level = '2'; // Palauta taso oletukseen 2
             currentWorkoutInfo.week = null; // Nollaa valittu viikko

             // Piilota start-napit (koska mitään ei ole valittu)
             startWarmupBtn.style.display = 'none';
             startWorkoutBtn.style.display = 'none';
             startCooldownBtn.style.display = 'none';

             // Poista aktiivisuus valintanapeista
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             // Aseta taso 2 aktiiviseksi
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.level === '2');
             });

             // Sulje valikko ja info-alue, jos ne olivat auki
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) {
                 toggleInfoArea();
             }
             if (selectionArea && !selectionArea.classList.contains('hidden')) {
                 toggleTrainingSelectionVisibility();
             }
        }

        updateButtonStates(); // Päivitä nappien tila lopuksi vastaamaan resetoitua tilaa
        console.log("App state reset.");
    } // resetAppState loppuu

    // Korostaa aktiivisen vaiheen sivupalkin listassa ja skrollaa sen näkyviin
    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item'); // Hae kaikki vaihe-elementit
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10); // Lue indeksi elementistä
            // Jos vaiheita on, indeksi on numero ja se vastaa nykyistä indeksiä
            if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex) {
                item.classList.add('active'); // Lisää korostusluokka
                // Skrollaa elementti näkyviin listassa tarvittaessa
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Pehmeä skrollaus lähimpään reunaan
                }
            } else {
                item.classList.remove('active'); // Poista korostus muilta
            }
        });
        // Varmista, ettei mikään ole aktiivinen jos lista on tyhjä
        if (currentRoutineSteps.length === 0) {
            stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        }
    } // highlightCurrentStep loppuu

    // Korostaa seuraavan vaiheen listassa (levon aikana) "next-up"-tyylillä
    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight(); // Poista vanha korostus ensin
        let nextIdx = -1; // Oletusindeksi
        if (forceIndex !== -1) { // Jos indeksi annettiin (esim. kierroslevon jälkeen)
            nextIdx = forceIndex;
        } else if (timerState === TimerState.RUNNING_REST) { // Normaalisti levon aikana seuraava indeksi on +1
            nextIdx = currentStepIndex + 1;
        }

        // Jos saatiin validi seuraava indeksi
        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            // Etsi vastaava listaelementti
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up'); // Lisää korostusluokka
        }
    } // highlightNextStep loppuu

    // Poistaa seuraavan vaiheen korostuksen ("next-up")
    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up'); // Etsi korostettu elementti
        if (item) item.classList.remove('next-up'); // Poista luokka jos löytyi
    } // clearNextUpHighlight loppuu

    // Nämä ovat nyt tyhjiä, koska CSS hoitaa skrollauksen hallinnan
    function addBodyLock() { /* console.log("addBodyLock called (no effect from JS)"); */ }
    function removeBodyLock() { /* console.log("removeBodyLock called (no effect from JS)"); */ }

    // Näyttää/piilottaa yläosan valinta-alueen ja vaihtaa napin nuolen suuntaa
    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden'); // Vaihda luokka
        toggleSelectionAreaBtn.classList.toggle('open', !hidden); // Vaihda napin luokka (nuolta varten)
    } // toggleTrainingSelectionVisibility loppuu

    // --- Tapahtumankuuntelijoiden asetus ---
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility); // Yläpalkin valikko
    startWarmupBtn.addEventListener('click', startSelectedRoutine); // Aloita Lämmittely
    startWorkoutBtn.addEventListener('click', startSelectedRoutine); // Aloita Treeni
    startCooldownBtn.addEventListener('click', startSelectedRoutine); // Aloita Jäähdyttely
    pauseResumeBtn.addEventListener('click', pauseResumeTimer); // Tauko/Jatka
    stopBtn.addEventListener('click', stopActiveRoutine); // Lopeta
    nextStepBtn.addEventListener('click', handleNextStep); // Seuraava Vaihe (lämm./jääh.)
    prevBtn.addEventListener('click', prevStep); // Edellinen (navigointi)
    nextBtn.addEventListener('click', nextStepNav); // Seuraava (navigointi)
    // toggleInfoBtn kuuntelija lisätään initializeInfoArea:ssa

    // --- Sovelluksen käynnistys ---
    loadAppData(); // Ladataan data ja alustetaan sovellus kun sivu on latautunut

}); // DOMContentLoaded loppuu
