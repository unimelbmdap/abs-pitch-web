

export function initAudio() {

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
  const noiseBuffer = audio.context.createBuffer(1, bufferSize, audio.context.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  audio.noiseNode.buffer = noiseBuffer;
}
