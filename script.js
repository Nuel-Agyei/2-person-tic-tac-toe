// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zlofztoiidpsjsrwmotz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2Z6dG9paWRwc2pzcndtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQ4MzgsImV4cCI6MjA1Nzk3MDgzOH0.r5dA9GNPcvg-5IY7frK1gTPZV07uUDEeBkpOzIq5XqQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const gameId = 'd9bbb999-3b52-47bb-b4a0-bc8e6b5ca95c';
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

let playerRole = null; // 'player_1' or 'player_2'
let symbol = ''; // Custom symbol/emoji
let board = Array(9).fill('');
let turn = '';
let gameData = null;

// 🟢 STEP 1: Connect player
async function connectPlayer() {
    const input = prompt("Enter your name or custom symbol (letter/emoji):");
    symbol = input ? input[0] : '❓';

    // Fetch game state
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (error) return console.error('Fetch game error:', error);

    gameData = data;

    if (!data.player_1_symbol) {
        playerRole = 'player_1';
        await supabase.from('games').update({
            player_1_symbol: symbol,
            player_1_online: true
        }).eq('id', gameId);
    } else if (!data.player_2_symbol) {
        playerRole = 'player_2';
        await supabase.from('games').update({
            player_2_symbol: symbol,
            player_2_online: true
        }).eq('id', gameId);
    } else {
        alert("Game full!");
        return;
    }

    listenToGame();
    updateUI();
}

// 🟢 STEP 2: Listen to game changes
function listenToGame() {
    supabase.channel('public:games')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, payload => {
            gameData = payload.new;
            board = gameData.board;
            turn = gameData.turn;
            updateUI();
        })
        .subscribe();

    initialSync();
}

// 🟢 STEP 3: Initial sync & randomize turn
async function initialSync() {
    const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    gameData = data;
    board = data.board;
    turn = data.turn;

    // If both online and turn not yet set
    if (data.player_1_online && data.player_2_online && !data.turn) {
        const randomTurn = Math.random() < 0.5 ? data.player_1_symbol : data.player_2_symbol;
        await supabase.from('games').update({ turn: randomTurn }).eq('id', gameId);
    }

    updateUI();
}

// 🟢 STEP 4: Handle clicks
cells.forEach(cell => cell.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;

    if (board[index] !== '' || symbol !== turn) return;

    board[index] = symbol;
    const nextTurn = symbol === gameData.player_1_symbol ? gameData.player_2_symbol : gameData.player_1_symbol;

    await supabase.from('games').update({
        board,
        turn: nextTurn
    }).eq('id', gameId);
}));

// 🟢 STEP 5: UI Updates
function updateUI() {
    cells.forEach((cell, i) => {
        cell.textContent = board[i] || '';
    });

    const p1Status = gameData.player_1_online ? '🟢' : '🔴';
    const p2Status = gameData.player_2_online ? '🟢' : '🔴';
    statusText.innerHTML = `
        Player 1 (${gameData.player_1_symbol || '?'}) ${p1Status} | 
        Player 2 (${gameData.player_2_symbol || '?'}) ${p2Status} <br>
        ${turn ? `${turn}'s turn` : 'Waiting for both players...'}
    `;
}

// 🟢 STEP 6: Handle leave event
window.addEventListener('beforeunload', async () => {
    if (playerRole) {
        await supabase.from('games').update({
            [`${playerRole}_online`]: false
        }).eq('id', gameId);
    }
});

// 🟢 STEP 7: Reset button
restartBtn.addEventListener('click', async () => {
    await supabase.from('games').update({
        board: Array(9).fill(''),
        turn: null,
        player_1_symbol: null,
        player_2_symbol: null,
        player_1_online: false,
        player_2_online: false
    }).eq('id', gameId);

    window.location.reload();
});

// Start game
connectPlayer();
