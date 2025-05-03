// app.js (Versio Yhdistetty: V12 + V14 monivalinta lämm./jäähd.) - TARKISTETTU UUDELLEEN

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
    // let warmupData = null; // POISTETTU
    // let cooldownData = null; // POISTETTU
    let currentWorkoutExercises = []; // Nykyisen valitun TREENIN harjoitukset
    let currentRoutineSteps = []; // Nykyisen aktiivisen rutiinin (lämm., treeni, jää.) vaiheet/harjoitukset
    let currentStepIndex = 0; // Nykyisen vaiheen indeksi currentRoutineSteps-listassa
    let activeRoutineType = 'none'; // 'none', 'warmup', 'workout', 'cooldown'
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
    const TimerState = { // Ajastimen eri tilat
        IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest',
        RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished',
        RUNNING_STEP: 'running_step'
    };
    let timerState = TimerState.IDLE; // Ajastimen nykyinen tila
    let pausedState = null; // Tila, johon palataan paussilta
    let isAudioUnlocked = false; // Onko äänet sallittu

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            // Tarkista datan rakenne
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !Array.isArray(fullProgramData.warmups) || !Array.isArray(fullProgramData.cooldowns) || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect (missing warmups/cooldowns arrays or other key parts?).");
                itemNameH2.textContent = "Virheellinen ohjelmadata."; return;
            }

            // Tallenna listat
            allWarmups = fullProgramData.warmups;
            allCooldowns = fullProgramData.cooldowns;

            // Alusta UI
            populateWarmupSelector();
            populateCooldownSelector();
            populateWeekSelectors();
            addLevelButtonListeners();
            initializeInfoArea();
            resetAppState(); // Aseta alkutila
        } catch (error) {
            console.error("Could not load or process program data:", error);
            itemNameH2.textContent = "Virhe ladattaessa ohjelmaa.";
            resetAppState(); // Yritä resetoida turvalliseen tilaan
        }
    } // loadAppData loppuu

    // --- UI Populointi ja Kuuntelijat ---

    // Luo napit kaikille lämmittelyille listasta
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = '';
        if (allWarmups && allWarmups.length > 0) {
            allWarmups.forEach(warmup => {
                if (!warmup || !warmup.id || !warmup.name) { console.warn("Skipping invalid warmup item:", warmup); return; }
                const button = document.createElement('button');
                button.textContent = `${warmup.name}${warmup.durationMinutes ? ` (${warmup.durationMinutes} min)` : ''}`;
                button.classList.add('routine-button');
                button.dataset.routineType = 'warmup';
                button.dataset.routineId = warmup.id;
                button.addEventListener('click', () => selectRoutine('warmup', warmup.id));
                warmupButtonsContainer.appendChild(button);
            });
            startWarmupBtn.disabled = true;
            startWarmupBtn.style.display = 'none';
        } else {
            warmupButtonsContainer.innerHTML = '<p>Lämmittelytietoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true;
            startWarmupBtn.style.display = 'none';
        }
    } // populateWarmupSelector loppuu

    // Luo napit kaikille jäähdyttelyille listasta
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = '';
        if (allCooldowns && allCooldowns.length > 0) {
            allCooldowns.forEach(cooldown => {
                 if (!cooldown || !cooldown.id || !cooldown.name) { console.warn("Skipping invalid cooldown item:", cooldown); return; }
                const button = document.createElement('button');
                button.textContent = `${cooldown.name}${cooldown.durationMinutes ? ` (${cooldown.durationMinutes} min)` : ''}`;
                button.classList.add('routine-button');
                button.dataset.routineType = 'cooldown';
                button.dataset.routineId = cooldown.id;
                button.addEventListener('click', () => selectRoutine('cooldown', cooldown.id));
                cooldownButtonsContainer.appendChild(button);
            });
            startCooldownBtn.disabled = true;
            startCooldownBtn.style.display = 'none';
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelytietoja ei löytynyt.</p>';
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

    // Lisää kuuntelijat Taso-napeille
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    } // addLevelButtonListeners loppuu

    // Käsittelee lämm./jäähd. valinnan ID:n perusteella
    function selectRoutine(routineType, routineId) {
        console.log(`Routine selected: Type=${routineType}, ID=${routineId}`);
        activeRoutineType = routineType;
        resetAppState(false); // Resetoi ajastin, säilytä taso
        currentRoutineSteps = [];
        selectedRoutineData = null;

        let routineList = [];
        if (routineType === 'warmup') routineList = allWarmups;
        else if (routineType === 'cooldown') routineList = allCooldowns;
        else { console.warn("selectRoutine called with invalid type:", routineType); updateButtonStates(); return; }

        selectedRoutineData = routineList.find(routine => routine.id === routineId);

        // Poista aktiivisuus kaikilta valintanapeilta ensin
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));

        if (selectedRoutineData && selectedRoutineData.steps) { // Tarkista myös vaiheiden olemassaolo
            // Päivitä UI
            infoAreaTitleH2.textContent = `${selectedRoutineData.name}${selectedRoutineData.durationMinutes ? ` (${selectedRoutineData.durationMinutes} min)` : ''}`;
            updateInfoAreaNotes(selectedRoutineData.description || "Ei kuvausta.");
            currentRoutineSteps = selectedRoutineData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps);
            displayStep(0); // Näytä eka vaihe

            // Korosta klikattu nappi
            const selectedBtn = document.querySelector(`.routine-button[data-routine-id="${routineId}"][data-routine-type="${routineType}"]`);
            if (selectedBtn) selectedBtn.classList.add('active');
        } else {
            // Virhetilanne
            console.error(`Routine with ID ${routineId} and type ${routineType} not found or has no steps!`);
            infoAreaTitleH2.textContent = "Virhe";
            updateInfoAreaNotes("Valittua rutiinia ei löytynyt tai se on virheellinen.");
            populateStepsList([]);
            displayStep(-1); // Näytä oletus/virhe
        }

        updateButtonStates();
        updateRoundDisplay();
    } // selectRoutine loppuu

    // Käsittelee tason valinnan
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
        if (currentWorkoutInfo.week !== null && activeRoutineType === 'workout') handleWeekSelect(currentWorkoutInfo.week);
        else updateInfoAreaNotes();
    } // handleLevelSelect loppuu

    // Käsittelee viikon valinnan (Treenin valinta)
    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout';
        selectedRoutineData = null; // Nollaa lämm./jäähd. valinta
        resetAppState(false); // Resetoi ajastin, säilytä taso

        // Treenidatan haku ja käsittely (kuten V12)
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

        // Päivitä tila treenille
        currentWorkoutExercises = mappedEx; currentRoutineSteps = mappedEx; currentStepIndex = 0; currentRound = 1;
        currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx, rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || '' };
        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);

        // Poista aktiivisuus rutiininapeista
        document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));

        // Päivitä UI
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`; populateStepsList(currentRoutineSteps); updateInfoAreaNotes(); displayStep(currentStepIndex); updateButtonStates(); highlightWeekButton(weekNumber); updateRoundDisplay();
    } // handleWeekSelect loppuu

    // Päivittää sivupalkin Info-alueen muistiinpanot
    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) {
            noteText = customNote; // Käytä annettua tekstiä
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            // Rakenna treenin info
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            const roundsText = `Kierrokset: ${currentWorkoutInfo.rounds || '?'}`;
            const roundRestText = `Kierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}${roundsText}\n${roundRestText}`;
        } else if ((activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') && selectedRoutineData) {
             // Käytä valitun lämm./jäähd. kuvausta
             noteText = selectedRoutineData.description || "Ei kuvausta.";
        } else {
            // Oletus
            noteText = "Valitse toiminto yläpuolelta.";
        }
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta.";
    } // updateInfoAreaNotes loppuu

    // Korostaa aktiivisen viikko-napin
    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
        // Varmista ettei rutiininappi ole aktiivinen
        if (weekNumber !== null) {
            document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));
        }
    } // highlightWeekButton loppuu

    // Luo sivupalkkiin listan rutiinin vaiheista
    function populateStepsList(steps) {
        stepsListUl.innerHTML = '';
        if (!steps || steps.length === 0) { stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>'; stepsListTitleH2.textContent = "Vaiheet"; return; }
        // Päivitä otsikko tyypin mukaan
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";
        // Luo listaelementit
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name || 'Nimetön vaihe'}`;
            li.dataset.index = index;
            li.classList.add('step-item');
            li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToStep(index); });
            stepsListUl.appendChild(li);
        });
    } // populateStepsList loppuu

    // Hyppää tiettyyn vaiheeseen
    function jumpToStep(index) {
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer(); stopRoutineTimer(); // Pysäytä ajastimet
            currentStepIndex = index;
            currentRound = 1; // Nollaa kierros
            timerState = TimerState.IDLE;
            elapsedRoutineTime = 0; // Nollaa kulunut aika
            displayStep(currentStepIndex); // Näytä vaihe
            updateButtonStates(); // Päivitä napit
            clearNextUpHighlight(); // Poista korostus
            updateRoundDisplay(); // Päivitä info
        }
    } // jumpToStep loppuu

    // Näyttää aktiivisen vaiheen tiedot päänäkymässä
    function displayStep(index) {
        // Indeksitarkistus ja oletusnäkymä virhetilanteessa
        if (index < 0 || !currentRoutineSteps || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.warn(`Display Step: Invalid index ${index} or missing steps.`);
            itemNameH2.textContent = "Valitse toiminto";
            itemDescriptionP.textContent = "Valitse ensin lämmittely, treeni tai jäähdyttely yläpalkista.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            timerLabelP.textContent = 'Odottamassa...'; timeRemainingSpan.textContent = '00:00';
            highlightCurrentStep(); updateRoundDisplay();
            return;
        }

        const step = currentRoutineSteps[index];
        itemNameH2.textContent = step.displayTitle || step.name || 'Nimetön vaihe';

        // Päivitä sisältö tyypin mukaan
        if (activeRoutineType === 'workout') {
            // Treenin näyttö
            let descriptionText = step.description || '';
            if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim() || "Suorita harjoitus ohjeen mukaan.";
            if (step.image) { itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name; itemImageImg.style.display = 'block'; }
            else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
            timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
            // Aseta ajastin näyttämään työaika IDLE/FINISHED tilassa
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                remainingTime = step.workTime || 0;
                updateTimerDisplay(remainingTime);
                timerLabelP.textContent = "Valmiina";
            }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Lämm./Jäähd. näyttö
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
            // Aseta ajastin näyttämään kulunut aika
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                updateTimerDisplay(elapsedRoutineTime); // Näyttää 0 tai loppuajan
                timerLabelP.textContent = timerState === TimerState.FINISHED ? "Valmis (Kesto)" : "Valmiina";
            } else if (timerState === TimerState.RUNNING_STEP){
                updateTimerDisplay(elapsedRoutineTime); // Näyttää kertyneen ajan
                timerLabelP.textContent = 'Kulunut aika';
            }
        } else { return; } // Oletustila käsitelty jo alussa

        highlightCurrentStep(); // Korosta listassa
        updateRoundDisplay(); // Päivitä info
    } // displayStep loppuu

    // --- Info Area Collapse ---
    function initializeInfoArea() { infoContentWrapper.classList.add('collapsed'); toggleInfoBtn.setAttribute('aria-expanded', 'false'); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä"; toggleInfoBtn.addEventListener('click', toggleInfoArea); }
    function toggleInfoArea() { const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); const isExpanded = !isCollapsed; toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded)); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä"; console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`); }

    // --- Ajastimen ja Rutiinin Eteneminen ---

    // Käynnistää valitun rutiinin
    function startSelectedRoutine() {
        // Tarkista ehdot
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
            console.warn("Start conditions not met. Type:", activeRoutineType, "Steps:", currentRoutineSteps.length, "State:", timerState); return;
        }
        // Skrollaa näkymään
        if (mainLayout) { window.scrollTo({ top: mainLayout.offsetTop, behavior: 'smooth' }); }
        // Avaa äänikonteksti treenille
        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            console.log("Attempting to unlock audio context...");
            beepSound.volume = 0.001; // Hiljainen testisoitto
            beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true; console.log("Audio context unlocked.");
                proceedWithWorkoutStart();
            }).catch(error => {
                console.warn("Audio context unlock failed (maybe browser policy):", error);
                beepSound.volume = 1.0; // Palauta volyymi
                isAudioUnlocked = true; // Merkitään yritetyksi
                proceedWithWorkoutStart(); // Jatka silti
            });
        } else { // Lämm./Jäähd.
            proceedWithRoutineStart();
        }
    } // startSelectedRoutine loppuu

    // Jatkaa TREENIN aloitukseen
    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting WORKOUT...");
        currentStepIndex = 0; currentRound = 1;
        // Piilota valikko
        selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }
        // Aseta ajastin näkyviin
        timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
        // Varmista ekan vaiheen data ja aloita ajastin
        if (!currentRoutineSteps[currentStepIndex] || typeof currentRoutineSteps[currentStepIndex].workTime === 'undefined') {
            console.error("Cannot start workout: Invalid first step data."); resetAppState(); return;
        }
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
        // updateButtonStates kutsutaan startTimerForPhasessa
    } // proceedWithWorkoutStart loppuu

    // Aloittaa LÄMMITTELYN tai JÄÄHDYTTELYN
    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`);
        currentStepIndex = 0; currentRound = 1; elapsedRoutineTime = 0; // Nollaa kulunut aika
        displayStep(currentStepIndex); // Näytä eka vaihe
        // Piilota valikko
        selectionArea.classList.add('hidden'); toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }
        // Aseta tila ja ajastin
        timerState = TimerState.RUNNING_STEP;
        timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
        timerLabelP.textContent = "Kulunut aika";
        startRoutineTimer(); // Käynnistä kuluneen ajan laskuri
        updateButtonStates(); // Päivitä napit
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // proceedWithRoutineStart loppuu

    // Käsittelee Tauko/Jatka (vain treenille)
    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // -> Pause
            pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED;
            console.log("Workout Paused");
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused'); timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
            // -> Resume
            console.log("Workout Resumed");
            timerState = pausedState || TimerState.RUNNING_EXERCISE; pausedState = null; runTimerInterval();
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused'); timerDiv.classList.remove('timer-paused');
            // Palauta lepotyyli jos jatketaan levosta
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                timerDiv.classList.add('timer-resting'); highlightNextStep();
            } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); }
        }
        updateButtonStates(); updateRoundDisplay();
    } // pauseResumeTimer loppuu

    // Käsittelee Lopeta-napin
    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`);
        const previouslyActiveType = activeRoutineType;
        stopTimer(); stopRoutineTimer(); // Pysäytä molemmat ajastimet
        clearNextUpHighlight();
        timerState = TimerState.IDLE;
        elapsedRoutineTime = 0; // Nollaa kulunut aika

        // Näytä nykyinen vaihe IDLE-tilassa
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
            displayStep(currentStepIndex); // Näyttää pysäytyskohdan
             // Päivitä ajastimen näyttö ja label IDLE-tilaan
             if (previouslyActiveType === 'workout') {
                 updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
             } else {
                 updateTimerDisplay(0); // Lämm/jäähd näyttää 0
             }
             timerLabelP.textContent = "Valmiina";
        } else {
            resetAppState(); // Jos ei vaiheita, resetoi kokonaan
            return;
        }
        updateButtonStates(); // Päivitä napit
        // updateRoundDisplay kutsuttiin displayStep:ssä
    } // stopActiveRoutine loppuu

    // Käsittelee Seuraava Vaihe / Valmis (lämm./jäähd.)
    function handleNextStep() {
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
         if (timerState !== TimerState.RUNNING_STEP) return;
         currentStepIndex++;
         if (currentStepIndex >= currentRoutineSteps.length) {
             finishRoutine(); // Rutiini valmis
         } else {
             displayStep(currentStepIndex); // Näytä seuraava
             highlightCurrentStep(); // Korosta listasta
         }
         updateButtonStates(); // Päivitä napin teksti ("Valmis")
    } // handleNextStep loppuu

    // Suoritetaan kun rutiini päättyy
    function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`);
         const finishedType = activeRoutineType;
         stopTimer(); stopRoutineTimer(); // Pysäytä ajastimet
         timerState = TimerState.FINISHED;
         clearNextUpHighlight();

         // Hae rutiinin nimi
         let routineName = "";
         if (finishedType === 'workout') { routineName = `Viikko ${currentWorkoutInfo.week} Treeni`; }
         else if (selectedRoutineData) { routineName = selectedRoutineData.name; }
         else { routineName = finishedType.charAt(0).toUpperCase() + finishedType.slice(1); }

         // Päivitä UI
         itemNameH2.textContent = `${routineName} Valmis!`;
         itemDescriptionP.textContent = "Hyvää työtä!";
         itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
         // Päivitä ajastin (treeni 0, muut kulunut aika)
         updateTimerDisplay(finishedType === 'workout' ? 0 : elapsedRoutineTime);
         timerLabelP.textContent = finishedType === 'workout' ? "Valmis" : "Valmis (Kesto)";
         updateRoundDisplay(); // Tyhjentää infon
         updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);

         // Ääni treenin lopussa
         if (isAudioUnlocked && finishedType === 'workout') {
             playSound(beepSound);
         }
         updateButtonStates(); // Päivitä napit (salli Prev/Next)
         // elapsedRoutineTime nollataan vasta uuden alussa
     } // finishRoutine loppuu

    // --- Ajastimen sisäiset toiminnot ---

    // Pysäyttää TREENIN ajastimen intervallin
    function stopTimer() {
        stopTimerInterval();
        pausedState = null;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        // console.log("Treeni ajastin pysäytetty."); // Vähemmän logitusta
    } // stopTimer loppuu

    // Pysäyttää TREENIN setInterval
    function stopTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    } // stopTimerInterval loppuu

    // Käynnistää TREENIN ajastimen tietylle vaiheelle
    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); stopRoutineTimer(); // Varmista että molemmat pois
        timerState = phaseState;
        remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active'); // Nollaa tyylit
        clearNextUpHighlight();

        // Päivitä näyttö ja korostus sen mukaan, alkaako työ vai lepo
        if (phaseState === TimerState.RUNNING_EXERCISE) {
             if (currentStepIndex < currentRoutineSteps.length) {
                 displayStep(currentStepIndex); // Näyttää nykyisen
             } else { console.error("Error starting exercise phase: index out of bounds."); resetAppState(); return; }
             highlightCurrentStep(); // Korosta nykyinen
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            timerDiv.classList.add('timer-resting'); // Lisää lepotyyli
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1; // Määritä seuraava
            if (nextIdx < currentRoutineSteps.length) {
                displayStep(nextIdx); // Näytä seuraavan tiedot
                highlightNextStep(nextIdx); // Korosta seuraava
            } else { // Vikasta harjoituksesta mennään kierroslepoon/loppuun
                if (currentStepIndex < currentRoutineSteps.length) {
                    displayStep(currentStepIndex); // Näytä viimeisen tiedot
                    highlightCurrentStep(); // Korosta viimeinen
                } else { console.error("Error starting rest phase: index out of bounds."); resetAppState(); return; }
            }
        }

        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime); // Päivitä ajastin
        updateButtonStates(); // Päivitä kontrollinapit
        // updateRoundDisplay kutsuttiin displayStep:ssä

        // Käynnistä sekuntikello vain jos kesto > 0 (0s lepo toimii)
        if (remainingTime > 0) {
             runTimerInterval();
        } else {
             handleTimerEnd(); // Jos kesto 0, siirry heti loppuun
        }
    } // startTimerForPhase loppuu

    // TREENIN sekuntikellon intervalli
    function runTimerInterval() {
        if (timerInterval) return; // Estä tuplaintervallit
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Älä tee mitään pausella

            remainingTime--;
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1; // Aika ennen vähennystä

            // Äänimerkit
            if(isAudioUnlocked){
                if (isWork && (checkTime === 10 || (checkTime >= 1 && checkTime <= 5))) { playSound(beepSound); }
                else if (isRest && (checkTime >= 1 && checkTime <= 3)) { playSound(beepSound); }
            }

            updateTimerDisplay(remainingTime); // Päivitä näyttö

            if (remainingTime < 0) { // Aika loppui
                handleTimerEnd();
            }
        }, 1000); // Joka sekunti
    } // runTimerInterval loppuu

    // Käsittelee TREENIN ajastimen päättymisen
    function handleTimerEnd() {
        stopTimerInterval();
        timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;

        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

        if (timerState === TimerState.RUNNING_EXERCISE) { // Työaika päättyi
            // Tarkistukset
            if (currentStepIndex >= currentRoutineSteps.length) { console.error("Error handleTimerEnd(Ex): index out."); resetAppState(); return; }
            const currentEx = currentRoutineSteps[currentStepIndex]; if (!currentEx) { console.error("Error handleTimerEnd(Ex): data miss."); resetAppState(); return; }

            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            const restDur = currentEx.restTime ?? 0;

            if (isLastEx) { // Kierroksen viimeinen harjoitus
                if (isLastR) { // Treenin viimeinen kierros -> Valmis
                    moveToNextPhase(); // Kutsuu finishRoutine
                } else { // Ei viimeinen kierros -> Kierroslepo tai uusi kierros
                    const roundRest = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRest > 0) { startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); }
                    else { moveToNextPhase(); } // Suoraan seuraavaan
                }
            } else { // Ei kierroksen viimeinen -> Normaali lepo tai seuraava harjoitus
                if (restDur > 0) { startTimerForPhase(TimerState.RUNNING_REST, restDur); }
                else { moveToNextPhase(); } // Suoraan seuraavaan
            }
        } else if (wasResting) { // Lepoaika päättyi
            clearNextUpHighlight();
            moveToNextPhase(); // Siirry seuraavaan työvaiheeseen
        }
    } // handleTimerEnd loppuu

    // Logiikka seuraavaan TREENIN vaiheeseen siirtymiseksi
    function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;

        // Päivitä indeksit/kierrokset
        if (comingFromRoundRest) { currentRound++; currentStepIndex = 0; } // Uusi kierros
        else if (comingFromRest) { currentStepIndex++; } // Seuraava harjoitus levon jälkeen
        else { // Tultiin suoraan työstä (0s lepo)
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { currentRound++; currentStepIndex = 0; } // Vikasta harkasta uusi kierros
            else if (!isLastEx) { currentStepIndex++; } // Seuraava harkka
            // Jos vika harkka JA vika kierros, indeksit ei muutu, alla oleva ehto hoitaa lopetuksen
        }

        // Tarkista onko treeni valmis vai jatketaanko
        if (currentRound > currentWorkoutInfo.rounds) {
            finishRoutine(); // Kaikki kierrokset tehty
        } else if (currentStepIndex < currentRoutineSteps.length) {
            // Jatka seuraavaan työvaiheeseen
            const nextEx = currentRoutineSteps[currentStepIndex];
            if (!nextEx || typeof nextEx.workTime === 'undefined') { console.error("Error moveToNextPhase: invalid next step."); resetAppState(); return; }
            // displayStep kutsutaan startTimerForPhasessa
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else {
            // Tänne ei pitäisi päätyä
            console.error("State mismatch error in moveToNextPhase.");
            resetAppState();
        }
    } // moveToNextPhase loppuu

    // --- RUTIINIAJASTIMEN FUNKTIOT ---

    // Käynnistää lämm./jäähd. kuluneen ajan laskurin
    function startRoutineTimer() {
        stopRoutineTimer(); // Varmista ettei vanha päällä
        if(timerState !== TimerState.RUNNING_STEP) return;

        updateTimerDisplay(elapsedRoutineTime); // Näytä alkuun (00:00)
        // timerLabelP asetettiin jo proceedWithRoutineStart:ssa

        routineTimerInterval = setInterval(() => {
            if (timerState !== TimerState.RUNNING_STEP) { stopRoutineTimer(); return; } // Turvatarkistus
            elapsedRoutineTime++;
            updateTimerDisplay(elapsedRoutineTime); // Päivitä näyttö
        }, 1000);
        console.log("Routine timer started.");
    } // startRoutineTimer loppuu

    // Pysäyttää lämm./jäähd. kuluneen ajan laskurin
    function stopRoutineTimer() {
        if (routineTimerInterval) {
            clearInterval(routineTimerInterval);
            routineTimerInterval = null;
            // console.log("Routine timer stopped."); // Vähemmän logitusta
        }
    } // stopRoutineTimer loppuu

    // --- YLEISET UI JA APUFUNKTIOT ---

    // Päivittää ajastimen näyttämän ajan (MM:SS)
    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds); // Ei negatiivista aikaa
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        // Oletuslabel IDLE + ei valintaa tilassa
        if (timerState === TimerState.IDLE && activeRoutineType === 'none') {
             timerLabelP.textContent = 'Odottamassa...';
        }
        // Muut labelit asetetaan: displayStep, proceedWithRoutineStart, startTimerForPhase, finishRoutine, stopActiveRoutine
    } // updateTimerDisplay loppuu

    // Päivittää kierros/vaihe-infon
    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') {
             if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) {
                 roundInfoP.textContent = timerState === TimerState.IDLE ? `Kierrokset: ${currentWorkoutInfo.rounds}` : `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
             } else { roundInfoP.textContent = ''; }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
             if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) {
                 const totalSteps = currentRoutineSteps.length;
                 const currentStepNumber = currentStepIndex + 1;
                 roundInfoP.textContent = `Vaihe ${currentStepNumber} / ${totalSteps}`;
             } else { roundInfoP.textContent = ''; }
        } else { roundInfoP.textContent = ''; } // Tyhjä jos ei rutiinia valittu
    } // updateRoundDisplay loppuu

    // Navigoi edelliseen vaiheeseen (IDLE/FINISHED)
    function prevStep() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex > 0) { jumpToStep(currentStepIndex - 1); } }
    // Navigoi seuraavaan vaiheeseen (IDLE/FINISHED)
    function nextStepNav() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length - 1) { jumpToStep(currentStepIndex + 1); } }

    // Päivittää kaikkien kontrollinappien tilan
    function updateButtonStates() {
        // Piilota kaikki ensin
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';

        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;

        // Näytä oikea Start-nappi IDLE-tilassa
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block';
                startWarmupBtn.disabled = !selectedRoutineData; // Päällä jos valinta tehty
                 if (selectedRoutineData) { // Päivitä teksti
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startWarmupBtn.textContent = `Aloita: ${name}`;
                 } else { startWarmupBtn.textContent = 'Aloita Lämmittely'; }
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block';
                startWorkoutBtn.disabled = currentWorkoutInfo.week === null; // Päällä jos viikko valittu
                startWorkoutBtn.textContent = 'Aloita Treeni';
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block';
                startCooldownBtn.disabled = !selectedRoutineData; // Päällä jos valinta tehty
                 if (selectedRoutineData) { // Päivitä teksti
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startCooldownBtn.textContent = `Aloita: ${name}`;
                 } else { startCooldownBtn.textContent = 'Aloita Jäähdyttely'; }
            }
        }

        // Prev/Next navigointi (IDLE/FINISHED)
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;

        // Aktiivisen rutiinin kontrollit
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Treeni käynnissä
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            // Lämm./Jäähd. käynnissä
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block';
            stopBtn.disabled = false; nextStepBtn.disabled = false;
            nextStepBtn.textContent = (currentStepIndex === currentRoutineSteps.length - 1) ? "Valmis ✅" : "Seuraava Vaihe ⏭";
        } else if (timerState === TimerState.PAUSED) {
            // Treeni pausella
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
    } // updateButtonStates loppuu

    // Palauttaa sovelluksen alkutilaan
    function resetAppState(resetSelections = true) {
        stopTimerInterval(); stopRoutineTimer(); // Pysäytä kaikki ajastimet
        selectedRoutineData = null; // Nollaa valittu rutiini
        currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1; remainingTime = 0; elapsedRoutineTime = 0;
        timerState = TimerState.IDLE; pausedState = null;
        // isAudioUnlocked = false; // Kommentoitu pois, jotta lupa säilyy

        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: resetSelections ? '2' : savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };

        // Päivitä UI oletustilaan
        itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = "Valitse toiminto yläpuolelta."; infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes(); // Asettaa oletustekstin
        itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>'; stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0); // Nollaa ajastin
        timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active');
        timerDiv.style.visibility = 'hidden'; // Piilota ajastin
        highlightCurrentStep(); clearNextUpHighlight(); updateRoundDisplay(); // Nollaa korostukset ja infon

         if (resetSelections) { // Koko resetointi (sovelluksen alussa)
             activeRoutineType = 'none';
             currentWorkoutInfo.week = null; // Nollaa viikko

             // Piilota start-napit
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';

             // Poista aktiivisuus KAIKILTA valintanapeilta
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             // Aseta taso 2 aktiiviseksi
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === '2'); });

             // Sulje valikko ja info-alue
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea();
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        } else { // Osittainen resetointi (kun valitaan uusi rutiini)
             // Säilytä tason korostus
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); });
             // Nollaa rutiini/viikko korostukset (koska ajastin resetoidaan)
             // document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active')); // Tämä tehdään jo selectRoutine/handleWeekSelect -funktioissa
         }

        updateButtonStates(); // Päivitä napit lopuksi
        console.log("App state reset.", resetSelections ? "(Full reset)" : "(Timer/Routine reset)");
    } // resetAppState loppuu

    // Korostaa aktiivisen vaiheen sivupalkin listassa
    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10);
            // Korosta jos indeksi täsmää JA ollaan tilassa, jossa vaihe on relevantti
            const shouldHighlight = currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex &&
                                    (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_STEP ||
                                     timerState === TimerState.IDLE || timerState === TimerState.FINISHED || timerState === TimerState.PAUSED);
            if (shouldHighlight) {
                item.classList.add('active');
                // Skrollaa näkyviin
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                item.classList.remove('active');
            }
        });
        // Varmista ettei mikään ole aktiivinen jos lista tyhjä
        if (currentRoutineSteps.length === 0) {
            stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        }
    } // highlightCurrentStep loppuu

    // Korostaa seuraavan vaiheen listassa (levon aikana)
    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight();
        let nextIdx = -1;
        if (forceIndex !== -1) { nextIdx = forceIndex; } // Käytä annettua indeksiä (kierroslepo)
        else if (timerState === TimerState.RUNNING_REST) { nextIdx = currentStepIndex + 1; } // Normaalilepo

        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    } // highlightNextStep loppuu

    // Poistaa seuraavan vaiheen korostuksen
    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up');
        if (item) item.classList.remove('next-up');
    } // clearNextUpHighlight loppuu

    // CSS hoitaa skrollauksen lukituksen
    function addBodyLock() { /* CSS hoitaa */ }
    function removeBodyLock() { /* CSS hoitaa */ }

    // Näyttää/piilottaa yläosan valinta-alueen
    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.classList.toggle('open', !hidden);
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) toggleTextElem.textContent = hidden ? "Valinnat" : "Piilota valinnat"; // Päivitä teksti
    } // toggleTrainingSelectionVisibility loppuu

    // --- Tapahtumankuuntelijoiden asetus ---
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    startWarmupBtn.addEventListener('click', startSelectedRoutine);
    startWorkoutBtn.addEventListener('click', startSelectedRoutine);
    startCooldownBtn.addEventListener('click', startSelectedRoutine);
    pauseResumeBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopActiveRoutine);
    nextStepBtn.addEventListener('click', handleNextStep);
    prevBtn.addEventListener('click', prevStep);
    nextBtn.addEventListener('click', nextStepNav);
    // toggleInfoBtn kuuntelija lisätään initializeInfoArea:ssa

    // --- Sovelluksen käynnistys ---
    loadAppData(); // Ladataan data ja alustetaan

}); // DOMContentLoaded loppuu
