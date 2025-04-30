// app.js (Muutokset merkitty // MUUTOS tai // UUSI)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    const workoutNotesP = document.getElementById('workout-notes');
    const timerDiv = document.getElementById('timer'); // MUUTOS: Haetaan koko div tyylittelyä varten
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
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
        level: '2', // <-- HARDCODED LEVEL!
        rounds: 0,
        restBetweenRounds: 0,
        notes: '',
        focus: ''
    };
    let currentExerciseIndex = 0;
    let currentRound = 1;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = {
        IDLE: 'idle',
        RUNNING_EXERCISE: 'running_exercise',
        RUNNING_REST: 'running_rest',
        RUNNING_ROUND_REST: 'running_round_rest',
        PAUSED: 'paused',
        FINISHED: 'finished'
    };
    let timerState = TimerState.IDLE;
    let pausedState = null; // UUSI: Tallentaa tilan ennen pausausta

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            // Varmista että polku on oikea!
            const response = await fetch('data/exercises.json'); // TAI data/kettlebell_program.json
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            fullProgramData = await response.json();
            console.log("Program data loaded and parsed successfully.");

            // Tarkista rakenteen avainelementit (esim. uusi JSON)
             if (!fullProgramData || !fullProgramData.exercises || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.kettlebellProgram11Weeks.phases) {
                 console.warn("Loaded data might not be the new program structure. Trying to adapt...");
                 // Tähän voisi lisätä logiikkaa vanhan rakenteen käsittelyyn, jos tarpeen
                 // Mutta oletetaan nyt, että uusi JSON on käytössä. Jos ei, tulee virheitä myöhemmin.
                 // Jos käytät VANHAA exercises.jsonia, tämän uuden app.js:n kanssa tulee virheitä.
             }


            populateWeekSelectors();
            resetWorkoutState();

        } catch (error) {
            console.error("Could not load or process program data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa treeniohjelmaa.";
             resetWorkoutState();
        }
    }

    // --- Luo viikkonapit ---
    function populateWeekSelectors() {
        console.log("Populating week selectors...");
        // Varmistetaan, että data on ladattu ja sisältää odotetun rakenteen
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.kettlebellProgram11Weeks.phases) {
             console.error("Cannot populate week selectors, kettlebellProgram11Weeks data is missing or invalid.");
             weekButtonsContainer.innerHTML = '<p>Ohjelmadataa ei voitu ladata.</p>';
             return;
         }


        weekButtonsContainer.innerHTML = '';
        const totalWeeks = 11; // Oletus

        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`;
            button.classList.add('week-button');
            button.dataset.weekNumber = i;
            button.addEventListener('click', () => handleWeekSelect(i));
            weekButtonsContainer.appendChild(button);
        }
        console.log(`${totalWeeks} week buttons created.`);
    }

    // --- Käsittelee viikon valinnan ---
    function handleWeekSelect(weekNumber) {
        console.log(`Handling selection for Week: ${weekNumber}`);
        resetWorkoutState();

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Cannot handle week select, essential data missing.");
            resetWorkoutState();
            return;
        }

        const selectedPhaseIndex = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(phase =>
            phase.phaseInfo && phase.phaseInfo.weeks && phase.phaseInfo.weeks.includes(weekNumber)
        );

        if (selectedPhaseIndex === -1) {
            console.error(`Could not find phase for week ${weekNumber}.`);
            resetWorkoutState();
            exerciseNameH2.textContent = `Vaihetta viikolle ${weekNumber} ei löytynyt.`;
            return;
        }

        const selectedPhase = fullProgramData.kettlebellProgram11Weeks.phases[selectedPhaseIndex];
        console.log(`Found phase: ${selectedPhase.phaseInfo.name} (Index: ${selectedPhaseIndex})`);

        const levelData = selectedPhase.levels ? selectedPhase.levels[currentWorkoutInfo.level] : null;
        if (!levelData || !levelData.timeBased) {
            console.error(`Could not find level data for Level ${currentWorkoutInfo.level} in phase ${selectedPhase.phaseInfo.name}.`);
            resetWorkoutState();
            exerciseNameH2.textContent = `Tason ${currentWorkoutInfo.level} tietoja ei löytynyt.`;
            return;
        }
        const workTime = levelData.timeBased.workSeconds;
        const restTime = levelData.timeBased.restSeconds;
        console.log(`Using Level ${currentWorkoutInfo.level} times: Work=${workTime}s, Rest=${restTime}s`);

        let phaseExercisesList = [];
        // Tässä pitäisi olla logiikka Vaihe 3 exerciseOptionsin valintaan tai arpomiseen.
        // Nyt käytetään exampleWeeklyExercises tai weeklyExercises.
        if (selectedPhaseIndex === 2 && selectedPhase.exampleWeeklyExercises) {
            console.log("Using exampleWeeklyExercises for Phase 3.");
            phaseExercisesList = selectedPhase.exampleWeeklyExercises;
        } else if (selectedPhase.weeklyExercises) {
            phaseExercisesList = selectedPhase.weeklyExercises;
        } else {
            console.error(`No exercise list found for phase ${selectedPhase.phaseInfo.name}.`);
            resetWorkoutState();
            exerciseNameH2.textContent = "Harjoituslistaa ei löytynyt.";
            return;
        }

        const mappedExercises = phaseExercisesList.map(phaseEx => {
            if (!phaseEx || !phaseEx.exerciseId) return null;
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
            resetWorkoutState();
            exerciseNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt.";
            return;
        }

        // Tallenna tiedot
        currentWorkoutExercises = mappedExercises;
        currentExerciseIndex = 0;
        currentRound = 1;
        currentWorkoutInfo = {
            week: weekNumber,
            phaseIndex: selectedPhaseIndex,
            level: currentWorkoutInfo.level,
             // Haetaan kierrosmäärä ja varmistetaan että se on numero, oletus 1
            rounds: parseInt(selectedPhase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1,
            restBetweenRounds: parseInt(selectedPhase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0,
            notes: selectedPhase.phaseInfo.focus || '',
            focus: selectedPhase.phaseInfo.focus || ''
        };

         console.log(`Workout for Week ${weekNumber} loaded: ${currentWorkoutExercises.length} exercises, ${currentWorkoutInfo.rounds} rounds. Round Rest: ${currentWorkoutInfo.restBetweenRounds}s`);


        // Päivitä UI
        populateExerciseList();
        const levelDesc = fullProgramData.kettlebellProgram11Weeks.programInfo.levels.find(l => l.level == currentWorkoutInfo.level)?.description || '';
        workoutNotesP.textContent = `Taso: ${currentWorkoutInfo.level} (${levelDesc})\nFokus: ${currentWorkoutInfo.focus}`;
        displayExercise(currentExerciseIndex);
        updateButtonStates();
        highlightWeekButton(weekNumber);

    }

    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    }


    function populateExerciseList() {
        exerciseListUl.innerHTML = '';
        if (currentWorkoutExercises.length === 0) {
             exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>';
             return;
        }
        currentWorkoutExercises.forEach((exercise, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${exercise.displayTitle}`;
            li.dataset.index = index;
            li.classList.add('exercise-item');
            li.addEventListener('click', () => {
                 if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                    jumpToExercise(index);
                 }
            });
            exerciseListUl.appendChild(li);
        });
    }

     function jumpToExercise(index) {
        if (index >= 0 && index < currentWorkoutExercises.length) {
            stopTimer();
            currentExerciseIndex = index;
            currentRound = 1; // Oletetaan että hypätessä aloitetaan alusta kierrosten suhteen? Tai lasketaan? Nyt nollataan.
            timerState = TimerState.IDLE;
            displayExercise(currentExerciseIndex);
            updateButtonStates();
            clearNextUpHighlight();
             removeBodyLock(); // UUSI: Varmista, että lukitus poistuu
        }
    }

    // --- MUUTOS: Näyttää pyydetyn liikkeen ---
    function displayExercise(index) {
        console.log(`Attempting to display exercise at index: ${index}.`);
        // clearNextUpHighlight(); // Poistettu täältä, hoidetaan muualla

        if (index < 0 || index >= currentWorkoutExercises.length || !currentWorkoutExercises[index]) {
            console.error(`Invalid exercise index or data! Index: ${index}`);
            resetWorkoutState();
            exerciseNameH2.textContent = "Virhe harjoituksen näyttämisessä";
            exerciseDescriptionP.textContent = `Harjoitusta ei löytynyt indeksillä ${index}.`;
            return;
        }

        const exercise = currentWorkoutExercises[index];
        console.log(`Displaying: ${exercise.displayTitle}`);
        exerciseNameH2.textContent = exercise.displayTitle;
        exerciseDescriptionP.textContent = `${exercise.description || ''}${exercise.notes ? `\n\nHuom: ${exercise.notes}` : ''}`;

        if (exercise.image) {
            exerciseImageImg.src = exercise.image;
            exerciseImageImg.alt = exercise.displayTitle;
            exerciseImageImg.style.display = 'block';
        } else {
            exerciseImageImg.style.display = 'none';
            exerciseImageImg.src = '';
            exerciseImageImg.alt = '';
        }

        // Aseta ajastin valmiiksi työaikaan VAIN JOS ollaan IDLE/FINISHED
        // MUUTOS: Ei aseteta ajastinta tässä, jos tullaan levosta
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
             remainingTime = exercise.workTime || 0;
             updateTimerDisplay(remainingTime, "Työaika");
        }

        highlightCurrentExercise(); // Korostetaan AINA pyydetty liike listassa
    }


    // --- Ajastimen toiminnot ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting workout from beginning...");
        currentExerciseIndex = 0;
        currentRound = 1;
        displayExercise(currentExerciseIndex); // Näytä eka liike
        addBodyLock(); // UUSI: Lukitse sivun scrollaus
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].workTime);
    }

    function pauseResumeTimer() {
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            pausedState = timerState; // UUSI: Tallenna tila ennen pausausta
            stopTimerInterval();
            timerState = TimerState.PAUSED;
            console.log("Timer Paused");
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
            timerDiv.classList.add('timer-paused'); // UUSI: Lisää luokka tauolle

        } else if (timerState === TimerState.PAUSED) {
             console.log("Timer Resumed");
             timerState = pausedState || TimerState.RUNNING_EXERCISE; // UUSI: Palauta tallennettu tila
             pausedState = null; // Nollaa tallennettu tila
             runTimerInterval();
             pauseBtn.textContent = "⏸ Tauko";
             pauseBtn.classList.remove('paused');
             timerDiv.classList.remove('timer-paused'); // UUSI: Poista luokka

             // Varmista lepokorostukset, jos jatketaan levosta
             if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                 timerDiv.classList.add('timer-resting');
                 highlightNextExercise();
             } else {
                  timerDiv.classList.remove('timer-resting');
                  clearNextUpHighlight();
             }
        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer();
        console.log("Workout Stopped by user.");
        clearNextUpHighlight();
        removeBodyLock(); // UUSI: Poista lukitus
        currentRound = 1;
        pausedState = null; // UUSI: Nollaa pausetila
        if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentExerciseIndex]) {
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
            updateTimerDisplay(currentExercise.workTime, "Työaika");
            displayExercise(currentExerciseIndex); // Näytä nykyinen liike
        } else {
             resetWorkoutState();
        }
         updateButtonStates();
    }

    function stopTimer() {
        stopTimerInterval();
        timerState = TimerState.IDLE;
        pausedState = null; // UUSI: Nollaa pausetila
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // UUSI: Poista tilaluokat
        console.log("Timer stopped, state set to IDLE.");
    }

    function stopTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

     // --- MUUTOS: Käynnistää vaiheen, lisää lepokorostuksen ---
     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval();
        timerState = phaseState;
        remainingTime = duration;
        let label = "Odottamassa...";

        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Poista vanhat tilat
        clearNextUpHighlight(); // Poista next-up varmuuden vuoksi

        if (phaseState === TimerState.RUNNING_EXERCISE) {
            label = `Työaika (Kierros ${currentRound}/${currentWorkoutInfo.rounds})`;
            // Näytä NYKYINEN liike (pitäisi olla jo näkyvissä)
             displayExercise(currentExerciseIndex); // Varmistetaan näyttö
             highlightCurrentExercise(); // Varmista oikean korostus listassa
        } else if (phaseState === TimerState.RUNNING_REST) {
            label = `Lepo liikkeiden välillä (Kierros ${currentRound})`;
            timerDiv.classList.add('timer-resting'); // UUSI: Lisää lepoluokka
            // Näytä SEURAAVA liike
            const nextIndex = currentExerciseIndex + 1;
            if (nextIndex < currentWorkoutExercises.length) {
                displayExercise(nextIndex); // Näytä seuraavan tiedot
                highlightNextExercise();    // Korosta seuraava listassa
            } else {
                 console.warn("Trying to start exercise rest but no next exercise exists?");
                 // Näytä silti nykyinen, jos seuraavaa ei ole (vika logiikassa?)
                 displayExercise(currentExerciseIndex);
                 highlightCurrentExercise();
            }
        } else if (phaseState === TimerState.RUNNING_ROUND_REST) {
             label = `Lepo kierrosten välillä (Valmistaudu kierrokseen ${currentRound + 1})`;
             timerDiv.classList.add('timer-resting'); // UUSI: Lisää lepoluokka
             // Näytä SEURAAVA (eli kierroksen eka) liike
             if (currentWorkoutExercises.length > 0) {
                 displayExercise(0);          // Näytä ekan tiedot
                 highlightNextExercise(0);    // Korosta eka listassa
             } else {
                 console.warn("Trying to start round rest but no exercises loaded?");
             }
        }

        console.log(`Starting phase: ${phaseState}, Duration: ${duration}, Label: ${label}`);
        updateTimerDisplay(remainingTime, label);
        updateButtonStates();

        if (remainingTime > 0) {
            runTimerInterval();
        } else {
            console.log("Phase duration is 0 or less, handling timer end immediately.");
            handleTimerEnd();
        }
    }

    function runTimerInterval() {
        if (timerInterval) return; // Vältä tuplia
        console.log("Starting timer interval (1000ms)");
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return;

            remainingTime--;
            let label = timerLabelP.textContent; // Oletuslabel = edellinen
             if (timerState === TimerState.RUNNING_EXERCISE) {
                 label = `Työaika (Kierros ${currentRound}/${currentWorkoutInfo.rounds})`;
             } else if (timerState === TimerState.RUNNING_REST) {
                 label = `Lepo liikkeiden välillä (Kierros ${currentRound})`;
             } else if (timerState === TimerState.RUNNING_ROUND_REST) {
                  label = `Lepo kierrosten välillä (Valmistaudu kierrokseen ${currentRound + 1})`;
             }
            updateTimerDisplay(remainingTime, label);

            if (remainingTime <= 0) {
                handleTimerEnd();
            }
        }, 1000);
    }

    // --- MUUTOS: Logiikka pysyy, mutta huomioi että displayExercise on jo kutsuttu levolle ---
    function handleTimerEnd() {
         stopTimerInterval();
         timerDiv.classList.remove('timer-resting'); // Poista lepotyyli AINA kun vaihe päättyy

         if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) {
             console.warn(`handleTimerEnd called unexpectedly from state: ${timerState}`);
             return; // Älä tee mitään jos ei oltu käynnissä
         }

         const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

         // Jos TYÖAIKA päättyi:
         if (timerState === TimerState.RUNNING_EXERCISE) {
            console.log(`Exercise phase ended.`);
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
            if (!currentExercise) { resetWorkoutState(); return; } // Varmistus

            const isLastExerciseInRound = currentExerciseIndex === currentWorkoutExercises.length - 1;
            const isLastRound = currentRound >= currentWorkoutInfo.rounds;
            const restDuration = currentExercise.restTime || 0;

            if (isLastExerciseInRound) {
                if (isLastRound) {
                     moveToNextPhase(); // Siirry lopetustilaan
                } else {
                    const roundRestDuration = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRestDuration > 0) {
                         startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRestDuration); // Lepo alkaa, näyttää jo seuraavan (ekan) liikkeen
                    } else {
                          moveToNextPhase(); // Siirry heti seuraavaan kierrokseen
                    }
                }
            } else {
                 if (restDuration > 0) {
                     startTimerForPhase(TimerState.RUNNING_REST, restDuration); // Lepo alkaa, näyttää jo seuraavan liikkeen
                 } else {
                    moveToNextPhase(); // Siirry heti seuraavaan liikkeeseen
                 }
            }
         // Jos LEPO (liike tai kierros) päättyi:
         } else if (wasResting) {
            console.log("Rest phase ended.");
            clearNextUpHighlight(); // Poista next-up korostus kun lepo loppuu
            moveToNextPhase(); // Siirry seuraavaan vaiheeseen (työhön)
         }
    }

     // --- MUUTOS: Kun siirrytään leposta työhön, älä kutsu displayExercise ---
     function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromLastExercise = timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound < currentWorkoutInfo.rounds;

        // Päivitä indeksi ja kierros
        if (comingFromRest && timerState === TimerState.RUNNING_ROUND_REST) {
             // Kierroslevon jälkeen
             currentRound++;
             currentExerciseIndex = 0;
             console.log(`Starting Round ${currentRound}`);
        } else if (comingFromLastExercise && currentWorkoutInfo.restBetweenRounds <= 0) {
             // Viimeisen liikkeen jälkeen ILMAN kierroslepoa
             currentRound++;
             currentExerciseIndex = 0;
             console.log(`Starting Round ${currentRound} (no round rest)`);
        }
        else if (comingFromRest && timerState === TimerState.RUNNING_REST) {
             // Liikelevon jälkeen
             currentExerciseIndex++;
        } else if (timerState === TimerState.RUNNING_EXERCISE) {
             // Työajan jälkeen ILMAN lepoa (ei viimeinen liike)
             currentExerciseIndex++;
        } else if (timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && currentRound >= currentWorkoutInfo.rounds){
             // Viimeisen kierroksen viimeinen liike
             // Siirrytään FINISHED-tilaan alla
        }
        else {
             console.warn("moveToNextPhase: Unhandled previous state:", timerState, "Index:", currentExerciseIndex, "Round:", currentRound);
        }


        // Tarkista onko treeni valmis
        if (currentRound > currentWorkoutInfo.rounds || currentExerciseIndex >= currentWorkoutExercises.length) {
            console.log("Workout Finished");
            timerState = TimerState.FINISHED;
            exerciseNameH2.textContent = "Treeni Valmis!";
            exerciseDescriptionP.textContent = "Hyvää työtä!";
            exerciseImageImg.style.display = 'none';
            workoutNotesP.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty! Valitse uusi treeni.`;
            updateTimerDisplay(0, "Valmis");
            updateButtonStates();
            highlightCurrentExercise(); // Poista korostus
            removeBodyLock(); // UUSI: Salli scrollaus
            clearNextUpHighlight();
        }
        // Jos treeni jatkuu:
        else {
            console.log(`Moving to exercise index: ${currentExerciseIndex} in round ${currentRound}`);
            const nextExercise = currentWorkoutExercises[currentExerciseIndex];
             // !!! MUUTOS: Kutsu displayExercise vain jos EI tultu levosta !!!
             if (!comingFromRest) {
                 displayExercise(currentExerciseIndex);
             } else {
                 // Varmista että oikea liike on korostettu listassa
                 highlightCurrentExercise();
             }
             startTimerForPhase(TimerState.RUNNING_EXERCISE, nextExercise.workTime); // Käynnistä työaika
        }
    }


    function updateTimerDisplay(timeInSeconds, label) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        timerLabelP.textContent = label;
    }


    function prevExercise() {
        if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED) return;
        if (currentExerciseIndex > 0) {
            jumpToExercise(currentExerciseIndex - 1);
        }
    }

    function nextExercise() {
         if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED) return;
        if (currentExerciseIndex < currentWorkoutExercises.length - 1) {
             jumpToExercise(currentExerciseIndex + 1);
        }
    }


    function updateButtonStates() {
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
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
        } else {
            pauseBtn.textContent = "⏸ Tauko";
            pauseBtn.classList.remove('paused');
        }
    }


     function resetWorkoutState() {
        console.log("Resetting workout state...");
        stopTimerInterval();
        removeBodyLock(); // UUSI: Poista lukitus
        currentWorkoutExercises = [];
        currentExerciseIndex = 0;
        currentRound = 1;
        remainingTime = 0;
        timerState = TimerState.IDLE;
        pausedState = null; // UUSI: Nollaa
        currentWorkoutInfo = {
            week: null, phaseIndex: null, level: currentWorkoutInfo.level,
            rounds: 0, restBetweenRounds: 0, notes: '', focus: ''
         };

        exerciseNameH2.textContent = "Valitse treeni";
        exerciseDescriptionP.textContent = "";
        workoutNotesP.textContent = "";
        exerciseImageImg.style.display = 'none';
        exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>';
        updateTimerDisplay(0, "Odottamassa...");
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // UUSI: Poista tilat
        highlightCurrentExercise();
        clearNextUpHighlight();
        updateButtonStates();

        document.querySelectorAll('.week-button').forEach(btn => btn.classList.remove('active'));
        console.log("Workout state reset complete.");
    }


    function highlightCurrentExercise() {
        const items = exerciseListUl.querySelectorAll('li.exercise-item');
        items.forEach((item) => {
            const itemIndex = parseInt(item.dataset.index, 10);
            if (currentWorkoutExercises.length > 0 && !isNaN(itemIndex) && itemIndex === currentExerciseIndex) {
                item.classList.add('active');
                 if (item.offsetTop < exerciseListUl.scrollTop || item.offsetTop + item.offsetHeight > exerciseListUl.scrollTop + exerciseListUl.clientHeight) {
                      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                 }
            } else {
                item.classList.remove('active');
            }
        });
         if (currentWorkoutExercises.length === 0) {
              exerciseListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
         }
    }

    // --- MUUTOS: Voi ottaa vastaan indeksin jota korostaa ---
    function highlightNextExercise(forceIndex = -1) {
        clearNextUpHighlight();
         let nextIndexToShow = -1;

        if (forceIndex !== -1) {
             nextIndexToShow = forceIndex; // Käytä annettua indeksiä (kierroslevolle)
        } else if (timerState === TimerState.RUNNING_REST) {
             nextIndexToShow = currentExerciseIndex + 1; // Liikelevolla seuraava
        }
        // Kierroslevon indeksi (0) hoidetaan nyt startTimerForPhase-kutsussa

        if (nextIndexToShow >= 0 && nextIndexToShow < currentWorkoutExercises.length) {
             const nextItem = exerciseListUl.querySelector(`li[data-index="${nextIndexToShow}"]`);
             if (nextItem) {
                 nextItem.classList.add('next-up');
             }
        }
    }

    function clearNextUpHighlight() {
        const highlightedItem = exerciseListUl.querySelector('li.next-up');
        if (highlightedItem) {
            highlightedItem.classList.remove('next-up');
        }
    }

    // --- UUDET: Funktiot body-lukitukselle ---
    function addBodyLock() {
        document.body.classList.add('timer-active');
        console.log("Body scroll locked.");
    }

    function removeBodyLock() {
         document.body.classList.remove('timer-active');
         console.log("Body scroll unlocked.");
    }


    function toggleTrainingSelectionVisibility() {
         trainingSelectSection.classList.toggle('hidden');
         toggleTrainingSelectBtn.textContent = trainingSelectSection.classList.contains('hidden')
             ? "Valitse treeni ⯆"
             : "Piilota valikko ⯅";
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
