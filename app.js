// app.js (Versio 2.2 - Korjauksia sticky-paneeliin ja sivupalkin hallintaan + Pyydetyt muutokset)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const appDiv = document.getElementById('app');
    const header = document.querySelector('header');
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area');
    const selectionArea = document.getElementById('selection-area');
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container');
    const startWarmupBtn = document.getElementById('start-warmup-btn');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const startWorkoutBtn = document.getElementById('start-workout-btn');
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container');
    const startCooldownBtn = document.getElementById('start-cooldown-btn');

    const mainContentWrapper = document.querySelector('.main-content-wrapper');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mainViewArea = document.getElementById('main-view-area');
    const timerControlsPanel = document.getElementById('timer-controls-panel');

    const infoAreaTitleH2 = document.getElementById('info-area-title'); // Säilytetään, jos otsikkoa päivitetään
    // const toggleInfoBtn = document.getElementById('toggle-info-btn'); // POISTETTU
    // const toggleInfoTextSpan = toggleInfoBtn.querySelector('.toggle-info-text'); // POISTETTU
    const infoContentWrapper = document.getElementById('info-content'); // Säilytetään, jos sisältöön viitataan
    const infoAreaNotesP = document.getElementById('info-area-notes');
    const stepsListTitleH2 = document.getElementById('steps-list-title');
    const stepsListUl = document.getElementById('steps-items');

    const activeDisplaySection = document.getElementById('active-display');
    const prevBtn = document.getElementById('prev-btn');
    const itemNameH2 = document.getElementById('item-name');
    const nextBtn = document.getElementById('next-btn');
    const itemImageImg = document.getElementById('item-image');
    const itemDescriptionP = document.getElementById('item-description');

    const roundInfoP = document.getElementById('round-info');
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
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

    function updateHeaderHeightProperty() {
        if (header) {
            const currentHeaderHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${currentHeaderHeight}px`);
        }
    }
    updateHeaderHeightProperty();
    window.addEventListener('resize', updateHeaderHeightProperty);

    function toggleSidebarVisibility() {
        if (sidebar && toggleSidebarBtn) {
            const isCurrentlyVisible = sidebar.classList.contains('sidebar-visible'); // Käännetty logiikka
            sidebar.classList.toggle('sidebar-hidden', isCurrentlyVisible);
            sidebar.classList.toggle('sidebar-visible', !isCurrentlyVisible);
            toggleSidebarBtn.classList.toggle('active', !isCurrentlyVisible); // Active kun sivupalkki on näkyvissä
            toggleSidebarBtn.setAttribute('aria-expanded', String(!isCurrentlyVisible));

            const toggleSidebarTextElem = toggleSidebarBtn.querySelector('.toggle-sidebar-text');
            if (toggleSidebarTextElem) {
                toggleSidebarTextElem.textContent = !isCurrentlyVisible ? "Keskittymistila" : "Näytä sivuvalikko";
            }
            toggleSidebarBtn.title = !isCurrentlyVisible ? "Piilota sivuvalikko (Keskittymistila)" : "Näytä sivuvalikko";


            // Mobiilin overlay-tausta
            if (window.innerWidth <= 767) {
                document.body.classList.toggle('sidebar-open', !isCurrentlyVisible);
                setTimeout(() => {
                    document.body.classList.toggle('sidebar-really-open', !isCurrentlyVisible);
                }, 10);
            }
        }
    }

    if (toggleSidebarBtn && sidebar) {
        // Oletustila: Aseta sivupalkki näkyväksi isommilla näytöillä, piiloon pienemmillä
        const showSidebarByDefault = window.innerWidth > 900;
        sidebar.classList.toggle('sidebar-hidden', !showSidebarByDefault);
        sidebar.classList.toggle('sidebar-visible', showSidebarByDefault);
        toggleSidebarBtn.classList.toggle('active', showSidebarByDefault);
        toggleSidebarBtn.setAttribute('aria-expanded', String(showSidebarByDefault));

        const toggleSidebarTextElem = toggleSidebarBtn.querySelector('.toggle-sidebar-text');
        if (toggleSidebarTextElem) {
            toggleSidebarTextElem.textContent = showSidebarByDefault ? "Keskittymistila" : "Näytä sivuvalikko";
        }
        toggleSidebarBtn.title = showSidebarByDefault ? "Piilota sivuvalikko (Keskittymistila)" : "Näytä sivuvalikko";

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
            // initializeInfoArea(); // POISTETTU
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
                const nameSpan = document.createElement('span');
                nameSpan.textContent = warmup.name;
                button.appendChild(nameSpan);
                if (warmup.durationMinutes) {
                    const durationSpan = document.createElement('span');
                    durationSpan.classList.add('duration');
                    durationSpan.textContent = ` (${warmup.durationMinutes} min)`;
                    button.appendChild(durationSpan);
                }
                button.classList.add('routine-button');
                button.dataset.routineType = 'warmup';
                button.dataset.routineId = warmup.id;
                button.addEventListener('click', () => selectRoutine('warmup', warmup.id));
                warmupButtonsContainer.appendChild(button);
            });
            startWarmupBtn.disabled = true; startWarmupBtn.style.display = 'none';
        } else { warmupButtonsContainer.innerHTML = '<p>Lämmittelyitä ei löytynyt.</p>'; }
    }
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = '';
        if (allCooldowns && allCooldowns.length > 0) {
             allCooldowns.forEach(cooldown => {
                 if (!cooldown || !cooldown.id || !cooldown.name) { console.warn("Skipping invalid cooldown item:", cooldown); return; }
                const button = document.createElement('button');
                const nameSpan = document.createElement('span');
                nameSpan.textContent = cooldown.name;
                button.appendChild(nameSpan);
                if (cooldown.durationMinutes) {
                    const durationSpan = document.createElement('span');
                    durationSpan.classList.add('duration');
                    durationSpan.textContent = ` (${cooldown.durationMinutes} min)`;
                    button.appendChild(durationSpan);
                }
                button.classList.add('routine-button');
                button.dataset.routineType = 'cooldown';
                button.dataset.routineId = cooldown.id;
                button.addEventListener('click', () => selectRoutine('cooldown', cooldown.id));
                cooldownButtonsContainer.appendChild(button);
            });
            startCooldownBtn.disabled = true; startCooldownBtn.style.display = 'none';
        } else { cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelyitä ei löytynyt.</p>';}
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
        currentRoutineSteps = mappedEx; currentStepIndex = 0; currentRound = 1; // currentWorkoutExercises poistettu, koska currentRoutineSteps ajaa saman asian
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
            itemNameH2.textContent = "Valitse toiminto";
            itemDescriptionP.innerHTML = "<p>Valitse ensin lämmittely, treeni tai jäähdyttely.</p>"; // Käytä innerHTML:ää oletusviestillekin
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            timerLabelP.textContent = 'Odottamassa...'; timeRemainingSpan.textContent = '00:00';
            highlightCurrentStep(); updateRoundDisplay(); return;
        }

        const step = currentRoutineSteps[index];
        itemNameH2.textContent = step.displayTitle || step.name || 'Nimetön vaihe';
        itemDescriptionP.innerHTML = ''; // Tyhjennä aina ensin!

        const descriptionToParse = step.description || "";

        if (descriptionToParse.trim()) {
            const lines = descriptionToParse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let ol = null; // Järjestetty lista
            let ul = null; // Järjestämätön lista (esim. "- " alkaville)
            let currentList = null; // Viittaus aktiiviseen listaan (ol tai ul)

            lines.forEach(line => {
                // Tarkista numeroidut kohdat (esim. "1. Teksti")
                if (/^\d+\.\s/.test(line)) {
                    if (!ol) { // Jos <ol> ei ole, luo se
                        ol = document.createElement('ol');
                        itemDescriptionP.appendChild(ol);
                        ul = null; // Nollaa ul, jos siirrytään numeroituun listaan
                    }
                    currentList = ol;
                    const li = document.createElement('li');
                    // Poista "N. " alusta, koska <ol> hoitaa numeroinnin
                    li.textContent = line.replace(/^\d+\.\s*/, '');
                    if (/^Huom:\s/.test(line.replace(/^\d+\.\s*/, ''))) { // Tarkista Huom: jäljelle jäävästä tekstistä
                        li.classList.add('description-note');
                        li.textContent = line.replace(/^\d+\.\s*/, '').replace(/^Huom:\s*/, ''); // Poista myös Huom:
                         // Lisää "Huom: " takaisin vahvennettuna, jos halutaan
                        const strongHuom = document.createElement('strong');
                        strongHuom.textContent = "Huom: ";
                        li.insertBefore(strongHuom, li.firstChild);
                    }
                    currentList.appendChild(li);
                }
                // Tarkista "Huom:"-alkuiset rivit, jotka EIVÄT ole osa numeroitua listaa
                else if (/^Huom:\s/.test(line)) {
                    if (currentList && currentList.lastChild && currentList.lastChild.tagName === 'LI') {
                        // Jos on aktiivinen lista, lisätään Huom: edellisen listakohdan loppuun tai omana kohtanaan
                        const li = document.createElement('li');
                        li.textContent = line.replace(/^Huom:\s*/, '');
                        li.classList.add('description-note');
                        const strongHuom = document.createElement('strong');
                        strongHuom.textContent = "Huom: ";
                        li.insertBefore(strongHuom, li.firstChild);
                        currentList.appendChild(li);

                    } else { // Ei aktiivista listaa, tee Huom: omaksi kappaleekseen
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>Huom:</strong> ${line.replace(/^Huom:\s*/, '')}`;
                        p.classList.add('description-note-paragraph');
                        itemDescriptionP.appendChild(p);
                        ol = null; ul = null; currentList = null; // Nollaa listat, koska tämä on erillinen
                    }
                }
                // Tarkista luetelmamerkki "-" tai "*"
                else if (/^[-*]\s/.test(line)) {
                    if (!ul) { // Jos <ul> ei ole, luo se
                        ul = document.createElement('ul');
                        itemDescriptionP.appendChild(ul);
                        ol = null; // Nollaa ol, jos siirrytään järjestämättömään listaan
                    }
                    currentList = ul;
                    const li = document.createElement('li');
                    li.textContent = line.replace(/^[-*]\s*/, ''); // Poista "- " tai "* " alusta
                    currentList.appendChild(li);
                }
                // Jos rivi ei ole listan alku, mutta lista on jo aloitettu
                else if (currentList && currentList.lastChild && currentList.lastChild.tagName === 'LI') {
                    // Lisätään rivi edellisen li-elementin sisällön jatkoksi <br>:n kanssa
                    // Tämä on yksinkertaistus, monimutkaisempi jäsennys voisi olla parempi
                    // jos rivit voivat olla todella pitkiä kappaleita listan sisällä.
                    const br = document.createElement('br');
                    currentList.lastChild.appendChild(br);
                    currentList.lastChild.appendChild(document.createTextNode(line));
                }
                // Muuten se on normaali tekstikappale
                else {
                    const p = document.createElement('p');
                    p.textContent = line;
                    itemDescriptionP.appendChild(p);
                    ol = null; ul = null; currentList = null; // Nollaa listat, koska tämä on erillinen kappale
                }
            });

            if (!itemDescriptionP.hasChildNodes()) {
                const p = document.createElement('p');
                p.textContent = "Suorita harjoitus ohjeen mukaan.";
                itemDescriptionP.appendChild(p);
            }
        } else {
            const p = document.createElement('p');
            p.textContent = (activeRoutineType === 'workout' || activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') ? "Suorita ohjeen mukaan." : "Valitse toiminto.";
            itemDescriptionP.appendChild(p);
        }

        // Kuvan ja ajastimen näyttölogiikka
        if (activeRoutineType === 'workout') {
            if (step.image) { itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name; itemImageImg.style.display = 'block'; }
            else { itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; }
            timerDiv.style.visibility = 'visible'; timerDiv.classList.remove('routine-timer-active');
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                remainingTime = step.workTime || 0; updateTimerDisplay(remainingTime); timerLabelP.textContent = "Valmiina";
            }
        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Warmup/cooldown vaiheilla ei yleensä ole kuvia JSONissa, mutta jos olisi, ne näytettäisiin tässä
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

    // function initializeInfoArea() { // POISTETTU
    //     if (infoContentWrapper && toggleInfoBtn && toggleInfoTextSpan) {
    //         infoContentWrapper.classList.add('collapsed'); toggleInfoBtn.setAttribute('aria-expanded', 'false');
    //         toggleInfoTextSpan.textContent = "Näytä";
    //         toggleInfoBtn.addEventListener('click', toggleInfoArea);
    //     }
    // }
    // function toggleInfoArea() { // POISTETTU
    //     const isCollapsed = infoContentWrapper.classList.toggle('collapsed'); const isExpanded = !isCollapsed;
    //     toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded));
    //     if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä";
    // }

    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        const targetScrollElement = mainViewArea || document.documentElement || document.body;
        const headerOffset = header ? header.offsetHeight : 0;
        const additionalPadding = 20;
        if (!selectionArea.classList.contains('hidden')) {
            toggleTrainingSelectionVisibility();
            setTimeout(() => {
                targetScrollElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.scrollBy(0, -(headerOffset + additionalPadding));
            }, 400);
        } else {
            targetScrollElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.scrollBy(0, -(headerOffset + additionalPadding));
        }
        if (activeRoutineType === 'workout') {
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            beepSound.volume = 0.001; beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true; proceedWithWorkoutStart();
            }).catch(error => { isAudioUnlocked = true; proceedWithWorkoutStart(); });
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

    function stopTimer() {
        stopTimerInterval(); pausedState = null;
        if (timerDiv) timerDiv.classList.remove('timer-resting', 'timer-paused');
    }
    function stopTimerInterval() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    }
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
        else { // Tuli suoraan edellisestä harjoituksesta (ei lepoa välissä)
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { currentRound++; currentStepIndex = 0; }
            else if (!isLastEx) { currentStepIndex++; }
            // Jos oli lastEx JA lastR, finishRoutine kutsutaan handleTimerEnd:ssä tai aiemmin moveToNextPhase:ssa
        }
        if (currentRound > currentWorkoutInfo.rounds) finishRoutine();
        else if (currentStepIndex < currentRoutineSteps.length) {
            const nextEx = currentRoutineSteps[currentStepIndex];
            if (!nextEx || typeof nextEx.workTime === 'undefined') { resetAppState(); return; }
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else {
             // Tänne ei pitäisi päätyä, jos currentRound <= currentWorkoutInfo.rounds
             // Mutta jos päädytään, se tarkoittaa, että kierrokset ovat täynnä.
            finishRoutine();
        }
    }

    function startRoutineTimer() {
        stopRoutineTimer(); if(timerState !== TimerState.RUNNING_STEP) return;
        updateTimerDisplay(elapsedRoutineTime);
        routineTimerInterval = setInterval(() => {
            if (timerState !== TimerState.RUNNING_STEP) { stopRoutineTimer(); return; }
            elapsedRoutineTime++; updateTimerDisplay(elapsedRoutineTime);
        }, 1000);
    }
    function stopRoutineTimer() {
        if (routineTimerInterval) { clearInterval(routineTimerInterval); routineTimerInterval = null; }
    }

    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds);
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        if (timerState === TimerState.IDLE && activeRoutineType === 'none') timerLabelP.textContent = 'Odottamassa...';
        // Timer labelia päivitetään myös displayStep, startTimerForPhase ja finishRoutine -funktioissa
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
    function prevStep() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex > 0) { jumpToStep(currentStepIndex - 1); }
    }
    function nextStepNav() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length - 1) { jumpToStep(currentStepIndex + 1); }
    }

    function updateButtonStates() {
        pauseResumeBtn.style.display = 'none'; stopBtn.style.display = 'none'; nextStepBtn.style.display = 'none';
        startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
        const routineSelectedAndIdle = currentRoutineSteps.length > 0 && timerState === TimerState.IDLE;
        if (routineSelectedAndIdle) {
            if (activeRoutineType === 'warmup') {
                startWarmupBtn.style.display = 'block'; startWarmupBtn.disabled = !selectedRoutineData;
                 if (selectedRoutineData) {
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startWarmupBtn.textContent = `Aloita: ${name}`;
                 } else { startWarmupBtn.textContent = 'Aloita Lämmittely'; }
            } else if (activeRoutineType === 'workout') {
                startWorkoutBtn.style.display = 'block'; startWorkoutBtn.disabled = currentWorkoutInfo.week === null;
                startWorkoutBtn.textContent = 'Aloita Treeni';
            } else if (activeRoutineType === 'cooldown') {
                startCooldownBtn.style.display = 'block'; startCooldownBtn.disabled = !selectedRoutineData;
                 if (selectedRoutineData) {
                     const name = selectedRoutineData.name.length > 20 ? selectedRoutineData.name.substring(0, 18) + '...' : selectedRoutineData.name;
                     startCooldownBtn.textContent = `Aloita: ${name}`;
                 } else { startCooldownBtn.textContent = 'Aloita Jäähdyttely'; }
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
        selectedRoutineData = null; currentRoutineSteps = []; // currentWorkoutExercises poistettu
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
            const showSidebarByDefault = window.innerWidth > 900;
            const sidebarIsHidden = sidebar.classList.contains('sidebar-hidden');

            if (showSidebarByDefault && sidebarIsHidden) {
                toggleSidebarVisibility(); // Näytä, jos piilossa isolla näytöllä ja pitäisi olla näkyvissä
            } else if (!showSidebarByDefault && !sidebarIsHidden) {
                toggleSidebarVisibility(); // Piilota, jos näkyvissä pienellä näytöllä ja pitäisi olla piilossa
            }
            // Mobiili overlayn poisto
             if (window.innerWidth <= 767) {
                document.body.classList.remove('sidebar-open', 'sidebar-really-open');
                 // Varmistetaan, että jos sivupalkki ei ole oletuksena auki, se on piilossa
                 if (!showSidebarByDefault && !sidebar.classList.contains('sidebar-hidden')) {
                    // toggleSidebarVisibility() kutsuttiin jo yllä, jos tarpeen.
                    // Varmistetaan kuitenkin, että tekstit ja tilat ovat oikein.
                    sidebar.classList.add('sidebar-hidden');
                    sidebar.classList.remove('sidebar-visible');
                    toggleSidebarBtn.classList.remove('active');
                    toggleSidebarBtn.setAttribute('aria-expanded', 'false');
                    const toggleSidebarTextElem = toggleSidebarBtn.querySelector('.toggle-sidebar-text');
                    if (toggleSidebarTextElem) toggleSidebarTextElem.textContent = "Näytä sivuvalikko";
                    toggleSidebarBtn.title = "Näytä sivuvalikko";
                 }
            }
        }

         if (resetSelections) {
             activeRoutineType = 'none'; currentWorkoutInfo.week = null;
             startWarmupBtn.style.display = 'none'; startWorkoutBtn.style.display = 'none'; startCooldownBtn.style.display = 'none';
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === '2'); });
             // if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) toggleInfoArea(); // POISTETTU
             if (selectionArea && !selectionArea.classList.contains('hidden')) toggleTrainingSelectionVisibility();
        } else {
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); });
        }
        updateButtonStates();
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
        // Jos RUNNING_ROUND_REST, nextIdx on 0, joka hoidetaan displayStepissä ja highlightCurrentStepissä
        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    }
    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up');
        if (item) item.classList.remove('next-up');
    }

    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.classList.toggle('open', !hidden);
        // Tekstin muuttaminen poistettu, koska nappiteksti on nyt staattinen "Valitse treeni"
        // const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        // if (toggleTextElem) toggleTextElem.textContent = hidden ? "Valinnat" : "Piilota valinnat";
    }

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

    // --- Sovelluksen käynnistys ---
    loadAppData();
});