let minesweeper = (function() {

	/************************************/
	// Global Variables
	/************************************/

	let self = this;                                                // making a variable for the global scope

	// Global Variables
	let gameLevelObj = defineGameLevel();
	this.gameLevel = gameLevelObj.gameLevel;
	this.maxX = gameLevelObj.maxX;                                  // Number of game columns
	this.maxY = gameLevelObj.maxY;                                  // Number of game rows
	this.maxNumBombs = gameLevelObj.maxNumBombs;                    // Number of bombs in the game
	this.allCells = (this.maxX + 1) * ( this.maxY + 1) - 1;         // Number of all cells in game
	this.markedArray = new Array(400);                   // For recursive cell opening

	// Logic Variables
	this.dead = false;                                              // Will change to true if player hits a bomb
	this.win = false;                                               // Will open all cells if player wins
	this.bombsFlagged = 0;                                          // Defines the flagged bombs already
	this.cellsOpen = 0;                                             // Defines how many open cells already
	this.markedCount = -1;                                          // Var used to open cells
	this.stackHeight = -1;                                          // For recursive cell opening stack
	this.pointingAtX = -1;                                          // Which X cell is the mouse pointing
	this.pointingAtY = -1;                                          // Which Y cell is the mouse pointing
	this.numMoves = 0;                                              // Clicks counter

	// Time Variables
	this.clockMoving  = false;                                      // Defines if the clock is moving
	this.clockActive  = false;                                      // Defines if the clock is active
	this.endPrevClock = false;                                      // Ends previous clock / start a new one
	this.currentTime = 0;                                           // Defines the current time

	// Global Arrays
	// Cells array
	this.cellArray = new Array(this.allCells);
	for (let i = 0; i <= this.allCells; i++) {
		this.cellArray[i] = {
			isBomb: false,                                              // Is the cell a bomb?
			isExposed: false,                                           // Is it open?
			isFlagged: false,                                           // Does it have a bomb flag on it?
			isQuestion: false,                                          // Question mark (if its used)
			isMarked: false,                                            // Used for recursive macro opening
			neighborBombs: 0                                            // number of surrounding bombs.  Set for all cells.
		};
	}

	// Digits array
	this.timeDigits = new Array(10);
	for (let i = 0; i <= 9; i++) {
		this.timeDigits[i] = "time" + i;
	}
	this.timeNegative = "time-";

	// Open cells class names array
	this.cellOpenIm = new Array(9);
	for (let i = 0; i <= 8; i++) {
		this.cellOpenIm[i] = "open" + i;
	}

	// All cells styles
	this.bombFlagged = "bombflagged";
	this.bombRevealed = "bombrevealed";
	this.bombMisFlagged = "bombmisflagged";
	this.bombDeath = "bombdeath";
	this.bombQuestion = "bombquestion";
	this.blankCell = "blank";

	// Settings for the bombs marking
	this.useQuestionMarks = true;
	this.useMacroOpen = true;


	/************************************/
	// Levels Management
	/************************************/

	// Cookies getter / setter
	function getCookie(cookieName) {
		let cookieSearch = cookieName + "=";
		let offset;
		let end;
		if (document.cookie.length > 0) {
			offset = document.cookie.indexOf(cookieSearch);
			if (offset !== -1) {
				offset += cookieSearch.length;
				end = document.cookie.indexOf(";", offset);
				if (end === -1)
					end = document.cookie.length;
				return unescape(document.cookie.substring(offset, end));
			}
		}
	}
	function setCookie(name, value) {
		document.cookie = name + "=" + escape(value) + "; expires=Fri,31 Dec 2040 23:59:00 GMT";
	}

	// define variables related to game level
	function defineGameLevel(){
		let gameLevel = getCookie("gameLevel");

		let maxX, maxY, maxNumBombs;

		switch(gameLevel){
			case "Custom":
				maxX = parseInt(getCookie("maxX"));
				maxY = parseInt(getCookie("maxY"));
				maxNumBombs = parseInt(getCookie("maxNumBombs"));
				break;
			case "Expert":
				maxX = 30;
				maxY = 15;
				maxNumBombs = 99;
				break;
			case "Intermediate":
				maxX = 15;
				maxY = 15;
				maxNumBombs = 40;
				break;
			default:
				gameLevel = "Beginner";
				maxX = 7;
				maxY = 7;
				maxNumBombs = 10;
				break;
		}

		// Set the cookie
		setCookie("gameLevel", gameLevel);

		return {
			gameLevel: gameLevel,
			maxX: maxX,
			maxY: maxY,
			maxNumBombs: maxNumBombs
		}
	}

	// launch game after saving the custom level form
	function launchCustomGame(newMaxX, newMaxY, newMaxNumBombs) {
		// Making sure all numbers are in range / bombs shouldn't exceed 1/3 of the board
		if ((isNaN(newMaxX)) || (newMaxX < 7) || (newMaxX > 99) ||
			(isNaN(newMaxY)) || (newMaxY < 7) || (newMaxY > 99) ||
			(isNaN(newMaxNumBombs)) || (newMaxNumBombs < 1) ||
			(newMaxNumBombs > Math.round((newMaxX+1)*(newMaxY+1) / 3))) {
			alert("Game variables are invalid:\n" +
				"Acceptable Width: 8-100\n" +
				"Acceptable Height: 8-100\n" +
				"Maximum Bombs: Up to 1/3 of all cells");
			return false;
		} else {
			// set cookie
			setCookie("gameLevel","Custom");
			setCookie("maxX", newMaxX-1);
			setCookie("maxY", newMaxY-1);
			setCookie("maxNumBombs", newMaxNumBombs);
			window.location.reload();
		}
	}

	// Select Level Logic
	function selectLevel(option){
		if ((option === "Beginner") || (option === "Intermediate") || (option === "Expert")) {
			setCookie("gameLevel", option);
			window.location.reload();

		} else if (option === "Custom") {
			document.getElementById("customFormModal").style.visibility = "visible";
		}
		return false;
	}


	/************************************/
	// Mouse Events Management
	/************************************/

	// Two functions to prevent holding mouse on one cell and releasing on another
	function cursorHoldLoc(x,y) {
		self.pointingAtX = x;
		self.pointingAtY = y;
	}
	function cursorClearLoc(x,y) {
		if ((self.pointingAtX === x) && (self.pointingAtY === y)) {
			self.pointingAtX = -1;
			self.pointingAtY = -1;
		}
	}

	// ignore mouse dragging
	function ignoreDragging(e) {
		if (e.stopPropagation) e.stopPropagation();
		if (e.preventDefault) e.preventDefault();
		e.cancelBubble = true;
		e.returnValue = false;
		return false;
	}

	// show face ooh when mouse is down
	function showMouseDown() {
		if ((!self.dead) && (!self.win)) {
			document.getElementById("smiley").className = "faceooh";
		}
	}


	/************************************/
	// Cells Opening Management
	/************************************/

	// Find cell corresponding item in array, and in game grid
	function findCellArray(x,y) {
		x = parseInt(x);
		y = parseInt(y);
		return x+y*(self.maxX+1);
	}

	// Check that the cell exists
	function checkBounds(x,y) {
		return ((0<=x) && (x<=self.maxX) && (0<=y) && (y<=self.maxY));
	}

	// open all the cells and return true if user won
	function openAllCells() {
		let userWon = true;
		for (let i=0; i<=self.maxX; i++) {
			for (let j=0; j<=self.maxY; j++) {
				let el = self.cellArray[findCellArray(i,j)];
				if (!el.isExposed) {
					if ((el.isBomb) && (!el.isFlagged)) {
						document.links[findCellArray(i,j)].className = self.bombDeath;
						userWon = false;
					}
					else if ((!el.isBomb) && (el.isFlagged)) {
						document.links[findCellArray(i,j)].className = self.bombMisFlagged;
					}
					else if (!el.isBomb) {
						document.links[findCellArray(i,j)].className = self.cellOpenIm[el.neighborBombs];
					}
				}
			}
		}
		return userWon;
	}

	// Open a cell, normally or recursively
	function openCell(x, y) {
		let el = self.cellArray[findCellArray(x, y)];
		if (el.isBomb) {
			// if the cell is a bomb, execute death
			clockStop();
			document.links[findCellArray(x, y)].className = self.bombDeath;
			document.getElementById("smiley").className = "facedead";
			el.isExposed = true;
			self.dead = true;
			updateBombsNum();
			deathShowBombs();
		} else {
			document.links[findCellArray(x, y)].className = self.cellOpenIm[el.neighborBombs];
			el.isExposed = true;
			el.isMarked = false;
			++self.cellsOpen;
			if ((el.neighborBombs === 0) && (!el.isBomb)) {
				findMatrixToOpen(x, y);
			}
			if (self.cellsOpen + self.maxNumBombs - 1 === self.allCells) {
				clockStop();
				winShowFlags();
				winShowWindow();
			}
		}
	}

	// Handle stack to open cells
	function findCellToOpen(x, y) {
		++self.markedCount;
		if (self.stackHeight < self.markedCount) {
			++self.stackHeight;
			self.markedArray[self.markedCount] = {
				x: -1,
				y: -1
			}
		}
		self.markedArray[self.markedCount].x = x;
		self.markedArray[self.markedCount].y = y;
		self.cellArray[findCellArray(x, y)].isMarked = true;
	}

	// Recursive function that uses findCellToOpen and opens all neighbouring clear cells
	function findMatrixToOpen(x, y) {
		for (let i = x - 1; i <= x + 1; i++) {
			for (let j = y - 1; j <= y + 1; j++) {
				if (checkBounds(i, j)) {
					let el = self.cellArray[findCellArray(i, j)];
					if ((!el.isBomb) &&(!el.isExposed) && (!el.isMarked) && (!el.isFlagged)) {
						findCellToOpen(i, j);
					}
				}
			}
		}
	}

	// Open all marked cells
	function openAllCellsMarked() {
		while (self.markedCount >= 0) {
			self.markedCount--;
			let el = self.markedArray[self.markedCount + 1];
			openCell(el.x, el.y);
		}
	}

	// check if cell is flagged
	function checkFlagged(x, y) {
		if (checkBounds(x, y))
			return (self.cellArray[findCellArray(x, y)].isFlagged) ? (1) : (0);
		else
			return 0;
	}

	// Find the number of flagged cells in neighbours
	function checkFlaggedMatrix(x, y) {
		let count = 0;
		for (let i = x - 1; i <= x + 1; i++) {
			for (let j = y - 1; j <= y + 1; j++) {
				if ((i !== x) || (j !== y)) { //Don't check center point
					count = count + checkFlagged(i, j);
				}
			}
		}
		return count;
	}

	// Starts the clock, and makes sure there is no bomb for the first open matrix
	function firstClick(x, y) {
		let i, j;
		// First make all open cells in the matrix has no bombs
		for (i = x - 1; i <= x + 1; i++) {
			for (j = y - 1; j <= y + 1; j++) {
				if (checkBounds(i, j)) {
					self.cellArray[findCellArray(i, j)].isExposed = true;
				}
			}
		}
		// Remove bombs from this matrix
		for (i = x - 1; i <= x + 1; i++) {
			for (j = y - 1; j <= y + 1; j++) {
				if (checkBounds(i, j)) {
					if (self.cellArray[findCellArray(i, j)].isBomb) {
						removeBomb(i, j);
						placeBombRandomLoc();
					}
				}
			}
		}
		// Put everything to normal again
		for (i = x - 1; i <= x + 1; i++) {
			for (j = y - 1; j <= y + 1; j++) {
				if (checkBounds(i, j)) {
					self.cellArray[findCellArray(i, j)].isExposed = false;
				}
			}
		}
		clockStart();
	}

	// Function to handle each cell click
	function cellClick(x, y, e) {
		if ((!self.dead) && (!self.win)) {
			document.getElementById("smiley").className = "facesmile";
			self.numMoves++;
			if ((e != null) && (e.button !== 2)) {
				if (!self.clockMoving)
					firstClick(x, y);

				let el = self.cellArray[findCellArray(x, y)];
				if (el.isExposed) {
					if ((self.useMacroOpen) && (checkFlaggedMatrix(x, y) === el.neighborBombs)) {
						findMatrixToOpen(x, y);
						openAllCellsMarked();
					}
				} else {
					if (!el.isFlagged) {
						findCellToOpen(x, y);
						openAllCellsMarked();
					}
				}
				if (self.win) {
					self.bombsFlagged = self.maxNumBombs;
					updateBombsNum();
				}
			} else {
				if (x > -1) {
					let el = self.cellArray[findCellArray(x, y)];
					if (!el.isExposed) {
						if (el.isFlagged) {
							self.bombsFlagged--;
							el.isFlagged = false;
							if (!self.useQuestionMarks)
								document.links[findCellArray(x, y)].className = self.blankCell;
							else {
								el.isQuestion = true;
								document.links[findCellArray(x, y)].className = (self.bombQuestion);
							}
						}
						else {
							if (el.isQuestion) {
								el.isQuestion = false;
								document.links[findCellArray(x, y)].className = self.blankCell;
							}
							else {
								el.isFlagged = true;
								++self.bombsFlagged;
								document.links[findCellArray(x, y)].className = self.bombFlagged;
							}
						}
						updateBombsNum();
					}
				}
			}
		}
	}

	// open all remaining cells if all bombs are marked
	function bombCountClick() {
		if ((!self.dead) && (!self.win) && ((maxNumBombs - self.bombsFlagged) === 0)) {
			clockStop();
			self.numMoves++;
			if (openAllCells()) {
				winShowWindow();
				updateBombsNum();
			} else {
				self.dead = true;
				updateBombsNum();
				document.getElementById("smiley").className = "facedead";
			}
		}
		return false;
	}


	/************************************/
	// Win / death
	/************************************/

	// if the user won, launch this.
	function winShowWindow() {
		self.win = true;
		document.getElementById("smiley").className = "facewin";
	}

	// if won, mark all closed cells as flags
	function winShowFlags() {
		for (let i=0; i<=self.maxX; i++) {
			for (let j=0; j<=self.maxY; j++) {
				let el = self.cellArray[findCellArray(i,j)];
				if ((!el.isExposed) && (!el.isFlagged)) {
					el.isFlagged = true;
					document.links[findCellArray(i,j)].className = self.bombFlagged;
				}
			}
		}
	}

	// if the user is dead show all bombs
	function deathShowBombs() {
		for (let i=0; i<=self.maxX; i++) {
			for (let j=0; j<=self.maxY; j++) {
				let el = self.cellArray[findCellArray(i,j)];
				if (!el.isExposed) {
					if ((el.isBomb) && (!el.isFlagged)) {
						document.links[findCellArray(i,j)].className =  self.bombRevealed;
					} else {
						if ((!el.isBomb) && (el.isFlagged)) {
							document.links[findCellArray(i,j)].className =  self.bombMisFlagged;
						}
					}
				}
			}
		}
	}


	/************************************/
	// Time Management / Bombs Number digits
	/************************************/

	// increase the seconds
	function moveSeconds() {
		setTimeout(function(){
			if (!self.endPrevClock) {
				if (self.clockMoving) {
					++self.currentTime;
				}
				if ((self.clockMoving) && (self.currentTime < 1000)) updateTime();
				self.clockActive = self.clockMoving;
				if (self.clockActive) {
					moveSeconds();
				}
			}
			self.endPrevClock = false;
		} , 1000);
	}

	// Stop the clock
	function clockStop() {
		self.clockMoving = false;
	}

	// Stop the clock and clear its value
	function clockClear() {
		if ((!self.clockMoving) && (self.currentTime !== 0)) {
			self.currentTime = 0;
			updateTime();
		}
		self.currentTime = -1;
		self.clockMoving = false;
	}

	// Start new clock
	function clockStart() {
		self.clockMoving = true;
		moveSeconds();
		if (self.clockActive) {
			self.endPrevClock = true;
		}
	}

	// Update the timer digits
	function updateTime() {
		let currentTime = self.currentTime;
		if (currentTime === -1) { currentTime = 0; }
		let digit = currentTime % 10;
		document.getElementById("time1s").className = self.timeDigits[digit];
		digit = Math.floor(currentTime / 10 % 10);
		document.getElementById("time10s").className = self.timeDigits[digit];
		digit = Math.floor(currentTime / 100 % 10);
		document.getElementById("time100s").className = self.timeDigits[digit];
	}

	// Updates the number of bombs left.
	function updateBombsNum() {
		if ((!self.dead) && (!self.win) && ((self.maxNumBombs-self.bombsFlagged) === 0)) {
			document.getElementById("bomb1s").className = self.timeDigits[0];
			document.getElementById("bomb10s").className = self.timeDigits[0];
			document.getElementById("bomb100s").className = self.timeDigits[0];
		} else {
			let digit = Math.abs(self.maxNumBombs-self.bombsFlagged) % 10;
			document.getElementById("bomb1s").className = self.timeDigits[digit];
			digit = Math.floor(Math.abs(self.maxNumBombs-self.bombsFlagged) / 10 % 10);
			document.getElementById("bomb10s").className = self.timeDigits[digit];
			digit = Math.floor(Math.abs(self.maxNumBombs-self.bombsFlagged) / 100 % 10);
			document.getElementById("bomb100s").className = self.timeDigits[digit];

			if (self.maxNumBombs < self.bombsFlagged) document.getElementById("bomb100s").className = self.timeNegative;
		}
	}


	/************************************/
	// Creating the game and drawing the game board
	/************************************/

	// add 1 to bombs count on neighbouring cells
	function addNeighbor(x, y) {
		if (checkBounds(x, y)) {
			let el = self.cellArray[findCellArray(x, y)];
			++el.neighborBombs;
		}
	}

	// function to handle first cell being not a bomb
	function removeNeighbor(x, y) {
		if (checkBounds(x, y)) {
			let el = self.cellArray[findCellArray(x, y)];
			el.neighborBombs--;
		}
	}

	// Placing bombs
	function placeBomb(x, y) {
		let el = self.cellArray[findCellArray(x, y)];
		if ((!el.isBomb) && (!el.isExposed)) {
			el.isBomb = true;
			for (let i = x - 1; i <= x + 1; i++) {
				for (let j = y - 1; j <= y + 1; j++) {
					addNeighbor(i, j);
				}
			}
			return true;
		} else
			return false;
	}

	// Remove bomb from first cell to open
	function removeBomb(x, y) {
		if (self.cellArray[findCellArray(x, y)].isBomb) {
			for (let i = x - 1; i <= x + 1; i++) {
				for (let j = y - 1; j <= y + 1; j++) {
					removeNeighbor(i, j);
				}
			}
			self.cellArray[findCellArray(x, y)].isBomb = false;
			return true;
		} else
			return false;
	}

	// Place bombs randomly in the grid
	function placeBombRandomLoc() {
		let bombPlaced = false;
		while (!bombPlaced) {
			let i = Math.floor(Math.random() * (self.maxX + 1));
			let j = Math.floor(Math.random() * (self.maxY + 1));
			bombPlaced = (placeBomb(i, j))
		}
	}

	// Clear all cells in the grid
	function clearGrid() {
		for (let i = 0; i <= self.maxX; i++) {
			for (let j = 0; j <= self.maxY; j++) {
				let el = self.cellArray[findCellArray(i, j)];
				el.isExposed = false;
				el.isBomb = false;
				el.isFlagged = false;
				el.isMarked = false;
				el.isQuestion = false;
				el.neighborBombs = 0;
			}
		}
	}

	// Remove all images from grid
	function clearGridImages() {
		for (let j = 0; j <= self.maxY; j++) {
			for (let i = 0; i <= self.maxX; i++) {
				if (document.links[findCellArray(i, j)].className !== self.blankCell) {
					document.links[findCellArray(i, j)].className = self.blankCell;
				}
			}
		}
	}

	// Create the grid array before drawing it
	function createBoard() {
		self.bombsFlagged = 0;
		self.cellsOpen = 0;
		clearGrid();
		updateBombsNum();
		let bombsToPlace = self.maxNumBombs;
		while (bombsToPlace !== 0) {
			placeBombRandomLoc();
			bombsToPlace--;
		}
	}

	// Function to append HTML elements
	function appendClassId(parentEle, childEle, childClass=false, childId=false){
		let ele = document.createElement(childEle);
		if(childClass) ele.setAttribute('class', childClass);
		if(childId) ele.setAttribute('id', childId);
		parentEle.appendChild(ele);
		return ele;
	}

	// Function to draw frame borders
	function drawLine(div, leftCorner, middle, rightCorner){
		appendClassId(div, "span", 'border border-h-out ' + leftCorner);
		for (let i = 0; i <= self.maxX; i++) {
			appendClassId(div, "span", 'border border-h-in ' + middle);
		}
		appendClassId(div, "span", 'border border-h-out ' + rightCorner);
	}

	// function to draw the game
	function drawGame(){
		document.body.innerHTML = "";

		// Select the game area
		let gameAreaDiv = document.createElement('div');
		gameAreaDiv.setAttribute('id', 'gameArea');
		gameAreaDiv.setAttribute('class', 'hidden');
		
		let c = document.createComment("// Draw the game area");
		document.body.appendChild(c);
		document.body.appendChild(gameAreaDiv);

		// Draw the top frame
		drawLine(gameAreaDiv,"bordertl", "bordertb", "bordertr");
		gameAreaDiv.appendChild(document.createElement("br"));
		// Draw the header area
		appendClassId(gameAreaDiv, "span", 'border border-long borderlr');

		let gameHeader = document.createElement("div");
		gameHeader.setAttribute('id', 'header');
		gameAreaDiv.appendChild(gameHeader);

		gameHeader.innerHTML += '<a onclick="return minesweeper.bombCountClick()">' +
			'<span id="bomb100s"></span>' +
			'<span id="bomb10s"></span>' +
			'<span id="bomb1s"></span></a>' +
			'<a id="smiley" class="facesmile" style="margin: 0 '+((self.maxX+1)*16-(13*6+26))/2+'px"></a>' +
			'<span id="time100s"></span>' +
			'<span id="time10s"></span>' +
			'<span id="time1s"></span>';

		appendClassId(gameAreaDiv, "span", 'border border-long borderlr');
		gameAreaDiv.appendChild(document.createElement("br"));

		// Draw the middle frame
		drawLine(gameAreaDiv,"borderjointl", "bordertb", "borderjointr");

		// Draw the game grid
		let gameGrid = document.createElement("div");
		gameGrid.setAttribute('id', 'gameBoard');
		gameAreaDiv.appendChild(gameGrid);

		for (let i = 0; i <= self.maxY; i++) {
			appendClassId(gameGrid, "span", 'border border-v-out borderlr');
			for (let j = 0; j <= self.maxX; j++) {

				let cell = document.createElement("a");
				cell.setAttribute('href', '');
				cell.setAttribute('class', 'blank');
				cell.setAttribute('column', i.toString());
				cell.setAttribute('row', j.toString());
				cell.setAttribute('name', 'cellIm'+j+'_'+i);

				gameGrid.appendChild(cell);
			}

			appendClassId(gameGrid, "span", 'border border-v-out borderlr');
			gameGrid.appendChild(document.createElement("br"));
		}

		// Draw the bottom frame
		drawLine(gameAreaDiv, "borderbl", "bordertb", "borderbr");

		c = document.createComment("// Level Selection List");
		document.body.appendChild(c);

		let levelsList = appendClassId(document.body, "ul", false, 'levelsList');
		levelsList.innerHTML =
			'<li id="levelBeginner"><a class="gameLevelSelect">Beginner</a><br /></li>' +
			'<li id="levelIntermediate"><a class="gameLevelSelect">Intermediate</a><br /></li>' +
			'<li id="levelExpert"><a class="gameLevelSelect">Expert</a><br /></li>' +
			'<li id="levelCustom"><a class="gameLevelSelect">Custom</a><br /></li>';

		let clickHandler = (e) => {
			e.preventDefault();

			if (e.target.matches('#smiley')) {
				newGame();

			} else if (e.target.matches('.gameLevelSelect')) {
				selectLevel(e.target.innerHTML);

			} else if (e.target.matches('#submitCustomForm')) {
				launchCustomGame(e.target.form.elements[0].value,
					e.target.form.elements[1].value, e.target.form.elements[2].value);
			} else {
				return false;
			}
		};
		document.addEventListener('click', clickHandler , false);
		document.addEventListener('contextmenu', clickHandler, false);

		const gameCells = document.querySelectorAll('.blank');

		gameCells.forEach(el => {
			let row = el.getAttribute("row");
			let column = el.getAttribute("column");
			el.addEventListener('mousedown', () => { showMouseDown() });
			el.addEventListener('mouseover', () =>{ cursorHoldLoc(row, column) });
			el.addEventListener('mouseout', () => { cursorClearLoc(row, column) });
			el.addEventListener('dragstart', e => { ignoreDragging(e) });
			el.addEventListener('drag', e => { ignoreDragging(e) });
			el.addEventListener('mouseup', e => { cellClick(row, column, e) });
		});

		// Activate level button
		document.getElementById("level" + self.gameLevel).className = "active";

		// Show the game board
		gameAreaDiv.style.visibility = "visible";

		// Populate the custom form area
		c = document.createComment("// Custom Form container");
		document.body.appendChild(c);
		let customFormModal = appendClassId(document.body, "div", 'popUpModal hidden', 'customFormModal');
		customFormModal.innerHTML =
			'<form id="customForm" name="CustomForm">' +
			'<label>Game columns:</label><input type="text" size="3" name="maxX" value='+self.maxX+'><br>' +
			'<label>Game rows:</label><input type="text" size="3" name="maxY" value='+self.maxY+'><br>' +
			'<label>Bombs:</label><input type="text" size="3" name="maxNumBombs" value='+self.maxNumBombs+'><br>' +
			'<input type="submit" id="submitCustomForm" value=" OK "></form>';


		document.body.appendChild(document.createElement("br"));
		let footer = appendClassId(document.body, "footer");
		footer.innerHTML = 'By <a href="http://hmz.ie/" target="_blank">@housamz</a> ' + new Date().getFullYear();
	}


	/************************************/
	// New Game
	/************************************/

	// Reset everything and new game
	function newGame() {
		self.numMoves = 0;
		self.dead = false;
		self.win = false;
		drawGame();
		clockStop();
		clockClear();
		createBoard();
		clearGridImages();
		return false;
	}

	// Calls a new game
	newGame();


	/************************************/
	// Export functions
	/************************************/

	return {
		bombCountClick: bombCountClick
	};


})();
