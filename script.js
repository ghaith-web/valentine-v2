const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, WON, PROPOSAL, END
let score = 0;
const WIN_SCORE = 15; // Roses needed to fill the meter
let GAME_TIME = 30; // seconds - will be updated by difficulty
let timeLeft = GAME_TIME;
let timerInterval;
let player;
let fallingItems = []; // Both roses and broken hearts
let particles = []; // For effects
let animationId;
let loveMeter = document.getElementById('love-fill');

// Difficulty System
let currentLevel = 'HARD'; // 'HARD' or 'EASY'
const SECRET_CODE = 'mommy';

// Difficulty Settings
const DIFFICULTY = {
    HARD: {
        roseChance: 0.18,      // Only 18% roses (82% broken hearts!)
        brokenHeartChance: 0.82,
        roseSpeed: [2, 3],     // 2-3 speed (slower)
        brokenSpeed: [6, 10],   // 6-10 speed (EXTREMELY fast!)
        spawnRate: 0.06,       // Limited spawns (~20 roses max in 30s)
        timeLimit: 30,         // 30 seconds
        label: 'HARD LEVEL 🔥'
    },
    EASY: {
        roseChance: 0.85,      // 85% roses (only 15% broken hearts!)
        brokenHeartChance: 0.15,
        roseSpeed: [2, 4],     // 2-4 speed
        brokenSpeed: [2, 3],   // 2-3 speed (slow broken hearts)
        spawnRate: 0.04,       // Normal spawn
        timeLimit: 60,         // 60 seconds (relaxed)
        label: 'JUST A GIRL LEVEL 🌸'
    }
};

// DOM Elements
const startScreen = document.getElementById('start-screen');
const proposalScreen = document.getElementById('proposal-screen');
const celebrationScreen = document.getElementById('pre-quiz-celebration');
const postQuizCelebration = document.getElementById('post-quiz-celebration');
const nextToProposalBtn = document.getElementById('next-to-proposal-btn');
const startBtn = document.getElementById('start-btn');
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');
const timerDisplay = document.getElementById('timer');

// Level/Code Elements
const levelDisplay = document.getElementById('level-display');
const codeInput = document.getElementById('code-input');
const codeBtn = document.getElementById('code-btn');
const codeMessage = document.getElementById('code-message');

// Game Over Elements
const gameOverScreen = document.getElementById('gameover-screen');
const tryAgainBtn = document.getElementById('try-again-btn');

// Resize Handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (player) {
         player.y = canvas.height - 100;
    }
}
window.addEventListener('resize', resize);

// Player Object (Cupid/Character)
class Player {
    constructor() {
        this.w = 80; // width
        this.h = 80;  // height
        this.x = canvas.width / 2 - this.w / 2;
        this.y = canvas.height - 100;
        this.speed = 10;
        this.dx = 0;
    }

