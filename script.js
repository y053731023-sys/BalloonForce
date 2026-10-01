// 資料定義
const pictureFiles = [
    "Hello Kitty.webp", "企鵝.webp", "兔子.webp", "大耳狗.webp", "大象.webp", 
    "小熊.webp", "小跑車.webp", "布丁狗.webp", "庫洛米.webp", "恐龍.webp", 
    "愛心棒.webp", "手槍.webp", "摩托車.webp", "斧頭.webp", "棒棒糖.webp", 
    "海龜.webp", "熱狗.webp", "獅子.webp", "皇冠.webp", "美樂蒂.webp", "花朵.webp", 
    "蝴蝶.webp", "螺旋寶劍.webp", "貓咪.webp", "貓掌棒.webp", "貴賓狗.webp", 
    "長頸鹿.webp", "飛機.webp", "魚與釣竿.webp", "玫瑰花.webp"
];

const balloonData = pictureFiles.map(filename => ({
    name: filename.replace('.webp', ''),
    url: 'picture/' + filename,
    display: filename.replace('.webp', '')
}));
const balloonDeck = balloonData.map(b => ({ type: 'balloon', ...b }));


let customData = [];
let customDeck = [];

let deck = [];

// DOM 元素
const carousel = document.getElementById('carousel');

// 狀態
let secretChosenCard = null;
let viewTimer = null;
let currentlyVisibleCard = null;
let currentlyVisibleCardElement = null;
let isDraggingCarousel = false;
let hasDragged = false;
let isRecordingActive = false;
let hasRecorded = false;
let mechanism2Timer = null;
let mechanism2Ready = false;
let swipeSequence = 0;
let firstSwipeDirection = null;
let touchStartX = 0;
let touchEndX = 0;
let touchStartIndex = 0;
let swipeStartTime = 0;
let isForceModeActive = false;

let carouselAnimation = null;

function stopCarouselAnimation() {
    if (carouselAnimation !== null) cancelAnimationFrame(carouselAnimation);
    carouselAnimation = null;
    clearTimeout(viewTimer);
    clearTimeout(mechanism2Timer);
}

function animateToCard(index, duration) {
    stopCarouselAnimation();
    const start = carousel.scrollLeft;
    const target = Math.max(0, Math.min(deck.length - 1, index)) * carousel.clientWidth;
    const started = performance.now();
    carousel.style.scrollSnapType = 'none';
    function frame(now) {
        const progress = Math.min(1, (now - started) / duration);
        carousel.scrollLeft = start + (target - start) * (1 - Math.pow(1 - progress, 3));
        if (progress < 1) {
            carouselAnimation = requestAnimationFrame(frame);
        } else {
            carouselAnimation = null;
            carousel.style.scrollSnapType = 'x mandatory';
            updateSettledCard();
        }
    }
    carouselAnimation = requestAnimationFrame(frame);
}

function spinCarousel(direction) {
    const itemWidth = carousel.clientWidth;
    const cardsToSpin = 12; // 張數改回 12 張，維持足夠的距離感
    
    const startScroll = carousel.scrollLeft;
    let currentIndex = Math.round(startScroll / itemWidth);
    if (currentlyVisibleCardElement) {
        currentIndex = parseInt(currentlyVisibleCardElement.dataset.index);
    }
    
    let targetIndex = currentIndex + (cardsToSpin * direction);
    if (targetIndex >= deck.length) targetIndex = deck.length - 1;
    if (targetIndex < 0) targetIndex = 0;
    
    if (isForceModeActive) {
        const forceSelect = document.getElementById('force-card-select');
        const forcedValue = forceSelect ? forceSelect.value : null;
        
        if (forcedValue && forcedValue !== 'none') {
            let targetCardEl = carousel.children[targetIndex];
            if (targetCardEl) {
                let front = targetCardEl.querySelector('.card-front');
                let forcedCard = deck.find(c => (c.id || c.name) == forcedValue);
                if (forcedCard) {
                    renderCardFront(front, forcedCard);
                    deck[targetIndex] = forcedCard;
                    console.log(`強制把第 ${targetIndex} 張變成了`, forcedCard.display);
                }
            }
        }
        isForceModeActive = false;
    }

    animateToCard(targetIndex, 2500);
}

