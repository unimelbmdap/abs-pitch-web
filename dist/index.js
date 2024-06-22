
import {initAudio} from './audio.js'


async function main() {

  await runStartPhase();

  const audio = initAudio();

  const trialConfig = {};

  await runVolumeSetting(audio);

  await runTrial(trialConfig, audio);


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


async function runTrial(trialConfig, audio) {

  audio.toneNode.frequency.value = 196;
  audio.toneNode.connect(audio.gainNode);

  const pitchItems = document.getElementById('pitchItems');

  pitchItems.style.visibility = "hidden";

  const note = document.getElementById('note');

  function handleSlider(evt) {
    audio.toneNode.detune.setValueAtTime(evt.target.valueAsNumber, audio.context.currentTime);
  }

  const slider = document.getElementById('pitchSlider');

  slider.value = 1000;

  slider.addEventListener('input', handleSlider);
  slider.dispatchEvent(new CustomEvent('input'));

  showOverlay('pitchOverlayContainer');
  // set note to trial value

  await waitForPeriod(1.8);

  pitchItems.style.visibility = "visible";

  fadeVolume('in', audio);
  audio.toneNode.start();
  audio.context.resume();
  
  await waitForButtonClick('pitchContinueButton');

  fadeVolume('out', audio);

  await waitForPeriod(0.5);

  audio.toneNode.stop();
  audio.context.suspend();
  slider.removeEventListener('input', handleSlider);

  
  hideOverlay('pitchOverlayContainer');

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

window.addEventListener("load", main);
