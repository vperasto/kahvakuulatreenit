// app.js (Korjattu fEx -> fullEx virhe handleWeekSelectissä)

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
    let currentRoutine = null;
    let currentRoutineSteps = [];
    let currentRoutineIndex = 0;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' };
    let timerState = TimerState.IDLE;
    let pausedSubState = null;
    let isAudioUnlocked = false;

    // --- Datan Alustus ---
    async function loadAppData() {
        console.log("Loading data...");
        try {
            const response = await fetch('data/exercises.json'); // Varmista oikea JSON
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            fullData = await response.json();
            console.log("Data loaded.");
            if (!fullData || !fullData.exercises || !fullData.kettlebellProgram11Weeks || !fullData.warmup || !fullData.cooldown) {
                console.error("Essential data sections missing."); itemNameH2.textContent = "Virheellinen datatiedosto."; return;
            }
            populateWeekSelectors();
            addLevelButtonListeners();
            populateSingleRoutineButton('warmup');
            populateSingleRoutineButton('cooldown');
            resetAppState();
        } catch (error) {
            console.error("Data load/process error:", error); itemNameH2.textContent = "Virhe ladattaessa dataa."; resetAppState();
        }
    }

    // --- UI Populointi & Kuuntelijat ---
    function populateWeekSelectors() {
         if (!fullData || !fullData.kettlebellProgram11Weeks) return; weekButtonsContainer.innerHTML = '';
         const totalWeeks = 11; for (let i = 1; i <= totalWeeks; i++) { const btn = document.createElement('button'); btn.textContent = `Viikko ${i}`; btn.classList.add('week-button'); btn.dataset.weekNumber = i; btn.addEventListener('click', () => handleWeekSelect(i)); weekButtonsContainer.appendChild(btn); }
    }
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button'); buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }
    function populateSingleRoutineButton(type) {
        const container = (type === 'warmup') ? warmupButtonsContainer : cooldownButtonsContainer; const routineData = fullData[type];
        if (!container || !routineData || !routineData.steps) { container.innerHTML = `<p>Ei ${type === 'warmup' ? 'lämmittelyä' : 'jäähdyttelyä'} saatavilla.</p>`; return; }
        container.innerHTML = ''; const button = document.createElement('button'); button.textContent = routineData.description || (type === 'warmup' ? "Lämmittely" : "Jäähdyttely"); button.classList.add('routine-button'); button.dataset.routineType = type; button.addEventListener('click', () => handleRoutineSelect(type)); container.appendChild(button);
    }

    // --- Valintojen Käsittelijät ---
    function handleLevelSelect(selectedLevel) {
         if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`); currentWorkoutInfo.level = selectedLevel;
         levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
         if (currentWorkoutInfo.week !== null && appMode === AppMode.IDLE) { handleWeekSelect(currentWorkoutInfo.week); } else { updateInfoAreaDisplay(); }
    }
    function handleWeekSelect(weekNumber) {
          if (appMode !== AppMode.IDLE) { console.warn("Cannot select week while another mode is active."); return; }
          console.log(`Handling selection for Week: ${weekNumber}`); resetAppState(false);
          if (!fullData || !fullData.kettlebellProgram11Weeks || !fullData.exercises) { console.error("Essential data missing."); resetAppState(); return; }
          const selectedPhaseIndex = fullData.kettlebellProgram11Weeks.phases.findIndex(phase => phase.phaseInfo?.weeks?.includes(weekNumber));
          if (selectedPhaseIndex === -1) { console.error(`Phase not found`); resetAppState(); itemNameH2.textContent = `Vaihetta ei löytynyt.`; return; }
          const selectedPhase = fullData.kettlebellProgram11Weeks.phases[selectedPhaseIndex];
          const currentLevel = currentWorkoutInfo.level; const levelData = selectedPhase.levels?.[currentLevel];
          if (!levelData?.timeBased) { console.error(`Level data missing`); resetAppState(); itemNameH2.textContent = `Tason ${currentLevel} tietoja ei löytynyt.`; return; }
          const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;
          let phaseExercisesList = [];
          if (selectedPhaseIndex === 2 && selectedPhase.exampleWeeklyExercises) { phaseExercisesList = selectedPhase.exampleWeeklyExercises; }
          else if (selectedPhase.weeklyExercises) { phaseExercisesList = selectedPhase.weeklyExercises; }
          else { console.error(`Exercises missing`); resetAppState(); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return; }

          const mappedExercises = phaseExercisesList.map(phaseEx => {
              if (!phaseEx?.exerciseId) return null;
              const fullEx = fullData.exercises.find(ex => ex.id === phaseEx.exerciseId); // Etsi oikealla nimellä
              if (!fullEx) { console.warn(`Exercise definition not found for ID: ${phaseEx.exerciseId}`); return null; }
              // ** KORJATTU KOHTA: Käytetään 'fullEx' **
              return {
                  ...fullEx,
                  displayTitle: phaseEx.displayTitle || fullEx.name,
                  notes: phaseEx.notes || '',
                  workTime: workTime,
                  restTime: restTime
              };
          }).filter(ex => ex !== null);

          if (mappedExercises.length === 0) { console.error(`No valid exercises mapped`); resetAppState(); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return; }

          currentWorkoutExercises = mappedExercises; currentWorkoutIndex = 0; currentWorkoutRound = 1;
          currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, rounds: parseInt(selectedPhase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(selectedPhase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, focus: selectedPhase.phaseInfo.focus || '' };
          currentRoutine = null; currentRoutineSteps = []; currentRoutineIndex = 0; highlightRoutineButton(null);
          console.log(`Week ${weekNumber} selected.`);
          updateInfoAreaDisplay(); populateStepsList(); displayItem(currentWorkoutIndex);
          updateControlButtons(); highlightWeekButton(weekNumber); updateRoundDisplay();
    }

    function handleRoutineSelect(type) {
        if (appMode !== AppMode.IDLE) { console.warn("Cannot select routine."); return; }
        console.log(`Handling selection for ${type}`); resetAppState(false);
        const routineData = fullData[type]; if (!routineData || !routineData.steps) { console.error(`Routine data missing`); return; }
        currentRoutine = routineData; currentRoutineSteps = routineData.steps; currentRoutineIndex = 0;
        currentWorkoutInfo = { ...currentWorkoutInfo, week: null, rounds: 0, restBetweenRounds: 0, focus: '' };
        currentWorkoutExercises = []; currentWorkoutIndex = 0; currentWorkoutRound = 1; highlightWeekButton(null);
        console.log(`${type} selected.`);
        updateInfoAreaDisplay(); populateStepsList(); displayItem(currentRoutineIndex);
        updateControlButtons(); highlightRoutineButton(type);
    }

    // --- UI Päivitysfunktiot ---
    function highlightWeekButton(weekNumber) { document.querySelectorAll('.week-button').forEach(btn => { btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber); }); }
    function highlightRoutineButton(activeType = null) { const containers = [warmupButtonsContainer, cooldownButtonsContainer]; containers.forEach(container => { container?.querySelectorAll('.routine-button')?.forEach(btn => { const isActive = btn.dataset.routineType === activeType; btn.classList.toggle('active', isActive); }); }); startWarmupBtn.disabled = !document.querySelector('#warmup-buttons-container .routine-button.active'); startCooldownBtn.disabled = !document.querySelector('#cooldown-buttons-container .routine-button.active'); }
    function updateInfoAreaDisplay() { if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { infoAreaTitle.textContent = (appMode === AppMode.WARMUP ? "Lämmittely" : "Jäähdyttely"); infoAreaNotes.textContent = currentRoutine?.description || `Valittu ${appMode === AppMode.WARMUP ? 'lämmittely' : 'jäähdyttely'}.`; } else if (appMode === AppMode.WORKOUT && currentWorkoutInfo.week !== null) { infoAreaTitle.textContent = `Viikko ${currentWorkoutInfo.week} Tiedot`; const levelDesc = fullData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || ''; const focus = currentWorkoutInfo.focus ? `\nFokus: ${currentWorkoutInfo.focus}` : ''; infoAreaNotes.textContent = `Taso: ${currentWorkoutInfo.level} (${levelDesc})${focus}`; } else { infoAreaTitle.textContent = "Tiedot"; infoAreaNotes.textContent = "Valitse toiminto yläpuolelta."; } if (!infoAreaNotes.textContent.trim()){ infoAreaNotes.textContent = "Ei lisätietoja."; } }
    function populateStepsList() { stepsListUl.innerHTML = ''; let items = []; let title = "Vaiheet / Harjoitukset"; if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { items = currentRoutineSteps; title = (appMode === AppMode.WARMUP ? "Lämmittely" : "Jäähdyttely") + " Vaiheet"; } else if (appMode === AppMode.WORKOUT) { items = currentWorkoutExercises; title = currentWorkoutInfo.week ? `Viikko ${currentWorkoutInfo.week} Harjoitukset` : "Treenin Harjoitukset"; } stepsListTitle.textContent = title; if (items.length === 0) { stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>'; return; } items.forEach((item, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${item.displayTitle || item.name}`; li.dataset.index = i; li.classList.add('step-item'); li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToItem(i); }); stepsListUl.appendChild(li); }); }
    function displayItem(index) { let item = null; let type = 'step'; if (appMode === AppMode.WORKOUT) { if (index < 0 || index >= currentWorkoutExercises.length) return; item = currentWorkoutExercises[index]; type = 'exercise'; } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { if (index < 0 || index >= currentRoutineSteps.length) return; item = currentRoutineSteps[index]; } else { itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none'; return; } if (!item) return; itemNameH2.textContent = item.displayTitle || item.name; itemDescriptionP.textContent = type === 'exercise' ? `${item.description || ''}${item.notes ? `\n\nHuom: ${item.notes}` : ''}` : (item.description || ''); if (type === 'exercise' && item.image) { itemImageImg.src = item.image; itemImageImg.alt = item.displayTitle || item.name; itemImageImg.style.display = 'block'; } else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; } if (type === 'exercise' && (timerState === TimerState.IDLE || timerState === TimerState.FINISHED)) { remainingTime = item.workTime || 0; updateTimerDisplay(remainingTime, "Työaika"); } else if (type === 'step') { updateTimerDisplay(0, "Seuraa ohjeita"); } highlightCurrentStep(); }
    function jumpToItem(index) { if (appMode === AppMode.WORKOUT) { if (index >= 0 && index < currentWorkoutExercises.length) { stopTimer(); currentWorkoutIndex = index; currentWorkoutRound = 1; timerState = TimerState.IDLE; displayItem(currentWorkoutIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { if (index >= 0 && index < currentRoutineSteps.length) { currentRoutineIndex = index; timerState = TimerState.IDLE; displayItem(currentRoutineIndex); updateControlButtons(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } } }
    function highlightCurrentStep() { const items = stepsListUl.querySelectorAll('li.step-item'); let currentIdx = -1; if(appMode === AppMode.WORKOUT) currentIdx = currentWorkoutIndex; else if(appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) currentIdx = currentRoutineIndex; items.forEach((item) => { const idx = parseInt(item.dataset.index, 10); const isActive = !isNaN(idx) && idx === currentIdx; item.classList.toggle('active', isActive); if (isActive && (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight)) { item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }); if (currentIdx === -1) { items.forEach(item => item.classList.remove('active')); } }

    // --- Ajastimen toiminnot ---
    function startPauseResumeWorkout() { if (timerState === TimerState.IDLE && appMode === AppMode.WORKOUT) { startWorkoutInternal(); } else if ((timerState === TimerState.RUNNING || timerState === TimerState.PAUSED) && appMode === AppMode.WORKOUT) { pauseResumeTimerInternal(); } else { console.warn("Cannot start/pause/resume."); } }
    function startWorkoutInternal() { if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE || appMode !== AppMode.WORKOUT) return; if (!isAudioUnlocked) { console.log("Attempting audio unlock..."); beepSound.volume = 0.001; beepSound.play().then(() => { beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; isAudioUnlocked = true; console.log("Audio unlocked."); proceedWithStart(); }).catch(err => { console.warn("Audio unlock fail:", err); beepSound.volume = 1.0; isAudioUnlocked = true; proceedWithStart(); }); } else { proceedWithStart(); } }
    function proceedWithStart() { console.log("Starting workout..."); currentWorkoutIndex = 0; currentWorkoutRound = 1; updateRoundDisplay(); displayItem(currentWorkoutIndex); addBodyLock(); startTimerPhaseInternal('work', currentWorkoutExercises[currentWorkoutIndex].workTime); }
    function pauseResumeTimerInternal() { if (appMode !== AppMode.WORKOUT) return; if (timerState === TimerState.RUNNING) { pausedSubState = determineSubStateFromLabel(); stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Paused"); timerDiv.classList.add('timer-paused'); updateControlButtons(); updateTimerDisplay(remainingTime, "Tauko"); } else if (timerState === TimerState.PAUSED) { console.log("Resumed"); timerState = TimerState.RUNNING; const wasResting = pausedSubState === 'rest' || pausedSubState === 'round_rest'; pausedSubState = null; runTimerInterval(); timerDiv.classList.remove('timer-paused'); if(wasResting){ timerDiv.classList.add('timer-resting'); highlightNextExercise(); } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); } updateControlButtons(); updateTimerDisplay(remainingTime); } }
    function determineSubStateFromLabel() { const label = timerLabelP.textContent.toLowerCase(); if (label.includes("lepo")) return 'rest'; if (label.includes("kierroslepo")) return 'round_rest'; if (label.includes("työaika")) return 'work'; return null; }
    function stopWorkoutInternal() { if (appMode !== AppMode.WORKOUT) return; stopTimer(); console.log("Stopped"); clearNextUpHighlight(); removeBodyLock(); currentWorkoutRound = 1; pausedSubState = null; if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentWorkoutIndex]) { const currentEx = currentWorkoutExercises[currentWorkoutIndex]; updateTimerDisplay(currentEx.workTime, "Työaika"); displayItem(currentWorkoutIndex); } else { resetAppState(); } updateRoundDisplay(); updateControlButtons(); }
    function stopTimer() { stopTimerInterval(); timerState = TimerState.IDLE; pausedSubState = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); console.log("Timer stopped, state IDLE."); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
    function startTimerPhaseInternal(subState, duration) {
        stopTimerInterval(); timerState = TimerState.RUNNING; remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused'); clearNextUpHighlight();
        let label = "Käynnissä..."; // Oletus
        if (subState === 'work') { displayItem(currentWorkoutIndex); highlightCurrentStep(); label = "Työaika"; }
        else if (subState === 'rest') { timerDiv.classList.add('timer-resting'); const nextIdx = currentWorkoutIndex + 1; if (nextIdx < currentWorkoutExercises.length) { displayItem(nextIdx); highlightNextExercise(); } else { displayItem(currentWorkoutIndex); highlightCurrentStep(); } label = "Lepo"; }
        else if (subState === 'round_rest') { timerDiv.classList.add('timer-resting'); if (currentWorkoutExercises.length > 0) { displayItem(0); highlightNextExercise(0); } label = "Kierroslepo"; }
        console.log(`Starting timer phase: ${subState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime, label); // Päivitä label heti
        updateControlButtons(); updateRoundDisplay();
        if (remainingTime > 0) { runTimerInterval(); } else { handleTimerEnd(); }
    }
    function runTimerInterval() { if (timerInterval || appMode !== AppMode.WORKOUT) return; timerInterval = setInterval(() => { if (timerState === TimerState.PAUSED) return; remainingTime--; const checkTime = remainingTime + 1; const subState = determineSubStateFromLabel(); if(isAudioUnlocked){ if (subState === 'work') { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) { playSound(beepSound); } } else if (subState === 'rest' || subState === 'round_rest') { if (checkTime >= 1 && checkTime <= 3) { playSound(beepSound); } } } updateTimerDisplay(remainingTime); if (remainingTime < 0) { handleTimerEnd(); } }, 1000); }
    function handleTimerEnd() { if (appMode !== AppMode.WORKOUT) return; stopTimerInterval(); timerDiv.classList.remove('timer-resting'); if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return; const endedSubState = determineSubStateFromLabel(); if (endedSubState === 'work') { const currentEx = currentWorkoutExercises[currentWorkoutIndex]; if (!currentEx) { resetAppState(); return; } const isLastEx = currentWorkoutIndex === currentWorkoutExercises.length - 1; const isLastR = currentWorkoutRound >= currentWorkoutInfo.rounds; const restDur = currentEx.restTime || 0; if (isLastEx) { if (isLastR) { moveToNextPhase('finished'); } else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) { startTimerPhaseInternal('round_rest', roundRest); } else { moveToNextPhase('next_round_no_rest'); } } } else { if (restDur > 0) { startTimerPhaseInternal('rest', restDur); } else { moveToNextPhase('next_exercise_no_rest'); } } } else if (endedSubState === 'rest' || endedSubState === 'round_rest') { clearNextUpHighlight(); moveToNextPhase(endedSubState === 'round_rest' ? 'next_round' : 'next_exercise'); } }
    function moveToNextPhase(trigger) { if (appMode !== AppMode.WORKOUT) return; if (trigger === 'next_round' || trigger === 'next_round_no_rest') { currentWorkoutRound++; currentExerciseIndex = 0; } else if (trigger === 'next_exercise') { currentExerciseIndex++; } else if (trigger === 'next_exercise_no_rest'){ currentExerciseIndex++; } else if (trigger === 'finished') {} else { console.warn("Unknown trigger:", trigger); } if (currentWorkoutRound > currentWorkoutInfo.rounds) { timerState = TimerState.FINISHED; updateControlButtons(); removeBodyLock(); clearNextUpHighlight(); itemNameH2.textContent = "Treeni Valmis!"; itemDescriptionP.textContent = "Hyvää työtä!"; itemImageImg.style.display = 'none'; updateTimerDisplay(0, "Valmis"); updateRoundDisplay(); infoAreaNotes.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty!`; if(isAudioUnlocked) playSound(beepSound); appMode = AppMode.IDLE; updateControlButtons(); } else if (currentExerciseIndex < currentWorkoutExercises.length) { updateRoundDisplay(); const nextEx = currentWorkoutExercises[currentExerciseIndex]; startTimerPhaseInternal('work', nextEx.workTime); } else { console.error("State error."); resetAppState(); } }

    // --- Lämmittelyn/Jäähdyttelyn toiminnot ---
    function startRoutine(type) { if (!fullData[type] || appMode !== AppMode.IDLE) { console.warn("Cannot start routine."); return; } currentRoutine = fullData[type]; currentRoutineSteps = currentRoutine.steps || []; if (currentRoutineSteps.length === 0) { console.warn("Routine empty."); return; } appMode = (type === 'warmup') ? AppMode.WARMUP : AppMode.COOLDOWN; currentRoutineIndex = 0; timerState = TimerState.IDLE; console.log(`Starting ${type}: ${currentRoutine.description}`); addBodyLock(); updateInfoAreaDisplay(); populateStepsList(); displayItem(currentRoutineIndex); updateControlButtons(); highlightRoutineButton(type); }
    function stopRoutine() { if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; console.log(`Stopping ${appMode}.`); removeBodyLock(); resetAppState(false); }
    function navigateRoutineStep(direction) { if (appMode !== AppMode.WARMUP && appMode !== AppMode.COOLDOWN) return; const newIndex = (direction === 'next') ? currentRoutineIndex + 1 : currentRoutineIndex - 1; if (newIndex >= 0 && newIndex < currentRoutineSteps.length) { currentRoutineIndex = newIndex; displayItem(currentRoutineIndex); updateControlButtons(); } else if (direction === 'next' && newIndex >= currentRoutineSteps.length) { console.log(`${appMode} finished.`); stopRoutine(); } }
    function markStepDone() { if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) navigateRoutineStep('next'); }

    // --- Yleiset UI-funktiot ---
    function updateTimerDisplay(timeInSeconds, forceLabel = null) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0"); const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`; let label = "Odottamassa..."; if (forceLabel) { label = forceLabel; } else if (appMode === AppMode.WORKOUT) { const subState = determineSubStateFromLabel(); if (timerState === TimerState.RUNNING) { if (subState === 'work') label = "Työaika"; else if (subState === 'rest') label = "Lepo"; else if (subState === 'round_rest') label = "Kierroslepo"; else label = "Käynnissä"; } else if (timerState === TimerState.PAUSED) { label = "Tauko"; } else if (timerState === TimerState.FINISHED) { label = "Valmis"; } } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { label = "Seuraa ohjeita"; } timerLabelP.textContent = label;
    }
    function updateRoundDisplay() { if (appMode === AppMode.WORKOUT && timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0) { roundInfoP.textContent = `Kierros ${currentWorkoutRound} / ${currentWorkoutInfo.rounds}`; } else { roundInfoP.textContent = ''; } }
    function updateControlButtons() { startPauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; markStepDoneBtn.style.display = 'none'; prevBtn.disabled = true; nextBtn.disabled = true; if (appMode === AppMode.IDLE) { if (currentWorkoutInfo.week !== null) { startPauseResumeBtn.style.display = 'inline-block'; startPauseResumeBtn.textContent = '▶ Aloita Treeni'; startPauseResumeBtn.disabled = false; startPauseResumeBtn.classList.remove('paused'); } } else if (appMode === AppMode.WORKOUT) { const isIdle = timerState === TimerState.IDLE; const isRunning = timerState === TimerState.RUNNING; const isPaused = timerState === TimerState.PAUSED; const isFinished = timerState === TimerState.FINISHED; startPauseResumeBtn.style.display = 'inline-block'; startPauseResumeBtn.disabled = isFinished; if (isIdle) { startPauseResumeBtn.textContent = '▶ Aloita Treeni'; startPauseResumeBtn.classList.remove('paused'); } else if (isRunning) { startPauseResumeBtn.textContent = '⏸ Tauko'; startPauseResumeBtn.classList.remove('paused'); } else if (isPaused) { startPauseResumeBtn.textContent = '▶ Jatka'; startPauseResumeBtn.classList.add('paused'); } else { startPauseResumeBtn.textContent = 'Valmis'; startPauseResumeBtn.classList.remove('paused'); } stopBtn.style.display = 'inline-block'; stopBtn.disabled = isIdle || isFinished; const canNavWorkout = currentWorkoutExercises.length > 0 && (isIdle || isFinished); prevBtn.disabled = !canNavWorkout || currentWorkoutIndex <= 0; nextBtn.disabled = !canNavWorkout || currentWorkoutIndex >= currentWorkoutExercises.length - 1; } else if (appMode === AppMode.WARMUP || appMode === AppMode.COOLDOWN) { markStepDoneBtn.style.display = 'inline-block'; stopBtn.style.display = 'inline-block'; stopBtn.disabled = false; const canNavRoutine = currentRoutineSteps.length > 0; prevBtn.disabled = !canNavRoutine || currentRoutineIndex <= 0; nextBtn.disabled = !canNavRoutine || currentRoutineIndex >= currentRoutineSteps.length - 1; } }
    function resetAppState(resetLevelHighlight = true) { stopTimerInterval(); removeBodyLock(); appMode = AppMode.IDLE; currentWorkoutExercises = []; currentWorkoutIndex = 0; currentWorkoutRound = 1; currentRoutine = null; currentRoutineSteps = []; currentRoutineIndex = 0; remainingTime = 0; timerState = TimerState.IDLE; pausedSubState = null; currentWorkoutInfo = { ...currentWorkoutInfo, week: null, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' }; itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = ""; itemImageImg.style.display = 'none'; itemImageImg.src = ''; updateInfoAreaDisplay(); populateStepsList(); updateTimerDisplay(0,"Odottamassa..."); updateRoundDisplay(); timerDiv.classList.remove('timer-resting', 'timer-paused'); highlightCurrentStep(); clearNextUpHighlight(); updateControlButtons(); document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active')); if (resetLevelHighlight) { levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); }); } highlightRoutineButton(null); console.log("App state reset."); }
    function highlightNextExercise(forceIndex = -1) { clearNextUpHighlight(); let nextIdx = -1; if (forceIndex !== -1) { nextIdx = forceIndex; } else { const sub = determineSubStateFromLabel(); if(sub === 'rest' || sub === 'round_rest') nextIdx = (sub === 'round_rest' ? 0 : currentWorkoutIndex + 1); } if (nextIdx >= 0 && nextIdx < currentWorkoutExercises.length) { const item = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`); if (item) item.classList.add('next-up'); } }
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }
    function addBodyLock() { document.body.classList.add('timer-active'); }
    function removeBodyLock() { document.body.classList.remove('timer-active'); }
    function toggleTrainingSelectionVisibility() { selectionArea.classList.toggle('hidden'); toggleSelectionBtn.textContent = selectionArea.classList.contains('hidden') ? "Valinnat ⯆" : "Piilota Valinnat ⯅"; }

    // --- Event Listeners ---
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
