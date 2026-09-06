// 資料定義
const balloonData = [
    { name: 'Poodle', emoji: '🐩', display: '貴賓狗' },
    { name: 'Sword', emoji: '🗡️', display: '寶劍' },
    { name: 'Flower', emoji: '🌸', display: '花朵' },
    { name: 'Rabbit', emoji: '🐇', display: '兔子' },
    { name: 'Bear', emoji: '🧸', display: '小熊' },
    { name: 'Monkey', emoji: '🐒', display: '猴子' },
    { name: 'Swan', emoji: '🦢', display: '天鵝' },
    { name: 'Butterfly', emoji: '🦋', display: '蝴蝶' },
    { name: 'Crown', emoji: '👑', display: '皇冠' },
    { name: 'Parrot', emoji: '🦜', display: '鸚鵡' },
    { name: 'Turtle', emoji: '🐢', display: '烏龜' },
    { name: 'Giraffe', emoji: '🦒', display: '長頸鹿' },
    { name: 'Heart', emoji: '❤️', display: '愛心' },
    { name: 'Gun', emoji: '🔫', display: '手槍' },
    { name: 'Hat', emoji: '🎩', display: '帽子' },
    { name: 'Dinosaur', emoji: '🦕', display: '恐龍' },
    { name: 'Motorcycle', emoji: '🏍️', display: '機車' },
    { name: 'Spider', emoji: '🕷️', display: '蜘蛛' },
    { name: 'Lollipop', emoji: '🍭', display: '棒棒糖' },
    { name: 'Dragonfly', emoji: '🪰', display: '蜻蜓' },
    { name: 'Apple', emoji: '🍎', display: '蘋果' }
];
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

function spinCarousel(direction) {
    const itemWidth = carousel.clientWidth;
    const cardsToSpin = 8; 
    
    if (isForceModeActive) {
        const forceSelect = document.getElementById('force-card-select');
        const forcedValue = forceSelect ? forceSelect.value : null;
        
        if (forcedValue && forcedValue !== 'none') {
            let currentIndex = -1;
            if (currentlyVisibleCardElement) {
                currentIndex = parseInt(currentlyVisibleCardElement.dataset.index);
            }
            if (currentIndex !== -1) {
                let targetIndex = currentIndex + (cardsToSpin * direction);
                
                if (targetIndex >= deck.length) targetIndex = deck.length - 1;
                if (targetIndex < 0) targetIndex = 0;
                
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
        }
        isForceModeActive = false;
    }

    // 關閉 snap 避免 iOS 上產生捲動衝突導致中途卡住
    carousel.style.scrollSnapType = 'none';

    carousel.scrollBy({
        left: itemWidth * cardsToSpin * direction,
        behavior: 'smooth'
    });

    // 動畫結束後重新開啟 snap
    setTimeout(() => {
        carousel.style.scrollSnapType = 'x mandatory';
    }, 800);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            currentlyVisibleCardElement = entry.target;
            const index = parseInt(entry.target.dataset.index);
            currentlyVisibleCard = deck[index];
            
            clearTimeout(viewTimer);
            if (isRecordingActive && !hasRecorded) {
                viewTimer = setTimeout(() => {
                    secretChosenCard = currentlyVisibleCard;
                    hasRecorded = true;
                    isRecordingActive = false;
                    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                    console.log("背景紀錄觀眾的牌:", secretChosenCard.display);
                }, 5000);
            }
            
            // 第二機制：觀眾打亂後停在某張牌3秒
            clearTimeout(mechanism2Timer);
            if (hasRecorded && !mechanism2Ready && !isRecordingActive && secretChosenCard) {
                mechanism2Timer = setTimeout(() => {
                    mechanism2Ready = true;
                    swipeSequence = 0;
                    firstSwipeDirection = null;
                    if (navigator.vibrate) navigator.vibrate(20);
                    console.log("第二機制已啟動，等待首次滑動");
                }, 3000);
            }
        } else {
            if (entry.target === currentlyVisibleCardElement) {
                clearTimeout(viewTimer);
                clearTimeout(mechanism2Timer);
            }
        }
    });
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
            
            let duration = Date.now() - pressStartTime;
            if (duration > 0 && duration < 500) {
                activateForceMode();
            }
        }
    };

    function activateForceMode() {
        const forceSelect = document.getElementById('force-card-select');
        if (!forceSelect || forceSelect.value === 'none') {
            return;
        }
        isForceModeActive = true;
        if (navigator.vibrate) navigator.vibrate(20); // 微微震動提示短按成功
        console.log("已啟動拉霸強制停牌模式:", forceSelect.value);
    }

    secretTrigger.addEventListener('touchstart', startPress, { passive: true });
    secretTrigger.addEventListener('mousedown', startPress);
    
    secretTrigger.addEventListener('touchend', cancelPress);
    secretTrigger.addEventListener('touchmove', cancelPress);
    secretTrigger.addEventListener('mouseup', cancelPress);
    secretTrigger.addEventListener('mouseleave', cancelPress);

    function activateSecretMode() {
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
        
        item.addEventListener('click', (e) => {
            if (hasDragged) return;
            if (secretChosenCard && currentlyVisibleCard && currentlyVisibleCard !== secretChosenCard) {
                if (navigator.vibrate) navigator.vibrate([50]);
                cardEl.classList.add('magic-change');
                
                const targetSecretCard = secretChosenCard;
                const clickedCardIndex = parseInt(item.dataset.index);
                const originalCard = deck[clickedCardIndex];

                setTimeout(() => {
                    renderCardFront(front, targetSecretCard);
                    
                    // 找到原本觀眾那張牌的 DOM，把它變成這張點錯的牌，避免出現兩張一樣的牌
                    const secretIndex = deck.findIndex(c => c === targetSecretCard);
                    if (secretIndex !== -1) {
                        const originalSecretDom = carousel.children[secretIndex].querySelector('.card-front');
                        if (originalSecretDom) {
                            renderCardFront(originalSecretDom, originalCard);
                        }
                        // 更新陣列資料
                        deck[clickedCardIndex] = targetSecretCard;
                        deck[secretIndex] = originalCard;
                    }

                    // 變牌後清除紀錄，結束所有機制
                    secretChosenCard = null;
                    currentlyVisibleCard = targetSecretCard;
                }, 300);
            }
        });

        observer.observe(item);
        carousel.appendChild(item);
    });
}

