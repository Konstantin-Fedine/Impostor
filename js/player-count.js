const PLAYER_NAMES_KEY = "impostor-player-names";
const defaultPlayerCount = 4;
const screenTrack = document.getElementById("screen-track");
const playersOption = document.getElementById("players-option");
const playersBack = document.getElementById("players-back");
const playerList = document.getElementById("player-list");
const playerCountValue = document.getElementById("player-count-value");
const addPlayerForm = document.getElementById("add-player-form");
const newPlayerName = document.getElementById("new-player-name");
const deletePlayerButton = document.getElementById("delete-player-button");
const addPlayerButton = document.getElementById("add-player-button");
const playerScreen = document.querySelector(".player-screen");
const homeScreen = document.querySelector(".home-screen");
const playerFormMessage = document.getElementById("player-form-message");
const maxPlayerCount = 20;

function getStoredPlayerNames() {
  let storedNames;

  try {
    storedNames = localStorage.getItem(PLAYER_NAMES_KEY);
  } catch (error) {
    console.error("Spielernamen konnten nicht geladen werden.", error);
    return Array.from({ length: defaultPlayerCount }, (_, index) => `Spieler ${index + 1}`);
  }

  if (!storedNames) {
    return Array.from({ length: defaultPlayerCount }, (_, index) => `Spieler ${index + 1}`);
  }

  try {
    const names = JSON.parse(storedNames);
    if (!Array.isArray(names) || names.length === 0 || names.some(name => typeof name !== "string")) {
      throw new Error("Ungültige Spielernamen gespeichert.");
    }
    return names;
  } catch (error) {
    console.error("Spielernamen konnten nicht geladen werden.", error);
    return Array.from({ length: defaultPlayerCount }, (_, index) => `Spieler ${index + 1}`);
  }
}

let playerNames = getStoredPlayerNames();
let selectedPlayerIndex = null;
let draggedItem = null;
let dragStartY = 0;
let lastPointerY = 0;
let dragMoved = false;

function setAddPlayerButtonState(isEditing) {
  addPlayerButton.setAttribute(
    "aria-label",
    isEditing ? "Spielername speichern" : "Spieler hinzufügen"
  );

  if (isEditing) {
    addPlayerButton.innerHTML = `
      <svg class="button-icon check-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    `;
    return;
  }

  addPlayerButton.innerHTML = `
    <svg class="button-icon plus-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M5 12h14"/>
      <path d="M12 5v14"/>
    </svg>
  `;
}

function savePlayerNames() {
  try {
    localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(playerNames));
  } catch (error) {
    console.error("Spielernamen konnten nicht gespeichert werden.", error);
    showFormMessage("Die Änderung konnte nicht gespeichert werden.");
  }
}

function showFormMessage(message) {
  playerFormMessage.textContent = message;
}

function clearFormMessage() {
  playerFormMessage.textContent = "";
}

function clearPlayerSelection() {
  selectedPlayerIndex = null;
  playerList.querySelectorAll(".player-row.is-selected").forEach(rowElement => {
    rowElement.classList.remove("is-selected");
  });
  newPlayerName.value = "";
  newPlayerName.placeholder = "Neuer Spieler";
  newPlayerName.classList.remove("selection-focus");
  deletePlayerButton.hidden = true;
  setAddPlayerButtonState(false);
  clearFormMessage();
}

function renderPlayers() {
  playerList.innerHTML = "";
  playerCountValue.textContent = playerNames.length;
  clearPlayerSelection();

  playerNames.forEach((name, index) => {
    const item = document.createElement("div");
    item.className = "player-item";

    const row = document.createElement("div");
    row.className = "player-row";
    row.dataset.playerIndex = index;
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `${name} auswählen`);
    row.tabIndex = 0;
    const nameElement = document.createElement("span");
    nameElement.className = "player-name";
    nameElement.textContent = name;
    nameElement.title = "Spieler auswählen";

    const menuButton = document.createElement("button");
    menuButton.className = "player-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", `${name} verschieben`);
    menuButton.textContent = "☰";

    menuButton.addEventListener("pointerdown", event => {
      draggedItem = item;
      dragStartY = event.clientY;
      lastPointerY = event.clientY;
      dragMoved = false;
      menuButton.setPointerCapture(event.pointerId);
    });

    row.addEventListener("click", () => {
      if (dragMoved) {
        dragMoved = false;
        return;
      }

      selectPlayer(index, row);
    });

    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPlayer(index, row);
      }
    });

    function selectPlayer(playerIndex, selectedRow) {
      playerList.querySelectorAll(".player-row.is-selected").forEach(rowElement => {
        rowElement.classList.remove("is-selected");
      });

      selectedRow.classList.add("is-selected");
      selectedPlayerIndex = playerIndex;
      newPlayerName.placeholder = "Spieler umbenennen";
      newPlayerName.value = playerNames[playerIndex];
      newPlayerName.classList.add("selection-focus");
      deletePlayerButton.hidden = false;
      setAddPlayerButtonState(true);
      clearFormMessage();
      newPlayerName.focus();
      newPlayerName.select();
    }

    row.addEventListener("focus", () => {
      row.classList.add("is-focused");
    });

    row.addEventListener("blur", () => {
      row.classList.remove("is-focused");
    });

    row.append(nameElement, menuButton);

    const divider = document.createElement("div");
    divider.className = "option-divider";
    item.append(divider);
    item.append(row);
    playerList.append(item);
  });
}

