const CUBE_DATA = [
    { id: 1, name: "Cube 1", color: "blue", hp: 100, attacks: "Slash, Parry" },
    { id: 2, name: "Cube 2", color: "red", hp: 100, attacks: "Charge, Beam" },
    { id: 3, name: "Cube 3", color: "green", hp: 100, attacks: "Placeholder" },
    { id: 4, name: "Cube 4", color: "pink", hp: 100, attacks: "Placeholder" },
    { id: 5, name: "Cube 5", color: "brown", hp: 75, attacks: "Placeholder" },
    { id: 6, name: "Cube 6", color: "purple", hp: 75, attacks: "Placeholder" }
];

const ACHIEVEMENT_DATA = [
    { id: 1, name: "First Blood", desc: "Defeat your first enemy", unlocks: "Cube 3", unlocked: true },
    { id: 2, name: "Sharpshooter", desc: "Hit 5 beams in a row", unlocks: "Cube 4", unlocked: false },
    { id: 3, name: "Unstoppable", desc: "Win without taking damage", unlocks: "Cube 5", unlocked: false },
    { id: 4, name: "Wombo Combo", desc: "Absoultely combo the red Ai cube", unlocks: "Cube 6", unlocked: false },
    { id: 5, name: "What...No, this is guy hacking", desc: "Discover the unpatchable combo", unlocks: "Cube 7", unlocked: false },
    { id: 6, name: "Cube Master", desc: "Unlock all cubes", unlocks: "Master Cube", unlocked: false }
];

let peer = null;
let conn = null;
let p2pRole = null;
let networkKeys = {};

function navTo(screenId) {
    document.querySelectorAll('.menu-screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function renderCubes() {
    const container = document.getElementById('cubes-grid-container');
    container.innerHTML = '';

    CUBE_DATA.forEach((cube, index) => {
        const div = document.createElement('div');
        const unlockingAchievement = ACHIEVEMENT_DATA.find(a => a.unlocks === cube.name);
        const isLocked = unlockingAchievement && !unlockingAchievement.unlocked;

        div.className = 'cube-icon' + (isLocked ? ' locked' : '');
        div.style.backgroundColor = cube.color;

        if (!isLocked) {
            div.onclick = () => selectCube(cube, div);
        } else {
            div.title = 'Locked - unlock "' + unlockingAchievement.name + '" to use this cube';
        }
        container.appendChild(div);
    });
    document.getElementById('cube-details-panel').innerHTML = '<div style="text-align: center; margin-top: 50px; color: #aaa;">Select a cube to view details</div>';
}

function selectCube(cube, element) {
    document.querySelectorAll('.cube-icon').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    const panel = document.getElementById('cube-details-panel');
    panel.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <div style="background:${cube.color}; width:80px; height:80px; display:inline-block; border:2px solid white;"></div>
        </div>
        <div class="detail-row"><div class="detail-label">Name:</div><div class="detail-value">${cube.name}</div></div>
        <div class="detail-row"><div class="detail-label">Color:</div><div class="detail-value" style="text-transform:capitalize;">${cube.color}</div></div>
        <div class="detail-row"><div class="detail-label">Max HP:</div><div class="detail-value">${cube.hp}</div></div>
        <div class="detail-row"><div class="detail-label">Attacks:</div><div class="detail-value">${cube.attacks}</div></div>
    `;
}

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';

    ACHIEVEMENT_DATA.forEach(ach => {
        const div = document.createElement('div');
        div.className = `achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `
            <div>
                <div style="font-size: 24px; font-weight:bold;">#${ach.id} - ${ach.name}</div>
                <div style="font-size: 16px; margin-top:5px;">${ach.desc}</div>
                <div style="font-size: 14px; margin-top:5px; font-style:italic;">Unlocks: ${ach.unlocks}</div>
            </div>
            <div style="font-size: 20px; font-weight:bold;">${ach.unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
        `;
        container.appendChild(div);
    });
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = 800;
const HEIGHT = 600;

const GRAVITY = 0.6;
const FRICTION = 0.8;
const MOVE_SPEED = 5;
const JUMP_FORCE = 14;
const FLOOR_Y = HEIGHT - 50;

const CUBE_SIZE = 50;
const MAX_HP = 100;

const ATTACK_DMG = 20;
const SLASH_DMG = 25;
const BEAM_DMG = 30;
const CHARGE_DMG = 25;

