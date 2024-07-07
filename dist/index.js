/*

An implementation of an 'absolute pitch reproduction' task.

Written by Damien Mannion (dmannion@unimelb.edu.au) - Melbourne Data
Analytics Platform (MDAP), The University of Melbourne.

June 2024

*/

// base frequency against which units in cents are measured
// this is a G note
const BASE_FREQ = 196;

// pitch response scale is linear in cents
const SCALE_MIN_CENTS = -48;
const SCALE_MAX_CENTS = +2848;
const SCALE_STEP_CENTS = 4;
const SCALE_CENTS = [];
for (
  let scaleValue=SCALE_MIN_CENTS;
  scaleValue <= SCALE_MAX_CENTS;
  scaleValue += SCALE_STEP_CENTS
) {
  SCALE_CENTS.push(scaleValue);
}
const SCALE_OFFSET_MAX_CENTS = 248;
const SCALE_OFFSETS_CENTS = [];
for (
  let scaleValue=-SCALE_OFFSET_MAX_CENTS;
  scaleValue <= SCALE_OFFSET_MAX_CENTS;
  scaleValue += SCALE_STEP_CENTS
) {
  SCALE_OFFSETS_CENTS.push(scaleValue);
}

// notes and their offsets in cents from `BASE_FREQ`
const NOTES = {
  'A♭': 100,
  'A': 200,
  'B♭': 300,
  'B': 400,
  'C': 500,
  'C#': 600,
  'D': 700,
  'E♭': 800,
  'E': 900,
  'F': 1000,
  'F#': 1100,
  'G': 0,
};

const N_PRACTICE_TRIALS = 3;
const N_BLOCKS = 3;
const MIN_DELTA_CENTS = 1250;
const NOTE_DISPLAY_TIME_S = 1.8;
const MAX_TIME_S = 15.0;
const FADE_DURATION_S = 0.1;
const SAVE_FILENAME = 'ap_task_results.csv';

async function main() {

  await runStartPhase();

  await runInstructionsPhase();

  // can't initialise the audio until there has been a user interaction
  const audio = initAudio();

  // allow the user to set a gain level
  await runVolumeSetting(audio);

  await runRecordingStartPhase();

  // practice trials
  const practiceData = await runPractice(audio);

  // use the last practice trial to give the 'previous' data for the
  // first task trial
  const prevTrial = practiceData[practiceData.length - 1];
  const prevResponse = prevTrial.chosenCents;
  const prevNote = prevTrial.note;

  // experiment trials
  const taskData = await runTask({prevResponse, prevNote, audio});

  // combine the practice and task data
  const data = practiceData.concat(taskData);

  // convert to CSV and export
  await runFinish(data);

  audio.toneNode.stop();
  audio.context.suspend();

  runFinal();

}

async function runStartPhase() {
  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');
}


async function runInstructionsPhase() {
  showOverlay('instructOverlayContainer');
  await waitForButtonClick('instructButton');
  hideOverlay('instructOverlayContainer');
}


function initAudio() {

  const audio = {};

  audio.context = new window.AudioContext();

  audio.toneNode = audio.context.createOscillator();
  audio.gainNode = audio.context.createGain();
  audio.masterGainNode = audio.context.createGain();
  audio.noiseNode = audio.context.createBufferSource();
  audio.noiseNode.loop = true;

  audio.toneNode.frequency.value = BASE_FREQ;
  audio.toneNode.start();

  createNoise(audio);

  audio.gainNode.connect(audio.masterGainNode);
  // the master gain is used for fading in/out
  audio.masterGainNode.connect(audio.context.destination);

  const startVolume = 0.05;
  audio.gainNode.gain.value = startVolume;

  audio.masterGainNode.gain.value = 1.0;

  return audio;

}

