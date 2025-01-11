const $gameBoard = document.querySelector("#game-board");
const $flagsScore = document.querySelector("#flags");
const $mainPlay = document.querySelector("#main-play");
const $newGameDialog = document.querySelector("#new-game-dialog");
const $sizeInputs = document.querySelectorAll("input[name='size']");
const $customValue = document.querySelector("#custom-value");
const $buttonPlay = document.querySelector("#play");
const $customValueInput = $customValue.querySelector("input");
const $gameOverDialog = document.querySelector("#game-over");
const $playAgainButtons = document.querySelectorAll(".play-again");
const $currentTime = document.querySelector("#current-time");
const $gameWonDialog = document.querySelector("#game-won");
const $gamePausedDialog = document.querySelector("#game-paused");
const $body = document.querySelector("body");
const $resetGameButton = document.querySelector("#reset-game");
const $resumeGameButton = document.querySelector("#resume-game");

let SIZE = 10;
let GAME_BOARD = getGameBoard(SIZE);
let FLAGS = getCantBooms(GAME_BOARD.length);
let CLEAN_RADIO = Math.floor(GAME_BOARD.length / 4);
let PLAYING = false;
let GAME_FINISHED = false;
const BOOM_POINTS = random(10, 20);
const CELL_POINTS = random(5, 10);
let POINTS = 0;
let INTERVAL = null;
let GAME_PAUSED = false;
let SECONDS = 0;

$sizeInputs.forEach((input) => {
  input.addEventListener("change", ({ target }) => {
    const { value } = target;
    $customValue.setAttribute("show", value === "custom");
  });
});

$buttonPlay.addEventListener("click", gameStartEvent);
$newGameDialog.addEventListener("keypress", (e) => {
  if (e.key === "Enter") gameStartEvent(e);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    if (GAME_PAUSED && PLAYING) {
      resumeGame();
      return;
    }

    if (!GAME_PAUSED && PLAYING) {
      pauseGame();
      return;
    }
  }
});

$playAgainButtons.forEach(($playAgainButton) => {
  $playAgainButton.addEventListener("click", (event) => {
    document.location.reload();
  });
});

$resetGameButton.addEventListener("click", (e) => {
  // TODO Do reset game
  resetGame();
});

$resumeGameButton.addEventListener("click", resumeGame);

function addDialogBody() {
  $body.setAttribute("dialog", "");
}

function removeDialogBody() {
  $body.removeAttribute("dialog");
}

function renderGameBoard() {
  $gameBoard.innerHTML = "";
  $gameBoard.style.setProperty("--game-board-size", GAME_BOARD.length);
  $flagsScore.innerText = `${FLAGS}🏳️`;
  $flagsScore.setAttribute(
    "cantFlagas",
    `<${FLAGS <= 5 ? "5" : FLAGS <= 15 ? "15" : ""}`
  );

  GAME_BOARD.forEach((col, colIndex) => {
    const divRow = document.createElement("div");
    divRow.classList.add("col");

    col.forEach((cell, cellIndex) => {
      const divCell = document.createElement("div");

      let text = "";
      text = cell.thereIsBoom && GAME_FINISHED ? "💣" : "";
      text = cell.thereIsFlag ? "🏳️" : text;
      text = cell.exploted ? "💥" : text;
      if (cell.cantBoomsNearby > 0 && cell.isCleaned)
        text = `${cell.cantBoomsNearby}`;

      if (cell.isCleaned) divCell.classList.add("cleaned");

      divCell.classList.add("cell");
      divCell.innerText = text;
      divCell.setAttribute("data-x", cell.x);
      divCell.setAttribute("data-y", cell.y);
      divCell.addEventListener("contextmenu", clickEvent);
      divCell.addEventListener("click", clickEvent);
      divRow.appendChild(divCell);
    });

    $gameBoard.appendChild(divRow);
  });
}

function getGameBoard(size = 10) {
  const cantBooms = getCantBooms(size);
  const booms = getBoomIndexs(cantBooms, size);

  const gameboard = [];

  for (let i = 0; i < size; i++) {
    const col = [];
    for (let j = 0; j < size; j++) {
      const putBoom = booms.find((b) => b.x === i && b.y === j) !== undefined;
      const obj = {
        x: i,
        y: j,
        thereIsFlag: false,
        thereIsBoom: putBoom,
        isCleaned: false,
        exploted: false,
        cantBoomsNearby: 0,
      };

      col.push(obj);
    }
    gameboard.push(col);
  }

  return gameboard;
}

