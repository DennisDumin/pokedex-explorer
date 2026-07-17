let currentPokemon;
let allPokemon = [];
let loadedPokemons = 20;
let loadMorePokemons = 20;

async function loadPokemonApi() {
    document.body.style.overflow = 'hidden';
    document.getElementById('overlay').style.display = 'flex';
    animateLoadingDots();

    for (let i = 0; i < loadedPokemons; i++) {
        let url = `https://pokeapi.co/api/v2/pokemon/${i + 1}/`
        let response = await fetch(url);
        currentPokemon = await response.json();
        loadPokemons(currentPokemon, i);
        allPokemon.push(currentPokemon);
    }
    stopAnimateLoadingDots();
    document.getElementById('overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadPokemons(currentPokemon, i) {
    let name = getPokemonName(currentPokemon);
    let pokemonType0 = currentPokemon["types"]["0"]["type"]["name"];
    let pokemonType1 = currentPokemon["types"][1] ? currentPokemon["types"][1]["type"]["name"] : null;
    let pokemonNumber = getPokemonNumber(currentPokemon);
    let image = getPokemonImage(currentPokemon);
    let backgroundColor = getTypeColor(pokemonType0, pokemonType1);
    let backgroundColor0 = getTypeColor(pokemonType0);
    let backgroundColor1 = getTypeColor(pokemonType1);
    document.getElementById('pokemon-card').innerHTML += generatePokemonCard(name, i, pokemonType0, pokemonNumber, image, backgroundColor, pokemonType1, backgroundColor1, backgroundColor0);
}

function generatePokemonCard(name, i, pokemonType0, pokemonNumber, image, backgroundColor, pokemonType1, backgroundColor1, backgroundColor0) {
    return /*html*/ `<div class="pokedex" id="pokedex${i}" ${backgroundColor} onmouseover="showGif(${i})" onmouseout="showImg(${i})" onclick="renderOneCard(${i})">
    <div class="name-number">
        <h1 id="name">${name}</h1>
        <p id="number">${pokemonNumber}</p>
    </div>
    <div class="pokemon-img">
        <img src="${image}" id="imgSprite${i}">
    </div>
    <div class="pokemon-type">
    <p class="type" ${backgroundColor0} id="pokemonNumber">${pokemonType0}</p>
        ${checkIfType1Available(pokemonType1, backgroundColor1)}
    </div>`;
}

function getPokemonName(currentPokemon) {
    let name =
        currentPokemon["name"].charAt(0).toUpperCase() +
        currentPokemon["name"].slice(1);

    return name;
}

function getPokemonNumber(currentPokemon) {
    let pokemonID = currentPokemon["id"];

    if (pokemonID < 10) {
        return `<b>#00${pokemonID}</b>`;
    }

    if (pokemonID >= 10 && pokemonID < 100) {
        return `<b>#0${pokemonID}</b>`;
    }

    if (pokemonID >= 100) {
        return `<b>#${pokemonID}</b>`;
    }
}

function getPokemonImage(currentPokemon) {
    return currentPokemon["sprites"]["other"]["official-artwork"]["front_default"];
}

function getTypeColor(pokemonType0, pokemonType1) {
    const typeColor = {
        fire: "239, 128, 48",
        grass: "120, 200, 70",
        water: "103, 144, 240",
        steel: "170, 170, 187",
        bug: "170, 184, 33",
        poison: "68, 22, 80",
        ghost: "142, 85, 164",
        ground: "208, 149, 98",
        rock: "119, 106, 62",
        fighting: "205, 92, 92",
        normal: "168, 168, 119",
        fairy: "223, 176, 210",
        psychic: "234, 98, 165",
        electric: "247, 208, 43",
        dark: "46, 35, 28",
        ice: "28, 130, 143",
        flying: "135, 206, 235",
        dragon: "86, 112, 190"
    };

    if (pokemonType1) {
        let color0 = typeColor[pokemonType0];
        let color1 = typeColor[pokemonType1];
        return `style='background: linear-gradient(90deg, rgba(${color0}, 0.95), rgba(${color1}, 0.95));'`;
    } else {
        let color = typeColor[pokemonType0];
        return `style='background-color: rgb(${color});'`;
    }
}

function checkIfType1Available(pokemonType1, backgroundColor1) {
    if (pokemonType1) {
        return `<p class="type" ${backgroundColor1} id="pokemonNumber">${pokemonType1}</p>`;
    }
    return '';
}

function showGif(i) {
    if (allPokemon[i]['sprites']['other']['showdown']['front_default']) {
        document.getElementById(`imgSprite${i}`).src = `${allPokemon[i]['sprites']['other']['showdown']['front_default']}`;
    }
    else {
        if (allPokemon[i]['sprites']['front_default']) {
            document.getElementById(`imgSprite${i}`).src = `${allPokemon[i]['sprites']['front_default']}`;
        };
    };
}

function showImg(i) {
    if (allPokemon[i]['sprites']['other']['official-artwork']['front_default']) {
        document.getElementById(`imgSprite${i}`).src = `${allPokemon[i]['sprites']['other']['official-artwork']['front_default']}`;
    };
}

async function loadMorePokemon() {
    document.body.style.overflow = 'hidden';
    document.getElementById('overlay').style.display = 'flex';
    animateLoadingDots();

    let start = loadedPokemons;
    let end = loadedPokemons + loadMorePokemons;
    for (let i = start; i < end; i++) {
        let url = `https://pokeapi.co/api/v2/pokemon/${i + 1}/`;
        let response = await fetch(url);
        let currentPokemon = await response.json();
        console.log('Loaded pokemon', currentPokemon);
        loadPokemons(currentPokemon, i);
        allPokemon.push(currentPokemon);
    }
    loadedPokemons += loadMorePokemons;
    document.getElementById('overlay').style.display = 'none';
    stopAnimateLoadingDots();
    document.body.style.overflow = 'auto';
}

function animateLoadingDots() {
    const loadingDots = document.getElementById('loading-dots');
    loadingDots.innerText = 'Loading.';
    const intervalId = setInterval(() => {
        loadingDots.innerText += '.';
        if (loadingDots.innerText.length > 13) {
            loadingDots.innerText = 'Loading.';
        }
    }, 100);
    loadingDots.dataset.intervalId = intervalId;
}

function stopAnimateLoadingDots() {
    const loadingDots = document.getElementById('loading-dots');
    const intervalId = loadingDots.dataset.intervalId;
    clearInterval(intervalId);
}


function openCard(i) {
    let audio = new Audio(allPokemon[i]['cries']['latest']);
    audio.volume = 0.25;
    audio.play();
}

function errorFunction() {
    console.log("Fehler aufgetreten");
}

function switchAmount() {
    let amountSelect = document.getElementById('amountSelect');
    loadMorePokemons = Number(amountSelect.value);
    loadMorePokemon();
    amountSelect.value = "0";
}

/*Search Pokemon*/
async function updateVisibility(cards, filter) {
    let found = false;
    for (let oneCard of cards) {
        let name = oneCard.getElementsByTagName("h1")[0].innerText.toLowerCase();
        oneCard.style.display = name.includes(filter) ? "block" : "none";
        if (name.includes(filter)) found = true;
    }
    return found;
}

async function filterPokemon() {
    let input = document.getElementById("Search_Pokemon");
    let filter = input.value.toLowerCase();
    let loadmoreBtn = document.getElementById("load-more-button");
    let resetBtn = document.getElementById("Reset_Btn");
    let pokedex = document.getElementById("pokemon-card");
    let cards = pokedex.getElementsByClassName("pokedex");
    let filterMessage = document.getElementById("filterMessage");

    loadmoreBtn.style.display = filter === "" ? "block" : "none";
    resetBtn.style.display = filter === "" ? "none" : "block";

    if (filter.length < 3) {
        filterMessage.innerText = filter === "" ? "" : "Please enter at least 3 characters.";
        for (let oneCard of cards) {
            oneCard.style.display = "block";
        }
        return;
    }

    filterMessage.innerText = "";
    let found = await updateVisibility(cards, filter);

    if (!found) filterMessage.innerText = "No Pokémon found.";
}

function resetFilter() {
    let input = document.getElementById("Search_Pokemon");
    input.value = "";
    filterPokemon(); 
}