    draw() {
        // Draw Cupid character
        ctx.fillStyle = '#ff4d6d';
        
        // Body (circle)
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Face
        ctx.fillStyle = '#ffe4e1';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2 - 12, this.y + this.h/2 - 5, 4, 0, Math.PI * 2);
        ctx.arc(this.x + this.w/2 + 12, this.y + this.h/2 - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.arc(this.x + this.w/2, this.y + this.h/2, 15, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        // Wings
        ctx.fillStyle = '#ffb3c1';
        ctx.beginPath();
        ctx.ellipse(this.x - 10, this.y + this.h/2, 15, 25, -0.3, 0, Math.PI * 2);
        ctx.ellipse(this.x + this.w + 10, this.y + this.h/2, 15, 25, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.dx;
        
        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;
    }
}

// Falling Item (Rose or Broken Heart)
class FallingItem {
    constructor(type) {
        this.type = type; // 'rose' or 'brokenHeart'
        this.size = 35;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        
        // Use difficulty settings for speed
        const settings = DIFFICULTY[currentLevel];
        if (type === 'brokenHeart') {
            this.speed = Math.random() * (settings.brokenSpeed[1] - settings.brokenSpeed[0]) + settings.brokenSpeed[0];
        } else {
            this.speed = Math.random() * (settings.roseSpeed[1] - settings.roseSpeed[0]) + settings.roseSpeed[0];
        }
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    draw() {
        // Simple draw without rotation
        if (this.type === 'rose') {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌹', this.x + this.size/2, this.y + this.size/2);
        } else {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💔', this.x + this.size/2, this.y + this.size/2);
        }
    }

    update() {
        this.y += this.speed;
    }
}

// Particle Effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 6 + 2;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.life = 100;
        this.color = color || `rgba(255, 255, 255, 0.8)`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 3;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Input Handling
function handleInput(e) {
    if (!player) return;
    
    // Mouse / Touch
    if (e.type === 'mousemove' || e.type === 'touchmove') {
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        player.x = clientX - player.w / 2;
    }
}

window.addEventListener('mousemove', handleInput);
window.addEventListener('touchmove', handleInput, { passive: false });

// Game Functions
function spawnItem() {
    const settings = DIFFICULTY[currentLevel];
    if (Math.random() < settings.spawnRate) {
        // Use difficulty chances
        const type = Math.random() < settings.roseChance ? 'rose' : 'brokenHeart';
        fallingItems.push(new FallingItem(type));
    }
}

function createParticles(x, y, color) {
    for(let i=0; i<8; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    if (gameState === 'PLAYING') {
        player.update();
        player.draw();

        spawnItem();

        fallingItems.forEach((item, index) => {
            item.update();
            item.draw();

            // Collision Detection with player
            const itemCenterX = item.x + item.size/2;
            const itemCenterY = item.y + item.size/2;
            const playerCenterX = player.x + player.w/2;
            const playerCenterY = player.y + player.h/2;
            
            const distance = Math.sqrt(
                Math.pow(itemCenterX - playerCenterX, 2) + 
                Math.pow(itemCenterY - playerCenterY, 2)
            );
            
            if (distance < (item.size/2 + player.w/2)) {
                // Collision!
                if (item.type === 'rose') {
                    // Good - collect rose
                    score++;
                    createParticles(item.x, item.y, 'rgba(255, 77, 109, 0.8)');
                    updateScore();
                    
                    if (score >= WIN_SCORE) {
                        gameOver();
                    }
                } else {
                    // Bad - hit broken heart
                    score = Math.max(0, score - 1); // Lose a point
                    createParticles(item.x, item.y, 'rgba(100, 100, 100, 0.8)');
                    updateScore();
                }
                fallingItems.splice(index, 1);
            } else if (item.y > canvas.height) {
                fallingItems.splice(index, 1); // Missed
            }
        });

        particles.forEach((p, idx) => {
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(idx, 1);
        });
    }

    animationId = requestAnimationFrame(updateGame);
}

function updateScore() {
    const percentage = (score / WIN_SCORE) * 100;
    loveMeter.style.width = `${percentage}%`;
}

function triggerProposal() {
    stopTimer();
    gameState = 'PROPOSAL';
    setTimeout(() => {
        proposalScreen.classList.remove('hidden');
        proposalScreen.classList.add('active');
    }, 500);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 0) {
            stopTimer();
            gameOver();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    timerDisplay.textContent = `⏱️ ${timeLeft}s`;
}

function gameOver() {
    gameState = 'END';
    if (score >= WIN_SCORE) {
        // Stop timer and show pre-quiz celebration
        stopTimer();
        celebrationScreen.classList.remove('hidden');
        celebrationScreen.classList.add('active');
    } else {
        // Show pretty game over screen
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.classList.add('active');
    }
}

function restartFromGameOver() {
    // Hide game over screen
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    
    // Stop any running game loop
    stopTimer();
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Clear and restart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fallingItems = [];
    particles = [];
    score = 0;
    updateScore();
    
    startGame();
}

function checkCode() {
    const enteredCode = codeInput.value.trim().toLowerCase();
    
    if (enteredCode === SECRET_CODE) {
        // Switch to easy mode
        currentLevel = 'EASY';
        updateLevelDisplay();
        
        // Hide code section, hint, and message
        document.getElementById('code-section').style.display = 'none';
        document.getElementById('code-hint').style.display = 'none';
        codeMessage.style.display = 'none';
        
        // Restart game with new difficulty and 60s timer
        setTimeout(() => {
            // Reset to start screen first
            gameState = 'START';
            stopTimer();
            cancelAnimationFrame(animationId);
            
            // Clear canvas and reset
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            fallingItems = [];
            particles = [];
            score = 0;
            updateScore();
            
            // Show start screen
            proposalScreen.classList.remove('active');
            proposalScreen.classList.add('hidden');
            celebrationScreen.classList.remove('active');
            celebrationScreen.classList.add('hidden');
            postQuizCelebration.classList.remove('active');
            postQuizCelebration.classList.add('hidden');
            startScreen.classList.remove('hidden');
            startScreen.classList.add('active');
            
            // Auto-start the game with new settings
            startGame();
        }, 1500);
    } else {
        codeMessage.textContent = '❌ Wrong code! Ask me for help 😉';
        codeMessage.className = 'error';
        codeInput.value = '';
        setTimeout(() => {
            codeMessage.textContent = '';
        }, 2000);
    }
}

function updateLevelDisplay() {
    const settings = DIFFICULTY[currentLevel];
    levelDisplay.textContent = settings.label;
    
    if (currentLevel === 'EASY') {
        levelDisplay.classList.add('easy');
    } else {
        levelDisplay.classList.remove('easy');
    }
}

function startGame() {
    // Ensure any previous game is fully stopped
    stopTimer();
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    resize();
    player = new Player();
    fallingItems = [];
    particles = [];
    score = 0;
    
    // Always ensure we're using HARD level at game start (unless code was entered)
    const settings = DIFFICULTY[currentLevel];
    timeLeft = settings.timeLimit;
    GAME_TIME = settings.timeLimit;
    
    updateScore();
    updateTimer();
    gameState = 'PLAYING';
    
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    
    startTimer();
    updateGame();
}

// Event Listeners
startBtn.addEventListener('click', () => {
    startGame();
});

// Try Again button
tryAgainBtn.addEventListener('click', restartFromGameOver);

// Code unlock listeners
codeBtn.addEventListener('click', checkCode);
codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkCode();
    }
});

// Final Celebration Element
const finalCelebrationScreen = document.getElementById('final-celebration-screen');

yesBtn.addEventListener('click', () => {
    proposalScreen.classList.remove('active');
    proposalScreen.classList.add('hidden');
    finalCelebrationScreen.classList.remove('hidden');
    finalCelebrationScreen.classList.add('active');
    triggerConfetti();
});

// "No" button runs away
noBtn.addEventListener('mouseover', moveNoButton);
noBtn.addEventListener('touchstart', moveNoButton);

function moveNoButton() {
    const x = Math.random() * (window.innerWidth - noBtn.offsetWidth);
    const y = Math.random() * (window.innerHeight - noBtn.offsetHeight);
    noBtn.style.position = 'fixed';
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
}

function triggerConfetti() {
    // Confetti effect
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const colors = ['#ff4d6d', '#ffb3c1', '#ff8fa3', '#c9184a', '#ffd700'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        createParticles(x, y, color);
    }
}

// Quiz Game Variables
const quizScreen = document.getElementById('quiz-screen');
const quizResultsScreen = document.getElementById('quiz-results-screen');
const nextToQuizBtn = document.getElementById('next-to-quiz-btn');
const restartBtn = document.getElementById('restart-btn');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const quizProgressEl = document.getElementById('quiz-progress');
const quizScoreEl = document.getElementById('quiz-score');
const finalScoreEl = document.getElementById('final-score');
const quizMessageEl = document.getElementById('quiz-message');

let currentQuestion = 0;
let quizScore = 0;

// Wild/Sexual Quiz Questions
const quizQuestions = [
    {question: "What's the sexiest thing you can whisper for me?", options: ["I want you now", "I love you", "You're beautiful", "Goodnight"], correct: 0},
    {question: "My favorite kind of flirting?", options: ["Teasing banter", "Compliments", "Touchy hints", "Bold directness"], correct: 2},
    {question: "Wildest romantic location?", options: ["Beach at night", "Kitchen", "Car", "All of the above"], correct: 3},
    {question: "Ultimate turn-on?", options: ["Neck kisses", "Dirty talk", "Eye contact", "Hugs"], correct: 1},
    {question: "How i like to be teased?", options: ["Slowly", "Rough", "With anticipation", "Not at all"], correct: 1},
    {question: "my favorite lingerie i wanna see you in?", options: ["Lace black", "Silk red", "Mistress", "All above"], correct: 3},
    {question: "What makes me lose control?", options: ["Being pinned", "Whispered fantasies", "Kisses", "Massage"], correct: 1},
    {question: "Ideal foreplay duration?", options: ["5 min", "15 min", "30+ min", "Skip it"], correct: 2},
    {question: "Morning intimacy?", options: ["Love it", "Weekends only", "Too tired", "Best wakeup"], correct: 3},
    {question: "my best way to start a heated night?", options: ["A long hug that lingers", "Dance", "A bold kiss", "A whispered plan"], correct: 1}
];

function showQuiz() {
    celebrationScreen.classList.remove('active');
    celebrationScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    quizScreen.classList.add('active');
    currentQuestion = 0;
    quizScore = 0;
    showQuestion();
}

function showQuestion() {
    const q = quizQuestions[currentQuestion];
    quizProgressEl.textContent = `Question ${currentQuestion + 1} of ${quizQuestions.length}`;
    quizQuestionEl.textContent = q.question;
    quizScoreEl.textContent = `Score: ${quizScore}`;
    quizOptionsEl.innerHTML = '';
    q.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = option;
        btn.addEventListener('click', () => checkAnswer(index));
        quizOptionsEl.appendChild(btn);
    });
}

