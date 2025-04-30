// app.js (Muutokset merkitty // UUSI, // MUUTOS)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const levelButtonsContainer = document.getElementById('level-buttons-container'); // UUSI
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    const workoutNotesP = document.getElementById('workout-notes');
    const timerDiv = document.getElementById('timer');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const roundInfoP = document.getElementById('round-info'); // UUSI
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const stopBtn = document.getElementById('stop-btn');

    // --- Sovelluksen tila ---
    let fullProgramData = null;
    let currentWorkoutExercises = [];
    let currentWorkoutInfo = {
        week: null,
        phaseIndex: null,
        level: '2', // Oletustaso
        rounds: 0,
        restBetweenRounds: 0,
        notes: '',
        focus: ''
    };
    let currentExerciseIndex = 0;
    let currentRound = 1;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = { IDLE: 'idle', RUNNING_EXERCISE: 'running_exercise', RUNNING_REST: 'running_rest', RUNNING_ROUND_REST: 'running_round_rest', PAUSED: 'paused', FINISHED: 'finished' };
    let timerState = TimerState.IDLE;
    let pausedState = null;

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            const response = await fetch('data/exercises.json'); // Varmista polku!
            console.log("Fetch response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullProgramData = await response.json();
            console.log("Program data loaded.");

            if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) { // Tarkista uuden rakenteen olemassaolo
                 console.error("Loaded data does not seem to contain the 11-week program structure.");
                 // Voit näyttää virheilmoituksen käyttäjälle tässä
                 return; // Keskeytä, jos data on väärä
             }


            populateWeekSelectors();
            addLevelButtonListeners(); // UUSI: Lisää kuuntelijat taso-napeille
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
        weekButtonsContainer.innerHTML = '';
        const totalWeeks = 11;
        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`;
            button.classList.add('week-button');
            button.dataset.weekNumber = i;
            button.addEventListener('click', () => handleWeekSelect(i));
            weekButtonsContainer.appendChild(button);
        }
    }

    // UUSI: Lisää kuuntelijat taso-napeille
    function addLevelButtonListeners() {
        const buttons = levelButtonsContainer.querySelectorAll('.level-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => handleLevelSelect(button.dataset.level));
        });
    }

    // UUSI: Käsittelee tason valinnan
    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; // Älä tee mitään jos taso on jo valittu

        console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel; // Päivitä tila

        // Päivitä nappien korostus
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === selectedLevel);
        });

        // Jos jokin viikko on JO valittuna, lataa sen tiedot uudelleen uudella tasolla
        if (currentWorkoutInfo.week !== null) {
            console.log(`Reloading week ${currentWorkoutInfo.week} data for new level ${selectedLevel}`);
            handleWeekSelect(currentWorkoutInfo.week); // Kutsu viikon käsittelijää uudelleen
        } else {
            // Jos viikkoa ei ole valittu, päivitä vain muistiinpanot näyttämään uusi taso (jos halutaan)
             updateWorkoutNotesDisplay(); // Päivittää tason muistiinpanoihin
        }
    }


    // MUUTOS: Käyttää globaalia currentWorkoutInfo.level -tasoa
    function handleWeekSelect(weekNumber) {
        console.log(`Handling selection for Week: ${weekNumber}`);
        resetWorkoutState(false); // MUUTOS: Nollaa, mutta älä resetoi tasovalintaa

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Cannot handle week select, essential data missing.");
            resetWorkoutState(); return; // Täysi nollaus jos data puuttuu
        }

        const selectedPhaseIndex = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(phase =>
            phase.phaseInfo?.weeks?.includes(weekNumber) // Turvallisemmat tarkistukset
        );

        if (selectedPhaseIndex === -1) {
            console.error(`Could not find phase for week ${weekNumber}.`);
            resetWorkoutState(); exerciseNameH2.textContent = `Vaihetta viikolle ${weekNumber} ei löytynyt.`; return;
        }

        const selectedPhase = fullProgramData.kettlebellProgram11Weeks.phases[selectedPhaseIndex];
        console.log(`Found phase: ${selectedPhase.phaseInfo.name}`);

        // *** MUUTOS: Käytä valittua tasoa tilasta ***
        const currentLevel = currentWorkoutInfo.level;
        const levelData = selectedPhase.levels?.[currentLevel]; // Turvallinen haku

        if (!levelData || !levelData.timeBased) {
            console.error(`Could not find level data for Level ${currentLevel} in phase ${selectedPhase.phaseInfo.name}.`);
            resetWorkoutState(); exerciseNameH2.textContent = `Tason ${currentLevel} tietoja ei löytynyt.`; return;
        }
        const workTime = levelData.timeBased.workSeconds;
        const restTime = levelData.timeBased.restSeconds;
        console.log(`Using Level ${currentLevel} times: Work=${workTime}s, Rest=${restTime}s`);

        let phaseExercisesList = [];
        if (selectedPhaseIndex === 2 && selectedPhase.exampleWeeklyExercises) {
            phaseExercisesList = selectedPhase.exampleWeeklyExercises;
        } else if (selectedPhase.weeklyExercises) {
            phaseExercisesList = selectedPhase.weeklyExercises;
        } else {
             console.error(`No exercise list found for phase ${selectedPhase.phaseInfo.name}.`);
             resetWorkoutState(); exerciseNameH2.textContent = "Harjoituslistaa ei löytynyt."; return;
        }

        const mappedExercises = phaseExercisesList.map(phaseEx => {
            if (!phaseEx?.exerciseId) return null;
            const fullExerciseDetails = fullProgramData.exercises.find(ex => ex.id === phaseEx.exerciseId);
            if (!fullExerciseDetails) return null;
            return {
                ...fullExerciseDetails,
                displayTitle: phaseEx.displayTitle || fullExerciseDetails.name,
                notes: phaseEx.notes || '',
                workTime: workTime,
                restTime: restTime
            };
        }).filter(ex => ex !== null);

        if (mappedExercises.length === 0) {
            console.error(`No valid exercises found or mapped for week ${weekNumber}.`);
            resetWorkoutState(); exerciseNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return;
        }

        // Tallenna tiedot
        currentWorkoutExercises = mappedExercises;
        currentExerciseIndex = 0;
        currentRound = 1;
        // Päivitä vain treenin tiedot, SÄILYTÄ TASO
        currentWorkoutInfo = {
            ...currentWorkoutInfo, // Säilytä vanhat (sis. level)
            week: weekNumber,
            phaseIndex: selectedPhaseIndex,
            rounds: parseInt(selectedPhase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1,
            restBetweenRounds: parseInt(selectedPhase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0,
            notes: selectedPhase.phaseInfo.focus || '',
            focus: selectedPhase.phaseInfo.focus || ''
        };

        console.log(`Workout for Week ${weekNumber} loaded: ${currentWorkoutExercises.length} exercises, ${currentWorkoutInfo.rounds} rounds. Round Rest: ${currentWorkoutInfo.restBetweenRounds}s`);

        // Päivitä UI
        populateExerciseList();
        updateWorkoutNotesDisplay(); // UUSI: Funktio näyttää tason ja fokuksen
        displayExercise(currentExerciseIndex);
        updateButtonStates();
        highlightWeekButton(weekNumber);
        updateRoundDisplay(); // UUSI: Näytä kierrosinfo heti
    }

    // UUSI: Päivittää muistiinpanoalueen (taso + fokus)
    function updateWorkoutNotesDisplay() {
         const levelDesc = fullProgramData?.kettlebellProgram11Weeks?.programInfo?.levels?.find(l => l.level == currentWorkoutInfo.level)?.description || '';
         const focusText = currentWorkoutInfo.focus ? `\nFokus: ${currentWorkoutInfo.focus}` : '';
         workoutNotesP.textContent = `Taso: ${currentWorkoutInfo.level} (${levelDesc})${focusText}`;
         // Varmista että teksti tulee näkyviin vaikka olisi tyhjä (tai näytä placeholder)
         if (!workoutNotesP.textContent.trim()){
             workoutNotesP.textContent = "Valitse viikko nähdäksesi tiedot.";
         }
    }


    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    }

    function populateExerciseList() {
        exerciseListUl.innerHTML = '';
        if (currentWorkoutExercises.length === 0) {
             exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; return;
        }
        currentWorkoutExercises.forEach((exercise, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${exercise.displayTitle}`;
            li.dataset.index = index;
            li.classList.add('exercise-item');
            li.addEventListener('click', () => {
                 if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) jumpToExercise(index);
            });
            exerciseListUl.appendChild(li);
        });
    }

     function jumpToExercise(index) {
        if (index >= 0 && index < currentWorkoutExercises.length) {
            stopTimer(); currentExerciseIndex = index; currentRound = 1;
            timerState = TimerState.IDLE;
            displayExercise(currentExerciseIndex); updateButtonStates(); clearNextUpHighlight(); removeBodyLock();
            updateRoundDisplay(); // UUSI: Päivitä kierrosnäyttö
        }
    }


    function displayExercise(index) {
        // ... (sisältö pysyy samana kuin edellisessä versiossa) ...
        console.log(`Attempting to display exercise at index: ${index}.`);

        if (index < 0 || index >= currentWorkoutExercises.length || !currentWorkoutExercises[index]) {
            console.error(`Invalid exercise index or data! Index: ${index}`);
            resetWorkoutState(); exerciseNameH2.textContent = "Virhe harjoituksen näyttämisessä";
            exerciseDescriptionP.textContent = `Harjoitusta ei löytynyt indeksillä ${index}.`; return;
        }

        const exercise = currentWorkoutExercises[index];
        console.log(`Displaying: ${exercise.displayTitle}`);
        exerciseNameH2.textContent = exercise.displayTitle;
        exerciseDescriptionP.textContent = `${exercise.description || ''}${exercise.notes ? `\n\nHuom: ${exercise.notes}` : ''}`;

        if (exercise.image) {
            exerciseImageImg.src = exercise.image; exerciseImageImg.alt = exercise.displayTitle;
            exerciseImageImg.style.display = 'block';
        } else {
            exerciseImageImg.style.display = 'none'; exerciseImageImg.src = ''; exerciseImageImg.alt = '';
        }

        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
             remainingTime = exercise.workTime || 0;
             updateTimerDisplay(remainingTime); // MUUTOS: Label päivitetään muualla
        }
        highlightCurrentExercise();
    }


    // --- Ajastimen toiminnot ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting workout from beginning...");
        currentExerciseIndex = 0; currentRound = 1;
        updateRoundDisplay(); // UUSI: Näytä kierros
        displayExercise(currentExerciseIndex);
        addBodyLock();
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].workTime);
    }

    function pauseResumeTimer() {
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedState = timerState; stopTimerInterval(); timerState = TimerState.PAUSED;
            console.log("Timer Paused"); pauseBtn.textContent = "▶ Jatka"; pauseBtn.classList.add('paused');
            timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
             console.log("Timer Resumed"); timerState = pausedState || TimerState.RUNNING_EXERCISE;
             pausedState = null; runTimerInterval(); pauseBtn.textContent = "⏸ Tauko"; pauseBtn.classList.remove('paused');
             timerDiv.classList.remove('timer-paused');
             if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                 timerDiv.classList.add('timer-resting'); highlightNextExercise();
             } else {
                  timerDiv.classList.remove('timer-resting'); clearNextUpHighlight();
             }
        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer(); console.log("Workout Stopped by user."); clearNextUpHighlight(); removeBodyLock();
        currentRound = 1; pausedState = null;
        if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentExerciseIndex]) {
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
            updateTimerDisplay(currentExercise.workTime); // MUUTOS: Label pois
            displayExercise(currentExerciseIndex);
        } else {
             resetWorkoutState();
        }
         updateRoundDisplay(); // UUSI: Päivitä/nollaa kierrosnäyttö
         updateButtonStates();
    }

    function stopTimer() {
        stopTimerInterval(); timerState = TimerState.IDLE; pausedState = null;
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        console.log("Timer stopped, state set to IDLE.");
    }

    function stopTimerInterval() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); timerState = phaseState; remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused'); clearNextUpHighlight();

        if (phaseState === TimerState.RUNNING_EXERCISE) {
             displayExercise(currentExerciseIndex); highlightCurrentExercise();
        } else if (phaseState === TimerState.RUNNING_REST) {
            timerDiv.classList.add('timer-resting');
            const nextIndex = currentExerciseIndex + 1;
            if (nextIndex < currentWorkoutExercises.length) { displayExercise(nextIndex); highlightNextExercise(); }
            else { displayExercise(currentExerciseIndex); highlightCurrentExercise(); }
        } else if (phaseState === TimerState.RUNNING_ROUND_REST) {
             timerDiv.classList.add('timer-resting');
             if (currentWorkoutExercises.length > 0) { displayExercise(0); highlightNextExercise(0); }
        }

        console.log(`Starting phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime); // MUUTOS: Label päivitetään intervallissa
        updateButtonStates(); updateRoundDisplay(); // UUSI: Varmista kierrosnäyttö

        if (remainingTime > 0) { runTimerInterval(); }
        else { handleTimerEnd(); }
    }

    function runTimerInterval() {
        if (timerInterval) return;
        // console.log("Starting timer interval (1000ms)");
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return;

            remainingTime--;
            updateTimerDisplay(remainingTime); // MUUTOS: Label päivitetään tässä

            if (remainingTime <= 0) { handleTimerEnd(); }
        }, 1000);
    }


    function handleTimerEnd() {
         stopTimerInterval(); timerDiv.classList.remove('timer-resting');
         if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;

         const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

         if (timerState === TimerState.RUNNING_EXERCISE) {
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
            if (!currentExercise) { resetWorkoutState(); return; }
            const isLastExerciseInRound = currentExerciseIndex === currentWorkoutExercises.length - 1;
            const isLastRound = currentRound >= currentWorkoutInfo.rounds;
            const restDuration = currentExercise.restTime || 0;

            if (isLastExerciseInRound) {
                if (isLastRound) { moveToNextPhase(); } // Lopetus
                else {
                    const roundRestDuration = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRestDuration > 0) { startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRestDuration); }
                    else { moveToNextPhase(); } // Suoraan seuraava kierros
                }
            } else {
                 if (restDuration > 0) { startTimerForPhase(TimerState.RUNNING_REST, restDuration); }
                 else { moveToNextPhase(); } // Suoraan seuraava liike
            }
         } else if (wasResting) {
            clearNextUpHighlight(); moveToNextPhase(); // Siirry työhön
         }
    }


     function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromLastExerciseNoRest = timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound < currentWorkoutInfo.rounds && currentWorkoutInfo.restBetweenRounds <= 0;
        const comingFromLastExerciseBeforeRest = timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound < currentWorkoutInfo.rounds && currentWorkoutInfo.restBetweenRounds > 0;

        // Päivitä indeksi ja kierros
        if ((comingFromRest && timerState === TimerState.RUNNING_ROUND_REST) || comingFromLastExerciseNoRest ) {
            currentRound++; currentExerciseIndex = 0;
        } else if (comingFromRest && timerState === TimerState.RUNNING_REST) {
             currentExerciseIndex++;
        } else if (timerState === TimerState.RUNNING_EXERCISE && !comingFromLastExerciseNoRest && !comingFromLastExerciseBeforeRest) {
             // Tavallinen siirtymä työstä (joko lepoon tai seuraavaan työhön)
              // Indeksi päivittyy handleTimerEnd -> startTimerForPhase TAI tässä jos ei lepoa
             if(!comingFromRest && currentWorkoutExercises[currentExerciseIndex]?.restTime <= 0) {
                 currentExerciseIndex++; // Siirry seuraavaan jos ei ollut lepoa
             }
        } else if (timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound >= currentWorkoutInfo.rounds){
             // Treenin loppu
        }


        // Tarkista onko treeni valmis
        if (currentRound > currentWorkoutInfo.rounds) {
             timerState = TimerState.FINISHED; updateButtonStates(); removeBodyLock(); clearNextUpHighlight();
             exerciseNameH2.textContent = "Treeni Valmis!"; exerciseDescriptionP.textContent = "Hyvää työtä!";
             exerciseImageImg.style.display = 'none'; updateTimerDisplay(0); // Label poistettu
             updateRoundDisplay(); // Näytä lopullinen kierrosmäärä
             workoutNotesP.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty! Valitse uusi treeni.`;
        }
        // Jos treeni jatkuu:
        else if (currentExerciseIndex < currentWorkoutExercises.length) {
             updateRoundDisplay(); // UUSI: Päivitä kierrosnäyttö
             const nextExercise = currentWorkoutExercises[currentExerciseIndex];
             if (!comingFromRest) {
                 displayExercise(currentExerciseIndex); // Näytä vain jos ei tultu levosta
             } else {
                 highlightCurrentExercise(); // Varmista korostus jos tultiin levosta
             }
             startTimerForPhase(TimerState.RUNNING_EXERCISE, nextExercise.workTime);
        } else {
             // Turvatarkistus, jos jotenkin päädytään outoon tilaan
             console.error("Error in moveToNextPhase logic: Index out of bounds or round mismatch.");
             resetWorkoutState();
        }
    }

    // MUUTOS: Päivittää ajastimen ja labelin
    function updateTimerDisplay(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;

        // Päivitä label tilan mukaan
        let label = "Odottamassa...";
        if (timerState === TimerState.RUNNING_EXERCISE) {
            label = "Työaika"; // Lyhyempi label
        } else if (timerState === TimerState.RUNNING_REST) {
            label = "Lepo"; // Lyhyempi label
        } else if (timerState === TimerState.RUNNING_ROUND_REST) {
             label = "Kierroslepo"; // Lyhyempi label
        } else if (timerState === TimerState.PAUSED) {
            label = "Tauko";
        } else if (timerState === TimerState.FINISHED) {
            label = "Valmis";
        }
        timerLabelP.textContent = label;
    }

    // UUSI: Päivittää kierrosinfon
    function updateRoundDisplay() {
        if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0) {
            roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
        } else {
            roundInfoP.textContent = ''; // Tyhjennä jos ei käynnissä tai ei kierroksia
        }
    }


    function prevExercise() { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentExerciseIndex > 0) jumpToExercise(currentExerciseIndex - 1); } }
    function nextExercise() { if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) { if (currentExerciseIndex < currentWorkoutExercises.length - 1) jumpToExercise(currentExerciseIndex + 1); } }
    function updateButtonStates() { /* ... (ei muutoksia tähän funktioon)... */
        const hasWorkout = currentWorkoutExercises.length > 0;
        const isIdle = timerState === TimerState.IDLE;
        const isRunning = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const isPaused = timerState === TimerState.PAUSED;
        const isFinished = timerState === TimerState.FINISHED;

        startBtn.disabled = !hasWorkout || !isIdle;
        pauseBtn.disabled = !isRunning && !isPaused;
        stopBtn.disabled = !isRunning && !isPaused;
        const canNavigate = hasWorkout && (isIdle || isFinished);
        prevBtn.disabled = !canNavigate || currentExerciseIndex <= 0;
        nextBtn.disabled = !canNavigate || currentExerciseIndex >= currentWorkoutExercises.length - 1;

        if (isPaused) {
            pauseBtn.textContent = "▶ Jatka"; pauseBtn.classList.add('paused');
        } else {
            pauseBtn.textContent = "⏸ Tauko"; pauseBtn.classList.remove('paused');
        }
    }

     // MUUTOS: resetoi myös kierrosnäytön ja tasovalinnan korostuksen (mutta ei valittua tasoa)
     function resetWorkoutState(resetLevelSelectionHighlight = true) { // Lisätty parametri
        console.log("Resetting workout state...");
        stopTimerInterval(); removeBodyLock(); currentWorkoutExercises = [];
        currentExerciseIndex = 0; currentRound = 1; remainingTime = 0; timerState = TimerState.IDLE;
        pausedState = null;
        currentWorkoutInfo = { ...currentWorkoutInfo, // Säilytä taso
            week: null, phaseIndex: null, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };

        exerciseNameH2.textContent = "Valitse treeni"; exerciseDescriptionP.textContent = "";
        updateWorkoutNotesDisplay(); // UUSI: Päivitä näyttämään vain taso
        exerciseImageImg.style.display = 'none'; exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; updateTimerDisplay(0); // Label pois
        timerDiv.classList.remove('timer-resting', 'timer-paused'); highlightCurrentExercise(); clearNextUpHighlight();
        updateRoundDisplay(); // UUSI: Tyhjennä kierrosinfo
        updateButtonStates();

        document.querySelectorAll('.week-button').forEach(btn => btn.classList.remove('active'));
        if (resetLevelSelectionHighlight) { // Nollaa tasokorostus vain jos pyydetty
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.level === currentWorkoutInfo.level); // Jätä valittu taso aktiiviseksi
             });
        }
        console.log("Workout state reset complete.");
    }

    function highlightCurrentExercise() { /* ... (ei muutoksia tähän funktioon)... */
        const items = exerciseListUl.querySelectorAll('li.exercise-item');
        items.forEach((item) => {
            const itemIndex = parseInt(item.dataset.index, 10);
            if (currentWorkoutExercises.length > 0 && !isNaN(itemIndex) && itemIndex === currentExerciseIndex) {
                item.classList.add('active');
                 if (item.offsetTop < exerciseListUl.scrollTop || item.offsetTop + item.offsetHeight > exerciseListUl.scrollTop + exerciseListUl.clientHeight) {
                      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                 }
            } else { item.classList.remove('active'); }
        });
         if (currentWorkoutExercises.length === 0) { exerciseListUl.querySelectorAll('li').forEach(item => item.classList.remove('active')); }
    }
    function highlightNextExercise(forceIndex = -1) { /* ... (ei muutoksia tähän funktioon)... */
        clearNextUpHighlight(); let nextIndexToShow = -1;
        if (forceIndex !== -1) { nextIndexToShow = forceIndex; }
        else if (timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) { // MUUTOS: Korosta myös kierroslevolla
            nextIndexToShow = (timerState === TimerState.RUNNING_ROUND_REST) ? 0 : currentExerciseIndex + 1;
         }
        if (nextIndexToShow >= 0 && nextIndexToShow < currentWorkoutExercises.length) {
             const nextItem = exerciseListUl.querySelector(`li[data-index="${nextIndexToShow}"]`);
             if (nextItem) { nextItem.classList.add('next-up'); }
        }
    }
    function clearNextUpHighlight() { /* ... (ei muutoksia tähän funktioon)... */
        const item = exerciseListUl.querySelector('li.next-up'); if (item) item.classList.remove('next-up');
    }
    function addBodyLock() { document.body.classList.add('timer-active'); }
    function removeBodyLock() { document.body.classList.remove('timer-active'); }
    function toggleTrainingSelectionVisibility() { /* ... (ei muutoksia tähän funktioon)... */
        trainingSelectSection.classList.toggle('hidden');
        toggleTrainingSelectBtn.textContent = trainingSelectSection.classList.contains('hidden') ? "Valitse treeni ⯆" : "Piilota valikko ⯅";
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', startWorkout);
    pauseBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopWorkout);
    prevBtn.addEventListener('click', prevExercise);
    nextBtn.addEventListener('click', nextExercise);
    toggleTrainingSelectBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // --- Sovelluksen käynnistys ---
    loadAppData();
});