function random(i, f) {
  return Math.floor(Math.random() * f + i);
}

function getCantBooms(size) {
  return Math.floor(size ** 2 / 5);
}

function getBoomIndexs(cantBooms, gameBoardWidth) {
  const booms = [];

  let i = 0;
  while (i < cantBooms) {
    const [x, y] = [random(0, gameBoardWidth), random(0, gameBoardWidth)];
    const thereIsBoomInCoords = booms.find((b) => b.x == x && b.y == y) != null;
    if (thereIsBoomInCoords) continue;
    booms.push({ x, y });
    i++;
  }

  return booms;
}

function revealAllBooms() {
  GAME_BOARD.forEach((col, colIndex) => {
    col.forEach((cell, cellIndex) => {
      const thereIsBoom = GAME_BOARD[colIndex][cellIndex].thereIsBoom;
      const isCleaned = GAME_BOARD[colIndex][cellIndex].isCleaned;

      GAME_BOARD[colIndex][cellIndex].cantBoomsNearby = 0;
      GAME_BOARD[colIndex][cellIndex].isCleaned = false;
      GAME_BOARD[colIndex][cellIndex].thereIsFlag = false;
    });
  });
}

function revealCell(x, y) {
  const thereIsBoom = GAME_BOARD[x][y].thereIsBoom;
  const thereIsFlag = GAME_BOARD[x][y].thereIsFlag;
  const isCleaned = GAME_BOARD[x][y].isCleaned;

  if (isCleaned || thereIsFlag) return;

  if (thereIsBoom) {
    GAME_BOARD[x][y].exploted = true;
    PLAYING = false;
    GAME_FINISHED = true;
    revealAllBooms();

    gameOver();
  }

  if (!thereIsBoom && !thereIsFlag) {
    GAME_BOARD[x][y].isCleaned = true;
    POINTS += CELL_POINTS;
  }

  const nearbyCell = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];

  let cantBoomsNearby = 0;
  nearbyCell.forEach(([nX, nY]) => {
    const [newX, newY] = [x + nX, y + nY];

    if (
      newX < 0 ||
      newY < 0 ||
      newX >= GAME_BOARD.length ||
      newY >= GAME_BOARD.length
    )
      return;

    const { thereIsBoom: thereIsBoomInNearby } = GAME_BOARD[newX][newY];

    if (thereIsBoomInNearby) cantBoomsNearby++;
  });

  if (cantBoomsNearby > 0) {
    if (!thereIsBoom) GAME_BOARD[x][y].isCleaned = true;
    GAME_BOARD[x][y].cantBoomsNearby = cantBoomsNearby;
  }
}

function revealNearbyCells(x, y) {
  const { x: x1, y: y1 } = GAME_BOARD[x][y];

  for (let l = 0; l < 4; l++) {
    let findBoom = false;
    for (let i = 0; i <= CLEAN_RADIO; i++) {
      const newX = x1 + (l >= 2 ? i : -i);

      for (let j = 0; j <= CLEAN_RADIO; j++) {
        const newY = y1 + (l >= 2 ? j : -j);
        let thereIsAvailableCell = false;

        try {
          thereIsAvailableCell = GAME_BOARD[newX][newY] != null;
        } catch {}

        if (!thereIsAvailableCell) continue;

        const thereIsBoom = GAME_BOARD[newX][newY].thereIsBoom;
        if (!thereIsBoom) revealCell(newX, newY);
        if (thereIsBoom) findBoom = true;
      }
      if (findBoom) break;
    }
  }
}

function clickEvent(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!PLAYING) return;

  const { target } = event;
  const { dataset } = target;
  const [x, y] = [parseInt(dataset.x), parseInt(dataset.y)];

  const isPrimaryButton = event.button === 0;
  const thereIsFlag = GAME_BOARD[x][y].thereIsFlag;
  const isCleaned = GAME_BOARD[x][y].isCleaned;
  const thereIsBoom = GAME_BOARD[x][y].thereIsBoom;

  if (isPrimaryButton) {
    if (thereIsFlag) return;
    if (isCleaned) return;

    revealCell(x, y);

    if (!thereIsBoom) revealNearbyCells(x, y);
  }

  if (!isPrimaryButton) {
    if (FLAGS <= 0 && !thereIsFlag) return;
    if (isCleaned) return;

    GAME_BOARD[x][y].thereIsFlag = !thereIsFlag;
    FLAGS = FLAGS + (thereIsFlag ? 1 : -1);
    if (thereIsBoom) POINTS += BOOM_POINTS;
    if (!thereIsBoom) POINTS -= CELL_POINTS;
  }

  const thereAreAllCellRevealed = GAME_BOARD.every((row) => {
    return row.every((cell) => cell.isCleaned || cell.thereIsFlag);
  });

  if (thereAreAllCellRevealed) gameWon();
  renderGameBoard();
}

