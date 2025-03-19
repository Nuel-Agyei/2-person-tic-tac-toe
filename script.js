// Supabase config
const supabaseUrl = 'https://zlofztoiidpsjsrwmotz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2Z6dG9paWRwc2pzcndtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQ4MzgsImV4cCI6MjA1Nzk3MDgzOH0.r5dA9GNPcvg-5IY7frK1gTPZV07uUDEeBkpOzIq5XqQ'; // Your key
const client = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const game_id = 'd9bbb999-3b52-47bb-b4a0-bc8e6b5ca95c';
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

// Game state
let player = null;
let board = Array(9).fill('');
let currentPlayer = 'X';
let isMyTurn = false;

// Assign player automatically
async function assignPlayer() {
    const { data } = await client
        .from('games')
        .select('*')
        .eq('id', game_id)
        .single();

    if (!data.player_x_online) {
        player = 'X';
        isMyTurn = true;
        await client
            .from('games')
            .update({ player_x_online: true })
            .eq('id', game_id);
    } else if (!data.player_o_online) {
        player = 'O';
        isMyTurn = false;
        await client
            .from('games')
            .update({ player_o_online: true })
            .eq('id', game_id);
    } else {
        alert('Both players already connected!');
    }
}

// UI updater
function updateUI(data) {
    board.forEach((val, i) => {
        cells[i].textContent = val || '';
    });

    const xOnline = data.player_x_online ? '🟢' : '🔴';
    const oOnline = data.player_o_online ? '🟢' : '🔴';

    const turnText = currentPlayer === player 
        ? 'Your Turn!'
        : `${currentPlayer}'s Turn`;

    statusText.innerHTML = `
        Player X: ${xOnline} | Player O: ${oOnline} <br>
        ${turnText}
    `;

    isMyTurn = currentPlayer === player;
}

// Handle cell clicks
cells.forEach(cell => cell.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;

    if (board[index] !== '' || !isMyTurn) return;

    board[index] = player;
    currentPlayer = player === 'X' ? 'O' : 'X';
    isMyTurn = false;

    updateUI({
        player_x_online: player === 'X' ? true : onlineFlags.player_x_online,
        player_o_online: player === 'O' ? true : onlineFlags.player_o_online
    });

    await client
        .from('games')
        .update({ board, turn: currentPlayer })
        .eq('id', game_id);
}));

// Listen to Supabase realtime changes
client
    .channel('public:games')
    .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games' },
        payload => {
            const data = payload.new;
            board = data.board;
            currentPlayer = data.turn;
            updateUI(data);
        }
    )
    .subscribe();

// Restart button clears board on Supabase & locally
restartBtn.addEventListener('click', async () => {
    board = Array(9).fill('');
    currentPlayer = 'X';
    isMyTurn = player === 'X';

    await client
        .from('games')
        .update({ board, turn: 'X' })
        .eq('id', game_id);

    updateUI({
        player_x_online: onlineFlags.player_x_online,
        player_o_online: onlineFlags.player_o_online
    });
});

// Disconnect handling
window.addEventListener('beforeunload', async () => {
    const field = player === 'X' ? 'player_x_online' : 'player_o_online';
    await client
        .from('games')
        .update({ [field]: false })
        .eq('id', game_id);
});

// Initial load
let onlineFlags = { player_x_online: false, player_o_online: false };

(async function init() {
    await assignPlayer();

    const { data } = await client
        .from('games')
        .select('*')
        .eq('id', game_id)
        .single();

    board = data.board;
    currentPlayer = data.turn;
    onlineFlags = {
        player_x_online: data.player_x_online,
        player_o_online: data.player_o_online
    };
    updateUI(data);
})();
