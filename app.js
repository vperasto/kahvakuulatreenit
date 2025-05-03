// app.js (Versio 9 - Parannettu round-info lämmittelylle/jäähdyttelylle)

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
        if (!audioElement.paused) {
             audioElement.pause();
             audioElement.currentTime = 0;
        }
        audioElement.volume = 1.0;
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    } // playSound loppuu

    // --- Sovelluksen tila ---
    let fullProgramData = null; let warmupData = null; let cooldownData = null;
    let currentWorkoutExercises = []; let currentRoutineSteps = [];
    let currentStepIndex = 0; let activeRoutineType = 'none';
    let currentWorkoutInfo = { week: null, phaseIndex: null, level: '2', rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
    let currentRound = 1; let timerInterval = null; let remainingTime = 0;
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
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.warmup || !fullProgramData.cooldown || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect or incomplete.");
                itemNameH2.textContent = "Virheellinen ohjelmadata.";
                return;
            }
            warmupData = fullProgramData.warmup;
            cooldownData = fullProgramData.cooldown;
            populateWarmupSelector();
            populateCooldownSelector();
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
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = '';
        if (warmupData && warmupData.description) {
            const button = document.createElement('button');
            button.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
            button.classList.add('routine-button');
            button.dataset.routine = 'warmup';
            button.addEventListener('click', () => selectRoutine('warmup'));
            warmupButtonsContainer.appendChild(button);
        } else {
            warmupButtonsContainer.innerHTML = '<p>Lämmittelytietoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true;
        }
    } // populateWarmupSelector loppuu

    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = '';
        if (cooldownData && cooldownData.description) {
            const button = document.createElement('button');
            button.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            button.classList.add('routine-button');
            button.dataset.routine = 'cooldown';
            button.addEventListener('click', () => selectRoutine('cooldown'));
            cooldownButtonsContainer.appendChild(button);
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelytietoja ei löytynyt.</p>';
            startCooldownBtn.disabled = true;
        }
    } // populateCooldownSelector loppuu

    function populateWeekSelectors() {
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return;
        weekButtonsContainer.innerHTML = '';
        const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`;
            button.classList.add('week-button');
            button.dataset.weekNumber = i;
            button.addEventListener('click', (e) => {
                e.currentTarget.blur();
                handleWeekSelect(i);
            });
            weekButtonsContainer.appendChild(button);
        }
    } // populateWeekSelectors loppuu

    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => handleLevelSelect(button.dataset.level));
        });
    } // addLevelButtonListeners loppuu

    function selectRoutine(routineType) {
        console.log(`Routine selected: ${routineType}`);
        activeRoutineType = routineType;
        resetAppState(false);
        currentRoutineSteps = [];
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`.routine-button[data-routine="${routineType}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');

        if (routineType === 'warmup' && warmupData) {
            infoAreaTitleH2.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
            updateInfoAreaNotes(warmupData.description);
            currentRoutineSteps = warmupData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps);
            displayStep(0);
        } else if (routineType === 'cooldown' && cooldownData) {
            infoAreaTitleH2.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            updateInfoAreaNotes(cooldownData.description);
            currentRoutineSteps = cooldownData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps);
            displayStep(0);
        } else {
            updateInfoAreaNotes("Valitse toiminto yläpuolelta.");
            populateStepsList([]);
        }
        updateButtonStates();
        updateRoundDisplay(); // Päivitä myös tässä, jotta näkyy heti valinnan jälkeen
    } // selectRoutine loppuu

    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return;
        console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === selectedLevel);
        });
        if (currentWorkoutInfo.week !== null) {
            handleWeekSelect(currentWorkoutInfo.week);
        } else {
            updateInfoAreaNotes();
        }
    } // handleLevelSelect loppuu

    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout';
        resetAppState(false);

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Workout data missing."); resetAppState(true); return;
        }
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) {
            console.error(`Workout phase not found for week ${weekNumber}.`);
            resetAppState(true); itemNameH2.textContent = `Vaihetta ei löytynyt viikolle ${weekNumber}.`; return;
        }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx];
        const level = currentWorkoutInfo.level;
        const levelData = phase.levels?.[level];
        if (!levelData?.timeBased) {
            console.error(`Workout level data not found for phase ${phaseIdx + 1}, level ${level}.`);
            resetAppState(true); itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt viikolle ${weekNumber}.`; return;
        }
        const workTime = levelData.timeBased.workSeconds;
        const restTime = levelData.timeBased.restSeconds;
        let exerciseListSource = [];
        if (phaseIdx === 2 && phase.exampleWeeklyExercises) {
            exerciseListSource = phase.exampleWeeklyExercises;
        } else if (phase.weeklyExercises) {
            exerciseListSource = phase.weeklyExercises;
        } else {
            console.error(`No 'weeklyExercises' or 'exampleWeeklyExercises' found in phase ${phaseIdx + 1}.`);
            resetAppState(true); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return;
        }
        const mappedEx = exerciseListSource.map((pEx, index) => {
            if (!pEx?.exerciseId) return null;
            const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId);
            if (!fEx) {
                console.warn(`Exercise with ID ${pEx.exerciseId} not found in main exercises list.`);
                return null;
            }
            return { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime, index };
        }).filter(ex => ex !== null);
        if (mappedEx.length === 0) {
            console.error(`No valid exercises mapped for workout (Week ${weekNumber}, Level ${level}).`);
            resetAppState(true); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return;
        }
        currentWorkoutExercises = mappedEx;
        currentRoutineSteps = mappedEx;
        currentStepIndex = 0;
        currentRound = 1;
        currentWorkoutInfo = {
            ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx,
            rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1,
            restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0,
            notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || ''
        };
        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`;
        populateStepsList(currentRoutineSteps);
        updateInfoAreaNotes();
        displayStep(currentStepIndex);
        updateButtonStates();
        highlightWeekButton(weekNumber);
        updateRoundDisplay(); // Päivitä myös tässä
    } // handleWeekSelect loppuu

    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) {
            noteText = customNote;
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            const roundsText = `Kierrokset: ${currentWorkoutInfo.rounds || 'Ei määritelty'}`;
            const roundRestText = `Kierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}${roundsText}\n${roundRestText}`;
        } else if (activeRoutineType === 'warmup' && warmupData) {
             noteText = warmupData.description;
        } else if (activeRoutineType === 'cooldown' && cooldownData) {
             noteText = cooldownData.description;
        } else {
            noteText = "Valitse toiminto yläpuolelta.";
        }
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta.";
    } // updateInfoAreaNotes loppuu

    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    } // highlightWeekButton loppuu

    function populateStepsList(steps) {
        stepsListUl.innerHTML = '';
        if (!steps || steps.length === 0) {
            stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>';
            stepsListTitleH2.textContent = "Vaiheet";
            return;
        }
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name}`;
            li.dataset.index = index;
            li.classList.add('step-item');
            li.addEventListener('click', () => {
                if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                    jumpToStep(index);
                }
            });
            stepsListUl.appendChild(li);
        });
    } // populateStepsList loppuu

    function jumpToStep(index) {
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer();
            currentStepIndex = index;
            currentRound = 1;
            timerState = TimerState.IDLE;
            displayStep(currentStepIndex);
            updateButtonStates();
            clearNextUpHighlight();
            updateRoundDisplay(); // Päivitä round info hypätessä
        }
    } // jumpToStep loppuu

    function displayStep(index) {
        if (index < 0 || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.error(`Invalid step index: ${index}`);
            resetAppState();
            itemNameH2.textContent = "Virhe vaiheen näyttämisessä";
            itemDescriptionP.textContent = `Vaihetta ei löytynyt indeksillä ${index}.`;
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            return;
        }
        const step = currentRoutineSteps[index];
        itemNameH2.textContent = step.displayTitle || step.name;
        if (activeRoutineType === 'workout') {
            let descriptionText = step.description || '';
            if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim();
            if (step.image) {
                itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name;
                itemImageImg.style.display = 'block';
            } else {
                itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            }
            timerDiv.style.visibility = 'visible';
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 remainingTime = step.workTime || 0;
                 updateTimerDisplay(remainingTime);
            }
            // Round display päivitetään erikseen updateRoundDisplay-funktiossa

        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden';
            // Round display päivitetään erikseen updateRoundDisplay-funktiossa
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 timeRemainingSpan.textContent = '--:--';
                 timerLabelP.textContent = '';
            } else if (timerState === TimerState.RUNNING_STEP){
                  timeRemainingSpan.textContent = '--:--';
                  timerLabelP.textContent = 'Suorita vaihe';
             }
        } else {
            itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden';
            timeRemainingSpan.textContent = '00:00'; timerLabelP.textContent = 'Odottamassa...';
            roundInfoP.textContent = ''; // Tyhjennä round info oletustilassa
        }
        highlightCurrentStep();
        // Siirretään round displayn päivitys tänne, jotta se päivittyy AINA kun displayStep kutsutaan
        updateRoundDisplay();
    } // displayStep loppuu

    function initializeInfoArea() {
        infoContentWrapper.classList.add('collapsed');
        toggleInfoBtn.setAttribute('aria-expanded', 'false');
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä";
        toggleInfoBtn.addEventListener('click', toggleInfoArea);
    } // initializeInfoArea loppuu

    function toggleInfoArea() {
        const isCollapsed = infoContentWrapper.classList.toggle('collapsed');
        const isExpanded = !isCollapsed;
        toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded));
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä";
        console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`);
    } // toggleInfoArea loppuu

    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
            console.warn("Start conditions not met. Type:", activeRoutineType, "Steps:", currentRoutineSteps.length, "State:", timerState);
            return;
        }
        if (mainLayout) {
             const targetOffsetTop = mainLayout.offsetTop;
             console.log(`Scrolling to main layout top: ${targetOffsetTop}px`);
             window.scrollTo({ top: targetOffsetTop, behavior: 'smooth' });
        }
        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            console.log("Attempting to unlock audio context...");
            beepSound.volume = 0.001;
            beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true; console.log("Audio context unlocked.");
                proceedWithWorkoutStart();
            }).catch(error => {
                console.warn("Audio context unlock failed (maybe browser policy):", error);
                beepSound.volume = 1.0; isAudioUnlocked = true;
                proceedWithWorkoutStart();
            });
        } else {
            proceedWithRoutineStart();
        }
    } // startSelectedRoutine loppuu

    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting WORKOUT...");
        currentStepIndex = 0; currentRound = 1;
        // displayStep kutsutaan startTimerForPhase:n kautta
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }
        timerDiv.style.visibility = 'visible';
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    } // proceedWithWorkoutStart loppuu

    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`);
        currentStepIndex = 0; currentRound = 1;
        displayStep(currentStepIndex); // Kutsutaan ennen tilan muutosta
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }
        timerState = TimerState.RUNNING_STEP;
        timerDiv.style.visibility = 'hidden';
        timeRemainingSpan.textContent = '--:--';
        timerLabelP.textContent = "Suorita vaihe";
        updateButtonStates(); // Päivittää napit
        updateRoundDisplay(); // Päivittää roundinfon tilaan RUNNING_STEP
    } // proceedWithRoutineStart loppuu

    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedState = timerState;
            stopTimerInterval();
            timerState = TimerState.PAUSED;
            console.log("Workout Paused");
            pauseResumeBtn.textContent = "▶ Jatka";
            pauseResumeBtn.classList.add('paused');
            timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
            console.log("Workout Resumed");
            timerState = pausedState || TimerState.RUNNING_EXERCISE;
            pausedState = null;
            runTimerInterval();
            pauseResumeBtn.textContent = "⏸ Tauko";
            pauseResumeBtn.classList.remove('paused');
            timerDiv.classList.remove('timer-paused');
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                timerDiv.classList.add('timer-resting');
                highlightNextStep();
            } else {
                timerDiv.classList.remove('timer-resting');
                clearNextUpHighlight();
            }
        }
        updateButtonStates();
        updateRoundDisplay(); // Päivitä round info myös pausen/resumen yhteydessä
    } // pauseResumeTimer loppuu

    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`);
        stopTimer();
        clearNextUpHighlight();
        const previouslyActiveType = activeRoutineType;
        timerState = TimerState.IDLE;
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
             displayStep(currentStepIndex); // Tämä kutsuu myös updateRoundDisplay
             if(previouslyActiveType === 'workout') {
                 updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
             }
        } else {
            resetAppState(); return;
        }
        updateButtonStates(); // Päivittää napit IDLE-tilaan
        // updateRoundDisplay kutsuttiin jo displayStep:ssä
    } // stopActiveRoutine loppuu

    function handleNextStep() {
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
         if (timerState !== TimerState.RUNNING_STEP) return;
         currentStepIndex++;
         if (currentStepIndex >= currentRoutineSteps.length) {
              finishRoutine();
         } else {
             displayStep(currentStepIndex); // Tämä kutsuu myös updateRoundDisplay
             highlightCurrentStep();
         }
         updateButtonStates();
    } // handleNextStep loppuu

    function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`);
         const finishedType = activeRoutineType;
         stopTimerInterval();
         timerState = TimerState.FINISHED;
         clearNextUpHighlight();
         itemNameH2.textContent = `${finishedType.charAt(0).toUpperCase() + finishedType.slice(1)} Valmis!`;
         itemDescriptionP.textContent = "Hyvää työtä!";
         itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
         updateTimerDisplay(0); timerLabelP.textContent = "Valmis";
         updateRoundDisplay(); // Tyhjentää round infon
         updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         if (isAudioUnlocked && finishedType === 'workout') {
             playSound(beepSound);
         }
         updateButtonStates();
     } // finishRoutine loppuu

    function stopTimer() {
        stopTimerInterval();
        pausedState = null;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        console.log("Timer interval stopped.");
    } // stopTimer loppuu

    function stopTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    } // stopTimerInterval loppuu

    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval();
        timerState = phaseState;
        remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        clearNextUpHighlight();
        if (phaseState === TimerState.RUNNING_EXERCISE) {
             if (currentStepIndex < currentRoutineSteps.length) displayStep(currentStepIndex); // Kutsuu updateRoundDisplay
             else { console.error("Error..."); resetAppState(); return; }
             highlightCurrentStep();
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            timerDiv.classList.add('timer-resting');
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1;
            if (nextIdx < currentRoutineSteps.length) {
                displayStep(nextIdx); highlightNextStep(nextIdx); // Kutsuu updateRoundDisplay
            } else {
                if (currentStepIndex < currentRoutineSteps.length) { displayStep(currentStepIndex); highlightCurrentStep(); } // Kutsuu updateRoundDisplay
                else { console.error("Error..."); resetAppState(); return; }
            }
        }
        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime);
        updateButtonStates();
        // updateRoundDisplay kutsuttiin jo displayStepin kautta
        if (remainingTime >= 0) { runTimerInterval(); }
        else { handleTimerEnd(); }
    } // startTimerForPhase loppuu

    function runTimerInterval() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return;
            remainingTime--;
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1;
            if(isAudioUnlocked){
                if (isWork) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) playSound(beepSound); }
                else if (isRest) { if (checkTime >= 1 && checkTime <= 3) playSound(beepSound); }
            }
            updateTimerDisplay(remainingTime);
            if (remainingTime < 0) handleTimerEnd();
        }, 1000);
    } // runTimerInterval loppuu

    function handleTimerEnd() {
        stopTimerInterval();
        timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;
        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        if (timerState === TimerState.RUNNING_EXERCISE) {
            if (currentStepIndex >= currentRoutineSteps.length) { console.error("Error..."); resetAppState(); return; }
            const currentEx = currentRoutineSteps[currentStepIndex];
            if (!currentEx) { resetAppState(); return; }
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            const restDur = currentEx.restTime ?? 0;
            if (isLastEx) {
                if (isLastR) { moveToNextPhase(); }
                else {
                    const roundRest = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRest > 0) startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest);
                    else moveToNextPhase();
                }
            } else {
                if (restDur > 0) startTimerForPhase(TimerState.RUNNING_REST, restDur);
                else moveToNextPhase();
            }
        } else if (wasResting) {
            clearNextUpHighlight(); moveToNextPhase();
        }
    } // handleTimerEnd loppuu

    function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;
        if (comingFromRoundRest) { currentRound++; currentStepIndex = 0; }
        else if (comingFromRest) { currentStepIndex++; }
        else {
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { currentRound++; currentStepIndex = 0; }
            else if (!isLastEx) { currentStepIndex++; }
        }
        if (currentRound > currentWorkoutInfo.rounds) {
            finishRoutine();
        } else if (currentStepIndex < currentRoutineSteps.length) {
            const nextEx = currentRoutineSteps[currentStepIndex];
             if (!nextEx) { console.error("Error..."); resetAppState(); return; }
            // displayStep ja updateRoundDisplay kutsutaan startTimerForPhase:n kautta
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else {
            console.error("State mismatch..."); resetAppState();
        }
    } // moveToNextPhase loppuu

    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds);
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        let label = "Odottamassa...";
        if (timerState === TimerState.RUNNING_EXERCISE) label = "Työaika";
        else if (timerState === TimerState.RUNNING_REST) label = "Lepo";
        else if (timerState === TimerState.RUNNING_ROUND_REST) label = "Kierroslepo";
        else if (timerState === TimerState.RUNNING_STEP) label = "Suorita vaihe";
        else if (timerState === TimerState.PAUSED) label = "Tauko";
        else if (timerState === TimerState.FINISHED) label = "Valmis";
        else if (timerState === TimerState.IDLE) {
            if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
                 label = ""; timeRemainingSpan.textContent = '--:--';
            } else if (activeRoutineType === 'workout' && currentRoutineSteps.length > 0) {
                 const step = currentRoutineSteps[currentStepIndex];
                 const idleTime = step?.workTime ?? 0;
                 const idleMinutes = Math.floor(idleTime / 60).toString().padStart(2, "0");
                 const idleSeconds = (idleTime % 60).toString().padStart(2, "0");
                 timeRemainingSpan.textContent = `${idleMinutes}:${idleSeconds}`;
                 label = "Valmiina";
            } else {
                timeRemainingSpan.textContent = '00:00'; label = 'Odottamassa...';
            }
        }
        timerLabelP.textContent = label;
    } // updateTimerDisplay loppuu

    // Päivittää kierrosinformaation TAI lämmittelyn/jäähdyttelyn vaiheen
    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') {
            if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) {
                 if (timerState === TimerState.IDLE) {
                      roundInfoP.textContent = `Kierrokset: ${currentWorkoutInfo.rounds}`;
                 } else { // RUNNING_*, PAUSED
                      roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
                 }
            } else { roundInfoP.textContent = ''; }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) {
                 const totalSteps = currentRoutineSteps.length;
                 const currentStepNumber = currentStepIndex + 1;
                 roundInfoP.textContent = `Vaihe ${currentStepNumber} / ${totalSteps}`;
            } else { roundInfoP.textContent = ''; }
        } else {
            roundInfoP.textContent = '';
        }
    } // updateRoundDisplay loppuu

    function prevStep() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
            if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1);
        }
    } // prevStep loppuu

    function nextStepNav() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
             if (currentStepIndex < currentRoutineSteps.length - 1) jumpToStep(currentStepIndex + 1);
        }
    } // nextStepNav loppuu

    function updateButtonStates() {
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block'; startWarmupBtn.disabled = !warmupData;
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block'; startWorkoutBtn.disabled = currentWorkoutInfo.week === null;
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block'; startCooldownBtn.disabled = !cooldownData;
            }
        }
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block';
            stopBtn.disabled = false; nextStepBtn.disabled = false;
            if (currentStepIndex === currentRoutineSteps.length - 1) nextStepBtn.textContent = "Valmis ✅";
            else nextStepBtn.textContent = "Seuraava Vaihe ⏭";
        } else if (timerState === TimerState.PAUSED) {
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
    } // updateButtonStates loppuu

    function resetAppState(resetSelections = true) {
        stopTimerInterval();
        currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1;
        remainingTime = 0; timerState = TimerState.IDLE; pausedState = null;
        isAudioUnlocked = false;
        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
        itemNameH2.textContent = "Valitse toiminto";
        itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
        infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes();
        itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>';
        stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0);
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        timerDiv.style.visibility = 'hidden';
        highlightCurrentStep();
        clearNextUpHighlight();
        updateRoundDisplay(); // Tyhjentää round infon
         if (resetSelections) {
             activeRoutineType = 'none';
             currentWorkoutInfo.level = '2'; currentWorkoutInfo.week = null;
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.level === '2');
             });
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea();
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        }
        updateButtonStates();
        console.log("App state reset.");
    } // resetAppState loppuu

    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10);
            if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex) {
                item.classList.add('active');
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                item.classList.remove('active');
            }
        });
        if (currentRoutineSteps.length === 0) {
            stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        }
    } // highlightCurrentStep loppuu

    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight();
        let nextIdx = -1;
        if (forceIndex !== -1) nextIdx = forceIndex;
        else if (timerState === TimerState.RUNNING_REST) nextIdx = currentStepIndex + 1;
        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    } // highlightNextStep loppuu

    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up');
        if (item) item.classList.remove('next-up');
    } // clearNextUpHighlight loppuu

    function addBodyLock() { /* CSS hoitaa */ }
    function removeBodyLock() { /* CSS hoitaa */ }

    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.classList.toggle('open', !hidden);
    } // toggleTrainingSelectionVisibility loppuu

    // --- Event Listeners ---
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    startWarmupBtn.addEventListener('click', startSelectedRoutine);
    startWorkoutBtn.addEventListener('click', startSelectedRoutine);
    startCooldownBtn.addEventListener('click', startSelectedRoutine);
    pauseResumeBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopActiveRoutine);
    nextStepBtn.addEventListener('click', handleNextStep);
    prevBtn.addEventListener('click', prevStep);
    nextBtn.addEventListener('click', nextStepNav);

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
