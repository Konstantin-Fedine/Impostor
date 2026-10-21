const PLAYER_NAMES_KEY = "impostor-player-names";
const defaultPlayerCount = 4;
const screenTrack = document.getElementById("screen-track");
const playersOption = document.getElementById("players-option");
const playersBack = document.getElementById("players-back");
const impostorsOption = document.getElementById("impostors-option");
const impostorsBack = document.getElementById("impostors-back");
const categoriesOption = document.getElementById("categories-option");
const categoriesBack = document.getElementById("categories-back");
const startGameButton = document.getElementById("start-game-button");
const gameBack = document.getElementById("game-back");
const passDeviceButton = document.getElementById("pass-device-button");
const revealImpostorsButton = document.getElementById("reveal-impostors-button");
const impostorScreen = document.querySelector(".impostor-screen");
const categoryScreen = document.querySelector(".category-screen");
const gameScreen = document.querySelector(".game-screen");
const dealingPhase = document.getElementById("dealing-phase");
const finishPhase = document.getElementById("finish-phase");
const gameStartMessage = document.getElementById("game-start-message");
const roundPlayerProgress = document.getElementById("round-player-progress");
const startPlayerAnnouncement = document.getElementById("start-player-announcement");
const roundResults = document.getElementById("round-results");
const impostorResultsList = document.getElementById("impostor-results-list");
const impostorHintsOption = document.getElementById("impostor-hints-option");
const roleCards = [...document.querySelectorAll("[data-role-card]")];
const playerList = document.getElementById("player-list");
const playerListScroll = document.getElementById("player-list-scroll");
const activePlayerCount = document.getElementById("active-player-count");
const playerCountValue = document.getElementById("player-count-value");
const impostorCountValue = document.getElementById("impostor-count-value");
const impostorOptions = document.getElementById("impostor-options");
const categoryOptions = document.getElementById("category-options");
const categoryCountValue = document.getElementById("category-count-value");
const activeCategoryCount = document.getElementById("active-category-count");
const addPlayerForm = document.getElementById("add-player-form");
const newPlayerName = document.getElementById("new-player-name");
const deletePlayerButton = document.getElementById("delete-player-button");
const addPlayerButton = document.getElementById("add-player-button");
const playerScreen = document.querySelector(".player-screen");
const homeScreen = document.querySelector(".home-screen");
const playerFormMessage = document.getElementById("player-form-message");
const minPlayerCount = 3;
const maxPlayerCount = 20;
const impostorCountKey = "impostor-count";
const randomImpostorCountKey = "random-impostor-count";
const impostorHintsKey = "impostor-hints-enabled";
const selectedCategoriesKey = "selected-category-ids";
const impostorOptionCount = 6;
let categories = [];
let activeRoleCard = roleCards[0];
let nextRoleCard = roleCards[1];
let roundTimer = null;
let roundStartTimer = null;
let roundTransitionCleanup = null;
let roleCardPointerId = null;
let roleCardDragStartY = 0;
let roleCardDragStartOffset = 0;
let roleCardRevealDistance = 0;
let roleCardCloseCleanup = null;
let round = {
  phase: "idle",
  players: [],
  currentPlayerIndex: 0,
  allPlayersSeen: false,
  word: "",
  tip: "",
  starter: "",
  options: null,
  isCardRevealed: false,
  isTransitionLocked: false,
  isResultRevealed: false,
};

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
let impostorCount = getStoredImpostorCount();
let randomImpostorCount = getStoredRandomImpostorCount();
let randomSwitchAnimation = null;
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

function getMaximumImpostorCount() {
  return Math.max(1, Math.floor(playerNames.length / 2 - 1));
}

function getStoredImpostorCount() {
  let storedValue;
  try {
    storedValue = localStorage.getItem(impostorCountKey);
  } catch (error) {
    console.error("Impostor-Anzahl konnte nicht geladen werden.", error);
    return 1;
  }

  const storedCount = Number.parseInt(storedValue, 10);
  let randomMode = false;
  try {
    randomMode = localStorage.getItem(randomImpostorCountKey) === "true";
  } catch (error) {
    console.error("Impostor-Einstellung konnte nicht geladen werden.", error);
    return 1;
  }
  const maximumCount = randomMode
    ? playerNames.length
    : Math.max(1, Math.floor(playerNames.length / 2 - 1));
  if (!Number.isInteger(storedCount) || storedCount < 1) {
    return 1;
  }

  const normalizedCount = Math.min(storedCount, maximumCount);
  if (normalizedCount !== storedCount) {
    try {
      localStorage.setItem(impostorCountKey, String(normalizedCount));
    } catch (error) {
      console.error("Impostor-Anzahl konnte nicht gespeichert werden.", error);
    }
  }
  return normalizedCount;
}

