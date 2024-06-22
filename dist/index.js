
import {initAudio} from './audio.js'

const BASE_FREQ = 196;

const SCALE_MIN_CENTS = -48;
const SCALE_MAX_CENTS = +2848;
const SCALE_STEP_CENTS = 4;
const SCALE_CENTS = [];
for (let scaleValue=SCALE_MIN_CENTS; scaleValue <= SCALE_MAX_CENTS; scaleValue += SCALE_STEP_CENTS) {
  SCALE_CENTS.push(scaleValue);
}


// notes and their offsets in cents from `BASEFREQ`
const NOTES = {
  "A♭": 100,
  "A": 200,
  "B♭": 300,
  "B": 400,
  "C": 500,
  "C#": 600,
  "D": 700,
  "E♭": 800,
  "E": 900,
  "F": 1000,
  "F#": 1100,
  "G": 0,
};



async function main() {

  await runStartPhase();

  const audio = initAudio();

  const trialConfig = {};

  audio.toneNode.start();

  // practice trials

  //let data = await runPractice(audio);

  let data = await runBlock(
    1,
    true,
    audio,
  );

  let csv = convertToCSV(data);

  saveData(csv);

  await runVolumeSetting(audio);


}


async function runBlock(blockNumber, isPractice, audio, prevNote, prevResponse) {

  prevNote = prevNote ?? randomChoice(Object.keys(NOTES));
  prevResponse = prevResponse ?? randomChoice(SCALE_CENTS);

  const nTrials = isPractice ? 3 : NOTES.length;

  const sequence = genBlockSequence(
    prevResponse,
    isPractice,
  ).slice(0, nTrials);

  let data = [];

  for (let [iTrial, note] of sequence.entries()) {

    let trialNumber = iTrial + 1;

    let startCents = genStartCents(prevResponse);

    let trialData = await runTrial(
      note,
      startCents,
      blockNumber,
      trialNumber,
      isPractice,
      audio,
    );

    data.push(trialData);

    prevResponse = trialData.chosenCents;

  }

  return data;

}

async function runPractice(audio) {

  const nPracTrials = 3;

  const practiceSequence = genBlockSequence(
    randomChoice(Object.keys(NOTES)),
    true,
  ).slice(0, nPracTrials);

  let data = [];

  let prevResponse = randomChoice(SCALE_CENTS);

  for (let [iTrial, note] of practiceSequence.entries()) {

    let trialNumber = iTrial + 1;

    let startCents = genStartCents(prevResponse);

    let trialData = await runTrial(
      note,
      startCents,
      1,
      trialNumber,
      true,
      audio,
    );

    data.push(trialData);

    prevResponse = trialData.chosenCents;

  }

  return data;

}

function saveData(data) {

  const blob = new Blob([data], {type: 'text/csv'});

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = 'ap_task_results.csv';
  a.click();

}


function genStartCents(prevResponse) {

  const minDeltaCents = 1460;

  let candCents;

  let ok = false;

  while (!ok) {

    ok = true;

    candCents = randomChoice(SCALE_CENTS);

    if (Math.abs(candCents - prevResponse) <= minDeltaCents) {
      ok = false;
    }
    else if (mod(candCents, 100) === 0) {
      ok = false;
    }

  }

  return candCents;

}


function genBlockSequence(lastNote, isPractice = false) {

  const orderedNotes = Object.keys(NOTES);

  const notes = Object.keys(NOTES);

  let ok = false;

  while (!ok) {

    shuffle(notes);

    ok = true;

    let testArray = [lastNote].concat(notes);

    for (let i=1; i < testArray.length; i++) {

      let currNote = testArray[i];
      let prevNote = testArray[i - 1];

      let iCurrNote = orderedNotes.indexOf(currNote)
      let iPrevNote = orderedNotes.indexOf(prevNote);

      if (iCurrNote === 0) {
        if (iPrevNote === (orderedNotes.length - 1) || iPrevNote === 1) {
          ok = false;
        }
      }
      else if (iCurrNote == (orderedNotes.length - 1)) {
        if (iPrevNote === (iCurrNote - 1) || iPrevNote === 0) {
          ok = false;
        }
      }
      else {
        if (iPrevNote == (iCurrNote - 1) || iPrevNote == (iCurrNote + 1)) {
          ok = false;
        }
      }

      if (isPractice && i <= 3) {

        if (currNote === "A" || currNote === "C" || currNote === "G") {
          ok = false;
        }

      }

    }

  }

  return notes;

}


async function runStartPhase() {
  showOverlay('startOverlayContainer');
  await waitForButtonClick('startButton');
  hideOverlay('startOverlayContainer');
}