const COLORS = {
    BLUE: '#0000FF',
    RED: '#FF0000',
    CYAN: '#00FFFF',
    PURPLE: '#800080',
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    GRAY: '#C8C8C8'
};

let gameMode = 'ai';
let gameState = 'menu';
let winner = null;
let animationId = null;

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
        if (gameState === 'playing') showMainMenu();
        else if (gameState === 'menu' && !document.getElementById('screen-main').classList.contains('active')) navTo('screen-main');
    }

    if (e.code === 'KeyR') {
        if (gameState === 'gameover') {
            requestRestart();
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function initP2PHost() {
    resetP2P();
    document.getElementById('p2p-buttons').style.display = 'none';
    document.getElementById('p2p-host-section').style.display = 'block';
    document.getElementById('p2p-status-msg').innerText = "Initializing Peer...";

    peer = new Peer();

    peer.on('open', (id) => {
        document.getElementById('host-id-display').value = id;
        document.getElementById('p2p-status-msg').innerText = "Wait for Player 2 to join...";
        p2pRole = 'host';
    });

    peer.on('connection', (c) => {
        conn = c;
        setupConnection();
    });
}

function initP2PJoin() {
    resetP2P();
    document.getElementById('p2p-buttons').style.display = 'none';
    document.getElementById('p2p-join-section').style.display = 'block';
    p2pRole = 'client';
}

function connectToHost() {
    const hostId = document.getElementById('join-id-input').value.trim();
    if (!hostId) return alert("Please enter the Host ID");

    document.getElementById('p2p-status-msg').innerText = "Connecting...";
    peer = new Peer();

    peer.on('open', () => {
        conn = peer.connect(hostId);
        setupConnection();
    });

    peer.on('error', (err) => alert("Connection Error: " + err));
}

function setupConnection() {
    conn.on('open', () => {
        document.getElementById('p2p-status-msg').innerText = "Connected! Starting Game...";

        if (p2pRole === 'host') {
            setTimeout(() => startGame('p2p'), 1000);
        }
    });

    conn.on('data', (data) => {
        handleNetworkData(data);
    });

    conn.on('close', () => {
        alert("Connection lost");
        showMainMenu();
    });
}

function resetP2P() {
    if (peer) peer.destroy();
    peer = null;
    conn = null;
    p2pRole = null;
    networkKeys = {};
    document.getElementById('p2p-buttons').style.display = 'block';
    document.getElementById('p2p-host-section').style.display = 'none';
    document.getElementById('p2p-join-section').style.display = 'none';
    document.getElementById('p2p-status-msg').innerText = "Select Host or Join";
    document.getElementById('join-id-input').value = "";
}

function handleNetworkData(data) {
    if (data.type === 'INPUT') {
        networkKeys = data.keys;
    } else if (data.type === 'STATE') {
        if (gameState !== 'playing') startGame('p2p');

        applyStateToCube(blueCube, data.p1);
        applyStateToCube(redCube, data.p2);
        updateUI();
    } else if (data.type === 'GAMEOVER') {
        gameState = 'gameover';
        winner = data.winner;
        showGameOver();
    } else if (data.type === 'RESTART') {
        restartGame(true);
    }
}

function applyStateToCube(cube, state) {
    cube.x = state.x;
    cube.y = state.y;
    cube.w = state.w;
    cube.h = state.h;
    cube.color = state.color;
    cube.hp = state.hp;

    if (cube.hp <= 0) {
        cube.dead = true;
    } else {
        cube.dead = false;
    }

    cube.facingRight = state.facingRight;
    cube.slashActive = state.slashActive;
    cube.parryActive = state.parryActive;

    if (cube instanceof RedCube) {
        cube.state = state.state;
        cube.beamActive = (state.state === 'BEAM_FIRING');
    }
}

class Entity {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.w = CUBE_SIZE;
        this.h = CUBE_SIZE;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.hp = MAX_HP;
        this.dead = false;
        this.facingRight = true;
    }

    update() {
        if (gameMode === 'p2p' && p2pRole === 'client') return;

        if (this.dead) return;

        this.vy += GRAVITY;

        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.h >= FLOOR_Y) {
            this.y = FLOOR_Y - this.h;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.w > WIDTH) this.x = WIDTH - this.w;

        this.vx *= FRICTION;
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        ctx.fillStyle = "white";
        const eyeX = this.facingRight ? this.x + 30 : this.x + 10;
        ctx.fillRect(eyeX, this.y + 10, 10, 10);
    }

    takeDamage(amount) {
        if (gameMode === 'p2p' && p2pRole === 'client') return;

        if (this.dead) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            checkGameOver();
        }
        updateUI();
    }
}

