
import {initAudio} from './audio.js'


async function main() {

  await runStartPhase();

  const audio = initAudio();

  console.log(audio);

  await runVolumeSetting(audio);


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

  console.log(audio.gainNode.gain.value);
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

window.addEventListener("load", main);
