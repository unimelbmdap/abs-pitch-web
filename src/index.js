
import {initAudio} from './audio.js'


async function main() {

  document.body.style.margin = 0;
  document.body.style.height = "100%";
  document.body.style.lineHeight = "150%";
  document.body.style.fontFamily = 'Arial,Helvetica,sans-serif';
  document.body.style.fontSize = '2em';

  const stage = document.createElement("div");
  stage.id = "stage";
  stage.style.width = "100%";
  stage.style.height = "100%";
  stage.style.position = "relative";

  const container = document.createElement("div");
  container.id = 'container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100vh';
  container.style.width = '100vw';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';

  stage.appendChild(container)
  document.body.appendChild(stage);

  const text = document.createElement("p");
  text.innerHTML = 'Test!';

  container.appendChild(text);

  const audio = initAudio();


}

window.addEventListener("load", main);