function createNoise(audio) {

  const bufferSize = 2 * audio.context.sampleRate;
  const noiseBuffer = audio.context.createBuffer(
    1,
    bufferSize,
    audio.context.sampleRate,
  );
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  audio.noiseNode.buffer = noiseBuffer;
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

  function ppClickHandle() {

    if (ppButton.innerHTML === 'Play') {
      ppButton.innerHTML = 'Pause';
      audio.context.resume();
      if (!audioStarted) {
        continueButton.removeAttribute('disabled');
        audio.noiseNode.start();
        audioStarted = true;
      }
    } else {
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

async function runRecordingStartPhase() {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
<p class="bolden">
Your data can be included only if you submit a video recording of
yourself doing the task. Your face needs to be visible in the video recording.
</p>

<p class="bolden">
Start videorecording now.
</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Continue';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');
}


async function runPractice(audio) {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>
The 3 practice trials will begin when you press the button below.
  <p>

  <p>
Each trial will begin when a note name is displayed on the screen.
  </p>

  <p>
A slider will then appear, and a tone will begin playing.
  </p>

  <p>
You can alter the tone of the pitch by moving the location of the slider.
  </p>

  <p>
When you believe the pitch of the tone matches the note,
press the <code>Continue</code> button.
  </p>

  <p>
The task will begin immediately after the 3rd practice trial.
  </p>

  <p class="bolden">
Remember, do not hum, sing, or whistle during the task.
  </p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Begin practice trials';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  const data = await runBlock(
    {
      blockNumber: 1,
      isPractice: true,
      audio: audio,
    },
  );

  return data;

}

async function runBlock(
  {
    blockNumber,
    isPractice,
    audio,
    prevNote,
    prevResponse,
  } = {},
) {

  // if the previous values are undefined, then pick a random value
  prevNote = prevNote ?? randomChoice(Object.keys(NOTES));
  prevResponse = prevResponse ?? randomChoice(SCALE_CENTS);

  const nTrials = isPractice ? N_PRACTICE_TRIALS : NOTES.length;

  const sequence = genBlockSequence(
    prevNote,
    isPractice,
  ).slice(0, nTrials);

  const data = [];

  for (const [iTrial, note] of sequence.entries()) {

    const trialNumber = iTrial + 1;

    // pick a random value to shift the scale around by
    const scaleOffsetCents = randomChoice(SCALE_OFFSETS_CENTS);

    const startCents = genStartCents(
      {
        prevResponse,
        scaleOffsetCents,
        isPractice,
      },
    );

    if (trialNumber === N_PRACTICE_TRIALS && isPractice) {
      topStatusContainer.style.visibility = 'visible';
    } else {
      topStatusContainer.style.visibility = 'hidden';
    }

    const trialData = await runTrial(
      {
        note,
        startCents,
        blockNumber,
        trialNumber,
        isPractice,
        audio,
        scaleOffsetCents,
      },
    );

    data.push(trialData);

    prevResponse = trialData.chosenCents;

  }

  return data;

}

function genBlockSequence(lastNote, isPractice = false) {

  const orderedNotes = Object.keys(NOTES);

  const notes = Object.keys(NOTES);

  let ok = false;

  while (!ok) {

    // randomise the order of the set of 12 notes
    shuffle(notes);

    ok = true;

    // prepend the last note, so there are 13 notes
    const testArray = [lastNote].concat(notes);

    // start at the second note (i.e., skip the previous note)
    for (let i=1; i < testArray.length; i++) {

      const currNote = testArray[i];
      const prevNote = testArray[i - 1];

      // indices of the current and previous note
      const iCurrNote = orderedNotes.indexOf(currNote);
      const iPrevNote = orderedNotes.indexOf(prevNote);

      // need to be careful at the boundaries
      if (iCurrNote === 0) {
        // no good if currently 0 and previous is 11 or 1
        if (iPrevNote === (orderedNotes.length - 1) || iPrevNote === 1) {
          ok = false;
        }
      } else if (iCurrNote === (orderedNotes.length - 1)) {
        // no good if currently 11 and previous is 10 or 0
        if (iPrevNote === (iCurrNote - 1) || iPrevNote === 0) {
          ok = false;
        }
      } else {
        // no good if one less or more than current
        if (iPrevNote === (iCurrNote - 1) || iPrevNote === (iCurrNote + 1)) {
          ok = false;
        }
      }

      if (isPractice && i <= N_PRACTICE_TRIALS) {

        // for practice trials, notes can't be A, C, or G
        if (currNote === 'A' || currNote === 'C' || currNote === 'G') {
          ok = false;
        }

      }

    }

  }

  return notes;

}

function genStartCents(
  {
    prevResponse,
    scaleOffsetCents,
    isPractice = false,
  } = {},
) {

  let candCents;

  // adjust the scale to take into account the offset
  const scaleCents = SCALE_CENTS.map((item) => item + scaleOffsetCents);

  let ok = false;

  while (!ok) {

    ok = true;

    // pick a random value from the scale as a candidate
    candCents = randomChoice(scaleCents);

    // not OK if it is too close to the previous response
    if (Math.abs(candCents - prevResponse) <= MIN_DELTA_CENTS) {
      ok = false;
    // also not OK if it lands on a note
    // given that the cents = 0 is a note, then any cents that are a
    // a multiple of 100 are notes
    } else if (mod(candCents, 100) === 0) {
      ok = false;
    }

    if (isPractice) {

      // can't be within 75 cents of A, C, G
      for (const note of ['A', 'C', 'G']) {
        const dist = centsFromNote(candCents, note);
        if (dist <= 75) {
          ok = false;
        }
      }

    }

  }

  return candCents;

}

function centsFromNote(cents, note) {

  const baseNoteCents = NOTES[note];

  const diffs = [];

  for (let offset=-1200; offset <= +1200; offset += 1200) {
    const diff = Math.abs(cents + offset - baseNoteCents);
    const localDiff = mod(diff, 12 * 100);
    diffs.push(localDiff);
  }

  const dist = Math.min(...diffs);

  return dist;

}

async function runTrial(
  {
    note,
    startCents,
    blockNumber,
    trialNumber,
    isPractice,
    audio,
    scaleOffsetCents,
  } = {},
) {

  // grab some elements that will be needed
  const timerElement = document.getElementById('timerText');
  const continueButton = document.getElementById('pitchContinueButton');
  const pitchItems = document.getElementById('pitchItems');
  const noteText = document.getElementById('noteText');
  const slider = document.getElementById('pitchSlider');

  // we want to just show the note by itself first, so hide the other elements
  pitchItems.style.visibility = 'hidden';
  timerElement.style.visibility = 'hidden';

  // shift the endpoints of the slider
  slider.min = SCALE_MIN_CENTS + scaleOffsetCents;
  slider.max = SCALE_MAX_CENTS + scaleOffsetCents;

  // set the note text
  noteText.innerHTML = note;

  // implement the countdown timer
  function updateTimer() {

    const currTimeMs = performance.now();

    const timeElapsedMs = currTimeMs - startTimeMs;

    const timeRemainingS = Math.round(MAX_TIME_S - (timeElapsedMs / 1000));

    timerElement.innerHTML = `Time remaining: ${timeRemainingS}`;

    // if time is up, then mimic pressing the continue button
    if ((timeElapsedMs / 1000) > MAX_TIME_S) {
      continueButton.dispatchEvent(new CustomEvent('mouseup'));
    }

  }

  // what to do when the slider is changed
  function handleSlider(evt) {
    // use `detune` to change the frequency of the tone
    audio.toneNode.detune.setValueAtTime(
      evt.target.valueAsNumber,
      audio.context.currentTime,
    );
  }

  // set the slider to its starting value
  slider.value = startCents;

  slider.addEventListener('input', handleSlider);
  slider.dispatchEvent(new CustomEvent('input'));

  showOverlay('pitchOverlayContainer');

  // just show the note for a period of time
  await waitForPeriod(NOTE_DISPLAY_TIME_S);

  // and start playing the tone
  audio.context.resume();
  audio.toneNode.connect(audio.gainNode);
  fadeVolume('in', audio);
  await waitForPeriod(0.2);

  // now show the other elements
  pitchItems.style.visibility = 'visible';
  timerElement.style.visibility = 'visible';

  const startTimeMs = performance.now();
  const startDate = new Date();

  // set the timer to update itself every second
  updateTimer();
  const timerHandle = setInterval(updateTimer, 1000);

  // wait for them to complete the task
  const finishTimeMs = await waitForButtonClick('pitchContinueButton');

  const finishDate = new Date();

  hideOverlay('pitchOverlayContainer');

  const responseTimeS = (finishTimeMs - startTimeMs) / 1000;

  // fade rather than immediately silencing to avoid clicks
  fadeVolume('out', audio);
  await waitForPeriod(0.5);

  // pause
  audio.toneNode.disconnect();
  audio.context.suspend();

  slider.removeEventListener('input', handleSlider);

  clearInterval(timerHandle);

  // get selected cents from the slider
  const chosenCents = slider.valueAsNumber;
  const chosenFreq = centsToFreq(chosenCents, BASE_FREQ);

  const startFreq = centsToFreq(startCents, BASE_FREQ);

  const scaleMinCents = SCALE_MIN_CENTS + scaleOffsetCents;
  const scaleMaxCents = SCALE_MAX_CENTS + scaleOffsetCents;

  const scaleMinFreq = centsToFreq(scaleMinCents, BASE_FREQ);
  const scaleMaxFreq = centsToFreq(scaleMaxCents, BASE_FREQ);

  const trialData = {
    isPractice,
    blockNumber,
    trialNumber,
    startDate,
    finishDate,
    responseTimeS,
    note,
    chosenCents,
    chosenFreq,
    startCents,
    startFreq,
    scaleOffsetCents,
    scaleMinCents,
    scaleMaxCents,
    scaleMinFreq,
    scaleMaxFreq,
  };

  return trialData;

}

async function runTask({prevResponse, prevNote, audio} = {}) {

  const textContainer = document.getElementById('textOverlayText');

  let data = [];

  for (let blockNumber=1; blockNumber <= N_BLOCKS; blockNumber++ ) {

    const blockData = await runBlock(
      {
        blockNumber: blockNumber,
        isPractice: false,
        audio: audio,
        prevNote: prevNote,
        prevResponse: prevResponse,
      },
    );

    data = data.concat(blockData);

    // if we aren't in the last block, show a break screen
    if (blockNumber !== N_BLOCKS) {
      const lastTrial = blockData[blockData.length - 1];
      prevNote = lastTrial.note;
      prevResponse = lastTrial.chosenCents;

      const button = document.getElementById('textButton');
      button.innerHTML = 'Continue';

      textContainer.innerHTML = `
      <p>You have now completed block ${blockNumber} of ${N_BLOCKS}.</p>
      <p>When you are ready to begin the next block, press continue.</p>
      <p>If you take a break, do not pause the video recording.</p>
      `;

      showOverlay('textOverlayContainer');
      await waitForButtonClick('textButton');
      hideOverlay('textOverlayContainer');

    }
  }

  return data;

}

async function runFinish(data) {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `

  <p class="bolden">Continue videorecording.</p>

  <p>
You have now completed the task.
  </p>

  <p>
When you press the button below, your data will be downloaded
as a file on your computer. 
  </p>

  <p>
Your web browser may save the file in an automatic location,
or it may open a 'Save As' window.
  </p>

  <p>
You will need to remember where you save the file so that you
can send it to us.
  </p>

  <p>
If you have the option to name the file when you download it,
use the first 3 letters of your first name and the 1st letter of
your surname. E.g., <span class="bolden">Jan</span>e 
<span class="bolden">D</span>oe would name the file [JanD].
  </p>

  <p class="bolden">
Do not make any changes to your data file.
  </p>

  <p>
The next screen will give you instructions on how to send us your file.
  </p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Download Data File';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  const csv = convertToCSV(data);
  await saveData(csv);

}

async function saveData(data) {

  let dataHash;

  try {
    dataHash = await digestMessage(data);
  } catch (err) {
    console.error('Cannot hash');
    dataHash = 'UNKNOWN';
  }

  const header = [
    `# ${dataHash}`,
    `# BASE_FREQ: ${BASE_FREQ}`,
  ];

  const toSave = [header.join('\n'), data].join('\n');

  const blob = new Blob([toSave], {type: 'text/csv'});

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = SAVE_FILENAME;
  a.click();

}