function updateSettledCard() {
    clearTimeout(viewTimer);
    clearTimeout(mechanism2Timer);
    if (isDraggingCarousel || carouselAnimation !== null || !carousel.clientWidth) return;
    const index = Math.round(carousel.scrollLeft / carousel.clientWidth);
    currentlyVisibleCardElement = carousel.children[index] || null;
    currentlyVisibleCard = deck[index] || null;
    if (!currentlyVisibleCard) return;
    if (isRecordingActive && !hasRecorded) {
        const card = currentlyVisibleCard;
        viewTimer = setTimeout(() => {
            secretChosenCard = card;
            hasRecorded = true;
            isRecordingActive = false;
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
        }, 5000);
    }
    if (hasRecorded && !mechanism2Ready && !isRecordingActive && secretChosenCard) {
        mechanism2Timer = setTimeout(() => {
            mechanism2Ready = true;
            swipeSequence = 0;
            firstSwipeDirection = null;
            if (navigator.vibrate) navigator.vibrate(20);
        }, 3000);
    }
}

const observer = new IntersectionObserver(() => {
    updateSettledCard();
}, { threshold: 0.6 });

// 綁定隱藏觸發區事件
const secretTrigger = document.getElementById('secret-trigger');
if (secretTrigger) {
    let pressTimer = null;
    let isPressing = false;
    let pressStartTime = 0;

    const startPress = (e) => {
        isPressing = true;
        pressStartTime = Date.now();
        pressTimer = setTimeout(() => {
            if (isPressing) {
                pressTimer = null;
                activateSecretMode();
            }
        }, 1000); // 1秒長按
    };

    const cancelPress = () => {
        isPressing = false;
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    secretTrigger.addEventListener('touchstart', startPress, { passive: true });
    secretTrigger.addEventListener('mousedown', startPress);
    
    secretTrigger.addEventListener('touchend', cancelPress);
    secretTrigger.addEventListener('touchmove', cancelPress);
    secretTrigger.addEventListener('mouseup', cancelPress);
    secretTrigger.addEventListener('mouseleave', cancelPress);

    function activateSecretMode() {
        cancelCardReveal();
        stopCarouselAnimation();
        isForceModeActive = false;
        if (navigator.vibrate) navigator.vibrate([30, 30, 30]); // 特殊震動提示
        isRecordingActive = true;
        hasRecorded = false;
        secretChosenCard = null;
        clearTimeout(mechanism2Timer);
        mechanism2Ready = false;
        swipeSequence = 0;
        firstSwipeDirection = null;
        console.log("已開啟背景紀錄模式(長按啟動)");
        
        // 如果當下已經有牌在畫面上，重新啟動計時
        clearTimeout(viewTimer);
        if (currentlyVisibleCard) {
            viewTimer = setTimeout(() => {
                secretChosenCard = currentlyVisibleCard;
                hasRecorded = true;
                isRecordingActive = false;
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                console.log("背景紀錄觀眾的牌:", secretChosenCard.display);
            }, 5000);
        }
    }
}

let chosenCard = null;
let wrongCard = null;
let longPressTimer = null;
let isModalOpen = false;
let isMouseDown = false; // 用於桌機滑鼠長按判定

// 1. 初始化 Carousel
function initCarousel() {
    deck.forEach((card, index) => {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.dataset.index = index;
        
        const cardEl = document.createElement('div');
        cardEl.className = 'card flipped';
        cardEl.style.transform = "rotateY(0deg)";
        
        const front = document.createElement('div');
        renderCardFront(front, card);
        
        cardEl.appendChild(front);
        item.appendChild(cardEl);
        
        observer.observe(item);
        carousel.appendChild(item);
    });
}

// Handle taps at pointer release: pointer capture routes clicks to the carousel,
// so individual card click listeners cannot reliably receive them.
let cardRevealTimer = null;
let revealingCardElement = null;

function cancelCardReveal() {
    clearTimeout(cardRevealTimer);
    cardRevealTimer = null;
    if (revealingCardElement) revealingCardElement.classList.remove('magic-change');
    revealingCardElement = null;
}

function revealRememberedCard(index) {
    if (cardRevealTimer !== null || !secretChosenCard) return;
    const item = carousel.children[index];
    const originalCard = deck[index];
    if (!item || !originalCard || originalCard === secretChosenCard) return;
    const cardEl = item.querySelector('.card');
    const front = item.querySelector('.card-front');
    if (!cardEl || !front) return;
    const targetSecretCard = secretChosenCard;
    revealingCardElement = cardEl;
    cardEl.classList.remove('magic-change');
    void cardEl.offsetWidth;
    cardEl.classList.add('magic-change');
    if (navigator.vibrate) navigator.vibrate([50]);
    cardRevealTimer = setTimeout(() => {
        cardRevealTimer = null;
        // Ignore an old reveal if the theme or magic mode changed meanwhile.
        if (secretChosenCard !== targetSecretCard || deck[index] !== originalCard ||
            carousel.children[index] !== item) return;
        const secretIndex = deck.indexOf(targetSecretCard);
        if (secretIndex !== -1 && secretIndex !== index) {
            const originalSecretFront = carousel.children[secretIndex].querySelector('.card-front');
            if (originalSecretFront) renderCardFront(originalSecretFront, originalCard);
            deck[secretIndex] = originalCard;
        }
        renderCardFront(front, targetSecretCard);
        deck[index] = targetSecretCard;
        secretChosenCard = null;
        hasRecorded = false;
        isRecordingActive = false;
        mechanism2Ready = false;
        swipeSequence = 0;
        firstSwipeDirection = null;
        clearTimeout(viewTimer);
        clearTimeout(mechanism2Timer);
        currentlyVisibleCard = deck[Math.round(carousel.scrollLeft / carousel.clientWidth)] || null;
    }, 300);
}

// Unified mouse / iPhone / iPad gestures. Native momentum is disabled so
// a remembered-card gesture can never move more than one card.
let activePointer = null;
let gestureMode = 'normal';

function getSwipeMode() {
    if (isForceModeActive) return 'force';
    if (isRecordingActive || secretChosenCard !== null) return 'remember';
    return 'normal';
}

function beginCarouselGesture(e) {
    if (activePointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopCarouselAnimation();
    activePointer = e.pointerId;
    isDraggingCarousel = true;
    hasDragged = false;
    touchStartX = e.clientX;
    touchEndX = e.clientX;
    swipeStartTime = Date.now();
    touchStartIndex = Math.max(0, Math.min(deck.length - 1,
        Math.round(carousel.scrollLeft / carousel.clientWidth)));
    gestureMode = getSwipeMode();
    carousel.style.scrollSnapType = 'none';
    carousel.setPointerCapture(e.pointerId);
}

function moveCarouselGesture(e) {
    if (e.pointerId !== activePointer) return;
    touchEndX = e.clientX;
    const distance = touchEndX - touchStartX;
    if (Math.abs(distance) > 10) hasDragged = true;
    const width = carousel.clientWidth;
    const drag = Math.max(-width, Math.min(width, distance));
    carousel.scrollLeft = touchStartIndex * width - drag;
}

function finishCarouselGesture(e, cancelled = false) {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    isDraggingCarousel = false;
    if (carousel.hasPointerCapture(e.pointerId)) carousel.releasePointerCapture(e.pointerId);
    touchEndX = e.clientX;
    const distance = touchEndX - touchStartX;
    const elapsed = Math.max(1, Date.now() - swipeStartTime);
    if (cancelled || Math.abs(distance) <= 20) {
        const isTap = !cancelled && !hasDragged && Math.abs(distance) <= 10 && elapsed < 500;
        animateToCard(touchStartIndex, 180);
        if (isTap) revealRememberedCard(touchStartIndex);
        return;
    }
    hasDragged = true;
    const direction = distance > 0 ? -1 : 1;
    const fast = elapsed < 300 && Math.abs(distance) / elapsed >= 0.5;
    if (gestureMode === 'force' || (gestureMode === 'normal' && fast)) {
        currentlyVisibleCardElement = carousel.children[touchStartIndex];
        spinCarousel(direction);
    } else {
        handleSwipe(touchStartX, touchEndX, touchStartIndex);
        animateToCard(touchStartIndex + direction, 260);
    }
}

carousel.addEventListener('pointerdown', beginCarouselGesture);
carousel.addEventListener('pointermove', moveCarouselGesture);
carousel.addEventListener('pointerup', finishCarouselGesture);
carousel.addEventListener('pointercancel', e => finishCarouselGesture(e, true));
carousel.addEventListener('lostpointercapture', e => {
    if (e.pointerId === activePointer) finishCarouselGesture(e, true);
});
carousel.addEventListener('dragstart', e => e.preventDefault());

function handleSwipe(startX, endX, startIndex) {
    if (!mechanism2Ready) return;
    
    let diff = endX - startX;
    let threshold = 30; // 30px swipe threshold
    
    let swipeDirection = null;
    if (diff > threshold) swipeDirection = 'right';
    else if (diff < -threshold) swipeDirection = 'left';
    
    if (!swipeDirection) return;
    
    if (swipeSequence === 0) {
        firstSwipeDirection = swipeDirection;
        swipeSequence = 1;
        console.log(`第一段滑動 (${swipeDirection}) 觸發，等待反向滑動`);
    } else if (swipeSequence === 1) {
        if (swipeDirection !== firstSwipeDirection) {
            swipeSequence = 2;
            console.log(`反向滑動 (${swipeDirection}) 觸發，啟動變牌`);
            executeMechanism2(startIndex, swipeDirection);
        } else {
            console.log(`同向滑動 (${swipeDirection})，繼續等待反向滑動`);
        }
    }
}

function executeMechanism2(startIndex, finalSwipeDirection) {
    let targetIndex = (finalSwipeDirection === 'left') ? startIndex + 4 : startIndex - 4;
    
    if (targetIndex >= deck.length) {
        targetIndex = deck.length - 1;
    } else if (targetIndex < 0) {
        targetIndex = 0;
    }
    
    let targetCardEl = carousel.children[targetIndex];
    if (targetCardEl && secretChosenCard) {
        let front = targetCardEl.querySelector('.card-front');
        let secretIndex = deck.findIndex(c => c === secretChosenCard);
        let originalTargetCard = deck[targetIndex];
        
        if (secretIndex !== -1 && secretIndex !== targetIndex) {
            let originalSecretDom = carousel.children[secretIndex].querySelector('.card-front');
            if (originalSecretDom) {
                renderCardFront(originalSecretDom, originalTargetCard);
            }
            deck[secretIndex] = originalTargetCard;
        }
        
        renderCardFront(front, secretChosenCard);
        deck[targetIndex] = secretChosenCard;
        
        if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
        let dirName = (finalSwipeDirection === 'left') ? '左' : '右';
        console.log(`已將觀眾的牌放置於第 ${targetIndex} 張 (${dirName}滑的第四張)`);
        
        mechanism2Ready = false;
        swipeSequence = 0;
        firstSwipeDirection = null;
        // 保留觀眾牌紀錄，允許第一機制（點擊變牌）繼續使用
    }
}



function getCardImageUrl(suitSymbol, val) {
    const SUIT_MAP = { '♠': 'S', '♥': 'H', '♣': 'C', '♦': 'D' };
    const v = val === '10' ? '0' : val;
    return `https://deckofcardsapi.com/static/img/${v}${SUIT_MAP[suitSymbol]}.png`;
}

function renderCardFront(element, card) {
    element.className = 'card-front';
    element.innerHTML = '';
    element.style.backgroundColor = 'white';
    
    if (card.type === 'balloon') {
        element.style.backgroundImage = `url('${card.url}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.flexDirection = 'column';
        element.style.justifyContent = 'flex-end';
        element.style.alignItems = 'center';
        
        const label = document.createElement('div');
        label.textContent = card.display;
        label.style.width = '100%';
        label.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        label.style.color = '#fff';
        label.style.fontSize = '26px';
        label.style.fontWeight = '600';
        label.style.textAlign = 'center';
        label.style.padding = '12px 0';
        label.style.letterSpacing = '2px';
        label.style.wordBreak = 'break-word';
        label.style.borderBottomLeftRadius = 'inherit';
        label.style.borderBottomRightRadius = 'inherit';
        
        element.appendChild(label);
    } else if (card.type === 'custom') {
        element.style.backgroundImage = 'none';
        element.style.flexDirection = 'column';
        
        const img = document.createElement('img');
        if (card.url) {
            img.src = card.url;
        } else {
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.display = card.url ? 'block' : 'none';
        img.style.aspectRatio = 'auto';
        img.style.objectFit = 'cover';
        img.style.border = '0';
        img.style.borderRadius = 'inherit';
        img.style.boxShadow = 'none';
        img.style.margin = '0';
        
        element.appendChild(img);
        
        if (!card.url) {
            const label = document.createElement('div');
            label.textContent = card.display;
            label.style.fontSize = '18px';
            label.style.fontWeight = '600';
            label.style.color = '#333';
            label.style.letterSpacing = '1px';
            label.style.textAlign = 'center';
            label.style.padding = '0 10px';
            label.style.wordBreak = 'break-word';
            
            element.appendChild(label);
        }
    }
}


function loadDeckTheme(theme) {
    cancelCardReveal();
    stopCarouselAnimation();
    activePointer = null;
    isDraggingCarousel = false;
    isForceModeActive = false;
    currentlyVisibleCardElement = null;
    carousel.style.scrollSnapType = 'x mandatory';
    let baseDeck;
    if (theme === 'theme-custom') {
        baseDeck = [...customDeck];
        if (baseDeck.length === 0) {
            baseDeck = [{ type: 'custom', url: '', display: '請先上傳圖片' }];
        }
    } else {
        baseDeck = [...balloonDeck];
    }
    baseDeck.sort(() => Math.random() - 0.5);
    
    const forceSelect = document.getElementById('force-card-select');
    if (forceSelect) {
        forceSelect.innerHTML = '<option value="none">無 (不強制)</option>';
        baseDeck.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id || c.name;
            opt.textContent = c.display;
            forceSelect.appendChild(opt);
        });
        
        const savedForce = localStorage.getItem('magic-force-card');
        if (savedForce) {
            forceSelect.value = savedForce;
        }
    }
    
    // 建立大量重複的牌組以產生「無限循環」的效果
    deck = [];
    const repeatCount = 15;
    for (let i = 0; i < repeatCount; i++) {
        deck.push(...baseDeck.map(c => ({...c})));
    }
    
    carousel.innerHTML = '';
    if (typeof observer !== 'undefined') {
        observer.disconnect();
    }
    
    initCarousel();
    
    secretChosenCard = null;
    currentlyVisibleCard = null;
    isRecordingActive = false;
    hasRecorded = false;
    clearTimeout(mechanism2Timer);
    mechanism2Ready = false;
    swipeSequence = 0;
    firstSwipeDirection = null;
    
    setTimeout(() => {
        const middleIndex = Math.floor(deck.length / 2);
        if (carousel.children[middleIndex]) {
            carousel.children[middleIndex].scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
        }
    }, 0);
}

// 後台設定邏輯
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const themeSelect = document.getElementById('theme-select');

if (settingsBtn) {
    let lastTap = 0;
    // 支援手機與電腦的雙擊判斷
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            settingsModal.classList.add('show');
            lastTap = 0; // 重置
        } else {
            lastTap = currentTime;
        }
    });

    // 保留原本的 dblclick 備用
    settingsBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('show');
    });
}

if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.remove('show');
    });
}

const forceSelectForEvents = document.getElementById('force-card-select');
if (forceSelectForEvents) {
    forceSelectForEvents.addEventListener('change', (e) => {
        localStorage.setItem('magic-force-card', e.target.value);
    });
}

const customImageSettings = document.getElementById('custom-image-settings');
const customImageInput = document.getElementById('custom-image-input');
const btnUploadCustom = document.getElementById('btn-upload-custom');
const btnDeleteAllCustom = document.getElementById('btn-delete-all-custom');
const customImageCount = document.getElementById('custom-image-count');

// --- IndexedDB for Custom Images & Background ---
const DB_NAME = 'MagicTrickDB';
const DB_VERSION = 2;
const STORE_NAME = 'customImages';
const BG_STORE_NAME = 'backgroundStore';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (e) => reject(e.target.error);
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
                db.createObjectStore(BG_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function saveBackgroundToDB(file) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        const tx = db.transaction([BG_STORE_NAME], 'readwrite');
        const store = tx.objectStore(BG_STORE_NAME);
        store.put({ id: 'custom-bg', file: file });
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function getBackgroundFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(null);
        const tx = db.transaction([BG_STORE_NAME], 'readonly');
        const store = tx.objectStore(BG_STORE_NAME);
        const request = store.get('custom-bg');
        request.onsuccess = () => resolve(request.result ? request.result.file : null);
        request.onerror = (e) => reject(e.target.error);
    });
}

function deleteBackgroundFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        const tx = db.transaction([BG_STORE_NAME], 'readwrite');
        const store = tx.objectStore(BG_STORE_NAME);
        store.delete('custom-bg');
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function loadAndApplyBackground() {
    const file = await getBackgroundFromDB();
    const btnResetBg = document.getElementById('btn-reset-bg');
    if (file) {
        const url = URL.createObjectURL(file);
        document.body.style.backgroundImage = `url('${url}')`;
        if (btnResetBg) btnResetBg.style.display = 'block';
    } else {
        document.body.style.backgroundImage = "url('Background/1.webp')";
        if (btnResetBg) btnResetBg.style.display = 'none';
    }
}

function addCustomImagesToDB(files) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        files.forEach(file => store.add({ file: file, name: file.name }));
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function deleteCustomImageFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function deleteAllCustomImagesFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('圖片資料庫尚未準備好'));
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('刪除失敗'));
        tx.onabort = () => reject(tx.error || new Error('刪除已中止'));
    });
}

function loadCustomImagesFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function reloadCustomImages() {
    const records = await loadCustomImagesFromDB();
    processCustomFiles(records || []);
    if (themeSelect && themeSelect.value === 'theme-custom') {
        loadDeckTheme('theme-custom');
    }
}

function processCustomFiles(records) {
    customData = [];
    
    const customImageList = document.getElementById('custom-image-list');
    if (customImageList) customImageList.innerHTML = '';

    records.forEach((record, index) => {
        const file = record.file;
        const id = record.id;
        const url = URL.createObjectURL(file);
        
        let displayName = file.name || "";
        displayName = displayName.replace(/\.[^/.]+$/, "");
        if (displayName.length > 8) {
            displayName = displayName.substring(0, 8) + '...';
        }
        customData.push({
            id: id,
            name: file.name,
            url: url,
            display: displayName
        });

        if (customImageList) {
            const thumbWrap = document.createElement('div');
            thumbWrap.style.position = 'relative';
            thumbWrap.style.width = '100%';
            thumbWrap.style.aspectRatio = '1 / 1';
            
            const img = document.createElement('img');
            img.src = url;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '2px';
            delBtn.style.right = '2px';
            delBtn.style.background = 'rgba(255,0,0,0.8)';
            delBtn.style.color = 'white';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '50%';
            delBtn.style.width = '20px';
            delBtn.style.height = '20px';
            delBtn.style.lineHeight = '20px';
            delBtn.style.textAlign = 'center';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '14px';
            delBtn.style.padding = '0';
            
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                await deleteCustomImageFromDB(id);
                await reloadCustomImages();
            };
            
            thumbWrap.appendChild(img);
            thumbWrap.appendChild(delBtn);
            customImageList.appendChild(thumbWrap);
        }
    });
    
    if (btnDeleteAllCustom) btnDeleteAllCustom.disabled = customData.length === 0;
    customDeck = customData.map(c => ({ type: 'custom', ...c }));
    if (customImageCount) {
        customImageCount.innerHTML = `目前已上傳: ${customData.length} 張`;
    }
}

if (btnDeleteAllCustom) {
    btnDeleteAllCustom.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btnDeleteAllCustom.disabled || customData.length === 0) return;
        btnDeleteAllCustom.disabled = true;
        if (btnUploadCustom) btnUploadCustom.disabled = true;
        try {
            await deleteAllCustomImagesFromDB();
            if (themeSelect && themeSelect.value === 'theme-custom') {
                localStorage.setItem('magic-force-card', 'none');
            }
            await reloadCustomImages();
        } catch (error) {
            console.error('無法刪除全部自訂圖片', error);
            alert('未能完成刪除，請稍後再試。');
        } finally {
            btnDeleteAllCustom.disabled = customData.length === 0;
            if (btnUploadCustom) btnUploadCustom.disabled = false;
        }
    });
}

if (btnUploadCustom && customImageInput) {
    btnUploadCustom.addEventListener('click', (e) => {
        e.stopPropagation();
        customImageInput.click();
    });

    customImageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        await addCustomImagesToDB(files);
        await reloadCustomImages();
        
        customImageInput.value = '';
    });
}

const customBgInput = document.getElementById('custom-bg-input');
const btnUploadBg = document.getElementById('btn-upload-bg');
const btnResetBg = document.getElementById('btn-reset-bg');

if (btnUploadBg && customBgInput) {
    btnUploadBg.addEventListener('click', (e) => {
        e.stopPropagation();
        customBgInput.click();
    });

    customBgInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await saveBackgroundToDB(file);
        await loadAndApplyBackground();
        customBgInput.value = '';
    });
}

if (btnResetBg) {
    btnResetBg.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteBackgroundFromDB();
        await loadAndApplyBackground();
    });
}

async function initializeApp() {
    try {
        await initDB();
        const records = await loadCustomImagesFromDB();
        processCustomFiles(records || []);
        await loadAndApplyBackground();
    } catch (e) {
        console.error("IndexedDB error:", e);
    }

    if (themeSelect) {
        let savedTheme = localStorage.getItem('magic-theme') || 'theme-balloon';
        if (savedTheme !== 'theme-balloon' && savedTheme !== 'theme-custom') {
            savedTheme = 'theme-balloon';
        }
        document.body.className = savedTheme;
        themeSelect.value = savedTheme;
        
        if (savedTheme === 'theme-custom' && customImageSettings) {
            customImageSettings.style.display = 'block';
        }

        loadDeckTheme(savedTheme);

        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.body.className = newTheme;
            localStorage.setItem('magic-theme', newTheme);
            
            if (customImageSettings) {
                customImageSettings.style.display = newTheme === 'theme-custom' ? 'block' : 'none';
            }
            
            loadDeckTheme(newTheme);
        });
    } else {
        loadDeckTheme('theme-balloon');
    }
}

initializeApp();

// 強制停牌模式控制函數 (左上角觸發)
function activateForceMode() {
    const forceSelect = document.getElementById('force-card-select');
    if (!forceSelect || forceSelect.value === 'none') {
        return;
    }
    stopCarouselAnimation();
    isRecordingActive = false;
    hasRecorded = false;
    secretChosenCard = null;
    mechanism2Ready = false;
    swipeSequence = 0;
    firstSwipeDirection = null;
    cancelCardReveal();
    isForceModeActive = true;
    if (navigator.vibrate) navigator.vibrate(20); // 微微震動提示短按成功
    console.log("已啟動拉霸強制停牌模式:", forceSelect.value);
}

const forceTrigger = document.getElementById('force-trigger');
if (forceTrigger) {
    forceTrigger.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 避免點擊穿透或觸發其他預設行為
        activateForceMode();
    }, { passive: false });
    
    forceTrigger.addEventListener('mousedown', (e) => {
        e.preventDefault();
        activateForceMode();
    });
}