function openNewGameDialog() {
  const preferences = JSON.parse(getPreferences());

  if (preferences) {
    const { isSizeCustom, sizeValue } = preferences;

    if (isSizeCustom) {
      const input = document.querySelector(
        `input[name='size'][id='size-custom']`
      );
      input.checked = true;

      $customValueInput.value = sizeValue;
      $customValue.setAttribute("show", isSizeCustom);
    }
  }

  addDialogBody();
  $newGameDialog.showModal();
}

function closeNewGameDialog() {
  $newGameDialog.close();
}

function gameStartEvent(event) {
  const $size = document.querySelector("input[name='size']:checked");
  const isSizeCustom = $size.value === "custom";

  let size = parseInt($size.value);

  if (isSizeCustom) {
    if ($customValueInput.value === "")
      return alert("El tamaño debe ser un número válido");
    if (isNaN($customValueInput.value))
      return alert("El tamaño debe ser un número válido");
    if ($customValueInput.value < 6) {
      alert("El tamaño debe ser un número entre 6 y 20");
      $customValueInput.value = 6;
      return;
    }
    if ($customValueInput.value > 20) {
      alert("El tamaño debe ser un número entre 6 y 20");
      $customValueInput.value = 20;
      return;
    }
    size = parseInt($customValueInput.value);
  }

  SIZE = size;
  savePreferences({ isSizeCustom, sizeValue: size });
  closeNewGameDialog();
  play();
}

function resetGame() {
  let flagsPut = 0;

  GAME_BOARD.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      if (GAME_BOARD[rowIndex][cellIndex].thereIsFlag) flagsPut++;

      GAME_BOARD[rowIndex][cellIndex].isCleaned = false;
      GAME_BOARD[rowIndex][cellIndex].thereIsFlag = false;
    });
  });

  $gamePausedDialog.close();
  SECONDS = 0;
  PLAYING = true;
  GAME_FINISHED = false;
  GAME_PAUSED = false;
  POINTS = 0;
  $currentTime.innerText = `${SECONDS}s`;
  if (INTERVAL) clearInterval(INTERVAL);
  INTERVAL = setInterval(timeProgress, 1000);
  FLAGS += flagsPut;
  renderGameBoard();
}

function gameOver() {
  const $endGameScore = $gameOverDialog.querySelector(".end-game-score");
  const $score = $endGameScore.querySelector("span#score");
  const $time = $endGameScore.querySelector("span#time");

  if (INTERVAL) clearInterval(INTERVAL);

  $time.innerText = SECONDS;

  $score.innerText = POINTS;

  addDialogBody();
  $gameOverDialog.showModal();
}

function gameWon() {
  const $wonGameScore = $gameWonDialog.querySelector(".won-game-score");
  const $score = $wonGameScore.querySelector("span#won-score");
  const $time = $wonGameScore.querySelector("span#won-time");

  if (INTERVAL) clearInterval(INTERVAL);

  $time.innerText = SECONDS;

  $score.innerText = POINTS;

  $gameWonDialog.showModal();
  addDialogBody();
}

function timeProgress() {
  SECONDS++;
  $currentTime.innerText = `${SECONDS}s`;
}

function pauseGame() {
  if (INTERVAL) clearInterval(INTERVAL);
  GAME_PAUSED = true;
  $gamePausedDialog.showModal();
  addDialogBody();
}

function resumeGame() {
  INTERVAL = setInterval(timeProgress, 1000);
  GAME_PAUSED = false;

  $gamePausedDialog.close();
}

function play() {
  GAME_BOARD = getGameBoard(SIZE);
  FLAGS = getCantBooms(GAME_BOARD.length);
  CLEAN_RADIO = Math.floor(GAME_BOARD.length / 4);
  PLAYING = true;
  GAME_FINISHED = false;
  POINTS = 0;

  renderGameBoard();

  INTERVAL = setInterval(timeProgress, 1000);
}

function savePreferences(preferences) {
  localStorage.setItem("preferences", JSON.stringify(preferences));
}

function getPreferences() {
  return localStorage.getItem("preferences");
}

renderGameBoard();
openNewGameDialog();