function getStoredRandomImpostorCount() {
  try {
    return localStorage.getItem(randomImpostorCountKey) === "true";
  } catch (error) {
    console.error("Zufällige Impostor-Anzahl konnte nicht geladen werden.", error);
    return false;
  }
}

function getStoredImpostorHints() {
  try {
    return localStorage.getItem(impostorHintsKey) === "true";
  } catch (error) {
    console.error("Hinweis-Einstellung konnte nicht geladen werden.", error);
    return false;
  }
}

function getStoredCategoryIds() {
  let storedIds;
  try {
    storedIds = localStorage.getItem(selectedCategoriesKey);
  } catch (error) {
    console.error("Kategorien konnten nicht geladen werden.", error);
    return new Set();
  }

  if (storedIds === null) {
    return new Set();
  }

  try {
    const ids = JSON.parse(storedIds);
    if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) {
      throw new Error("Ungültige Kategorie-Auswahl gespeichert.");
    }
    return new Set(ids);
  } catch (error) {
    console.error("Kategorien konnten nicht geladen werden.", error);
    return new Set();
  }
}

function saveImpostorCount() {
  try {
    localStorage.setItem(impostorCountKey, String(impostorCount));
  } catch (error) {
    console.error("Impostor-Anzahl konnte nicht gespeichert werden.", error);
  }
}

function saveRandomImpostorCount() {
  try {
    localStorage.setItem(randomImpostorCountKey, String(randomImpostorCount));
  } catch (error) {
    console.error("Zufällige Impostor-Anzahl konnte nicht gespeichert werden.", error);
  }
}

function saveImpostorHints() {
  try {
    localStorage.setItem(impostorHintsKey, String(impostorHintsOption.checked));
  } catch (error) {
    console.error("Hinweis-Einstellung konnte nicht gespeichert werden.", error);
  }
}

function saveSelectedCategoryIds() {
  try {
    localStorage.setItem(selectedCategoriesKey, JSON.stringify([...selectedCategoryIds]));
  } catch (error) {
    console.error("Kategorien konnten nicht gespeichert werden.", error);
  }
}

const selectedCategoryIds = getStoredCategoryIds();
impostorHintsOption.checked = getStoredImpostorHints();

function updateCategoryCount() {
    const count = selectedCategoryIds.size;
    const label = count === 0
      ? "Keine Kategorien"
      : `${count} ${count === 1 ? "Kategorie" : "Kategorien"}`;
    categoryCountValue.textContent = label;
    activeCategoryCount.textContent = label;
  }

