
const BASE_FREQ = 196;

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


// notes and their offsets in cents from `BASEFREQ`
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


async function main() {

  await runStartPhase();

  const audio = initAudio();

  await runVolumeSetting(audio);

  // practice trials
  const practiceData = await runPractice(audio);

  const prevTrial = practiceData[practiceData.length - 1];
  const prevResponse = prevTrial.chosenCents;
  const prevNote = prevTrial.note;

  // experiment trials
  const taskData = await runTask({prevResponse, prevNote, audio});

  const data = practiceData.concat(taskData);

  await runFinish(data);

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
  button.style.display = 'none';

  showOverlay('textOverlayContainer');

}

async function runFinish(data) {

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>The task is now complete.</p>
  <p>When you press the button below, the results will be downloaded
  to a file on your computer.</p>
  <p>Your web browser may save this file in an automatic location or
  it may open a 'Save As' window.</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Download results';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  const csv = convertToCSV(data);
  await saveData(csv);

}


async function runTask({prevResponse, prevNote, audio} = {}) {

  const nBlocks = 3;

  const textContainer = document.getElementById('textOverlayText');
  textContainer.innerHTML = `
  <p>We will now begin the trials for the main task.</p>
  <p>There will be 3 blocks, each containing 12 trials, with a
  self-paced break in between blocks.</p>
  `;

  const button = document.getElementById('textButton');
  button.innerHTML = 'Begin trials';

  showOverlay('textOverlayContainer');
  await waitForButtonClick('textButton');
  hideOverlay('textOverlayContainer');

  let data = [];

  for (let blockNumber=1; blockNumber <= nBlocks; blockNumber++ ) {

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

    if (blockNumber !== nBlocks) {
      const lastTrial = blockData[blockData.length - 1];
      prevNote = lastTrial.note;
      prevResponse = lastTrial.chosenCents;

      textContainer.innerHTML = `
      <p>You have now completed block ${blockNumber} / ${nBlocks}.</p>
      <p>Please take a short break and press the button below when
      ready to commence the next block.</p>
      `;

      showOverlay('textOverlayContainer');
      await waitForButtonClick('textButton');
      hideOverlay('textOverlayContainer');

    }
  }

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

  prevNote = prevNote ?? randomChoice(Object.keys(NOTES));
  prevResponse = prevResponse ?? randomChoice(SCALE_CENTS);

  const nTrials = isPractice ? 3 : NOTES.length;

  const sequence = genBlockSequence(
    prevNote,
    isPractice,
  ).slice(0, nTrials);

  const data = [];

  for (const [iTrial, note] of sequence.entries()) {

    const trialNumber = iTrial + 1;

    const startCents = genStartCents(prevResponse);

    const trialData = await runTrial(
      {
        note,
        startCents,
        blockNumber,
        trialNumber,
        isPractice,
        audio,
      },
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
  <p>A slider will then appear below the note and a tone will begin
  playing.</p>
  <p>You can alter the pitch of the tone by moving the location on
  the slider.</p>
  <p>When you believe that the pitch of the tone matches the note,
  press the <code>Continue</code> button.</p>
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

async function saveData(data) {

  // make a hash of the data - can be used to identify tampering
  const dataHash = await MD5(data);  // eslint-disable-line

  const header = [
    `# MD5: ${dataHash}`,
    `# BASE_FREQ: ${BASE_FREQ}`,
  ];

  const toSave = [header.join('\n'), data].join('\n');

  const blob = new Blob([toSave], {type: 'text/csv'});

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = 'ap_task_results.csv';
  a.click();

}


function genStartCents(prevResponse) {

  const minDeltaCents = 1250;

  let candCents;

  let ok = false;

  while (!ok) {

    ok = true;

    candCents = randomChoice(SCALE_CENTS);

    if (Math.abs(candCents - prevResponse) <= minDeltaCents) {
      ok = false;
    } else if (mod(candCents, 100) === 0) {
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

    const testArray = [lastNote].concat(notes);

    for (let i=1; i < testArray.length; i++) {

      const currNote = testArray[i];
      const prevNote = testArray[i - 1];

      const iCurrNote = orderedNotes.indexOf(currNote);
      const iPrevNote = orderedNotes.indexOf(prevNote);

      if (iCurrNote === 0) {
        if (iPrevNote === (orderedNotes.length - 1) || iPrevNote === 1) {
          ok = false;
        }
      } else if (iCurrNote == (orderedNotes.length - 1)) {
        if (iPrevNote === (iCurrNote - 1) || iPrevNote === 0) {
          ok = false;
        }
      } else {
        if (iPrevNote == (iCurrNote - 1) || iPrevNote == (iCurrNote + 1)) {
          ok = false;
        }
      }

      if (isPractice && i <= 3) {

        if (currNote === 'A' || currNote === 'C' || currNote === 'G') {
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


async function runTrial(
  {note, startCents, blockNumber, trialNumber, isPractice, audio} = {},
) {

  const timerElement = document.getElementById('timerText');
  const continueButton = document.getElementById('pitchContinueButton');

  audio.toneNode.frequency.value = 196;

  const pitchItems = document.getElementById('pitchItems');

  pitchItems.style.visibility = 'hidden';
  timerElement.style.visibility = 'hidden';

  const noteText = document.getElementById('noteText');
  noteText.innerHTML = note;

  function handleSlider(evt) {
    audio.toneNode.detune.setValueAtTime(
      evt.target.valueAsNumber,
      audio.context.currentTime,
    );
  }

  const slider = document.getElementById('pitchSlider');

  slider.value = startCents;

  slider.addEventListener('input', handleSlider);
  slider.dispatchEvent(new CustomEvent('input'));

  showOverlay('pitchOverlayContainer');
  // set note to trial value

  await waitForPeriod(1.8);

  pitchItems.style.visibility = 'visible';
  timerElement.style.visibility = 'visible';

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


function fadeVolume(direction, audio, duration = 0.1) {

  const amplitudes = new Float32Array(2);

  if (direction === 'in') {
    amplitudes[0] = 0.0;
    amplitudes[1] = 1.0;
  } else {
    amplitudes[0] = 1.0;
    amplitudes[1] = 0.0;
  }

  audio.masterGainNode.gain.setValueCurveAtTime(
    amplitudes,
    audio.context.currentTime,
    duration,
  );

}


async function waitForButtonClick(buttonId) {

  const button = document.getElementById(buttonId);

  return new Promise(
    (resolve) => {

      function handleClick() {
        button.removeEventListener('mouseup', handleClick);
        resolve();
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


function initAudio() {

  const audio = {};

  audio.context = new window.AudioContext();

  audio.toneNode = audio.context.createOscillator();
  audio.gainNode = audio.context.createGain();
  audio.masterGainNode = audio.context.createGain();
  audio.noiseNode = audio.context.createBufferSource();
  audio.noiseNode.loop = true;

  audio.toneNode.start();
  createNoise(audio);

  audio.gainNode.connect(audio.masterGainNode);
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


// from https://stackoverflow.com/a/33486055
function MD5(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}  // eslint-disable-line


window.addEventListener('load', main);

