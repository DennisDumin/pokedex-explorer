import { getPokemonPage } from './src/api/pokemon-api.js';
import {
    addPokemonPage,
    getLoadedPokemon,
    getLoadedPokemonAt,
    getNextPokemonOffset,
    hasMorePokemon,
} from './src/state/pokemon-store.js';
import {
    beginRequest,
    clearRequestError,
    showRequestError,
} from './src/ui/request-feedback.js';
import { preloadPokemonMedia } from './src/utils/media.js';

const DEFAULT_PAGE_SIZE = 20;

let activePageRequest = null;

function loadPokemonApi() {
    if (getLoadedPokemon().length > 0) {
        return Promise.resolve(getLoadedPokemon());
    }

    return loadNextPokemon({ limit: DEFAULT_PAGE_SIZE });
}

function loadNextPokemon({ limit = DEFAULT_PAGE_SIZE } = {}) {
    if (activePageRequest) {
        return activePageRequest;
    }

    if (!hasMorePokemon()) {
        return Promise.resolve([]);
    }

    const pageSize = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_PAGE_SIZE;

    activePageRequest = performPageLoad(pageSize).finally(() => {
        activePageRequest = null;
    });

    return activePageRequest;
}

async function performPageLoad(limit) {
    const requestedOffset = getNextPokemonOffset();
    const finishRequest = beginRequest({ disableLoadMore: true });
    clearRequestError();

    try {
        let page;

        try {
            page = await getPokemonPage({
                limit,
                offset: requestedOffset,
            });
        } catch {
            showRequestError({
                message: 'The Pokémon could not be loaded. Check your connection and try again.',
                onRetry: () => loadNextPokemon({ limit }),
            });
            return [];
        }

        try {
            await preloadPokemonMedia(page.pokemon);
            return renderPokemonPage(page);
        } catch {
            showRequestError({
                message: 'The Pokémon could not be displayed. Please try again.',
                onRetry: () => loadNextPokemon({ limit }),
            });
            return [];
        }
    } finally {
        finishRequest();
        document.getElementById('load-more-button').disabled = !hasMorePokemon();
    }
}

function renderPokemonPage(page) {
    if (page.offset !== getNextPokemonOffset()) return [];

    const loadedIds = new Set(getLoadedPokemon().map((pokemon) => pokemon.id));
    const newPokemon = page.pokemon.filter((pokemon) => !loadedIds.has(pokemon.id));
    const startIndex = getLoadedPokemon().length;
    const template = document.createElement('template');
    template.innerHTML = newPokemon
        .map((pokemon, index) => createPokemonCardMarkup(pokemon, startIndex + index))
        .join('');

    const renderedCards = Array.from(template.content.children);
    document.getElementById('pokemon-card').append(template.content);

    try {
        filterPokemon();
        return addPokemonPage(page);
    } catch (error) {
        renderedCards.forEach((card) => card.remove());
        throw error;
    }
}

function createPokemonCardMarkup(currentPokemon, i) {
    let name = getPokemonName(currentPokemon);
    let pokemonType0 = currentPokemon["types"]["0"]["type"]["name"];
    let pokemonType1 = currentPokemon["types"][1] ? currentPokemon["types"][1]["type"]["name"] : null;
    let pokemonNumber = getPokemonNumber(currentPokemon);
    let image = getPokemonImage(currentPokemon);
    let backgroundColor = getTypeColor(pokemonType0, pokemonType1);
    let backgroundColor0 = getTypeColor(pokemonType0);
    let backgroundColor1 = getTypeColor(pokemonType1);
    return generatePokemonCard(name, i, pokemonType0, pokemonNumber, image, backgroundColor, pokemonType1, backgroundColor1, backgroundColor0);
}

function generatePokemonCard(name, i, pokemonType0, pokemonNumber, image, backgroundColor, pokemonType1, backgroundColor1, backgroundColor0) {
    return /*html*/ `<div class="pokedex" id="pokedex${i}" ${backgroundColor} onmouseenter="showGif(${i})" onmouseleave="showImg(${i})" onclick="renderOneCard(${i})">
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
    </div>
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
    const pokemon = getLoadedPokemonAt(i);

    if (pokemon['sprites']['other']['showdown']['front_default']) {
        document.getElementById(`imgSprite${i}`).src = `${pokemon['sprites']['other']['showdown']['front_default']}`;
    }
    else {
        if (pokemon['sprites']['front_default']) {
            document.getElementById(`imgSprite${i}`).src = `${pokemon['sprites']['front_default']}`;
        };
    };
}

function showImg(i) {
    const pokemon = getLoadedPokemonAt(i);

    if (pokemon['sprites']['other']['official-artwork']['front_default']) {
        document.getElementById(`imgSprite${i}`).src = `${pokemon['sprites']['other']['official-artwork']['front_default']}`;
    };
}

function loadMorePokemon(limit = DEFAULT_PAGE_SIZE) {
    return loadNextPokemon({ limit });
}


function openCard(i) {
    let audio = new Audio(getLoadedPokemonAt(i)['cries']['latest']);
    audio.volume = 0.25;
    audio.play();
}

function switchAmount() {
    let amountSelect = document.getElementById('amountSelect');
    const loadMorePokemons = Number(amountSelect.value);

    if (loadMorePokemons > 0) {
        loadMorePokemon(loadMorePokemons);
    }

    amountSelect.value = "0";
}

/*Search Pokemon*/
function updateVisibility(cards, filter) {
    let found = false;
    for (let oneCard of cards) {
        let name = oneCard.getElementsByTagName("h1")[0].innerText.toLowerCase();
        oneCard.style.display = name.includes(filter) ? "block" : "none";
        if (name.includes(filter)) found = true;
    }
    return found;
}

function filterPokemon() {
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
    let found = updateVisibility(cards, filter);

    if (!found) filterMessage.innerText = "No Pokémon found.";
}

function resetFilter() {
    let input = document.getElementById("Search_Pokemon");
    input.value = "";
    filterPokemon(); 
}

export {
    checkIfType1Available,
    filterPokemon,
    getPokemonImage,
    getPokemonName,
    getPokemonNumber,
    getTypeColor,
    loadPokemonApi,
    resetFilter,
    showGif,
    showImg,
    switchAmount,
};
