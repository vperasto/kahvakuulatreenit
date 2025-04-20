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
        try {
            const response = await fetch('data/exercises.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allExercisesData = await response.json();
            console.log("Exercise data loaded:", allExercisesData); // Debug
            populateTrainingDropdown();
            resetWorkoutState(); // Aseta alkutila
        } catch (error) {
            console.error("Could not load exercise data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa dataa.";
        }
    }

    function populateTrainingDropdown() {
        if (!allExercisesData) return;

        trainingDropdown.innerHTML = '<option value="">-- Valitse treeni --</option>'; // Tyhjennä ja lisää oletus

        // Lisää viikkotreenit
        if (allExercisesData.weeklyWorkouts) {
            const groupWeek = document.createElement('optgroup');
            groupWeek.label = "Viikkotreenit";
            allExercisesData.weeklyWorkouts.forEach(workout => {
                const option = document.createElement('option');
                option.value = `week_${workout.week}`; // Uniikki arvo
                option.textContent = workout.week;
                groupWeek.appendChild(option);
            });
            trainingDropdown.appendChild(groupWeek);
        }

        // Lisää pikatreenit
        if (allExercisesData.presetWorkouts) {
            const groupPreset = document.createElement('optgroup');
            groupPreset.label = "Pikatreenit";
            allExercisesData.presetWorkouts.forEach(workout => {
                const option = document.createElement('option');
                option.value = `preset_${workout.name}`; // Uniikki arvo
                option.textContent = workout.name;
                groupPreset.appendChild(option);
            });
            trainingDropdown.appendChild(groupPreset);
        }
    }

    // --- Treenin käsittely ---
    function handleTrainingSelect() {
        const selectedValue = trainingDropdown.value;
        if (!selectedValue || !allExercisesData) {
            resetWorkoutState();
            return;
        }

        let selectedWorkout = null;
        if (selectedValue.startsWith('week_')) {
            const weekName = selectedValue.replace('week_', '');
            selectedWorkout = allExercisesData.weeklyWorkouts.find(w => w.week === weekName);
        } else if (selectedValue.startsWith('preset_')) {
            const presetName = selectedValue.replace('preset_', '');
            selectedWorkout = allExercisesData.presetWorkouts.find(w => w.name === presetName);
        }

        if (selectedWorkout && selectedWorkout.exercises && allExercisesData.exercises) {
            // Muodosta harjoituslista objektien pohjalta
            currentWorkoutExercises = selectedWorkout.exercises
                .map(exerciseName => allExercisesData.exercises.find(ex => ex.name === exerciseName))
                .filter(ex => ex !== undefined); // Suodata pois jos harjoitusta ei löytynyt

            if (currentWorkoutExercises.length > 0) {
                resetWorkoutState(); // Nollaa tila ennen uuden treenin aloitusta
                currentExerciseIndex = 0;
                populateExerciseList();
                displayExercise(currentExerciseIndex);
                updateButtonStates(); // Aktivoi napit
            } else {
                console.error("Selected workout has no valid exercises.");
                resetWorkoutState();
                exerciseNameH2.textContent = "Valitussa treenissä ei harjoituksia.";
            }
        } else {
            console.error("Could not find selected workout or base exercises.");
            resetWorkoutState();
        }
         // Piilota valikko valinnan jälkeen (valinnainen)
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
             // Voit päättää haluatko että start-nappi käynnistää tämän harjoituksen
             // vai pitääkö käyttäjän painaa starttia uudelleen
        }
    }

    function highlightCurrentExercise() {
        const items = exerciseListUl.querySelectorAll('li');
        items.forEach((item, index) => {
            if (index === currentExerciseIndex) {
                item.classList.add('active');
                // Vieritä aktiivinen item näkyviin tarvittaessa
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    // --- Harjoituksen näyttö ---
    function displayExercise(index) {
        if (index < 0 || index >= currentWorkoutExercises.length) {
            console.log("Invalid exercise index for display:", index);
            return; // Älä tee mitään jos indeksi on virheellinen
        }

        const exercise = currentWorkoutExercises[index];
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

        // Aseta oletuksena työaika näytölle, vaikka ajastin ei olisi käynnissä
        remainingTime = exercise.duration;
        updateTimerDisplay(remainingTime, "Työaika");

        highlightCurrentExercise();
    }

    // --- Ajastimen toiminnot ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
            return; // Älä tee mitään jos ei treeniä valittu tai ajastin jo käy
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
            pauseBtn.classList.add('paused'); // Lisää CSS-luokka
        } else if (timerState === TimerState.PAUSED) {
            // Selvitä mistä jatketaan (työ vai lepo) perustuen remainingTimeen
            // ja nykyiseen harjoitukseen. Oletetaan että jatketaan siitä mihin jäätiin.
            // Etsi viimeisin tila ennen pausetusta (tämä vaatisi lisämuuttujan)
            // Yksinkertaistus: oletetaan että jatketaan työajasta tai lepoajasta
             const currentExercise = currentWorkoutExercises[currentExerciseIndex];
             // Tämä logiikka ei ole täydellinen ilman tietoa, oliko tauko työ- vai lepoajassa.
             // Oletetaan nyt että jatketaan aina työajasta jos se on kesken, muuten lepoajasta.
             // Parempi olisi tallentaa tila pausea painettaessa.
             // Käynnistetään nyt vain ajastin uudelleen.
             runTimerInterval(); // Käynnistää intervalin uudelleen nykyisellä remainingTimella
             // Pitää päätellä oikea state uudelleen (esim. tarkistamalla onko remainingTime > 0)
             // Tämä vaatii refaktorointia tarkempaan tilanhallintaan pausettaessa.
             // Yksinkertaistetaan nyt:
             if (timerLabelP.textContent.includes("Työaika")) {
                 timerState = TimerState.RUNNING_EXERCISE;
             } else if (timerLabelP.textContent.includes("Lepo")) {
                 timerState = TimerState.RUNNING_REST;
             } else {
                 // Jos tultiin jostain muusta tilasta, aloitetaan työaika
                  startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].duration);
                  return; // Poistu tästä funktiosta
             }

            console.log("Timer Resumed");
            pauseBtn.textContent = "⏸ Tauko";
            pauseBtn.classList.remove('paused'); // Poista CSS-luokka
        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer();
        resetWorkoutState();
        console.log("Workout Stopped");
    }

    function stopTimer() {
        stopTimerInterval();
        timerState = TimerState.IDLE;
    }

    function stopTimerInterval() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); // Varmista että vanha interval on pois päältä
        timerState = phaseState;
        remainingTime = duration;
        const label = (phaseState === TimerState.RUNNING_EXERCISE) ? "Työaika" : "Lepo";
        updateTimerDisplay(remainingTime, label);
        updateButtonStates();

        if (remainingTime > 0) {
            runTimerInterval();
        } else {
            // Jos kesto on 0, siirry heti seuraavaan vaiheeseen
            handleTimerEnd();
        }
    }

    function runTimerInterval() {
        if (timerInterval) return; // Älä käynnistä useita intervalleja

        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Älä tee mitään jos pausella

            remainingTime--;
            const label = (timerState === TimerState.RUNNING_EXERCISE) ? "Työaika" : "Lepo";
            updateTimerDisplay(remainingTime, label);

            if (remainingTime <= 0) {
                handleTimerEnd();
            }
        }, 1000);
    }

    function handleTimerEnd() {
         stopTimerInterval();
         const currentExercise = currentWorkoutExercises[currentExerciseIndex];
         const isLastExercise = currentExerciseIndex >= currentWorkoutExercises.length - 1;

         if (timerState === TimerState.RUNNING_EXERCISE) {
            // Työaika päättyi
            if (!isLastExercise && currentExercise.rest > 0) {
                // Siirry lepoaikaan
                console.log("Starting rest period");
                startTimerForPhase(TimerState.RUNNING_REST, currentExercise.rest);
            } else {
                // Ei lepoaikaa tai viimeinen harjoitus, siirry seuraavaan harjoitukseen (tai lopeta)
                moveToNextPhase();
            }
        } else if (timerState === TimerState.RUNNING_REST) {
            // Lepoaika päättyi, siirry seuraavaan harjoitukseen
            moveToNextPhase();
        }
    }

     function moveToNextPhase() {
        currentExerciseIndex++;
        if (currentExerciseIndex < currentWorkoutExercises.length) {
            // Siirry seuraavaan harjoitukseen
            console.log("Moving to next exercise:", currentExerciseIndex);
            displayExercise(currentExerciseIndex);
            startTimerForPhase(TimerState.RUNNING_EXERCISE, currentWorkoutExercises[currentExerciseIndex].duration);
        } else {
            // Treeni valmis
            console.log("Workout Finished");
            timerState = TimerState.FINISHED;
            exerciseNameH2.textContent = "Treeni Valmis!";
            exerciseDescriptionP.textContent = "Hyvää työtä!";
            exerciseImageImg.style.display = 'none';
            updateTimerDisplay(0, "Valmis");
             // Voitaisiin näyttää jokin yhteenveto tms.
             updateButtonStates();
             // Nollaa indeksi, jotta "Aloita treeni" toimii uudelleen
             currentExerciseIndex = 0;
             // Aseta tila takaisin IDLE, jotta voi aloittaa uudelleen
             // tai jätä FINISHED ja vaadi Stop-painikkeen painallus ennen uutta aloitusta.
             // Jätetään IDLEksi nyt.
             timerState = TimerState.IDLE;
             updateButtonStates(); // Päivitä napit IDLE-tilaan
             highlightCurrentExercise(); // Poista korostus
        }
    }


    function updateTimerDisplay(timeInSeconds, label) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        timerLabelP.textContent = label;
    }

    // --- Navigointipainikkeet ---
    function prevExercise() {
        if (currentExerciseIndex > 0) {
            stopTimer(); // Pysäytä ajastin
            currentExerciseIndex--;
             timerState = TimerState.IDLE; // Nollaa tila IDLEksi
            displayExercise(currentExerciseIndex);
            updateButtonStates();
        }
    }

    function nextExercise() {
        if (currentExerciseIndex < currentWorkoutExercises.length - 1) {
            stopTimer(); // Pysäytä ajastin
            currentExerciseIndex++;
             timerState = TimerState.IDLE; // Nollaa tila IDLEksi
            displayExercise(currentExerciseIndex);
            updateButtonStates();
        } else {
            // Jos ollaan viimeisessä, voitaisiin hypätä Valmis-tilaan tai olla tekemättä mitään
             if (timerState !== TimerState.FINISHED) {
                 stopTimer();
                 timerState = TimerState.FINISHED;
                 exerciseNameH2.textContent = "Treeni Valmis!";
                 updateTimerDisplay(0, "Valmis");
                  updateButtonStates();
                 currentExerciseIndex = 0; // Nollaa valmiiksi uutta aloitusta varten
                 timerState = TimerState.IDLE; // Takaisin IDLE tilaan
                 updateButtonStates();
                 highlightCurrentExercise();
             }
        }
    }

    // --- UI-päivitykset ---
    function updateButtonStates() {
        const hasWorkout = currentWorkoutExercises.length > 0;
        const isIdle = timerState === TimerState.IDLE;
        const isRunning = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST;
        const isPaused = timerState === TimerState.PAUSED;
        const isFinished = timerState === TimerState.FINISHED; // Tätä tilaa ei juuri nyt käytetä nappien hallintaan

        startBtn.disabled = !hasWorkout || !isIdle;
        pauseBtn.disabled = !isRunning && !isPaused;
        stopBtn.disabled = isIdle && !hasWorkout; // Aktiivinen jos treeni valittu tai käynnissä/pausella
        prevBtn.disabled = !hasWorkout || currentExerciseIndex <= 0;
        nextBtn.disabled = !hasWorkout || currentExerciseIndex >= currentWorkoutExercises.length - 1;

        // Päivitä Pause/Resume -teksti
        if (isPaused) {
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
        } else {
            pauseBtn.textContent = "⏸ Tauko";
            pauseBtn.classList.remove('paused');
        }
    }

     function resetWorkoutState() {
        stopTimerInterval(); // Pysäytä mahdollinen ajastin
        currentWorkoutExercises = [];
        currentExerciseIndex = 0;
        remainingTime = 0;
        timerState = TimerState.IDLE;

        exerciseNameH2.textContent = "Valitse treeni";
        exerciseDescriptionP.textContent = "";
        exerciseImageImg.style.display = 'none';
        exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse ensin treeni yläpuolelta.</li>';
        updateTimerDisplay(0, "Odottamassa...");
        updateButtonStates(); // Deaktivoi napit
    }


    function toggleTrainingSelectionVisibility() {
         trainingSelectSection.classList.toggle('hidden');
         // Päivitä napin teksti/ikoni (valinnainen)
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

});
