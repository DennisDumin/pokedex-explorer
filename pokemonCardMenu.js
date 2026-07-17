/*Menu-Point About */
async function generateAboutHTML(currentPokemon, i) {
  let contentContainer = document.getElementById("content");
  contentContainer.innerHTML = ``;

  let height = getPokemonHeight(currentPokemon);
  let weight = getPokemonWeight(currentPokemon);
  let abilities = getPokemonAbilities(currentPokemon);
  let eggGroup = await getPokemonEggGroups(i);

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

async function getPokemonEggGroups(i) {
  let url = `https://pokeapi.co/api/v2/pokemon-species/${i + 1}`;
  let response = await fetch(url).catch(errorFunction);
  let currentPokemon = await response.json();
  let eggGroups = [];
  for (let j = 0; j < currentPokemon["egg_groups"].length; j++) {
    const eggGroup = currentPokemon["egg_groups"][j]["name"];
    eggGroups.push(eggGroup);
  }
  return eggGroups;
}

/*Menu-Point Base Stats*/
async function generateBaseStatsHTML(currentPokemon) {
  let contentContainer = document.getElementById("content");
  contentContainer.innerHTML = ``;
  let hpValue = await getBaseStats(currentPokemon, 0);
  let attackValue = await getBaseStats(currentPokemon, 1);
  let defenseValue = await getBaseStats(currentPokemon, 2);
  let specialAtk = await getBaseStats(currentPokemon, 3);
  let specialDef = await getBaseStats(currentPokemon, 4);
  let speedValue = await getBaseStats(currentPokemon, 5);
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
async function generateEvoltionChainNr(i) {
  loadingEvolutionChain();
  let response = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${i + 1}`
  );
  let currentPokemon = await response.json();

  let url = currentPokemon["evolution_chain"]["url"];
  let parts = url.split("/");
  let evolutionChainNumber = Number(parts[parts.length - 2]);

  await getPokemonOfOneEvolutionClass(evolutionChainNumber);
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

  console.log(speciesIDs);
  return speciesIDs;
}

async function getPokemonOfOneEvolutionClass(currentEvolutionChainNumber) {
  let pokemonID = [];
  let pokemon = [];
  let response = await fetch(
    `https://pokeapi.co/api/v2/evolution-chain/${currentEvolutionChainNumber}/`
  );

  let currentPokemonChain = await response.json();

  let speciesID = await collectSpeciesID(currentPokemonChain);
  pokemonID = pokemonID.concat(speciesID);

  for (let id of pokemonID) {
    let getNameUrl = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    let getNameJSON = await getNameUrl.json();
    let name = getPokemonName(getNameJSON);
    let weight = weightToSortPokemon(getNameJSON);
    let image = getPokemonImage(getNameJSON);
    let mainPokemonType = getNameJSON["types"]["0"]["type"]["name"];

    pokemon.push({
      name: name,
      weight: weight,
      image: image,
      type: mainPokemonType,
    });
  }
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

function loadingEvolutionChain() {
  document.getElementById("content").innerHTML = ``;
  document.body.style.overflow = 'hidden';
  document.getElementById('overlay').style.display = 'flex';
  animateLoadingDots();
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
  stopAnimateLoadingDots();
  document.getElementById('overlay').style.display = 'none';
  document.body.style.overflow = 'auto';
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
