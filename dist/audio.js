

export function initAudio() {

  const audio = {};

  audio.context = new window.AudioContext();

  audio.toneNode = audio.context.createOscillator();
  audio.gainNode = audio.context.createGain();

  audio.toneNode.connect(audio.gainNode);
  audio.gainNode.connect(audio.context.destination);

  const startVolume = 0.1;
  audio.gainNode.gain.value = startVolume;

  return audio;

}