function checkAnswer(selected) {
    const q = quizQuestions[currentQuestion];
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((btn, index) => {
        btn.disabled = true;
        if (index === q.correct) btn.classList.add('correct');
        else if (index === selected) btn.classList.add('wrong');
    });
    if (selected === q.correct) quizScore++;
    setTimeout(() => {
        currentQuestion++;
        if (currentQuestion < quizQuestions.length) showQuestion();
        else showQuizResults();
    }, 1500);
}

function showQuizResults() {
    quizScreen.classList.remove('active');
    quizScreen.classList.add('hidden');
    quizResultsScreen.classList.remove('hidden');
    quizResultsScreen.classList.add('active');
    finalScoreEl.textContent = `${quizScore}/10`;
    
    if (quizScore >= 7) {
        // Passed - can proceed to proposal
        if (quizScore === 10) quizMessageEl.textContent = "🔥 Perfect! You know me so well! Ready for the final question?";
        else quizMessageEl.textContent = "😏 Great job! You know me pretty well! Ready for the final question?";
        restartBtn.textContent = "Nkamlou";
        restartBtn.dataset.passed = "true";
    } else {
        // Failed - must retry quiz
        quizMessageEl.textContent = "💔 You need at least 7 right to proceed... Try again!";
        restartBtn.textContent = "Retry Quiz 🔄";
        restartBtn.dataset.passed = "false";
    }
}

