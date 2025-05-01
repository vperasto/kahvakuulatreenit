// app.js (Muokattu käyttämään olemassa olevia warmup/cooldown objekteja)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const selectionArea = document.getElementById('selection-area');
    const toggleSelectionBtn = document.getElementById('toggle-selection-area');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container');
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container');
    const startWarmupBtn = document.getElementById('start-warmup-btn');
    const startCooldownBtn = document.getElementById('start-cooldown-btn');
    const infoAreaTitle = document.getElementById('info-area-title');
    const infoAreaNotes = document.getElementById('info-area-notes');
    const stepsListTitle = document.getElementById('steps-list-title');
    const stepsListUl = document.getElementById('steps-items');
    const activeDisplaySection = document.getElementById('active-display');
    const itemNameH2 = document.getElementById('item-name');
    const itemImageImg = document.getElementById('item-image');
    const itemDescriptionP = document.getElementById('item-description');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const roundInfoP = document.getElementById('round-info');
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const startPauseResumeBtn = document.getElementById('start-pause-resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const markStepDoneBtn = document.getElementById('mark-step-done-btn');

    // --- Äänet ---
    const beepSound = new Audio('audio/beep.mp3');
    beepSound.load();
    function playSound(audioElement) { if (!audioElement.paused) { audioElement.pause(); audioElement.currentTime = 0; } audioElement.volume = 1.0; audioElement.play().catch(error => console.warn("Audio fail:", error)); }

    // --- Sovelluksen Tila ---
    let fullData = null;
    const AppMode = { IDLE: 'idle', WARMUP: 'warmup', WORKOUT: 'workout', COOLDOWN: 'cooldown' };
    let appMode = AppMode.IDLE;
    let currentWorkoutExercises = [];
    let currentWorkoutInfo = { week: null, level: '2', rounds: 0, restBetweenRounds: 0, focus: '' };
    let currentWorkoutIndex = 0;
    let currentWorkoutRound = 1;
    let currentRoutine = null; // Valittu warmup/cooldown objekti
    let currentRoutineSteps = [];
    let currentRoutineIndex = 0;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' };
    let timerState = TimerState.IDLE;
    let pausedState = null;
    let isAudioUnlocked = false;

    // --- Datan Alustus ---
    async function loadAppData() {
        console.log("Loading data...");
        try {
            const response = await fetch('data/exercises.json'); // Varmista oikea JSON
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            fullData = await response.json();
            console.log("Data loaded.");

            // Tarkista kaikki tarvittavat osiot (nyt myös warmup/cooldown objektit)
            if (!fullData || !fullData.exercises || !fullData.kettlebellProgram11Weeks || !fullData.warmup || !fullData.cooldown) {
                console.error("Essential data sections missing (exercises, program, warmup, cooldown).");
                itemNameH2.textContent = "Virheellinen datatiedosto."; return;
            }

            populateWeekSelectors();
            addLevelButtonListeners();
            populateSingleRoutineButton('warmup'); // MUUTOS: Käytä tätä funktiota
            populateSingleRoutineButton('cooldown'); // MUUTOS: Käytä tätä funktiota
            resetAppState();

        } catch (error) {
            console.error("Data load/process error:", error);
            itemNameH2.textContent = "Virhe ladattaessa dataa.";
             resetAppState();
        }
    }

    // --- UI Populointi & Kuuntelijat ---
    function populateWeekSelectors() { /* ... (kuten ennen) ... */
         if (!fullData || !fullData.kettlebellProgram11Weeks) return; weekButtonsContainer.innerHTML = '';
         const totalWeeks = 11; for (let i = 1; i <= totalWeeks; i++) { const btn = document.createElement('button'); btn.textContent = `Viikko ${i}`; btn.classList.add('week-button'); btn.dataset.weekNumber = i; btn.addEventListener('click', () => handleWeekSelect(i)); weekButtonsContainer.appendChild(btn); }
    }
    function addLevelButtonListeners() { /* ... (kuten ennen) ... */
        const buttons = levelButtonsContainer.querySelectorAll('.level-button'); buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }
    // MUUTOS: Luo vain YHDEN napin per rutiinityyppi (koska datassa vain yksi objekti)
    function populateSingleRoutineButton(type) { // type = 'warmup' or 'cooldown'
        const container = (type === 'warmup') ? warmupButtonsContainer : cooldownButtonsContainer;
        const routineData = fullData[type]; // Hae suoraan objekti (warmup tai cooldown)

        if (!container || !routineData || !routineData.steps) {
            container.innerHTML = `<p>Ei ${type === 'warmup' ? 'lämmittelyä' : 'jäähdyttelyä'} saatavilla.</p>`;
            return;
        }

        container.innerHTML = ''; // Tyhjennä
        const button = document.createElement('button');
        // Käytetään jotain yleistä nimeä tai haetaan descriptionista? Otetaan nyt description.
        button.textContent = routineData.description || (type === 'warmup' ? "Lämmittely" : "Jäähdyttely");
        button.classList.add('routine-button');
        button.dataset.routineType = type; // Tieto tyypistä riittää, ID:tä ei tarvita kun on vain yksi
        button.addEventListener('click', () => handleRoutineSelect(type)); // Kutsu käsittelijää tyypillä
        container.appendChild(button);
    }

    // --- Valintojen Käsittelijät ---
    function handleLevelSelect(selectedLevel) { /* ... (kuten ennen) ... */
         if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`); currentWorkoutInfo.level = selectedLevel;
         levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
         if (currentWorkoutInfo.week !== null && appMode === AppMode.IDLE) { handleWeekSelect(currentWorkoutInfo.week); }
         else { updateInfoAreaDisplay(); }
    }
    function handleWeekSelect(weekNumber) { /* ... (kuten ennen, varmistaa appMode === IDLE) ... */
          if (appMode !== AppMode.IDLE) { console.warn("Cannot select week while another mode is active."); return; }
          console.log(`Handling selection for Week: ${weekNumber}`); resetAppState(false);

          // ... (datan haku ja mappaus kuten aiemmin) ...
         const selectedPhaseIndex = fullData.kettlebellProgram11Weeks.phases.findIndex(phase => phase.phaseInfo?.weeks?.includes(weekNumber));
         // ... (virheentarkistukset) ...
         const selectedPhase = fullData.kettlebellProgram11Weeks.phases[selectedPhaseIndex];
         const currentLevel = currentWorkoutInfo.level; const levelData = selectedPhase.levels?.[currentLevel];
         // ... (virheentarkistukset) ...
         const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;
         let phaseExercisesList = []; /* ... (hae lista) ... */
          // ... (virheentarkistukset) ...
         const mappedExercises = phaseExercisesList.map(phaseEx => { /* ... (mappaa data) ... */
              if (!phaseEx?.exerciseId) return null; const fullEx = fullData.exercises.find(ex => ex.id === phaseEx.exerciseId); if (!fEx) return null; return { ...fEx, displayTitle: phaseEx.displayTitle || fEx.name, notes: phaseEx.notes || '', workTime, restTime };
         }).filter(ex => ex !== null);
         // ... (virheentarkistukset) ...

          // Tallenna TREENIN tiedot
          currentWorkoutExercises = mappedExercises; currentWorkoutIndex = 0; currentWorkoutRound = 1;
          currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, rounds: parseInt(selectedPhase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(selectedPhase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, focus: selectedPhase.phaseInfo.focus || '' };

          // Tyhjennä rutiinivalinta
          currentRoutine = null; currentRoutineSteps = []; currentRoutineIndex = 0;
          highlightRoutineButton(null); // Poista rutiinikorostus

          console.log(`Week ${weekNumber} selected.`);
          updateInfoAreaDisplay(); populateStepsList(); displayItem(currentWorkoutIndex);
          updateControlButtons(); highlightWeekButton(weekNumber); updateRoundDisplay();
    }

    // MUUTOS: Käsittelee rutiinityypin valinnan (ei ID:tä)
    function handleRoutineSelect(type) {
        if (appMode !== AppMode.IDLE) { console.warn("Cannot select routine while another mode is active."); return; }
        console.log(`Handling selection for ${type}`);
        resetAppState(false);

        const routineData = fullData[type]; // Hae objekti suoraan tyypillä
        if (!routineData || !routineData.steps) {
            console.error(`Routine data not found for ${type}`); return;
        }

        // Tallenna RUTIININ tiedot
        currentRoutine = routineData; // Tallenna koko objekti
        currentRoutineSteps = routineData.steps;
        currentRoutineIndex = 0;

        // Tyhjennä treenivalinta
        currentWorkoutInfo = { ...currentWorkoutInfo, week: null, rounds: 0, restBetweenRounds: 0, focus: '' };
        currentWorkoutExercises = []; currentWorkoutIndex = 0; currentWorkoutRound = 1;
        highlightWeekButton(null);

        console.log(`${type} selected.`);
        updateInfoAreaDisplay(); populateStepsList(); displayItem(currentRoutineIndex);
        updateControlButtons(); highlightRoutineButton(type); // Korosta tyypin mukaan
    }


    // --- UI Päivitysfunktiot ---
    function highlightWeekButton(weekNumber) { /* ... (kuten ennen) ... */ }
    // MUUTOS: Korostaa tyypin mukaan (koska vain yksi nappi per tyyppi)
    function highlightRoutineButton(activeType = null) {
        const containers = [warmupButtonsContainer, cooldownButtonsContainer];
        containers.forEach(container => {
            container?.querySelectorAll('.routine-button')?.forEach(btn => {
                const isActive = btn.dataset.routineType === activeType;
                btn.classList.toggle('active', isActive);
            });
        });
        // Päivitä Start-nappien tila
        startWarmupBtn.disabled = !document.querySelector('#warmup-buttons-container .routine-button.active');
        startCooldownBtn.disabled = !document.querySelector('#cooldown-buttons-container .routine-button.active');
    }

    // MUUTOS: Käyttää currentRoutine.descriptionia
    function updateInfoAreaDisplay() {
        if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) {
            infoAreaTitle.textContent = (appMode === AppMode.WARMUP ? "Lämmittely" : "Jäähdyttely");
            infoAreaNotes.textContent = currentRoutine?.description || `Valittu ${appMode === AppMode.WARMUP ? 'lämmittely' : 'jäähdyttely'}.`;
        } else if (appMode === AppMode.WORKOUT && currentWorkoutInfo.week !== null) {
             infoAreaTitle.textContent = `Viikko ${currentWorkoutInfo.week} Tiedot`;
             const levelDesc = fullData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
             const focusText = currentWorkoutInfo.focus ? `\nFokus: ${currentWorkoutInfo.focus}` : '';
             infoAreaNotes.textContent = `Taso: ${currentWorkoutInfo.level} (${levelDesc})${focusText}`;
        } else {
            infoAreaTitle.textContent = "Tiedot"; infoAreaNotes.textContent = "Valitse toiminto yläpuolelta.";
        }
         if (!infoAreaNotes.textContent.trim()){ infoAreaNotes.textContent = "Ei lisätietoja."; }
    }

    function populateStepsList() { /* ... (kuten ennen, käyttää currentRoutineSteps tai currentWorkoutExercises) ... */
        stepsListUl.innerHTML = ''; let itemsToList = []; let title = "Vaiheet / Harjoitukset";
        if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { itemsToList = currentRoutineSteps; title = (appMode === AppMode.WARMUP ? "Lämmittely" : "Jäähdyttely") + " Vaiheet"; }
        else if (appMode === AppMode.WORKOUT) { itemsToList = currentWorkoutExercises; title = currentWorkoutInfo.week ? `Viikko ${currentWorkoutInfo.week} Harjoitukset` : "Treenin Harjoitukset"; }
        stepsListTitle.textContent = title; if (itemsToList.length === 0) { stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>'; return; }
        itemsToList.forEach((item, index) => { const li = document.createElement('li'); li.textContent = `${index + 1}. ${item.displayTitle || item.name}`; li.dataset.index = index; li.classList.add('step-item'); li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToItem(index); }); stepsListUl.appendChild(li); });
    }
    function displayItem(index) { /* ... (kuten ennen, näyttää itemin tiedot riippuen appMode:sta) ... */
         let item = null; let itemType = 'step';
         if (appMode === AppMode.WORKOUT) { if (index < 0 || index >= currentWorkoutExercises.length) { console.error("Workout index OOB"); return; } item = currentWorkoutExercises[index]; itemType = 'exercise'; }
         else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { if (index < 0 || index >= currentRoutineSteps.length) { console.error("Routine index OOB"); return; } item = currentRoutineSteps[index]; }
         else { itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none'; return; }
         if (!item) { console.error("Item data null"); return; }
         itemNameH2.textContent = item.displayTitle || item.name; itemDescriptionP.textContent = itemType === 'exercise' ? `${item.description || ''}${item.notes ? `\n\nHuom: ${item.notes}` : ''}` : (item.description || '');
         if (itemType === 'exercise' && item.image) { itemImageImg.src = item.image; itemImageImg.alt = item.displayTitle || item.name; itemImageImg.style.display = 'block'; } else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
         if (itemType === 'exercise' && (timerState === TimerState.IDLE || timerState === TimerState.FINISHED)) { remainingTime = item.workTime || 0; updateTimerDisplay(remainingTime); }
         else if (itemType === 'step') { updateTimerDisplay(0, "Seuraa ohjeita"); } // Teksti rutiinille
         highlightCurrentStep();
    }
    function jumpToItem(index) { /* ... (kuten ennen, hyppää itemiin riippuen appMode:sta) ... */
        if (appMode === AppMode.WORKOUT) { if (index >= 0 && index < currentWorkoutExercises.length) { stopTimer(); currentWorkoutIndex = index; currentWorkoutRound = 1; timerState = TimerState.IDLE; displayItem(currentWorkoutIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } }
        else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { if (index >= 0 && index < currentRoutineSteps.length) { currentRoutineIndex = index; timerState = TimerState.IDLE; displayItem(currentRoutineIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } }
    }
    function highlightCurrentStep() { /* ... (kuten ennen, käyttää yleistä stepsListUl ja step-item luokkaa) ... */
         const items = stepsListUl.querySelectorAll('li.step-item'); let currentIndex = -1; if(appMode === AppMode.WORKOUT) currentIndex = currentWorkoutIndex; else if(appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) currentIndex = currentRoutineIndex; items.forEach((item) => { const itemIndex = parseInt(item.dataset.index, 10); const isActive = !isNaN(itemIndex) && itemIndex === currentIndex; item.classList.toggle('active', isActive); if (isActive && (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight)) { item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }); if (currentIndex === -1) { items.forEach(item => item.classList.remove('active')); }
    }

    // --- Ajastimen toiminnot (käytössä vain WORKOUT-tilassa) ---
    function startPauseResumeWorkout() { /* ... (kuten ennen) ... */
         if (timerState === TimerState.IDLE && appMode === AppMode.WORKOUT) { startWorkoutInternal(); }
         else if ((timerState === TimerState.RUNNING || timerState === TimerState.PAUSED) && appMode === AppMode.WORKOUT) { pauseResumeTimerInternal(); }
         else { console.warn("Cannot start/pause/resume."); }
    }
    function startWorkoutInternal() { /* ... (kuten ennen, sisältää audio unlockin) ... */
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE || appMode !== AppMode.WORKOUT) return;
        if (!isAudioUnlocked) { console.log("Attempting audio unlock..."); beepSound.volume = 0.001; beepSound.play().then(() => { beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; isAudioUnlocked = true; console.log("Audio unlocked."); proceedWithStart(); }).catch(err => { console.warn("Audio unlock fail:", err); beepSound.volume = 1.0; isAudioUnlocked = true; proceedWithStart(); }); }
        else { proceedWithStart(); }
    }
    function proceedWithStart() { /* ... (kuten ennen) ... */
        console.log("Starting workout..."); currentWorkoutIndex = 0; currentWorkoutRound = 1; updateRoundDisplay(); displayItem(currentWorkoutIndex); addBodyLock(); startTimerForPhase(TimerState.RUNNING, currentWorkoutExercises[currentWorkoutIndex].workTime);
    }
    function pauseResumeTimerInternal() { /* ... (kuten ennen) ... */
        if (appMode !== AppMode.WORKOUT) return; if (timerState === TimerState.RUNNING) { pausedState = determineSubState() === 'work' ? 'work' : 'rest'; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Paused"); timerDiv.classList.add('timer-paused'); updateControlButtons(); } else if (timerState === TimerState.PAUSED) { console.log("Resumed"); timerState = TimerState.RUNNING; const wasResting = pausedState === 'rest'; pausedState = null; runTimerInterval(); timerDiv.classList.remove('timer-paused'); if(wasResting){ timerDiv.classList.add('timer-resting'); highlightNextExercise(); } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); } updateControlButtons(); }
    }
    function determineSubState() { /* ... (kuten ennen) ... */
         if (timerLabelP.textContent.toLowerCase().includes("lepo") || timerLabelP.textContent.toLowerCase().includes("kierroslepo")) return 'rest'; return 'work';
    }
    function stopWorkoutInternal() { /* ... (kuten ennen) ... */
        if (appMode !== AppMode.WORKOUT) return; stopTimer(); console.log("Stopped"); clearNextUpHighlight(); removeBodyLock(); currentWorkoutRound = 1; pausedState = null; if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentWorkoutIndex]) { const currentEx = currentWorkoutExercises[currentWorkoutIndex]; updateTimerDisplay(currentEx.workTime); displayItem(currentWorkoutIndex); } else { resetAppState(); } updateRoundDisplay(); updateControlButtons();
    }
    function stopTimer() { /* ... (kuten ennen) ... */ }
    function stopTimerInterval() { /* ... (kuten ennen) ... */ }
    function startTimerForPhase(targetTimerState, duration) { /* ... (kuten ennen, mutta logiikka monimutkaistuu subStaten takia) ... */
         stopTimerInterval(); timerState = targetTimerState; remainingTime = duration;
         timerDiv.classList.remove('timer-resting', 'timer-paused'); clearNextUpHighlight();

         // TÄMÄ OSA VAATII EDELLEEN REFAKTOROINTIA - MISTÄ TIEDETÄÄN ONKO ALKAMASSA TYÖ VAI LEPO?
         // Yksinkertaistus: Päätellään durationin ja kontekstin perusteella? Ei varma.
         // OLETETAAN NYT, ETTÄ TÄMÄ KUTSUTAAN VAIN TYÖVAIHEEN ALOITTAMISEKSI handleTimerEnd/moveToNextPhase:sta
         displayItem(currentWorkoutIndex); highlightCurrentStep(); // Oletetaan työ

         console.log(`Starting timer phase, Duration: ${duration}`);
         updateTimerDisplay(remainingTime); updateControlButtons(); updateRoundDisplay();
         if (remainingTime > 0) { runTimerInterval(); } else { handleTimerEnd(); }
    }
    function runTimerInterval() { /* ... (kuten ennen, sisältää äänimerkit) ... */
        if (timerInterval || appMode !== AppMode.WORKOUT) return; timerInterval = setInterval(() => { if (timerState === TimerState.PAUSED) return; remainingTime--; const checkTime = remainingTime + 1; const subState = determineSubState(); if(isAudioUnlocked){ if (subState === 'work') { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) { playSound(beepSound); } } else if (subState === 'rest' || subState === 'round_rest') { if (checkTime >= 1 && checkTime <= 3) { playSound(beepSound); } } } updateTimerDisplay(remainingTime); if (remainingTime < 0) { handleTimerEnd(); } }, 1000);
    }
    function handleTimerEnd() { /* ... (kuten ennen, mutta kutsuu startTimerForPhase eri tiloilla) ... */
        if (appMode !== AppMode.WORKOUT) return; stopTimerInterval(); timerDiv.classList.remove('timer-resting'); if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;
        const subState = determineSubState(); // Mistä tultiin?
        if (subState === 'work') { const currentEx = currentWorkoutExercises[currentWorkoutIndex]; if (!currentEx) { resetAppState(); return; } const isLastEx = currentWorkoutIndex === currentWorkoutExercises.length - 1; const isLastR = currentWorkoutRound >= currentWorkoutInfo.rounds; const restDur = currentEx.restTime || 0; if (isLastEx) { if (isLastR) { moveToNextPhase(); } else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) { startTimerForPhase(TimerState.RUNNING, roundRest); } else { moveToNextPhase(); } } } else { if (restDur > 0) { startTimerForPhase(TimerState.RUNNING, restDur); } else { moveToNextPhase(); } } }
        else if (subState === 'rest' || subState === 'round_rest') { clearNextUpHighlight(); moveToNextPhase(); }
    }
     function moveToNextPhase() { /* ... (kuten ennen, mutta asettaa appMode = IDLE lopussa) ... */
         if (appMode !== AppMode.WORKOUT) return;
         const previousSubState = determineSubState();
         if ((previousSubState === 'round_rest') || (previousSubState === 'work' && currentWorkoutIndex === currentWorkoutExercises.length - 1 && currentWorkoutRound < currentWorkoutInfo.rounds && currentWorkoutInfo.restBetweenRounds <= 0) ) { currentRound++; currentExerciseIndex = 0; }
         else if (previousSubState === 'rest') { currentExerciseIndex++; }
         else if (previousSubState === 'work') { if(currentWorkoutExercises[currentWorkoutIndex]?.restTime <= 0 && currentWorkoutIndex < currentWorkoutExercises.length - 1) { currentExerciseIndex++; } else if (currentWorkoutIndex === currentWorkoutExercises.length - 1){ if (currentWorkoutRound >= currentWorkoutInfo.rounds) {} else if (currentWorkoutInfo.restBetweenRounds <= 0) { currentRound++; currentExerciseIndex = 0; } } }
         if (currentRound > currentWorkoutInfo.rounds) { timerState = TimerState.FINISHED; updateControlButtons(); removeBodyLock(); clearNextUpHighlight(); itemNameH2.textContent = "Treeni Valmis!"; itemDescriptionP.textContent = "Hyvää työtä!"; itemImageImg.style.display = 'none'; updateTimerDisplay(0); updateRoundDisplay(); infoAreaNotes.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty!`; if(isAudioUnlocked) playSound(beepSound); appMode = AppMode.IDLE; updateControlButtons(); } // <-- Aseta IDLE
         else if (currentExerciseIndex < currentWorkoutExercises.length) { updateRoundDisplay(); const nextEx = currentWorkoutExercises[currentWorkoutIndex]; startTimerForPhase(TimerState.RUNNING, nextEx.workTime); } // Käynnistä seuraava työ
         else { console.error("State error in moveToNextPhase."); resetAppState(); }
     }

    // --- Lämmittelyn/Jäähdyttelyn toiminnot ---
    function startRoutine(type) { /* ... (kuten ennen) ... */
         if (!fullData[type] || appMode !== AppMode.IDLE) { console.warn("Cannot start routine."); return; }
         currentRoutine = fullData[type]; currentRoutineSteps = currentRoutine.steps || [];
         if (currentRoutineSteps.length === 0) { console.warn("Routine has no steps."); return; }
         appMode = (type === 'warmup') ? AppMode.WARMUP : AppMode.COOLDOWN; currentRoutineIndex = 0; timerState = TimerState.IDLE;
         console.log(`Starting ${type}: ${currentRoutine.description}`); addBodyLock(); updateInfoAreaDisplay(); populateStepsList();
         displayItem(currentRoutineIndex); updateControlButtons(); highlightRoutineButton(type); // Korosta valinta
    }
    function stopRoutine() { /* ... (kuten ennen) ... */
         if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; console.log(`Stopping ${appMode}.`);
         removeBodyLock(); resetAppState(false); // Nollaa, säilytä taso
    }
    function navigateRoutineStep(direction) { /* ... (kuten ennen) ... */
        if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; const newIndex = (direction === 'next') ? currentRoutineIndex + 1 : currentRoutineIndex - 1;
        if (newIndex >= 0 && newIndex < currentRoutineSteps.length) { currentRoutineIndex = newIndex; displayItem(currentRoutineIndex); updateControlButtons(); }
        else if (direction === 'next' && newIndex >= currentRoutineSteps.length) { console.log(`${appMode} finished.`); stopRoutine(); }
    }
    function markStepDone() { if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) navigateRoutineStep('next'); }

    // --- Yleiset UI-funktiot ---
    function updateTimerDisplay(timeInSeconds, forceLabel = null) { /* ... (kuten ennen) ... */
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0"); const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`; let label = "Odottamassa..."; if (forceLabel) { label = forceLabel; } else if (appMode === AppMode.WORKOUT) { if (timerState === TimerState.RUNNING) { const subState = determineSubState(); if (subState === 'work') label = "Työaika"; else if (subState === 'rest') label = "Lepo"; else if (subState === 'round_rest') label = "Kierroslepo"; else label = "Käynnissä"; } else if (timerState === TimerState.PAUSED) { label = "Tauko"; } else if (timerState === TimerState.FINISHED) { label = "Valmis"; } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { label = "Seuraa ohjeita"; } timerLabelP.textContent = label;
    }
    function updateRoundDisplay() { /* ... (kuten ennen) ... */ }
    function updateControlButtons() { /* ... (kuten ennen) ... */
         startPauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; markStepDoneBtn.style.display = 'none'; prevBtn.disabled = true; nextBtn.disabled = true;
         if (appMode === AppMode.IDLE) { if (currentWorkoutInfo.week !== null) { startPauseResumeBtn.style.display = 'inline-block'; startPauseResumeBtn.textContent = '▶ Aloita Treeni'; startPauseResumeBtn.disabled = false; startPauseResumeBtn.classList.remove('paused'); } }
         else if (appMode === AppMode.WORKOUT) { const isIdle = timerState === TimerState.IDLE; const isRunning = timerState === TimerState.RUNNING; const isPaused = timerState === TimerState.PAUSED; const isFinished = timerState === TimerState.FINISHED; startPauseResumeBtn.style.display = 'inline-block'; startPauseResumeBtn.disabled = isFinished; if (isIdle) { startPauseResumeBtn.textContent = '▶ Aloita Treeni'; startPauseResumeBtn.classList.remove('paused'); } else if (isRunning) { startPauseResumeBtn.textContent = '⏸ Tauko'; startPauseResumeBtn.classList.remove('paused'); } else if (isPaused) { startPauseResumeBtn.textContent = '▶ Jatka'; startPauseResumeBtn.classList.add('paused'); } else { startPauseResumeBtn.textContent = 'Valmis'; startPauseResumeBtn.classList.remove('paused'); } stopBtn.style.display = 'inline-block'; stopBtn.disabled = isIdle || isFinished; const canNavWorkout = currentWorkoutExercises.length > 0 && (isIdle || isFinished); prevBtn.disabled = !canNavWorkout || currentWorkoutIndex <= 0; nextBtn.disabled = !canNavWorkout || currentWorkoutIndex >= currentWorkoutExercises.length - 1; }
         else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { markStepDoneBtn.style.display = 'inline-block'; stopBtn.style.display = 'inline-block'; stopBtn.disabled = false; const canNavRoutine = currentRoutineSteps.length > 0; prevBtn.disabled = !canNavRoutine || currentRoutineIndex <= 0; nextBtn.disabled = !canNavRoutine || currentRoutineIndex >= currentRoutineSteps.length - 1; }
    }
    function resetAppState(resetLevelHighlight = true) { /* ... (kuten ennen) ... */
         stopTimerInterval(); removeBodyLock(); appMode = AppMode.IDLE; currentWorkoutExercises = []; currentWorkoutIndex = 0; currentWorkoutRound = 1; currentRoutine = null; currentRoutineSteps = []; currentRoutineIndex = 0; remainingTime = 0; timerState = TimerState.IDLE; pausedState = null; currentWorkoutInfo = { ...currentWorkoutInfo, week: null, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' }; itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none'; itemImageImg.src = ''; updateInfoAreaDisplay(); populateStepsList(); updateTimerDisplay(0); updateRoundDisplay(); timerDiv.classList.remove('timer-resting', 'timer-paused'); highlightCurrentStep(); clearNextUpHighlight(); updateControlButtons(); document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active')); if (resetLevelHighlight) { levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); }); } highlightRoutineButton(null); console.log("App state reset.");
    }
    function highlightNextExercise(forceIndex = -1) { /* ... (kuten ennen) ... */ }
    function clearNextUpHighlight() { /* ... (kuten ennen) ... */ }
    function addBodyLock() { /* ... (kuten ennen) ... */ }
    function removeBodyLock() { /* ... (kuten ennen) ... */ }
    function toggleTrainingSelectionVisibility() { /* ... (kuten ennen) ... */ }

    // --- Event Listeners ---
    // ... (lisätty startWarmupBtn, startCooldownBtn, markStepDoneBtn) ...
    startWarmupBtn.addEventListener('click', () => startRoutine('warmup'));
    startCooldownBtn.addEventListener('click', () => startRoutine('cooldown'));
    startPauseResumeBtn.addEventListener('click', startPauseResumeWorkout);
    stopBtn.addEventListener('click', () => { if (appMode === AppMode.WORKOUT) stopWorkoutInternal(); else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) stopRoutine(); });
    markStepDoneBtn.addEventListener('click', markStepDone);
    prevBtn.addEventListener('click', () => { if (appMode === AppMode.WORKOUT) { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentWorkoutIndex > 0) jumpToItem(currentWorkoutIndex - 1); } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { navigateRoutineStep('prev'); } });
    nextBtn.addEventListener('click', () => { if (appMode === AppMode.WORKOUT) { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentWorkoutIndex < currentWorkoutExercises.length - 1) jumpToItem(currentWorkoutIndex + 1); } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { navigateRoutineStep('next'); } });
    toggleSelectionBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