// 實作桌機拖曳滾動 (Drag to scroll)
let startScrollX;
let scrollLeft;

carousel.addEventListener('mousedown', (e) => {
    isDraggingCarousel = true;
    hasDragged = false;
    startScrollX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
    touchStartX = e.pageX;
    swipeStartTime = Date.now();
    if (currentlyVisibleCardElement) {
        touchStartIndex = parseInt(currentlyVisibleCardElement.dataset.index);
    }
});
carousel.addEventListener('mouseleave', () => {
    isDraggingCarousel = false;
});
carousel.addEventListener('mouseup', (e) => {
    isDraggingCarousel = false;
    touchEndX = e.pageX;
    
    let swipeTime = Date.now() - swipeStartTime;
    let distance = touchEndX - touchStartX;
    
    if (Math.abs(distance) > 20) {
        let direction = distance > 0 ? -1 : 1;
        let isFastSwipe = swipeTime < 300 && Math.abs(distance) > 50;
        
        if (isForceModeActive || isFastSwipe) {
            // 中斷原生的慣性滑動
            carousel.style.overflowX = 'hidden';
            void carousel.offsetWidth;
            carousel.style.overflowX = 'auto';
            spinCarousel(direction);
        }
    }
    
    handleSwipe(touchStartX, touchEndX, touchStartIndex);
});
carousel.addEventListener('mousemove', (e) => {
    if (!isDraggingCarousel) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    if (Math.abs(x - startScrollX) > 5) hasDragged = true;
    const walk = (x - startScrollX) * 2; // 滾動速度
    carousel.scrollLeft = scrollLeft - walk;
});

// 手機滑動支援 (Touch events)
carousel.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    swipeStartTime = Date.now();
    if (currentlyVisibleCardElement) {
        touchStartIndex = parseInt(currentlyVisibleCardElement.dataset.index);
    }
}, { passive: true });

carousel.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].clientX;
    
    let swipeTime = Date.now() - swipeStartTime;
    let distance = touchEndX - touchStartX;
    
    if (Math.abs(distance) > 20) {
        let direction = distance > 0 ? -1 : 1;
        let isFastSwipe = swipeTime < 300 && Math.abs(distance) > 50;
        
        if (isForceModeActive || isFastSwipe) {
            // 中斷原生的慣性滑動
            carousel.style.overflowX = 'hidden';
            void carousel.offsetWidth;
            carousel.style.overflowX = 'auto';
            spinCarousel(direction);
        }
    }
    
    handleSwipe(touchStartX, touchEndX, touchStartIndex);
});

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
        element.style.backgroundImage = 'none';
        element.style.flexDirection = 'column';
        
        const emojiWrap = document.createElement('div');
        emojiWrap.style.width = '85%';
        emojiWrap.style.aspectRatio = '4 / 3'; 
        emojiWrap.style.display = 'flex';
        emojiWrap.style.justifyContent = 'center';
        emojiWrap.style.alignItems = 'center';
        emojiWrap.style.fontSize = '80px';
        emojiWrap.style.backgroundColor = '#f9f9f9';
        emojiWrap.style.border = '1px solid #ddd';
        emojiWrap.style.borderRadius = '6px';
        emojiWrap.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        emojiWrap.style.marginBottom = '24px';
        emojiWrap.textContent = card.emoji;
        
        element.appendChild(emojiWrap);
        
        const label = document.createElement('div');
        label.textContent = card.display;
        label.style.fontSize = '32px';
        label.style.fontWeight = '600';
        label.style.color = '#333';
        label.style.letterSpacing = '4px';
        label.style.textAlign = 'center';
        label.style.padding = '0 10px';
        label.style.wordBreak = 'break-word';
        
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
        img.style.width = '85%';
        img.style.aspectRatio = '4 / 3'; 
        img.style.objectFit = 'contain';
        img.style.border = '1px solid #ddd';
        img.style.borderRadius = '6px';
        img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        img.style.marginBottom = card.url ? '0' : '24px';
        
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
const customImageCount = document.getElementById('custom-image-count');

// --- IndexedDB for Custom Images ---
const DB_NAME = 'MagicTrickDB';
const DB_VERSION = 1;
const STORE_NAME = 'customImages';
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
        };
    });
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
    
    customDeck = customData.map(c => ({ type: 'custom', ...c }));
    if (customImageCount) {
        customImageCount.innerHTML = `目前已上傳: ${customData.length} 張`;
    }
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

async function initializeApp() {
    try {
        await initDB();
        const records = await loadCustomImagesFromDB();
        processCustomFiles(records || []);
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
