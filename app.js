// app.js (Versio 2 - Refaktoroitu Vaihe 1: Yhteensopivuus uuden HTML/JSON kanssa)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit (Päivitetty vastaamaan index.html) ---
    const appDiv = document.getElementById('app'); // Lisätty viittaus pää-diviin
    const header = document.querySelector('header'); // Lisätty
    const toggleSelectionAreaBtn = document.getElementById('toggle-selection-area'); // Nimi muutettu
    const selectionArea = document.getElementById('selection-area'); // Nimi muutettu

    // Valinta-alueen elementit
    const warmupSelectionDiv = document.getElementById('warmup-selection'); // Uusi
    const warmupButtonsContainer = document.getElementById('warmup-buttons-container'); // Uusi
    const startWarmupBtn = document.getElementById('start-warmup-btn'); // Uusi

    const trainingSelectionDiv = document.getElementById('training-selection'); // Nimi muutettu
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelSelectionDiv = document.getElementById('level-selection'); // Uusi
    const levelButtonsContainer = document.getElementById('level-buttons-container');
    const startWorkoutBtn = document.getElementById('start-workout-btn'); // Uusi (tämä saa audio unlockin)

    const cooldownSelectionDiv = document.getElementById('cooldown-selection'); // Uusi
    const cooldownButtonsContainer = document.getElementById('cooldown-buttons-container'); // Uusi
    const startCooldownBtn = document.getElementById('start-cooldown-btn'); // Uusi

    // Pääsisällön elementit
    const mainLayout = document.querySelector('main.main-layout'); // Uusi
    const sidebar = document.getElementById('sidebar'); // Uusi
    const infoArea = document.getElementById('info-area'); // Uusi
    const infoAreaTitleH2 = document.getElementById('info-area-title'); // Uusi
    const infoAreaNotesContainer = document.getElementById('info-area-notes-container'); // Uusi
    const infoAreaNotesP = document.getElementById('info-area-notes'); // ID Muutettu (oli workoutNotesP)
    const stepsListArea = document.getElementById('steps-list-area'); // Uusi
    const stepsListTitleH2 = document.getElementById('steps-list-title'); // Uusi
    const stepsListUl = document.getElementById('steps-items'); // ID Muutettu (oli exerciseListUl)

    const activeDisplaySection = document.getElementById('active-display'); // Uusi
    const titleAreaDiv = document.getElementById('title-area'); // Uusi
    const prevBtn = document.getElementById('prev-btn'); // Pidetään tämä ID
    const itemNameH2 = document.getElementById('item-name'); // ID Muutettu (oli exerciseNameH2)
    const nextBtn = document.getElementById('next-btn'); // Pidetään tämä ID

    const contentSplitDiv = document.getElementById('content-split'); // Uusi
    const itemDetailsDiv = document.getElementById('item-details'); // Uusi
    const itemImageImg = document.getElementById('item-image'); // ID Muutettu (oli exerciseImageImg)
    const itemDescriptionP = document.getElementById('item-description'); // ID Muutettu (oli exerciseDescriptionP)

    const timerAndControlsDiv = document.getElementById('timer-and-controls'); // Uusi
    const roundInfoP = document.getElementById('round-info'); // Pidetään tämä ID
    const timerDiv = document.getElementById('timer'); // Pidetään tämä ID
    const timeRemainingSpan = document.getElementById('time-remaining'); // Pidetään tämä ID
    const timerLabelP = document.getElementById('timer-label'); // Pidetään tämä ID

    // Uudet yleiset kontrollinapit
    const pauseResumeBtn = document.getElementById('pause-resume-btn'); // Uusi
    const stopBtn = document.getElementById('stop-btn'); // ID Muutettu (oli myös stop-btn, mutta eri paikassa)
    const nextStepBtn = document.getElementById('next-step-btn'); // Uusi

    // --- Ääniobjekti ---
    const beepSound = new Audio('audio/beep.mp3'); // Varmista polku!
    beepSound.load();

    function playSound(audioElement) {
        if (!audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        audioElement.volume = 1.0;
        audioElement.play().catch(error => console.warn("Audio playback failed:", error));
    }

    // --- Sovelluksen tila ---
    let fullProgramData = null;
    let warmupData = null; // Uusi
    let cooldownData = null; // Uusi
    let currentWorkoutExercises = []; // Pidetään treenille
    let currentRoutineSteps = []; // UUSI: Aktiivisen rutiinin (warmup/workout/cooldown) vaiheet
    let currentStepIndex = 0; // UUSI: Yleinen indeksi aktiivisen rutiinin vaiheille
    let activeRoutineType = 'none'; // UUSI: 'none', 'warmup', 'workout', 'cooldown'
    let currentWorkoutInfo = { // Pidetään treenin spekseille
        week: null, phaseIndex: null, level: '2', rounds: 0, restBetweenRounds: 0, notes: '', focus: ''
    };
    // currentExerciseIndex -> korvataan currentStepIndex:llä
    let currentRound = 1; // Pidetään treenille
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished', RUNNING_STEP: 'running_step' }; // Lisätty RUNNING_STEP warmup/cooldownille
    let timerState = TimerState.IDLE;
    let pausedState = null;
    let isAudioUnlocked = false; // Pidetään treenin äänille

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            // Varmista, että päädata on olemassa
            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.warmup || !fullProgramData.cooldown || !fullProgramData.exercises) {
                 console.error("Loaded data structure seems incorrect or incomplete.");
                 itemNameH2.textContent = "Virheellinen ohjelmadata.";
                 return;
             }

            // Tallenna warmup/cooldown data
            warmupData = fullProgramData.warmup;
            cooldownData = fullProgramData.cooldown;

            populateWarmupSelector(); // Uusi funktio
            populateCooldownSelector(); // Uusi funktio
            populateWeekSelectors(); // Vanha, mutta tarvitaan edelleen
            addLevelButtonListeners(); // Vanha, mutta tarvitaan edelleen
            resetAppState(); // Nimi muutettu

        } catch (error) {
            console.error("Could not load or process program data:", error);
            itemNameH2.textContent = "Virhe ladattaessa ohjelmaa.";
            resetAppState(); // Nimi muutettu
        }
    }

    // --- UI Populointi ja Kuuntelijat ---

    // UUSI: Populoi lämmittelynappi
    function populateWarmupSelector() {
        warmupButtonsContainer.innerHTML = ''; // Tyhjennä "Ladataan..."
        if (warmupData && warmupData.description) {
            const button = document.createElement('button');
            button.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
            button.classList.add('routine-button'); // Käytetään HTML:ssä olevaa tyyliä
            button.dataset.routine = 'warmup';
            // Lisätään kuuntelija tälle napille (voi tehdä myös erikseen)
             button.addEventListener('click', () => selectRoutine('warmup'));
            warmupButtonsContainer.appendChild(button);
            startWarmupBtn.disabled = false; // Aktivoi start-nappi kun data on
        } else {
            warmupButtonsContainer.innerHTML = '<p>Lämmittelytietoja ei löytynyt.</p>';
            startWarmupBtn.disabled = true;
        }
    }

    // UUSI: Populoi jäähdyttelynappi
    function populateCooldownSelector() {
        cooldownButtonsContainer.innerHTML = ''; // Tyhjennä "Ladataan..."
        if (cooldownData && cooldownData.description) {
            const button = document.createElement('button');
            button.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            button.classList.add('routine-button'); // Käytetään HTML:ssä olevaa tyyliä
            button.dataset.routine = 'cooldown';
             button.addEventListener('click', () => selectRoutine('cooldown'));
            cooldownButtonsContainer.appendChild(button);
            startCooldownBtn.disabled = false; // Aktivoi start-nappi kun data on
        } else {
            cooldownButtonsContainer.innerHTML = '<p>Jäähdyttelytietoja ei löytynyt.</p>';
            startCooldownBtn.disabled = true;
        }
    }

    function populateWeekSelectors() { // Pidetään tämä treenille
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) return;
        weekButtonsContainer.innerHTML = ''; const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button'); button.textContent = `Viikko ${i}`; button.classList.add('week-button');
            button.dataset.weekNumber = i; button.addEventListener('click', () => handleWeekSelect(i));
            weekButtonsContainer.appendChild(button);
        }
    }
    function addLevelButtonListeners() { // Pidetään tämä treenille
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => { button.addEventListener('click', () => handleLevelSelect(button.dataset.level)); });
    }

    // UUSI: Yleinen rutiinin valintafunktio (kutsutaan warmup/cooldown napeista)
     function selectRoutine(routineType) {
         console.log(`Routine selected: ${routineType}`);
         // Tässä voisi päivittää info-aluetta ja vaihelistaa heti valinnan jälkeen
         // Esim. näyttää warmup/cooldown kuvauksen ja stepit
         activeRoutineType = routineType; // Asetetaan valituksi, muttei vielä käynnissä
         // Poista muiden rutiinien korostukset/valinnat
         resetAppState(false); // Resetoi tila, mutta älä välttämättä piilota valikkoja
         currentRoutineSteps = []; // Tyhjennä vaiheet

         // Korosta valittu rutiininappi (jos tarpeen)
         document.querySelectorAll('.routine-button').forEach(btn => btn.classList.remove('active'));
         const selectedBtn = document.querySelector(`.routine-button[data-routine="${routineType}"]`);
         if (selectedBtn) selectedBtn.classList.add('active');

         // Päivitä sivupalkki
         if (routineType === 'warmup' && warmupData) {
             infoAreaTitleH2.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
             updateInfoAreaNotes(warmupData.description);
             currentRoutineSteps = warmupData.steps.map((step, index) => ({ ...step, index })); // Lisää indeksi
             populateStepsList(currentRoutineSteps);
             displayStep(0); // Näytä eka steppi
             startWarmupBtn.style.display = 'block'; // Varmista näkyvyys
             startWorkoutBtn.style.display = 'none';
             startCooldownBtn.style.display = 'none';

         } else if (routineType === 'cooldown' && cooldownData) {
             infoAreaTitleH2.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
             updateInfoAreaNotes(cooldownData.description);
             currentRoutineSteps = cooldownData.steps.map((step, index) => ({ ...step, index })); // Lisää indeksi
             populateStepsList(currentRoutineSteps);
             displayStep(0); // Näytä eka steppi
             startWarmupBtn.style.display = 'none';
             startWorkoutBtn.style.display = 'none';
             startCooldownBtn.style.display = 'block'; // Varmista näkyvyys
         } else {
             // Treenin valinta hoidetaan handleWeekSelectissä
             updateInfoAreaNotes("Valitse toiminto yläpuolelta.");
             populateStepsList([]);
         }
         updateButtonStates();
     }


    function handleLevelSelect(selectedLevel) { // Pidetään treenille
        if (selectedLevel === currentWorkoutInfo.level) return; console.log(`Level selected: ${selectedLevel}`); currentWorkoutInfo.level = selectedLevel;
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.level === selectedLevel); });
        if (currentWorkoutInfo.week !== null) { handleWeekSelect(currentWorkoutInfo.week); } // Päivitä treeni jos viikko valittu
        else { updateInfoAreaNotes(); } // Muuten päivitä vain infotaso
    }

    function handleWeekSelect(weekNumber) { // Hakee ja asettaa TREENIN datan
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        resetAppState(false); // Resetoi tila, mutta älä resetoi tasoa tai piilota valikkoa
        activeRoutineType = 'workout'; // Merkitään että treeni on nyt valittu rutiini

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Workout data missing."); resetAppState(); return;
        }
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) {
            console.error(`Workout phase not found.`); resetAppState(); itemNameH2.textContent = `Vaihetta ei löytynyt.`; return;
        }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx]; const level = currentWorkoutInfo.level;
        const levelData = phase.levels?.[level]; if (!levelData?.timeBased) {
            console.error(`Workout level data not found.`); resetAppState(); itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt.`; return;
        }
        const workTime = levelData.timeBased.workSeconds; const restTime = levelData.timeBased.restSeconds;

        // Huom! Kolmannessa vaiheessa käytetään exampleWeeklyExercises
        let exerciseListSource = [];
        if (phaseIdx === 2 && phase.exampleWeeklyExercises) { exerciseListSource = phase.exampleWeeklyExercises; }
        else if (phase.weeklyExercises) { exerciseListSource = phase.weeklyExercises; }
        else { console.error(`No exercises in phase.`); resetAppState(); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return; }

        const mappedEx = exerciseListSource.map((pEx, index) => { // Lisätään index
            if (!pEx?.exerciseId) return null;
            const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId);
            if (!fEx) return null;
            return { ...fEx, displayTitle: pEx.displayTitle || fEx.name, notes: pEx.notes || '', workTime, restTime, index }; // Lisätty index
        }).filter(ex => ex !== null);

        if (mappedEx.length === 0) {
            console.error(`No valid exercises mapped for workout.`); resetAppState(); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return;
        }

        currentWorkoutExercises = mappedEx; // Treenin omat harjoitukset
        currentRoutineSteps = mappedEx; // Yleiseen vaihelistaan myös
        currentStepIndex = 0; currentRound = 1;

        currentWorkoutInfo = {
            ...currentWorkoutInfo, week: weekNumber, phaseIndex: phaseIdx,
            rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1,
            restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0,
            notes: phase.phaseInfo.focus || '', focus: phase.phaseInfo.focus || ''
        };

        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);

        // Päivitä UI treenin tiedoilla
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`;
        populateStepsList(currentRoutineSteps);
        updateInfoAreaNotes(); // Käyttää nyt currentWorkoutInfoa
        displayStep(currentStepIndex);
        updateButtonStates();
        highlightWeekButton(weekNumber);
        updateRoundDisplay();
        startWarmupBtn.style.display = 'none';
        startWorkoutBtn.style.display = 'block'; // Näytä treenin start-nappi
        startCooldownBtn.style.display = 'none';
    }

     function updateInfoAreaNotes(customNote = null) { // Yleistetty infoalueen päivitys
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
         }
          else {
             noteText = "Valitse toiminto yläpuolelta.";
         }
         infoAreaNotesP.textContent = noteText;
         if (!infoAreaNotesP.textContent.trim()){
              infoAreaNotesP.textContent = "Valitse toiminto yläpuolelta.";
         }
     }

    function highlightWeekButton(weekNumber) { // Pidetään treenille
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    }

    function populateStepsList(steps) { // Yleistetty vaihelistan populointi
        stepsListUl.innerHTML = '';
        if (!steps || steps.length === 0) {
            stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>';
            stepsListTitleH2.textContent = "Vaiheet";
            return;
        }
        // Päivitä otsikko rutiinin mukaan
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";

        steps.forEach((step, index) => {
            const li = document.createElement('li');
            // Käytä displayTitle jos se on olemassa (treeni), muuten name (warmup/cooldown)
            li.textContent = `${index + 1}. ${step.displayTitle || step.name}`;
            li.dataset.index = index;
            li.classList.add('step-item'); // Käytetään CSS:n uutta luokkaa
            li.addEventListener('click', () => {
                // Salli hyppy vain jos ajastin ei ole käynnissä
                if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                    jumpToStep(index);
                }
            });
            stepsListUl.appendChild(li);
        });
    }

     function jumpToStep(index) { // Yleistetty hyppy vaiheeseen
        if (index >= 0 && index < currentRoutineSteps.length) {
            stopTimer(); // Pysäytä ajastin jos oli käynnissä
            currentStepIndex = index;
            currentRound = 1; // Nollaa kierros aina hypätessä
            timerState = TimerState.IDLE;
            displayStep(currentStepIndex);
            updateButtonStates();
            clearNextUpHighlight();
            removeBodyLock();
            updateRoundDisplay();
        }
    }

    function displayStep(index) { // Yleistetty vaiheen näyttö
        if (index < 0 || index >= currentRoutineSteps.length || !currentRoutineSteps[index]) {
            console.error(`Invalid step index: ${index}`);
            resetAppState();
            itemNameH2.textContent = "Virhe vaiheen näyttämisessä";
            itemDescriptionP.textContent = `Vaihetta ei löytynyt indeksillä ${index}.`;
            return;
        }
        const step = currentRoutineSteps[index];
        itemNameH2.textContent = step.displayTitle || step.name; // Käytä displayTitle tai name
        // Näytä kuvaus ja huomiot, jos niitä on
        let descriptionText = step.description || '';
        if (step.notes) {
             descriptionText += `\n\nHuom: ${step.notes}`;
        }
        itemDescriptionP.textContent = descriptionText.trim();

        // Näytä kuva, jos sellainen on määritelty (lähinnä treeneissä)
        if (step.image) {
            itemImageImg.src = step.image;
            itemImageImg.alt = step.displayTitle || step.name;
            itemImageImg.style.display = 'block';
        } else {
            itemImageImg.style.display = 'none';
            itemImageImg.src = '';
            itemImageImg.alt = '';
        }

        // Jos ajastin ei käy, näytä vaiheen oletusaika (treenille workTime, muille 0?)
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
            remainingTime = step.workTime || 0; // Oletus 0 jos ei workTime (warmup/cooldown)
            updateTimerDisplay(remainingTime);
            // Piilota ajastin warmup/cooldownille IDLE-tilassa? Tai näytä 00:00.
            if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
                timerDiv.style.visibility = 'hidden'; // Piilotetaan ajastin kun ei käynnissä
                roundInfoP.textContent = ''; // Piilotetaan kierrosinfo
            } else {
                timerDiv.style.visibility = 'visible';
                updateRoundDisplay(); // Näytä kierrosinfo treenille
            }
        }
        highlightCurrentStep(); // Nimi muutettu
    }

    // --- Ajastimen ja Rutiinin Etenemisen toiminnot ---

    // UUSI: Yleinen start-funktio (kutsutaan start-napeista)
    function startSelectedRoutine() {
        if (activeRoutineType === 'none') {
            console.warn("No routine selected to start.");
            return;
        }
        if (timerState !== TimerState.IDLE) {
            console.warn("Another routine or timer is already active.");
            return;
        }

        // Audio Unlock vain TREENILLE
        if (activeRoutineType === 'workout') {
            // Tarkista ensin voiko startata
             if (currentRoutineSteps.length === 0) {
                 console.log("Workout steps not loaded. Cannot start/unlock audio yet.");
                 return;
             }
            // Jos ääni on jo avattu
            if (isAudioUnlocked) {
                console.log("Audio already unlocked, starting workout directly.");
                proceedWithWorkoutStart(); // Käynnistä treeni
                return;
            }
            // Yritetään 'avata' äänikonteksti
            console.log("Attempting to unlock audio context on start click...");
            beepSound.volume = 0.001;
            beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0;
                isAudioUnlocked = true;
                console.log("Audio context unlocked.");
                proceedWithWorkoutStart(); // Käynnistä treeni
            }).catch(error => {
                console.warn("Audio context unlock failed. Proceeding without guaranteed audio:", error);
                beepSound.volume = 1.0;
                isAudioUnlocked = true; // Merkitse silti avatuksi, jotta myöhemmät yritykset tapahtuvat
                proceedWithWorkoutStart(); // Käynnistä treeni silti
            });
        } else {
            // Warmup tai Cooldown - ei tarvita audio unlockia
            proceedWithRoutineStart();
        }
    }

    // Apufunktio treenin käynnistämiseen audio-unlockin jälkeen
    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
             console.warn("Workout start conditions not met after audio check.");
             return;
        }
        console.log("Starting WORKOUT...");
        currentStepIndex = 0; currentRound = 1;
        updateRoundDisplay();
        displayStep(currentStepIndex);
        addBodyLock();
        selectionArea.classList.add('hidden'); // Piilota valikko kun treeni alkaa
        toggleSelectionAreaBtn.textContent = "Valitse treeni ⯆";
        timerDiv.style.visibility = 'visible'; // Varmista ajastimen näkyvyys
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime);
    }

    // UUSI: Funktio Warmup/Cooldown käynnistämiseen
    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
            console.warn("Routine start conditions not met.");
            return;
        }
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`);
        currentStepIndex = 0;
        currentRound = 1; // Ei käytetä, mutta nollataan
        updateRoundDisplay(); // Tyhjentää kierrosinfon
        displayStep(currentStepIndex);
        addBodyLock();
        selectionArea.classList.add('hidden'); // Piilota valikko
        toggleSelectionAreaBtn.textContent = "Valitse treeni ⯆";

        // Aseta tila ja näytä/aktivoi oikeat napit
        timerState = TimerState.RUNNING_STEP; // Uusi tila vaiheittaiselle etenemiselle
        timerDiv.style.visibility = 'hidden'; // Pidä ajastin piilossa
        timeRemainingSpan.textContent = '--:--'; // Näytä jotain muuta ajastimen paikalla?
        timerLabelP.textContent = "Suorita vaihe";
        updateButtonStates(); // Tämä näyttää next-step-btn ja stop-btn
    }


    function pauseResumeTimer() { // Toimii nyt #pause-resume-btn kanssa
         // Tämä toimii vain TREENIN aikana (ajastin käytössä)
         if (activeRoutineType !== 'workout') return;

        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED; console.log("Workout Paused");
            pauseResumeBtn.textContent = "▶ Jatka"; // Päivitetään uutta nappia
            pauseResumeBtn.classList.add('paused'); // Käytetään CSS-luokkaa
            timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
             console.log("Workout Resumed"); timerState = pausedState || TimerState.RUNNING_EXERCISE; // Palauta edellinen ajastintila
             pausedState = null;
             runTimerInterval(); // Käynnistä ajastin uudelleen
             pauseResumeBtn.textContent = "⏸ Tauko"; // Päivitetään uutta nappia
             pauseResumeBtn.classList.remove('paused');
             timerDiv.classList.remove('timer-paused');
             // Palauta lepotilan korostus tarvittaessa
             if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                  timerDiv.classList.add('timer-resting'); highlightNextStep(); // Nimi muutettu
             } else {
                 timerDiv.classList.remove('timer-resting'); clearNextUpHighlight();
             }
        }
        updateButtonStates();
    }

    // UUSI: Yleinen stop-funktio
    function stopActiveRoutine() { // Toimii nyt #stop-btn kanssa
        console.log(`Stopping ${activeRoutineType}...`);
        stopTimer(); // Pysäyttää ajastimen jos käynnissä
        clearNextUpHighlight();
        removeBodyLock();
        currentRound = 1;
        pausedState = null;
        timerState = TimerState.IDLE;
        const previouslyActiveType = activeRoutineType; // Tallenna tyyppi ennen resetointia
        activeRoutineType = 'none'; // Merkitään ettei mikään ole aktiivinen

        // Palauta näyttö johonkin perustilaan tai viimeksi valittuun steppiin
        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
            displayStep(currentStepIndex); // Näytä steppi jossa oltiin
            updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0); // Näytä oletusaika
        } else {
             // Jos ei ole steppejä, resetoi laajemmin
             resetAppState(); // Tämä kutsuu myös updateButtonStates
             return; // Poistu, reset hoitaa loput
        }

        // Päivitä UI perustuen siihen mikä rutiini pysäytettiin
        if (previouslyActiveType === 'warmup' || previouslyActiveType === 'cooldown') {
             timerDiv.style.visibility = 'hidden'; // Piilota ajastin
        } else {
            timerDiv.style.visibility = 'visible'; // Näytä ajastin (treenille)
        }
        updateRoundDisplay();
        updateButtonStates();
    }


    // UUSI: Käsittelee #next-step-btn painalluksen (warmup/cooldown)
    function handleNextStep() {
        if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
        if (timerState !== TimerState.RUNNING_STEP) return; // Vain jos ollaan vaihe-tilassa

        currentStepIndex++;
        if (currentStepIndex >= currentRoutineSteps.length) {
            // Rutiini valmis
            finishRoutine();
        } else {
            // Siirry seuraavaan vaiheeseen
            displayStep(currentStepIndex);
            highlightCurrentStep();
            // Tila pysyy RUNNING_STEP
        }
        updateButtonStates(); // Päivitä nappien tila (esim. next-step-btn teksti)
    }

    // UUSI: Funktio rutiinin lopettamiseen (kun vaiheet käyty läpi)
     function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`);
         stopTimerInterval(); // Varmuuden vuoksi
         timerState = TimerState.FINISHED;
         removeBodyLock();
         clearNextUpHighlight();
         itemNameH2.textContent = `${activeRoutineType.charAt(0).toUpperCase() + activeRoutineType.slice(1)} Valmis!`;
         itemDescriptionP.textContent = "Hyvää työtä!";
         itemImageImg.style.display = 'none';
         updateTimerDisplay(0);
         updateRoundDisplay(); // Tyhjentää kierrosinfon
         updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         if (isAudioUnlocked && activeRoutineType === 'workout') playSound(beepSound); // Loppubeep vain treenille?
         updateButtonStates();

         // Mitä tapahtuu seuraavaksi? Voisiko automaattisesti avata valikon?
         // selectionArea.classList.remove('hidden');
         // toggleSelectionAreaBtn.textContent = "Piilota valikko ⯅";
     }


    // --- Ajastimen sisäiset toiminnot (lähinnä treenille) ---
    function stopTimer() { // Yleiskäyttöisempi pysäytys
        stopTimerInterval();
        // Ei muuteta timerStatea IDLEksi tässä, jotta tiedetään mistä tultiin
        pausedState = null;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        console.log("Timer interval stopped.");
    }
    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

    function startTimerForPhase(phaseState, duration) { // Käytetään vain treenissä
        stopTimerInterval(); timerState = phaseState; remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        clearNextUpHighlight();

        if (phaseState === TimerState.RUNNING_EXERCISE) {
            displayStep(currentStepIndex); // Käytä yleistä funktiota
            highlightCurrentStep(); // Nimi muutettu
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            timerDiv.classList.add('timer-resting');
            // Määrittää seuraavan stepin indeksin
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1;
            if (nextIdx < currentRoutineSteps.length) {
                 // Näytä seuraavan stepin tiedot levon aikana
                displayStep(nextIdx);
                highlightNextStep(nextIdx); // Nimi muutettu
            } else {
                 // Jos ollaan viimeisen stepin levossa ennen kierroslepoa/loppua
                 displayStep(currentStepIndex); // Näytä nykyinen
                 highlightCurrentStep();
             }
        }

        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime);
        updateButtonStates();
        updateRoundDisplay();
        if (remainingTime > 0) { runTimerInterval(); }
        else { handleTimerEnd(); } // Jos kesto 0, siirry heti
    }

    function runTimerInterval() { // Käytetään vain treenissä
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Huomioi myös pause-tila
            remainingTime--;

            // Äänimerkit (vain jos ääni avattu)
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1;

            if(isAudioUnlocked){ // Tarkista lippu
                 if (isWork) { if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) { playSound(beepSound); } }
                 else if (isRest) { if (checkTime >= 1 && checkTime <= 3) { playSound(beepSound); } }
            }

            updateTimerDisplay(remainingTime);
            if (remainingTime < 0) { handleTimerEnd(); }
        }, 1000);
    }

    function handleTimerEnd() { // Ajastimen loppuminen (treenissä)
        stopTimerInterval();
        timerDiv.classList.remove('timer-resting');
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;

        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

        if (timerState === TimerState.RUNNING_EXERCISE) {
            const currentEx = currentRoutineSteps[currentStepIndex]; if (!currentEx) { resetAppState(); return; }
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            const restDur = currentEx.restTime || 0;

            if (isLastEx) { // Oliko kierroksen viimeinen harjoitus
                if (isLastR) { // Oliko koko treenin viimeinen harjoitus
                    moveToNextPhase(); // -> Treeni valmis
                } else { // Ei viimeinen kierros, siirry kierroslepoon tai seuraavalle kierrokselle
                    const roundRest = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRest > 0) {
                        startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest);
                    } else {
                        moveToNextPhase(); // Aloita suoraan seuraava kierros
                    }
                }
            } else { // Ei ollut kierroksen viimeinen harjoitus, siirry harjoituslepoon tai seuraavaan harjoitukseen
                if (restDur > 0) {
                    startTimerForPhase(TimerState.RUNNING_REST, restDur);
                } else {
                    moveToNextPhase(); // Aloita suoraan seuraava harjoitus
                }
            }
        } else if (wasResting) { // Jos tultiin lepotilasta (harjoitus- tai kierroslepo)
            clearNextUpHighlight();
            moveToNextPhase(); // Siirry seuraavaan vaiheeseen (harjoitus tai kierros)
        }
    }

     function moveToNextPhase() { // Siirtyminen treenin seuraavaan vaiheeseen (harj./kierros/loppu)
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;
        // Logiikka seuraavan indeksin ja kierroksen määrittämiseksi
        if (comingFromRoundRest) {
            currentRound++; currentStepIndex = 0; // Uusi kierros alkaa
        } else if (comingFromRest) { // Tultiin harjoituslevolta
            currentStepIndex++;
        } else { // Tultiin suoraan harjoituksesta (lepoaika 0)
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { // Kierroksen vika ilman lepoa, mutta ei vika kierros
                 currentRound++; currentStepIndex = 0; // Aloita seuraava kierros
            } else if (!isLastEx) { // Ei vika harjoitus
                currentStepIndex++; // Siirry seuraavaan
            }
            // Jos oli vika harjoitus JA vika kierros, ei tehdä mitään, mennään loppuun
        }


        if (currentRound > currentWorkoutInfo.rounds) { // Treeni valmis
             finishRoutine(); // Käytä yleistä lopetusfunktiota
        } else if (currentStepIndex < currentRoutineSteps.length) { // Jatka treeniä
             updateRoundDisplay();
             const nextEx = currentRoutineSteps[currentStepIndex];
             if (!comingFromRest) { // Jos tultiin suoraan harjoituksesta, päivitä näyttö
                 displayStep(currentStepIndex);
             } else { // Jos tultiin levosta, näyttö on jo päivitetty, korosta vain nykyinen
                 highlightCurrentStep();
             }
             startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime);
        } else { // Jokin meni pieleen
             console.error("State mismatch error during workout progression.");
             resetAppState();
        }
    }

    function updateTimerDisplay(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;

        let label = "Odottamassa...";
        // Päivitä label perustuen YLEISEEN timerStateen
        if (timerState === TimerState.RUNNING_EXERCISE) { label = "Työaika"; }
        else if (timerState === TimerState.RUNNING_REST) { label = "Lepo"; }
        else if (timerState === TimerState.RUNNING_ROUND_REST) { label = "Kierroslepo"; }
        else if (timerState === TimerState.RUNNING_STEP) { label = "Suorita vaihe"; } // Uusi
        else if (timerState === TimerState.PAUSED) { label = "Tauko"; }
        else if (timerState === TimerState.FINISHED) { label = "Valmis"; }
        timerLabelP.textContent = label;
    }

    function updateRoundDisplay() { // Näyttää kierrokset vain treenin aikana
        if (activeRoutineType === 'workout' && timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0) {
            roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
        } else {
            roundInfoP.textContent = ''; // Muulloin tyhjä
        }
    }

    // Navigointi IDLE/FINISHED tilassa (käyttää nyt yleisiä indeksejä/listoja)
    function prevStep() { // Nimi muutettu
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
            if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1);
        }
    }
    function nextStepNav() { // Nimi muutettu (ettei sekoitu handleNextStep)
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
            if (currentStepIndex < currentRoutineSteps.length - 1) jumpToStep(currentStepIndex + 1);
        }
    }

    // TÄMÄ VAATII ISOA PÄIVITYSTÄ SEURAAVAKSI
    function updateButtonStates() {
         // Piilota kaikki päänäytön kontrollit oletuksena
         pauseResumeBtn.style.display = 'none';
         stopBtn.style.display = 'none';
         nextStepBtn.style.display = 'none';

         // Valinta-alueen start-napit
         startWarmupBtn.disabled = activeRoutineType !== 'none' && activeRoutineType !== 'warmup'; // Poista käytöstä jos joku muu valittu/aktiivinen
         startWorkoutBtn.disabled = activeRoutineType !== 'none' && activeRoutineType !== 'workout'; // Poista käytöstä jos joku muu valittu/aktiivinen
         startCooldownBtn.disabled = activeRoutineType !== 'none' && activeRoutineType !== 'cooldown'; // Poista käytöstä jos joku muu valittu/aktiivinen

         // Sivupalkin navigaationapit (prev/next)
         const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0;
         prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
         nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;

        // Päänäytön kontrollit riippuen tilasta
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Treeni käynnissä (ajastin)
            pauseResumeBtn.style.display = 'block';
            stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false;
            stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko";
            pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            // Warmup/Cooldown käynnissä
            stopBtn.style.display = 'block';
            nextStepBtn.style.display = 'block';
            stopBtn.disabled = false;
            nextStepBtn.disabled = false;
            // Päivitä next-napin teksti jos ollaan vikassa vaiheessa
            if (currentStepIndex === currentRoutineSteps.length - 1) {
                nextStepBtn.textContent = "Valmis ✅";
            } else {
                nextStepBtn.textContent = "Seuraava Vaihe ⏭";
            }
        } else if (timerState === TimerState.PAUSED) {
            // Treeni pausella
            pauseResumeBtn.style.display = 'block';
            stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false;
            stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka";
            pauseResumeBtn.classList.add('paused');
        } else if (timerState === TimerState.IDLE) {
            // Ei mitään käynnissä, näytä vain valinta-alueen start-napit (jos rutiini valittu)
             if(activeRoutineType === 'warmup') startWarmupBtn.style.display = 'block';
             else if(activeRoutineType === 'workout') startWorkoutBtn.style.display = 'block';
             else if(activeRoutineType === 'cooldown') startCooldownBtn.style.display = 'block';
        } else if (timerState === TimerState.FINISHED) {
            // Rutiini valmis, ei aktiivisia kontrolleja päänäytöllä
        }

        // Lisää logiikkaa tarvittaessa...
    }

     function resetAppState(resetSelections = true) { // Nimi muutettu, lisätty parametri
        stopTimerInterval();
        removeBodyLock();
        currentRoutineSteps = []; // Nollataan yleinen lista
        currentWorkoutExercises = []; // Nollataan myös treenilista
        currentStepIndex = 0;
        currentRound = 1;
        remainingTime = 0;
        timerState = TimerState.IDLE;
        pausedState = null;
        activeRoutineType = 'none'; // Nollataan aktiivinen rutiini
        isAudioUnlocked = false; // Nollataan audio unlock varmuuden vuoksi

        // Nollaa treenin tiedot
        currentWorkoutInfo = { ...currentWorkoutInfo, week: null, phaseIndex: null, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };

        // Resetoi UI-elementit
        itemNameH2.textContent = "Valitse toiminto";
        itemDescriptionP.textContent = "";
        infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes("Valitse toiminto yläpuolelta."); // Päivitetty kutsu
        itemImageImg.style.display = 'none'; itemImageImg.src = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>';
        stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0);
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        timerDiv.style.visibility = 'visible'; // Oletuksena näkyvissä (treeniä varten)
        highlightCurrentStep(); // Nimi muutettu
        clearNextUpHighlight();
        updateRoundDisplay();

         // Piilota kaikki start-napit valinta-alueelta jos resetSelections = true
         if (resetSelections) {
             startWarmupBtn.style.display = 'none';
             startWorkoutBtn.style.display = 'none';
             startCooldownBtn.style.display = 'none';
             document.querySelectorAll('.week-button, .routine-button, .level-button').forEach(btn => btn.classList.remove('active'));
              // Aseta oletustaso aktiiviseksi
             levelButtonsContainer.querySelector('.level-button[data-level="2"]')?.classList.add('active');
             currentWorkoutInfo.level = '2';
         }

        updateButtonStates(); // Päivitä nappien tila lopuksi
        console.log("App state reset.");
    }

    function highlightCurrentStep() { // Nimi muutettu
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10);
            if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex) {
                item.classList.add('active');
                // Scrollaa näkyviin tarvittaessa
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                item.classList.remove('active');
            }
        });
        // Jos lista tyhjä, varmista ettei mikään ole aktiivinen
        if (currentRoutineSteps.length === 0) {
            stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        }
    }

    function highlightNextStep(forceIndex = -1) { // Nimi muutettu
        clearNextUpHighlight();
        let nextIdx = -1;
        if (forceIndex !== -1) { // Jos indeksi annettu (esim. kierroslevossa)
            nextIdx = forceIndex;
        } else if (timerState === TimerState.RUNNING_REST) { // Harjoituslevon aikana
             nextIdx = currentStepIndex + 1;
        }
        // RUNNING_ROUND_REST käsitellään antamalla forceIndex = 0 startTimerForPhase:ssa

        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    }

    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up');
        if (item) item.classList.remove('next-up');
    }

    function addBodyLock() { document.body.classList.add('timer-active'); }
    function removeBodyLock() { document.body.classList.remove('timer-active'); }

    function toggleTrainingSelectionVisibility() { // Nimi muutettu vastaamaan nappia
        selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.textContent = selectionArea.classList.contains('hidden') ? "Valinnat ⯆" : "Piilota valikko ⯅";
    }

    // --- Event Listeners (Päivitetty) ---
    toggleSelectionAreaBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // Rutiinien start-napit
    startWarmupBtn.addEventListener('click', () => {
         if(activeRoutineType !== 'warmup') selectRoutine('warmup'); // Varmista että oikea rutiini valittu
         startSelectedRoutine();
     });
    startWorkoutBtn.addEventListener('click', startSelectedRoutine); // Tämä sisältää audio unlockin
    startCooldownBtn.addEventListener('click', () => {
         if(activeRoutineType !== 'cooldown') selectRoutine('cooldown'); // Varmista että oikea rutiini valittu
         startSelectedRoutine();
    });

    // Päänäytön kontrollit
    pauseResumeBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopActiveRoutine);
    nextStepBtn.addEventListener('click', handleNextStep); // Warmup/cooldown eteneminen

    // Navigointinapit (idle/finished tilassa)
    prevBtn.addEventListener('click', prevStep); // Nimi muutettu
    nextBtn.addEventListener('click', nextStepNav); // Nimi muutettu


    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
