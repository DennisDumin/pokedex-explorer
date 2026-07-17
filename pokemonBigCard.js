import {
  getPokemonImage,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
} from './script.js';
import { getPokemon } from './src/api/pokemon-api.js';
import {
  getLoadedPokemon,
  getLoadedPokemonAt,
} from './src/state/pokemon-store.js';
import {
  beginRequest,
  clearRequestError,
  showRequestError,
} from './src/ui/request-feedback.js';
import { acquireScrollLock } from './src/ui/scroll-lock.js';
import { cardHTML } from './pokemonBigCardHTML.js';
import {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvoltionChainNr,
  generateMovesHTML,
} from './pokemonCardMenu.js';

let detailRequestVersion = 0;
let menuRequestVersion = 0;
let releaseDetailScrollLock = null;

/*Show Pokemon Infos*/
async function renderOneCard(i) {
  const requestVersion = ++detailRequestVersion;
  menuRequestVersion += 1;
  const storedPokemon = getLoadedPokemonAt(i);

  if (!storedPokemon) return;

  clearRequestError();
  releaseDetailScrollLock ??= acquireScrollLock();
  document.getElementById("big-card-background").style.display = "flex";
  document.getElementById("big-card-background").classList.add("overlayClass");
  let lastId = fetchPokemonLast(i);
  let nextId = fetchPokemonNext(i);
  let oneCardDiv = document.getElementById("show-big-card");
  oneCardDiv.classList.add("show-big-card");
  let audio = new Audio(storedPokemon['cries']['latest']);
  audio.volume = 0.25;
  audio.play();

  const finishRequest = beginRequest();

  try {
    const currentPokemon = await getPokemon(storedPokemon.id);

    if (requestVersion !== detailRequestVersion) return;

    generateCardHTML(currentPokemon, i, lastId, nextId);
    await renderMenuPointContent(1, i, requestVersion);
  } catch {
    if (requestVersion === detailRequestVersion) {
      showRequestError({
        message: 'The Pokémon details could not be loaded. Please try again.',
        onRetry: () => {
          if (requestVersion !== detailRequestVersion) return Promise.resolve();
          return renderOneCard(i);
        },
      });
    }
  } finally {
    finishRequest();
  }
}

function fetchPokemonLast(i) {
  return i > 0 ? i - 1 : getLoadedPokemon().length - 1;
}

function fetchPokemonNext(i) {
  return i + 1 >= getLoadedPokemon().length ? 0 : i + 1;
}

function generateCardHTML(currentPokemon, i, lastId, nextId) {
  let name = getPokemonName(currentPokemon);
  let id = getPokemonNumber(currentPokemon);
  let pokemonType0 = currentPokemon["types"]["0"]["type"]["name"];
  let pokemonType1 = currentPokemon["types"][1] ? currentPokemon["types"][1]["type"]["name"] : null;
  let backgroundColor = getTypeColor(pokemonType0, pokemonType1);
  let backgroundColor0 = getTypeColor(pokemonType0);
  let backgroundColor1 = getTypeColor(pokemonType1);
  let image = getPokemonImage(currentPokemon);

  let oneCardDiv = document.getElementById("show-big-card");
  oneCardDiv.innerHTML = ``;
  oneCardDiv.innerHTML = cardHTML(backgroundColor, backgroundColor0, lastId, i, nextId, backgroundColor1, image, id, name, pokemonType1, pokemonType0);
}

/*Close Card*/
function closeCard(i) {
  detailRequestVersion += 1;
  menuRequestVersion += 1;
  clearRequestError();
  releaseDetailScrollLock?.();
  releaseDetailScrollLock = null;
  document.getElementById("big-card-background").classList.remove("overlayClass");

  let oneCardDiv = document.getElementById("show-big-card");
  oneCardDiv.classList.remove("show-big-card");

  document.getElementById("Pokemon_Card" + i).style.display = "none";
}

/*Changing Menu-Point*/
function changeMenuPoint(SelectedMenuPoint) {
  for (let k = 1; k < 5; k++) {
    const MenuPoint = document.getElementById("Menu_Point" + [k]);

    MenuPoint.classList.remove("selectedMenuPoint");
  }

  document
    .getElementById("Menu_Point" + SelectedMenuPoint)
    .classList.add("selectedMenuPoint");
}

async function renderMenuPointContent(Menupoint, i, expectedDetailVersion = detailRequestVersion) {
  const requestVersion = ++menuRequestVersion;
  const storedPokemon = getLoadedPokemonAt(i);

  if (!storedPokemon || expectedDetailVersion !== detailRequestVersion) return;

  clearRequestError();
  document.getElementById("content").classList.remove("pokemonEvolutionClass");
  document.getElementById("content").classList.remove("arrangeMoveSection");
  changeMenuPoint(Menupoint);

  const finishRequest = beginRequest();
  const isCurrentRequest = () =>
    requestVersion === menuRequestVersion &&
    expectedDetailVersion === detailRequestVersion;

  try {
    const currentPokemon = await getPokemon(storedPokemon.id);

    if (!isCurrentRequest()) return;

    if (Menupoint === 1) {
      await generateAboutHTML(currentPokemon, isCurrentRequest);
    }

    if (Menupoint === 2) {
      await generateBaseStatsHTML(currentPokemon, isCurrentRequest);
    }

    if (Menupoint === 3) {
      await generateEvoltionChainNr(currentPokemon, isCurrentRequest);
      if (!isCurrentRequest()) return;
      document.getElementById("content").classList.add("pokemonEvolutionClass");
    }

    if (Menupoint === 4) {
      generateMovesHTML(currentPokemon);
    }
  } catch {
    if (isCurrentRequest()) {
      showRequestError({
        message: 'The Pokémon information could not be loaded. Please try again.',
        onRetry: () => {
          if (!isCurrentRequest()) return Promise.resolve();
          return renderMenuPointContent(Menupoint, i, expectedDetailVersion);
        },
      });
    }
  } finally {
    finishRequest();
  }
}

function closeBigCard() {
  detailRequestVersion += 1;
  menuRequestVersion += 1;
  clearRequestError();
  releaseDetailScrollLock?.();
  releaseDetailScrollLock = null;
  document.getElementById("big-card-background").style.display = "none";
}

function doNotClose(event) {
  event.stopPropagation();
}

export {
  closeBigCard,
  closeCard,
  doNotClose,
  renderMenuPointContent,
  renderOneCard,
};
