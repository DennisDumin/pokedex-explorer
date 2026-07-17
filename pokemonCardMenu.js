import {
  getPokemonImage,
  getPokemonName,
} from './script.js';
import {
  getEvolutionChain,
  getPokemonBatch,
  getPokemonSpecies,
  getResourceId,
} from './src/api/pokemon-api.js';

/*Menu-Point About */
async function generateAboutHTML(currentPokemon, isCurrentRequest = () => true) {
  let contentContainer = document.getElementById("content");
  contentContainer.innerHTML = ``;

  let height = getPokemonHeight(currentPokemon);
  let weight = getPokemonWeight(currentPokemon);
  let abilities = getPokemonAbilities(currentPokemon);
  const speciesId = getResourceId(currentPokemon.species.url);
  const species = await getPokemonSpecies(speciesId);
  let eggGroup = getPokemonEggGroups(species);

  if (!isCurrentRequest()) return;

  contentContainer.innerHTML = /*html*/ `
      <div class="generalInformation">
          <p>Height:</p>
          <p>Weight:</p>
          <p>Abilities:</p>
          <p>Egg Group:</p>
        </div>
  
        <div class="answers">
          <p>${height}</p>
          <p>${weight}</p>
          <p>${abilities}</p>
          <p>${eggGroup}</p>
        </div>
    `;
}

function getPokemonHeight(currentPokemon) {
  let heightInMeter = currentPokemon["height"] / 10;

  let heightInFeet = (heightInMeter * 3.281).toFixed(2).replace(".", "´") + '"';

  if (heightInMeter < 1) {
    heightInMeter = heightInMeter * 100 + " cm";
  } else {
    heightInMeter = heightInMeter + " m";
  }

  return `${heightInFeet} (${heightInMeter})`;
}

function getPokemonWeight(currentPokemon) {
  let weightInKG = currentPokemon["weight"] / 10;

  let weightInPounds = (weightInKG * 0.453592).toFixed(2) + " lbs";

  weightInKG = weightInKG.toString().replace(".", ",") + " Kg";

  return `${weightInPounds} (${weightInKG})`;
}

function getPokemonAbilities(currentPokemon) {
  let abilies = currentPokemon["abilities"];
  let returnAbilities = [];
  for (let i = 0; i < abilies.length; i++) {
    const ability = abilies[i]["ability"]["name"];

    returnAbilities.push(ability);
  }
  return returnAbilities;
}

function getPokemonEggGroups(species) {
  let eggGroups = [];
  for (let j = 0; j < species["egg_groups"].length; j++) {
    const eggGroup = species["egg_groups"][j]["name"];
    eggGroups.push(eggGroup);
  }
  return eggGroups;
}

/*Menu-Point Base Stats*/
async function generateBaseStatsHTML(currentPokemon, isCurrentRequest = () => true) {
  let contentContainer = document.getElementById("content");
  contentContainer.innerHTML = ``;
  let hpValue = await getBaseStats(currentPokemon, 0);
  let attackValue = await getBaseStats(currentPokemon, 1);
  let defenseValue = await getBaseStats(currentPokemon, 2);
  let specialAtk = await getBaseStats(currentPokemon, 3);
  let specialDef = await getBaseStats(currentPokemon, 4);
  let speedValue = await getBaseStats(currentPokemon, 5);

  if (!isCurrentRequest()) return;

  contentContainer.innerHTML = /*html*/ `
      <div class="baseStats">
        <p>HP</p>
        <p>Attack</p>
        <p>Defense</p>
        <p>Sp. Att</p>
        <p>Sp. Def</p>
        <p>Speed</p>
      </div>
    <div class="baseStatsTable">
      ${hpValue}
      ${attackValue}
      ${defenseValue}
      ${specialAtk}
      ${specialDef}
      ${speedValue}
    </div>
    `;
}

async function getBaseStats(currentPokemon, value) {
  let stat = currentPokemon["stats"][value]["base_stat"];
  let barColor = getBarColor(stat);
  return /*html*/ `
    <div class="progress">
      <div class="bar" style="width:${stat}%; background-color: ${barColor}">${stat}</div>
    </div>
  `;
}

function getBarColor(value) {
  if (value > 55) {
    return "green";
  } else if (value >= 30 && value <= 54) {
    return "orange";
  } else {
    return "red";
  }
}

/* Menu-Point Evolution*/
async function generateEvoltionChainNr(currentPokemon, isCurrentRequest = () => true) {
  const speciesId = getResourceId(currentPokemon.species.url);
  const species = await getPokemonSpecies(speciesId);

  if (!isCurrentRequest()) return;

  const evolutionChainNumber = getResourceId(species.evolution_chain.url);
  await getPokemonOfOneEvolutionClass(
    evolutionChainNumber,
    isCurrentRequest,
  );
}

