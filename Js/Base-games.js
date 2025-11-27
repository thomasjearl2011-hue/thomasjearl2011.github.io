const tabs = ['home', 'games', 'store', 'community', 'settings'];

        function switchTab(tabName) {

            tabs.forEach(t => {
                const section = document.getElementById(`view-${t}`);
                if (section) section.classList.add('hidden');

                const navBtn = document.getElementById(`nav-${t}`);
                const indicator = document.getElementById(`indicator-${t}`);

                if (navBtn) {
                    navBtn.classList.remove('bg-slate-800', 'text-white');
                    navBtn.classList.add('text-slate-400');
                    if(indicator) indicator.classList.remove('opacity-100');
                }
            });

            const activeSection = document.getElementById(`view-${tabName}`);
            activeSection.classList.remove('hidden');
            activeSection.classList.add('animate-fade-in');

            const activeNav = document.getElementById(`nav-${tabName}`);
            const activeIndicator = document.getElementById(`indicator-${tabName}`);

            if (activeNav) {
                activeNav.classList.add('bg-slate-800', 'text-white');
                activeNav.classList.remove('text-slate-400');
                if(activeIndicator) activeIndicator.classList.add('opacity-100');
            }
        }

        switchTab('home');

        let activeGame = null;
        let gameLoopId = null;
        const overlay = document.getElementById('game-overlay');
        const gameTitle = document.getElementById('active-game-title');
        const uiLayer = document.getElementById('game-ui-layer');
        const startBtn = document.getElementById('start-btn');
        const statusTitle = document.getElementById('game-status-title');
        const statusDesc = document.getElementById('game-status-desc');
        const controlsHint = document.getElementById('game-controls-hint');

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const tttBoard = document.getElementById('ttt-board');

        function launchGame(gameId) {
            activeGame = gameId;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');

            canvas.classList.add('hidden');
            tttBoard.classList.add('hidden');
            uiLayer.classList.remove('hidden');
            startBtn.classList.remove('hidden');
            statusTitle.textContent = "READY?";
            statusDesc.textContent = "Click Start to Begin";

            if (gameId === 'snake') {
                gameTitle.textContent = "CYBER SNAKE";
                controlsHint.textContent = "Use Arrow Keys to Move";
                canvas.classList.remove('hidden');
            } else if (gameId === 'tictactoe') {
                gameTitle.textContent = "NEON TIC-TAC-TOE";
                controlsHint.textContent = "Click cells to place X";
                tttBoard.classList.remove('hidden');
                initTicTacToeDOM();
            } else if (gameId === 'reflex') {
                gameTitle.textContent = "REFLEX TESTER";
                controlsHint.textContent = "Click when the color changes!";
                canvas.classList.remove('hidden');
            }

            startBtn.onclick = () => startGame(gameId);
        }

        function closeGame() {
            activeGame = null;
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            if (reflexTimeout) clearTimeout(reflexTimeout);
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        function startGame(gameId) {
            uiLayer.classList.add('hidden');
            if (gameId === 'snake') initSnake();
            if (gameId === 'tictactoe') startTicTacToe();
            if (gameId === 'reflex') initReflex();
        }

        function gameOver(message, subtext = "Press Start to play again") {
            uiLayer.classList.remove('hidden');
            statusTitle.textContent = message;
            statusDesc.textContent = subtext;
            activeGame = null;
        }

        let snake = [];
        let food = {};
        let direction = 'RIGHT';
        let nextDirection = 'RIGHT';
        let score = 0;
        const gridSize = 20;
        const tileCount = 20; 

        function initSnake() {
            snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
            food = {x: 15, y: 10};
            direction = 'RIGHT';
            nextDirection = 'RIGHT';
            score = 0;
            activeGame = 'snake';

            document.addEventListener('keydown', handleSnakeInput);

            let lastTime = 0;
            const speed = 100; 

            function loop(currentTime) {
                if (activeGame !== 'snake') return;
                gameLoopId = requestAnimationFrame(loop);

                if (currentTime - lastTime < speed) return;
                lastTime = currentTime;

                updateSnake();
                drawSnake();
            }
            loop(0);
        }

        function handleSnakeInput(e) {
            if (activeGame !== 'snake') return;
            switch(e.key) {
                case 'ArrowUp': if (direction !== 'DOWN') nextDirection = 'UP'; break;
                case 'ArrowDown': if (direction !== 'UP') nextDirection = 'DOWN'; break;
                case 'ArrowLeft': if (direction !== 'RIGHT') nextDirection = 'LEFT'; break;
                case 'ArrowRight': if (direction !== 'LEFT') nextDirection = 'RIGHT'; break;
            }
        }

        function updateSnake() {
            direction = nextDirection;
            const head = {x: snake[0].x, y: snake[0].y};

            if (direction === 'UP') head.y--;
            if (direction === 'DOWN') head.y++;
            if (direction === 'LEFT') head.x--;
            if (direction === 'RIGHT') head.x++;

            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
                gameOver("CRASHED!", `Score: ${score}`);
                return;
            }

            for (let i = 0; i < snake.length; i++) {
                if (head.x === snake[i].x && head.y === snake[i].y) {
                    gameOver("GAME OVER", `Score: ${score}`);
                    return;
                }
            }

            snake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                score += 10;
                placeFood();
            } else {
                snake.pop();
            }
        }

        function placeFood() {
            food = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };

            for(let part of snake) {
                if(part.x === food.x && part.y === food.y) placeFood();
            }
        }

        function drawSnake() {

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;

            ctx.fillStyle = '#10b981'; 
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#10b981";
            ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#6366f1'; 
            snake.forEach((part, index) => {
                if (index === 0) ctx.fillStyle = '#818cf8'; 
                else ctx.fillStyle = '#6366f1';
                ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
            });

            ctx.fillStyle = 'white';
            ctx.font = '16px Inter';
            ctx.fillText("Score: " + score, 10, 20);
        }

        let tttState = Array(9).fill(null);
        let currentPlayer = 'X';

        function initTicTacToeDOM() {
            tttBoard.innerHTML = '';
            for(let i=0; i<9; i++) {
                const cell = document.createElement('button');
                cell.className = 'ttt-cell bg-slate-800 text-5xl font-bold flex items-center justify-center rounded hover:bg-slate-700 text-white';
                cell.dataset.index = i;
                cell.onclick = () => handleTTTClick(i);
                tttBoard.appendChild(cell);
            }
        }

        function startTicTacToe() {
            activeGame = 'tictactoe';
            tttState.fill(null);
            currentPlayer = 'X';

            const cells = document.querySelectorAll('.ttt-cell');
            cells.forEach(c => {
                c.textContent = '';
                c.classList.remove('text-indigo-400', 'text-pink-400');
            });
        }

        function handleTTTClick(index) {
            if (activeGame !== 'tictactoe' || tttState[index] || currentPlayer !== 'X') return;

            makeMove(index, 'X');

            if (!checkWin('X') && !checkDraw()) {

                currentPlayer = 'O';
                statusDesc.textContent = "AI is thinking...";
                setTimeout(() => {
                    if (activeGame !== 'tictactoe') return;
                    const emptyIndices = tttState.map((v, i) => v === null ? i : null).filter(v => v !== null);
                    if (emptyIndices.length > 0) {
                        const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                        makeMove(randomMove, 'O');
                        checkWin('O');
                        checkDraw();
                        currentPlayer = 'X';
                        statusDesc.textContent = "Your Turn (X)";
                    }
                }, 500);
            }
        }

        function makeMove(index, player) {
            tttState[index] = player;
            const cell = document.querySelector(`.ttt-cell[data-index='${index}']`);
            cell.textContent = player;
            cell.classList.add(player === 'X' ? 'text-indigo-400' : 'text-pink-400');
        }

        function checkWin(player) {
            const wins = [
                [0,1,2], [3,4,5], [6,7,8], 
                [0,3,6], [1,4,7], [2,5,8], 
                [0,4,8], [2,4,6]           
            ];

            const won = wins.some(combination => combination.every(i => tttState[i] === player));

            if (won) {
                gameOver(player === 'X' ? "YOU WON!" : "AI WINS!", "Nice game.");
                return true;
            }
            return false;
        }

        function checkDraw() {
            if (!tttState.includes(null)) {
                gameOver("DRAW", "No moves left.");
                return true;
            }
            return false;
        }

        let reflexState = 'waiting'; 
        let reflexTimeout;
        let reflexStartTime;

        function initReflex() {
            activeGame = 'reflex';
            reflexState = 'waiting';

            ctx.fillStyle = '#ef4444'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';
            ctx.font = '30px Inter';
            ctx.textAlign = 'center';
            ctx.fillText("WAIT FOR GREEN", canvas.width/2, canvas.height/2);

            canvas.onmousedown = handleReflexClick;

            const randomTime = 2000 + Math.random() * 3000;

            reflexTimeout = setTimeout(() => {
                if(activeGame !== 'reflex') return;
                reflexState = 'green';
                reflexStartTime = Date.now();

                ctx.fillStyle = '#22c55e'; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = 'white';
                ctx.fillText("CLICK NOW!", canvas.width/2, canvas.height/2);
            }, randomTime);
        }

        function handleReflexClick() {
            if (activeGame !== 'reflex') return;

            if (reflexState === 'waiting') {
                clearTimeout(reflexTimeout);
                gameOver("TOO EARLY", "Don't anticipate it.");
            } else if (reflexState === 'green') {
                const reactionTime = Date.now() - reflexStartTime;
                let rating = "Slow poke";
                if(reactionTime < 200) rating = "Godlike!";
                else if(reactionTime < 300) rating = "Great!";
                else if(reactionTime < 400) rating = "Average";

                gameOver(`${reactionTime}ms`, rating);
    }
}