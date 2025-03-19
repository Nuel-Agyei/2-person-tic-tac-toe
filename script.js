const supabaseUrl = 'https://zlofztoiidpsjsrwmotz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2Z6dG9paWRwc2pzcndtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQ4MzgsImV4cCI6MjA1Nzk3MDgzOH0.r5dA9GNPcvg-5IY7frK1gTPZV07uUDEeBkpOzIq5XqQ'; // Your key here
const client = supabase.createClient(supabaseUrl, supabaseKey);

const game_id = 'd9bbb999-3b52-47bb-b4a0-bc8e6b5ca95c';
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

let player = null;
let board = Array(9).fill('');
let currentPlayer = 'X';
let isMyTurn = false;

async function assignPlayer() {
    try {
        const { data, error } = await client
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();

        if (error) throw error;

        if (!data.player_x_online) {
            player = 'X';
            isMyTurn = true;
            await client
                .from('games')
                .update({ player_x_online: true })
                .eq('id', game_id);
            console.log('Assigned as Player X');
        } else if (!data.player_o_online) {
            player = 'O';
            isMyTurn = false;
            await client
                .from('games')
                .update({ player_o_online: true })
                .eq('id', game_id);
            console.log('Assigned as Player O');
        } else {
            alert('Both players already connected!');
        }
    } catch (err) {
        console.error('Error assigning player:', err);
    }
}

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

cells.forEach(cell => cell.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;

    if (board[index] !== '' || !isMyTurn) return;

    board[index] = player;
    currentPlayer = player === 'X' ? 'O' : 'X';
    isMyTurn = false;

    updateUI({
        player_x_online: onlineFlags.player_x_online,
        player_o_online: onlineFlags.player_o_online
    });

    try {
        const { error } = await client
            .from('games')
            .update({ board, turn: currentPlayer })
            .eq('id', game_id);
        if (error) throw error;
    } catch (err) {
        console.error('Error updating move:', err);
    }
}));

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
    .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription active!');
        } else {
            console.error('Subscription issue:', status);
        }
    });

restartBtn.addEventListener('click', async () => {
    board = Array(9).fill('');
    currentPlayer = 'X';
    isMyTurn = player === 'X';

    try {
        const { error } = await client
            .from('games')
            .update({ board, turn: 'X' })
            .eq('id', game_id);
        if (error) throw error;
    } catch (err) {
        console.error('Error restarting game:', err);
    }

    updateUI({
        player_x_online: onlineFlags.player_x_online,
        player_o_online: onlineFlags.player_o_online
    });
});

window.addEventListener('beforeunload', async () => {
    const field = player === 'X' ? 'player_x_online' : 'player_o_online';
    try {
        await client
            .from('games')
            .update({ [field]: false })
            .eq('id', game_id);
    } catch (err) {
        console.warn('Error marking offline:', err);
    }
});

let onlineFlags = { player_x_online: false, player_o_online: false };

(async function init() {
    try {
        await assignPlayer();

        const { data, error } = await client
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();

        if (error) throw error;

        board = data.board;
        currentPlayer = data.turn;
        onlineFlags = {
            player_x_online: data.player_x_online,
            player_o_online: data.player_o_online
        };
        updateUI(data);
    } catch (err) {
        console.error('Error during initialization:', err);
    }
})();