class BlueCube extends Entity {
    constructor() {
        super(50, FLOOR_Y - CUBE_SIZE, COLORS.BLUE);
        this.slashCooldown = 0;
        this.slashActive = false;
        this.slashTimer = 0;
        this.parryActive = false;
        this.parryTimer = 0;
        this.parryCooldown = 0;
    }

    update() {
        super.update();
        if (gameMode === 'p2p' && p2pRole === 'client') return;

        if (this.dead) return;

        if (this.slashCooldown > 0) this.slashCooldown--;
        if (this.parryCooldown > 0) this.parryCooldown--;

        const input = keys;

        if (!this.parryActive) {
            if (input['KeyA']) {
                this.vx = -MOVE_SPEED;
                this.facingRight = false;
            }
            if (input['KeyD']) {
                this.vx = MOVE_SPEED;
                this.facingRight = true;
            }
            if (input['KeyW'] && this.isGrounded) {
                this.vy = -JUMP_FORCE;
            }

            if (input['Space'] && this.slashCooldown <= 0) {
                this.performSlash();
            }
        }

        if (input['KeyF'] && this.parryCooldown <= 0 && !this.parryActive) {
            this.parryActive = true;
            this.parryTimer = 30;
            this.color = COLORS.BLACK;
        }

        if (this.parryActive) {
            this.parryTimer--;
            this.vx = 0;
            if (this.parryTimer <= 0) {
                this.parryActive = false;
                this.color = COLORS.BLUE;
                this.parryCooldown = 60;
            }
        }

        if (this.slashActive) {
            this.slashTimer--;
            if (this.slashTimer <= 0) {
                this.slashActive = false;
            }
        }
    }

