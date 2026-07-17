import {
  allPokemon,
  currentPokemon,
  errorFunction,
  getPokemonImage,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
} from './script.js';
import { cardHTML } from './pokemonBigCardHTML.js';
import {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvoltionChainNr,
  generateMovesHTML,
} from './pokemonCardMenu.js';

/*Show Pokemon Infos*/
async function renderOneCard(i) {
  document.getElementById("big-card-background").style.display = "flex";
  document.getElementById("big-card-background").classList.add("overlayClass");
  document.documentElement.style.overflow = "hidden";
  let lastId = await fetchPokemonLast(i);
  let nextId = await fetchPokemonNext(i);
  let oneCardDiv = document.getElementById("show-big-card");
  oneCardDiv.classList.add("show-big-card");
  let audio = new Audio(allPokemon[i]['cries']['latest']);
  audio.volume = 0.25;
  audio.play();

  let [resp, err] = await resolve(
    fetch(`https://pokeapi.co/api/v2/pokemon/${i + 1}`)
  );
  if (resp) {
    let currentPokemon = await resp.json();
    generateCardHTML(currentPokemon, i, lastId, nextId);
    renderMenuPointContent(1, i);
  }

  if (err) {
    err.catch(errorFunction);
  }
}

async function resolve(p) {
  try {
    let response = await p;
    return [response, null];
  } catch (e) {
    return [null, e];
  }
}

async function fetchPokemonLast(i) {
  let lastId;
  if ((i - 1) >= 0) { lastId = i - 1 }
  else { lastId = allPokemon.length - 1 }
  if (currentPokemon[lastId]) { }
  return Number(lastId);
}

async function fetchPokemonNext(i) {
  let nextId;
  if ((i + 1) >= allPokemon.length) { nextId = 0 }
  else { nextId = i + 1 };
  if (currentPokemon[nextId]) { }
  return Number(nextId);
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
  document.documentElement.style.overflow = "unset";
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

async function renderMenuPointContent(Menupoint, i) {
  document.getElementById("content").classList.remove("pokemonEvolutionClass");
  document.getElementById("content").classList.remove("arrangeMoveSection");
  changeMenuPoint(Menupoint);

  let [resp, err] = await resolve(
    fetch(`https://pokeapi.co/api/v2/pokemon/${i + 1}`)
  );
  if (resp) {
    let currentPokemon = await resp.json();

    if (Menupoint === 1) {
      generateAboutHTML(currentPokemon, i);
    }

    if (Menupoint === 2) {
      generateBaseStatsHTML(currentPokemon);
    }

    if (Menupoint === 3) {
      generateEvoltionChainNr(i);
      document.getElementById("content").classList.add("pokemonEvolutionClass");
    }

    if (Menupoint === 4) {
      generateMovesHTML(currentPokemon);
    }
  }

  if (err) {
    err.catch(errorFunction);
  }
}

function closeBigCard() {
  document.getElementById("big-card-background").style.display = "none";
  document.documentElement.style.overflow = "unset";
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
  resolve,
};
