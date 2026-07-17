import { checkIfType1Available } from './script.js';

function cardHTML(backgroundColor, backgroundColor0, lastId, i, nextId, backgroundColor1, image, id, name, pokemonType1, pokemonType0) {
    return /*html*/ `
  
    <main class="OnePokemonCard" ${backgroundColor} id="Pokemon_Card${i}">
      <section class="mainInfo">
        <div class="CrossAndArrowDiv">
          <div class="arrowDiv">
          <img src="./img/arrow-left.svg"
         id="Show_Previous${i}"
         onclick="renderOneCard(${lastId})"
         ${backgroundColor0}>
            <img
              src="./img/arrow-right.svg"
              ${backgroundColor}
              id="Show_Next${i}"
              onclick="renderOneCard(${nextId})"
            />
          </div>
          <img
            src="./img/cross.svg"
            ${backgroundColor1}
            class="close-OnePokemonCard"
            onclick="closeCard(${i})"
          />
        </div>
    
        <div class="arrangeNameAndId">
          <div>
            <p class="OnePokemonCard-Name" ${backgroundColor}>${name}</p>
            <div class="pokemon-type">
        <p class="type" ${backgroundColor0} id="pokemonNumber">${pokemonType0}</p>
            ${checkIfType1Available(pokemonType1, backgroundColor1)}
        </div>
          </div>
          <p class="identification">${id}</p>
        </div>
    
        <figure>
          <img src="${image}" class="OnePokemonCard-Image" />
        </figure>
      </section>
    
      <section class="infoContainer">
        <div class="stage" ${backgroundColor}></div>
        <nav>
          <div onclick="renderMenuPointContent(1,${i})">
            <h3 id="Menu_Point1" class="selectedMenuPoint">About</h3>
          </div>
          <div onclick="renderMenuPointContent(2,${i})">
            <h3 id="Menu_Point2">Base Stats</h3>
          </div>
          <div onclick="renderMenuPointContent(3,${i})">
            <h3 id="Menu_Point3">Evolution</h3>
          </div>
          <div onclick="renderMenuPointContent(4,${i})">
            <h3 id="Menu_Point4">Moves</h3>
          </div>
        </nav>
    
        <span id="content"> </span>
      </section>
    </main>
    
          `;
  }

export { cardHTML };
