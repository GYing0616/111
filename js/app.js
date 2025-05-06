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
    // 檢查顯示的數字是否按照 1-9 的順序排列
    return pieces.every((num, index) => {
        const displayNumber = parseInt(num) + 1;
        return displayNumber === index + 1;
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
                    
                    // 檢查遊戲是否完成
                    const isComplete = checkPuzzleComplete(newPieces);
                    
                    if (isComplete) {
                        // 先停止計時器
                        stopTimer();
                        // 然後顯示獲勝畫面
                        showWinMessage();
                        // 更新最終狀態
                        puzzle.put({ 
                            pieces: newPieces, 
                            isComplete: true 
                        });
                    } else {
                        // 如果未完成，只更新拼圖狀態
                        puzzle.put({ 
                            pieces: newPieces, 
                            isComplete: false 
                        });
                    }
                }
            });
        }
    }
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

// 新增遊戲獲勝訊息顯示函數
function showWinMessage() {
    // 創建獲勝視窗
    const winOverlay = document.createElement('div');
    winOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    const winBox = document.createElement('div');
    winBox.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 15px;
        text-align: center;
        max-width: 80%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    winBox.innerHTML = `
        <h2 style="color: #4CAF50; margin-bottom: 20px; font-size: 28px;">🎉 恭喜完成拼圖！</h2>
        <p style="font-size: 18px; margin-bottom: 20px;">總共花費時間：${Math.floor(elapsed / 60)}分${elapsed % 60}秒</p>
        <button onclick="this.closest('div').parentElement.remove()" style="
            margin-top: 20px;
            padding: 12px 30px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        ">太棒了！</button>
    `;
    
    // 停止計時器
    stopTimer();
    
    // 在聊天區域顯示完成訊息
    addChatMessage('系統', `🎉 恭喜！遊戲完成！總共花費時間：${Math.floor(elapsed / 60)}分${elapsed % 60}秒`);
    
    winOverlay.appendChild(winBox);
    document.body.appendChild(winOverlay);
    
    // 為所有拼圖片段添加完成效果
    puzzleContainer.querySelectorAll('.puzzle-piece').forEach(piece => {
        piece.style.backgroundColor = '#4CAF50';
        piece.style.transform = 'scale(1.05)';
        piece.style.transition = 'all 0.5s ease';
    });
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

// 更新玩家列表顯示
function updatePlayerDisplay(playerID, isOnline) {
    const existingBadge = document.querySelector(`[data-player="${playerID}"]`);
    
    if (isOnline && !existingBadge) {
        const playerBadge = document.createElement('div');
        playerBadge.className = 'player-badge';
        playerBadge.textContent = playerID;
        playerBadge.dataset.player = playerID;
        onlinePlayers.appendChild(playerBadge);
        console.log(`玩家 ${playerID} 已加入`);
    } else if (!isOnline && existingBadge) {
        existingBadge.remove();
        console.log(`玩家 ${playerID} 已離開`);
    }
}

// 事件監聽器
joinGameButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        // 更新玩家狀態到 GUN
        players.get(playerName).put({
            online: true,
            timestamp: Date.now(),
            id: playerName
        });
        
        // 更新 UI
        playerNameInput.disabled = true;
        joinGameButton.disabled = true;
        startGameButton.disabled = false;
        
        // 顯示歡迎訊息
        addChatMessage('系統', `歡迎 ${playerName} 加入遊戲！`);
        
        // 立即更新玩家顯示
        updatePlayerDisplay(playerName, true);
        
        // 設定離線處理
        window.addEventListener('beforeunload', () => {
            players.get(playerName).put({ online: false });
        });
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

// 更新監聽玩家狀態的邏輯
players.map().on((data, playerID) => {
    if (data) {
        updatePlayerDisplay(playerID, data.online);
    }
});