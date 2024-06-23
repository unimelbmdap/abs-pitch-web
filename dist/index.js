
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

  let taskData = await runTask({prevResponse:undefined, prevNote:undefined, audio});
  //await runVolumeSetting(audio);

  // practice trials
  let practiceData = await runPractice(audio);

  const prevTrial = practiceData[practiceData.length - 1];
  const prevResponse = prevTrial.chosenCents;
  const prevNote = prevTrial.note;

  // experiment trials
  //let taskData = await runTask({prevResponse, prevNote, audio});

  runFinish(data);

  audio.toneNode.stop();
  audio.context.suspend();

  runFinal();


}

function runFinal() {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>The session is now complete.</p>
  <p>Please email the results file to the coordinator of the study.</p>
  <p>You may now close this window or tab.</p>
  `;

  const button = document.getElementById('textButton');
  button.style.display = "none";

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

}

function runFinish(data) {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>The task is now complete.</p>
  <p>When you press the button below, the results will be downloaded to a file on your computer.</p>
  <p>Your web browser may save this file in an automatic location or it may open a 'Save As' window.</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Download results';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  let csv = convertToCSV(data);
  saveData(csv);

}


async function runTask({prevResponse, prevNote, audio} = {}) {

  const nBlocks = 3;

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>We will now begin the trials for the main task.</p>
  <p>There will be 3 blocks, each containing 12 trials, with a self-paced break in between blocks.</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Begin trials';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  let data = [];

  for (let blockNumber=1; blockNumber <= nBlocks; blockNumber++ ) {

    let blockData = await runBlock(
      {
        blockNumber: blockNumber,
        isPractice: false,
        audio: audio,
        prevNote: prevNote,
        prevResponse: prevResponse,
      },
    );

    data = data.concat(blockData);

    if (blockNumber !== nBlocks) {
      let lastTrial = blockData[blockData.length - 1];
      prevNote = lastTrial.note;
      prevResponse = lastTrial.chosenCents;

      textContainer.innerHTML = `
      <p>You have now completed block ${blockNumber} / ${nBlocks}.</p>
      <p>Please take a short break and press the button below when ready to commence the next block.</p>
      `;

      const button = document.getElementById('textButton');

      showOverlay('textOverlayContainer');
      await waitForButtonClick('textButton');
      hideOverlay('textOverlayContainer');

    }
  }

  return data;

}

async function runBlock({blockNumber, isPractice, audio, prevNote, prevResponse} = {}) {

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

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>We will begin with three practice trials.</p>
  <p>Each trial will begin with a note being displayed on the screen.</p>
  <p>A slider will then appear below the note and a tone will begin playing.</p>
  <p>You can alter the pitch of the tone by moving the location on the slider.</p>
  <p>When you believe that the pitch of the tone matches the note, press the <code>Continue</code> button.</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Begin practice trials';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  let data = await runBlock(
    {
      blockNumber: 1,
      isPractice: true,
      audio: audio,
    },
  );

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

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = '<p>Press the button below to begin the task.</p>';

  const button = document.getElementById('textButton');
  button.innerHTML = 'Begin task';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');
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

  audio.toneNode.connect(audio.gainNode);
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

  audio.toneNode.disconnect();
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