function runFinal() {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `

<p class="bolden">
Continue videorecording.
</p>

<p>
If you have not already named your file, rename it now.
Use the first 3 letters of your first name and the 1st letter
of your surname. E.g., <span class="bolden">Jan</span>e 
<span class="bolden">D</span>oe would be [JanD].
</p>

<p>
Share your file with us by clicking on the following link and 
dragging and dropping the file onto the icon. If you are unable
to do this, you can email it to Victoria (email address below).
</p>

<p>
 <a href="https://unimelbcloud-my.sharepoint.com/:f:/g/personal/vlambourn_student_unimelb_edu_au/ErimROG7oHRMiqF8kvJsvAQBZBdvCFBnrBHp-sRpThnj2Q?e=WINdiR" target="_blank">https://unimelbcloud-my.sharepoint.com/:f:/g/personal/vlambourn_student_unimelb_edu_au/ErimROG7oHRMiqF8kvJsvAQBZBdvCFBnrBHp-sRpThnj2Q?e=WINdiR</a>
 </p>

<p>
Once you have submitted your data file, you can
<span class="bolden">stop videorecording</span>.
</p>

<p>
Save your video using the same file name as your data file (e.g., JanD).
</p>

<p>
Upload your video to
<a href="https://unimelbcloud-my.sharepoint.com/:f:/g/personal/vlambourn_student_unimelb_edu_au/Evo052SnNmBAvUKDdGlLlLYBq2DrotONFcJNYP89G0yKPw?e=Le3ZNJ" target="_blank">https://unimelbcloud-my.sharepoint.com/:f:/g/personal/vlambourn_student_unimelb_edu_au/Evo052SnNmBAvUKDdGlLlLYBq2DrotONFcJNYP89G0yKPw?e=Le3ZNJ</a>
<br/>
or email it to
<a href="mailto:vlambourn@student.unimelb.edu.au" target="_blank">
vlambourn@student.unimelb.edu.au</a>
</p>

<p>
By submitting your data, you are consenting to take part in this research.
</p>

<p class="bolden">
Thank you for your participation.
</p>

<p>
You may now close this window or tab.
</p>
  `;

  const button = document.getElementById('textButton');
  button.style.display = 'none';

  showOverlay('textOverlayContainer');

}

