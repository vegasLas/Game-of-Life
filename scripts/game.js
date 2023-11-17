'use strict'
class Loader {
    hide() {
        document.body.classList.remove('loader-active')
    }
    show() {
        document.body.classList.add('loader-active')
    }
}
const loader = new Loader()
/**
 * Represents a utility class for handling neighbor coordinates in a grid.
 */
class Neighbors {
    /**
     * The predefined set of relative coordinates for neighbors.
	 * @private
     * @type {number[][]}
     */
    neighbors = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], /** Cell */ [0, 1],
        [1, -1], [1, 0], [1, 1],
    ];

    /**
     * @description Function helps ensure that the resulting axle coordinate stays within the valid range
     * defined by the axle size, preventing it from going below zero or exceeding the maximum allowed value.
     * @private
     * @param {number} axleCoordinate - The original axle coordinate.
     * @param {number} offset - The offset to be applied to the original coordinate.
     * @param {number} axleSize - The size of the axle, defining the valid range.
     * @returns {number} - The adjusted axle coordinate.
     */
    #applyOffset(axleCoordinate, offset, axleSize) {
        const newAxleCoordinate = axleCoordinate + offset;
        const lessThanZero = newAxleCoordinate < 0;

        if (lessThanZero) {
            return axleSize - 1;
        }

        const moreThanAxleSize = newAxleCoordinate > (axleSize - 1);

        if (moreThanAxleSize) {
            return 0;
        }

        return newAxleCoordinate;
    }

    /**
     * @description Counts the number of live neighbors for a given cell in the grid.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
	 * @param {number} rowsAmount - General amount of rows.
     * @param {number} colsAmount - General amount of cols.
     * @param {Map<Number, Set<number>>} prevCoordinates - The two-dimensional array representing the grid.
     * @returns {number} - The count of live neighbors for the specified cell.
     */
    count(row, col, rowsAmount, colsAmount, prevCoordinates) {
        const amount =  this.neighbors.reduce((count, [offsetRow, offsetCol]) => {
            const newRow = this.#applyOffset(row, offsetRow, rowsAmount);
            const newCol = this.#applyOffset(col, offsetCol, colsAmount);

            if (newRow >= 0 && newRow < rowsAmount && newCol >= 0 && newCol < colsAmount) {
                count += prevCoordinates.get(newRow)?.has(newCol) ? 1 : 0;
            }

            return count;
        }, 0);
        return amount
    }
}


/**
 * Represents a grid for the Game of Life.
 */
class Grid {
    #neighbors = new Neighbors();
    
    #rows = 10;

    #cols = 10;

    #changableRows = 0;

    #changableCols = 0;

    #prevCoordinates = new Map();

    #curCoordinates = new Map();