function restartFullGame() {
    const passed = restartBtn.dataset.passed === "true";
    
    if (passed) {
        // Go to post-quiz celebration screen first, then proposal
        quizResultsScreen.classList.remove('active');
        quizResultsScreen.classList.add('hidden');
        postQuizCelebration.classList.remove('hidden');
        postQuizCelebration.classList.add('active');
    } else {
        // Retry quiz
        quizResultsScreen.classList.remove('active');
        quizResultsScreen.classList.add('hidden');
        currentQuestion = 0;
        quizScore = 0;
        showQuiz();
    }
}

// Play Again button (from final celebration screen)
const playAgainBtn = document.getElementById('play-again-btn');

function restartEntireGame() {
    // Reset all game state
    finalCelebrationScreen.classList.remove('active');
    finalCelebrationScreen.classList.add('hidden');
    
    // Reset level to HARD
    currentLevel = 'HARD';
    
    // Show code section again
    document.getElementById('code-section').style.display = 'flex';
    document.getElementById('code-hint').style.display = 'block';
    codeMessage.style.display = 'block';
    codeInput.disabled = false;
    codeBtn.disabled = false;
    codeBtn.textContent = 'Unlock';
    codeMessage.textContent = '';
    codeMessage.className = '';
    
    updateLevelDisplay();
    
    // Go back to start screen
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
}

playAgainBtn.addEventListener('click', restartEntireGame);

// Event Listeners
nextToQuizBtn.addEventListener('click', showQuiz);
nextToProposalBtn.addEventListener('click', () => {
    postQuizCelebration.classList.remove('active');
    postQuizCelebration.classList.add('hidden');
    proposalScreen.classList.remove('hidden');
    proposalScreen.classList.add('active');
});
restartBtn.addEventListener('click', restartFullGame);

// Initialize
resize();
updateLevelDisplay();
