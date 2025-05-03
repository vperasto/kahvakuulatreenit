// app.js (Versio 13 - Useiden lämmittelyjen/jäähdyttelyjen tuki - TÄYDELLINEN)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const appDiv = document.getElementById('app');
    const header = document.querySelector('header');
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area');
    const selectionArea = document.getElementById('selection-area');
    const warmupSelectionDiv = document.getElementById('warmup-selection');
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container');
    const startWarmupBtn = document.getElementById('start-warmup-btn'); // Yksi yhteinen start-nappi lämmittelyille
    const trainingSelectionDiv = document.getElementById('training-selection');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelSelectionDiv = document.getElementById('level-selection');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const startWorkoutBtn = document.getElementById('start-workout-btn'); // Treenin start-nappi
    const cooldownSelectionDiv = document.getElementById('cooldown-selection');
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container');
    const startCooldownBtn = document.getElementById('start-cooldown-btn'); // Yksi yhteinen start-nappi jäähdyttelyille
    const mainLayout = document.querySelector('main.main-layout');
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
    const roundInfoP = document.getElementById('round-info');
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
        if (!audioElement.paused) { audioElement.pause(); audioElement.currentTime = 0; }
        audioElement.volume = 1.0;
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    }

    // --- Sovelluksen tila ---
    let fullProgramData = null;
    let allWarmups = []; // **MUUTOS: Lista kaikista lämmittelyistä**
    let allCooldowns = []; // **MUUTOS: Lista kaikista jäähdyttelyistä**
    let currentWorkoutExercises = [];
    let currentRoutineSteps = []; // Aktiivisen rutiinin vaiheet
    let currentStepIndex = 0;
    let activeRoutineType = 'none'; // 'warmup', 'workout', 'cooldown'
    let currentSelectedRoutineId = null; // **UUSI: Valitun lämm./jäähd. ID**
    let currentWorkoutInfo = { week: null, phaseIndex: null, level: '2', rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
    let currentRound = 1;
    let timerInterval = null; // Treenin työ/lepoajastin
    let remainingTime = 0; // Treenin jäljellä oleva aika
    let routineTimerInterval = null; // Lämmittelyn/jäähdyttelyn kestoajastin
    let elapsedRoutineTime = 0; // Lämmittelyn/jäähdyttelyn kulunut aika sekunteina
    const TimerState = { IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished', RUNNING_STEP: 'running_step' };
    let timerState = TimerState.IDLE; let pausedState = null; let isAudioUnlocked = false;

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            // **MUUTOS: Tarkista uudet listat**
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !Array.isArray(fullProgramData.warmups) || !Array.isArray(fullProgramData.cooldowns) || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect (missing warmups/cooldowns array?).");
                itemNameH2.textContent = "Virheellinen ohjelmadata."; return;
            }

            // **MUUTOS: Tallenna listat**
            allWarmups = fullProgramData.warmups;
            allCooldowns = fullProgramData.cooldowns;

            populateWarmupSelector(); // Luo napit allWarmups-listasta
            populateCooldownSelector(); // Luo napit allCooldowns-listasta
            populateWeekSelectors();
            addLevelButtonListeners();
            initializeInfoArea();
            resetAppState();
        } catch (error) {
            console.error("Could not load or process program data:", error);
            itemNameH2.textContent = "Virhe ladattaessa ohjelmaa.";
            resetAppState();
        }
    } // loadAppData loppuu

    // --- UI Populointi ja Kuuntelijat ---

    // **MUUTETTU FUNKTIO: Luo napit jokaiselle lämmittelylle**
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (allWarmups && allWarmups.length > 0) {
            allWarmups.forEach(warmup => {
                const button = document.createElement('button');
                // Käytä rutiinin nimeä ja kestoa napin tekstissä
                button.textContent = `${warmup.name} (${warmup.durationMinutes} min)`;
                button.classList.add('routine-button');
                button.dataset.routineType = 'warmup'; // Kerro tyyppi
                button.dataset.routineId = warmup.id; // **Tallenna uniikki ID**
                // Lisää kuuntelija, joka kutsuu selectRoutinea ID:n kanssa
                button.addEventListener('click', () => selectRoutine('warmup', warmup.id));
                warmupButtonsContainer.appendChild(button);
            });
            startWarmupBtn.disabled = true; // Aloitusnappi pois päältä oletuksena
            startWarmupBtn.style.display = 'none'; // Piilota aluksi
        } else {
            warmupButtonsContainer.innerHTML = '<p>Lämmittelyvaihtoehtoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true;
            startWarmupBtn.style.display = 'none';
        }
    } // populateWarmupSelector loppuu

    // **MUUTETTU FUNKTIO: Luo napit jokaiselle jäähdyttelylle**
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (allCooldowns && allCooldowns.length > 0) {
            allCooldowns.forEach(cooldown => {
                const button = document.createElement('button');
                button.textContent = `${cooldown.name} (${cooldown.durationMinutes} min)`;
                button.classList.add('routine-button');
                button.dataset.routineType = 'cooldown'; // Kerro tyyppi
                button.dataset.routineId = cooldown.id; // **Tallenna uniikki ID**
                 // Lisää kuuntelija, joka kutsuu selectRoutinea ID:n kanssa
                button.addEventListener('click', () => selectRoutine('cooldown', cooldown.id));
                cooldownButtonsContainer.appendChild(button);
            });
            startCooldownBtn.disabled = true; // Aloitusnappi pois päältä oletuksena
            startCooldownBtn.style.display = 'none'; // Piilota aluksi
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelyvaihtoehtoja ei löytynyt.</p>';
            startCooldownBtn.disabled = true;
            startCooldownBtn.style.display = 'none';
        }
    } // populateCooldownSelector loppuu

    // Luo Viikko-valintanapit (1-11)
    function populateWeekSelectors() {
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return;
        weekButtonsContainer.innerHTML = ''; const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`; button.classList.add('week-button'); button.dataset.weekNumber = i;
            button.addEventListener('click', (e) => { e.currentTarget.blur(); handleWeekSelect(i); });
            weekButtonsContainer.appendChild(button);
        }
    } // populateWeekSelectors loppuu

    // Lisää tapahtumakuuntelijat Taso-napeille
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    } // addLevelButtonListeners loppuu

    // **MUUTETTU FUNKTIO: Käsittelee lämm./jäähd. valinnan ID:n perusteella**
    function selectRoutine(routineType, routineId) {
        console.log(`Routine selected: Type=${routineType}, ID=${routineId}`);

        let selectedRoutineData = null;
        // Etsi oikea rutiini ID:n perusteella oikeasta listasta
        if (routineType === 'warmup') {
            selectedRoutineData = allWarmups.find(w => w.id === routineId);
        } else if (routineType === 'cooldown') {
            selectedRoutineData = allCooldowns.find(c => c.id === routineId);
        }

        if (!selectedRoutineData) {
            console.error(`Routine data not found for type ${routineType} and ID ${routineId}`);
            return; // Älä tee mitään, jos dataa ei löydy
        }

        activeRoutineType = routineType; // Aseta aktiivinen tyyppi
        currentSelectedRoutineId = routineId; // **Tallenna valitun rutiinin ID**
        resetAppState(false); // Resetoi ajastin ja tila, säilytä taso
        currentRoutineSteps = []; // Tyhjennä edelliset vaiheet

        // Poista 'active' kaikilta rutiini- ja viikkopainikkeilta
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));
        // Lisää 'active' klikatulle painikkeelle ID:n perusteella
        const selectedBtn = document.querySelector(`.routine-button[data-routine-id="${routineId}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');

        // Lataa ja näytä valitun rutiinin tiedot
        infoAreaTitleH2.textContent = `${selectedRoutineData.name} (${selectedRoutineData.durationMinutes} min)`;
        updateInfoAreaNotes(selectedRoutineData.description); // Päivitä infoteksti
        // Luo vaihelista ja lisää indeksi jokaiseen vaiheeseen
        currentRoutineSteps = selectedRoutineData.steps.map((step, index) => ({ ...step, index }));
        populateStepsList(currentRoutineSteps); // Täytä sivupalkin lista
        displayStep(0); // Näytä ensimmäinen vaihe päänäkymässä

        updateButtonStates(); // Päivitä nappien tila (näyttää Start-napin)
        updateRoundDisplay(); // Päivitä round/vaihe-info
    } // selectRoutine loppuu

    // Käsittelee tason valinnan UI:ssa
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; // Älä tee mitään jos taso on sama
        console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel; // Tallenna uusi taso

        // Päivitä nappien ulkoasu (lisää/poista 'active'-luokka)
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === selectedLevel);
        });

        // Jos viikko on jo valittu JA aktiivinen rutiini on treeni, lataa sen tiedot uudelleen tällä uudella tasolla
        if (currentWorkoutInfo.week !== null && activeRoutineType === 'workout') {
            handleWeekSelect(currentWorkoutInfo.week);
        } else {
            // Jos viikkoa ei ole valittu (tai ei olla treenissä), päivitä vain infoteksti (jos siellä näytetään taso)
            updateInfoAreaNotes();
        }
    } // handleLevelSelect loppuu

    // Käsittelee viikon valinnan UI:ssa (lataa ja valmistelee treenin)
    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout'; // **Aseta tyypiksi treeni**
        currentSelectedRoutineId = null; // **Nollaa rutiini-ID, koska nyt valitaan treeni**
        resetAppState(false); // Resetoi ajastin ja tila, säilytä taso

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
            // Jos funktiolle annettiin oma teksti, käytä sitä (esim. rutiinin kuvaus selectRoutinesta)
            noteText = customNote;
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            // Jos treeni on valittu, rakenna infoteksti sen tiedoista
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            const roundsText = `Kierrokset: ${currentWorkoutInfo.rounds || 'Ei määritelty'}`;
            const roundRestText = `Kierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}${roundsText}\n${roundRestText}`;
        } else if (activeRoutineType === 'warmup' && currentSelectedRoutineId) {
            // **MUUTOS: Hae valitun lämmittelyn kuvaus ID:n perusteella**
            const selectedWarmup = allWarmups.find(w => w.id === currentSelectedRoutineId);
            noteText = selectedWarmup?.description || "Lämmittelyn kuvausta ei löytynyt.";
        } else if (activeRoutineType === 'cooldown' && currentSelectedRoutineId) {
             // **MUUTOS: Hae valitun jäähdyttelyn kuvaus ID:n perusteella**
            const selectedCooldown = allCooldowns.find(c => c.id === currentSelectedRoutineId);
            noteText = selectedCooldown?.description || "Jäähdyttelyn kuvausta ei löytynyt.";
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
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    } // highlightWeekButton loppuu

    // Luo sivupalkkiin listan rutiinin vaiheista
    function populateStepsList(steps) {
        stepsListUl.innerHTML = ''; // Tyhjennä vanha lista
        if (!steps || steps.length === 0) {
            stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>';
            stepsListTitleH2.textContent = "Vaiheet"; return;
        }
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name}`;
            li.dataset.index = index; li.classList.add('step-item');
            li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToStep(index); });
            stepsListUl.appendChild(li);
        });
    } // populateStepsList loppuu

    // Hyppää tiettyyn vaiheeseen (kun klikataan sivupalkista)
    function jumpToStep(index) {
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer(); stopRoutineTimer(); // Pysäytä molemmat ajastimet
            currentStepIndex = index; currentRound = 1; timerState = TimerState.IDLE;
            elapsedRoutineTime = 0; // Nollaa kulunut aika
            displayStep(currentStepIndex); updateButtonStates(); clearNextUpHighlight(); updateRoundDisplay();
        }
    } // jumpToStep loppuu

    // Näyttää aktiivisen vaiheen tiedot päänäkymässä
    function displayStep(index) {
        if (index < 0 || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.error(`Invalid step index: ${index}`); resetAppState(); itemNameH2.textContent = "Virhe vaiheen näyttämisessä"; itemDescriptionP.textContent = `Vaihetta ei löytynyt indeksillä ${index}.`; itemImageImg.style.display = 'none'; timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = ''; return;
        }
        const step = currentRoutineSteps[index]; itemNameH2.textContent = step.displayTitle || step.name;
        if (activeRoutineType === 'workout') {
            let descriptionText = step.description || ''; if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim();
            if (step.image) { itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name; itemImageImg.style.display = 'block'; }
            else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
            timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { remainingTime = step.workTime || 0; updateTimerDisplay(remainingTime); }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = timerState === TimerState.FINISHED ? "Valmis (Kesto)" : "Valmiina";
            } else if (timerState === TimerState.RUNNING_STEP){
                 updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = 'Kulunut aika';
             }
        } else {
            itemDescriptionP.textContent = "Valitse toiminto yläpuolelta."; itemImageImg.style.display = 'none';
            timerDiv.style.visibility = 'hidden'; timeRemainingSpan.textContent = '00:00'; timerLabelP.textContent = 'Odottamassa...';
            roundInfoP.textContent = '';
        }
        highlightCurrentStep(); updateRoundDisplay();
    } // displayStep loppuu

    // --- Info Area Collapse Toiminnot ---
    function initializeInfoArea() {
        infoContentWrapper.classList.add('collapsed'); toggleInfoBtn.setAttribute('aria-expanded', 'false');
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä";
        toggleInfoBtn.addEventListener('click', toggleInfoArea);
    } // initializeInfoArea loppuu

    function toggleInfoArea() {
        const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); const isExpanded = !isCollapsed;
        toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded));
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä";
        console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`);
    } // toggleInfoArea loppuu

    // --- Ajastimen ja Rutiinin Etenemisen toiminnot ---
    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) { console.warn("Start conditions not met."); return; }
        if (mainLayout) { window.scrollTo({ top: mainLayout.offsetTop, behavior: 'smooth' }); }
        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            console.log("Attempting to unlock audio context...");
            beepSound.volume = 0.001; beepSound.play().then(() => { beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; isAudioUnlocked = true; console.log("Audio context unlocked."); proceedWithWorkoutStart(); })
            .catch(error => { console.warn("Audio context unlock failed:", error); beepSound.volume = 1.0; isAudioUnlocked = true; proceedWithWorkoutStart(); });
        } else {
            proceedWithRoutineStart();
        }
    } // startSelectedRoutine loppuu

    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting WORKOUT..."); currentStepIndex = 0; currentRound = 1;
        selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open'); const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text'); if (toggleTextElem) toggleTextElem.textContent = "Valinnat";
        timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    } // proceedWithWorkoutStart loppuu

    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`); currentStepIndex = 0; currentRound = 1;
        elapsedRoutineTime = 0;
        displayStep(currentStepIndex);
        selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open'); const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text'); if (toggleTextElem) toggleTextElem.textContent = "Valinnat";
        timerState = TimerState.RUNNING_STEP;
        timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
        timerLabelP.textContent = "Kulunut aika";
        startRoutineTimer();
        updateButtonStates(); updateRoundDisplay();
    } // proceedWithRoutineStart loppuu

    function pauseResumeTimer() { // Vain treenille
        if (activeRoutineType !== 'workout') return;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Workout Paused"); pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused'); timerDiv.classList.add('timer-paused'); }
        else if (timerState === TimerState.PAUSED) { console.log("Workout Resumed"); timerState = pausedState || TimerState.RUNNING_EXERCISE; pausedState = null; runTimerInterval(); pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused'); timerDiv.classList.remove('timer-paused'); if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){ timerDiv.classList.add('timer-resting'); highlightNextStep(); } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); } }
        updateButtonStates(); updateRoundDisplay();
    } // pauseResumeTimer loppuu

    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`); const previouslyActiveType = activeRoutineType;
        stopTimer(); stopRoutineTimer(); clearNextUpHighlight();
        timerState = TimerState.IDLE; elapsedRoutineTime = 0;
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
             displayStep(currentStepIndex);
             if(previouslyActiveType === 'workout') updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
        } else { resetAppState(); return; }
        updateButtonStates();
    } // stopActiveRoutine loppuu

    function handleNextStep() { // Vain lämm./jäähd.
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return; if (timerState !== TimerState.RUNNING_STEP) return;
         currentStepIndex++;
         if (currentStepIndex >= currentRoutineSteps.length) finishRoutine();
         else { displayStep(currentStepIndex); highlightCurrentStep(); }
         updateButtonStates();
    } // handleNextStep loppuu

     function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`); const finishedType = activeRoutineType;
         stopTimer(); stopRoutineTimer(); timerState = TimerState.FINISHED; clearNextUpHighlight();
         itemNameH2.textContent = `${finishedType.charAt(0).toUpperCase() + finishedType.slice(1)} Valmis!`;
         itemDescriptionP.textContent = "Hyvää työtä!"; itemImageImg.style.display = 'none';
         updateTimerDisplay(finishedType === 'workout' ? 0 : elapsedRoutineTime);
         timerLabelP.textContent = finishedType === 'workout' ? "Valmis" : "Valmis (Kesto)";
         updateRoundDisplay(); updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         if (isAudioUnlocked && finishedType === 'workout') playSound(beepSound);
         updateButtonStates(); elapsedRoutineTime = 0;
     } // finishRoutine loppuu

    // --- Ajastimen sisäiset toiminnot ---
    function stopTimer() { stopTimerInterval(); pausedState = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); console.log("Treeni ajastin pysäytetty."); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); stopRoutineTimer(); timerState = phaseState; remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active'); clearNextUpHighlight();
        if (phaseState === TimerState.RUNNING_EXERCISE) { if (currentStepIndex < currentRoutineSteps.length) displayStep(currentStepIndex); else { console.error("Error..."); resetAppState(); return; } highlightCurrentStep(); }
        else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) { timerDiv.classList.add('timer-resting'); const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1; if (nextIdx < currentRoutineSteps.length) { displayStep(nextIdx); highlightNextStep(nextIdx); } else { if (currentStepIndex < currentRoutineSteps.length) { displayStep(currentStepIndex); highlightCurrentStep(); } else { console.error("Error..."); resetAppState(); return; } } }
        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`); updateTimerDisplay(remainingTime); updateButtonStates(); updateRoundDisplay();
        if (remainingTime >= 0) runTimerInterval(); else handleTimerEnd();
    }
     function runTimerInterval() { // Treenin ajastin
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; remainingTime--;
            const isWork = timerState === TimerState.RUNNING_EXERCISE; const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const checkTime = remainingTime + 1;
            if(isAudioUnlocked){ if (isWork) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) playSound(beepSound); } else if (isRest) { if (checkTime >= 1 && checkTime <= 3) playSound(beepSound); } }
            updateTimerDisplay(remainingTime); if (remainingTime < 0) handleTimerEnd();
        }, 1000);
    }
    function handleTimerEnd() { // Treenin ajastin loppuu
        stopTimerInterval(); timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;
        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        if (timerState === TimerState.RUNNING_EXERCISE) { if (currentStepIndex >= currentRoutineSteps.length) { console.error("Error..."); resetAppState(); return; } const currentEx = currentRoutineSteps[currentStepIndex]; if (!currentEx) { resetAppState(); return; } const isLastEx = currentStepIndex === currentRoutineSteps.length - 1; const isLastR = currentRound >= currentWorkoutInfo.rounds; const restDur = currentEx.restTime ?? 0; if (isLastEx) { if (isLastR) moveToNextPhase(); else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); else moveToNextPhase(); } } else { if (restDur > 0) startTimerForPhase(TimerState.RUNNING_REST, restDur); else moveToNextPhase(); } }
        else if (wasResting) { clearNextUpHighlight(); moveToNextPhase(); }
    }
     function moveToNextPhase() { // Treenin vaihe eteenpäin
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;
        if (comingFromRoundRest) { currentRound++; currentStepIndex = 0; } else if (comingFromRest) { currentStepIndex++; } else { const isLastEx = currentStepIndex === currentRoutineSteps.length - 1; const isLastR = currentRound >= currentWorkoutInfo.rounds; if(isLastEx && !isLastR) { currentRound++; currentStepIndex = 0; } else if (!isLastEx) { currentStepIndex++; } }
        if (currentRound > currentWorkoutInfo.rounds) finishRoutine();
        else if (currentStepIndex < currentRoutineSteps.length) { const nextEx = currentRoutineSteps[currentStepIndex]; if (!nextEx) { console.error("Error..."); resetAppState(); return; } startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime); }
        else { console.error("State mismatch..."); resetAppState(); }
    }

    // --- UUDET FUNKTIOT RUTIINIAJASTIMELLE ---
    function startRoutineTimer() { // Lämm./Jäähd. ajastin
        stopRoutineTimer(); if(timerState !== TimerState.RUNNING_STEP) return;
        updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = "Kulunut aika";
        routineTimerInterval = setInterval(() => { if (timerState !== TimerState.RUNNING_STEP) { stopRoutineTimer(); return; } elapsedRoutineTime++; updateTimerDisplay(elapsedRoutineTime); }, 1000);
        console.log("Routine timer started.");
    }
    function stopRoutineTimer() { if (routineTimerInterval) { clearInterval(routineTimerInterval); routineTimerInterval = null; console.log("Routine timer stopped."); } }
    // --- UUDET FUNKTIOT LOPPUU ---

    // Päivittää ajastimen näyttämän ajan (MM:SS)
    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds);
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        // Labelit asetetaan muualla, paitsi IDLE oletus
         if (timerState === TimerState.IDLE && activeRoutineType === 'none') {
             timerLabelP.textContent = 'Odottamassa...';
         }
    } // updateTimerDisplay loppuu

    // Päivittää kierrosinformaation TAI lämmittelyn/jäähdyttelyn vaiheen numeron
    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') {
            if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) { if (timerState === TimerState.IDLE) roundInfoP.textContent = `Kierrokset: ${currentWorkoutInfo.rounds}`; else roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`; } else roundInfoP.textContent = '';
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) { const totalSteps = currentRoutineSteps.length; const currentStepNumber = currentStepIndex + 1; roundInfoP.textContent = `Vaihe ${currentStepNumber} / ${totalSteps}`; } else roundInfoP.textContent = '';
        } else {
            roundInfoP.textContent = '';
        }
    } // updateRoundDisplay loppuu

    // Navigoi edelliseen vaiheeseen (IDLE/FINISHED)
    function prevStep() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) { if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1); } }
    // Navigoi seuraavaan vaiheeseen (IDLE/FINISHED)
    function nextStepNav() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) { if (currentStepIndex < currentRoutineSteps.length - 1) jumpToStep(currentStepIndex + 1); } }

    // Päivittää nappien tilan
    function updateButtonStates() {
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';

        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;
        // Näytä oikea Start-nappi, jos rutiini valittu ja IDLE
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block';
                startWarmupBtn.disabled = !allWarmups.some(w => w.id === currentSelectedRoutineId); // Tarkista ID
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block';
                startWorkoutBtn.disabled = currentWorkoutInfo.week === null; // Tarkista viikko
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block';
                startCooldownBtn.disabled = !allCooldowns.some(c => c.id === currentSelectedRoutineId); // Tarkista ID
            }
        }

        // Prev/Next navigointi
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;

        // Aktiivisen rutiinin kontrollit
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block'; pauseResumeBtn.disabled = false; stopBtn.disabled = false; pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block'; stopBtn.disabled = false; nextStepBtn.disabled = false;
            if (currentStepIndex === currentRoutineSteps.length - 1) nextStepBtn.textContent = "Valmis ✅"; else nextStepBtn.textContent = "Seuraava Vaihe ⏭";
        } else if (timerState === TimerState.PAUSED) {
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block'; pauseResumeBtn.disabled = false; stopBtn.disabled = false; pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
    } // updateButtonStates loppuu

    // Palauttaa sovelluksen alkutilaan
    function resetAppState(resetSelections = true) {
        stopTimerInterval(); stopRoutineTimer(); // Pysäytä molemmat
        currentRoutineSteps = []; currentWorkoutExercises = []; currentStepIndex = 0; currentRound = 1;
        remainingTime = 0; elapsedRoutineTime = 0; // Nollaa molemmat ajat
        timerState = TimerState.IDLE; pausedState = null; isAudioUnlocked = false;
        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
        currentSelectedRoutineId = null; // **Nollaa myös valitun rutiinin ID**
        itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = "Valitse toiminto yläpuolelta."; infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes(); itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>'; stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0); timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active');
        timerDiv.style.visibility = 'hidden'; highlightCurrentStep(); clearNextUpHighlight(); updateRoundDisplay();
         if (resetSelections) {
             activeRoutineType = 'none'; currentWorkoutInfo.level = '2'; currentWorkoutInfo.week = null;
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === '2'); });
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea();
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        }
        updateButtonStates(); console.log("App state reset.");
    } // resetAppState loppuu

    // Korostaa aktiivisen vaiheen sivupalkin listassa
    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => { const idx = parseInt(item.dataset.index, 10); if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex) { item.classList.add('active'); if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } else item.classList.remove('active'); });
        if (currentRoutineSteps.length === 0) stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
    } // highlightCurrentStep loppuu

    // Korostaa seuraavan vaiheen listassa (levon aikana)
    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight(); let nextIdx = -1;
        if (forceIndex !== -1) nextIdx = forceIndex; else if (timerState === TimerState.RUNNING_REST) nextIdx = currentStepIndex + 1;
        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) { const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`); if (nextItem) nextItem.classList.add('next-up'); }
    } // highlightNextStep loppuu

    // Poistaa seuraavan vaiheen korostuksen
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }
    // Nämä tyhjiä, koska CSS hoitaa
    function addBodyLock() { /* CSS hoitaa */ } function removeBodyLock() { /* CSS hoitaa */ }
    // Näyttää/piilottaa yläosan valinta-alueen
    function toggleTrainingSelectionVisibility() { const hidden = selectionArea.classList.toggle('hidden'); toggleSelectionAreaBtn.classList.toggle('open', !hidden); }

    // --- Tapahtumankuuntelijoiden asetus ---
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    // Start-napit kuuntelevat edelleen, niiden näkyvyyttä ja tilaa ohjaa updateButtonStates
    startWarmupBtn.addEventListener('click', startSelectedRoutine);
    startWorkoutBtn.addEventListener('click', startSelectedRoutine);
    startCooldownBtn.addEventListener('click', startSelectedRoutine);
    pauseResumeBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopActiveRoutine);
    nextStepBtn.addEventListener('click', handleNextStep);
    prevBtn.addEventListener('click', prevStep);
    nextBtn.addEventListener('click', nextStepNav);

    // --- Sovelluksen käynnistys ---
    loadAppData(); // Ladataan data ja alustetaan sovellus kun DOM on valmis

}); // DOMContentLoaded loppuu
