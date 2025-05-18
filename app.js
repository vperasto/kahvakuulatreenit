// app.js (Versio 2.1 - Sivupalkin piilotus, sticky ajastin)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const appDiv = document.getElementById('app');
    const header = document.querySelector('header');
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area');
    const selectionArea = document.getElementById('selection-area');
    const warmupSelectionDiv = document.getElementById('warmup-selection'); // etc.
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

    const mainContentWrapper = document.querySelector('.main-content-wrapper');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mainViewArea = document.getElementById('main-view-area'); // UUSI
    const timerControlsPanel = document.getElementById('timer-controls-panel');

    const infoArea = document.getElementById('info-area'); // etc.
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

    const activeDisplaySection = document.getElementById('active-display'); // etc.
    const titleAreaDiv = document.getElementById('title-area');
    const prevBtn = document.getElementById('prev-btn');
    const itemNameH2 = document.getElementById('item-name');
    const nextBtn = document.getElementById('next-btn');
    const itemDetailsDiv = document.getElementById('item-details');
    const itemImageImg = document.getElementById('item-image');
    const itemDescriptionP = document.getElementById('item-description');

    const roundInfoP = document.getElementById('round-info');
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const controlButtonContainer = document.querySelector('.control-button-container');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    const beepSound = new Audio('audio/beep.mp3');
    beepSound.load();
    function playSound(audioElement) {
        if (!audioElement.paused) {
             audioElement.pause();
             audioElement.currentTime = 0;
        }
        audioElement.volume = 1.0;
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    }

    let fullProgramData = null;
    let allWarmups = [];
    let allCooldowns = [];
    let selectedRoutineData = null;
    let currentWorkoutExercises = [];
    let currentRoutineSteps = [];
    let currentStepIndex = 0;
    let activeRoutineType = 'none';
    let currentWorkoutInfo = { week: null, phaseIndex: null, level: '2', rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
    let currentRound = 1;
    let timerInterval = null;
    let remainingTime = 0;
    let routineTimerInterval = null;
    let elapsedRoutineTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished', RUNNING_STEP: 'running_step' };
    let timerState = TimerState.IDLE;
    let pausedState = null;
    let isAudioUnlocked = false;

    // --- HEADER KORKEUDEN LASKENTA ---
    function updateHeaderHeightProperty() {
        if (header) {
            const currentHeaderHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${currentHeaderHeight}px`);
        }
    }
    // Päivitä heti ja ikkunan koon muuttuessa
    updateHeaderHeightProperty();
    window.addEventListener('resize', updateHeaderHeightProperty);


    // --- SIVUPALKIN HALLINTA ---
    function toggleSidebarVisibility() {
        if (sidebar && toggleSidebarBtn) {
            const isHidden = sidebar.classList.toggle('sidebar-hidden');
            sidebar.classList.toggle('sidebar-visible', !isHidden); // Lisää/poista näkyvyysluokka
            toggleSidebarBtn.classList.toggle('active', !isHidden);
            toggleSidebarBtn.setAttribute('aria-expanded', String(!isHidden));

            // Mobiilissa overlay-tausta
            if (window.innerWidth <= 767) {
                document.body.classList.toggle('sidebar-open', !isHidden);
                 // Pieni viive ennen varsinaisen 'sidebar-really-open' luokan lisäämistä/poistamista
                // jotta CSS-transitiot ehtivät toimia oikein opacitylle ja visibilitylle
                setTimeout(() => {
                    document.body.classList.toggle('sidebar-really-open', !isHidden);
                }, 10); // Pieni viive riittää käynnistämään transition
            }
            console.log("Sidebar toggled. Now visible:", !isHidden);
        }
    }
    if (toggleSidebarBtn) {
        // Oletuksena sivupalkki näkyvissä isommilla näytöillä, piilossa pienillä
        if (window.innerWidth > 900) { // Tai mikä onkaan "iso näyttö" -raja
            sidebar.classList.remove('sidebar-hidden');
            sidebar.classList.add('sidebar-visible');
            toggleSidebarBtn.classList.add('active');
            toggleSidebarBtn.setAttribute('aria-expanded', 'true');
        } else {
            sidebar.classList.add('sidebar-hidden');
            sidebar.classList.remove('sidebar-visible');
            toggleSidebarBtn.classList.remove('active');
            toggleSidebarBtn.setAttribute('aria-expanded', 'false');
        }
        toggleSidebarBtn.addEventListener('click', toggleSidebarVisibility);
    }


    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !Array.isArray(fullProgramData.warmups) || !Array.isArray(fullProgramData.cooldowns) || !fullProgramData.exercises) {
                console.error("Loaded data structure seems incorrect.");
                itemNameH2.textContent = "Virheellinen ohjelmadata."; return;
            }
            allWarmups = fullProgramData.warmups;
            allCooldowns = fullProgramData.cooldowns;
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
    }

    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = '';
        if (allWarmups && allWarmups.length > 0) {
            allWarmups.forEach(warmup => {
                if (!warmup || !warmup.id || !warmup.name) { console.warn("Skipping invalid warmup item:", warmup); return; }
                const button = document.createElement('button');
                button.innerHTML = `${warmup.name}${warmup.durationMinutes ? ` <span class="duration">(${warmup.durationMinutes} min)</span>` : ''}`;
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
    }

    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = '';
        if (allCooldowns && allCooldowns.length > 0) {
            allCooldowns.forEach(cooldown => {
                 if (!cooldown || !cooldown.id || !cooldown.name) { console.warn("Skipping invalid cooldown item:", cooldown); return; }
                const button = document.createElement('button');
                button.innerHTML = `${cooldown.name}${cooldown.durationMinutes ? ` <span class="duration">(${cooldown.durationMinutes} min)</span>` : ''}`;
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
    }

    function populateWeekSelectors() {
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return;
        weekButtonsContainer.innerHTML = ''; const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`; button.classList.add('week-button'); button.dataset.weekNumber = i;
            button.addEventListener('click', (e) => { e.currentTarget.blur(); handleWeekSelect(i); });
            weekButtonsContainer.appendChild(button);
        }
    }

    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }

    function selectRoutine(routineType, routineId) {
        activeRoutineType = routineType;
        resetAppState(false);
        currentRoutineSteps = [];
        selectedRoutineData = null;
        let routineList = (routineType === 'warmup') ? allWarmups : allCooldowns;
        selectedRoutineData = routineList.find(routine => routine.id === routineId);
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active'));
        if (selectedRoutineData && selectedRoutineData.steps) {
            infoAreaTitleH2.textContent = `${selectedRoutineData.name}${selectedRoutineData.durationMinutes ? ` (${selectedRoutineData.durationMinutes} min)` : ''}`;
            updateInfoAreaNotes(selectedRoutineData.description || "Ei kuvausta.");
            currentRoutineSteps = selectedRoutineData.steps.map((step, index) => ({ ...step, index }));
            populateStepsList(currentRoutineSteps);
            displayStep(0);
            const selectedBtn = document.querySelector(`.routine-button[data-routine-id="${routineId}"][data-routine-type="${routineType}"]`);
            if (selectedBtn) selectedBtn.classList.add('active');
        } else {
            console.error(`Routine with ID ${routineId} and type ${routineType} not found or has no steps!`);
            infoAreaTitleH2.textContent = "Virhe"; updateInfoAreaNotes("Valittua rutiinia ei löytynyt.");
            populateStepsList([]); displayStep(-1);
        }
        updateButtonStates(); updateRoundDisplay();
    }

    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return;
        currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
        if (currentWorkoutInfo.week !== null && activeRoutineType === 'workout') handleWeekSelect(currentWorkoutInfo.week);
        else updateInfoAreaNotes();
    }

    function handleWeekSelect(weekNumber) {
        activeRoutineType = 'workout';
        selectedRoutineData = null;
        resetAppState(false);
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) { console.error("Workout data missing."); resetAppState(true); return; }
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) { itemNameH2.textContent = `Vaihetta ei löytynyt viikolle ${weekNumber}.`; resetAppState(true); return; }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx]; const level = currentWorkoutInfo.level; const levelData = phase.levels?.[level];
        if (!levelData?.timeBased) { itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt.`; resetAppState(true); return; }
        const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;
        let exerciseListSource = phase.exampleWeeklyExercises && phaseIdx === 2 ? phase.exampleWeeklyExercises : phase.weeklyExercises;
        if (!exerciseListSource) { itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; resetAppState(true); return; }
        const mappedEx = exerciseListSource.map((pEx, index) => {
            if (!pEx?.exerciseId) return null;
            const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId);
            if (!fEx) { console.warn(`Exercise ID ${pEx.exerciseId} not found.`); return null; }
            return { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime, index };
        }).filter(ex => ex !== null);
        if (mappedEx.length === 0) { itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; resetAppState(true); return; }
        currentWorkoutExercises = mappedEx; currentRoutineSteps = mappedEx; currentStepIndex = 0; currentRound = 1;
        currentWorkoutInfo = { ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx, rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || '' };
        document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`;
        populateStepsList(currentRoutineSteps); updateInfoAreaNotes(); displayStep(currentStepIndex);
        updateButtonStates(); highlightWeekButton(weekNumber); updateRoundDisplay();
    }

    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) noteText = customNote;
        else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
            const focusText = currentWorkoutInfo.focus ? `Fokus: ${currentWorkoutInfo.focus}\n` : '';
            noteText = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\n${focusText}Kierrokset: ${currentWorkoutInfo.rounds || '?'}\nKierroslepo: ${currentWorkoutInfo.restBetweenRounds || 0} s`;
        } else if ((activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') && selectedRoutineData) {
             noteText = selectedRoutineData.description || "Ei kuvausta.";
        }
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta.";
    }

    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => { btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber); });
        if (weekNumber !== null) document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));
    }

    function populateStepsList(steps) {
        stepsListUl.innerHTML = '';
        if (!steps || steps.length === 0) { stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>'; stepsListTitleH2.textContent = "Vaiheet"; return; }
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name || 'Nimetön vaihe'}`;
            li.dataset.index = index; li.classList.add('step-item');
            li.addEventListener('click', () => { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToStep(index); });
            stepsListUl.appendChild(li);
        });
    }

    function jumpToStep(index) {
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer(); stopRoutineTimer();
            currentStepIndex = index; currentRound = 1; timerState = TimerState.IDLE; elapsedRoutineTime = 0;
            displayStep(currentStepIndex); updateButtonStates(); clearNextUpHighlight(); updateRoundDisplay();
        }
    }

    function displayStep(index) {
        if (index < 0 || !currentRoutineSteps || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = "Valitse ensin lämmittely, treeni tai jäähdyttely.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            timerLabelP.textContent = 'Odottamassa...'; timeRemainingSpan.textContent = '00:00';
            highlightCurrentStep(); updateRoundDisplay(); return;
        }
        const step = currentRoutineSteps[index];
        itemNameH2.textContent = step.displayTitle || step.name || 'Nimetön vaihe';
        if (activeRoutineType === 'workout') {
            let descriptionText = step.description || ''; if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim() || "Suorita harjoitus ohjeen mukaan.";
            if (step.image) { itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name; itemImageImg.style.display = 'block'; }
            else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
            timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                remainingTime = step.workTime || 0; updateTimerDisplay(remainingTime); timerLabelP.textContent = "Valmiina";
            }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = timerState === TimerState.FINISHED ? "Valmis (Kesto)" : "Valmiina";
            } else if (timerState === TimerState.RUNNING_STEP){
                updateTimerDisplay(elapsedRoutineTime); timerLabelP.textContent = 'Kulunut aika';
            }
        }
        highlightCurrentStep(); updateRoundDisplay();
    }

    function initializeInfoArea() { infoContentWrapper.classList.add('collapsed'); toggleInfoBtn.setAttribute('aria-expanded', 'false'); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä"; toggleInfoBtn.addEventListener('click', toggleInfoArea); }
    function toggleInfoArea() { const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); const isExpanded = !isCollapsed; toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded)); if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä"; }


    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;

        const targetScrollElement = mainViewArea || document.body; // Skrollaa mainViewArea tai bodya
        const headerOffset = header ? header.offsetHeight : 0;
        const additionalPadding = 16; // Pieni lisäys, ettei mene liian ylös

        // Piilota valikko ensin, jos auki
        if (!selectionArea.classList.contains('hidden')) {
            toggleTrainingSelectionVisibility();
            // Odota valikon sulkeutumista ennen skrollausta
            setTimeout(() => {
                window.scrollTo({ top: targetScrollElement.offsetTop - headerOffset - additionalPadding, behavior: 'smooth' });
            }, 400); // Vastaa CSS-transition kestoa
        } else {
             window.scrollTo({ top: targetScrollElement.offsetTop - headerOffset - additionalPadding, behavior: 'smooth' });
        }

        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            beepSound.volume = 0.001;
            beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true; console.log("Audio context unlocked.");
                proceedWithWorkoutStart();
            }).catch(error => {
                console.warn("Audio context unlock failed:", error);
                beepSound.volume = 1.0; isAudioUnlocked = true;
                proceedWithWorkoutStart();
            });
        } else { proceedWithRoutineStart(); }
    }

    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        currentStepIndex = 0; currentRound = 1;
        if (!selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
        if (!currentRoutineSteps[currentStepIndex] || typeof currentRoutineSteps[currentStepIndex].workTime === 'undefined') {
            console.error("Cannot start: Invalid first step data."); resetAppState(); return;
        }
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    }

    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        currentStepIndex = 0; currentRound = 1; elapsedRoutineTime = 0;
        displayStep(currentStepIndex);
        if (!selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        timerState = TimerState.RUNNING_STEP;
        timerDiv.style.visibility = 'visible'; timerDiv.classList.add('routine-timer-active');
        timerLabelP.textContent = "Kulunut aika";
        startRoutineTimer(); updateButtonStates();
    }

    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return;
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused'); timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
            timerState = pausedState || TimerState.RUNNING_EXERCISE; pausedState = null; runTimerInterval();
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused'); timerDiv.classList.remove('timer-paused');
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                timerDiv.classList.add('timer-resting'); highlightNextStep();
            } else { timerDiv.classList.remove('timer-resting'); clearNextUpHighlight(); }
        }
        updateButtonStates(); updateRoundDisplay();
    }

    function stopActiveRoutine() {
        const previouslyActiveType = activeRoutineType;
        stopTimer(); stopRoutineTimer(); clearNextUpHighlight();
        timerState = TimerState.IDLE; elapsedRoutineTime = 0;
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
            displayStep(currentStepIndex);
             if (previouslyActiveType === 'workout') updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
             else updateTimerDisplay(0);
             timerLabelP.textContent = "Valmiina";
        } else { resetAppState(); return; }
        updateButtonStates();
    }

    function handleNextStep() {
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
         if (timerState !== TimerState.RUNNING_STEP) return;
         currentStepIndex++;
         if (currentStepIndex >= currentRoutineSteps.length) finishRoutine();
         else { displayStep(currentStepIndex); highlightCurrentStep(); }
         updateButtonStates();
    }

    function finishRoutine() {
         const finishedType = activeRoutineType;
         stopTimer(); stopRoutineTimer(); timerState = TimerState.FINISHED; clearNextUpHighlight();
         let routineName = selectedRoutineData ? selectedRoutineData.name : (finishedType === 'workout' ? `Viikko ${currentWorkoutInfo.week} Treeni` : finishedType.charAt(0).toUpperCase() + finishedType.slice(1));
         itemNameH2.textContent = `${routineName} Valmis!`; itemDescriptionP.textContent = "Hyvää työtä!";
         itemImageImg.style.display = 'none';
         updateTimerDisplay(finishedType === 'workout' ? 0 : elapsedRoutineTime);
         timerLabelP.textContent = finishedType === 'workout' ? "Valmis" : "Valmis (Kesto)";
         updateRoundDisplay(); updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         if (isAudioUnlocked && finishedType === 'workout') playSound(beepSound);
         updateButtonStates();
     }

    function stopTimer() { stopTimerInterval(); pausedState = null; timerDiv.classList.remove('timer-resting', 'timer-paused'); }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); stopRoutineTimer();
        timerState = phaseState; remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active'); clearNextUpHighlight();
        if (phaseState === TimerState.RUNNING_EXERCISE) {
             if (currentStepIndex < currentRoutineSteps.length) displayStep(currentStepIndex);
             else { console.error("Error: index out of bounds."); resetAppState(); return; }
             highlightCurrentStep();
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            timerDiv.classList.add('timer-resting');
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1;
            if (nextIdx < currentRoutineSteps.length) { displayStep(nextIdx); highlightNextStep(nextIdx); }
            else { if (currentStepIndex < currentRoutineSteps.length) { displayStep(currentStepIndex); highlightCurrentStep(); }
                   else { console.error("Error: index out of bounds."); resetAppState(); return; }
            }
        }
        updateTimerDisplay(remainingTime); updateButtonStates();
        if (remainingTime > 0) runTimerInterval(); else handleTimerEnd();
    }

    function runTimerInterval() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return;
            remainingTime--;
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1;
            if(isAudioUnlocked){
                if (isWork && (checkTime === 10 || (checkTime >= 1 && checkTime <= 5))) playSound(beepSound);
                else if (isRest && (checkTime >= 1 && checkTime <= 3)) playSound(beepSound);
            }
            updateTimerDisplay(remainingTime);
            if (remainingTime < 0) handleTimerEnd();
        }, 1000);
    }

    function handleTimerEnd() {
        stopTimerInterval(); timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;
        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        if (timerState === TimerState.RUNNING_EXERCISE) {
            if (currentStepIndex >= currentRoutineSteps.length) { resetAppState(); return; }
            const currentEx = currentRoutineSteps[currentStepIndex]; if (!currentEx) { resetAppState(); return; }
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            const restDur = currentEx.restTime ?? 0;
            if (isLastEx) {
                if (isLastR) moveToNextPhase();
                else { const roundRest = currentWorkoutInfo.restBetweenRounds || 0;
                       if (roundRest > 0) startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); else moveToNextPhase(); }
            } else { if (restDur > 0) startTimerForPhase(TimerState.RUNNING_REST, restDur); else moveToNextPhase(); }
        } else if (wasResting) { clearNextUpHighlight(); moveToNextPhase(); }
    }

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
        if (currentRound > currentWorkoutInfo.rounds) finishRoutine();
        else if (currentStepIndex < currentRoutineSteps.length) {
            const nextEx = currentRoutineSteps[currentStepIndex];
            if (!nextEx || typeof nextEx.workTime === 'undefined') { resetAppState(); return; }
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else { console.error("State mismatch error in moveToNextPhase."); resetAppState(); }
    }

    function startRoutineTimer() {
        stopRoutineTimer(); if(timerState !== TimerState.RUNNING_STEP) return;
        updateTimerDisplay(elapsedRoutineTime);
        routineTimerInterval = setInterval(() => {
            if (timerState !== TimerState.RUNNING_STEP) { stopRoutineTimer(); return; }
            elapsedRoutineTime++; updateTimerDisplay(elapsedRoutineTime);
        }, 1000);
    }
    function stopRoutineTimer() { if (routineTimerInterval) { clearInterval(routineTimerInterval); routineTimerInterval = null; } }

    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds);
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        if (timerState === TimerState.IDLE && activeRoutineType === 'none') timerLabelP.textContent = 'Odottamassa...';
    }

    function updateRoundDisplay() {
        if (activeRoutineType === 'workout') {
             if (timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0 && currentRoutineSteps.length > 0) {
                 roundInfoP.textContent = timerState === TimerState.IDLE ? `Kierrokset: ${currentWorkoutInfo.rounds}` : `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
             } else { roundInfoP.textContent = ''; }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
             if (currentRoutineSteps.length > 0 && timerState !== TimerState.FINISHED) {
                 roundInfoP.textContent = `Vaihe ${currentStepIndex + 1} / ${currentRoutineSteps.length}`;
             } else { roundInfoP.textContent = ''; }
        } else { roundInfoP.textContent = ''; }
    }

    function prevStep() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex > 0) { jumpToStep(currentStepIndex - 1); } }
    function nextStepNav() { if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length - 1) { jumpToStep(currentStepIndex + 1); } }

    function updateButtonStates() {
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block'; startWarmupBtn.disabled = !selectedRoutineData;
                startWarmupBtn.textContent = selectedRoutineData ? `Aloita: ${selectedRoutineData.name.substring(0,18)}...` : 'Aloita Lämmittely';
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block'; startWorkoutBtn.disabled = currentWorkoutInfo.week === null;
                startWorkoutBtn.textContent = 'Aloita Treeni';
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block'; startCooldownBtn.disabled = !selectedRoutineData;
                startCooldownBtn.textContent = selectedRoutineData ? `Aloita: ${selectedRoutineData.name.substring(0,18)}...` : 'Aloita Jäähdyttely';
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
            nextStepBtn.textContent = (currentStepIndex === currentRoutineSteps.length - 1) ? "Valmis ✅" : "Seuraava Vaihe ⏭";
        } else if (timerState === TimerState.PAUSED) {
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        }
    }

    function resetAppState(resetSelections = true) {
        stopTimerInterval(); stopRoutineTimer();
        selectedRoutineData = null; currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1; remainingTime = 0; elapsedRoutineTime = 0;
        timerState = TimerState.IDLE; pausedState = null;
        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: resetSelections ? '2' : savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };
        itemNameH2.textContent = "Valitse toiminto"; itemDescriptionP.textContent = "Valitse toiminto yläpuolelta."; infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes();
        itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>'; stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0);
        timerDiv.classList.remove('timer-resting', 'timer-paused', 'routine-timer-active');
        timerDiv.style.visibility = 'hidden';
        highlightCurrentStep(); clearNextUpHighlight(); updateRoundDisplay();

        // Palauta sivupalkin oletustila
        if (sidebar && toggleSidebarBtn) {
            if (window.innerWidth > 900) { // Näkyvissä isoilla näytöillä
                if (sidebar.classList.contains('sidebar-hidden')) toggleSidebarVisibility();
            } else { // Piilossa pienillä näytöillä
                if (!sidebar.classList.contains('sidebar-hidden')) toggleSidebarVisibility();
            }
            // Varmista, ettei mobiilin overlay jää päälle
            document.body.classList.remove('sidebar-open', 'sidebar-really-open');
        }


         if (resetSelections) {
             activeRoutineType = 'none'; currentWorkoutInfo.week = null;
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === '2'); });
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea();
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        } else {
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); });
        }
        updateButtonStates();
        console.log("App state reset.", resetSelections ? "(Full reset)" : "(Timer/Routine reset)");
    }

    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10);
            const shouldHighlight = currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex && (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_STEP || timerState === TimerState.IDLE || timerState === TimerState.FINISHED || timerState === TimerState.PAUSED);
            if (shouldHighlight) {
                item.classList.add('active');
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else { item.classList.remove('active'); }
        });
        if (currentRoutineSteps.length === 0) stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
    }
    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight(); let nextIdx = -1;
        if (forceIndex !== -1) nextIdx = forceIndex;
        else if (timerState === TimerState.RUNNING_REST) nextIdx = currentStepIndex + 1;
        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    }
    function clearNextUpHighlight() { const item = stepsListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up'); }

    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.classList.toggle('open', !hidden);
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) toggleTextElem.textContent = hidden ? "Valinnat" : "Piilota valinnat";
    }

    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    startWarmupBtn.addEventListener('click', startSelectedRoutine);
    startWorkoutBtn.addEventListener('click', startSelectedRoutine);
    startCooldownBtn.addEventListener('click', startSelectedRoutine);
    pauseResumeBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopActiveRoutine);
    nextStepBtn.addEventListener('click', handleNextStep);
    prevBtn.addEventListener('click', prevStep);
    nextBtn.addEventListener('click', nextStepNav);

    loadAppData();
});