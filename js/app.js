// 初始化 GUN
const gun = Gun({
    peers: ['https://gun-matrix.herokuapp.com/gun'] // 您可以更換成其他的 peer 或建立自己的 relay peer
});

// 遊戲狀態
const gameState = gun.get('puzzleGame');
const players = gameState.get('players');
const puzzle = gameState.get('puzzle');
let playerName = '';
let gameStartTime = 0;
let timerInterval;

// DOM 元素
const playerNameInput = document.getElementById('player-name');
const joinGameButton = document.getElementById('join-game');
const startGameButton = document.getElementById('start-game');
const puzzleContainer = document.getElementById('puzzle-container');
const onlinePlayers = document.getElementById('online-players');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message');
const timerDisplay = document.getElementById('timer');

// 初始化拼圖
const initializePuzzle = () => {
    const pieces = Array.from({ length: 9 }, (_, i) => i);
    shuffleArray(pieces);
    puzzle.put({ pieces, isComplete: false });
    return pieces;
};

// 檢查拼圖是否完成
const checkPuzzleComplete = (pieces) => {
    console.log('檢查遊戲是否完成:', pieces); // 新增除錯訊息
    // 檢查每個數字是否對應其顯示的文字減1
    return pieces.every((num, index) => {
        const displayNumber = parseInt(num) + 1;
        const position = index + 1;
        console.log(`位置 ${position} 顯示數字 ${displayNumber}`);
        return displayNumber === position;
    });
};

// 更新拼圖顯示
const updatePuzzleDisplay = (pieces) => {
    puzzleContainer.innerHTML = '';
    pieces.forEach((num, index) => {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.textContent = num + 1;
        piece.draggable = true;
        piece.dataset.index = index;
        
        piece.addEventListener('dragstart', handleDragStart);
        piece.addEventListener('dragover', handleDragOver);
        piece.addEventListener('drop', handleDrop);
        piece.addEventListener('dragenter', handleDragEnter);
        piece.addEventListener('dragleave', handleDragLeave);
        
        puzzleContainer.appendChild(piece);
    });
};

// 拖放功能
let draggedPiece = null;

function handleDragStart(e) {
    draggedPiece = e.target;
    e.dataTransfer.setData('text/plain', ''); // 這行是必要的，特別是在 Firefox 中
    e.target.style.opacity = '0.5';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.className === 'puzzle-piece') {
        e.target.style.transform = 'scale(1.1)';
    }
}

function handleDragLeave(e) {
    if (e.target.className === 'puzzle-piece') {
        e.target.style.transform = 'scale(1)';
    }
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target;
    
    if (dropTarget.className === 'puzzle-piece' && draggedPiece) {
        draggedPiece.style.opacity = '1';
        dropTarget.style.transform = 'scale(1)';
        
        const fromIndex = parseInt(draggedPiece.dataset.index);
        const toIndex = parseInt(dropTarget.dataset.index);
        
        // 確保來源和目標是不同的位置
        if (fromIndex !== toIndex) {
            // 直接從畫面上交換位置
            const tempText = draggedPiece.textContent;
            draggedPiece.textContent = dropTarget.textContent;
            dropTarget.textContent = tempText;
            
            // 更新 GUN.js 中的資料
            puzzle.once((data) => {
                if (data && data.pieces) {
                    const newPieces = [...data.pieces];
                    // 交換陣列中的值
                    const temp = newPieces[fromIndex];
                    newPieces[fromIndex] = newPieces[toIndex];
                    newPieces[toIndex] = temp;
                    
                    console.log('交換後的拼圖狀態:', newPieces); // 新增除錯訊息
                    
                    // 先檢查是否完成
                    const isComplete = checkPuzzleComplete(newPieces);
                    console.log('遊戲是否完成:', isComplete); // 新增除錯訊息
                    
                    // 更新資料
                    puzzle.put({ 
                        pieces: newPieces, 
                        isComplete: isComplete 
                    });
                    
                    // 如果遊戲完成，直接觸發獲勝事件
                    if (isComplete) {
                        announceWinner();
                        // 遊戲結束時的視覺效果
                        puzzleContainer.querySelectorAll('.puzzle-piece').forEach(piece => {
                            piece.style.backgroundColor = '#4CAF50'; // 改變顏色為綠色
                            piece.style.transform = 'scale(1.05)'; // 稍微放大
                        });
                    }
                }
            });
        }
    }
    // 重設拖曳的片段
    draggedPiece = null;
}

// 遊戲計時器
function startTimer() {
    gameStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerDisplay.textContent = `時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

// 遊戲完成時的處理
function announceWinner() {
    stopTimer();
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const message = `🎉 恭喜！遊戲完成！總共花費時間：${Math.floor(elapsed / 60)}分${elapsed % 60}秒`;
    addChatMessage('系統', message);
    
    // 顯示遊戲完成的訊息
    const winMessage = document.createElement('div');
    winMessage.className = 'win-message';
    winMessage.textContent = '恭喜完成拼圖！';
    winMessage.style.position = 'fixed';
    winMessage.style.top = '50%';
    winMessage.style.left = '50%';
    winMessage.style.transform = 'translate(-50%, -50%)';
    winMessage.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
    winMessage.style.color = 'white';
    winMessage.style.padding = '20px 40px';
    winMessage.style.borderRadius = '10px';
    winMessage.style.fontSize = '24px';
    winMessage.style.zIndex = '1000';
    document.body.appendChild(winMessage);
    
    // 3秒後移除訊息
    setTimeout(() => {
        winMessage.remove();
    }, 3000);
}

// 聊天功能
function addChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.textContent = `${sender}: ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 工具函數
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 事件監聽器
joinGameButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        players.get(playerName).put({ online: true, timestamp: Date.now() });
        playerNameInput.disabled = true;
        joinGameButton.disabled = true;
        addChatMessage('系統', `${playerName} 加入了遊戲`);
    }
});

startGameButton.addEventListener('click', () => {
    if (playerName) {
        const pieces = initializePuzzle();
        updatePuzzleDisplay(pieces);  // 直接更新顯示
        startTimer();
        addChatMessage('系統', '新遊戲開始！');
    }
});

sendMessageButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message && playerName) {
        addChatMessage(playerName, message);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageButton.click();
    }
});

// 監聽遊戲狀態
puzzle.on((data) => {
    if (data && data.pieces) {
        updatePuzzleDisplay(data.pieces);
    }
});

// 監聽在線玩家
players.map().on((data, playerID) => {
    if (data && data.online) {
        const existingBadge = document.querySelector(`[data-player="${playerID}"]`);
        if (!existingBadge) {
            const playerBadge = document.createElement('div');
            playerBadge.className = 'player-badge';
            playerBadge.textContent = playerID;
            playerBadge.dataset.player = playerID;
            onlinePlayers.appendChild(playerBadge);
        }
    } else {
        const badge = document.querySelector(`[data-player="${playerID}"]`);
        if (badge) {
            badge.remove();
        }
    }
});