async function runVolumeSetting(audio) {

  audio.noiseNode.connect(audio.gainNode);

  function sliderHandle(evt) {
    audio.gainNode.gain.value = evt.target.valueAsNumber;
  }

  const slider = document.getElementById('volumeSlider');
  slider.addEventListener('input', sliderHandle);
  slider.dispatchEvent(new CustomEvent('input'));

  let audioStarted = false;

  const continueButton = document.getElementById('volumeContinueButton');

  const ppButton = document.getElementById('ppButton');

  function ppClickHandle(evt) {

    if (ppButton.innerHTML === 'Play') {
      ppButton.innerHTML = 'Pause';
      audio.context.resume();
      if (!audioStarted) {
        continueButton.removeAttribute('disabled');
        audio.noiseNode.start();
        audioStarted = true;
      }
    }
    else {
      ppButton.innerHTML = 'Play';
      audio.context.suspend();
    }

  }

  ppButton.addEventListener('mouseup', ppClickHandle);

  showOverlay('volumeOverlayContainer');
  await waitForButtonClick('volumeContinueButton');

  audio.context.suspend();
  audio.noiseNode.disconnect();

  hideOverlay('volumeOverlayContainer');

}


async function runTrial(note, startCents, blockNumber, trialNumber, isPractice, audio) {

  const timerElement = document.getElementById('timerText');
  const continueButton = document.getElementById('pitchContinueButton');

  audio.toneNode.frequency.value = 196;
  audio.toneNode.connect(audio.gainNode);

  const pitchItems = document.getElementById('pitchItems');

  pitchItems.style.visibility = "hidden";
  timerElement.style.visibility = "hidden";

  const noteText = document.getElementById('noteText');
  noteText.innerHTML = note;

  function handleSlider(evt) {
    audio.toneNode.detune.setValueAtTime(evt.target.valueAsNumber, audio.context.currentTime);
  }

  const slider = document.getElementById('pitchSlider');

  slider.value = startCents;

  slider.addEventListener('input', handleSlider);
  slider.dispatchEvent(new CustomEvent('input'));

  showOverlay('pitchOverlayContainer');
  // set note to trial value

  await waitForPeriod(1.8);

  pitchItems.style.visibility = "visible";
  timerElement.style.visibility = "visible";

  fadeVolume('in', audio);
  audio.context.resume();

  // started

  function updateTimer() {

    const maxTime = 15.0;

    const currTime = performance.now();

    const timeElapsed = currTime - startTime;

    const timeRemaining = Math.round(maxTime - (timeElapsed / 1000));

    timerElement.innerHTML = `Time remaining: ${timeRemaining}`;

    if ((timeElapsed / 1000) > maxTime) {
      continueButton.dispatchEvent(new CustomEvent('mouseup'));
    }

  }

  const startTime = performance.now();
  const startDate = new Date();

  updateTimer();
  const timerHandle = setInterval(updateTimer, 1000);
  
  await waitForButtonClick('pitchContinueButton');

  const finishTime = performance.now();
  const finishDate = new Date();

  const responseTime = (finishTime - startTime) / 1000;

  fadeVolume('out', audio);

  await waitForPeriod(0.5);

  audio.toneNode.stop();
  audio.context.suspend();
  slider.removeEventListener('input', handleSlider);

  clearInterval(timerHandle);
  
  hideOverlay('pitchOverlayContainer');

  const chosenCents = slider.valueAsNumber;
  const chosenFreq = centsToFreq(chosenCents, BASE_FREQ);

  const startFreq = centsToFreq(startCents, BASE_FREQ);

  const trialData = {
    isPractice,
    blockNumber,
    trialNumber,
    startDate,
    finishDate,
    responseTime,
    note,
    chosenCents,
    chosenFreq,
    startCents,
    startFreq,
  };

  return trialData;

}


function fadeVolume(direction, audio, duration_s = 0.1) {

  const amplitudes = new Float32Array(2);

  if (direction === "in") {
    amplitudes[0] = 0.0;
    amplitudes[1] = 1.0;
  }
  else {
    amplitudes[0] = 1.0;
    amplitudes[1] = 0.0;
  }

  audio.masterGainNode.gain.setValueCurveAtTime(amplitudes, audio.context.currentTime, duration_s);

}


async function waitForButtonClick(buttonId) {

  const button = document.getElementById(buttonId);

  return new Promise(
    function (resolve) {

      function handleClick(evt) {
        button.removeEventListener('mouseup', handleClick);
        resolve();
      }

      button.addEventListener('mouseup', handleClick);
    }
  );

}


function showOverlay(overlayId) {

  const overlay = document.getElementById(overlayId);
  overlay.style.display = 'flex';
  overlay.style.visibility = 'visible';

}

function hideOverlay(overlayId) {

  const overlay = document.getElementById(overlayId);
  overlay.style.display = 'none';
  overlay.style.visibility = 'hidden';

}

async function waitForPeriod(timeS) {
  await new Promise(resolve => setTimeout(resolve, timeS * 1000));
}


function centsToFreq(cents, baseFreq) {
  return baseFreq * (2 ** (cents / 1200));
}

function shuffle(array) {
  // from https://javascript.info/task/shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function randomChoice(seq) {
  return seq[randomInteger(0, seq.length - 1)];
}

function randomInteger(min, max) {
  // from https://javascript.info/number
  const rand = min - 0.5 + Math.random() * (max - min + 1);
  return Math.round(rand);
}

function convertToCSV(arr) {
  // from https://stackoverflow.com/a/58769574
  const array = [Object.keys(arr[0])].concat(arr)

  return array.map(it => {
    return Object.values(it).toString()
  }).join('\n')
}

window.addEventListener("load", main);