    performSlash() {
        this.slashActive = true;
        this.slashTimer = 15;
        this.slashCooldown = 60;

        const reach = 70;
        const hitX = this.facingRight ? this.x + this.w : this.x - reach;
        const hitY = this.y;

        if (!redCube.dead && rectIntersect(hitX, hitY, reach, this.h, redCube.x, redCube.y, redCube.w, redCube.h)) {
            if (!redCube.isInvincible) {
                redCube.takeDamage(SLASH_DMG);
                redCube.vx = this.facingRight ? 10 : -10;
                redCube.vy = -5;
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.dead) return;

        if (this.slashActive) {
            ctx.fillStyle = "rgba(128, 0, 128, 0.6)";
            const reach = 70;
            const hitX = this.facingRight ? this.x + this.w : this.x - reach;
            ctx.fillRect(hitX, this.y, reach, this.h);
        }

        if (this.parryActive) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 40, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class RedCube extends Entity {
    constructor() {
        super(WIDTH - 100, FLOOR_Y - CUBE_SIZE, COLORS.RED);
        this.facingRight = false;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.isInvincible = false;
        this.beamActive = false;
    }

    update() {
        super.update();
        if (gameMode === 'p2p' && p2pRole === 'client') return;

        if (this.state !== 'CHARGING') this.isInvincible = false;
        if (this.dead) return;

        if (gameMode === 'pvp') {
            this.updatePvP(keys);
        } else if (gameMode === 'p2p') {
            this.updatePvP(networkKeys);
        } else {
            this.updateAI();
        }

        if (this.state === 'CHARGE_WINDUP') {
            this.color = (Math.floor(Date.now() / 100) % 2 === 0) ? COLORS.RED : COLORS.BLACK;
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'CHARGING';
                this.stateTimer = 60;
                this.vx = this.facingRight ? 15 : -15;
                this.isInvincible = true;
            }
        } else if (this.state === 'CHARGING') {
            this.color = COLORS.RED;
            if (rectIntersect(this.x, this.y, this.w, this.h, blueCube.x, blueCube.y, blueCube.w, blueCube.h)) {
                this.hitPlayer(CHARGE_DMG, true);
            }
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'IDLE';
                this.vx = 0;
            }
        } else if (this.state === 'BEAM_WINDUP') {
            this.color = (Math.floor(Date.now() / 100) % 2 === 0) ? COLORS.CYAN : COLORS.BLACK;
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'BEAM_FIRING';
                this.stateTimer = 20;
                this.fireBeam();
            }
        } else if (this.state === 'BEAM_FIRING') {
            this.color = COLORS.RED;
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'IDLE';
            }
        } else if (this.state === 'STUNNED') {
            this.color = COLORS.GRAY;
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'IDLE';
                this.color = COLORS.RED;
            }
        }
    }

    updatePvP(inputSource) {
        if (this.state !== 'IDLE') return;

        if (inputSource['ArrowLeft']) {
            this.vx = -MOVE_SPEED;
            this.facingRight = false;
        }
        if (inputSource['ArrowRight']) {
            this.vx = MOVE_SPEED;
            this.facingRight = true;
        }
        if (inputSource['ArrowUp'] && this.isGrounded) {
            this.vy = -JUMP_FORCE;
        }

        if (inputSource['KeyK']) this.startCharge();
        if (inputSource['KeyL']) this.startBeam();
    }

    updateAI() {
        if (this.state !== 'IDLE') return;
        const dx = blueCube.x - this.x;
        const dy = blueCube.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.facingRight = dx > 0;
        const rand = Math.random();

        if (dist < 400 && Math.abs(dy) < 50 && rand < 0.02) {
            if (Math.random() < 0.5) this.startCharge();
            else this.startBeam();
            return;
        }
        if (dist > 300) {
            this.vx = this.facingRight ? MOVE_SPEED * 0.6 : -MOVE_SPEED * 0.6;
        } else if (dist < 150) {
            this.vx = this.facingRight ? -MOVE_SPEED * 0.6 : MOVE_SPEED * 0.6;
        }
        if (blueCube.y < this.y - 100 && this.isGrounded && Math.random() < 0.05) {
            this.vy = -JUMP_FORCE;
        }
    }

    startCharge() {
        this.state = 'CHARGE_WINDUP';
        this.stateTimer = 40;
        this.vx = 0;
    }

    startBeam() {
        this.state = 'BEAM_WINDUP';
        this.stateTimer = 50;
        this.vx = 0;
    }

    fireBeam() {
        const beamW = 600;
        const beamH = 40;
        const beamX = this.facingRight ? this.x + this.w : this.x - beamW;
        const beamY = this.y + (this.h / 2) - (beamH / 2);
        if (rectIntersect(beamX, beamY, beamW, beamH, blueCube.x, blueCube.y, blueCube.w, blueCube.h)) {
            this.hitPlayer(BEAM_DMG, false);
        }
    }

    handleWallHit() {
        if (this.state === 'CHARGING') {
            this.state = 'STUNNED';
            this.stateTimer = 60;
            this.vx = this.facingRight ? -5 : 5;
            this.takeDamage(10);
        }
    }

    hitPlayer(dmg, isCharge) {
        if (blueCube.parryActive) {
            this.state = 'STUNNED';
            this.stateTimer = 90;
            this.vx = this.facingRight ? -10 : 10;
            return;
        }
        blueCube.takeDamage(dmg);
        blueCube.vx = this.facingRight ? 10 : -10;
        blueCube.vy = -5;

        if (isCharge) {
            this.state = 'IDLE';
            this.vx = 0;
        }
    }

    draw(ctx) {
        super.draw(ctx);

        if (this.state === 'BEAM_FIRING' || (gameMode === 'p2p' && p2pRole === 'client' && this.beamActive)) {
            ctx.fillStyle = COLORS.CYAN;
            const beamW = 600;
            const beamH = 40;
            const beamX = this.facingRight ? this.x + this.w : this.x - beamW;
            const beamY = this.y + (this.h / 2) - (beamH / 2);
            ctx.fillRect(beamX, beamY, beamW, beamH);

            ctx.shadowBlur = 20;
            ctx.shadowColor = "cyan";
            ctx.fillRect(beamX, beamY, beamW, beamH);
            ctx.shadowBlur = 0;
        }
    }
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

let blueCube;
let redCube;

function initGame() {
    blueCube = new BlueCube();
    redCube = new RedCube();
    updateUI();
}

function updateUI() {
    const p1Pct = (blueCube.hp / MAX_HP) * 100;
    const p2Pct = (redCube.hp / MAX_HP) * 100;
    document.getElementById('p1-health').style.width = p1Pct + '%';
    document.getElementById('p2-health').style.width = p2Pct + '%';

    let name = "AI (Red)";
    if (gameMode === 'pvp') name = "P2 (Local)";
    if (gameMode === 'p2p') name = "P2 (Online)";
    document.getElementById('p2-name').innerText = name;
}

