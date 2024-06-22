

export function initAudio() {

  const audio = {};

  audio.context = new window.AudioContext();

  audio.toneNode = audio.context.createOscillator();
  audio.gainNode = audio.context.createGain();
  audio.noiseNode = audio.context.createBufferSource();
  audio.noiseNode.loop = true;

  createNoise(audio);

  //audio.toneNode.connect(audio.gainNode);
  audio.gainNode.connect(audio.context.destination);

  const startVolume = 0.1;
  audio.gainNode.gain.value = startVolume;

  return audio;

}


function createNoise(audio) {

  const bufferSize = 2 * audio.context.sampleRate;
  const noiseBuffer = audio.context.createBuffer(1, bufferSize, audio.context.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  audio.noiseNode.buffer = noiseBuffer;
}