function renderCategories() {
    categoryOptions.innerHTML = "";
    categories.forEach((category, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "option category-option";
      if (index === 0) {
        option.classList.add("impostor-option-first");
      }
      if (categories.length === 1) {
        option.classList.add("category-option-single");
      }
      const isSelected = selectedCategoryIds.has(category.id);
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
      option.innerHTML = `
        <span class="category-icon" aria-hidden="true"></span>
        <span class="category-details">
          <span class="category-name">${category.name}</span>
          ${category.description ? `<span class="category-description">${category.description}</span>` : ""}
        </span>
        ${isSelected ? `
          <svg class="impostor-option-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        ` : ""}
      `;
      option.addEventListener("click", () => {
        if (selectedCategoryIds.has(category.id)) {
          selectedCategoryIds.delete(category.id);
        } else {
          selectedCategoryIds.add(category.id);
        }
        saveSelectedCategoryIds();
        updateCategoryCount();
        renderCategories();
      });
      categoryOptions.append(option);
    });
  }

async function loadCategories() {
    try {
      const response = await fetch("data/categories.json");
      if (!response.ok) {
        throw new Error(`Kategorien konnten nicht geladen werden (${response.status}).`);
      }
      const data = await response.json();
      if (
        !data ||
        !Array.isArray(data.categories) ||
        data.categories.some(category =>
          !category ||
          typeof category.id !== "string" ||
          !category.id.trim() ||
          typeof category.name !== "string" ||
          !category.name.trim() ||
          !Array.isArray(category.words)
        )
      ) {
        throw new Error("Die Kategorien-Datei hat ein ungültiges Format.");
      }
      categories = data.categories;
      const availableCategoryIds = new Set(categories.map(category => category.id));
      for (const categoryId of selectedCategoryIds) {
        if (!availableCategoryIds.has(categoryId)) {
          selectedCategoryIds.delete(categoryId);
        }
      }
      saveSelectedCategoryIds();
      renderCategories();
    } catch (error) {
      console.error("Kategorien konnten nicht geladen werden.", error);
  }
}

function setRoleCardPlayer(card, playerIndex) {
  const player = round.players[playerIndex];
  const playerLabel = card.querySelector("[data-card-player]");
  const secret = card.querySelector("[data-card-secret]");
  playerLabel.textContent = player ? player.name : "";
  secret.replaceChildren();
  secret.classList.remove("is-impostor");
  secret.removeAttribute("aria-hidden");

  if (!player) {
    return;
  }

  secret.classList.toggle("is-impostor", player.isImpostor);
  const content = document.createElement("div");
  content.className = "deal-card-content";
  if (player.isImpostor) {
    const role = document.createElement("p");
    role.className = "deal-card-role";
    role.textContent = "IMPOSTOR";
    content.append(role);

    if (round.options?.impostorHintsEnabled && round.tip) {
      const tip = document.createElement("p");
      tip.className = "deal-card-tip";
      tip.textContent = `Tipp: ${round.tip}`;
      content.append(tip);
    }
  } else {
    const word = document.createElement("p");
    word.className = "deal-card-word";
    word.textContent = round.word;
    content.append(word);
  }

  secret.append(content);
  content.setAttribute("aria-hidden", "true");
  content.style.visibility = "hidden";
  content.style.opacity = "0";
}

function resetRoleCardPositions() {
  roleCards.forEach(card => {
    card.classList.add("is-resetting");
    card.classList.remove("is-leaving", "is-arriving", "is-dragging", "is-round-restarting");
    card.style.removeProperty("transform");
    card.querySelector("[data-card-cover]").style.removeProperty("transform");
    card.setAttribute("aria-hidden", "true");
    card.removeAttribute("tabindex");
  });

  activeRoleCard = roleCards[0];
  nextRoleCard = roleCards[1];
  activeRoleCard.classList.add("is-current");
  activeRoleCard.classList.remove("is-next");
  activeRoleCard.setAttribute("aria-hidden", "false");
  activeRoleCard.setAttribute("tabindex", "0");
  activeRoleCard.setAttribute("aria-describedby", "card-reveal-instruction");
  nextRoleCard.classList.add("is-next");
  nextRoleCard.classList.remove("is-current");
  requestAnimationFrame(() => {
    roleCards.forEach(card => card.classList.remove("is-resetting"));
  });
}

function renderCurrentRoundPlayer() {
  const player = round.players[round.currentPlayerIndex];
  roleCardRevealDistance = 0;
  setPassDeviceButtonVisible(false);
  roundPlayerProgress.textContent =
    `${round.currentPlayerIndex + 1} von ${round.players.length}`;
  passDeviceButton.textContent =
    round.currentPlayerIndex === round.players.length - 1 ? "Spiel starten" : "Weitergeben";
  activeRoleCard.setAttribute("aria-label", `Geheime Karte von ${player.name}, verdeckt`);
  setRoleCardPlayer(activeRoleCard, round.currentPlayerIndex);
  setRoleCardPlayer(nextRoleCard, round.currentPlayerIndex + 1);
  passDeviceButton.disabled = false;
}

function setPassDeviceButtonVisible(isVisible) {
  passDeviceButton.classList.toggle("is-visible", isVisible);
  passDeviceButton.setAttribute("aria-hidden", String(!isVisible));
  passDeviceButton.tabIndex = isVisible ? 0 : -1;
}

function setRoleCardReveal(card, isVisible, progress = 0) {
  const secret = card.querySelector("[data-card-secret]");
  const content = secret.querySelector(".deal-card-content");
  round.isCardRevealed = isVisible;
  if (content) {
    content.setAttribute("aria-hidden", String(!isVisible));
    content.style.visibility = isVisible ? "visible" : "hidden";
    content.style.opacity = String(progress);
  }
  if (isVisible) {
    const currentPlayer = round.players[round.currentPlayerIndex];
    if (currentPlayer) {
      currentPlayer.hasViewedCard = true;
      round.allPlayersSeen = round.players.every(player => player.hasViewedCard);
    }
  }

  card.setAttribute(
    "aria-label",
    isVisible
      ? `Geheime Karte von ${round.players[round.currentPlayerIndex]?.name ?? ""}, aufgedeckt`
      : `Geheime Karte von ${round.players[round.currentPlayerIndex]?.name ?? ""}, verdeckt`
  );
  card.classList.toggle("is-revealed", isVisible);
}

function concealCurrentRoleCard() {
  if (!activeRoleCard) {
    return;
  }
  roleCardCloseCleanup?.();
  roleCardCloseCleanup = null;
  setPassDeviceButtonVisible(false);
  setRoleCardReveal(activeRoleCard, false);
  activeRoleCard.classList.remove("is-dragging");
  activeRoleCard.querySelector("[data-card-cover]").style.removeProperty("transform");
  roleCardRevealDistance = 0;
  roleCardPointerId = null;
}

function closeCurrentRoleCard() {
  if (!activeRoleCard || round.phase !== "dealing") {
    return;
  }
  const cover = activeRoleCard.querySelector("[data-card-cover]");
  const closingCard = activeRoleCard;
  const closingRound = round;
  const closingPlayerIndex = round.currentPlayerIndex;
  const wasMoving = roleCardRevealDistance > 0;
  const passButtonWasVisible = passDeviceButton.classList.contains("is-visible");
  roleCardCloseCleanup?.();
  roleCardCloseCleanup = null;
  roleCardRevealDistance = 0;
  activeRoleCard.classList.remove("is-dragging");
  cover.style.transform = "translate3d(0, 0, 0)";
  roleCardPointerId = null;
  setRoleCardReveal(activeRoleCard, false);
  const currentPlayer = round.players[round.currentPlayerIndex];
  if (!currentPlayer?.hasViewedCard) {
    return;
  }
  const showButtonAfterClose = () => {
    roleCardCloseCleanup?.();
    roleCardCloseCleanup = null;
    if (
      round === closingRound &&
      round.phase === "dealing" &&
      activeRoleCard === closingCard &&
      round.currentPlayerIndex === closingPlayerIndex
    ) {
      setPassDeviceButtonVisible(true);
    }
  };
  if (passButtonWasVisible || !wasMoving) {
    showButtonAfterClose();
    return;
  }
  const handleCoverTransitionEnd = event => {
    if (event.target === cover && event.propertyName === "transform") {
      showButtonAfterClose();
    }
  };
  cover.addEventListener("transitionend", handleCoverTransitionEnd);
  const closeTimer = setTimeout(showButtonAfterClose, 350);
  roleCardCloseCleanup = () => {
    clearTimeout(closeTimer);
    cover.removeEventListener("transitionend", handleCoverTransitionEnd);
  };
}

function resetRound() {
  clearTimeout(roundTimer);
  clearTimeout(roundStartTimer);
  roundTimer = null;
  roundStartTimer = null;
  roundTransitionCleanup?.();
  roundTransitionCleanup = null;
  concealCurrentRoleCard();
  round = {
    phase: "idle",
    players: [],
    currentPlayerIndex: 0,
    allPlayersSeen: false,
    word: "",
    tip: "",
    starter: "",
    options: null,
    isCardRevealed: false,
    isTransitionLocked: false,
    isResultRevealed: false,
  };
  resetRoleCardPositions();
  roundPlayerProgress.textContent = "";
  startPlayerAnnouncement.textContent = "";
  impostorResultsList.replaceChildren();
  dealingPhase.hidden = false;
  finishPhase.hidden = true;
  roundResults.hidden = true;
  revealImpostorsButton.hidden = true;
  revealImpostorsButton.disabled = false;
  revealImpostorsButton.classList.remove("is-restart");
  revealImpostorsButton.textContent = "Imposter aufdecken";
  startPlayerAnnouncement.classList.remove("is-fading");
  finishPhase.classList.remove("is-entering");
  revealImpostorsButton.disabled = false;
  passDeviceButton.disabled = false;
}

function startLocalRound(restartSettings = null) {
  gameStartMessage.textContent = "";
  const roundPlayerNames = restartSettings?.playerNames ?? playerNames;
  const roundCategoryIds = restartSettings?.selectedCategoryIds ?? [...selectedCategoryIds];
  const roundImpostorCount = restartSettings?.selectedImpostorCount ?? impostorCount;
  const roundUsesRandomImpostorCount =
    restartSettings?.isImpostorCountRandom ?? randomImpostorCount;
  const roundUsesImpostorHints =
    restartSettings?.impostorHintsEnabled ?? impostorHintsOption.checked;
  if (!roundPlayerNames.length || roundPlayerNames.some(name => !name.trim())) {
    gameStartMessage.textContent = "Bitte überprüfe die Spielerliste.";
    return;
  }

  const usableCategories = categories.filter(category =>
    roundCategoryIds.includes(category.id) &&
    Array.isArray(category.words) &&
    category.words.some(entry => entry && typeof entry.word === "string" && entry.word.trim())
  );
  const usableWords = usableCategories.flatMap(category =>
    category.words.filter(entry => entry && typeof entry.word === "string" && entry.word.trim())
  );
  if (!usableWords.length) {
    gameStartMessage.textContent = roundCategoryIds.length
      ? "In den ausgewählten Kategorien gibt es kein verwendbares Spielwort."
      : "Bitte wähle zuerst mindestens eine Kategorie aus.";
    return;
  }

  const maximumAllowed = roundUsesRandomImpostorCount
    ? roundPlayerNames.length
    : Math.max(1, Math.floor(roundPlayerNames.length / 2 - 1));
  if (
    !Number.isInteger(roundImpostorCount) ||
    roundImpostorCount < 1 ||
    roundImpostorCount > maximumAllowed
  ) {
    gameStartMessage.textContent = "Die ausgewählte Impostor-Anzahl ist ungültig.";
    return;
  }

  resetRound();
  const chosenWord = usableWords[Math.floor(Math.random() * usableWords.length)];
  const configuredImpostorCount = roundUsesRandomImpostorCount
    ? Math.floor(Math.random() * roundImpostorCount) + 1
    : roundImpostorCount;
  const impostorIndexes = new Set();
  while (impostorIndexes.size < configuredImpostorCount) {
    impostorIndexes.add(Math.floor(Math.random() * roundPlayerNames.length));
  }

  round = {
    phase: "dealing",
    players: roundPlayerNames.map((name, index) => ({
      name: name.trim(),
      isImpostor: impostorIndexes.has(index),
      hasViewedCard: false,
    })),
    currentPlayerIndex: 0,
    allPlayersSeen: false,
    word: chosenWord.word.trim(),
    tip: typeof chosenWord.tip === "string" ? chosenWord.tip.trim() : "",
    starter: roundPlayerNames[
      Math.floor(Math.random() * roundPlayerNames.length)
    ].trim(),
    options: {
      selectedCategoryIds: usableCategories.map(category => category.id),
      selectedImpostorCount: roundImpostorCount,
      actualImpostorCount: configuredImpostorCount,
      isImpostorCountRandom: roundUsesRandomImpostorCount,
      impostorHintsEnabled: roundUsesImpostorHints,
    },
    isCardRevealed: false,
    isTransitionLocked: false,
    isResultRevealed: false,
  };

  resetRoleCardPositions();
  renderCurrentRoundPlayer();
  if (restartSettings) {
    activeRoleCard.classList.add("is-round-restarting");
  } else {
    switchToScreen("game");
    homeScreen.setAttribute("aria-hidden", "true");
    homeScreen.inert = true;
    playerScreen.setAttribute("aria-hidden", "true");
    playerScreen.inert = true;
    impostorScreen.setAttribute("aria-hidden", "true");
    impostorScreen.inert = true;
    categoryScreen.setAttribute("aria-hidden", "true");
    categoryScreen.inert = true;
    gameScreen.removeAttribute("inert");
    gameScreen.setAttribute("aria-hidden", "false");
    screenTrack.addEventListener(
      "transitionend",
      () => gameBack.focus({ preventScroll: true }),
      { once: true }
    );
  }
}

activeRoleCard.addEventListener("animationend", event => {
  if (event.animationName === "deal-card-restart-enter") {
    activeRoleCard.classList.remove("is-round-restarting");
  }
});

function beginRoundFinish() {
  dealingPhase.hidden = true;
  round.isTransitionLocked = false;
}

function prepareRoundFinishTransition() {
  round.phase = "starting";
  dealingPhase.hidden = true;
  finishPhase.hidden = false;
  finishPhase.classList.add("is-entering");
  startPlayerAnnouncement.textContent = `${round.starter} fängt an`;
  startPlayerAnnouncement.classList.remove("is-fading");
  revealImpostorsButton.hidden = false;
  revealImpostorsButton.disabled = false;
  void startPlayerAnnouncement.offsetWidth;
  startPlayerAnnouncement.classList.add("is-fading");
  roundStartTimer = setTimeout(() => {
    if (round.phase !== "starting") {
      return;
    }
    if (round.phase === "starting") {
      round.phase = "ready";
      startPlayerAnnouncement.textContent = "";
    }
    roundStartTimer = null;
  }, 5000);
}

finishPhase.addEventListener("animationend", event => {
  if (event.target === finishPhase && event.animationName === "round-finish-phase-slide-in") {
    finishPhase.classList.remove("is-entering");
  }
});

function finishRoleCardTransition(outgoingCard, incomingCard) {
  if (
    round.phase !== "transitioning" &&
    !(round.phase === "starting" && !incomingCard)
  ) {
    return;
  }

  if (!incomingCard) {
    round.isTransitionLocked = false;
    beginRoundFinish();
    return;
  }

  round.currentPlayerIndex += 1;
  round.phase = "dealing";
  round.isTransitionLocked = false;
  activeRoleCard = incomingCard;
  nextRoleCard = outgoingCard;
  activeRoleCard.classList.add("is-current", "is-resetting");
  activeRoleCard.classList.remove("is-next", "is-arriving");
  activeRoleCard.setAttribute("aria-hidden", "false");
  activeRoleCard.setAttribute("tabindex", "0");
  activeRoleCard.setAttribute("aria-describedby", "card-reveal-instruction");
  nextRoleCard.classList.add("is-next", "is-resetting");
  nextRoleCard.classList.remove("is-current", "is-leaving");
  nextRoleCard.setAttribute("aria-hidden", "true");
  nextRoleCard.removeAttribute("tabindex");
  nextRoleCard.removeAttribute("aria-describedby");
  nextRoleCard.style.removeProperty("transform");
  void nextRoleCard.offsetWidth;
  requestAnimationFrame(() => {
    roleCards.forEach(card => card.classList.remove("is-resetting"));
  });
  renderCurrentRoundPlayer();
}

function passDeviceToNextPlayer() {
  if (round.phase !== "dealing" || round.isTransitionLocked) {
    return;
  }

  round.isTransitionLocked = true;
  round.phase = "transitioning";
  concealCurrentRoleCard();
  passDeviceButton.disabled = true;

  const hasNextPlayer = round.currentPlayerIndex < round.players.length - 1;
  const outgoingCard = activeRoleCard;
  const incomingCard = hasNextPlayer ? nextRoleCard : null;
  const transitioningRound = round;
  if (incomingCard) {
    incomingCard.setAttribute("aria-hidden", "false");
    setRoleCardPlayer(incomingCard, round.currentPlayerIndex + 1);
  }

  let transitionCompleted = false;
  const completeTransition = () => {
    if (transitionCompleted) {
      return;
    }
    transitionCompleted = true;
    clearTimeout(roundTimer);
    roundTimer = null;
    outgoingCard.removeEventListener("transitionend", handleTransitionEnd);
    roundTransitionCleanup = null;
    if (round !== transitioningRound) {
      return;
    }
    finishRoleCardTransition(outgoingCard, incomingCard);
  };
  const handleTransitionEnd = event => {
    if (event.target !== outgoingCard || event.propertyName !== "transform") {
      return;
    }
    completeTransition();
  };
  outgoingCard.addEventListener("transitionend", handleTransitionEnd);
  roundTransitionCleanup = () => {
    outgoingCard.removeEventListener("transitionend", handleTransitionEnd);
  };
  roundTimer = setTimeout(completeTransition, 650);
  requestAnimationFrame(() => {
    outgoingCard.classList.add("is-leaving");
    if (incomingCard) {
      incomingCard.classList.remove("is-next");
      incomingCard.classList.add("is-arriving");
    } else {
      prepareRoundFinishTransition();
    }
  });
}

function handleRoundFinishButton() {
  if (round.phase === "results") {
    const restartSettings = {
      playerNames: round.players.map(player => player.name),
      ...round.options,
    };
    startLocalRound(restartSettings);
    return;
  }

  if (!["starting", "ready"].includes(round.phase) || round.isResultRevealed) {
    return;
  }
  clearTimeout(roundStartTimer);
  roundStartTimer = null;
  round.phase = "results";
  round.isResultRevealed = true;
  const impostorNames = round.players
    .filter(player => player.isImpostor)
    .map(player => player.name);
  startPlayerAnnouncement.classList.remove("is-fading");
  startPlayerAnnouncement.textContent =
    impostorNames.length === 0
      ? "Niemand war der Impostor"
      : `${impostorNames.join(" & ")} ${impostorNames.length === 1 ? "war" : "waren"} der Impostor`;
  roundResults.hidden = true;
  revealImpostorsButton.textContent = "Neu starten";
  revealImpostorsButton.classList.add("is-restart");
}

function beginRoleCardDrag(event) {
  if (
    event.currentTarget !== activeRoleCard ||
    round.phase !== "dealing" ||
    round.isTransitionLocked ||
    event.button > 0
  ) {
    return;
  }
  event.preventDefault();
  roleCardPointerId = event.pointerId;
  roleCardDragStartY = event.clientY;
  roleCardDragStartOffset = roleCardRevealDistance;
  roleCardCloseCleanup?.();
  roleCardCloseCleanup = null;
  activeRoleCard.setPointerCapture(event.pointerId);
  activeRoleCard.classList.add("is-dragging");
}

function moveRoleCardDrag(event) {
  if (event.pointerId !== roleCardPointerId || round.phase !== "dealing") {
    return;
  }
  const cover = activeRoleCard.querySelector("[data-card-cover]");
  const maximumRevealDistance = cover.offsetHeight * (2 / 3);
  roleCardRevealDistance = Math.max(
    0,
    Math.min(
      roleCardDragStartOffset + roleCardDragStartY - event.clientY,
      maximumRevealDistance
    )
  );
  cover.style.transform = `translate3d(0, ${-roleCardRevealDistance}px, 0)`;
  const revealProgress = Math.min(1, roleCardRevealDistance / 72);
  setRoleCardReveal(activeRoleCard, revealProgress > 0.08, revealProgress);
}

function endRoleCardDrag(event) {
  if (event.pointerId !== roleCardPointerId) {
    return;
  }
  closeCurrentRoleCard();
}

function handleRoleCardKeydown(event) {
  if (
    ![" ", "Enter"].includes(event.key) ||
    round.phase !== "dealing" ||
    round.isTransitionLocked ||
    event.repeat
  ) {
    return;
  }
  event.preventDefault();
  activeRoleCard.classList.add("is-dragging");
  roleCardCloseCleanup?.();
  roleCardCloseCleanup = null;
  const cover = activeRoleCard.querySelector("[data-card-cover]");
  const maximumRevealDistance = cover.offsetHeight * (2 / 3);
  roleCardRevealDistance = maximumRevealDistance;
  cover.style.transform = `translate3d(0, ${-roleCardRevealDistance}px, 0)`;
  setRoleCardReveal(activeRoleCard, true, 1);
}

function handleRoleCardKeyup(event) {
  if ([" ", "Enter"].includes(event.key)) {
    event.preventDefault();
    closeCurrentRoleCard();
  }
}

roleCards.forEach(card => {
  card.addEventListener("pointerdown", beginRoleCardDrag);
  card.addEventListener("pointermove", moveRoleCardDrag);
  card.addEventListener("pointerup", endRoleCardDrag);
  card.addEventListener("pointercancel", endRoleCardDrag);
  card.addEventListener("keydown", handleRoleCardKeydown);
  card.addEventListener("keyup", handleRoleCardKeyup);
  card.addEventListener("lostpointercapture", endRoleCardDrag);
});

function renderImpostorOptions() {
  const maximumCount = getMaximumImpostorCount();
  if (!randomImpostorCount && impostorCount > maximumCount) {
    impostorCount = maximumCount;
    saveImpostorCount();
  }

  impostorCountValue.textContent = randomImpostorCount ? "Zufällig" : impostorCount;
  impostorOptions.innerHTML = "";

  const randomOption = document.createElement("div");
  randomOption.className = "option impostor-random-option";
  randomOption.innerHTML = `
    <span class="option-name">Zufällige Anzahl</span>
    <label class="option-switch">
      <input class="switch-input" type="checkbox"
        aria-label="Zufällige Impostor-Anzahl aktivieren"
        ${randomImpostorCount ? "checked" : ""}>
      <span class="switch-thumb"></span>
    </label>
  `;
  randomOption.querySelector(".switch-input").addEventListener("change", event => {
    randomImpostorCount = event.target.checked;
    randomSwitchAnimation = randomImpostorCount ? "on" : "off";
    saveRandomImpostorCount();
    if (!randomImpostorCount && impostorCount > getMaximumImpostorCount()) {
      impostorCount = getMaximumImpostorCount();
      saveImpostorCount();
    }
    renderImpostorOptions();
  });
  impostorOptions.append(randomOption);
  if (randomSwitchAnimation) {
    randomOption.querySelector(".option-switch").classList.add(
      `is-switching-${randomSwitchAnimation}`
    );
    randomOption.querySelector(".switch-thumb").classList.add(
      `is-switching-${randomSwitchAnimation}`
    );
    randomSwitchAnimation = null;
  }

  const optionCount = randomImpostorCount ? playerNames.length : impostorOptionCount;
  for (let count = 1; count <= optionCount; count += 1) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "option impostor-option";
    if (count === 1) {
      option.classList.add("impostor-option-first");
    }
    option.disabled = !randomImpostorCount && count > maximumCount;
    const isSelected = count === impostorCount;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-pressed", String(isSelected));
    option.innerHTML = `
      <span class="option-name">${randomImpostorCount ? `Bis zu ${count} Impostor` : `${count} Impostor`}</span>
      ${isSelected ? `
        <svg class="impostor-option-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ` : ""}
    `;

    option.addEventListener("click", () => {
      if (option.disabled) {
        return;
      }

      impostorCount = count;
      saveImpostorCount();
      if (!randomImpostorCount) {
        saveRandomImpostorCount();
      }
      renderImpostorOptions();
    });

    if (count > 1) {
      const divider = document.createElement("div");
      divider.className = "option-divider";
      impostorOptions.append(divider);
    }
    impostorOptions.append(option);
  }
}

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
  renderImpostorOptions();
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

let impostorScrollIndicatorTimeout = null;
impostorOptions.addEventListener("scroll", () => {
  impostorOptions.classList.add("is-scrolling");
  clearTimeout(impostorScrollIndicatorTimeout);
  impostorScrollIndicatorTimeout = setTimeout(() => {
    impostorOptions.classList.remove("is-scrolling");
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

function switchToScreen(screenName) {
  screenTrack.classList.remove(
    "show-player-screen",
    "show-impostor-screen",
    "show-category-screen",
    "show-game-screen"
  );
  void screenTrack.offsetWidth;

  requestAnimationFrame(() => {
    if (screenName !== "home") {
      screenTrack.classList.add("show-player-screen");
      if (screenName === "impostor") {
        screenTrack.classList.add("show-impostor-screen");
      }
      if (screenName === "categories") {
        screenTrack.classList.add("show-category-screen");
      }
      if (screenName === "game") {
        screenTrack.classList.add("show-game-screen");
      }
    }
  });
}

playersOption.addEventListener("click", event => {
  event.preventDefault();
  switchToScreen("player");
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
  switchToScreen("home");
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

impostorsOption.addEventListener("click", event => {
  event.preventDefault();
  switchToScreen("impostor");
  homeScreen.setAttribute("aria-hidden", "true");
  homeScreen.inert = true;
  impostorScreen.removeAttribute("inert");
  impostorScreen.setAttribute("aria-hidden", "false");
  screenTrack.addEventListener(
    "transitionend",
    () => impostorsBack.focus({ preventScroll: true }),
    { once: true }
  );
});

impostorsBack.addEventListener("click", event => {
  event.preventDefault();
  switchToScreen("home");
  homeScreen.setAttribute("aria-hidden", "false");
  homeScreen.inert = false;
  impostorScreen.setAttribute("aria-hidden", "true");
  impostorScreen.inert = true;
  screenTrack.addEventListener(
    "transitionend",
    () => impostorsOption.focus({ preventScroll: true }),
    { once: true }
  );
});

categoriesOption.addEventListener("click", event => {
  event.preventDefault();
  switchToScreen("categories");
  homeScreen.setAttribute("aria-hidden", "true");
  homeScreen.inert = true;
  categoryScreen.removeAttribute("inert");
  categoryScreen.setAttribute("aria-hidden", "false");
  screenTrack.addEventListener(
    "transitionend",
    () => categoriesBack.focus({ preventScroll: true }),
    { once: true }
  );
});

categoriesBack.addEventListener("click", event => {
  event.preventDefault();
  switchToScreen("home");
  homeScreen.setAttribute("aria-hidden", "false");
  homeScreen.inert = false;
  categoryScreen.setAttribute("aria-hidden", "true");
  categoryScreen.inert = true;
  screenTrack.addEventListener(
    "transitionend",
    () => categoriesOption.focus({ preventScroll: true }),
    { once: true }
  );
});

startGameButton.addEventListener("click", () => startLocalRound());
impostorHintsOption.addEventListener("change", saveImpostorHints);
passDeviceButton.addEventListener("click", passDeviceToNextPlayer);
revealImpostorsButton.addEventListener("click", handleRoundFinishButton);

gameBack.addEventListener("click", event => {
  event.preventDefault();
  resetRound();
  switchToScreen("home");
  homeScreen.setAttribute("aria-hidden", "false");
  homeScreen.inert = false;
  gameScreen.setAttribute("aria-hidden", "true");
  gameScreen.inert = true;
  screenTrack.addEventListener(
    "transitionend",
    () => startGameButton.focus({ preventScroll: true }),
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
gameScreen.inert = true;
renderPlayers();
updateCategoryCount();
loadCategories();