function fadeVolume(direction, audio, duration = FADE_DURATION_S) {

  const amplitudes = new Float32Array(2);

  if (direction === 'in') {
    amplitudes[0] = 0.0;
    amplitudes[1] = 1.0;
  } else {
    amplitudes[0] = 1.0;
    amplitudes[1] = 0.0;
  }

  // this is tricky because it requires the current audio context time
  // but the resolution of that varies across browsers (e.g., firefox
  // can be > 100 ms!).
  // that means that the time that it happens is difficult to determine
  // and there could still be other calls running
  // so need to leave plenty of time around this function to avoid errors

  try {
    audio.masterGainNode.gain.setValueCurveAtTime(
      amplitudes,
      audio.context.currentTime,
      duration,
    );
  } catch (err) {

    console.error('Overlapping fade events');

    if (direction === 'in') {
      audio.masterGainNode.gain.value = 1.0;
    } else {
      audio.masterGainNode.gain.value = 0.0;
    }

  }

}

async function waitForButtonClick(buttonId) {

  const button = document.getElementById(buttonId);

  return new Promise(
    (resolve) => {

      function handleClick() {
        const timeMs = performance.now();
        button.removeEventListener('mouseup', handleClick);
        resolve(timeMs);
      }

      button.addEventListener('mouseup', handleClick);
    },
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
  await new Promise((resolve) => setTimeout(resolve, timeS * 1000));
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
  const array = [Object.keys(arr[0])].concat(arr);

  return array.map(it => {return Object.values(it).toString()}).join('\n'); // eslint-disable-line
}


// from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}


window.addEventListener('load', main);
