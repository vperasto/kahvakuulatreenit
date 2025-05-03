// app.js (Versio 7 - Syntax Error Korjausyritys)

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
    const roundInfoP = document.getElementById('round-info');
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
            startWarmupBtn.disabled = false;
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
            startCooldownBtn.disabled = false;
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
                e.currentTarget.blur(); // Poista fokus klikkauksen jälkeen
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
        resetAppState(false); // Resetoi tila, mutta säilytä valinnat
        currentRoutineSteps = []; // Tyhjennä vaiheet ennen uusien lataamista
        document.querySelectorAll('.routine-button, .week-button').forEach(btn => btn.classList.remove('active')); // Poista aktiivisuus vanhoilta
        const selectedBtn = document.querySelector(`.routine-button[data-routine="${routineType}"]`);
        if (selectedBtn) selectedBtn.classList.add('active'); // Aseta uusi aktiiviseksi

        if (routineType === 'warmup' && warmupData) {
            infoAreaTitleH2.textContent = `Lämmittely (${warmupData.durationMinutes} min)`;
            updateInfoAreaNotes(warmupData.description);
            currentRoutineSteps = warmupData.steps.map((step, index) => ({ ...step, index })); // Lisää index jokaiseen vaiheeseen
            populateStepsList(currentRoutineSteps);
            displayStep(0); // Näytä ensimmäinen vaihe
        } else if (routineType === 'cooldown' && cooldownData) {
            infoAreaTitleH2.textContent = `Jäähdyttely (${cooldownData.durationMinutes} min)`;
            updateInfoAreaNotes(cooldownData.description);
            currentRoutineSteps = cooldownData.steps.map((step, index) => ({ ...step, index })); // Lisää index jokaiseen vaiheeseen
            populateStepsList(currentRoutineSteps);
            displayStep(0); // Näytä ensimmäinen vaihe
        } else {
            // Jos jokin muu valittu (tai data puuttuu), näytä oletus
            updateInfoAreaNotes("Valitse toiminto yläpuolelta.");
            populateStepsList([]);
        }
        updateButtonStates(); // Päivitä nappien tila (esim. Start-nappi)
    } // selectRoutine loppuu

    function handleLevelSelect(selectedLevel) {
        if (selectedLevel === currentWorkoutInfo.level) return; // Älä tee mitään jos taso on sama
        console.log(`Level selected: ${selectedLevel}`);
        currentWorkoutInfo.level = selectedLevel;
        // Päivitä nappien ulkoasu
        levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === selectedLevel);
        });
        // Jos viikko on jo valittu, lataa sen tiedot uudelleen tällä tasolla
        if (currentWorkoutInfo.week !== null) {
            handleWeekSelect(currentWorkoutInfo.week);
        } else {
            // Jos viikkoa ei ole valittu, päivitä vain infoteksti
            updateInfoAreaNotes();
        }
    } // handleLevelSelect loppuu

    function handleWeekSelect(weekNumber) {
        console.log(`Handling workout selection for Week: ${weekNumber}`);
        activeRoutineType = 'workout';
        resetAppState(false); // Resetoi tila, mutta säilytä valinnat

        if (!fullProgramData || !fullProgramData.kettlebellProgram11Weeks || !fullProgramData.exercises) {
            console.error("Workout data missing."); resetAppState(); return;
        }

        // Etsi oikea vaihe (phase) viikkonumeron perusteella
        const phaseIdx = fullProgramData.kettlebellProgram11Weeks.phases.findIndex(p => p.phaseInfo?.weeks?.includes(weekNumber));
        if (phaseIdx === -1) {
            console.error(`Workout phase not found for week ${weekNumber}.`);
            resetAppState(); itemNameH2.textContent = `Vaihetta ei löytynyt viikolle ${weekNumber}.`; return;
        }
        const phase = fullProgramData.kettlebellProgram11Weeks.phases[phaseIdx];

        // Hae valitun tason (level) tiedot
        const level = currentWorkoutInfo.level;
        const levelData = phase.levels?.[level];
        if (!levelData?.timeBased) { // Tarkistetaan timeBased, koska sitä käytetään treenissä
            console.error(`Workout level data not found for phase ${phaseIdx + 1}, level ${level}.`);
            resetAppState(); itemNameH2.textContent = `Tason ${level} tietoja ei löytynyt viikolle ${weekNumber}.`; return;
        }

        // Hae työ- ja lepoajat
        const workTime = levelData.timeBased.workSeconds;
        const restTime = levelData.timeBased.restSeconds;

        // Hae harjoituslista tälle vaiheelle
        let exerciseListSource = [];
        // Vaihe 3 käyttää eri rakennetta (exampleWeeklyExercises)
        if (phaseIdx === 2 && phase.exampleWeeklyExercises) {
            exerciseListSource = phase.exampleWeeklyExercises;
        } else if (phase.weeklyExercises) {
            exerciseListSource = phase.weeklyExercises;
        } else {
            console.error(`No 'weeklyExercises' or 'exampleWeeklyExercises' found in phase ${phaseIdx + 1}.`);
            resetAppState(); itemNameH2.textContent = "Harjoituslistaa ei löytynyt."; return;
        }

        // Yhdistä harjoitustiedot exercises-listasta ja vaiheen tiedoista
        const mappedEx = exerciseListSource.map((pEx, index) => {
            if (!pEx?.exerciseId) return null;
            const fEx = fullProgramData.exercises.find(ex => ex.id === pEx.exerciseId);
            if (!fEx) {
                console.warn(`Exercise with ID ${pEx.exerciseId} not found in main exercises list.`);
                return null;
            }
            // Luo uusi objekti, jossa yhdistetty tietoja
            return {
                ...fEx, // Kaikki perustiedot (id, name, image, description...)
                displayTitle: pEx.displayTitle || fEx.name, // Käytä displayTitle jos annettu, muuten perusnimeä
                notes: pEx.notes || '', // Lisää muistiinpanot jos on
                workTime, // Lisää työaika
                restTime, // Lisää lepoaika
                index // Lisää alkuperäinen indeksi
            };
        }).filter(ex => ex !== null); // Poista null-arvot (jos exerciseId puuttui tai ei löytynyt)

        if (mappedEx.length === 0) {
            console.error(`No valid exercises mapped for workout (Week ${weekNumber}, Level ${level}).`);
            resetAppState(); itemNameH2.textContent = "Kelvollisia harjoituksia ei löytynyt."; return;
        }

        // Päivitä sovelluksen tila valitulla treenillä
        currentWorkoutExercises = mappedEx; // Tallenna treenin harjoitukset (ei välttämättä tarvita erikseen)
        currentRoutineSteps = mappedEx; // Aseta nämä aktiiviseksi rutiiniksi
        currentStepIndex = 0; // Aloita ensimmäisestä vaiheesta
        currentRound = 1; // Aloita ensimmäiseltä kierrokselta

        // Päivitä treenin tiedot
        currentWorkoutInfo = {
            ...currentWorkoutInfo, // Säilytä level
            week: weekNumber,
            phaseIndex: phaseIdx,
            rounds: parseInt(phase.workoutPlan?.rounds?.match(/\d+/)?.[0] || '1', 10) || 1, // Hae kierrosmäärä
            restBetweenRounds: parseInt(phase.workoutPlan?.restBetweenRoundsSeconds?.match(/\d+/)?.[0] || '0', 10) || 0, // Hae kierroslepo
            notes: phase.phaseInfo.focus || '', // Käytä fokusta muistiinpanoina (voi muuttaa)
            focus: phase.phaseInfo.focus || '' // Tallenna fokus erikseen
        };

        console.log(`Workout Week ${weekNumber} loaded: ${currentRoutineSteps.length} steps, ${currentWorkoutInfo.rounds} rounds.`);

        // Päivitä käyttöliittymä
        infoAreaTitleH2.textContent = `Viikko ${weekNumber} / Taso ${level}`;
        populateStepsList(currentRoutineSteps); // Täytä sivupalkin lista
        updateInfoAreaNotes(); // Päivitä infotekstit
        displayStep(currentStepIndex); // Näytä ensimmäinen harjoitus
        updateButtonStates(); // Päivitä napit (Start Workout näkyviin)
        highlightWeekButton(weekNumber); // Korosta valittu viikko
        updateRoundDisplay(); // Näytä kierrostiedot
    } // handleWeekSelect loppuu

    function updateInfoAreaNotes(customNote = null) {
        let noteText = "";
        if (customNote !== null) {
            // Jos annettu oma teksti (esim. lämmittely/jäähdyttely), käytä sitä
            noteText = customNote;
        } else if (activeRoutineType === 'workout' && currentWorkoutInfo.week !== null) {
            // Jos treeni valittu, rakenna infoteksti sen tiedoista
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
            // Oletusteksti
            noteText = "Valitse toiminto yläpuolelta.";
        }
        infoAreaNotesP.textContent = noteText.trim() || "Valitse toiminto yläpuolelta."; // Varmista ettei ole tyhjä
    } // updateInfoAreaNotes loppuu

    function highlightWeekButton(weekNumber) {
        document.querySelectorAll('.week-button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.weekNumber) === weekNumber);
        });
    } // highlightWeekButton loppuu

    function populateStepsList(steps) {
        stepsListUl.innerHTML = ''; // Tyhjennä vanha lista
        if (!steps || steps.length === 0) {
            stepsListUl.innerHTML = '<li>Valitse toiminto ensin.</li>';
            stepsListTitleH2.textContent = "Vaiheet";
            return;
        }

        // Päivitä otsikko rutiinityypin mukaan
        if (activeRoutineType === 'warmup') stepsListTitleH2.textContent = "Lämmittelyvaiheet";
        else if (activeRoutineType === 'cooldown') stepsListTitleH2.textContent = "Jäähdyttelyvaiheet";
        else if (activeRoutineType === 'workout') stepsListTitleH2.textContent = "Treeniharjoitukset";
        else stepsListTitleH2.textContent = "Vaiheet";

        // Luo listaelementit
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${step.displayTitle || step.name}`; // Näytä numero ja nimi
            li.dataset.index = index; // Tallenna indeksi
            li.classList.add('step-item');
            // Lisää klikkauskuuntelija vaiheeseen hyppäämistä varten (vain kun ajastin ei käy)
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
            stopTimer(); // Pysäytä ajastin jos oli käynnissä (ei pitäisi olla IDLE/FINISHED-tilassa)
            currentStepIndex = index;
            currentRound = 1; // Nollaa kierros aina hypätessä
            timerState = TimerState.IDLE; // Varmista IDLE-tila
            displayStep(currentStepIndex); // Näytä valittu vaihe
            updateButtonStates(); // Päivitä napit (navigointi)
            clearNextUpHighlight(); // Poista seuraavan korostus
            updateRoundDisplay(); // Päivitä/tyhjennä kierrosnäyttö
        }
    } // jumpToStep loppuu

    // Näyttää aktiivisen vaiheen tiedot (otsikko, kuvaus, kuva, ajastin)
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
        itemNameH2.textContent = step.displayTitle || step.name; // Aseta otsikko

        // TARKISTA RUTIINITYYPPI SISÄLLÖN NÄYTTÄMISEKSI
        if (activeRoutineType === 'workout') {
            // Treenin näyttö
            let descriptionText = step.description || '';
            if (step.notes) descriptionText += `\n\nHuom: ${step.notes}`;
            itemDescriptionP.textContent = descriptionText.trim();

            if (step.image) {
                itemImageImg.src = step.image; itemImageImg.alt = step.displayTitle || step.name;
                itemImageImg.style.display = 'block';
            } else {
                itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            }

            // Ajastin ja kierrokset näkyviin
            timerDiv.style.visibility = 'visible';
            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 remainingTime = step.workTime || 0; // Aseta työaika näkyviin
                 updateTimerDisplay(remainingTime);
                 updateRoundDisplay(); // Näytä kierrokset
            } else {
                 updateRoundDisplay(); // Varmista kierrosnäyttö
            }

        } else if (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown') {
            // Lämmittelyn / Jäähdyttelyn näyttö
            itemDescriptionP.textContent = step.description || "Suorita ohjeen mukaan."; // Käytä JSON-kuvausta
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = ''; // Piilota kuva
            timerDiv.style.visibility = 'hidden'; // Piilota ajastin
            roundInfoP.textContent = '';          // Tyhjennä kierrostieto

            if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
                 timeRemainingSpan.textContent = '--:--';
                 timerLabelP.textContent = ''; // Ei labelia
            } else if (timerState === TimerState.RUNNING_STEP){
                  timeRemainingSpan.textContent = '--:--';
                  timerLabelP.textContent = 'Suorita vaihe';
             }

        } else {
            // Oletustila (none)
            itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
            itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
            timerDiv.style.visibility = 'hidden'; roundInfoP.textContent = '';
            timeRemainingSpan.textContent = '00:00'; timerLabelP.textContent = 'Odottamassa...';
        }

        highlightCurrentStep(); // Korosta vaihe listassa
    } // displayStep loppuu

    // --- Info Area Collapse Toiminnot ---
    function initializeInfoArea() {
        // Aseta oletustila (piilotettu)
        infoContentWrapper.classList.add('collapsed');
        toggleInfoBtn.setAttribute('aria-expanded', 'false');
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = "Näytä";
        // Lisää kuuntelija napille
        toggleInfoBtn.addEventListener('click', toggleInfoArea);
    } // initializeInfoArea loppuu

    function toggleInfoArea() {
        const isCollapsed = infoContentWrapper.classList.toggle('collapsed');
        const isExpanded = !isCollapsed;
        toggleInfoBtn.setAttribute('aria-expanded', String(isExpanded));
        if (toggleInfoTextSpan) toggleInfoTextSpan.textContent = isExpanded ? "Piilota" : "Näytä";
        console.log(`Info area ${isExpanded ? 'expanded' : 'collapsed'}`);
    } // toggleInfoArea loppuu

    // --- Ajastimen ja Rutiinin Etenemisen toiminnot ---
    function startSelectedRoutine() {
        if (activeRoutineType === 'none' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) {
            console.warn("Start conditions not met. Type:", activeRoutineType, "Steps:", currentRoutineSteps.length, "State:", timerState);
            return;
        }
        // Skrollaa päänäkymä ylös
        if (mainLayout) {
             const targetOffsetTop = mainLayout.offsetTop;
             console.log(`Scrolling to main layout top: ${targetOffsetTop}px`);
             window.scrollTo({ top: targetOffsetTop, behavior: 'smooth' }); // Smooth scroll
        }

        if (activeRoutineType === 'workout') {
            // Yritä avata äänikonteksti ennen treenin aloitusta (jos ei jo auki)
            if (isAudioUnlocked) { proceedWithWorkoutStart(); return; }
            console.log("Attempting to unlock audio context...");
            beepSound.volume = 0.001; // Pieni äänenvoimakkuus testisoittoon
            beepSound.play().then(() => {
                beepSound.pause(); beepSound.currentTime = 0; beepSound.volume = 1.0; // Palauta normaali volyymi
                isAudioUnlocked = true; console.log("Audio context unlocked.");
                proceedWithWorkoutStart(); // Jatka treenin aloitukseen
            }).catch(error => {
                // Vaikka unlockaus epäonnistuisi (esim. selain estää), yritä silti aloittaa
                console.warn("Audio context unlock failed (maybe browser policy):", error);
                beepSound.volume = 1.0; isAudioUnlocked = true; // Merkitään yritetyksi
                proceedWithWorkoutStart();
            });
        } else {
            // Lämmittely/Jäähdyttely ei (ehkä) tarvitse ääntä, aloita suoraan
            proceedWithRoutineStart();
        }
    } // startSelectedRoutine loppuu

    function proceedWithWorkoutStart() {
        if (activeRoutineType !== 'workout' || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log("Starting WORKOUT...");
        currentStepIndex = 0; currentRound = 1;
        updateRoundDisplay(); // Päivitä kierrosnäyttö
        displayStep(currentStepIndex); // Näytä ensimmäinen vaihe

        // Piilota valinta-alue
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }

        timerDiv.style.visibility = 'visible'; // Treenissä ajastin näkyviin
        startTimerForPhase(TimerState.RUNNING_EXERCISE, currentRoutineSteps[currentStepIndex].workTime); // Aloita ajastin
    } // proceedWithWorkoutStart loppuu

    function proceedWithRoutineStart() {
        if ((activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') || currentRoutineSteps.length === 0 || timerState !== TimerState.IDLE) return;
        console.log(`Starting ${activeRoutineType.toUpperCase()}...`);
        currentStepIndex = 0; currentRound = 1; // Nollaa kierrokset vaikkei näytetäkään
        updateRoundDisplay(); // Tyhjentää kierrosinfon
        displayStep(currentStepIndex); // Näytä ensimmäinen vaihe

        // Piilota valinta-alue
        selectionArea.classList.add('hidden');
        toggleSelectionAreaBtn.classList.remove('open');
        const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        if (toggleTextElem) { toggleTextElem.textContent = "Valinnat"; }

        timerState = TimerState.RUNNING_STEP; // Aseta tila
        timerDiv.style.visibility = 'hidden'; // Piilota ajastin
        timeRemainingSpan.textContent = '--:--';
        timerLabelP.textContent = "Suorita vaihe";
        updateButtonStates(); // Päivitä napit (Stop, Next Step)
    } // proceedWithRoutineStart loppuu

    function pauseResumeTimer() {
        if (activeRoutineType !== 'workout') return; // Tauko vain treenille

        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Käynnissä -> Pauselle
            pausedState = timerState; // Tallenna mistä tilasta tultiin
            stopTimerInterval(); // Pysäytä intervalli
            timerState = TimerState.PAUSED;
            console.log("Workout Paused");
            pauseResumeBtn.textContent = "▶ Jatka";
            pauseResumeBtn.classList.add('paused');
            timerDiv.classList.add('timer-paused');
        } else if (timerState === TimerState.PAUSED) {
            // Pausella -> Jatka
            console.log("Workout Resumed");
            timerState = pausedState || TimerState.RUNNING_EXERCISE; // Palauta tila
            pausedState = null;
            runTimerInterval(); // Käynnistä intervalli uudelleen
            pauseResumeBtn.textContent = "⏸ Tauko";
            pauseResumeBtn.classList.remove('paused');
            timerDiv.classList.remove('timer-paused');
            // Lisää lepotilaefekti takaisin jos jatketaan levosta
            if(timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST){
                timerDiv.classList.add('timer-resting');
                highlightNextStep();
            } else {
                timerDiv.classList.remove('timer-resting');
                clearNextUpHighlight();
            }
        }
        updateButtonStates(); // Päivitä napit
    } // pauseResumeTimer loppuu

    function stopActiveRoutine() {
        console.log(`Stopping ${activeRoutineType}...`);
        stopTimer(); // Pysäytä intervalli ja nollaa ajastimen tilat
        clearNextUpHighlight();
        const previouslyActiveType = activeRoutineType; // Tallenna tyyppi ennen resetointia
        timerState = TimerState.IDLE; // Aseta tila IDLEksi

        if (currentRoutineSteps.length > 0 && currentStepIndex < currentRoutineSteps.length) {
             // Näytä vaihe, jossa oltiin, mutta IDLE-tilassa
             displayStep(currentStepIndex);
             // Jos pysäytettiin treeni, näytä sen työaika ajastimessa
             if(previouslyActiveType === 'workout') {
                 updateTimerDisplay(currentRoutineSteps[currentStepIndex]?.workTime || 0);
             }
        }
        else {
            // Jos ei ollut vaiheita tai indeksi oli outo, resetoi kokonaan
            resetAppState();
            return;
        }

        updateRoundDisplay(); // Päivitä/tyhjennä kierrosinfo
        updateButtonStates(); // Päivitä napit IDLE-tilaan
    } // stopActiveRoutine loppuu

    function handleNextStep() {
         // Vain lämmittelylle ja jäähdyttelylle
         if (activeRoutineType !== 'warmup' && activeRoutineType !== 'cooldown') return;
         if (timerState !== TimerState.RUNNING_STEP) return; // Vain jos ollaan aktiivisesti suorittamassa

         currentStepIndex++; // Siirry seuraavaan
         if (currentStepIndex >= currentRoutineSteps.length) {
              // Jos oli viimeinen vaihe, lopeta rutiini
              finishRoutine();
         } else {
             // Muuten näytä seuraava vaihe
             displayStep(currentStepIndex);
             highlightCurrentStep();
         }
         updateButtonStates(); // Päivitä "Seuraava"/"Valmis" -nappi
    } // handleNextStep loppuu

    function finishRoutine() {
         console.log(`${activeRoutineType} Finished.`);
         const finishedType = activeRoutineType;
         stopTimerInterval(); // Pysäytä ajastin (jos oli käynnissä treenissä)
         timerState = TimerState.FINISHED; // Aseta tila valmiiksi
         clearNextUpHighlight();

         // Päivitä näyttö valmis-tilaan
         itemNameH2.textContent = `${finishedType.charAt(0).toUpperCase() + finishedType.slice(1)} Valmis!`;
         itemDescriptionP.textContent = "Hyvää työtä!";
         itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
         updateTimerDisplay(0); timerLabelP.textContent = "Valmis";
         updateRoundDisplay(); // Tyhjennä kierrokset

         updateInfoAreaNotes(`Valmista! Voit aloittaa seuraavan osion tai valita uuden.`);
         // Soita piippaus (vain jos ääni sallittu ja oli treeni?) - Voi muuttaa jos haluaa äänen muillekin
         if (isAudioUnlocked && finishedType === 'workout') {
             playSound(beepSound);
         }
         updateButtonStates(); // Päivitä napit (salli navigointi)
     } // finishRoutine loppuu

    // --- Ajastimen sisäiset toiminnot ---
    function stopTimer() {
        stopTimerInterval();
        pausedState = null; // Nollaa paused-tila
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Poista erikoistyylit
        console.log("Timer interval stopped.");
    } // stopTimer loppuu

    function stopTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    } // stopTimerInterval loppuu

    // Käynnistää ajastimen tietylle vaiheelle (työ, lepo, kierroslepo)
    function startTimerForPhase(phaseState, duration) {
        stopTimerInterval(); // Varmista, ettei vanha jää päälle
        timerState = phaseState;
        remainingTime = duration;
        timerDiv.classList.remove('timer-resting', 'timer-paused'); // Nollaa tyylit
        clearNextUpHighlight(); // Poista vanha korostus

        if (phaseState === TimerState.RUNNING_EXERCISE) {
            // Työvaihe: Näytä nykyinen harjoitus ja korosta se listassa
            displayStep(currentStepIndex);
            highlightCurrentStep();
        } else if (phaseState === TimerState.RUNNING_REST || phaseState === TimerState.RUNNING_ROUND_REST) {
            // Lepovaihe: Näytä SEURAAVA harjoitus ja korosta se "next-up" tyylillä
            timerDiv.classList.add('timer-resting'); // Lisää lepotyyli
            const nextIdx = (phaseState === TimerState.RUNNING_ROUND_REST) ? 0 : currentStepIndex + 1;
            if (nextIdx < currentRoutineSteps.length) {
                displayStep(nextIdx); // Näytä seuraavan tiedot
                highlightNextStep(nextIdx); // Korosta seuraava
            } else {
                // Jos ollaan viimeisen harjoituksen jälkeen (menossa kierroslepoon tai lopetukseen),
                // näytetään silti viimeinen harjoitus
                displayStep(currentStepIndex);
                highlightCurrentStep(); // Korosta nykyinen (viimeinen)
            }
        }

        console.log(`Starting Timer Phase: ${phaseState}, Duration: ${duration}`);
        updateTimerDisplay(remainingTime); // Päivitä ajastimen numero ja label
        updateButtonStates(); // Päivitä kontrollinapit (Pause/Stop)
        updateRoundDisplay(); // Päivitä kierrosnäyttö

        // Käynnistä sekuntikello vain jos kesto > 0 (tai tarkalleen = 0, jotta 0s lepo toimii)
        if (remainingTime >= 0) {
            runTimerInterval();
        } else {
            // Jos kesto olisi negatiivinen (ei pitäisi tapahtua), siirry heti loppuun
            handleTimerEnd();
        }
    } // startTimerForPhase loppuu   <--- TÄMÄN LOPPUSULKU ON TÄRKEÄ

    // Sekuntikellon intervalli
    function runTimerInterval() {
        if (timerInterval) return; // Estä useampi intervalli
        timerInterval = setInterval(() => {
            if (timerState === TimerState.PAUSED) return; // Älä tee mitään pausella

            remainingTime--; // Vähennä aikaa
            const isWork = timerState === TimerState.RUNNING_EXERCISE;
            const isRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
            const checkTime = remainingTime + 1; // Aika ennen vähennystä äänille

            // Äänet (jos sallittu)
            if(isAudioUnlocked){
                if (isWork) { // Työn viimeiset sekunnit
                    if (checkTime === 10 || (checkTime >= 1 && checkTime <= 5)) {
                        playSound(beepSound); // TÄMÄ OLI N. LINE 302 VANHASSA KOODISSA
                    }
                } else if (isRest) { // Lepon viimeiset sekunnit
                    if (checkTime >= 1 && checkTime <= 3) {
                        playSound(beepSound);
                    }
                }
            }

            // Päivitä näkyvä aika
            updateTimerDisplay(remainingTime);

            // Tarkista, loppuiko aika
            if (remainingTime < 0) {
                handleTimerEnd(); // Käsittele vaiheen loppu
            }
        }, 1000); // Suorita joka sekunti
    } // runTimerInterval loppuu

    // Käsittelee ajastimen päättymisen (siirtyy lepoon, seuraavaan vaiheeseen tai lopettaa)
    function handleTimerEnd() {
        stopTimerInterval(); // Pysäytä kello
        timerDiv.classList.remove('timer-resting'); // Poista lepotyyli
        // Älä tee mitään, jos ei olla aktiivisessa tilassa
        if (timerState === TimerState.IDLE || timerState === TimerState.PAUSED || timerState === TimerState.FINISHED) return;

        const wasResting = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;

        if (timerState === TimerState.RUNNING_EXERCISE) {
            // Työaika päättyi
            const currentEx = currentRoutineSteps[currentStepIndex];
            if (!currentEx) { resetAppState(); return; } // Turvatarkistus

            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            const restDur = currentEx.restTime || 0;

            if (isLastEx) { // Oliko kierroksen viimeinen harjoitus?
                if (isLastR) { // Oliko koko treenin viimeinen kierros?
                    moveToNextPhase(); // -> finishRoutine()
                } else { // Ei ollut viimeinen kierros
                    const roundRest = currentWorkoutInfo.restBetweenRounds || 0;
                    if (roundRest > 0) {
                        startTimerForPhase(TimerState.RUNNING_ROUND_REST, roundRest); // Aloita kierroslepo
                    } else {
                        moveToNextPhase(); // Siirry suoraan seuraavalle kierrokselle
                    }
                }
            } else { // Ei ollut kierroksen viimeinen harjoitus
                if (restDur > 0) {
                    startTimerForPhase(TimerState.RUNNING_REST, restDur); // Aloita normaali lepo
                } else {
                    moveToNextPhase(); // Siirry suoraan seuraavaan harjoitukseen
                }
            }
        } else if (wasResting) {
            // Lepoaika (normaali tai kierros) päättyi
            clearNextUpHighlight(); // Poista seuraavan korostus
            moveToNextPhase(); // Siirry seuraavaan työvaiheeseen
        }
    } // handleTimerEnd loppuu

    // Logiikka seuraavaan vaiheeseen siirtymiseksi (kutsutaan handleTimerEnd:stä)
    function moveToNextPhase() {
        const comingFromRest = timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST;
        const comingFromRoundRest = timerState === TimerState.RUNNING_ROUND_REST;

        if (comingFromRoundRest) {
            // Kierroslepo päättyi -> aloita uusi kierros
            currentRound++;
            currentStepIndex = 0; // Kierroksen alkuun
        } else if (comingFromRest) {
            // Normaali lepo päättyi -> siirry seuraavaan harjoitukseen
            currentStepIndex++;
        } else {
            // Tultiin suoraan työstä (0s lepo)
            const isLastEx = currentStepIndex === currentRoutineSteps.length - 1;
            const isLastR = currentRound >= currentWorkoutInfo.rounds;
            if(isLastEx && !isLastR) { // Viimeinen harjoitus, muttei viimeinen kierros
                currentRound++; // Uusi kierros
                currentStepIndex = 0; // Kierroksen alkuun
            } else if (!isLastEx) { // Ei ollut viimeinen harjoitus
                currentStepIndex++; // Seuraava harjoitus
            }
            // Jos oli viimeinen harjoitus JA viimeinen kierros, indeksi/kierros ei muutu,
            // vaan alla oleva ehto johtaa finishRoutine()-kutsuun.
        }

        // Tarkista, onko treeni valmis vai jatketaanko
        if (currentRound > currentWorkoutInfo.rounds) {
            finishRoutine(); // Kaikki kierrokset tehty
        } else if (currentStepIndex < currentRoutineSteps.length) {
            // Jatka seuraavaan työvaiheeseen
            updateRoundDisplay(); // Päivitä kierrosnumero
            const nextEx = currentRoutineSteps[currentStepIndex];
            if (!comingFromRest) {
                // Jos tultiin suoraan työstä (0s lepo), näyttö pitää päivittää tässä
                displayStep(currentStepIndex);
            } else {
                 // Jos tultiin levosta, displayStep() kutsuttiin jo startTimerForPhase:ssa,
                 // riittää kun korostetaan nykyinen askel listassa
                 highlightCurrentStep();
            }
            startTimerForPhase(TimerState.RUNNING_EXERCISE, nextEx.workTime); // Aloita työaika
        } else {
            // Tänne ei pitäisi päätyä normaalisti
            console.error("State mismatch error during workout progression. currentStepIndex out of bounds?");
            resetAppState();
        }
    } // moveToNextPhase loppuu

    // Päivittää ajastimen näyttämän ajan ja labelin
    function updateTimerDisplay(timeInSeconds) {
        const displayTime = Math.max(0, timeInSeconds); // Varmista ettei näytetä negatiivista
        const minutes = Math.floor(displayTime / 60).toString().padStart(2, "0");
        const seconds = (displayTime % 60).toString().padStart(2, "0");
        timeRemainingSpan.textContent = `${minutes}:${seconds}`;

        let label = "Odottamassa...";
        if (timerState === TimerState.RUNNING_EXERCISE) { label = "Työaika"; }
        else if (timerState === TimerState.RUNNING_REST) { label = "Lepo"; }
        else if (timerState === TimerState.RUNNING_ROUND_REST) { label = "Kierroslepo"; }
        else if (timerState === TimerState.RUNNING_STEP) { label = "Suorita vaihe"; }
        else if (timerState === TimerState.PAUSED) { label = "Tauko"; }
        else if (timerState === TimerState.FINISHED) { label = "Valmis"; }
        else if (timerState === TimerState.IDLE && (activeRoutineType === 'warmup' || activeRoutineType === 'cooldown')) {
             label = ""; // Tyhjä label lä/jää IDLE-tilassa
             timeRemainingSpan.textContent = '--:--';
        } else if (timerState === TimerState.IDLE && activeRoutineType === 'workout') {
             // Näytä työaika IDLE-tilassa treenille
             const step = currentRoutineSteps[currentStepIndex];
             const idleTime = step?.workTime ?? 0;
             const idleMinutes = Math.floor(idleTime / 60).toString().padStart(2, "0");
             const idleSeconds = (idleTime % 60).toString().padStart(2, "0");
             timeRemainingSpan.textContent = `${idleMinutes}:${idleSeconds}`;
             label = "Valmiina";
        }

        timerLabelP.textContent = label;
    } // updateTimerDisplay loppuu

    // Päivittää kierrosinformaation näytön
    function updateRoundDisplay() {
        // Näytä vain jos treeni aktiivinen ja kierroksia määritelty
        if (activeRoutineType === 'workout' && timerState !== TimerState.IDLE && timerState !== TimerState.FINISHED && currentWorkoutInfo.rounds > 0) {
            roundInfoP.textContent = `Kierros ${currentRound} / ${currentWorkoutInfo.rounds}`;
        } else {
            roundInfoP.textContent = ''; // Tyhjennä muulloin
        }
    } // updateRoundDisplay loppuu

    // Navigoi edelliseen vaiheeseen (vain IDLE/FINISHED-tilassa)
    function prevStep() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
            if (currentStepIndex > 0) {
                jumpToStep(currentStepIndex - 1);
            }
        }
    } // prevStep loppuu

    // Navigoi seuraavaan vaiheeseen (vain IDLE/FINISHED-tilassa)
    function nextStepNav() {
        if ((timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && currentRoutineSteps.length > 0) {
             if (currentStepIndex < currentRoutineSteps.length - 1) {
                jumpToStep(currentStepIndex + 1);
            }
        }
    } // nextStepNav loppuu

    // Päivittää kaikkien kontrollinappien tilan (näkyvyys, teksti, disabled)
    function updateButtonStates() {
        // Piilota kontrollit oletuksena
        pauseResumeBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        nextStepBtn.style.display = 'none';

        // Estä start-napit jos rutiini on jo valittu/ladattu (vaikka olisi IDLE)
        const routineLoaded = currentRoutineSteps.length > 0;
        startWarmupBtn.disabled = !warmupData || routineLoaded;
        startWorkoutBtn.disabled = currentWorkoutInfo.week === null || routineLoaded;
        startCooldownBtn.disabled = !cooldownData || routineLoaded;

        // Näytä oikea start-nappi vain jos IDLE eikä mikään rutiini ladattu
        startWarmupBtn.style.display = (activeRoutineType === 'warmup' && timerState === TimerState.IDLE && !routineLoaded) ? 'block' : 'none';
        startWorkoutBtn.style.display = (activeRoutineType === 'workout' && timerState === TimerState.IDLE && !routineLoaded) ? 'block' : 'none';
        startCooldownBtn.style.display = (activeRoutineType === 'cooldown' && timerState === TimerState.IDLE && !routineLoaded) ? 'block' : 'none';


        // Määritä navigointinappien tila (Prev/Next)
        const canNavIdle = (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) && routineLoaded;
        prevBtn.disabled = !canNavIdle || currentStepIndex <= 0;
        nextBtn.disabled = !canNavIdle || currentStepIndex >= currentRoutineSteps.length - 1;

        // Määritä aktiivisen rutiinin kontrollien tila
        if (timerState === TimerState.RUNNING_EXERCISE || timerState === TimerState.RUNNING_REST || timerState === TimerState.RUNNING_ROUND_REST) {
            // Treeni käynnissä
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "⏸ Tauko"; pauseResumeBtn.classList.remove('paused');
        } else if (timerState === TimerState.RUNNING_STEP) {
            // Lämmittely/Jäähdyttely käynnissä
            stopBtn.style.display = 'block'; nextStepBtn.style.display = 'block';
            stopBtn.disabled = false; nextStepBtn.disabled = false;
            // Päivitä "Seuraava"/"Valmis"-teksti
            if (currentStepIndex === currentRoutineSteps.length - 1) {
                nextStepBtn.textContent = "Valmis ✅";
            } else {
                nextStepBtn.textContent = "Seuraava Vaihe ⏭";
            }
        } else if (timerState === TimerState.PAUSED) {
            // Treeni pausella
            pauseResumeBtn.style.display = 'block'; stopBtn.style.display = 'block';
            pauseResumeBtn.disabled = false; stopBtn.disabled = false;
            pauseResumeBtn.textContent = "▶ Jatka"; pauseResumeBtn.classList.add('paused');
        } else if (timerState === TimerState.IDLE || timerState === TimerState.FINISHED) {
            // Ei aktiivista rutiinia käynnissä -> Päänäytön kontrollit piilossa (hoidettu yllä)
        }
    } // updateButtonStates loppuu

    // Palauttaa sovelluksen alkutilaan
    function resetAppState(resetSelections = true) {
        stopTimerInterval(); // Pysäytä ajastin

        // Nollaa ydintila
        currentRoutineSteps = []; currentWorkoutExercises = [];
        currentStepIndex = 0; currentRound = 1;
        remainingTime = 0; timerState = TimerState.IDLE; pausedState = null;
        isAudioUnlocked = false; // Nollaa äänilupa

        // Nollaa tietorakenne, säilytä taso jos resetSelections = false
        const savedLevel = currentWorkoutInfo.level;
        currentWorkoutInfo = { week: null, phaseIndex: null, level: savedLevel, rounds: 0, restBetweenRounds: 0, notes: '', focus: '' };

        // Päivitä UI oletustilaan
        itemNameH2.textContent = "Valitse toiminto";
        itemDescriptionP.textContent = "Valitse toiminto yläpuolelta.";
        infoAreaTitleH2.textContent = "Tiedot";
        updateInfoAreaNotes(); // Asettaa oletustekstin
        itemImageImg.style.display = 'none'; itemImageImg.src = ''; itemImageImg.alt = '';
        stepsListUl.innerHTML = '<li>Valitse toiminto yläpuolelta.</li>';
        stepsListTitleH2.textContent = "Vaiheet";
        updateTimerDisplay(0); // Nollaa ajastinnäyttö
        timerDiv.classList.remove('timer-resting', 'timer-paused');
        timerDiv.style.visibility = 'hidden'; // Piilota ajastin
        highlightCurrentStep(); // Poistaa korostuksen
        clearNextUpHighlight();
        updateRoundDisplay(); // Tyhjentää kierrokset

         // Jos halutaan resetoida myös yläpalkin valinnat
         if (resetSelections) {
             activeRoutineType = 'none'; // Nollaa tyyppi
             currentWorkoutInfo.level = '2'; // Palauta taso oletukseen
             currentWorkoutInfo.week = null; // Nollaa viikko

             // Piilota start-napit
             startWarmupBtn.style.display = 'none';
             startWorkoutBtn.style.display = 'none';
             startCooldownBtn.style.display = 'none';

             // Poista aktiivisuus valintanapeista
             document.querySelectorAll('.week-button, .routine-button').forEach(btn => btn.classList.remove('active'));
             levelButtonsContainer.querySelectorAll('.level-button').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.level === '2'); // Aseta taso 2 aktiiviseksi
             });

             // Sulje valikko ja info jos auki
             if (infoContentWrapper && !infoContentWrapper.classList.contains('collapsed')) {
                 toggleInfoArea();
             }
             if (selectionArea && !selectionArea.classList.contains('hidden')) {
                 toggleTrainingSelectionVisibility();
             }
        }

        updateButtonStates(); // Päivitä nappien tila lopuksi
        console.log("App state reset.");
    } // resetAppState loppuu

    // Korostaa aktiivisen vaiheen sivupalkin listassa
    function highlightCurrentStep() {
        const items = stepsListUl.querySelectorAll('li.step-item');
        items.forEach((item) => {
            const idx = parseInt(item.dataset.index, 10);
            if (currentRoutineSteps.length > 0 && !isNaN(idx) && idx === currentStepIndex) {
                item.classList.add('active');
                // Skrollaa elementti näkyviin listassa tarvittaessa
                if (item.offsetTop < stepsListUl.scrollTop || item.offsetTop + item.offsetHeight > stepsListUl.scrollTop + stepsListUl.clientHeight) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                item.classList.remove('active');
            }
        });
        // Varmista, ettei mikään ole aktiivinen jos lista on tyhjä
        if (currentRoutineSteps.length === 0) {
            stepsListUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        }
    } // highlightCurrentStep loppuu

    // Korostaa seuraavan vaiheen listassa (levon aikana)
    function highlightNextStep(forceIndex = -1) {
        clearNextUpHighlight(); // Poista vanha ensin
        let nextIdx = -1;
        if (forceIndex !== -1) { // Jos indeksi annettu (esim. kierroslevon jälkeen)
            nextIdx = forceIndex;
        } else if (timerState === TimerState.RUNNING_REST) { // Normaalisti levon aikana seuraava
            nextIdx = currentStepIndex + 1;
        }

        if (nextIdx >= 0 && nextIdx < currentRoutineSteps.length) {
            const nextItem = stepsListUl.querySelector(`li[data-index="${nextIdx}"]`);
            if (nextItem) nextItem.classList.add('next-up');
        }
    } // highlightNextStep loppuu

    // Poistaa seuraavan vaiheen korostuksen
    function clearNextUpHighlight() {
        const item = stepsListUl.querySelector('li.next-up');
        if (item) item.classList.remove('next-up');
    } // clearNextUpHighlight loppuu

    // Nämä ovat nyt tyhjiä, koska CSS hoitaa skrollauksen hallinnan
    function addBodyLock() { /* console.log("addBodyLock called (no effect from JS)"); */ }
    function removeBodyLock() { /* console.log("removeBodyLock called (no effect from JS)"); */ }

    // Näyttää/piilottaa yläosan valinta-alueen
    function toggleTrainingSelectionVisibility() {
        const hidden = selectionArea.classList.toggle('hidden');
        toggleSelectionAreaBtn.classList.toggle('open', !hidden);
        // Voit halutessasi muuttaa napin tekstiä tässä, esim:
        // const toggleTextElem = toggleSelectionAreaBtn.querySelector('.toggle-text');
        // if (toggleTextElem) { toggleTextElem.textContent = hidden ? "Valinnat" : "Piilota Valinnat"; }
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
    // toggleInfoBtn kuuntelija lisätään initializeInfoArea:ssa

    // --- Sovelluksen käynnistys ---
    loadAppData();

}); // DOMContentLoaded loppuu
