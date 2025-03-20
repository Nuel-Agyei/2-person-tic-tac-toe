const supabaseUrl = 'https://zlofztoiidpsjsrwmotz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2Z6dG9paWRwc2pzcndtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQ4MzgsImV4cCI6MjA1Nzk3MDgzOH0.r5dA9GNPcvg-5IY7frK1gTPZV07uUDEeBkpOzIq5XqQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const game_id = 'd9bbb999-3b52-47bb-b4a0-bc8e6b5ca95c';
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

// Ask player for a name or symbol (defaults to first letter of name or emoji)
let name = prompt("Enter your name or symbol (e.g. 😎 or 'Player'):");
let playerSymbol = name ? name.trim()[0] : '❓'; // fallback symbol
playerSymbol = playerSymbol || '❓';

let board = Array(9).fill('');
let currentTurn = null; // whose turn is it (e.g. 'X', 'O', or an emoji)

// Initialize Supabase sync
async function init() {
    // Register yourself (we'll set player_1 or player_2 depending on who joins first)
    const { data: gameData, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', game_id)
        .single();

    if (error) {
        console.error('Error loading game state:', error);
        return;
    }

    // If no players yet, you're player_1
    let updates = {};
    if (!gameData.player_1_symbol) {
        updates.player_1_symbol = playerSymbol;
        updates.player_1_online = true;
        currentTurn = playerSymbol;
    } else if (!gameData.player_2_symbol) {
        updates.player_2_symbol = playerSymbol;
        updates.player_2_online = true;
        currentTurn = gameData.turn || gameData.player_1_symbol;
    } else {
        alert('Game is full!');
        return;
    }

    if (!gameData.turn) {
        updates.turn = currentTurn;
    }

    await supabase
        .from('games')
        .update(updates)
        .eq('id', game_id);

    // Subscribe to game updates
    supabase
        .channel('public:games')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'games' },
            payload => {
                const data = payload.new;
                board = data.board;
                currentTurn = data.turn;
                updateUI(data);
            }
        )
        .subscribe();

    // Load game board
    board = gameData.board || Array(9).fill('');
    currentTurn = gameData.turn || currentTurn;
    updateUI(gameData);
}

// Update UI
function updateUI(data) {
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
    });

    const p1 = data.player_1_symbol || 'Waiting';
    const p2 = data.player_2_symbol || 'Waiting';
    const p1Online = data.player_1_online ? '🟢' : '🔴';
    const p2Online = data.player_2_online ? '🟢' : '🔴';

    statusText.innerHTML = `
        ${p1} ${p1Online} vs ${p2} ${p2Online} <br>
        ${currentTurn}'s Turn
    `;
}

// Handle clicks
cells.forEach(cell => cell.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;

    if (board[index] !== '') return; // Cell already taken
    if (currentTurn !== playerSymbol) {
        alert("Not your turn!");
        return;
    }

    board[index] = playerSymbol;
    const nextTurn = playerSymbol === board.find(sym => sym === playerSymbol) ? getOpponentSymbol() : getOpponentSymbol();

    await supabase
        .from('games')
        .update({ board, turn: nextTurn })
        .eq('id', game_id);
}));

// Get the other player’s symbol
function getOpponentSymbol() {
    const symbols = board.filter(sym => sym !== '' && sym !== playerSymbol);
    return symbols[0] || playerSymbol; // fallback if only one player
}

// Restart button resets the board
restartBtn.addEventListener('click', async () => {
    board = Array(9).fill('');
    await supabase
        .from('games')
        .update({ board })
        .eq('id', game_id);
});

// Mark offline when closing tab
window.addEventListener('beforeunload', async () => {
    const column = playerSymbol === name[0] ? 'player_1_online' : 'player_2_online';
    await supabase
        .from('games')
        .update({ [column]: false })
        .eq('id', game_id);
});

// Start!
init();