    /**
     * Toggles the state of a cell in the grid.
     * @private
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     * @param {HTMLElement} target - The HTML element representing the cell.
     */
    #toggleCell(row, col, target) {
        const cols = this.#curCoordinates.get(row)
        if (cols) {
            const isBlack = cols.has(col)
            if (isBlack) 
                cols.delete(col)
            else
                cols.add(col)
            target.style.backgroundColor = isBlack ? 'white' : 'black';
        }
        else {
            this.#curCoordinates.set(row, new Set([col]))
            target.style.backgroundColor = 'black';
        }
    }

    /**
     * Paints cells on the grid based on a map of coordinates.
     * @private
     * @param {Map} map - The map of coordinates.
     * @param {string} color - The color to paint the cells.
     */
    #paintCells(map, color) {
        map.forEach((cols, row) => {
            cols.forEach(col => {
                const cell = document.getElementById(`${row}_${col}`)
                cell.style.backgroundColor = color;
            })
        })
    }

    /**
     * Renders the grid by painting the current and previous coordinates.
     * @private
     */
    #render() {
        this.#paintCells(this.#prevCoordinates, 'white')
        this.#paintCells(this.#curCoordinates, 'black')
    }

    /**
     * Gets extreme coordinates based on the current coordinates.
     * @private
     * @returns {{rowsExtremeCoordinates: number[], colsExtremeCoordinates: number[]}} - Extreme coordinates.
     */
    #getExtremeCoordinates() {
        function filterMinMax(array, edge) {
            const min = Math.min(...array);
            const max = Math.max(...array);
            if ((min - 1) <= 0 || (max + 1) >= edge)
                return [0, edge - 1]
            return  [min - 1, max + 1]
        }
        const tempRows = []
        const tempCols = []
        this.#curCoordinates.forEach((cols, row) => {
            tempRows.push(row)
            tempCols.push(...cols)
        })
        return {
            rowsExtremeCoordinates: filterMinMax(tempRows, this.#rows),
            colsExtremeCoordinates: filterMinMax(Array.from(new Set(tempCols)), this.#cols) 
        }
    }

    /**
     * Initializes the current coordinates based on the rules of the game.
     * @private
     */
    #initCurCoordinates() {
        const {
            colsExtremeCoordinates,
            rowsExtremeCoordinates
        } = this.#getExtremeCoordinates()
        this.#prevCoordinates = new Map(this.#curCoordinates)
        this.#curCoordinates = new Map()
        const [minRow, maxRow] = rowsExtremeCoordinates 
        for (let row = minRow; row <= maxRow; row++) {
            let prevCols = this.#prevCoordinates.get(row)
            const [minCol, maxCol] = colsExtremeCoordinates
            const curCols = new Set()
            for (let col = minCol; col <= maxCol; col++) { 
                const neighborsAmount = this.#neighbors.count(row, col, this.#rows, this.#cols, this.#prevCoordinates);
                let isLive = (prevCols?.has(col) && neighborsAmount >= 2) ||  neighborsAmount === 3
                if (isLive) {
                    curCols.add(col)
                }
            }
            if (curCols.size) this.#curCoordinates.set(row, curCols)
        }
    }

    /**
     * Updates the grid based on the rules of the game.
     * Any live cell with fewer than two live neighbors dies.
     * Any live cell with two or three live neighbors lives.
     * Any live cell with more than three live neighbors dies.
     * Any dead cell with exactly three live neighbors becomes a live cell.
     */
    update() {
        this.#initCurCoordinates();
        this.#render();
    }

    /**
     * Changes the number of rows in the grid.
     * @param {number} val - The new value for the number of rows.
     */
    changeRows(val) {
        this.#changableRows = val ?? 0;
    }

    /**
     * Changes the number of columns in the grid.
     * @param {number} val - The new value for the number of columns.
     */
    changeCols(val) {
        this.#changableCols = val ?? 0;
    }

    /**
     * Generates random cells on the grid.
     */
    generateRandomCells() {
        loader.show()
        setTimeout(() => {
            this.clear()
            const density = Math.random().toFixed(1);
            for (let row = 0; row < this.#rows; row++) {
                let cols = new Set();
                for (let col = 0; col < this.#cols; col++) {
                    // Randomly decide if the cell is alive based on density
                    if (Math.random() < density)
                    cols.add(col);
                }
                this.#curCoordinates.set(row, cols);
            }
            this.#paintCells(this.#curCoordinates, 'black')
            loader.hide()
        }, 5)
    }

    /**
     * Applies new rows and columns to the grid.
     */
    applyNewRowsAndCols() {
        this.#cols = this.#changableCols
        this.#rows = this.#changableRows
        this.clear();
        this.createCells();
    }

    /**
     * Creates cells in the grid based on the specified rows and columns.
     */
    createCells() {
        loader.show()
        setTimeout(() => {
            const gridContainer = document.getElementById('grid-container');
            gridContainer.style.gridTemplateColumns = `repeat(${this.#cols}, 20px)`;
            gridContainer.innerHTML = '';
            for (let row = 0; row < this.#rows; row++) {
                for (let col = 0; col < this.#cols; col++) {
                    const cell = document.createElement('div');
                    cell.classList.add('cell');
                    cell.id = `${row}_${col}`;
                    cell.addEventListener('click', (event) => this.#toggleCell(row, col, event.target));
                    gridContainer.appendChild(cell);
                }
            }
            loader.hide()
        }, 5)
    }

    /**
     * Clears cells from the grid.
     */
    clear() {
        this.#paintCells(this.#curCoordinates, 'white')
        this.#curCoordinates = new Map()    
    }

    /**
     * Checks if the grid is empty.
     * @returns {boolean} - True if the grid is empty, false otherwise.
     */
    isCellsEmpty() {
        return this.#curCoordinates.size === 0;
    }
}

/**
 * Represents a Game of Life instance.
 */
class Game {

    #intervalId;
    
    interval = 200;

    /**
     * The Grid instance associated with the game.
     * @type {Grid}
     */
    grid = new Grid();

    /**
     * Binds event listeners to various UI elements.
     */
    #bindEvents() {
        const startBtn = document.getElementById('start-btn');
        startBtn.addEventListener('click', () => this.#start());

        const stopBtn = document.getElementById('stop-btn');
        const clearBtn = document.getElementById('clear-btn');
        stopBtn.addEventListener('click', () => this.#stop());
        clearBtn.addEventListener('click', () => {
            this.#stop();
            this.grid.clear();
        });

        const rowsInput = document.getElementById('rows-input');
        rowsInput.addEventListener('change', (event) => {
            let val = event.target.value;
            if (val < 0) {
                val = Math.abs(val);
                event.target.value = val;
            }
            this.grid.changeRows(val);
        });

        const colsInput = document.getElementById('cols-input');
        colsInput.addEventListener('change', (event) => {
            let val = event.target.value;
            if (val < 0) {
                val = Math.abs(val);
                event.target.value = val;
            }
            this.grid.changeCols(val);
        });

        const applyBtn = document.getElementById('apply-btn');
        applyBtn.addEventListener('click', () => this.grid.applyNewRowsAndCols());

        const generateBtn = document.getElementById('generate-btn');
        generateBtn.addEventListener('click', () => this.grid.generateRandomCells());
    }

    #start() {
        clearInterval(this.#intervalId);
        this.#intervalId = setInterval(() => {
            this.grid.update();
            if (this.grid.isCellsEmpty())
                clearInterval(this.#intervalId);
        }, this.interval);
    }

    #stop() {
        clearInterval(this.#intervalId);
    }

    /**
     * Initializes the game by creating grid cells and binding events.
     */
    init() {
        this.grid.createCells();
        this.#bindEvents();
    }
}
const game = new Game()

window.addEventListener('load', () => {
    game.init()
})
