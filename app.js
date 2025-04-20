// app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const trainingDropdown = document.getElementById('training-dropdown');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const stopBtn = document.getElementById('stop-btn');

    // --- Sovelluksen tila ---
    let allExercisesData = null; // Tähän ladataan koko exercises.json
    let currentWorkoutExercises = []; // Nykyisen valitun treenin harjoitukset objekteina
    let currentExerciseIndex = 0;
    let timerInterval = null;
    let remainingTime = 0; // Sekunteina
    const TimerState = { // Enum ajastimen tiloille
        IDLE: 'idle',
        RUNNING_EXERCISE: 'running_exercise',
        RUNNING_REST: 'running_rest',
        PAUSED: 'paused',
        FINISHED: 'finished'
    };
    let timerState = TimerState.IDLE;

    // --- Datan alustus ---
    async function loadAppData() {
        console.log("Attempting to load exercise data...");
        try {
            const response = await fetch('data/exercises.json');
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            console.log("Fetch response OK, attempting to parse JSON...");
            allExercisesData = await response.json();
            console.log("Exercise data loaded and parsed successfully:", allExercisesData);

            if (!allExercisesData || !allExercisesData.exercises || !allExercisesData.weeklyWorkouts || !allExercisesData.presetWorkouts) {
                console.error("Loaded data is missing expected sections (exercises, weeklyWorkouts, presetWorkouts).");
                throw new Error("Loaded data structure is incorrect.");
            }

            populateTrainingDropdown();
            resetWorkoutState(); // Aseta alkutila (tämä kutsuu nyt myös resetWorkoutState-funktion, joka nollaa UI:n)

        } catch (error) {
            console.error("Could not load or process exercise data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa treenidataa. Tarkista konsoli.";
            if (trainingDropdown.options.length <= 1) {
                 trainingDropdown.innerHTML = '<option value="">Lataus epäonnistui</option>';
                 trainingDropdown.disabled = true;
            }
            // Kutsu resetWorkoutState silti varmuuden vuoksi, jotta UI on tyhjä
             resetWorkoutState();
        }
    }

    function populateTrainingDropdown() {
        console.log("Populating training dropdown...");
        if (!allExercisesData || !allExercisesData.weeklyWorkouts || !allExercisesData.presetWorkouts) {
            console.error("Cannot populate dropdown, data is missing.");
            return;
        }

        trainingDropdown.innerHTML = '<option value="">-- Valitse treeni --</option>';
        trainingDropdown.disabled = false;

        let addedWorkouts = 0;

        // Lisää viikkotreenit
        console.log("Adding weekly workouts...");
        if (allExercisesData.weeklyWorkouts && Array.isArray(allExercisesData.weeklyWorkouts)) {
             const groupWeek = document.createElement('optgroup');
             groupWeek.label = "Viikkotreenit";
             allExercisesData.weeklyWorkouts.forEach((workout, index) => {
                 console.log(`Adding week workout ${index}: ${workout.week}`);
                 if (workout && workout.week && workout.exercises) {
                     const option = document.createElement('option');
                     option.value = `week_${workout.week}`;
                     option.textContent = workout.week;
                     groupWeek.appendChild(option);
                     addedWorkouts++;
                 } else {
                     console.warn(`Skipping invalid weekly workout at index ${index}:`, workout);
                 }
             });
             if (groupWeek.childElementCount > 0) {
                trainingDropdown.appendChild(groupWeek);
             }
        } else {
             console.warn("weeklyWorkouts data is missing or not an array.");
        }

        // Lisää pikatreenit
        console.log("Adding preset workouts...");
         if (allExercisesData.presetWorkouts && Array.isArray(allExercisesData.presetWorkouts)) {
            const groupPreset = document.createElement('optgroup');
            groupPreset.label = "Pikatreenit";
            allExercisesData.presetWorkouts.forEach((workout, index) => {
                console.log(`Adding preset workout ${index}: ${workout.name}`);
                 if (workout && workout.name && workout.exercises) {
                    const option = document.createElement('option');
                    option.value = `preset_${workout.name}`;
                    option.textContent = workout.name;
                    groupPreset.appendChild(option);
                    addedWorkouts++;
                 } else {
                     console.warn(`Skipping invalid preset workout at index ${index}:`, workout);
                 }
            });
             if (groupPreset.childElementCount > 0) {
                trainingDropdown.appendChild(groupPreset);
             }
        } else {
             console.warn("presetWorkouts data is missing or not an array.");
        }

        if (addedWorkouts === 0) {
            console.warn("No workouts were added to the dropdown. Check JSON data structure.");
            trainingDropdown.innerHTML = '<option value="">Treenilistoja ei löytynyt</option>';
            trainingDropdown.disabled = true;
        } else {
            console.log(`Successfully added ${addedWorkouts} workouts to the dropdown.`);
        }
    }

    // --- Treenin käsittely (KORJATTU VERSIO) ---
    function handleTrainingSelect() {
        const selectedValue = trainingDropdown.value;

        // --- 1. Nollaa tila HETI kun valinta muuttuu ---
        console.log("Dropdown changed, resetting state first.");
        resetWorkoutState(); // Nollaa edellinen tila ja UI välittömästi

        if (!selectedValue || !allExercisesData) {
            // Jos valinta tyhjennettiin tai dataa ei ole, nollaus riittää.
            console.log("Dropdown cleared or data missing, state reset.");
            return;
        }

        console.log(`Handling selection: ${selectedValue}`); // Loki valinnasta

        // --- 2. Etsi valitun treenin data ---
        let selectedWorkout = null;
        if (selectedValue.startsWith('week_')) {
            const weekName = selectedValue.replace('week_', '');
            selectedWorkout = allExercisesData.weeklyWorkouts.find(w => w.week === weekName);
        } else if (selectedValue.startsWith('preset_')) {
            const presetName = selectedValue.replace('preset_', '');
            selectedWorkout = allExercisesData.presetWorkouts.find(w => w.name === presetName);
        }

        // --- 3. Käsittele löydetty treeni ---
        if (selectedWorkout && selectedWorkout.exercises && allExercisesData.exercises) {
            console.log("Selected workout found:", selectedWorkout.name || selectedWorkout.week); // Loki löydetystä treenistä

            // Muodosta harjoituslista täysistä objekteista nimien perusteella
            const exerciseNames = selectedWorkout.exercises;
            const mappedExercises = exerciseNames
                .map(exerciseName => {
                    const foundEx = allExercisesData.exercises.find(ex => ex.name === exerciseName);
                    if (!foundEx) {
                        // Varoitus jos jotain harjoitusnimeä ei löytynyt päälistasta
                        console.warn(`Exercise named "${exerciseName}" not found in main exercise list.`);
                    }
                    return foundEx; // Palauta löydetty objekti tai undefined
                })
                .filter(ex => ex !== undefined); // Suodata pois ne, joita ei löytynyt

            console.log("Mapped exercises for workout:", mappedExercises); // Loki muodostetusta listasta

            // --- 4. Päivitä tila ja UI VAIN jos valideja harjoituksia löytyi ---
            if (mappedExercises.length > 0) {
                currentWorkoutExercises = mappedExercises; // Aseta treenin harjoitukset
                currentExerciseIndex = 0; // Aseta indeksi alkuun

                console.log(`Populating list and displaying exercise index ${currentExerciseIndex} (Total: ${currentWorkoutExercises.length})`); // Loki ennen näyttöä

                populateExerciseList(); // Päivitä sivupalkin lista
                displayExercise(currentExerciseIndex); // Näytä ensimmäinen harjoitus
                updateButtonStates(); // Aktivoi/passivoi napit oikein
            } else {
                // Valitulle treenille ei löytynyt yhtään kelvollista harjoitusta
                console.error(`Selected workout "${selectedWorkout.name || selectedWorkout.week}" has no valid/found exercises.`);
                exerciseNameH2.textContent = "Treenin harjoituksia ei löytynyt.";
                // resetWorkoutState ajettiin jo alussa, napit pysyvät passiivisina.
            }
        } else {
            // Valitun treenin määrittelyä ei löytynyt JSONista tai exercises-päälista puuttuu
            console.error("Could not find selected workout definition in JSON or base 'exercises' list is missing.");
            exerciseNameH2.textContent = "Treenin määrittelyä ei löytynyt.";
            // resetWorkoutState ajettiin jo alussa.
        }

        // Valinnainen: Piilota treenivalikko valinnan jälkeen
        // trainingSelectSection.classList.add('hidden');
    }


    function populateExerciseList() {
        exerciseListUl.innerHTML = ''; // Tyhjennä vanha lista
        if (currentWorkoutExercises.length === 0) {
             exerciseListUl.innerHTML = '<li>Valitse ensin treeni.</li>';
             return;
        }

        currentWorkoutExercises.forEach((exercise, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${exercise.name}`;
            li.dataset.index = index; // Tallenna indeksi data-attribuuttiin
            li.classList.add('exercise-item'); // Lisää CSS-luokka
            li.addEventListener('click', () => {
                jumpToExercise(index);
            });
            exerciseListUl.appendChild(li);
        });
    }

     function jumpToExercise(index) {
        if (index >= 0 && index < currentWorkoutExercises.length) {
            stopTimer(); // Pysäytä ajastin jos päällä
            currentExerciseIndex = index;
            timerState = TimerState.IDLE; // Nollaa tila IDLEksi
            displayExercise(currentExerciseIndex);
            updateButtonStates();
        }
    }

    // --- Harjoituksen näyttö (KORJATTU VERSIO) ---
    function displayExercise(index) {
        console.log(`Attempting to display exercise at index: ${index}. Current list length: ${currentWorkoutExercises.length}`); // Loki yrityksestä

        // --- TÄRKEÄ TARKISTUS ---
        if (index < 0 || index >= currentWorkoutExercises.length) {
            // Loki jos indeksi on virheellinen
            console.error(`Invalid exercise index detected! Index: ${index}, Workout Length: ${currentWorkoutExercises.length}`);
            // Näytä virheilmoitus käyttäjälle selkeämmin
            exerciseNameH2.textContent = "Virhe harjoituksen näyttämisessä";
            exerciseDescriptionP.textContent = `Yritettiin näyttää harjoitusta indeksillä ${index}, mutta valitussa treenissä on vain ${currentWorkoutExercises.length} harjoitusta. Valitse treeni uudelleen.`;
            exerciseImageImg.style.display = 'none';
            // Varmistetaan nappien tila
            updateButtonStates();
            return; // Keskeytä funktion suoritus, koska indeksi on virheellinen
        }

        // Jos indeksi on kelvollinen, jatketaan normaalisti:
        const exercise = currentWorkoutExercises[index];
        console.log(`Displaying: ${exercise.name}`); // Loki näytettävästä harjoituksesta
        exerciseNameH2.textContent = exercise.name;
        exerciseDescriptionP.textContent = exercise.description || '';

        if (exercise.image) {
            exerciseImageImg.src = exercise.image;
            exerciseImageImg.alt = exercise.name;
            exerciseImageImg.style.display = 'block';
        } else {
            exerciseImageImg.style.display = 'none';
            exerciseImageImg.src = '';
            exerciseImageImg.alt = '';
        }

        // Aseta työaika näytölle, kun siirrytään harjoitukseen manuaalisesti tai alussa
        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
             remainingTime = exercise.duration;
             updateTimerDisplay(remainingTime, "Työaika");
        }
        // Muissa tiloissa (RUNNING, PAUSED) ajastinlogiikka hoitaa remainingTimen ja labelin päivityksen.

        highlightCurrentExercise();
        // updateButtonStates(); // Päivitetään napit yleensä tämän kutsun jälkeen
    }


    // --- Ajastimen toiminnot ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
            console.log("Cannot start workout: No workout selected or timer already active.");
            return;
        }
        console.log("Starting workout");
        currentExerciseIndex = 0; // Varmista että alkaa alusta
        displayExercise(currentExerciseIndex);
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].duration);
    }

    function pauseResumeTimer() {
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST) {
            stopTimerInterval();
            timerState = TimerState.PAUSED;
            console.log("Timer Paused");
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
        } else if (timerState === TimerState.PAUSED) {
             console.log("Timer Resumed");
             // Päättele oikea tila labelin perusteella (yksinkertaistus)
             if (timerLabelP.textContent.includes("Työaika")) {
                 timerState = TimerState.RUNNING_EXERCISE;
             } else if (timerLabelP.textContent.includes("Lepo")) {
                 timerState = TimerState.RUNNING_REST;
             } else {
                 // Turvaverkko: jos tila oli epäselvä, aloitetaan nykyinen harjoitus alusta
                 console.warn("Timer state unclear on resume, restarting current exercise phase.");
                 startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].duration);
                 return; // Poistu funktiosta, koska tila asetettiin jo
             }
             runTimerInterval(); // Käynnistä interval uudelleen
             pauseBtn.textContent = "⏸ Tauko";
             pauseBtn.classList.remove('paused');
        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer(); // Pysäyttää intervalin ja asettaa IDLE-tilan
        console.log("Workout Stopped by user.");
        // resetWorkoutState nollaisi koko valinnan, ehkä halutaan vain pysäyttää
        // ajastin ja palata nykyisen treenin alkuun?
        // Nykyinen stopTimer asettaa IDLE, joten voi aloittaa alusta.
        // Jos halutaan täysi reset:
        // resetWorkoutState();
        // Jos halutaan vain nollata nykyinen harjoitus ja ajastin:
        if (currentWorkoutExercises.length > 0) {
             displayExercise(currentExerciseIndex); // Näytä nykyinen harjoitus uudelleen nollatulla ajalla
        } else {
             resetWorkoutState(); // Jos ei treeniä, nollaa kaikki
        }
         updateButtonStates(); // Päivitä napit IDLE-tilaan
    }

    function stopTimer() {
        stopTimerInterval();
        timerState = TimerState.IDLE; // Aseta tila IDLEksi
        console.log("Timer interval stopped, state set to IDLE.");
    }

    function stopTimerInterval() {
        clearInterval(timerInterval);
        timerInterval = null;
         console.log("Timer interval cleared.");
    }

     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval();
        timerState = phaseState;
        remainingTime = duration;
        const label = (phaseState === TimerState.RUNNING_EXERCISE) ? "Työaika" : "Lepo";
        console.log(`Starting phase: ${phaseState}, Duration: ${duration}, Label: ${label}`);
        updateTimerDisplay(remainingTime, label);
        updateButtonStates();

        if (remainingTime > 0) {
            runTimerInterval();
        } else {
            console.log("Phase duration is 0, handling timer end immediately.");
            handleTimerEnd();
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
            const label = (timerState === TimerState.RUNNING_EXERCISE) ? "Työaika" : "Lepo";
            updateTimerDisplay(remainingTime, label);

            if (remainingTime <= 0) {
                console.log("Remaining time reached 0, handling timer end.");
                handleTimerEnd();
            }
        }, 1000);
    }

    function handleTimerEnd() {
         stopTimerInterval(); // Pysäytä NYKYINEN interval
         if (!currentWorkoutExercises[currentExerciseIndex]) {
             console.error("Cannot handle timer end: current exercise is undefined.");
             resetWorkoutState(); // Hätäjarru: nollaa tila
             return;
         }

         const currentExercise = currentWorkoutExercises[currentExerciseIndex];
         const isLastExercise = currentExerciseIndex >= currentWorkoutExercises.length - 1;

         if (timerState === TimerState.RUNNING_EXERCISE) {
            console.log(`Exercise phase ended: ${currentExercise.name}`);
            if (!isLastExercise && currentExercise.rest > 0) {
                console.log(`Starting rest period (${currentExercise.rest}s)`);
                startTimerForPhase(TimerState.RUNNING_REST, currentExercise.rest);
            } else {
                console.log("No rest period or last exercise, moving to next phase.");
                moveToNextPhase();
            }
        } else if (timerState === TimerState.RUNNING_REST) {
            console.log("Rest phase ended.");
            moveToNextPhase();
        } else {
             console.warn(`handleTimerEnd called from unexpected state: ${timerState}`);
             // Turvatoimena yritetään siirtyä eteenpäin
             moveToNextPhase();
        }
    }

     function moveToNextPhase() {
        currentExerciseIndex++;
        if (currentExerciseIndex < currentWorkoutExercises.length) {
            console.log(`Moving to next exercise index: ${currentExerciseIndex}`);
            displayExercise(currentExerciseIndex);
            startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].duration);
        } else {
            console.log("Workout Finished");
            timerState = TimerState.FINISHED;
            exerciseNameH2.textContent = "Treeni Valmis!";
            exerciseDescriptionP.textContent = "Hyvää työtä!";
            exerciseImageImg.style.display = 'none';
            updateTimerDisplay(0, "Valmis");
            updateButtonStates();
            // Palauta IDLE-tilaan ja nollaa indeksi, jotta voi aloittaa saman treenin uudelleen
            currentExerciseIndex = 0;
            timerState = TimerState.IDLE;
            highlightCurrentExercise(); // Poista korostus
            // Viiveellä voisi päivittää napit uudelleen, jotta "Start" tulee aktiiviseksi
             setTimeout(updateButtonStates, 100); // Pieni viive varmuudeksi
        }
    }


    function updateTimerDisplay(timeInSeconds, label) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        timerLabelP.textContent = label;
        // console.log(`Timer display updated: ${minutes}:${seconds} - ${label}`); // Vähennä tätä jos liikaa lokeja
    }

    // --- Navigointipainikkeet ---
    function prevExercise() {
        if (currentExerciseIndex > 0) {
            console.log("Moving to previous exercise.");
            stopTimer();
            currentExerciseIndex--;
            timerState = TimerState.IDLE;
            displayExercise(currentExerciseIndex);
            updateButtonStates();
        }
    }

    function nextExercise() {
        if (currentExerciseIndex < currentWorkoutExercises.length - 1) {
            console.log("Moving to next exercise.");
            stopTimer();
            currentExerciseIndex++;
            timerState = TimerState.IDLE;
            displayExercise(currentExerciseIndex);
            updateButtonStates();
        } else {
            // Jos ollaan viimeisessä, voitaisiin hypätä Valmis-tilaan
            if (timerState !== TimerState.FINISHED && currentWorkoutExercises.length > 0) {
                 console.log("Next pressed on last exercise, setting to Finished state.");
                 stopTimer();
                 timerState = TimerState.FINISHED; // Väliaikainen tila
                 exerciseNameH2.textContent = "Treeni Valmis!";
                 updateTimerDisplay(0, "Valmis");
                  updateButtonStates();
                 currentExerciseIndex = 0; // Nollaa valmiiksi
                 timerState = TimerState.IDLE; // Takaisin IDLE tilaan
                 highlightCurrentExercise();
                 // Päivitä napit IDLE-tilaan
                 setTimeout(updateButtonStates, 100);
             }
        }
    }

    // --- UI-päivitykset ---
    function updateButtonStates() {
        const hasWorkout = currentWorkoutExercises.length > 0;
        const isIdle = timerState === TimerState.IDLE;
        const isRunning = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST;
        const isPaused = timerState === TimerState.PAUSED;
        const isFinished = timerState === TimerState.FINISHED; // Tätä tilaa käytetään nyt hetkellisesti

        startBtn.disabled = !hasWorkout || !isIdle;
        pauseBtn.disabled = !isRunning && !isPaused;
        // Stop-nappi on aktiivinen jos treeni on valittu (ja ei IDLE) tai jos ajastin käy/pausella
        stopBtn.disabled = !hasWorkout || isIdle;
        // Tai jos haluat että Stop toimii aina jos treeni on valittu:
        // stopBtn.disabled = !hasWorkout;

        prevBtn.disabled = !hasWorkout || currentExerciseIndex <= 0 || isRunning || isPaused; // Ei voi selata kun ajastin käy
        nextBtn.disabled = !hasWorkout || currentExerciseIndex >= currentWorkoutExercises.length - 1 || isRunning || isPaused; // Ei voi selata kun ajastin käy

        // Päivitä Pause/Resume -teksti
        if (isPaused) {
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
        } else {
            pauseBtn.textContent = "⏸ Tauko";
            pauseBtn.classList.remove('paused');
        }
         // console.log("Button states updated."); // Vähennä tarvittaessa
    }

     // --- Reset-funktio (KORJATTU VERSIO) ---
     function resetWorkoutState() {
        console.log("Resetting workout state..."); // Loki alusta
        stopTimerInterval(); // Pysäytä mahdollinen ajastin
        currentWorkoutExercises = []; // Tyhjennä lista
        currentExerciseIndex = 0;
        remainingTime = 0;
        timerState = TimerState.IDLE;

        // Nollaa UI-elementit
        exerciseNameH2.textContent = "Valitse treeni";
        exerciseDescriptionP.textContent = "";
        exerciseImageImg.style.display = 'none';
        exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse ensin treeni yläpuolelta.</li>';
        updateTimerDisplay(0, "Odottamassa...");
        highlightCurrentExercise(); // Varmista ettei mikään jää korostetuksi
        updateButtonStates(); // Deaktivoi napit
        console.log("Workout state reset complete."); // Loki lopusta
    }

    // --- Highlight-funktio (KORJATTU VERSIO) ---
    function highlightCurrentExercise() {
        const items = exerciseListUl.querySelectorAll('li.exercise-item'); // Varmista että kohdistuu oikeisiin li-elementteihin
        items.forEach((item) => {
             // Varmista että data-index on olemassa ja muunna se numeroksi vertailua varten
            const itemIndex = parseInt(item.dataset.index, 10);
            // Tarkista myös että treeni on valittu (currentWorkoutExercises.length > 0)
            if (item.dataset.index !== undefined && currentWorkoutExercises.length > 0 && itemIndex === currentExerciseIndex) {
                item.classList.add('active');
                // Vieritä aktiivinen item näkyviin tarvittaessa
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
         // Jos treeniä ei ole valittu, varmista ettei mikään ole aktiivinen
         if (currentWorkoutExercises.length === 0) {
              const allItems = exerciseListUl.querySelectorAll('li'); // Kohdista kaikkiin li-elementteihin
              allItems.forEach(item => item.classList.remove('active'));
         }
    }

    function toggleTrainingSelectionVisibility() {
         trainingSelectSection.classList.toggle('hidden');
         if (trainingSelectSection.classList.contains('hidden')) {
            toggleTrainingSelectBtn.textContent = "Valitse treeni ⯆";
         } else {
            toggleTrainingSelectBtn.textContent = "Piilota valikko ⯅";
         }
    }

    // --- Event Listeners ---
    trainingDropdown.addEventListener('change', handleTrainingSelect);
    startBtn.addEventListener('click', startWorkout);
    pauseBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopWorkout);
    prevBtn.addEventListener('click', prevExercise);
    nextBtn.addEventListener('click', nextExercise);
    toggleTrainingSelectBtn.addEventListener('click', toggleTrainingSelectionVisibility);

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
