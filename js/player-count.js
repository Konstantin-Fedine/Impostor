const PLAYER_NAMES_KEY = "impostor-player-names";
const defaultPlayerCount = 4;
const screenTrack = document.getElementById("screen-track");
const playersOption = document.getElementById("players-option");
const playersBack = document.getElementById("players-back");
const playerList = document.getElementById("player-list");
const playerListScroll = document.getElementById("player-list-scroll");
const activePlayerCount = document.getElementById("active-player-count");
const playerCountValue = document.getElementById("player-count-value");
const addPlayerForm = document.getElementById("add-player-form");
const newPlayerName = document.getElementById("new-player-name");
const deletePlayerButton = document.getElementById("delete-player-button");
const addPlayerButton = document.getElementById("add-player-button");
const playerScreen = document.querySelector(".player-screen");
const homeScreen = document.querySelector(".home-screen");
const playerFormMessage = document.getElementById("player-form-message");
const minPlayerCount = 3;
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
    if (
      !Array.isArray(names) ||
      names.length < minPlayerCount ||
      names.length > maxPlayerCount ||
      names.some(name => typeof name !== "string")
    ) {
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
let dragPlaceholder = null;
let draggedRow = null;
let dragStartY = 0;
let dragPointerOffset = 0;
let dragStartLeft = 0;
let dragWidth = 0;
let dragHeight = 0;
let dragBorderRadii = null;
let dragActive = false;
let dragPointerY = 0;
let dragDirection = 1;
let dragAutoScrollFrame = null;
let dragMoved = false;

function setAddPlayerButtonState(isEditing, animate = false) {
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
  } else {
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

  const icon = addPlayerButton.querySelector("svg");
  if (animate && icon) {
    icon.classList.add("is-transitioning");
    icon.addEventListener(
      "animationend",
      () => icon.classList.remove("is-transitioning"),
      { once: true }
    );
  }
}

function setDeleteButtonVisibility(isVisible, animate = false) {
  const wasHidden = deletePlayerButton.hidden;
  deletePlayerButton.classList.remove("is-entering", "is-exiting");

  if (isVisible) {
    deletePlayerButton.hidden = false;
    if (animate && wasHidden) {
      deletePlayerButton.classList.add("is-entering");
    }
    return;
  }

  if (animate && !deletePlayerButton.hidden) {
    deletePlayerButton.classList.add("is-exiting");
    deletePlayerButton.addEventListener(
      "animationend",
      () => {
        deletePlayerButton.hidden = true;
        deletePlayerButton.classList.remove("is-exiting");
      },
      { once: true }
    );
  } else {
    deletePlayerButton.hidden = true;
  }
}

function updatePlayerFormState() {
  const atMaximum = playerNames.length >= maxPlayerCount;
  newPlayerName.disabled = atMaximum && selectedPlayerIndex === null;
  addPlayerButton.disabled = atMaximum && selectedPlayerIndex === null;

  if (atMaximum && selectedPlayerIndex === null) {
    newPlayerName.placeholder = "Maximal 20 Spieler";
  } else if (selectedPlayerIndex === null) {
    newPlayerName.placeholder = "Neuer Spieler";
  }
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

function clearPlayerSelection(animateAddIcon = false, animateDeleteButton = false) {
  selectedPlayerIndex = null;
  playerList.querySelectorAll(".player-row.is-selected").forEach(rowElement => {
    rowElement.classList.remove("is-selected");
  });
  newPlayerName.value = "";
  newPlayerName.placeholder = "Neuer Spieler";
  newPlayerName.classList.remove("selection-focus");
  setDeleteButtonVisibility(false, animateDeleteButton);
  setAddPlayerButtonState(false, animateAddIcon);
  clearFormMessage();
}

function renderPlayers(animateAddIcon = false, animateDeleteButton = false) {
  playerList.innerHTML = "";
  playerCountValue.textContent = playerNames.length;
  activePlayerCount.textContent = `${playerNames.length}/${maxPlayerCount}`;
  clearPlayerSelection(animateAddIcon, animateDeleteButton);
  updatePlayerFormState();

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
    menuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="12" r="1"/>
        <circle cx="9" cy="5" r="1"/>
        <circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/>
        <circle cx="15" cy="5" r="1"/>
        <circle cx="15" cy="19" r="1"/>
      </svg>
    `;

    menuButton.addEventListener("pointerdown", event => {
      event.preventDefault();
      draggedItem = item;
      dragStartY = event.clientY;
      dragPointerY = event.clientY;
      dragDirection = 1;
      const itemRect = item.getBoundingClientRect();
      dragPointerOffset = event.clientY - itemRect.top;
      dragStartLeft = itemRect.left;
      dragWidth = itemRect.width;
      dragHeight = itemRect.height;
      draggedRow = item.querySelector(".player-row");
      const rowStyle = getComputedStyle(draggedRow);
      dragBorderRadii = {
        topLeft: rowStyle.borderTopLeftRadius,
        topRight: rowStyle.borderTopRightRadius,
        bottomRight: rowStyle.borderBottomRightRadius,
        bottomLeft: rowStyle.borderBottomLeftRadius
      };
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
      const hadSelectedPlayer = selectedPlayerIndex !== null;
      playerList.querySelectorAll(".player-row.is-selected").forEach(rowElement => {
        rowElement.classList.remove("is-selected");
      });

      selectedRow.classList.add("is-selected");
      selectedPlayerIndex = playerIndex;
      newPlayerName.placeholder = "Spieler umbenennen";
      newPlayerName.value = playerNames[playerIndex];
      newPlayerName.classList.add("selection-focus");
      setDeleteButtonVisibility(true, true);
      setAddPlayerButtonState(true, !hadSelectedPlayer);
      updatePlayerFormState();
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

function updateDraggedItemPosition() {
  if (!draggedItem || !dragPlaceholder) {
    return;
  }

  draggedItem.style.top = `${dragPointerY - dragPointerOffset}px`;
  draggedItem.style.width = `${dragWidth}px`;
  draggedItem.style.height = `${dragHeight}px`;
  draggedItem.style.left = `${dragStartLeft}px`;

  const items = [...playerList.querySelectorAll(".player-item")].filter(
    item => item !== draggedItem
  );
  const previousPositions = new Map(
    items.map(item => [item, item.getBoundingClientRect().top])
  );
  if (dragDirection > 0) {
    const nextItem = dragPlaceholder.nextElementSibling;
    const nextRect = nextItem?.getBoundingClientRect();
    const shouldMoveDown =
      nextItem &&
      nextRect &&
      dragPointerY >= nextRect.top + nextRect.height / 3;

    if (shouldMoveDown) {
      playerList.insertBefore(dragPlaceholder, nextItem.nextElementSibling);
    }
  } else {
    const previousItem = dragPlaceholder.previousElementSibling;
    const previousRect = previousItem?.getBoundingClientRect();
    const shouldMoveUp =
      previousItem &&
      previousRect &&
      dragPointerY <= previousRect.bottom - previousRect.height / 3;

    if (shouldMoveUp) {
      playerList.insertBefore(dragPlaceholder, previousItem);
    }
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(item => {
      const offset = previousPositions.get(item) - item.getBoundingClientRect().top;
      if (!offset) {
        return;
      }

      item.style.transition = "none";
      item.style.transform = `translateY(${offset}px)`;
      requestAnimationFrame(() => {
        item.style.transition = "";
        item.style.transform = "";
      });
    });
  }
}

function autoScrollDraggedList() {
  if (!dragActive || !draggedItem) {
    dragAutoScrollFrame = null;
    return;
  }

  const listRect = playerListScroll.getBoundingClientRect();
  const edgeDistance = 56;
  const maxSpeed = 12;
  let scrollDelta = 0;

  if (dragPointerY < listRect.top + edgeDistance) {
    const proximity = 1 - Math.max(0, dragPointerY - listRect.top) / edgeDistance;
    scrollDelta = -Math.ceil(maxSpeed * proximity);
  } else if (dragPointerY > listRect.bottom - edgeDistance) {
    const proximity = 1 - Math.max(0, listRect.bottom - dragPointerY) / edgeDistance;
    scrollDelta = Math.ceil(maxSpeed * proximity);
  }

  if (scrollDelta) {
    const previousScrollTop = playerListScroll.scrollTop;
    playerListScroll.scrollTop += scrollDelta;
    if (playerListScroll.scrollTop !== previousScrollTop) {
      updateDraggedItemPosition();
    }
  }

  dragAutoScrollFrame = requestAnimationFrame(autoScrollDraggedList);
}

document.addEventListener("pointermove", event => {
  if (!draggedItem) {
    return;
  }

  const previousPointerY = dragPointerY;
  dragPointerY = event.clientY;
  const pointerDelta = dragPointerY - previousPointerY;
  if (pointerDelta) {
    dragDirection = pointerDelta > 0 ? 1 : -1;
  }
  if (Math.abs(dragPointerY - dragStartY) < 6) {
    return;
  }

  event.preventDefault();
  dragMoved = true;
  if (!dragActive) {
    dragActive = true;
    dragPlaceholder = document.createElement("div");
    dragPlaceholder.className = "player-drag-placeholder";
    dragPlaceholder.style.height = `${dragHeight}px`;
    draggedItem.parentNode.insertBefore(dragPlaceholder, draggedItem);
    document.body.append(draggedItem);
    document.documentElement.classList.add("is-dragging-player");
    draggedRow.style.borderTopLeftRadius = dragBorderRadii.topLeft;
    draggedRow.style.borderTopRightRadius = dragBorderRadii.topRight;
    draggedRow.style.borderBottomRightRadius = dragBorderRadii.bottomRight;
    draggedRow.style.borderBottomLeftRadius = dragBorderRadii.bottomLeft;
    dragAutoScrollFrame = requestAnimationFrame(autoScrollDraggedList);
  }

  draggedItem.classList.add("is-dragging");
  updateDraggedItemPosition();
});

let scrollIndicatorTimeout = null;
playerListScroll.addEventListener("scroll", () => {
  playerListScroll.classList.add("is-scrolling");
  clearTimeout(scrollIndicatorTimeout);
  scrollIndicatorTimeout = setTimeout(() => {
    playerListScroll.classList.remove("is-scrolling");
  }, 700);
});

document.addEventListener("pointerup", () => {
  if (!draggedItem) {
    return;
  }

  if (dragAutoScrollFrame) {
    cancelAnimationFrame(dragAutoScrollFrame);
    dragAutoScrollFrame = null;
  }

  if (dragActive && dragPlaceholder) {
    dragPlaceholder.replaceWith(draggedItem);
    playerNames = [...playerList.querySelectorAll(".player-row")].map(
      playerRow => playerNames[Number(playerRow.dataset.playerIndex)]
    );
    savePlayerNames();
  }

  if (dragActive) {
    draggedItem.classList.remove("is-dragging");
    draggedItem.style.removeProperty("width");
    draggedItem.style.removeProperty("height");
    draggedItem.style.removeProperty("left");
    draggedItem.style.removeProperty("top");
    draggedRow.style.removeProperty("border-top-left-radius");
    draggedRow.style.removeProperty("border-top-right-radius");
    draggedRow.style.removeProperty("border-bottom-right-radius");
    draggedRow.style.removeProperty("border-bottom-left-radius");
  }
  if (dragPlaceholder) {
    dragPlaceholder.remove();
  }
  document.documentElement.classList.remove("is-dragging-player");
  if (dragActive) {
    renderPlayers();
  }
  draggedItem = null;
  dragPlaceholder = null;
  draggedRow = null;
  dragPointerOffset = 0;
  dragBorderRadii = null;
  dragActive = false;
  dragPointerY = 0;
  dragDirection = 1;
  dragMoved = false;
});

document.addEventListener("pointercancel", () => {
  if (!draggedItem) {
    return;
  }

  if (dragAutoScrollFrame) {
    cancelAnimationFrame(dragAutoScrollFrame);
    dragAutoScrollFrame = null;
  }

  if (dragActive) {
    draggedItem.classList.remove("is-dragging");
    draggedItem.style.removeProperty("width");
    draggedItem.style.removeProperty("height");
    draggedItem.style.removeProperty("left");
    draggedItem.style.removeProperty("top");
    draggedRow.style.removeProperty("border-top-left-radius");
    draggedRow.style.removeProperty("border-top-right-radius");
    draggedRow.style.removeProperty("border-bottom-right-radius");
    draggedRow.style.removeProperty("border-bottom-left-radius");
    if (dragPlaceholder) {
      dragPlaceholder.replaceWith(draggedItem);
    }
  }
  document.documentElement.classList.remove("is-dragging-player");
  draggedItem = null;
  dragPlaceholder = null;
  draggedRow = null;
  dragPointerOffset = 0;
  dragBorderRadii = null;
  dragActive = false;
  dragPointerY = 0;
  dragDirection = 1;
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

  const wasEditing = selectedPlayerIndex !== null;
  savePlayerNames();
  renderPlayers(wasEditing);
  newPlayerName.focus();
});

newPlayerName.addEventListener("keydown", () => {
  newPlayerName.classList.remove("selection-focus");
  clearFormMessage();
});

deletePlayerButton.addEventListener("click", () => {
  if (selectedPlayerIndex === null || playerNames.length <= minPlayerCount) {
    if (playerNames.length <= minPlayerCount) {
      showFormMessage(`Mindestens ${minPlayerCount} Spieler sind erforderlich.`);
    }
    return;
  }

  playerNames.splice(selectedPlayerIndex, 1);
  savePlayerNames();
  renderPlayers(false, true);
  newPlayerName.focus();
});

playerScreen.addEventListener("click", event => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest(".player-row") || addPlayerForm.contains(event.target)) {
    return;
  }

  const hadSelectedPlayer = selectedPlayerIndex !== null;
  clearPlayerSelection(hadSelectedPlayer, hadSelectedPlayer);
});

newPlayerName.placeholder = "Neuer Spieler";
homeScreen.inert = false;
playerScreen.inert = true;
renderPlayers();
