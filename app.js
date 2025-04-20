// app.js

let exercises = [];
let currentExerciseIndex = 0;
let timerInterval = null;
let isPaused = false;
let remainingTime = 0;

const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const resetButton = document.getElementById("reset-button");
const timerDisplay = document.getElementById("timer-display");
const currentExerciseName = document.getElementById("current-exercise-name");
const currentExerciseImage = document.getElementById("current-exercise-image");
const currentExerciseInfo = document.getElementById("current-exercise-info");

async function loadExercises() {
  const response = await fetch("data/exercises.json");
  const data = await response.json();
  exercises = data.predefined[0].exercises;
  displayExercise();
}

function displayExercise() {
  const exercise = exercises[currentExerciseIndex];
  currentExerciseName.textContent = exercise.name;
  currentExerciseImage.src = exercise.image || "";
  currentExerciseInfo.textContent = `${exercise.bodypart} | ${exercise.instructions}`;
  remainingTime = exercise.duration;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60).toString().padStart(2, "0");
  const seconds = (remainingTime % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (isPaused) {
    isPaused = false;
  } else {
    displayExercise();
  }
  timerInterval = setInterval(() => {
    if (!isPaused) {
      remainingTime--;
      updateTimerDisplay();
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        nextExercise();
      }
    }
  }, 1000);
}

function pauseTimer() {
  isPaused = true;
  clearInterval(timerInterval);
}

function resetTimer() {
  clearInterval(timerInterval);
  isPaused = false;
  displayExercise();
}

function nextExercise() {
  if (currentExerciseIndex < exercises.length - 1) {
    currentExerciseIndex++;
    displayExercise();
    startTimer();
  } else {
    currentExerciseName.textContent = "Treeni valmis!";
    timerDisplay.textContent = "00:00";
  }
}

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);

document.addEventListener("DOMContentLoaded", loadExercises);