async function collectSpeciesID(currentPokemonChain) {
  let speciesIDs = [];

  if (
    currentPokemonChain?.["chain"]?.["evolves_to"][0]?.["evolves_to"]?.[0]?.[
    "species"
    ]["url"]
  ) {
    let firstURL =
      currentPokemonChain["chain"]["evolves_to"][0]["evolves_to"][0]["species"][
        "url"
      ].split("/");
    speciesIDs.push(firstURL[firstURL.length - 2]);
  } else {
    const URLComponents =
      currentPokemonChain["chain"]["evolves_to"][0]["species"]["url"].split(
        "/"
      );
    speciesIDs.push(URLComponents[URLComponents.length - 2]);
    const urlComponents =
      currentPokemonChain["chain"]["species"]["url"].split("/");
    speciesIDs.push(urlComponents[urlComponents.length - 2]);

    return speciesIDs;
  }

  const URLComponents =
    currentPokemonChain["chain"]["evolves_to"][0]["species"]["url"].split("/");
  speciesIDs.push(URLComponents[URLComponents.length - 2]);
  const urlComponents =
    currentPokemonChain["chain"]["species"]["url"].split("/");
  speciesIDs.push(urlComponents[urlComponents.length - 2]);

  return speciesIDs;
}

async function getPokemonOfOneEvolutionClass(
  currentEvolutionChainNumber,
  isCurrentRequest = () => true,
) {
  const currentPokemonChain = await getEvolutionChain(
    currentEvolutionChainNumber,
  );

  let speciesID = await collectSpeciesID(currentPokemonChain);
  const evolutionPokemon = await getPokemonBatch(speciesID.map(Number));

  if (!isCurrentRequest()) return;

  const pokemon = evolutionPokemon.map((entry) => {
    return {
      name: getPokemonName(entry),
      weight: weightToSortPokemon(entry),
      image: getPokemonImage(entry),
      type: entry["types"]["0"]["type"]["name"],
    };
  });

  pokemon.sort((a, b) => a.weight - b.weight);
  generateEvolutionChainHTML(pokemon);
}

function generateEvolutionChainHTML(pokemonArray) {
  let contentContainer = document.getElementById("content");
  contentContainer.innerHTML = ``;

  generateEvolutionChainHTMLFor3Pokemon(
    pokemonArray,
    contentContainer
  );
  generateEvolutionChainHTMLFor2Pokemon(
    pokemonArray,
    contentContainer
  );
}

function weightToSortPokemon(currentPokemon) {
  let weightInKG = currentPokemon["weight"] / 10;

  return weightInKG;
}

function generateEvolutionChainHTMLFor3Pokemon(
  pokemonArray,
  contentContainer
) {
  if (pokemonArray.length === 3) {
    contentContainer.innerHTML = /*html*/ `
      <div class="StageOfDev">
        <img src="${pokemonArray[0]["image"]}">
        <p>${pokemonArray[0]["name"]}</p>
      </div>
      
      <img src="./img/arrow.svg" class="evolutionArrow">
  
      <div class="StageOfDev">
        <img src="${pokemonArray[1]["image"]}">
        <p>${pokemonArray[1]["name"]}</p>
      </div>
  
      <img src="./img/arrow.svg" class="evolutionArrow">
  
      <div class="StageOfDev">
        <img src="${pokemonArray[2]["image"]}">
        <p>${pokemonArray[2]["name"]}</p>
      </div>
      `;
  }
}

function generateEvolutionChainHTMLFor2Pokemon(
  pokemonArray,
  contentContainer
) {
  if (pokemonArray.length === 2) {
    contentContainer.innerHTML = /*html*/ `
        <div class="StageOfDev">
          <img src="${pokemonArray[0]["image"]}">
          <p>${pokemonArray[0]["name"]}</p>
        </div>
  
        <img src="./img/arrow.svg" class="evolutionArrow">
  
        <div class="StageOfDev">
          <img src="${pokemonArray[1]["image"]}">
          <p>${pokemonArray[1]["name"]}</p>
        </div>
      `;
  }
}

/*Menu-Point Moves*/
function generateMovesHTML(currentPokemon) {
  let contentContainer = document.getElementById("content");
  contentContainer.classList.add("arrangeMoveSection");
  contentContainer.innerHTML = ``;
  for (let i = 0; i < currentPokemon["moves"].length; i++) {
    const OneMove = currentPokemon["moves"][i]["move"]["name"];
    contentContainer.innerHTML += /*html*/ `
        <p>${OneMove}</p>
      `;
  }
}

export {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvoltionChainNr,
  generateMovesHTML,
};
