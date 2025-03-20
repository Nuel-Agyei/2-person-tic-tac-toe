const supabaseUrl = 'https://zlofztoiidpsjsrwmotz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2Z6dG9paWRwc2pzcndtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQ4MzgsImV4cCI6MjA1Nzk3MDgzOH0.r5dA9GNPcvg-5IY7frK1gTPZV07uUDEeBkpOzIq5XqQ'; // swap with your key!
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');
const createGameBtn = document.getElementById('create-game');
const joinGameBtn = document.getElementById('join-game');
const joinInput = document.getElementById('join-id');
const deleteGameBtn = document.getElementById('delete-game');
const gameIdDisplay = document.getElementById('game-id-display');

let board = Array(9).fill('');
let currentPlayer = null;
let playerSymbol = '';
let gameId = null;
let channel = null;

// ====================== CREATE GAME ====================== //
createGameBtn.addEventListener('click', async () => {
    gameId = crypto.randomUUID();
    playerSymbol = prompt("Pick your symbol (letter/emoji) or input your name:").trim();
    if (!playerSymbol) playerSymbol = 'X';
    else playerSymbol = playerSymbol[0].toUpperCase();

    await supabase.from('games').insert({
        id: gameId,
        board,
        player_1_symbol: playerSymbol,
        player_2_symbol: null,
        player_1_online: true,
        player_2_online: false,
        turn: playerSymbol
    });

    setupGame();
});

// ====================== JOIN GAME ====================== //
joinGameBtn.addEventListener('click', async () => {
    gameId = joinInput.value.trim();
    if (!gameId) return alert("Please enter a Game ID.");

    const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (!game || error) return alert("Game not found!");

    playerSymbol = prompt("Pick your symbol (letter/emoji) or input your name:").trim();
    if (!playerSymbol) playerSymbol = 'O';
    else playerSymbol = playerSymbol[0].toUpperCase();

    if (!game.player_2_symbol) {
        await supabase.from('games').update({
            player_2_symbol: playerSymbol,
            player_2_online: true
        }).eq('id', gameId);
    } else {
        alert('2 players already joined.');
        return;
    }

    setupGame();
});

// ====================== DELETE GAME ====================== //
deleteGameBtn.addEventListener('click', async () => {
    if (gameId) {
        await supabase.from('games').delete().eq('id', gameId);
        alert('Game deleted!');
        location.reload();
    }
});

// ====================== GAME LOGIC ====================== //
function setupGame() {
    document.getElementById('game-board').style.display = 'grid';
    restartBtn.style.display = 'inline-block';
    deleteGameBtn.style.display = 'inline-block';
    createGameBtn.style.display = 'none';
    joinGameBtn.style.display = 'none';
    joinInput.style.display = 'none';
    gameIdDisplay.textContent = `Game ID: ${gameId}`;

    subscribeToGame();
}

// ====================== SUBSCRIBE TO GAME ====================== //
async function subscribeToGame() {
    const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
    board = data.board;
    currentPlayer = data.turn;
    updateUI(data);

    channel = supabase
        .channel(`game-${gameId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
            payload => {
                const updated = payload.new;
                board = updated.board;
                currentPlayer = updated.turn;
                updateUI(updated);
            }
        )
        .subscribe();
}

// ====================== UI ====================== //
function updateUI(data) {
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
    });

    const status = currentPlayer === playerSymbol ? "Your Turn!" : "Waiting for Opponent...";
    statusText.innerHTML = `Player 1: ${data.player_1_symbol || '❓'} | Player 2: ${data.player_2_symbol || '❓'}<br>${status}`;
}

// ====================== HANDLE MOVES ====================== //
cells.forEach(cell => cell.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;
    if (board[index] || currentPlayer !== playerSymbol) return;

    board[index] = playerSymbol;
    currentPlayer = (playerSymbol === data.player_1_symbol) ? data.player_2_symbol : data.player_1_symbol;

    await supabase
        .from('games')
        .update({ board, turn: currentPlayer })
        .eq('id', gameId);
}));

// ====================== RESTART GAME ====================== //
restartBtn.addEventListener('click', async () => {
    board = Array(9).fill('');
    await supabase
        .from('games')
        .update({ board, turn: playerSymbol })
        .eq('id', gameId);
});
