// app.js (Versio Yhdistetty: V12 + V14 monivalinta lämm./jäähd.)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const appDiv = document.getElementById('app');
    const header = document.querySelector('header');
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area');
    const selectionArea = document.getElementById('selection-area');
    const warmupSelectionDiv = document.getElementById('warmup-selection');
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container');
    const startWarmupBtn = document.getElementById('start-warmup-btn'); // YKSI start-nappi lämmittelyille
    const trainingSelectionDiv = document.getElementById('training-selection');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelSelectionDiv = document.getElementById('level-selection');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const startWorkoutBtn = document.getElementById('start-workout-btn');
    const cooldownSelectionDiv = document.getElementById('cooldown-selection');
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container');
    const startCooldownBtn = document.getElementById('start-cooldown-btn'); // YKSI start-nappi jäähdyttelyille
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
    const roundInfoP = document.getElementById('round-info'); // Info (kierros/vaihe)
    const timerDiv = document.getElementById('timer'); // Ajastimen container
    const timeRemainingSpan = document.getElementById('time-remaining'); // MM:SS näyttö
    const timerLabelP = document.getElementById('timer-label'); // Ajastimen selite
    const controlButtonContainer = document.querySelector('.control-button-container');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    // --- Ääniobjekti ---
    const beepSound = new Audio('audio/beep.mp3');
    beepSound.load(); // Ladataan valmiiksi
    function playSound(audioElement) {
        // Yritä pysäyttää ja kelata alkuun, jos ääni soi jo (estää päällekkäisyyksiä)
        if (!audioElement.paused) {
             audioElement.pause();
             audioElement.currentTime = 0;
        }
        // Aseta äänenvoimakkuus (jos haluat säätää)
        audioElement.volume = 1.0;
        // Soita ääni (catch estää virheet, jos soitto ei onnistu)
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    } // playSound loppuu

    // --- Sovelluksen tila ---
    let fullProgramData = null; // Koko ohjelmadata JSONista
    let allWarmups = []; // **MUUTOS V14: Lista kaikista lämmittelyistä**
    let allCooldowns = []; // **MUUTOS V14: Lista kaikista jäähdyttelyistä**
    let selectedRoutineData = null; // **UUSI V14: Tähän tallennetaan valitun lämm./jäähd. tiedot**
    // let warmupData = null; // POISTETTU (korvattu ylläolevilla)
    // let cooldownData = null; // POISTETTU (korvattu ylläolevilla)
    let currentWorkoutExercises = []; // Nykyisen valitun TREENIN harjoitukset
    let currentRoutineSteps = []; // Nykyisen aktiivisen rutiinin (lämm., treeni, jää.) vaiheet/harjoitukset
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
    let timerInterval = null; // Treenin työ/lepoajastimen setInterval ID
    let remainingTime = 0; // Treenin jäljellä oleva aika sekunteina
    let routineTimerInterval = null; // Lämmittelyn/jäähdyttelyn kestoajastimen setInterval ID
    let elapsedRoutineTime = 0; // Lämmittelyn/jäähdyttelyn kulunut aika sekunteina
    const TimerState = { // Ajastimen eri tilat sovelluksen logiikan ohjaamiseen
        IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest',
        RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished',
        RUNNING_STEP: 'running_step' // Lämm./Jäähd. vaihe käynnissä
    };
    let timerState = TimerState.IDLE; // Ajastimen nykyinen tila
    let pausedState = null; // Tila, johon palataan paussilta
    let isAudioUnlocked = false; // Onko käyttäjäinteraktio sallinut äänet

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            // **MUUTOS V14: Tarkista uudet listat (warmups, cooldowns)**
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !Array.isArray(fullProgramData.warmups) || !Array.isArray(fullProgramData.cooldowns) || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect (missing warmups/cooldowns arrays or other key parts?).");
                itemNameH2.textContent = "Virheellinen ohjelmadata."; return;
            }

            // **MUUTOS V14: Tallenna listat**
            allWarmups = fullProgramData.warmups;
            allCooldowns = fullProgramData.cooldowns;
            // Poistettu vanhat yksittäisten rutiinien tallennukset

            populateWarmupSelector(); // Luo napit kaikille lämmittelyille
            populateCooldownSelector(); // Luo napit kaikille jäähdyttelyille
            populateWeekSelectors();
            addLevelButtonListeners();
            initializeInfoArea();
            resetAppState(); // Aseta sovellus alkutilaan
        } catch (error) {
            console.error("Could not load or process program data:", error);
            itemNameH2.textContent = "Virhe ladattaessa ohjelmaa.";
            resetAppState();
        }
    } // loadAppData loppuu

    // --- UI Populointi ja Kuuntelijat ---

    // **MUUTOS V14: Luo napit kaikille lämmittelyille listasta**
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (allWarmups && allWarmups.length > 0) {
            allWarmups.forEach(warmup => { // Käy läpi jokainen lämmittely listassa
                if (!warmup || !warmup.id || !warmup.name) {
                    console.warn("Skipping invalid warmup item:", warmup);
                    return; // Skipataan virheelliset
                }
                const button = document.createElement('button');
                // Käytä rutiinin nimeä ja kestoa napin tekstissä
                button.textContent = `${warmup.name}${warmup.durationMinutes ? ` (${warmup.durationMinutes} min)` : ''}`;
                button.classList.add('routine-button'); // Yleinen rutiininapin tyyli
                button.dataset.routineType = 'warmup'; // Tieto tyypistä
                button.dataset.routineId = warmup.id; // **Tärkeä: Tallenna uniikki ID**
                // Klikatessa kutsu selectRoutine tyypillä ja ID:llä
                button.addEventListener('click', () => selectRoutine('warmup', warmup.id));
                warmupButtonsContainer.appendChild(button);
            });
            startWarmupBtn.disabled = true; // Start-nappi aluksi pois päältä
            startWarmupBtn.style.display = 'none'; // Varmista piilotus alussa
        } else {
            warmupButtonsContainer.innerHTML = '<p>Lämmittelytietoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true;
            startWarmupBtn.style.display = 'none';
        }
    } // populateWarmupSelector loppuu

    // **MUUTOS V14: Luo napit kaikille jäähdyttelyille listasta**
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        if (allCooldowns && allCooldowns.length > 0) {
            allCooldowns.forEach(cooldown => { // Käy läpi jokainen jäähdyttely listassa
                 if (!cooldown || !cooldown.id || !cooldown.name) {
                    console.warn("Skipping invalid cooldown item:", cooldown);
                    return; // Skipataan virheelliset
                }
                const button = document.createElement('button');
                button.textContent = `${cooldown.name}${cooldown.durationMinutes ? ` (${cooldown.durationMinutes} min)` : ''}`;
                button.classList.add('routine-button');
                button.dataset.routineType = 'cooldown';
                button.dataset.routineId = cooldown.id; // **Tallenna uniikki ID**
                button.addEventListener('click', () => selectRoutine('cooldown', cooldown.id));
                cooldownButtonsContainer.appendChild(button);
            });
            startCooldownBtn.disabled = true; // Start-nappi aluksi pois päältä
            startCooldownBtn.style.display = 'none'; // Varmista piilotus alussa
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelytietoja ei löytynyt.</p>';
            startCooldownBtn.disabled = true;
            startCooldownBtn.style.display = 'none';
        }
    } // populateCooldownSelector loppuu

    // Luo Viikko-valintanapit (1-11) (Ennallaan V12)
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

    // Lisää tapahtumakuuntelijat Taso-napeille (Ennallaan V12)
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    } // addLevelButtonListeners loppuu

    // **MUUTOS V14: Käsittelee valitun lämmittelyn/jäähdyttelyn ID:n perusteella**
    function selectRoutine(routineType, routineId) {
        console.log(`Routine selected: Type=${routineType}, ID=${routineId}`);
        activeRoutineType = routineType; // Aseta yleinen tyyppi
        resetAppState(false); // Resetoi ajastin yms., säilytä taso
        currentRoutineSteps = []; // Tyhjennä vaiheet
        selectedRoutineData = null; // Nollaa valitun rutiinin data

        let routineList = []; // Mistä listasta etsitään
        if (routineType === 'warmup') routineList = allWarmups;
        else if (routineType === 'cooldown') routineList = allCooldowns;
        else { // Ei pitäisi tapahtua nappien kautta
            console.warn("selectRoutine called with invalid type:", routineType);
            updateButtonStates(); // Päivitä napit silti
            return;
        }

        // Etsi oikea rutiini ID:n perusteella
        selectedRoutineData = routineList.find(routine => routine.id === routineId);

        // Poista active-luokka kaikilta rutiini/viikko-napeilta
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));

        if (selectedRoutineData && selectedRoutineData.steps) { // Varmista että löytyi JA sillä on vaiheita
            // Löytyi! Päivitä UI ja tila
            infoAreaTitleH2.textContent = `${selectedRoutineData.name}${selectedRoutineData.durationMinutes ? ` (${selectedRoutineData.durationMinutes} min)` : ''}`;
            updateInfoAreaNotes(selectedRoutineData.description || "Ei kuvausta."); // Käytä sen kuvausta
            currentRoutineSteps = selectedRoutineData.steps.map((step, index) => ({ ...step, index })); // Lisää indeksit vaiheisiin
            populateStepsList(currentRoutineSteps);
            displayStep(0); // Näytä eka vaihe

            // Korosta klikattu nappi ID:n ja tyypin perusteella
            const selectedBtn = document.querySelector(`.routine-button[data-routine-id="${routineId}"][data-routine-type="${routineType}"]`);
            if (selectedBtn) selectedBtn.classList.add('active');

        } else {
            // Ei löytynyt tai datassa virhe
            console.error(`Routine with ID ${routineId} and type ${routineType} not found or has no steps!`);
            infoAreaTitleH2.textContent = "Virhe";
            updateInfoAreaNotes("Valittua rutiinia ei löytynyt tai se on virheellinen.");
            populateStepsList([]);
            displayStep(-1); // Näytä virhe/oletus
        }

        updateButtonStates(); // Päivitä mm. start-nappi
        updateRoundDisplay();
    } // selectRoutine loppuu

    // Käsittelee tason valinnan (Ennallaan V12)
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
        if (currentWorkoutInfo.week !== null && activeRoutineType === 'workout') handleWeekSelect(currentWorkoutInfo.week);
        else updateInfoAreaNotes(); // Päivitä info jos treeni olisi valittu
    } // handleLevelSelect loppuu

    // Käsittelee viikon valinnan (Treenin valinta)
    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout';
        selectedRoutineData = null; // **MUUTOS V14: Nollaa mahdollinen aiempi lämm./jäähd. valinta**
        resetAppState(false); // Resetoi ajastin, säilytä taso

        // ... (Loppuosa funktiosta ennallaan V12, varmistukset ja datan haku treenille) ...
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) { console.error("Workout data missing."); resetAppState(true); return; }
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) { console.error(`Workout phase not found for week ${weekNumber}.`); resetAppState(true); itemNameH2.textContent = `Vaihetta ei löytynyt viikolle ${weekNumber}.`; return; }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx]; const level = currentWorkoutInfo.level; const levelData = phase.levels?.[level];
        if (!levelData?.timeBased) { console.error(`Workout level data (timeBased) not found for phase ${phaseIdx + 1}, level ${level}.`); resetAppState(true); itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt viikolle ${weekNumber}.`; return; }
        const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds; let exerciseListSource = [];
        if (phaseIdx === 2 && phase.exampleWeeklyExercises) exerciseListSource = phase.exampleWeeklyExercises; else if (phase.weeklyExercises) exerciseListSource = phase.weeklyExercises;
        else { console.error(`No 'weeklyExercises' or 'exampleWeeklyExercises' found in phase ${phaseIdx + 1}.`); resetAppState(true); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return; }
        const mappedEx = exerciseListSource.map((pEx, index) => { if (!pEx?.exerciseId) return null; const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId); if (!fEx) { console.warn(`Exercise with ID ${pEx.exerciseId} not found in main exercises list.`); return null; } return { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime, index }; }).filter(ex => ex !== null);
        if (mappedEx.length === 0) { console.error(`No valid exercises mapped for workout (Week ${weekNumber}, Level ${level}).`); resetAppState(true); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return; }

        currentWorkoutExercises = mappedEx; currentRoutineSteps = mappedEx; currentStepIndex = 0; currentRound = 1;
        currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx, rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || '' };
        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);

        // Poista active-luokka lämm/jäähd-napeista
        document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));

        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`; populateStepsList(currentRoutineSteps); updateInfoAreaNotes(); displayStep(currentStepIndex); updateButtonStates(); highlightWeekButton(weekNumber); updateRoundDisplay();
    } // handleWeekSelect loppuu

    // **MUUTOS V14: Käyttää selectedRoutineDataa jos se on asetettu**
    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) {
            noteText = customNote; // Käytä annettua tekstiä (esim. selectRoutinesta)
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            // Rakenna treenin infoteksti (kuten V12)
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            const roundsText = `Kierrokset: ${currentWorkoutInfo.rounds || 'Ei määritelty'}`;
            const roundRestText = `Kierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}${roundsText}\n${roundRestText}`;
        } else if ((activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') && selectedRoutineData) {
             // Jos lämm./jäähd. on valittu, käytä sen kuvausta
             noteText = selectedRoutineData.description || "Ei kuvausta.";
        } else {
            // Oletusteksti
            noteText = "Valitse toiminto yläpuolelta.";
        }
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta.";
    } // updateInfoAreaNotes loppuu

    // Korostaa aktiivisen viikko-napin (Ennallaan V12)
    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
        // Varmista, ettei rutiininappi ole samalla aktiivinen
        if (weekNumber !== null) {
            document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));
        }
    } // highlightWeekButton loppuu

    // Luo sivupalkkiin listan rutiinin vaiheista (Ennallaan V12)
    function populateStepsList(steps) {
        stepsListUl.innerHTML = '';
        if (!steps || steps.length === 0) { stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>'; stepsListTitleH2.textContent = "Vaiheet"; return; }
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet"; else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet"; else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset"; else stepsListTitleH2.textContent = "Vaiheet";
        steps.forEach((step, index) => { const li = document.createElement('li'); li.textContent = `${index + 1}. ${step.displayTitle || step.name || 'Nimetön vaihe'}`; li.dataset.index = index; li.classList.add('step-item'); li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToStep(index); }); stepsListUl.appendChild(li); });
    } // populateStepsList loppuu

    // Hyppää tiettyyn vaiheeseen (kun klikataan sivupalkista) (Ennallaan V12)
    function jumpToStep(index) {
        if (index >= 0 && index < currentRoutineSteps.length) { stopTimer(); stopRoutineTimer(); currentStepIndex = index; currentRound = 1; timerState = TimerState.IDLE; elapsedRoutineTime = 0; displayStep(currentStepIndex); updateButtonStates(); clearNextUpHighlight(); updateRoundDisplay(); }
    } // jumpToStep loppuu

    // Näyttää aktiivisen vaiheen tiedot päänäkymässä (Ennallaan V12 - toimii yleisesti `currentRoutineSteps` datalla)
    function displayStep(index) {
        // Tarkista indeksin validius
        if (index < 0 || !currentRoutineSteps || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.error(`Invalid step index or missing routine steps: ${index}`);
            // Älä resetoi koko sovellusta, näytä vain oletusviestit
            itemNameH2.textContent = "Valitse toiminto";
            itemDescriptionP.textContent = "Valitse ensin lämmittely, treeni tai jäähdyttely yläpalkista.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            timerLabelP.textContent = 'Odottamassa...'; timeRemainingSpan.textContent = '00:00';
            highlightCurrentStep(); // Poistaa korostuksen listasta
            updateRoundDisplay(); // Tyhjentää infon
            return;
        }

        const step = currentRoutineSteps[index]; // Hae nykyisen vaiheen data
        itemNameH2.textContent = step.displayTitle || step.name || 'Nimetön vaihe'; // Aseta otsikko

        // --- Päivitä sisältö rutiinityypin mukaan ---
        if (activeRoutineType === 'workout') {
            // Treenin näyttö (kuten V12)
            let descriptionText = step.description || '';
            if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim() || "Suorita harjoitus ohjeen mukaan.";
            if (step.image) { itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name; itemImageImg.style.display = 'block'; }
            else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
            timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { remainingTime = step.workTime || 0; updateTimerDisplay(remainingTime); timerLabelP.textContent = "Valmiina"; }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Lämmittelyn / Jäähdyttelyn näyttö (kuten V12)
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = timerState === TimerState.FINISHED ? "Valmis (Kesto)" : "Valmiina"; }
            else if (timerState === TimerState.RUNNING_STEP){ updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = 'Kulunut aika'; }
        } else { // Oletustila (ei rutiinia valittu) - Tämä on jo käsitelty funktion alussa indeksitarkistuksen yhteydessä
             return;
        }

        highlightCurrentStep(); // Korosta nykyinen vaihe sivupalkin listassa
        updateRoundDisplay(); // Päivitä round/vaihe-info AINA kun näyttö päivitetään
    } // displayStep loppuu

    // --- Info Area Collapse Toiminnot --- (Ennallaan V12)
    function initializeInfoArea() { infoContentWrapper.classList.add('collapsed'); toggleInfoBtn.setAttribute('aria-expanded', 'false'); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä"; toggleInfoBtn.addEventListener('click', toggleInfoArea); }
    function toggleInfoArea() { const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); const isExpanded = !isCollapsed; toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded)); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä"; console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`); }

    // --- Ajastimen ja Rutiinin Etenemisen toiminnot ---

    // Käynnistää valitun rutiinin (kutsutaan Start-napeista) (Ennallaan V12 - toimii yleisesti)
    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) { console.warn("Start conditions not met. Type:", activeRoutineType, "Steps:", currentRoutineSteps.length, "State:", timerState); return; }
        if (mainLayout) { const targetOffsetTop = mainLayout.offsetTop; console.log(`Scrolling to main layout top: ${targetOffsetTop}px`); window.scrollTo({ top: targetOffsetTop, behavior: 'smooth' }); }
        if (activeRoutineType === 'workout') { if (isAudioUnlocked) { proceedWithWorkoutStart(); return; } console.log("Attempting to unlock audio context..."); beepSound.volume = 0.001; beepSound.play().then(() => { beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; isAudioUnlocked = true; console.log("Audio context unlocked."); proceedWithWorkoutStart(); }).catch(error => { console.warn("Audio context unlock failed:", error); beepSound.volume = 1.0; isAudioUnlocked = true; proceedWithWorkoutStart(); }); }
        else { proceedWithRoutineStart(); } // Lämmittely/Jäähdyttely
    } // startSelectedRoutine loppuu

    // Jatkaa TREENIN aloitukseen (Ennallaan V12)
    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return; console.log("Starting WORKOUT..."); currentStepIndex = 0; currentRound = 1; selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open'); const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text'); if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; } timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
        // Varmista että aloitetaan oikeasta vaiheesta ja ajasta
        if (!currentRoutineSteps[currentStepIndex] || typeof currentRoutineSteps[currentStepIndex].workTime === 'undefined') {
            console.error("Cannot start workout: Invalid first step data.");
            resetAppState(); return;
        }
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    } // proceedWithWorkoutStart loppuu

    // Aloittaa LÄMMITTELYN tai JÄÄHDYTTELYN (Ennallaan V12)
    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return; console.log(`Starting ${activeRoutineType.toUpperCase()}...`); currentStepIndex = 0; currentRound = 1; elapsedRoutineTime = 0; displayStep(currentStepIndex); // Näyttää ekan vaiheen
        selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open'); const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text'); if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }
        timerState = TimerState.RUNNING_STEP; timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active'); timerLabelP.textContent = "Kulunut aika"; startRoutineTimer(); updateButtonStates(); // Päivitä napit (Stop, Next Step näkyviin)
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // proceedWithRoutineStart loppuu

    // Käsittelee Tauko/Jatka -napin klikkauksen (vain treenille) (Ennallaan V12)
    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Workout Paused"); pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused'); timerDiv.classList.add('timer-paused'); }
        else if (timerState === TimerState.PAUSED) { console.log("Workout Resumed"); timerState = pausedState || TimerState.RUNNING_EXERCISE; pausedState = null; runTimerInterval(); pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused'); timerDiv.classList.remove('timer-paused'); if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){ timerDiv.classList.add('timer-resting'); highlightNextStep(); } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); } }
        updateButtonStates(); updateRoundDisplay();
    } // pauseResumeTimer loppuu

    // Käsittelee Lopeta-napin klikkauksen (Ennallaan V12)
    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`); const previouslyActiveType = activeRoutineType; stopTimer(); stopRoutineTimer(); clearNextUpHighlight(); timerState = TimerState.IDLE; elapsedRoutineTime = 0;
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) { displayStep(currentStepIndex); // Näyttää pysäytyskohdan
             if (previouslyActiveType === 'workout') { // Jos pysäytettiin treeni, näytä sen työaika ajastimessa
                 updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
                 timerLabelP.textContent = "Valmiina";
             } else { // Jos lämm/jäähd, näytä 00:00
                 updateTimerDisplay(0);
                 timerLabelP.textContent = "Valmiina";
             }
        } else { resetAppState(); return; } // Jos jotain outoa, resetoi kokonaan
        updateButtonStates(); // Päivitä napit IDLE-tilaan
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // stopActiveRoutine loppuu

    // Käsittelee Seuraava Vaihe / Valmis -napin klikkauksen (lämmittely/jäähdyttely) (Ennallaan V12)
    function handleNextStep() {
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return; if (timerState !== TimerState.RUNNING_STEP) return; currentStepIndex++;
         if (currentStepIndex >= currentRoutineSteps.length) finishRoutine(); // Rutiini valmis
         else { displayStep(currentStepIndex); highlightCurrentStep(); } // Näytä seuraava vaihe
         updateButtonStates(); // Päivitä napin teksti
    } // handleNextStep loppuu

    // Suoritetaan kun rutiini päättyy (Ennallaan V12)
    function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`); const finishedType = activeRoutineType; stopTimer(); stopRoutineTimer(); timerState = TimerState.FINISHED; clearNextUpHighlight();
         let routineName = ""; // Hae rutiinin nimi näytettäväksi
         if (finishedType === 'workout') { routineName = `Viikko ${currentWorkoutInfo.week} Treeni`; }
         else if (selectedRoutineData) { routineName = selectedRoutineData.name; }
         else { routineName = finishedType.charAt(0).toUpperCase() + finishedType.slice(1); } // Oletus jos nimi puuttuu

         itemNameH2.textContent = `${routineName} Valmis!`; itemDescriptionP.textContent = "Hyvää työtä!"; itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
         updateTimerDisplay(finishedType === 'workout' ? 0 : elapsedRoutineTime); timerLabelP.textContent = finishedType === 'workout' ? "Valmis" : "Valmis (Kesto)";
         updateRoundDisplay(); updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         if (isAudioUnlocked && finishedType === 'workout') playSound(beepSound);
         updateButtonStates();
         // Nollataan kulunut aika vasta kun uusi rutiini aloitetaan tai hypätään vaiheeseen
         // elapsedRoutineTime = 0; // Siirretty resetAppState, jumpToStep ja proceedWithRoutineStart
     } // finishRoutine loppuu

    // --- Ajastimen sisäiset toiminnot --- (Ennallaan V12)
    function stopTimer() { stopTimerInterval(); pausedState = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); console.log("Treeni ajastin pysäytetty."); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); stopRoutineTimer(); timerState = phaseState; remainingTime = duration; timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active'); clearNextUpHighlight();
        if (phaseState === TimerState.RUNNING_EXERCISE) { if (currentStepIndex < currentRoutineSteps.length) displayStep(currentStepIndex); else { console.error("Error starting exercise phase: index out of bounds."); resetAppState(); return; } highlightCurrentStep(); }
        else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) { timerDiv.classList.add('timer-resting'); const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1; if (nextIdx < currentRoutineSteps.length) { displayStep(nextIdx); highlightNextStep(nextIdx); } else { if (currentStepIndex < currentRoutineSteps.length) { displayStep(currentStepIndex); highlightCurrentStep(); } else { console.error("Error starting rest phase: index out of bounds."); resetAppState(); return; } } }
        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`); updateTimerDisplay(remainingTime); updateButtonStates(); // updateRoundDisplay kutsutaan displayStepin kautta
        if (remainingTime >= 0) runTimerInterval(); else handleTimerEnd(); // Aloita ajastin jos kesto > 0, muuten siirry heti loppuun
    }
    function runTimerInterval() {
        if (timerInterval) return; timerInterval = setInterval(() => { if (timerState === TimerState.PAUSED) return; remainingTime--; const isWork = timerState === TimerState.RUNNING_EXERCISE; const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const checkTime = remainingTime + 1; if(isAudioUnlocked){ if (isWork) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) playSound(beepSound); } else if (isRest) { if (checkTime >= 1 && checkTime <= 3) playSound(beepSound); } } updateTimerDisplay(remainingTime); if (remainingTime < 0) handleTimerEnd(); }, 1000);
    }
    function handleTimerEnd() {
        stopTimerInterval(); timerDiv.classList.remove('timer-resting'); if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return; const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        if (timerState === TimerState.RUNNING_EXERCISE) { if (currentStepIndex >= currentRoutineSteps.length) { console.error("Error in handleTimerEnd (exercise): index out of bounds."); resetAppState(); return; } const currentEx = currentRoutineSteps[currentStepIndex]; if (!currentEx) { console.error("Error in handleTimerEnd (exercise): current step data missing."); resetAppState(); return; } const isLastEx = currentStepIndex === currentRoutineSteps.length - 1; const isLastR = currentRound >= currentWorkoutInfo.rounds; const restDur = currentEx.restTime ?? 0; if (isLastEx) { if (isLastR) moveToNextPhase(); else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); else moveToNextPhase(); } } else { if (restDur > 0) startTimerForPhase(TimerState.RUNNING_REST, restDur); else moveToNextPhase(); } }
        else if (wasResting) { clearNextUpHighlight(); moveToNextPhase(); }
    }
    function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST; if (comingFromRoundRest) { currentRound++; currentStepIndex = 0; } else if (comingFromRest) { currentStepIndex++; } else { const isLastEx = currentStepIndex === currentRoutineSteps.length - 1; const isLastR = currentRound >= currentWorkoutInfo.rounds; if(isLastEx && !isLastR) { currentRound++; currentStepIndex = 0; } else if (!isLastEx) { currentStepIndex++; } }
        if (currentRound > currentWorkoutInfo.rounds) finishRoutine(); else if (currentStepIndex < currentRoutineSteps.length) { const nextEx = currentRoutineSteps[currentStepIndex]; if (!nextEx || typeof nextEx.workTime === 'undefined') { console.error("Error in moveToNextPhase: next step data invalid."); resetAppState(); return; } startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime); } else { console.error("State mismatch error during workout progression."); resetAppState(); }
    }

    // --- RUTIINIAJASTIMEN FUNKTIOT --- (Ennallaan V12)
    function startRoutineTimer() {
        stopRoutineTimer(); if(timerState !== TimerState.RUNNING_STEP) return; updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = "Kulunut aika"; routineTimerInterval = setInterval(() => { if (timerState !== TimerState.RUNNING_STEP) { stopRoutineTimer(); return; } elapsedRoutineTime++; updateTimerDisplay(elapsedRoutineTime); }, 1000); console.log("Routine timer started.");
    }
    function stopRoutineTimer() {
        if (routineTimerInterval) { clearInterval(routineTimerInterval); routineTimerInterval = null; console.log("Routine timer stopped."); }
    }

    // Päivittää ajastimen näyttämän ajan (MM:SS) (Ennallaan V12, label-logiikka siirretty muualle)
    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds); const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0"); const seconds = (displayTime % 60).toString().padStart(2, "0"); timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        // Labelit asetetaan nyt pääosin: displayStep, proceedWithRoutineStart, startTimerForPhase, finishRoutine, stopActiveRoutine
         if (timerState === TimerState.IDLE && activeRoutineType === 'none') {
             timerLabelP.textContent = 'Odottamassa...';
         }
    } // updateTimerDisplay loppuu

    // Päivittää kierrosinformaation TAI lämmittelyn/jäähdyttelyn vaiheen numeron (Ennallaan V12)
    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') { if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) { if (timerState === TimerState.IDLE) roundInfoP.textContent = `Kierrokset: ${currentWorkoutInfo.rounds}`; else roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`; } else roundInfoP.textContent = ''; }
        else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') { if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) { const totalSteps = currentRoutineSteps.length; const currentStepNumber = currentStepIndex + 1; roundInfoP.textContent = `Vaihe ${currentStepNumber} / ${totalSteps}`; } else roundInfoP.textContent = ''; }
        else roundInfoP.textContent = '';
    } // updateRoundDisplay loppuu

    // Navigoi edelliseen vaiheeseen (IDLE/FINISHED) (Ennallaan V12)
    function prevStep() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) { if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1); } }
    // Navigoi seuraavaan vaiheeseen (IDLE/FINISHED) (Ennallaan V12)
    function nextStepNav() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) { if (currentStepIndex < currentRoutineSteps.length - 1) jumpToStep(currentStepIndex + 1); } }

    // **MUUTOS V14: Päivitetty Start-nappien logiikkaa**
    function updateButtonStates() {
        // Piilota kontrollit ja start-napit oletuksena
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';

        // Tarkista onko jokin rutiini valittu (vaiheita ladattu) ja ollaanko IDLE-tilassa
        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;

        // --- Näytä oikea Start-nappi ---
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block';
                // Nappi on päällä, jos selectedRoutineData on olemassa (eli valinta onnistui)
                startWarmupBtn.disabled = !selectedRoutineData;
                 // Päivitä napin teksti näyttämään valitun rutiinin nimi
                 if (selectedRoutineData) {
                     // Lyhennetään tekstiä tarvittaessa, ettei nappi veny liikaa
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startWarmupBtn.textContent = `Aloita: ${name}`;
                 } else {
                     startWarmupBtn.textContent = 'Aloita Lämmittely'; // Oletus
                 }
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block';
                // Nappi päällä jos viikko on valittu (tarkoittaa että treeni on ladattu)
                startWorkoutBtn.disabled = currentWorkoutInfo.week === null;
                startWorkoutBtn.textContent = 'Aloita Treeni'; // Treenin teksti vakio
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block';
                // Nappi päällä, jos selectedRoutineData on olemassa
                startCooldownBtn.disabled = !selectedRoutineData;
                 // Päivitä napin teksti
                 if (selectedRoutineData) {
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startCooldownBtn.textContent = `Aloita: ${name}`;
                 } else {
                     startCooldownBtn.textContent = 'Aloita Jäähdyttely'; // Oletus
                 }
            }
        }

        // --- Prev/Next navigointinapit (IDLE/FINISHED tilassa) ---
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;

        // --- Aktiivisen rutiinin kontrollit ---
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Treeni käynnissä -> Näytä Pause ja Stop
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            // Lämmittely/Jäähdyttely käynnissä -> Näytä Stop ja Next Step
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block';
            stopBtn.disabled = false; nextStepBtn.disabled = false;
            if (currentStepIndex === currentRoutineSteps.length - 1) nextStepBtn.textContent = "Valmis ✅"; else nextStepBtn.textContent = "Seuraava Vaihe ⏭";
        } else if (timerState === TimerState.PAUSED) {
            // Treeni pausella -> Näytä Resume (Jatka) ja Stop
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
        // IDLE tai FINISHED: Kontrollit piilossa (hoidettu yllä oletuksilla)

    } // updateButtonStates loppuu

    // **MUUTOS V14: Nollaa myös selectedRoutineData**
    function resetAppState(resetSelections = true) {
        stopTimerInterval(); stopRoutineTimer();
        selectedRoutineData = null; // **Nollaa valittu rutiini**
        currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1; remainingTime = 0; elapsedRoutineTime = 0;
        timerState = TimerState.IDLE; pausedState = null;
        // Äänilukkoa ei välttämättä nollata, jotta käyttäjän ei tarvitse klikkailla uudelleen?
        // isAudioUnlocked = false; // Kommentoitu pois, jos halutaan säilyttää lupa

        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: resetSelections ? '2' : savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' }; // Palauta taso oletukseen vain jos resetSelections=true

        // Päivitä UI oletustilaan
        itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = "Valitse toiminto yläpuolelta."; infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes(); itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>'; stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0); timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active');
        timerDiv.style.visibility = 'hidden'; highlightCurrentStep(); clearNextUpHighlight(); updateRoundDisplay();

         if (resetSelections) {
             activeRoutineType = 'none'; // Nollaa valittu rutiinityyppi
             currentWorkoutInfo.week = null; // Nollaa valittu viikko

             // Piilota start-napit (koska mitään ei ole valittu)
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';

             // Poista aktiivisuus KAIKILTA valintanapeilta
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             // Aseta taso 2 aktiiviseksi
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === '2'); });

             // Sulje valikko ja info-alue, jos ne olivat auki
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea();
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        } else {
             // Jos ei resetoida valintoja (resetSelections = false), säilytetään aktiivisen tason korostus
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level);
             });
             // Tyhjennetään silti vanhat rutiinin/viikon korostukset, koska ajastin resetoidaan
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
         }

        updateButtonStates(); // Päivitä nappien tila lopuksi vastaamaan resetoitua tilaa
        console.log("App state reset.", resetSelections ? "(Full reset)" : "(Timer/Routine reset)");
    } // resetAppState loppuu

    // Korostaa aktiivisen vaiheen sivupalkin listassa (Ennallaan V12)
    function highlightCurrentStep() { const items = stepsListUl.querySelectorAll('li.step-item'); items.forEach((item) => { const idx = parseInt(item.dataset.index, 10); if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex && (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_STEP || timerState === TimerState.IDLE || timerState === TimerState.FINISHED || timerState === TimerState.PAUSED)) { item.classList.add('active'); if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } else item.classList.remove('active'); }); if (currentRoutineSteps.length === 0) stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active')); }
    // Korostaa seuraavan vaiheen listassa (levon aikana) (Ennallaan V12)
    function highlightNextStep(forceIndex = -1) { clearNextUpHighlight(); let nextIdx = -1; if (forceIndex !== -1) nextIdx = forceIndex; else if (timerState === TimerState.RUNNING_REST) nextIdx = currentStepIndex + 1; if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) { const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`); if (nextItem) nextItem.classList.add('next-up'); } }
    // Poistaa seuraavan vaiheen korostuksen (Ennallaan V12)
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }
    // CSS hoitaa skrollauksen lukituksen (Ennallaan V12)
    function addBodyLock() { /* CSS hoitaa */ } function removeBodyLock() { /* CSS hoitaa */ }
    // Näyttää/piilottaa yläosan valinta-alueen (Ennallaan V12)
    function toggleTrainingSelectionVisibility() { const hidden = selectionArea.classList.toggle('hidden'); toggleSelectionAreaBtn.classList.toggle('open', !hidden); const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text'); if (toggleTextElem) toggleTextElem.textContent = hidden ? "Valinnat" : "Piilota valinnat"; } // Päivitetty teksti

    // --- Tapahtumankuuntelijoiden asetus --- (Ennallaan V12)
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    startWarmupBtn.addEventListener('click', startSelectedRoutine); startWorkoutBtn.addEventListener('click', startSelectedRoutine); startCooldownBtn.addEventListener('click', startSelectedRoutine);
    pauseResumeBtn.addEventListener('click', pauseResumeTimer); stopBtn.addEventListener('click', stopActiveRoutine); nextStepBtn.addEventListener('click', handleNextStep);
    prevBtn.addEventListener('click', prevStep); nextBtn.addEventListener('click', nextStepNav);
    // toggleInfoBtn kuuntelija lisätään initializeInfoArea:ssa

    // --- Sovelluksen käynnistys ---
    loadAppData(); // Ladataan data ja alustetaan sovellus

}); // DOMContentLoaded loppuu
