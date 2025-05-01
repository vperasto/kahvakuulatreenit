// app.js (Koko tiedosto, sisältää valikon piilotuksen)

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
    const startWorkoutBtn = document.getElementById('start-workout-btn');
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
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    // --- Äänet ---
    const beepSound = new Audio('audio/beep.mp3');
    beepSound.load();
    function playSound(audioElement) { if (!audioElement.paused) { audioElement.pause(); audioElement.currentTime = 0; } audioElement.volume = 1.0; audioElement.play().catch(error => console.warn("Audio fail:", error)); }

    // --- Sovelluksen Tila ---
    let fullData = null;
    const AppMode = { IDLE: 'idle', WARMUP: 'warmup', WORKOUT: 'workout', COOLDOWN: 'cooldown' };
    let appMode = AppMode.IDLE;
    let selectedWorkoutInfo = { week: null, level: '2' };
    let selectedRoutineInfo = { type: null, data: null };
    let activeSteps = [];
    let activeIndex = 0;
    let currentWorkoutRound = 1;
    let totalWorkoutRounds = 1;
    let currentWorkoutInfo = { week: null, level: '2', rounds: 0, restBetweenRounds: 0, focus: '' }; // Nämäkin alustetaan varmuuden vuoksi
    let currentRoutine = null;
    let currentRoutineSteps = [];
    let currentRoutineIndex = 0; // Vaikka käytetään activeIndex, pidetään tämä selkeyden vuoksi? Tai poistetaan. Poistetaan.
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING_WORK: 'running_work', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished' };
    let timerState = TimerState.IDLE;
    let pausedStateBeforePause = null;
    let isAudioUnlocked = false;

    // --- Datan Alustus ---
    async function loadAppData() {
        console.log("Loading data...");
        try {
            const response = await fetch('data/exercises.json');
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            fullData = await response.json();
            console.log("Data loaded.");
            if (!fullData?.exercises || !fullData?.kettlebellProgram11Weeks || !fullData?.warmup || !fullData?.cooldown) {
                throw new Error("Essential data sections missing.");
            }
            populateUI();
            resetAppState();
        } catch (error) {
            console.error("Data load/process error:", error);
            itemNameH2.textContent = "Virhe ladattaessa dataa.";
             resetAppState();
        }
    }

    // --- UI Populointi & Kuuntelijat ---
    function populateUI() {
        populateWeekSelectors();
        addLevelButtonListeners();
        populateSingleRoutineButton('warmup');
        populateSingleRoutineButton('cooldown');
        addEventListeners();
    }
    function populateWeekSelectors() {
         if (!fullData?.kettlebellProgram11Weeks) return; weekButtonsContainer.innerHTML = '';
         const totalWeeks = 11; for (let i = 1; i <= totalWeeks; i++) { const btn = document.createElement('button'); btn.textContent = `Viikko ${i}`; btn.classList.add('week-button'); btn.dataset.weekNumber = i; btn.addEventListener('click', () => handleWeekSelect(i)); weekButtonsContainer.appendChild(btn); }
    }
    function addLevelButtonListeners() {
        levelButtonsContainer?.querySelectorAll('.level-button')?.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }
    function populateSingleRoutineButton(type) {
        const container = (type === 'warmup') ? warmupButtonsContainer : cooldownButtonsContainer; const routineData = fullData?.[type];
        if (!container || !routineData?.steps) { container.innerHTML = `<p>Ei ${type} saatavilla.</p>`; return; }
        container.innerHTML = ''; const button = document.createElement('button'); button.textContent = routineData.description || type; button.classList.add('routine-button'); button.dataset.routineType = type; button.addEventListener('click', () => handleRoutineSelect(type)); container.appendChild(button);
    }

    // --- Valintojen Käsittelijät ---
    function handleLevelSelect(selectedLevel) {
         if (!selectedWorkoutInfo || selectedLevel === selectedWorkoutInfo.level || appMode !== AppMode.IDLE) return;
         console.log(`Level selected: ${selectedLevel}`); selectedWorkoutInfo.level = selectedLevel;
         levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
         updateStartWorkoutButtonState();
         updateInfoAreaForSelection();
    }
    function handleWeekSelect(weekNumber) {
          if (appMode !== AppMode.IDLE) { console.warn("Cannot select week now."); return; }
          console.log(`Week ${weekNumber} selected.`); selectedWorkoutInfo.week = weekNumber;
          highlightWeekButton(weekNumber); unselectRoutine(); updateStartWorkoutButtonState(); updateInfoAreaForSelection();
    }
    function handleRoutineSelect(type) {
        if (appMode !== AppMode.IDLE) { console.warn("Cannot select routine now."); return; }
        console.log(`${type} selected.`); selectedRoutineInfo = { type: type, data: fullData[type] };
        highlightRoutineButton(type); unselectWorkout(); updateStartWorkoutButtonState(); updateInfoAreaForSelection();
    }
    function unselectWorkout() { selectedWorkoutInfo.week = null; highlightWeekButton(null); startWorkoutBtn.style.display = 'none'; }
    function unselectRoutine() { selectedRoutineInfo = { type: null, data: null }; highlightRoutineButton(null); startWarmupBtn.disabled = true; startCooldownBtn.disabled = true; }
    function updateStartWorkoutButtonState() { const canStart = selectedWorkoutInfo.week !== null && selectedWorkoutInfo.level !== null; startWorkoutBtn.style.display = canStart ? 'block' : 'none'; startWorkoutBtn.disabled = !canStart; }
    function updateInfoAreaForSelection() {
         if (!selectedWorkoutInfo) return; // Varmistus
         if (selectedRoutineInfo.type) { infoAreaTitle.textContent = selectedRoutineInfo.type === 'warmup' ? "Lämmittely Info" : "Jäähdyttely Info"; infoAreaNotes.textContent = selectedRoutineInfo.data?.description || "Ei kuvausta."; }
         else if (selectedWorkoutInfo.week) { infoAreaTitle.textContent = `Viikko ${selectedWorkoutInfo.week} Info`; const phase = fullData.kettlebellProgram11Weeks.phases.find(p => p.phaseInfo?.weeks?.includes(selectedWorkoutInfo.week)); const levelDesc = fullData.kettlebellProgram11Weeks.programInfo.levels.find(l=>l.level == selectedWorkoutInfo.level)?.description || ''; const focus = phase?.phaseInfo?.focus || ''; infoAreaNotes.textContent = `Taso: ${selectedWorkoutInfo.level} (${levelDesc})\n${focus ? `Fokus: ${focus}`: ''}`; }
         else { infoAreaTitle.textContent = "Tiedot"; infoAreaNotes.textContent = "Valitse toiminto yläpuolelta."; }
         if (!infoAreaNotes.textContent.trim()){ infoAreaNotes.textContent = "Ei lisätietoja."; }
         stepsListTitle.textContent = "Vaiheet / Harjoitukset"; stepsListUl.innerHTML = '<li>Valitse toiminto ja paina "Aloita".</li>'; itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none';
    }

    // --- UI Päivitysfunktiot Aktiiviselle Moodille ---
    function highlightWeekButton(weekNumber) { weekButtonsContainer?.querySelectorAll('.week-button')?.forEach(btn => { btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber); }); }
    function highlightRoutineButton(activeType = null) { const containers = [warmupButtonsContainer, cooldownButtonsContainer]; containers.forEach(container => { container?.querySelectorAll('.routine-button')?.forEach(btn => { const isActive = btn.dataset.routineType === activeType; btn.classList.toggle('active', isActive); }); }); startWarmupBtn.disabled = !document.querySelector('#warmup-buttons-container .routine-button.active'); startCooldownBtn.disabled = !document.querySelector('#cooldown-buttons-container .routine-button.active'); }
    function populateStepsList() {
        stepsListUl.innerHTML = ''; let items = activeSteps; let title = "Aktiivinen Toiminto";
        if (!currentWorkoutInfo) { stepsListUl.innerHTML = '<li>Virhe tilassa.</li>'; return; } // Varmistus
        if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { title = (appMode === AppMode.WARMUP ? "Lämmittely" : "Jäähdyttely") + " Vaiheet"; }
        else if (appMode === AppMode.WORKOUT) { title = currentWorkoutInfo.week ? `Viikko ${currentWorkoutInfo.week} Harjoitukset` : "Treeni"; }
        stepsListTitle.textContent = title; if (items.length === 0) { stepsListUl.innerHTML = '<li>Ei vaiheita.</li>'; return; }
        items.forEach((item, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${item.displayTitle || item.name}`; li.dataset.index = i; li.classList.add('step-item'); li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToItem(i); }); stepsListUl.appendChild(li); });
    }
    function displayItem(index) {
         if (index < 0 || index >= activeSteps.length) { console.error("Index OOB displayItem"); return; }
         const item = activeSteps[index]; const isExercise = appMode === AppMode.WORKOUT;
         itemNameH2.textContent = item.displayTitle || item.name; itemDescriptionP.textContent = isExercise ? `${item.description || ''}${item.notes ? `\n\nHuom: ${item.notes}` : ''}` : (item.description || '');
         if (isExercise && item.image) { itemImageImg.src = item.image; itemImageImg.alt = item.displayTitle || item.name; itemImageImg.style.display = 'block'; } else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
         if (isExercise && (timerState === TimerState.IDLE || timerState === TimerState.FINISHED)) { remainingTime = item.workTime || 0; updateTimerDisplay(remainingTime, "Työaika"); }
         else if (!isExercise) { updateTimerDisplay(0, "Seuraa ohjeita"); }
         highlightCurrentStep(); if (appMode !== AppMode.IDLE) { scrollToActiveDisplay(); }
    }
    function jumpToItem(index) {
        if (appMode === AppMode.WORKOUT) { if (index >= 0 && index < activeSteps.length) { stopTimer(); activeIndex = index; currentWorkoutRound = 1; timerState = TimerState.IDLE; displayItem(activeIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } }
        else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { if (index >= 0 && index < activeSteps.length) { activeIndex = index; timerState = TimerState.IDLE; displayItem(activeIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } }
    }
    function highlightCurrentStep() { const items = stepsListUl.querySelectorAll('li.step-item'); let currentIdx = activeIndex; items.forEach((item) => { const idx = parseInt(item.dataset.index, 10); const isActive = !isNaN(idx) && idx === currentIdx; item.classList.toggle('active', isActive); if (isActive && (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight)) { item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }); if (appMode === AppMode.IDLE) { items.forEach(item => item.classList.remove('active')); } }
    function highlightNextExercise() { clearNextUpHighlight(); if (appMode !== AppMode.WORKOUT) return; const currentSubState = timerState; let nextIdx = -1; if (currentSubState === TimerState.RUNNING_REST) nextIdx = activeIndex + 1; else if (currentSubState === TimerState.RUNNING_ROUND_REST) nextIdx = 0; if (nextIdx >= 0 && nextIdx < activeSteps.length) { const item = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`); if (item) item.classList.add('next-up'); } }
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }

    // --- TOIMINTOJEN KÄYNNISTYS ---
    function startSelectedWorkout() {
        if (appMode !== AppMode.IDLE || !selectedWorkoutInfo.week) { console.warn("Workout not selected or app busy."); return; }
        const phase = fullData.kettlebellProgram11Weeks.phases.find(p => p.phaseInfo?.weeks?.includes(selectedWorkoutInfo.week));
        const levelData = phase?.levels?.[selectedWorkoutInfo.level];
        if (!phase || !levelData) { console.error("Cannot find phase/level data to start."); return; }
        const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;
        let listSource = []; if (phase.phaseInfo.weeks.some(w => w >= 8 && w <= 11) && phase.exampleWeeklyExercises) { listSource = phase.exampleWeeklyExercises; } else if (phase.weeklyExercises) { listSource = phase.weeklyExercises; } else { console.error("No exercises."); return; }
        activeSteps = listSource.map(pEx => { const fEx = fullData.exercises.find(ex => ex.id === pEx?.exerciseId); return fEx ? { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime } : null; }).filter(ex => ex !== null);
        if (activeSteps.length === 0) { console.error("No valid exercises found to start."); return; }

        appMode = AppMode.WORKOUT; activeIndex = 0; currentWorkoutRound = 1;
        totalWorkoutRounds = parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1;
        // ** MUUTOS: Päivitetään globaali currentWorkoutInfo **
        currentWorkoutInfo = { ...selectedWorkoutInfo, rounds: totalWorkoutRounds, restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, focus: phase.phaseInfo.focus || '' };
        timerState = TimerState.IDLE; pausedStateBeforePause = null;

        console.log(`Starting workout: Week ${selectedWorkoutInfo.week}, Level ${selectedWorkoutInfo.level}, ${totalWorkoutRounds} rounds.`);
        if (!isAudioUnlocked) { attemptAudioUnlock(proceedWithWorkoutStart); } else { proceedWithWorkoutStart(); }
    }

    function proceedWithWorkoutStart() {
         if (!currentWorkoutInfo) { console.error("Cannot proceed, currentWorkoutInfo missing."); return; }
         hideSelectionArea();
         populateStepsList(); displayItem(activeIndex); updateControlButtons(); updateRoundDisplay(); addBodyLock();
         startTimerPhaseInternal('work', activeSteps[activeIndex].workTime);
    }

    function startSelectedRoutine(type) {
         if (appMode !== AppMode.IDLE || !selectedRoutineInfo.type || selectedRoutineInfo.type !== type) { console.warn("Routine not selected or app busy."); return; }
         activeSteps = selectedRoutineInfo.data?.steps || []; if (activeSteps.length === 0) { console.warn("Routine empty."); return; }
         appMode = type === 'warmup' ? AppMode.WARMUP : AppMode.COOLDOWN; activeIndex = 0; timerState = TimerState.IDLE;
         // ** MUUTOS: Päivitetään globaali currentRoutine **
         currentRoutine = selectedRoutineInfo.data;
         console.log(`Starting routine: ${type}`);
         hideSelectionArea(); // Piilota valikko
         populateStepsList(); displayItem(activeIndex); updateControlButtons(); addBodyLock(); updateRoundDisplay(); scrollToActiveDisplay();
    }

    // --- AJASTINLOGIIKKA (Vain WORKOUT) ---
    function pauseResumeTimerInternal() {
        if (appMode !== AppMode.WORKOUT) return;
        if (timerState === TimerState.RUNNING_WORK || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedStateBeforePause = timerState; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Paused");
            timerDiv.classList.add('timer-paused'); updateControlButtons(); updateTimerDisplay(remainingTime, "Tauko");
        } else if (timerState === TimerState.PAUSED) {
            console.log("Resumed"); timerState = pausedStateBeforePause || TimerState.RUNNING_WORK;
            pausedStateBeforePause = null; runTimerInterval(); timerDiv.classList.remove('timer-paused');
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){ timerDiv.classList.add('timer-resting'); highlightNextExercise(); }
            else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); }
            updateControlButtons(); updateTimerDisplay(remainingTime);
        }
    }
    // Käytä tätä mieluummin kuin labelin lukemista
    function getCurrentSubState() {
        if (timerState === TimerState.RUNNING_WORK) return 'work';
        if (timerState === TimerState.RUNNING_REST) return 'rest';
        if (timerState === TimerState.RUNNING_ROUND_REST) return 'round_rest';
        if (timerState === TimerState.PAUSED) return pausedStateBeforePause === TimerState.RUNNING_WORK ? 'work' : (pausedStateBeforePause === TimerState.RUNNING_REST ? 'rest' : 'round_rest'); // Mitä oli ennen pausea
        return null;
    }

    function stopWorkoutInternal() { if (appMode !== AppMode.WORKOUT) return; stopTimer(); console.log("Stopped workout."); clearNextUpHighlight(); removeBodyLock(); currentWorkoutRound = 1; pausedStateBeforePause = null; if (activeSteps.length > 0 && activeSteps[activeIndex]) { const currentEx = activeSteps[activeIndex]; updateTimerDisplay(currentEx.workTime, "Työaika"); displayItem(activeIndex); } else { resetAppState(); } updateRoundDisplay(); appMode = AppMode.IDLE; updateControlButtons(); }
    function stopTimer() { stopTimerInterval(); timerState = TimerState.IDLE; pausedStateBeforePause = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); console.log("Timer stopped, state IDLE."); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

    function startTimerPhaseInternal(subState, duration) {
        stopTimerInterval();
        timerState = subState === 'work' ? TimerState.RUNNING_WORK : (subState === 'rest' ? TimerState.RUNNING_REST : TimerState.RUNNING_ROUND_REST);
        remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused'); clearNextUpHighlight();
        let label = "Käynnissä...";
        if (subState === 'work') { displayItem(activeIndex); highlightCurrentStep(); label = "Työaika"; }
        else if (subState === 'rest') { timerDiv.classList.add('timer-resting'); const nextIdx = activeIndex + 1; if (nextIdx < activeSteps.length) { displayItem(nextIdx); highlightNextExercise(); } else { displayItem(activeIndex); highlightCurrentStep(); } label = "Lepo"; }
        else if (subState === 'round_rest') { timerDiv.classList.add('timer-resting'); if (activeSteps.length > 0) { displayItem(0); highlightNextExercise(0); } label = "Kierroslepo"; }
        console.log(`Starting timer phase: ${timerState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime, label); updateControlButtons(); updateRoundDisplay();
        if (remainingTime > 0) { runTimerInterval(); } else { handleTimerEnd(); }
    }

    function runTimerInterval() {
        if (timerInterval || appMode !== AppMode.WORKOUT) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; remainingTime--;
            const checkTime = remainingTime + 1;
            if(isAudioUnlocked){
                 if (timerState === TimerState.RUNNING_WORK) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) { playSound(beepSound); } }
                 else if (timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { if (checkTime >= 1 && checkTime <= 3) { playSound(beepSound); } }
            }
            updateTimerDisplay(remainingTime); if (remainingTime < 0) { handleTimerEnd(); }
        }, 1000);
    }

    function handleTimerEnd() {
        if (appMode !== AppMode.WORKOUT) return; stopTimerInterval(); timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;
        const endedState = timerState; // Mistä tultiin?

        if (endedState === TimerState.RUNNING_WORK) {
            const currentEx = activeSteps[activeIndex]; if (!currentEx) { resetAppState(); return; }
            const isLastEx = activeIndex === activeSteps.length - 1; const isLastR = currentWorkoutRound >= totalWorkoutRounds;
            const restDur = currentEx.restTime || 0;
            if (isLastEx) { if (isLastR) { moveToNextWorkoutPhase('finished'); } else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) { startTimerPhaseInternal('round_rest', roundRest); } else { moveToNextWorkoutPhase('next_round_no_rest'); } } }
            else { if (restDur > 0) { startTimerPhaseInternal('rest', restDur); } else { moveToNextWorkoutPhase('next_exercise_no_rest'); } }
        } else if (endedState === TimerState.RUNNING_REST || endedState === TimerState.RUNNING_ROUND_REST) {
            clearNextUpHighlight(); moveToNextWorkoutPhase(endedState === TimerState.RUNNING_ROUND_REST ? 'next_round' : 'next_exercise');
        }
    }

    function moveToNextWorkoutPhase(trigger) {
         if (appMode !== AppMode.WORKOUT) return;
         if (trigger === 'next_round' || trigger === 'next_round_no_rest') { currentWorkoutRound++; activeIndex = 0; }
         else if (trigger === 'next_exercise' || trigger === 'next_exercise_no_rest') { activeIndex++; }
         else if (trigger === 'finished') {} else { console.warn("Unknown trigger:", trigger); }

         if (currentWorkoutRound > totalWorkoutRounds) {
              timerState = TimerState.FINISHED; updateControlButtons(); removeBodyLock(); clearNextUpHighlight();
              itemNameH2.textContent = "Treeni Valmis!"; itemDescriptionP.textContent = "Hyvää työtä!";
              itemImageImg.style.display = 'none'; updateTimerDisplay(0, "Valmis"); updateRoundDisplay();
              infoAreaNotes.textContent = `Kaikki ${totalWorkoutRounds} kierrosta tehty!`;
              if(isAudioUnlocked) playSound(beepSound); appMode = AppMode.IDLE; updateControlButtons();
         } else if (activeIndex < activeSteps.length) {
              updateRoundDisplay(); const nextEx = activeSteps[activeIndex];
              startTimerPhaseInternal('work', nextEx.workTime); // Aloita seuraava työ
         } else { console.error("State error."); resetAppState(); }
     }

    // --- RUTIINIEN KONTROLLIT ---
    function startSelectedRoutine(type) {
         if (appMode !== AppMode.IDLE || !selectedRoutineInfo.type || selectedRoutineInfo.type !== type) { console.warn("Routine not selected or app busy."); return; }
         activeSteps = selectedRoutineInfo.data?.steps || []; if (activeSteps.length === 0) { console.warn("Routine empty."); return; }
         appMode = type === 'warmup' ? AppMode.WARMUP : AppMode.COOLDOWN; activeIndex = 0; timerState = TimerState.IDLE;
         currentRoutine = selectedRoutineInfo.data; // Tallenna rutiinidata
         console.log(`Starting routine: ${type}`);
         hideSelectionArea(); // Piilota valikko
         populateStepsList(); displayItem(activeIndex); updateControlButtons(); addBodyLock(); updateRoundDisplay(); scrollToActiveDisplay();
    }
    function stopRoutine() { if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; console.log(`Stopping ${appMode}.`); removeBodyLock(); resetAppState(false); }
    function navigateRoutineStep(direction) { if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; const newIndex = (direction === 'next') ? activeIndex + 1 : activeIndex - 1; if (newIndex >= 0 && newIndex < activeSteps.length) { activeIndex = newIndex; displayItem(activeIndex); updateControlButtons(); } else if (direction === 'next' && newIndex >= activeSteps.length) { console.log(`${appMode} finished.`); stopRoutine(); } }

    // --- YLEISET KONTROLLIT ---
    function generalStop() { if (appMode === AppMode.WORKOUT) stopWorkoutInternal(); else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) stopRoutine(); }
    function generalPauseResume() { if (appMode === AppMode.WORKOUT) pauseResumeTimerInternal(); }
    function generalNext() { if (appMode === AppMode.WORKOUT) { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (activeIndex < activeSteps.length - 1) jumpToItem(activeIndex + 1); } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { navigateRoutineStep('next'); } }
    function generalPrev() { if (appMode === AppMode.WORKOUT) { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (activeIndex > 0) jumpToItem(activeIndex - 1); } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { navigateRoutineStep('prev'); } }

    // --- Yleiset UI-funktiot ---
    function updateTimerDisplay(timeInSeconds, forceLabel = null) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0"); const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`; let label = "Odottamassa...";
        if (forceLabel) { label = forceLabel; } else if (appMode === AppMode.WORKOUT) {
            if (timerState === TimerState.RUNNING_WORK) label = "Työaika"; else if (timerState === TimerState.RUNNING_REST) label = "Lepo"; else if (timerState === TimerState.RUNNING_ROUND_REST) label = "Kierroslepo"; else if (timerState === TimerState.PAUSED) label = "Tauko"; else if (timerState === TimerState.FINISHED) label = "Valmis";
        } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { label = "Seuraa ohjeita"; }
        timerLabelP.textContent = label;
    }
    function updateRoundDisplay() { if (appMode === AppMode.WORKOUT && timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && totalWorkoutRounds > 0) { roundInfoP.textContent = `Kierros ${currentWorkoutRound} / ${totalWorkoutRounds}`; } else { roundInfoP.textContent = ''; } }
    function updateControlButtons() { pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none'; prevBtn.disabled = true; nextBtn.disabled = true; if (appMode === AppMode.IDLE) {} else if (appMode === AppMode.WORKOUT) { const isIdle = timerState === TimerState.IDLE; const isRunning = timerState === TimerState.RUNNING_WORK || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const isPaused = timerState === TimerState.PAUSED; const isFinished = timerState === TimerState.FINISHED; pauseResumeBtn.style.display = 'inline-block'; pauseResumeBtn.disabled = isIdle || isFinished; if (isPaused) { pauseResumeBtn.textContent = '▶ Jatka'; pauseResumeBtn.classList.add('paused'); } else { pauseResumeBtn.textContent = '⏸ Tauko'; pauseResumeBtn.classList.remove('paused'); } stopBtn.style.display = 'inline-block'; stopBtn.disabled = isIdle || isFinished; const canNavWorkout = activeSteps.length > 0 && (isIdle || isFinished); prevBtn.disabled = !canNavWorkout || activeIndex <= 0; nextBtn.disabled = !canNavWorkout || activeIndex >= activeSteps.length - 1; } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { stopBtn.style.display = 'inline-block'; stopBtn.disabled = false; nextStepBtn.style.display = 'inline-block'; nextStepBtn.disabled = activeIndex >= activeSteps.length - 1; nextStepBtn.textContent = (activeIndex >= activeSteps.length - 1) ? '✅ Valmis' : 'Seuraava Vaihe ⏭'; const canNavRoutine = activeSteps.length > 0; prevBtn.disabled = !canNavRoutine || activeIndex <= 0; nextBtn.disabled = !canNavRoutine || activeIndex >= activeSteps.length - 1; } }
    function resetAppState(resetLevelHighlight = true) {
         // Varmista että globaalit muuttujat on alustettu ennen käyttöä
         if (!selectedWorkoutInfo) selectedWorkoutInfo = { week: null, level: '2' };

         stopTimerInterval(); removeBodyLock(); appMode = AppMode.IDLE; activeSteps = []; activeIndex = 0;
         currentWorkoutRound = 1; totalWorkoutRounds = 1; currentRoutine = null; currentRoutineSteps = [];
         remainingTime = 0; timerState = TimerState.IDLE; pausedStateBeforePause = null;
         selectedRoutineInfo = { type: null, data: null }; // Nollaa myös rutiinivalinta
         // Nollaa treenivalinta, mutta säilytä taso
         selectedWorkoutInfo = { week: null, level: selectedWorkoutInfo.level };
         // Nollaa myös globaali treenin tila
         currentWorkoutInfo = { ...selectedWorkoutInfo, rounds: 0, restBetweenRounds: 0, focus: '' };

         itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none';
         updateInfoAreaDisplay(); populateStepsList(); updateTimerDisplay(0,"Odottamassa..."); updateRoundDisplay();
         timerDiv.classList.remove('timer-resting', 'timer-paused'); highlightCurrentStep(); clearNextUpHighlight();
         updateControlButtons(); document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
         if (resetLevelHighlight) { levelButtonsContainer?.querySelectorAll('.level-button')?.forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedWorkoutInfo.level); }); }
         highlightRoutineButton(null); updateStartWorkoutButtonState(); console.log("App state reset.");
    }
    function highlightNextExercise() { clearNextUpHighlight(); if (appMode !== AppMode.WORKOUT) return; const currentSubState = timerState; let nextIdx = -1; if (currentSubState === TimerState.RUNNING_REST) nextIdx = activeIndex + 1; else if (currentSubState === TimerState.RUNNING_ROUND_REST) nextIdx = 0; if (nextIdx >= 0 && nextIdx < activeSteps.length) { const item = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`); if (item) item.classList.add('next-up'); } }
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }
    function addBodyLock() { document.body.classList.add('timer-active'); }
    function removeBodyLock() { document.body.classList.remove('timer-active'); }
    function toggleTrainingSelectionVisibility() { selectionArea.classList.toggle('hidden'); toggleSelectionBtn.textContent = selectionArea.classList.contains('hidden') ? "Valinnat ⯆" : "Piilota Valinnat ⯅"; }
    function scrollToActiveDisplay() { activeDisplaySection?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    function attemptAudioUnlock(callback) { if (isAudioUnlocked) { callback(); return; } console.log("Attempting audio unlock..."); beepSound.volume = 0.001; beepSound.play().then(() => { beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; isAudioUnlocked = true; console.log("Audio unlocked."); callback(); }).catch(err => { console.warn("Audio unlock fail:", err); beepSound.volume = 1.0; isAudioUnlocked = true; callback(); }); }

    // --- Event Listeners ---
    function addEventListeners() {
        toggleSelectionBtn?.addEventListener('click', toggleTrainingSelectionVisibility);
        startWarmupBtn?.addEventListener('click', () => startSelectedRoutine('warmup'));
        startCooldownBtn?.addEventListener('click', () => startSelectedRoutine('cooldown'));
        startWorkoutBtn?.addEventListener('click', startSelectedWorkout);
        pauseResumeBtn?.addEventListener('click', generalPauseResume);
        stopBtn?.addEventListener('click', generalStop);
        nextStepBtn?.addEventListener('click', generalNext); // Käyttää samaa kuin Next-nuoli rutiineille
        prevBtn?.addEventListener('click', generalPrev);
        nextBtn?.addEventListener('click', generalNext);
    }

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