document.addEventListener("pointermove", event => {
  if (!draggedItem) {
    return;
  }

  if (Math.abs(event.clientY - dragStartY) < 6) {
    return;
  }

  event.preventDefault();
  dragMoved = true;
  draggedItem.classList.add("is-dragging");

  const movingDown = event.clientY > lastPointerY;
  const items = [...playerList.querySelectorAll(".player-item")].filter(
    item => item !== draggedItem
  );

  if (movingDown) {
    const targetItem = items.reduce((lastItem, item) => {
      const itemRect = item.getBoundingClientRect();
      return event.clientY >= itemRect.top ? item : lastItem;
    }, null);

    if (targetItem) {
      playerList.insertBefore(draggedItem, targetItem.nextElementSibling);
    }
  } else {
    const targetItem = items.find(item => {
      const itemRect = item.getBoundingClientRect();
      return event.clientY <= itemRect.bottom;
    });

    if (targetItem) {
      playerList.insertBefore(draggedItem, targetItem);
    }
  }

  lastPointerY = event.clientY;
});

document.addEventListener("pointerup", () => {
  if (!draggedItem) {
    return;
  }

  if (dragMoved) {
    playerNames = [...playerList.querySelectorAll(".player-row")].map(
      playerRow => playerNames[Number(playerRow.dataset.playerIndex)]
    );
    savePlayerNames();
    renderPlayers();
  }

  draggedItem = null;
  lastPointerY = 0;
  dragMoved = false;
});

document.addEventListener("pointercancel", () => {
  if (!draggedItem) {
    return;
  }

  draggedItem.classList.remove("is-dragging");
  draggedItem = null;
  lastPointerY = 0;
  dragMoved = false;
});

function switchToPlayerScreen(showPlayerScreen) {
  screenTrack.classList.toggle("show-player-screen", !showPlayerScreen);
  void screenTrack.offsetWidth;

  requestAnimationFrame(() => {
    screenTrack.classList.toggle("show-player-screen", showPlayerScreen);
  });
}

playersOption.addEventListener("click", event => {
  event.preventDefault();
  switchToPlayerScreen(true);
  homeScreen.setAttribute("aria-hidden", "true");
  homeScreen.inert = true;
  playerScreen.removeAttribute("inert");
  playerScreen.setAttribute("aria-hidden", "false");
  screenTrack.addEventListener(
    "transitionend",
    () => playersBack.focus({ preventScroll: true }),
    { once: true }
  );
});

playersBack.addEventListener("click", event => {
  event.preventDefault();
  switchToPlayerScreen(false);
  homeScreen.setAttribute("aria-hidden", "false");
  homeScreen.inert = false;
  playerScreen.setAttribute("aria-hidden", "true");
  playerScreen.inert = true;
  screenTrack.addEventListener(
    "transitionend",
    () => playersOption.focus({ preventScroll: true }),
    { once: true }
  );
});

addPlayerForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = newPlayerName.value.trim();

  if (!name) {
    showFormMessage("Bitte gib einen Namen ein.");
    newPlayerName.focus();
    return;
  }

  const duplicateIndex = playerNames.findIndex(
    (playerName, index) =>
      playerName.toLocaleLowerCase() === name.toLocaleLowerCase() &&
      index !== selectedPlayerIndex
  );

  if (duplicateIndex !== -1) {
    showFormMessage("Dieser Name ist bereits vergeben.");
    newPlayerName.focus();
    return;
  }

  if (selectedPlayerIndex === null) {
    if (playerNames.length >= maxPlayerCount) {
      showFormMessage(`Es sind maximal ${maxPlayerCount} Spieler möglich.`);
      return;
    }
    playerNames.push(name);
  } else {
    playerNames[selectedPlayerIndex] = name;
  }

  savePlayerNames();
  renderPlayers();
  newPlayerName.focus();
});

newPlayerName.addEventListener("keydown", () => {
  newPlayerName.classList.remove("selection-focus");
  clearFormMessage();
});

deletePlayerButton.addEventListener("click", () => {
  if (selectedPlayerIndex === null || playerNames.length === 1) {
    return;
  }

  playerNames.splice(selectedPlayerIndex, 1);
  savePlayerNames();
  renderPlayers();
  newPlayerName.focus();
});

playerScreen.addEventListener("click", event => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest(".player-row") || addPlayerForm.contains(event.target)) {
    return;
  }

  clearPlayerSelection();
});

newPlayerName.placeholder = "Neuer Spieler";
homeScreen.inert = false;
playerScreen.inert = true;
renderPlayers();
