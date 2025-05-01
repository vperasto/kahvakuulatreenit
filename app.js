// app.js (Koko tiedosto, lisätty audio context unlock yritys startBtn-kuuntelijaan)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    const workoutNotesP = document.getElementById('workout-notes');
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const roundInfoP = document.getElementById('round-info');
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const stopBtn = document.getElementById('stop-btn');

    // --- Ääniobjekti ---
    const beepSound = new Audio('audio/beep.mp3'); // Varmista polku!
    beepSound.load();

    // Funktio äänen toistamiseen
    function playSound(audioElement) {
        if (!audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        // Toista ääni ja aseta volyymi takaisin 1:een jos se oli muutettu unlockissa
        audioElement.volume = 1.0;
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    }

    // --- Sovelluksen tila ---
    let fullProgramData = null;
    let currentWorkoutExercises = [];
    let currentWorkoutInfo = {
        week: null, phaseIndex: null, level: '2', rounds: 0, restBetweenRounds: 0, notes: '', focus: ''
    };
    let currentExerciseIndex = 0;
    let currentRound = 1;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished' };
    let timerState = TimerState.IDLE;
    let pausedState = null;
    let isAudioUnlocked = false; // UUSI: Seuraa onko ääni "avattu"

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json'); // TAI kettlebell_program.json
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) {
                 console.error("Loaded data does not seem to contain the 11-week program structure.");
                 exerciseNameH2.textContent = "Virheellinen ohjelmadata."; return;
             }
            populateWeekSelectors();
            addLevelButtonListeners();
            resetWorkoutState();
        } catch (error) {
            console.error("Could not load or process program data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa treeniohjelmaa.";
             resetWorkoutState();
        }
    }

    // --- UI Populointi ja Kuuntelijat ---
    function populateWeekSelectors() {
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return;
        weekButtonsContainer.innerHTML = ''; const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button'); button.textContent = `Viikko ${i}`; button.classList.add('week-button');
            button.dataset.weekNumber = i; button.addEventListener('click', () => handleWeekSelect(i));
            weekButtonsContainer.appendChild(button);
        }
    }
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`); currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
        if (currentWorkoutInfo.week !== null) { handleWeekSelect(currentWorkoutInfo.week); } else { updateWorkoutNotesDisplay(); }
    }
    function handleWeekSelect(weekNumber) {
        console.log(`Handling selection for Week: ${weekNumber}`); resetWorkoutState(false);
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) { console.error("Data missing."); resetWorkoutState(); return; }
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) { console.error(`Phase not found.`); resetWorkoutState(); exerciseNameH2.textContent = `Vaihetta ei löytynyt.`; return; }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx]; const level = currentWorkoutInfo.level;
        const levelData = phase.levels?.[level]; if (!levelData?.timeBased) { console.error(`Level data not found.`); resetWorkoutState(); exerciseNameH2.textContent = `Tason ${level} tietoja ei löytynyt.`; return; }
        const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;
        let exerciseListSource = []; if (phaseIdx === 2 && phase.exampleWeeklyExercises) { exerciseListSource = phase.exampleWeeklyExercises; } else if (phase.weeklyExercises) { exerciseListSource = phase.weeklyExercises; } else { console.error(`No exercises.`); resetWorkoutState(); exerciseNameH2.textContent = "Harjoituslistaa ei löytynyt."; return; }
        const mappedEx = exerciseListSource.map(pEx => { if (!pEx?.exerciseId) return null; const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId); if (!fEx) return null; return { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime }; }).filter(ex => ex !== null);
        if (mappedEx.length === 0) { console.error(`No valid exercises.`); resetWorkoutState(); exerciseNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return; }
        currentWorkoutExercises = mappedEx; currentExerciseIndex = 0; currentRound = 1;
        currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx, rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || '' };
        console.log(`Week ${weekNumber} loaded: ${currentWorkoutExercises.length} exercises, ${currentWorkoutInfo.rounds} rounds.`);
        populateExerciseList(); updateWorkoutNotesDisplay(); displayExercise(currentExerciseIndex); updateButtonStates(); highlightWeekButton(weekNumber); updateRoundDisplay();
    }
     function updateWorkoutNotesDisplay() { const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || ''; const focus = currentWorkoutInfo.focus ? `\nFokus: ${currentWorkoutInfo.focus}` : ''; workoutNotesP.textContent = `Taso: ${currentWorkoutInfo.level} (${levelDesc})${focus}`; if (!workoutNotesP.textContent.trim()){ workoutNotesP.textContent = "Valitse viikko."; } }
    function highlightWeekButton(weekNumber) { document.querySelectorAll('.week-button').forEach(btn => { btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber); }); }
    function populateExerciseList() { exerciseListUl.innerHTML = ''; if (currentWorkoutExercises.length === 0) { exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; return; } currentWorkoutExercises.forEach((ex, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${ex.displayTitle}`; li.dataset.index = i; li.classList.add('exercise-item'); li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToExercise(i); }); exerciseListUl.appendChild(li); }); }
     function jumpToExercise(index) { if (index >= 0 && index < currentWorkoutExercises.length) { stopTimer(); currentExerciseIndex = index; currentRound = 1; timerState = TimerState.IDLE; displayExercise(currentExerciseIndex); updateButtonStates(); clearNextUpHighlight(); removeBodyLock(); updateRoundDisplay(); } }
    function displayExercise(index) { if (index < 0 || index >= currentWorkoutExercises.length || !currentWorkoutExercises[index]) { console.error(`Invalid index: ${index}`); resetWorkoutState(); exerciseNameH2.textContent = "Virhe harj. näyttäessä"; exerciseDescriptionP.textContent = `Harjoitusta ei löytynyt indeksillä ${index}.`; return; } const ex = currentWorkoutExercises[index]; exerciseNameH2.textContent = ex.displayTitle; exerciseDescriptionP.textContent = `${ex.description || ''}${ex.notes ? `\n\nHuom: ${ex.notes}` : ''}`; if (ex.image) { exerciseImageImg.src = ex.image; exerciseImageImg.alt = ex.displayTitle; exerciseImageImg.style.display = 'block'; } else { exerciseImageImg.style.display = 'none'; exerciseImageImg.src = ''; exerciseImageImg.alt = ''; } if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { remainingTime = ex.workTime || 0; updateTimerDisplay(remainingTime); } highlightCurrentExercise(); }

    // --- Ajastimen toiminnot ---
    // MUUTOS: startWorkout siirretty startBtn kuuntelijan sisään unlock-logiikan takia
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
             console.warn("Start conditions not met.");
             return; // Älä tee mitään, jos ei voida aloittaa
        }
        console.log("Starting workout..."); currentExerciseIndex = 0; currentRound = 1; updateRoundDisplay();
        displayExercise(currentExerciseIndex); addBodyLock();
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].workTime);
    }

    function pauseResumeTimer() { if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Paused"); pauseBtn.textContent = "▶ Jatka"; pauseBtn.classList.add('paused'); timerDiv.classList.add('timer-paused'); } else if (timerState === TimerState.PAUSED) { console.log("Resumed"); timerState = pausedState || TimerState.RUNNING_EXERCISE; pausedState = null; runTimerInterval(); pauseBtn.textContent = "⏸ Tauko"; pauseBtn.classList.remove('paused'); timerDiv.classList.remove('timer-paused'); if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){ timerDiv.classList.add('timer-resting'); highlightNextExercise(); } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); } } updateButtonStates(); }
    function stopWorkout() { stopTimer(); console.log("Stopped"); clearNextUpHighlight(); removeBodyLock(); currentRound = 1; pausedState = null; if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentExerciseIndex]) { const currentEx = currentWorkoutExercises[currentExerciseIndex]; updateTimerDisplay(currentEx.workTime); displayExercise(currentExerciseIndex); } else { resetWorkoutState(); } updateRoundDisplay(); updateButtonStates(); }
    function stopTimer() { stopTimerInterval(); timerState = TimerState.IDLE; pausedState = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); console.log("Timer stopped, state IDLE."); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
     function startTimerForPhase(phaseState, duration) { stopTimerInterval(); timerState = phaseState; remainingTime = duration; timerDiv.classList.remove('timer-resting', 'timer-paused'); clearNextUpHighlight(); if (phaseState === TimerState.RUNNING_EXERCISE) { displayExercise(currentExerciseIndex); highlightCurrentExercise(); } else if (phaseState === TimerState.RUNNING_REST) { timerDiv.classList.add('timer-resting'); const nextIdx = currentExerciseIndex + 1; if (nextIdx < currentWorkoutExercises.length) { displayExercise(nextIdx); highlightNextExercise(); } else { displayExercise(currentExerciseIndex); highlightCurrentExercise(); } } else if (phaseState === TimerState.RUNNING_ROUND_REST) { timerDiv.classList.add('timer-resting'); if (currentWorkoutExercises.length > 0) { displayExercise(0); highlightNextExercise(0); } } console.log(`Starting phase: ${phaseState}, Duration: ${duration}`); updateTimerDisplay(remainingTime); updateButtonStates(); updateRoundDisplay(); if (remainingTime > 0) { runTimerInterval(); } else { handleTimerEnd(); } }
    function runTimerInterval() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; remainingTime--;
            // Äänimerkit
            const isWork = timerState === TimerState.RUNNING_EXERCISE; const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1;
            // Soita ääni VAIN jos se on 'unlocked' TAI jos unlock-yritys on meneillään (startBtn painettu)
            if(isAudioUnlocked){
                 if (isWork) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) { playSound(beepSound); } }
                 else if (isRest) { if (checkTime >= 1 && checkTime <= 3) { playSound(beepSound); } }
            }
            updateTimerDisplay(remainingTime); if (remainingTime < 0) { handleTimerEnd(); }
        }, 1000);
    }
    function handleTimerEnd() { stopTimerInterval(); timerDiv.classList.remove('timer-resting'); if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return; const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; if (timerState === TimerState.RUNNING_EXERCISE) { const currentEx = currentWorkoutExercises[currentExerciseIndex]; if (!currentEx) { resetWorkoutState(); return; } const isLastEx = currentExerciseIndex === currentWorkoutExercises.length - 1; const isLastR = currentRound >= currentWorkoutInfo.rounds; const restDur = currentEx.restTime || 0; if (isLastEx) { if (isLastR) { moveToNextPhase(); } else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0; if (roundRest > 0) { startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); } else { moveToNextPhase(); } } } else { if (restDur > 0) { startTimerForPhase(TimerState.RUNNING_REST, restDur); } else { moveToNextPhase(); } } } else if (wasResting) { clearNextUpHighlight(); moveToNextPhase(); } }
     function moveToNextPhase() { const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const comingFromLastExerciseNoRest = timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound < currentWorkoutInfo.rounds && currentWorkoutInfo.restBetweenRounds <= 0; const comingFromLastExerciseBeforeRest = timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound < currentWorkoutInfo.rounds && currentWorkoutInfo.restBetweenRounds > 0; if ((comingFromRest && timerState === TimerState.RUNNING_ROUND_REST) || comingFromLastExerciseNoRest ) { currentRound++; currentExerciseIndex = 0; } else if (comingFromRest && timerState === TimerState.RUNNING_REST) { currentExerciseIndex++; } else if (timerState === TimerState.RUNNING_EXERCISE && !comingFromLastExerciseNoRest && !comingFromLastExerciseBeforeRest) { if(!comingFromRest && currentWorkoutExercises[currentExerciseIndex]?.restTime <= 0) { currentExerciseIndex++; } } else if (timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound >= currentWorkoutInfo.rounds){ /* Treenin loppu */ } if (currentRound > currentWorkoutInfo.rounds || (currentExerciseIndex >= currentWorkoutExercises.length && currentWorkoutInfo.rounds > 0 ) ) { timerState = TimerState.FINISHED; updateButtonStates(); removeBodyLock(); clearNextUpHighlight(); exerciseNameH2.textContent = "Treeni Valmis!"; exerciseDescriptionP.textContent = "Hyvää työtä!"; exerciseImageImg.style.display = 'none'; updateTimerDisplay(0); updateRoundDisplay(); workoutNotesP.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty! Valitse uusi treeni.`; if(isAudioUnlocked) playSound(beepSound); } else if (currentExerciseIndex < currentWorkoutExercises.length) { updateRoundDisplay(); const nextEx = currentWorkoutExercises[currentExerciseIndex]; if (!comingFromRest) { displayExercise(currentExerciseIndex); } else { highlightCurrentExercise(); } startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime); } else { console.error("State mismatch error."); resetWorkoutState(); } }
    function updateTimerDisplay(timeInSeconds) { const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0"); const seconds = (timeInSeconds % 60).toString().padStart(2, "0"); timeRemainingSpan.textContent = `${minutes}:${seconds}`; let label = "Odottamassa..."; if (timerState === TimerState.RUNNING_EXERCISE) { label = "Työaika"; } else if (timerState === TimerState.RUNNING_REST) { label = "Lepo"; } else if (timerState === TimerState.RUNNING_ROUND_REST) { label = "Kierroslepo"; } else if (timerState === TimerState.PAUSED) { label = "Tauko"; } else if (timerState === TimerState.FINISHED) { label = "Valmis"; } timerLabelP.textContent = label; }
    function updateRoundDisplay() { if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0) { roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`; } else { roundInfoP.textContent = ''; } }
    function prevExercise() { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentExerciseIndex > 0) jumpToExercise(currentExerciseIndex - 1); } }
    function nextExercise() { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentExerciseIndex < currentWorkoutExercises.length - 1) jumpToExercise(currentExerciseIndex + 1); } }
    function updateButtonStates() { const hasW = currentWorkoutExercises.length > 0; const isI = timerState === TimerState.IDLE; const isR = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST; const isP = timerState === TimerState.PAUSED; const isF = timerState === TimerState.FINISHED; startBtn.disabled = !hasW || !isI; pauseBtn.disabled = !isR && !isP; stopBtn.disabled = !isR && !isP; const canN = hasW && (isI || isF); prevBtn.disabled = !canN || currentExerciseIndex <= 0; nextBtn.disabled = !canN || currentExerciseIndex >= currentWorkoutExercises.length - 1; if (isP) { pauseBtn.textContent = "▶ Jatka"; pauseBtn.classList.add('paused'); } else { pauseBtn.textContent = "⏸ Tauko"; pauseBtn.classList.remove('paused'); } }
     function resetWorkoutState(resetLevelHighlight = true) { stopTimerInterval(); removeBodyLock(); currentWorkoutExercises = []; currentExerciseIndex = 0; currentRound = 1; remainingTime = 0; timerState = TimerState.IDLE; pausedState = null; currentWorkoutInfo = { ...currentWorkoutInfo, week: null, phaseIndex: null, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' }; exerciseNameH2.textContent = "Valitse treeni"; exerciseDescriptionP.textContent = ""; updateWorkoutNotesDisplay(); exerciseImageImg.style.display = 'none'; exerciseImageImg.src = ''; exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; updateTimerDisplay(0); timerDiv.classList.remove('timer-resting', 'timer-paused'); highlightCurrentExercise(); clearNextUpHighlight(); updateRoundDisplay(); updateButtonStates(); document.querySelectorAll('.week-button').forEach(btn => btn.classList.remove('active')); if (resetLevelHighlight) { levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); }); } console.log("State reset."); }
    function highlightCurrentExercise() { const items = exerciseListUl.querySelectorAll('li.exercise-item'); items.forEach((item) => { const idx = parseInt(item.dataset.index, 10); if (currentWorkoutExercises.length > 0 && !isNaN(idx) && idx === currentExerciseIndex) { item.classList.add('active'); if (item.offsetTop < exerciseListUl.scrollTop || item.offsetTop + item.offsetHeight > exerciseListUl.scrollTop + exerciseListUl.clientHeight) { item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } } else { item.classList.remove('active'); } }); if (currentWorkoutExercises.length === 0) { exerciseListUl.querySelectorAll('li').forEach(item => item.classList.remove('active')); } }
    function highlightNextExercise(forceIndex = -1) { clearNextUpHighlight(); let nextIdx = -1; if (forceIndex !== -1) { nextIdx = forceIndex; } else if (timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { nextIdx = (timerState === TimerState.RUNNING_ROUND_REST) ? 0 : currentExerciseIndex + 1; } if (nextIdx >= 0 && nextIdx < currentWorkoutExercises.length) { const nextItem = exerciseListUl.querySelector(`li[data-index="${nextIdx}"]`); if (nextItem) nextItem.classList.add('next-up'); } }
    function clearNextUpHighlight() { const item = exerciseListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }
    function addBodyLock() { document.body.classList.add('timer-active'); }
    function removeBodyLock() { document.body.classList.remove('timer-active'); }
    function toggleTrainingSelectionVisibility() { trainingSelectSection.classList.toggle('hidden'); toggleTrainingSelectBtn.textContent = trainingSelectSection.classList.contains('hidden') ? "Valitse treeni ⯆" : "Piilota valikko ⯅"; }

    // --- Event Listeners ---
    // MUUTOS: startBtn kuuntelija sisältää nyt audio unlock -logiikan
    startBtn.addEventListener('click', () => {
        // Tarkista ensin voiko startata
         if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
             console.log("Start conditions not met. Cannot start/unlock audio yet.");
             return;
         }

        // Jos ääni on jo avattu TAI jos sitä ei tarvita (esim. selain sallii heti)
        if (isAudioUnlocked) {
            console.log("Audio already unlocked, starting workout directly.");
            startWorkout(); // Kutsu suoraan
            return;
        }

        // Yritetään 'avata' äänikonteksti käyttäjän klikkauksella
        console.log("Attempting to unlock audio context on start click...");
        beepSound.volume = 0.001; // Lähes äänetön
        beepSound.play().then(() => {
            // Onnistui! Pysäytä heti ja aseta lippu
            beepSound.pause();
            beepSound.currentTime = 0;
            beepSound.volume = 1.0; // Normaali volyymi takaisin
            isAudioUnlocked = true; // Merkitse onnistuneeksi
            console.log("Audio context unlocked.");
            startWorkout(); // Käynnistä treeni
        }).catch(error => {
            // Epäonnistui (selain esti TAI muu virhe)
            console.warn("Audio context unlock failed or was interrupted. Proceeding without guaranteed audio:", error);
            beepSound.volume = 1.0; // Varmista normaali volyymi
            // Merkitään silti 'unlocked', jotta yritetään soittaa ääniä myöhemmin
            // Selain saattaa sallia myöhemmät toistot, kun konteksti on aktiivinen
            isAudioUnlocked = true;
            startWorkout(); // Käynnistä treeni silti
        });
    });

    pauseBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopWorkout);
    prevBtn.addEventListener('click', prevExercise);
    nextBtn.addEventListener('click', nextExercise);
    toggleTrainingSelectBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