function checkGameOver() {
    if (gameState !== 'playing') return;

    if (blueCube.dead) {
        finishGame('RED CUBE');
    } else if (redCube.dead) {
        finishGame('BLUE CUBE');
    }
}

function finishGame(winnerName) {
    gameState = 'gameover';
    winner = winnerName;

    if (gameMode === 'p2p' && p2pRole === 'host' && conn) {
        conn.send({ type: 'GAMEOVER', winner: winnerName });
    }

    showGameOver();
}

function gameLoop() {
    if (gameState !== 'playing') return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#333";
    ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

    if (gameMode === 'p2p') {
        if (p2pRole === 'host') {
            blueCube.update();
            redCube.update();

            if (conn && conn.open) {
                conn.send({
                    type: 'STATE',
                    p1: {
                        x: blueCube.x, y: blueCube.y, w: blueCube.w, h: blueCube.h,
                        color: blueCube.color, hp: blueCube.hp, facingRight: blueCube.facingRight,
                        slashActive: blueCube.slashActive, parryActive: blueCube.parryActive
                    },
                    p2: {
                        x: redCube.x, y: redCube.y, w: redCube.w, h: redCube.h,
                        color: redCube.color, hp: redCube.hp, facingRight: redCube.facingRight,
                        state: redCube.state
                    }
                });
            }
        } else if (p2pRole === 'client') {
            if (conn && conn.open) {
                conn.send({
                    type: 'INPUT',
                    keys: keys
                });
            }
        }
    } else {
        blueCube.update();
        redCube.update();
    }

    redCube.draw(ctx);
    blueCube.draw(ctx);

    animationId = requestAnimationFrame(gameLoop);
}

function startGame(mode) {
    gameMode = mode;
    gameState = 'playing';

    document.getElementById('menu-overlay').classList.add('hidden');

    initGame();

    if (mode === 'p2p' && p2pRole === 'host') {
        blueCube.hp = MAX_HP; blueCube.dead = false;
        redCube.hp = MAX_HP; redCube.dead = false;
        redCube.x = WIDTH - 100; redCube.y = FLOOR_Y - CUBE_SIZE;
        blueCube.x = 50; blueCube.y = FLOOR_Y - CUBE_SIZE;
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animationId = requestAnimationFrame(gameLoop);
}

function showGameOver() {
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.querySelectorAll('.menu-screen').forEach(el => el.classList.remove('active'));
    document.getElementById('game-over-screen').classList.remove('hidden');

    const color = (winner && winner.includes && winner.includes('BLUE')) ? 'blue' : 'red';
    const txt = document.getElementById('winner-text');
    txt.innerText = (winner ? winner : 'WINNER') + " WINS!";
    txt.style.color = color;

    const restartBtn = document.getElementById('restart-btn');
    const waitMsg = document.getElementById('waiting-msg');

    if (gameMode === 'p2p' && p2pRole === 'client') {
        restartBtn.style.display = 'none';
        restartBtn.disabled = true;
        restartBtn.style.pointerEvents = 'none';
        waitMsg.style.display = 'block';
        waitMsg.innerText = "WAITING FOR HOST TO RESTART...";
    } else {
        restartBtn.style.display = 'block';
        restartBtn.disabled = false;
        restartBtn.style.pointerEvents = '';
        waitMsg.style.display = 'none';
        restartBtn.innerText = 'RESTART (R)';
    }
}

function requestRestart() {
    if (gameMode === 'p2p') {
        if (p2pRole === 'host') {
            if (conn && conn.open) conn.send({ type: 'RESTART' });
            restartGame(false);
        } else {
            console.log('Client: waiting for host to restart');
        }
    } else {
        restartGame(false);
    }
}

function restartGame(isRemoteTrigger = false) {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('menu-overlay').classList.add('hidden');
    gameState = 'playing';

    if (gameMode !== 'p2p' || p2pRole === 'host' || isRemoteTrigger) {
        initGame();
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animationId = requestAnimationFrame(gameLoop);
}

function showMainMenu() {
    gameState = 'menu';
    if (conn) {
        conn.close();
        resetP2P();
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    navTo('screen-main');
}

ctx.fillStyle = "#333";
ctx.fillRect(0, 0, WIDTH, HEIGHT);