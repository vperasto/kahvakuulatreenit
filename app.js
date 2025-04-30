// app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    const weekButtonsContainer = document.getElementById('week-buttons-container');
    // const trainingDropdown = document.getElementById('training-dropdown'); // Kommentoitu pois toistaiseksi
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    const workoutNotesP = document.getElementById('workout-notes');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const stopBtn = document.getElementById('stop-btn');
    // const defaultDurationInput = document.getElementById('default-duration'); // Ei käytössä uudella JSONilla (ajat JSONissa)
    // const defaultRestInput = document.getElementById('default-rest');       // Ei käytössä uudella JSONilla

    // --- Sovelluksen tila ---
    let fullProgramData = null; // Säilöö koko ladatun JSONin
    let currentWorkoutExercises = []; // Tämän treenin suoritettavat liikkeet (objekteja)
    let currentWorkoutInfo = { // Lisätietoa valitusta treenistä
        week: null,
        phaseIndex: null,
        level: '2', // <-- HARDCODED LEVEL! Muuta tai lisää valinta.
        rounds: 0,
        restBetweenRounds: 0,
        notes: '',
        focus: ''
    };
    let currentExerciseIndex = 0;
    let currentRound = 1; // Lisätty kierroslaskuri
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = {
        IDLE: 'idle', // Odottaa aloitusta
        RUNNING_EXERCISE: 'running_exercise', // Työaika käynnissä
        RUNNING_REST: 'running_rest',         // Liikkeiden välinen lepo käynnissä
        RUNNING_ROUND_REST: 'running_round_rest', // Kierrosten välinen lepo käynnissä
        PAUSED: 'paused',                     // Pausella
        FINISHED: 'finished'                  // Koko treeni valmis
    };
    let timerState = TimerState.IDLE;

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load program data...");
        try {
            // MUUTA TIEDOSTONIMI TARVITTAESSA
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            fullProgramData = await response.json();
            console.log("Program data loaded and parsed successfully.");

            // Tarkista uuden rakenteen avainelementit
            if (!fullProgramData || !fullProgramData.exercises || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.kettlebellProgram11Weeks.phases) {
                console.error("Loaded data is missing expected sections (exercises, kettlebellProgram11Weeks, phases).");
                throw new Error("Loaded data structure is incorrect.");
            }

            populateWeekSelectors(); // Luo viikkonapit
            resetWorkoutState(); // Nollaa tila latauksen jälkeen

        } catch (error) {
            console.error("Could not load or process program data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa treeniohjelmaa.";
             resetWorkoutState(); // Resetoi UI virhetilanteessa
        }
    }

    // --- UUSI: Luo viikkonapit ---
    function populateWeekSelectors() {
        console.log("Populating week selectors...");
        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks) {
            console.error("Cannot populate week selectors, program data is missing.");
            return;
        }

        weekButtonsContainer.innerHTML = ''; // Tyhjennä vanhat
        const totalWeeks = 11; // Oletus 11 viikkoa

        for (let i = 1; i <= totalWeeks; i++) {
            const button = document.createElement('button');
            button.textContent = `Viikko ${i}`;
            button.classList.add('week-button');
            button.dataset.weekNumber = i; // Tallenna viikkonumero
            button.addEventListener('click', () => handleWeekSelect(i)); // Kutsu uutta käsittelijää
            weekButtonsContainer.appendChild(button);
        }
        console.log(`${totalWeeks} week buttons created.`);
        // Poistettu pikatreenien pudotusvalikon populointi
    }


    // --- UUSI: Käsittelee viikon valinnan ---
    function handleWeekSelect(weekNumber) {
        console.log(`Handling selection for Week: ${weekNumber}`);
        resetWorkoutState(); // Nollaa aina ensin edellinen tila

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Cannot handle week select, essential data missing.");
            resetWorkoutState();
            return;
        }

        // 1. Etsi oikea vaihe (phase) viikkonumeron perusteella
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

        // 2. Hae Tason tiedot (käytetään kovakoodattua tasoa)
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

        // 3. Määritä käytettävä harjoituslista
        let phaseExercisesList = [];
        if (selectedPhaseIndex === 2 && selectedPhase.exampleWeeklyExercises) { // Oletetaan Vaihe 3 olevan index 2
            console.log("Using exampleWeeklyExercises for Phase 3.");
            phaseExercisesList = selectedPhase.exampleWeeklyExercises;
            // Tässä voisi tulevaisuudessa olla logiikkaa exerciseOptionsin käsittelyyn
        } else if (selectedPhase.weeklyExercises) {
            phaseExercisesList = selectedPhase.weeklyExercises;
        } else {
            console.error(`No exercise list found for phase ${selectedPhase.phaseInfo.name}.`);
            resetWorkoutState();
            exerciseNameH2.textContent = "Harjoituslistaa ei löytynyt.";
            return;
        }

        // 4. Rakenna `currentWorkoutExercises` yhdistämällä tiedot
        const mappedExercises = phaseExercisesList.map(phaseEx => {
            if (!phaseEx || !phaseEx.exerciseId) {
                console.warn("Skipping invalid entry in phase exercise list:", phaseEx);
                return null;
            }
            const fullExerciseDetails = fullProgramData.exercises.find(ex => ex.id === phaseEx.exerciseId);
            if (!fullExerciseDetails) {
                console.warn(`Exercise with ID "${phaseEx.exerciseId}" not found in main exercise bank.`);
                return null;
            }
            // Yhdistä tiedot: Pohjatiedot + Näytettävä Nimi + Tason ajat + Muistiinpanot
            return {
                ...fullExerciseDetails, // id, name, image, description, muscleGroups...
                displayTitle: phaseEx.displayTitle || fullExerciseDetails.name, // Käytä displayTitle jos on, muuten perusnimeä
                notes: phaseEx.notes || '', // Liikekohtaiset muistiinpanot
                workTime: workTime,       // Tason mukainen työaika
                restTime: restTime        // Tason mukainen lepoaika
            };
        }).filter(ex => ex !== null); // Poista mahdolliset null-arvot (jos liikettä ei löytynyt)

        if (mappedExercises.length === 0) {
            console.error(`No valid exercises found or mapped for week ${weekNumber}.`);
            resetWorkoutState();
            exerciseNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt.";
            return;
        }

        // 5. Tallenna tiedot sovelluksen tilaan
        currentWorkoutExercises = mappedExercises;
        currentExerciseIndex = 0;
        currentRound = 1; // Aloita kierroksesta 1
        currentWorkoutInfo = {
            week: weekNumber,
            phaseIndex: selectedPhaseIndex,
            level: currentWorkoutInfo.level, // Pidä valittu taso
            rounds: parseInt(selectedPhase.workoutPlan.rounds) || 1, // Hae kierrosmäärä (tai oletus 1)
            restBetweenRounds: parseInt(selectedPhase.workoutPlan.restBetweenRoundsSeconds) || 0, // Kierroslepo
            notes: selectedPhase.phaseInfo.focus || '', // Käytä fokus-tekstiä muistiinpanoina
            focus: selectedPhase.phaseInfo.focus || ''
        };

        console.log(`Workout for Week ${weekNumber} loaded: ${currentWorkoutExercises.length} exercises, ${currentWorkoutInfo.rounds} rounds.`);

        // 6. Päivitä UI
        populateExerciseList();
        workoutNotesP.textContent = `Taso: ${currentWorkoutInfo.level} (${fullProgramData.kettlebellProgram11Weeks.programInfo.levels.find(l=>l.level == currentWorkoutInfo.level)?.description || ''})\nFokus: ${currentWorkoutInfo.focus}`;
        displayExercise(currentExerciseIndex); // Näytä eka liike
        updateButtonStates(); // Päivitä napit IDLE-tilaan
        highlightWeekButton(weekNumber); // Korosta valittu viikko

    }

    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    }

    // --- MUOKATTU: Käyttää displayTitle ---
    function populateExerciseList() {
        exerciseListUl.innerHTML = '';
        if (currentWorkoutExercises.length === 0) {
             exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>';
             return;
        }

        currentWorkoutExercises.forEach((exercise, index) => {
            const li = document.createElement('li');
            // Näytä indeksi ja displayTitle
            li.textContent = `${index + 1}. ${exercise.displayTitle}`;
            li.dataset.index = index; // Pidä indeksi data-attribuuttina
            li.classList.add('exercise-item');
            li.addEventListener('click', () => {
                 if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                    jumpToExercise(index);
                 } else {
                     console.log("Cannot jump while timer is active.");
                 }
            });
            exerciseListUl.appendChild(li);
        });
    }

     function jumpToExercise(index) {
        if (index >= 0 && index < currentWorkoutExercises.length) {
            stopTimer(); // Pysäytä ajastin kokonaan
            currentExerciseIndex = index;
            currentRound = Math.floor(index / currentWorkoutExercises.length) + 1; // Arvioi kierros hyppelyn jälkeen? Tai nollaa?
            timerState = TimerState.IDLE; // Takaisin odotustilaan
            displayExercise(currentExerciseIndex);
            updateButtonStates();
            clearNextUpHighlight();
        }
    }

    // --- MUOKATTU: Käyttää workTime ---
    function displayExercise(index) {
         console.log(`Attempting to display exercise at index: ${index}. Current list length: ${currentWorkoutExercises.length}`);
         clearNextUpHighlight();

        if (index < 0 || index >= currentWorkoutExercises.length || !currentWorkoutExercises[index]) {
            console.error(`Invalid exercise index or exercise data! Index: ${index}, Workout Length: ${currentWorkoutExercises.length}`);
            // Yritä nollata tila, jos data on epäkelpo
            resetWorkoutState();
            exerciseNameH2.textContent = "Virhe harjoituksen näyttämisessä";
            exerciseDescriptionP.textContent = `Harjoitusta ei löytynyt indeksillä ${index}. Valitse treeni uudelleen.`;
            return;
        }

        const exercise = currentWorkoutExercises[index];
        console.log(`Displaying: ${exercise.displayTitle} (ID: ${exercise.id})`);
        // Näytä displayTitle otsikkona
        exerciseNameH2.textContent = exercise.displayTitle;
        // Näytä peruskuvaus ja liikekohtainen huomio
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

        // Aseta ajastin valmiiksi työaikaan, jos ollaan IDLE/FINISHED
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
             remainingTime = exercise.workTime || 0; // Käytä tallennettua työaikaa
             updateTimerDisplay(remainingTime, "Työaika");
        }

        highlightCurrentExercise();
        // Napit päivitetään kutsuvassa funktiossa
    }

    // Poistettu getDefaultTime, koska ajat haetaan nyt handleWeekSelectissä

    // --- Ajastimen toiminnot (MUOKATTU: Käyttää workTime/restTime ja kierrokset) ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
            console.log("Cannot start workout: No workout selected or timer already active.");
            return;
        }
        console.log("Starting workout from beginning...");
        currentExerciseIndex = 0; // Aloita ensimmäisestä liikkeestä
        currentRound = 1;         // Aloita kierroksesta 1
        displayExercise(currentExerciseIndex);
        const firstExercise = currentWorkoutExercises[currentExerciseIndex];
        startTimerForPhase(TimerState.RUNNING_EXERCISE, firstExercise.workTime); // Käytä tallennettua työaikaa
    }

    function pauseResumeTimer() {
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            stopTimerInterval();
            const previousState = timerState; // Tallenna tila ennen pausausta
            timerState = TimerState.PAUSED;
            console.log("Timer Paused");
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
            // Säilytä next-up highlight jos tauko levon aikana
            if(previousState === TimerState.RUNNING_REST || previousState === TimerState.RUNNING_ROUND_REST){
                // Varmista että highlight on päällä
                highlightNextExercise();
            }

        } else if (timerState === TimerState.PAUSED) {
             console.log("Timer Resumed");
             // Päättele mihin tilaan palataan labelin perusteella
             const label = timerLabelP.textContent;
             if (label.includes("Työaika")) {
                 timerState = TimerState.RUNNING_EXERCISE;
             } else if (label.includes("Lepo liikkeiden välillä")) { // Tarkempi label
                 timerState = TimerState.RUNNING_REST;
             } else if (label.includes("Lepo kierrosten välillä")) { // Tarkempi label
                  timerState = TimerState.RUNNING_ROUND_REST;
             } else {
                 console.warn("Timer state unclear on resume, restarting current exercise phase.");
                 // Yritä palautua käynnistämällä nykyinen liike uudelleen
                 if (currentWorkoutExercises[currentExerciseIndex]) {
                    startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].workTime);
                 } else {
                     resetWorkoutState(); // Turvanollaus
                 }
                 return;
             }
             runTimerInterval();
             pauseBtn.textContent = "⏸ Tauko";
             pauseBtn.classList.remove('paused');
             // Varmista next-up highlight jos jatketaan levosta
             if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                 highlightNextExercise();
             } else {
                 clearNextUpHighlight(); // Poista highlight jos jatketaan työstä
             }

        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer(); // Pysäyttää intervallin, asettaa tilan IDLE
        console.log("Workout Stopped by user.");
        clearNextUpHighlight();
        currentRound = 1; // Nollaa kierroslaskuri
        if (currentWorkoutExercises.length > 0 && currentWorkoutExercises[currentExerciseIndex]) {
            // Aseta ajastin näyttämään nykyisen liikkeen työaikaa
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
            updateTimerDisplay(currentExercise.workTime, "Työaika");
            displayExercise(currentExerciseIndex); // Näytä nykyinen liike uudelleen
        } else {
             resetWorkoutState(); // Jos treeniä ei ladattu, nollaa kokonaan
        }
         updateButtonStates(); // Päivitä napit IDLE-tilaan
    }

    function stopTimer() {
        stopTimerInterval();
        timerState = TimerState.IDLE;
        console.log("Timer interval stopped, state set to IDLE.");
    }

    function stopTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Timer interval cleared.");
        }
    }

     // --- MUOKATTU: Käynnistää tietyn vaiheen ajastimen ---
     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); // Varmista, ettei vanha jää pyörimään
        timerState = phaseState;
        remainingTime = duration;

        // Määritä label tilan perusteella
        let label = "Odottamassa...";
        if (phaseState === TimerState.RUNNING_EXERCISE) {
            label = `Työaika (Kierros ${currentRound}/${currentWorkoutInfo.rounds})`;
            clearNextUpHighlight(); // Poista highlight työajan alussa
        } else if (phaseState === TimerState.RUNNING_REST) {
            label = `Lepo liikkeiden välillä (Kierros ${currentRound})`;
            highlightNextExercise(); // Näytä seuraava liike levon alussa
        } else if (phaseState === TimerState.RUNNING_ROUND_REST) {
             label = `Lepo kierrosten välillä (Valmistaudu kierrokseen ${currentRound + 1})`;
             highlightNextExercise(); // Näytä seuraava (eli eka) liike levon alussa
        }

        console.log(`Starting phase: ${phaseState}, Duration: ${duration}, Label: ${label}`);
        updateTimerDisplay(remainingTime, label);
        updateButtonStates(); // Päivitä napit uuteen tilaan

        if (remainingTime > 0) {
            runTimerInterval(); // Käynnistä intervalli jos aikaa on
        } else {
            console.log("Phase duration is 0 or less, handling timer end immediately.");
            handleTimerEnd(); // Käsittele heti jos kesto 0
        }
    }

    function runTimerInterval() {
        if (timerInterval) {
            console.warn("runTimerInterval called but interval already exists.");
            return;
        }
        console.log("Starting timer interval (1000ms)");
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Älä tee mitään jos pausella

            remainingTime--;
             // Päivitä label dynaamisesti (näyttää oikean ajan + tilan)
             let label = timerLabelP.textContent; // Säilytä vanha label jos ei muutosta
            if (timerState === TimerState.RUNNING_EXERCISE) {
                label = `Työaika (Kierros ${currentRound}/${currentWorkoutInfo.rounds})`;
            } else if (timerState === TimerState.RUNNING_REST) {
                label = `Lepo liikkeiden välillä (Kierros ${currentRound})`;
            } else if (timerState === TimerState.RUNNING_ROUND_REST) {
                 label = `Lepo kierrosten välillä (Valmistaudu kierrokseen ${currentRound + 1})`;
            }
            updateTimerDisplay(remainingTime, label);

            if (remainingTime <= 0) {
                console.log("Remaining time reached 0, handling timer end.");
                handleTimerEnd(); // Kutsu käsittelijää kun aika loppuu
            }
        }, 1000);
    }

    // --- MUOKATTU: Käsittelee kierrokset ja kierroslevot ---
    function handleTimerEnd() {
         stopTimerInterval(); // Pysäytä nykyinen intervalli
         if (!currentWorkoutExercises[currentExerciseIndex]) {
             console.error("Cannot handle timer end: current exercise is undefined.");
             resetWorkoutState(); // Yritä palautua nollaamalla
             return;
         }

         const currentExercise = currentWorkoutExercises[currentExerciseIndex];
         const isLastExerciseInRound = currentExerciseIndex === currentWorkoutExercises.length - 1;
         const isLastRound = currentRound >= currentWorkoutInfo.rounds;

         // Jos TYÖAIKA päättyi:
         if (timerState === TimerState.RUNNING_EXERCISE) {
            console.log(`Exercise phase ended: ${currentExercise.displayTitle}`);
            const restDuration = currentExercise.restTime || 0; // Hae liikkeen lepoaika

            // Tarkista, onko tämä kierroksen viimeinen liike
            if (isLastExerciseInRound) {
                 // Onko tämä myös koko treenin viimeinen kierros?
                if (isLastRound) {
                     console.log("Last exercise of last round finished.");
                     moveToNextPhase(); // Siirry lopetustilaan
                } else {
                    // Ei viimeinen kierros, aloita KIERROSLEPO
                    const roundRestDuration = currentWorkoutInfo.restBetweenRounds || 0;
                     console.log(`End of round ${currentRound}. Starting round rest (${roundRestDuration}s).`);
                     if (roundRestDuration > 0) {
                         startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRestDuration);
                     } else {
                          console.log("No round rest defined, moving directly to next round.");
                          moveToNextPhase(); // Siirry heti seuraavaan vaiheeseen (eli seuraavan kierroksen alkuun)
                     }
                }
            } else {
                 // Ei ollut kierroksen viimeinen liike, aloita normaali LIIKELEPO (jos > 0)
                 if (restDuration > 0) {
                     console.log(`Starting rest period (${restDuration}s) between exercises.`);
                     startTimerForPhase(TimerState.RUNNING_REST, restDuration);
                 } else {
                    console.log("No rest period defined between exercises, moving directly to next exercise.");
                    moveToNextPhase(); // Siirry heti seuraavaan liikkeeseen
                 }
            }
         // Jos LIIKKEIDEN VÄLINEN LEPO päättyi:
         } else if (timerState === TimerState.RUNNING_REST) {
            console.log("Rest between exercises ended.");
            moveToNextPhase(); // Siirry seuraavaan liikkeeseen
         // Jos KIERROSTEN VÄLINEN LEPO päättyi:
         } else if (timerState === TimerState.RUNNING_ROUND_REST) {
             console.log("Rest between rounds ended.");
             moveToNextPhase(); // Siirry seuraavaan vaiheeseen (eli seuraavan kierroksen alkuun)
         } else {
             console.warn(`handleTimerEnd called from unexpected state: ${timerState}`);
             resetWorkoutState(); // Yritä nollata jos tila on outo
        }
    }

     // --- MUOKATTU: Hallinnoi siirtymistä liikkeestä/kierroksesta toiseen ---
     function moveToNextPhase() {
        clearNextUpHighlight(); // Poista highlight kun siirrytään aktiivisesti

        // Jos edellinen tila oli kierroslepo TAI viimeinen liike työajassa (ilman kierroslepoa)
        if (timerState === TimerState.RUNNING_ROUND_REST ||
            (timerState === TimerState.RUNNING_EXERCISE && currentExerciseIndex === currentWorkoutExercises.length - 1 && !isLastRound))
        {
            currentRound++; // Siirry seuraavalle kierrokselle
            currentExerciseIndex = 0; // Aloita kierros alusta
            console.log(`Starting Round ${currentRound}`);
        } else {
            // Muussa tapauksessa siirry vain seuraavaan liikkeeseen samalla kierroksella
             currentExerciseIndex++;
        }

        // Tarkista onko treeni kokonaan valmis
        if (currentRound > currentWorkoutInfo.rounds) {
             console.log("Workout Finished (All rounds completed)");
             timerState = TimerState.FINISHED;
             exerciseNameH2.textContent = "Treeni Valmis!";
             exerciseDescriptionP.textContent = "Hyvää työtä!";
             exerciseImageImg.style.display = 'none';
             workoutNotesP.textContent = `Kaikki ${currentWorkoutInfo.rounds} kierrosta tehty! Valitse uusi treeni tai aloita tämä alusta.`;
             updateTimerDisplay(0, "Valmis");
             updateButtonStates();
             highlightCurrentExercise(); // Poista viimeisen liikkeen highlight
             // Tässä voisi myös nollata currentRound ja currentExerciseIndex valmiiksi uutta starttia varten
             // currentRound = 1;
             // currentExerciseIndex = 0;
        }
        // Jos treeni jatkuu (uusi liike tai uusi kierros):
        else if (currentExerciseIndex < currentWorkoutExercises.length) {
             console.log(`Moving to exercise index: ${currentExerciseIndex} in round ${currentRound}`);
             const nextExercise = currentWorkoutExercises[currentExerciseIndex];
             displayExercise(currentExerciseIndex); // Näytä ennen ajastimen käynnistystä
             startTimerForPhase(TimerState.RUNNING_EXERCISE, nextExercise.workTime); // Käynnistä työaika
        } else {
             // Tähän ei pitäisi päätyä normaalisti, mutta varmuuden vuoksi
             console.error("Error in moveToNextPhase logic: Index out of bounds or round mismatch.");
             resetWorkoutState();
        }
    }


    function updateTimerDisplay(timeInSeconds, label) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        timerLabelP.textContent = label; // Näytä tarkempi label
    }

    // --- Navigointipainikkeet (Pidetään toimivina vain IDLE/FINISHED tilassa) ---
    function prevExercise() {
        if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED) {
            console.log("Cannot navigate while timer is active.");
            return;
        }
        if (currentExerciseIndex > 0) {
            console.log("Moving to previous exercise.");
            jumpToExercise(currentExerciseIndex - 1);
        }
    }

    function nextExercise() {
         if (timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED) {
            console.log("Cannot navigate while timer is active.");
            return;
        }
        if (currentExerciseIndex < currentWorkoutExercises.length - 1) {
            console.log("Moving to next exercise.");
             jumpToExercise(currentExerciseIndex + 1);
        } else {
            console.log("Already at the last exercise.");
        }
    }

    // --- UI-päivitykset (MUOKATTU: Ottaa huomioon uudet tilat) ---
    function updateButtonStates() {
        const hasWorkout = currentWorkoutExercises.length > 0;
        const isIdle = timerState === TimerState.IDLE;
        const isRunning = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const isPaused = timerState === TimerState.PAUSED;
        const isFinished = timerState === TimerState.FINISHED;

        // Aloitus: Vain jos treeni valittu JA tila IDLE
        startBtn.disabled = !hasWorkout || !isIdle;
        // Tauko/Jatka: Vain jos käynnissä TAI pausella
        pauseBtn.disabled = !isRunning && !isPaused;
        // Pysäytys: Vain jos käynnissä TAI pausella
        stopBtn.disabled = !isRunning && !isPaused;
         // Navigointi: Vain jos treeni valittu JA tila IDLE tai FINISHED
        const canNavigate = hasWorkout && (isIdle || isFinished);
        prevBtn.disabled = !canNavigate || currentExerciseIndex <= 0;
        nextBtn.disabled = !canNavigate || currentExerciseIndex >= currentWorkoutExercises.length - 1;

        // Päivitä Tauko/Jatka -teksti ja tyyli
        if (isPaused) {
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
        } else {
            pauseBtn.textContent = "⏸ Tauko";
            pauseBtn.classList.remove('paused');
        }
        // console.log("Button states updated.");
    }

     // --- MUOKATTU Reset-funktio ---
     function resetWorkoutState() {
        console.log("Resetting workout state...");
        stopTimerInterval(); // Pysäytä ajastin jos käynnissä
        currentWorkoutExercises = []; // Tyhjennä treenilista
        currentExerciseIndex = 0;
        currentRound = 1; // Nollaa kierros
        remainingTime = 0;
        timerState = TimerState.IDLE; // Aseta tila odottamaan
        currentWorkoutInfo = { // Nollaa treenin tiedot
            week: null, phaseIndex: null, level: currentWorkoutInfo.level, // Säilytä taso
            rounds: 0, restBetweenRounds: 0, notes: '', focus: ''
         };

        // Nollaa UI-elementit
        exerciseNameH2.textContent = "Valitse treeni";
        exerciseDescriptionP.textContent = "";
        workoutNotesP.textContent = ""; // Tyhjennä muistiinpanot
        exerciseImageImg.style.display = 'none';
        exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; // Tyhjennä lista
        updateTimerDisplay(0, "Odottamassa..."); // Nollaa ajastin näyttö
        highlightCurrentExercise(); // Poista korostus listasta
        clearNextUpHighlight(); // Poista seuraavan korostus
        updateButtonStates(); // Päivitä nappien tila

        // Poista viikkonappien korostus
        document.querySelectorAll('.week-button').forEach(btn => btn.classList.remove('active'));

        console.log("Workout state reset complete.");
    }

    // --- MUOKATTU Highlight-funktio (ei juuri muutoksia) ---
    function highlightCurrentExercise() {
        const items = exerciseListUl.querySelectorAll('li.exercise-item');
        items.forEach((item) => {
            const itemIndex = parseInt(item.dataset.index, 10);
            if (currentWorkoutExercises.length > 0 && !isNaN(itemIndex) && itemIndex === currentExerciseIndex) {
                item.classList.add('active');
                // Vieritä elementti näkyviin vain jos se ei ole jo näkyvissä (vähentää hyppimistä)
                 if (item.offsetTop < exerciseListUl.scrollTop || item.offsetTop + item.offsetHeight > exerciseListUl.scrollTop + exerciseListUl.clientHeight) {
                      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                 }
            } else {
                item.classList.remove('active');
            }
        });
         if (currentWorkoutExercises.length === 0) {
              const allItems = exerciseListUl.querySelectorAll('li');
              allItems.forEach(item => item.classList.remove('active'));
         }
    }

    // --- MUOKATTU: Next-up highlight ---
    function highlightNextExercise() {
        clearNextUpHighlight();
         let nextIndexToShow = -1;

        // Jos ollaan kierroslevolla, seuraava on kierroksen eka liike (index 0)
        if(timerState === TimerState.RUNNING_ROUND_REST) {
            nextIndexToShow = 0;
        }
        // Jos ollaan liikkeiden välisellä levossa, seuraava on nykyinen + 1
        else if (timerState === TimerState.RUNNING_REST) {
             nextIndexToShow = currentExerciseIndex + 1;
        }

        if (nextIndexToShow >= 0 && nextIndexToShow < currentWorkoutExercises.length) {
             const nextItem = exerciseListUl.querySelector(`li[data-index="${nextIndexToShow}"]`);
             if (nextItem) {
                 nextItem.classList.add('next-up');
                 console.log(`Highlighting next exercise: ${nextItem.textContent}`);
             }
        }
    }

    function clearNextUpHighlight() {
        const highlightedItem = exerciseListUl.querySelector('li.next-up');
        if (highlightedItem) {
            highlightedItem.classList.remove('next-up');
             // console.log("Cleared next-up highlight."); // Vähennetään lokitusta
        }
    }

    function toggleTrainingSelectionVisibility() {
         trainingSelectSection.classList.toggle('hidden');
         toggleTrainingSelectBtn.textContent = trainingSelectSection.classList.contains('hidden')
             ? "Valitse treeni ⯆"
             : "Piilota valikko ⯅";
    }

    // --- Event Listeners ---
    // Viikkonappien kuuntelijat lisätään populateWeekSelectorsissa
    startBtn.addEventListener('click', startWorkout);
    pauseBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopWorkout);
    prevBtn.addEventListener('click', prevExercise);
    nextBtn.addEventListener('click', nextExercise);
    toggleTrainingSelectBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
