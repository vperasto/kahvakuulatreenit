// app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementit ---
    const trainingSelectSection = document.getElementById('training-select');
    const toggleTrainingSelectBtn = document.getElementById('toggle-training-select');
    // UUSI: Container viikkonapeille
    const weekButtonsContainer = document.getElementById('week-buttons-container'); // <<< LISÄÄ TÄMÄ HTML:ÄÄN
    // PIDETÄÄN: Pudotusvalikko pikatreenien varalle (tai voidaan poistaa/muuttaa myöh.)
    const trainingDropdown = document.getElementById('training-dropdown');
    const exerciseListUl = document.getElementById('exercise-items');
    const exerciseNameH2 = document.getElementById('exercise-name');
    const exerciseImageImg = document.getElementById('exercise-image');
    const exerciseDescriptionP = document.getElementById('exercise-description');
    // UUSI: Elementti treenin muistiinpanoille
    const workoutNotesP = document.getElementById('workout-notes'); // <<< LISÄÄ TÄMÄ HTML:ÄÄN
    const timeRemainingSpan = document.getElementById('time-remaining');
    const timerLabelP = document.getElementById('timer-label');
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const stopBtn = document.getElementById('stop-btn');
    // UUDET: Input-kentät oletusajoille
    const defaultDurationInput = document.getElementById('default-duration'); // <<< LISÄÄ TÄMÄ HTML:ÄÄN
    const defaultRestInput = document.getElementById('default-rest');       // <<< LISÄÄ TÄMÄ HTML:ÄÄN


    // --- Sovelluksen tila ---
    let allExercisesData = null;
    let currentWorkoutExercises = [];
    let currentWorkoutNotes = ''; // Lisätty tallentamaan valitun treenin muistiinpanot
    let currentExerciseIndex = 0;
    let timerInterval = null;
    let remainingTime = 0;
    const TimerState = {
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
            allExercisesData = await response.json();
            console.log("Exercise data loaded and parsed successfully.");

            if (!allExercisesData || !allExercisesData.exercises || !allExercisesData.weeklyWorkouts || !allExercisesData.presetWorkouts) {
                console.error("Loaded data is missing expected sections.");
                throw new Error("Loaded data structure is incorrect.");
            }

            populateTrainingSelectors(); // Yksi funktio molemmille
            resetWorkoutState();

        } catch (error) {
            console.error("Could not load or process exercise data:", error);
            exerciseNameH2.textContent = "Virhe ladattaessa treenidataa.";
             resetWorkoutState(); // Resetoi UI virhetilanteessa
        }
    }

    // --- UUSI: Populates both week buttons and preset dropdown ---
    function populateTrainingSelectors() {
        console.log("Populating training selectors...");
        if (!allExercisesData || !allExercisesData.weeklyWorkouts || !allExercisesData.presetWorkouts || !allExercisesData.exercises) {
            console.error("Cannot populate selectors, data is missing.");
            return;
        }

        // 1. Populate Week Buttons
        weekButtonsContainer.innerHTML = ''; // Clear previous buttons
        if (allExercisesData.weeklyWorkouts && Array.isArray(allExercisesData.weeklyWorkouts)) {
            allExercisesData.weeklyWorkouts.forEach((workout) => {
                if (workout && workout.week && workout.exercises) {
                    const button = document.createElement('button');
                    button.textContent = workout.week; // Display week number and theme
                    button.classList.add('week-button'); // Add class for styling
                    // Use the 'week' field directly as the identifier
                    button.dataset.workoutId = `week_${workout.week}`;
                    button.addEventListener('click', () => handleTrainingSelect(button.dataset.workoutId));
                    weekButtonsContainer.appendChild(button);
                } else {
                    console.warn(`Skipping invalid weekly workout:`, workout);
                }
            });
        } else {
            console.warn("weeklyWorkouts data is missing or not an array.");
            weekButtonsContainer.innerHTML = '<p>Viikkotreenejä ei löytynyt.</p>';
        }

        // 2. Populate Preset Workouts Dropdown (kept for now)
        trainingDropdown.innerHTML = '<option value="">-- Valitse Pikatreeni --</option>'; // Reset dropdown
        trainingDropdown.disabled = true; // Disable initially
        if (allExercisesData.presetWorkouts && Array.isArray(allExercisesData.presetWorkouts)) {
             let addedPresets = 0;
             allExercisesData.presetWorkouts.forEach((workout) => {
                 if (workout && workout.name && workout.exercises) {
                     const option = document.createElement('option');
                     // Use preset name as identifier
                     option.value = `preset_${workout.name}`;
                     option.textContent = workout.name;
                     trainingDropdown.appendChild(option);
                     addedPresets++;
                 } else {
                     console.warn(`Skipping invalid preset workout:`, workout);
                 }
             });
              if (addedPresets > 0) {
                trainingDropdown.disabled = false; // Enable if presets exist
                trainingDropdown.addEventListener('change', (e) => handleTrainingSelect(e.target.value));
              } else {
                 trainingDropdown.innerHTML = '<option value="">Pikatreenejä ei löytynyt</option>';
              }
        } else {
             console.warn("presetWorkouts data is missing or not an array.");
             trainingDropdown.innerHTML = '<option value="">Pikatreenejä ei löytynyt</option>';
        }
    }


    // --- MUOKATTU: Käsittelee sekä nappien että dropdownin valinnat ---
    function handleTrainingSelect(selectedValue) {
        console.log("Dropdown/Button changed, resetting state first.");
        resetWorkoutState();

         // Reset dropdown if a week button was clicked, and vice versa visually
         if (selectedValue && selectedValue.startsWith('week_')) {
             trainingDropdown.value = ""; // Reset dropdown selection
             // Highlight the clicked button (optional)
             document.querySelectorAll('.week-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.workoutId === selectedValue);
             });
         } else if (selectedValue && selectedValue.startsWith('preset_')) {
              document.querySelectorAll('.week-button').forEach(btn => {
                 btn.classList.remove('active'); // Remove highlight from week buttons
             });
         } else {
             // If selection is cleared ("-- Valitse --")
             document.querySelectorAll('.week-button').forEach(btn => {
                 btn.classList.remove('active');
             });
         }


        if (!selectedValue || !allExercisesData) {
            console.log("Selection cleared or data missing, state reset.");
            return;
        }

        console.log(`Handling selection: ${selectedValue}`);

        let selectedWorkout = null;
        currentWorkoutNotes = ''; // Reset notes for the new selection

        if (selectedValue.startsWith('week_')) {
            const weekName = selectedValue.replace('week_', '');
            selectedWorkout = allExercisesData.weeklyWorkouts.find(w => w.week === weekName);
            if (selectedWorkout) {
                currentWorkoutNotes = selectedWorkout.notes || ''; // Get notes
            }
        } else if (selectedValue.startsWith('preset_')) {
            const presetName = selectedValue.replace('preset_', '');
            selectedWorkout = allExercisesData.presetWorkouts.find(w => w.name === presetName);
             if (selectedWorkout) {
                // Preset workouts might also have notes in the future
                 currentWorkoutNotes = selectedWorkout.notes || '';
            }
        }

        // Display notes IMMEDIATELY after finding the workout
        workoutNotesP.textContent = currentWorkoutNotes;

        if (selectedWorkout && selectedWorkout.exercises && allExercisesData.exercises) {
            console.log("Selected workout found:", selectedWorkout.name || selectedWorkout.week);

            const exerciseNames = selectedWorkout.exercises;
            const mappedExercises = exerciseNames
                .map(exerciseName => {
                    const foundEx = allExercisesData.exercises.find(ex => ex.name === exerciseName);
                    if (!foundEx) {
                        console.warn(`Exercise named "${exerciseName}" not found in main exercise list.`);
                    }
                    return foundEx;
                })
                .filter(ex => ex !== undefined);

            console.log("Mapped exercises for workout:", mappedExercises);

            if (mappedExercises.length > 0) {
                currentWorkoutExercises = mappedExercises;
                currentExerciseIndex = 0;
                console.log(`Populating list and displaying exercise index ${currentExerciseIndex} (Total: ${currentWorkoutExercises.length})`);
                populateExerciseList();
                displayExercise(currentExerciseIndex);
                updateButtonStates();
            } else {
                console.error(`Selected workout "${selectedWorkout.name || selectedWorkout.week}" has no valid/found exercises.`);
                exerciseNameH2.textContent = "Treenin harjoituksia ei löytynyt.";
            }
        } else {
            console.error("Could not find selected workout definition in JSON or base 'exercises' list is missing.");
            exerciseNameH2.textContent = "Treenin määrittelyä ei löytynyt.";
        }
    }

    function populateExerciseList() {
        exerciseListUl.innerHTML = '';
        if (currentWorkoutExercises.length === 0) {
             exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>'; // Clearer message
             return;
        }

        currentWorkoutExercises.forEach((exercise, index) => {
            const li = document.createElement('li');
            // Add index number for clarity
            li.textContent = `${index + 1}. ${exercise.name}`;
            li.dataset.index = index;
            li.classList.add('exercise-item');
            li.addEventListener('click', () => {
                // Allow jumping only if timer is not running/paused
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
            stopTimer();
            currentExerciseIndex = index;
            timerState = TimerState.IDLE;
            displayExercise(currentExerciseIndex);
            updateButtonStates();
             clearNextUpHighlight(); // Clear highlight when jumping manually
        }
    }

    function displayExercise(index) {
         console.log(`Attempting to display exercise at index: ${index}. Current list length: ${currentWorkoutExercises.length}`);
        // Remove "next-up" highlight from the item *about* to be displayed
         clearNextUpHighlight();

        if (index < 0 || index >= currentWorkoutExercises.length || !currentWorkoutExercises[index]) {
            console.error(`Invalid exercise index or exercise data! Index: ${index}, Workout Length: ${currentWorkoutExercises.length}`);
            exerciseNameH2.textContent = "Virhe harjoituksen näyttämisessä";
            exerciseDescriptionP.textContent = `Harjoitusta ei löytynyt indeksillä ${index}. Valitse treeni uudelleen.`;
            exerciseImageImg.style.display = 'none';
            updateButtonStates();
            return;
        }

        const exercise = currentWorkoutExercises[index];
        console.log(`Displaying: ${exercise.name}`);
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

        if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
             // Use default duration if provided, otherwise use exercise duration
             const durationToUse = getDefaultTime('duration') ?? exercise.duration;
             remainingTime = durationToUse;
             updateTimerDisplay(remainingTime, "Työaika");
        }

        highlightCurrentExercise();
        // Buttons are updated by the calling function (handleTrainingSelect, jumpTo, next/prev, start)
    }

    // --- UUSI: Helper function to get default time ---
    function getDefaultTime(type) { // type = 'duration' or 'rest'
        const inputElement = (type === 'duration') ? defaultDurationInput : defaultRestInput;
        if (!inputElement) return null; // Input element not found in HTML

        const value = parseInt(inputElement.value, 10);
        if (!isNaN(value) && value > 0) {
            console.log(`Using default ${type}: ${value}s`);
            return value;
        }
        return null; // Return null if no valid value is entered
    }

    // --- Ajastimen toiminnot (MUOKATTU käyttämään oletusaikoja) ---
    function startWorkout() {
        if (currentWorkoutExercises.length === 0 || timerState !== TimerState.IDLE) {
            console.log("Cannot start workout: No workout selected or timer already active.");
            return;
        }
        console.log("Starting workout");
        currentExerciseIndex = 0; // Start from the beginning
        displayExercise(currentExerciseIndex);
        const firstExercise = currentWorkoutExercises[currentExerciseIndex];
        // Use default duration if set, otherwise exercise's duration
        const durationToUse = getDefaultTime('duration') ?? firstExercise.duration;
        startTimerForPhase(TimerState.RUNNING_EXERCISE, durationToUse);
    }

    function pauseResumeTimer() {
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST) {
            stopTimerInterval();
            timerState = TimerState.PAUSED;
            console.log("Timer Paused");
            pauseBtn.textContent = "▶ Jatka";
            pauseBtn.classList.add('paused');
            // Keep next-up highlight if paused during rest
        } else if (timerState === TimerState.PAUSED) {
             console.log("Timer Resumed");
             const wasResting = timerLabelP.textContent.includes("Lepo"); // Check if paused during rest
             if (timerLabelP.textContent.includes("Työaika")) {
                 timerState = TimerState.RUNNING_EXERCISE;
             } else if (wasResting) {
                 timerState = TimerState.RUNNING_REST;
             } else {
                 console.warn("Timer state unclear on resume, restarting current exercise phase.");
                  const currentExercise = currentWorkoutExercises[currentExerciseIndex];
                  if(currentExercise){
                       const durationToUse = getDefaultTime('duration') ?? currentExercise.duration;
                       startTimerForPhase(TimerState.RUNNING_EXERCISE, durationToUse);
                  } else {
                      resetWorkoutState(); // Safety reset
                  }
                 return;
             }
             runTimerInterval();
             pauseBtn.textContent = "⏸ Tauko";
             pauseBtn.classList.remove('paused');
              // Re-apply next-up highlight if resuming during rest
              if (wasResting) {
                  highlightNextExercise();
              }
        }
        updateButtonStates();
    }

    function stopWorkout() {
        stopTimer(); // Stops interval, sets state to IDLE
        console.log("Workout Stopped by user.");
         clearNextUpHighlight(); // Clear highlight
        if (currentWorkoutExercises.length > 0) {
            // Reset timer display to the duration of the current exercise
            const currentExercise = currentWorkoutExercises[currentExerciseIndex];
             if(currentExercise){
                 const durationToUse = getDefaultTime('duration') ?? currentExercise.duration;
                 updateTimerDisplay(durationToUse, "Työaika");
             } else {
                 updateTimerDisplay(0,"Odottamassa...");
             }
            displayExercise(currentExerciseIndex); // Show current exercise again
        } else {
             resetWorkoutState(); // If no workout loaded, fully reset
        }
         updateButtonStates(); // Update buttons to IDLE state
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

     function startTimerForPhase(phaseState, duration) {
        stopTimerInterval();
        timerState = phaseState;
        remainingTime = duration;
        const label = (phaseState === TimerState.RUNNING_EXERCISE) ? "Työaika" : "Lepo";
        console.log(`Starting phase: ${phaseState}, Duration: ${duration}, Label: ${label}`);
        updateTimerDisplay(remainingTime, label);
        updateButtonStates(); // Update buttons for the new state

        // Highlight next exercise if starting a rest phase
        if (phaseState === TimerState.RUNNING_REST) {
            highlightNextExercise();
        } else {
            clearNextUpHighlight(); // Clear highlight when starting work phase
        }


        if (remainingTime > 0) {
            runTimerInterval();
        } else {
            console.log("Phase duration is 0 or less, handling timer end immediately.");
            handleTimerEnd(); // Directly handle end if duration is 0
        }
    }

    function runTimerInterval() {
        if (timerInterval) {
            console.warn("runTimerInterval called but interval already exists.");
            return; // Avoid multiple intervals
        }
        console.log("Starting timer interval (1000ms)");
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return;

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
         stopTimerInterval();
         if (!currentWorkoutExercises[currentExerciseIndex]) {
             console.error("Cannot handle timer end: current exercise is undefined.");
             resetWorkoutState();
             return;
         }

         const currentExercise = currentWorkoutExercises[currentExerciseIndex];
         const isLastExercise = currentExerciseIndex >= currentWorkoutExercises.length - 1;

         if (timerState === TimerState.RUNNING_EXERCISE) {
            console.log(`Exercise phase ended: ${currentExercise.name}`);
             // Use default rest if set, otherwise exercise's rest
             const restDurationToUse = getDefaultTime('rest') ?? currentExercise.rest;

            if (!isLastExercise && restDurationToUse > 0) {
                console.log(`Starting rest period (${restDurationToUse}s)`);
                startTimerForPhase(TimerState.RUNNING_REST, restDurationToUse);
            } else {
                 if(isLastExercise){
                     console.log("Last exercise finished.");
                 } else {
                    console.log("No rest period defined (or 0), moving to next exercise.");
                 }
                moveToNextPhase(); // Move immediately if no rest or last exercise
            }
        } else if (timerState === TimerState.RUNNING_REST) {
            console.log("Rest phase ended.");
            clearNextUpHighlight(); // Clear highlight as rest ends
            moveToNextPhase();
        } else {
             console.warn(`handleTimerEnd called from unexpected state: ${timerState}`);
             moveToNextPhase(); // Attempt to recover
        }
    }

     function moveToNextPhase() {
        currentExerciseIndex++;
        if (currentExerciseIndex < currentWorkoutExercises.length) {
            console.log(`Moving to next exercise index: ${currentExerciseIndex}`);
            const nextExercise = currentWorkoutExercises[currentExerciseIndex];
            const durationToUse = getDefaultTime('duration') ?? nextExercise.duration;
            displayExercise(currentExerciseIndex); // Display before starting timer
            startTimerForPhase(TimerState.RUNNING_EXERCISE, durationToUse);
        } else {
            console.log("Workout Finished");
            timerState = TimerState.FINISHED; // Indicate finished state
            exerciseNameH2.textContent = "Treeni Valmis!";
            exerciseDescriptionP.textContent = "Hyvää työtä!";
            exerciseImageImg.style.display = 'none';
             workoutNotesP.textContent = "Valitse uusi treeni tai aloita tämä alusta."; // Update notes area
            updateTimerDisplay(0, "Valmis");
            updateButtonStates();
            highlightCurrentExercise(); // De-highlight last item

            // Option: Reset to IDLE automatically after a short delay?
            // setTimeout(() => {
            //     timerState = TimerState.IDLE;
            //     currentExerciseIndex = 0; // Ready to restart
            //     updateButtonStates();
            //     // Optionally display first exercise again
            //      if(currentWorkoutExercises.length > 0) displayExercise(0);
            // }, 3000);
        }
    }


    function updateTimerDisplay(timeInSeconds, label) {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;
        timerLabelP.textContent = label;
    }

    // --- Navigointipainikkeet (MUOKATTU: Toimivat vain IDLE/FINISHED tilassa) ---
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
            // Optional: Maybe jump to FINISHED state if next is pressed on last item?
            console.log("Already at the last exercise.");
        }
    }

    // --- UI-päivitykset ---
    function updateButtonStates() {
        const hasWorkout = currentWorkoutExercises.length > 0;
        const isIdle = timerState === TimerState.IDLE;
        const isRunning = timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST;
        const isPaused = timerState === TimerState.PAUSED;
        const isFinished = timerState === TimerState.FINISHED;

        // Allow starting only if workout selected and timer is idle
        startBtn.disabled = !hasWorkout || !isIdle;
        // Allow pause/resume only if timer is running or paused
        pauseBtn.disabled = !isRunning && !isPaused;
        // Allow stopping if timer is running or paused
        stopBtn.disabled = !isRunning && !isPaused;
         // Allow navigation only if workout selected AND timer is idle or finished
        const canNavigate = hasWorkout && (isIdle || isFinished);
        prevBtn.disabled = !canNavigate || currentExerciseIndex <= 0;
        nextBtn.disabled = !canNavigate || currentExerciseIndex >= currentWorkoutExercises.length - 1;


        // Update Pause/Resume text and style
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
        stopTimerInterval();
        currentWorkoutExercises = [];
        currentWorkoutNotes = ''; // Clear notes
        currentExerciseIndex = 0;
        remainingTime = 0;
        timerState = TimerState.IDLE;

        // Nollaa UI
        exerciseNameH2.textContent = "Valitse treeni";
        exerciseDescriptionP.textContent = "";
        workoutNotesP.textContent = ""; // Clear notes display
        exerciseImageImg.style.display = 'none';
        exerciseImageImg.src = '';
        exerciseListUl.innerHTML = '<li>Valitse treeni ensin.</li>';
        updateTimerDisplay(0, "Odottamassa...");
        highlightCurrentExercise(); // De-highlight all
        clearNextUpHighlight(); // Clear next-up highlight
        updateButtonStates(); // Disable buttons appropriately

        // Reset dropdown and button highlights
        trainingDropdown.value = "";
        document.querySelectorAll('.week-button').forEach(btn => btn.classList.remove('active'));

        console.log("Workout state reset complete.");
    }

    // --- MUOKATTU Highlight-funktio ---
    function highlightCurrentExercise() {
        const items = exerciseListUl.querySelectorAll('li.exercise-item');
        items.forEach((item) => {
            const itemIndex = parseInt(item.dataset.index, 10);
            // Highlight only if workout is loaded and index matches
            if (currentWorkoutExercises.length > 0 && !isNaN(itemIndex) && itemIndex === currentExerciseIndex) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
        // Ensure nothing is active if no workout is loaded
         if (currentWorkoutExercises.length === 0) {
              const allItems = exerciseListUl.querySelectorAll('li');
              allItems.forEach(item => item.classList.remove('active'));
         }
    }

    // --- UUDET: Functions to handle next exercise highlight ---
    function highlightNextExercise() {
        clearNextUpHighlight(); // Clear previous one first
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex < currentWorkoutExercises.length) {
             const nextItem = exerciseListUl.querySelector(`li[data-index="${nextIndex}"]`);
             if (nextItem) {
                 nextItem.classList.add('next-up'); // Add class for CSS styling/animation
                 console.log(`Highlighting next exercise: ${nextItem.textContent}`);
             }
        }
    }

    function clearNextUpHighlight() {
        const highlightedItem = exerciseListUl.querySelector('li.next-up');
        if (highlightedItem) {
            highlightedItem.classList.remove('next-up');
             console.log("Cleared next-up highlight.");
        }
    }

    function toggleTrainingSelectionVisibility() {
         trainingSelectSection.classList.toggle('hidden');
         toggleTrainingSelectBtn.textContent = trainingSelectSection.classList.contains('hidden')
             ? "Valitse treeni ⯆"
             : "Piilota valikko ⯅";
    }

    // --- Event Listeners ---
    // Button listeners are added dynamically in populateTrainingSelectors
    // Dropdown listener added dynamically in populateTrainingSelectors if presets exist
    startBtn.addEventListener('click', startWorkout);
    pauseBtn.addEventListener('click', pauseResumeTimer);
    stopBtn.addEventListener('click', stopWorkout);
    prevBtn.addEventListener('click', prevExercise);
    nextBtn.addEventListener('click', nextExercise);
    toggleTrainingSelectBtn.addEventListener('click', toggleTrainingSelectionVisibility);
    // Optional: Listen for changes in default time inputs to provide feedback?
     // defaultDurationInput.addEventListener('change', () => console.log(`Default duration set to: ${defaultDurationInput.value}`));
     // defaultRestInput.addEventListener('change', () => console.log(`Default rest set to: ${defaultRestInput.value}`));


    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
