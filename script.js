// Select all cell elements and the status text element
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

// Initialize the game variables
let currentPlayer = 'X';
let board = Array(9).fill('');

// Define the possible winning combinations
const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Add click event listeners to all cells
cells.forEach(cell => cell.addEventListener('click', handleClick));

// Add click event listener to the restart button
restartBtn.addEventListener('click', resetGame);

// Function to handle cell clicks
function handleClick(e) {
    const index = e.target.dataset.index; // Get the index of the clicked cell

    // Prevent clicking on an occupied cell or after the game is over
    if (board[index] !== '' || checkWinner()) return;

    // Update the board and display the current player's symbol
    board[index] = currentPlayer;
    e.target.textContent = currentPlayer;

    // Check if the current player has won
    if (checkWinner()) {
        statusText.textContent = `${currentPlayer} Wins! 🎉`;
        highlightWinningCells();
    } 
    // Check if the game is a draw
    else if (board.every(cell => cell !== '')) {
        statusText.textContent = `It's a Draw! 🤝`;
    } 
    // Switch turns
    else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusText.textContent = `Player ${currentPlayer}'s Turn`;
    }
}

// Function to check if there is a winner
function checkWinner() {
    return winningCombinations.some(combination => {
        return combination.every(index => board[index] === currentPlayer);
    });
}

// Function to highlight winning cells
function highlightWinningCells() {
    winningCombinations.forEach(combination => {
        if (combination.every(index => board[index] === currentPlayer)) {
            combination.forEach(index => {
                cells[index].style.backgroundColor = '#f5ba42';
                cells[index].style.color = '#1e1e1e';
            });
        }
    });
}

// Function to reset the game
function resetGame() {
    board.fill('');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.style.backgroundColor = '#333';
        cell.style.color = '#f0f0f0';
    });
    currentPlayer = 'X';
    statusText.textContent = `Player ${currentPlayer}'s Turn`;
}
