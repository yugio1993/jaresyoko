/**
 * 森のじゃれ書庫 - メインアプリケーション
 * Firebase Firestoreによるリアルタイム同期対応デジタル書庫
 */
'use strict';

// ==============================
// 定数定義
// ==============================
const STORAGE_KEYS = {
    VOLUME: 'bookshelf_bgm_volume',
    BOOKMARKS: 'bookshelf_bookmarks',
    CURRENT_SHELF: 'bookshelf_current_id',
    READING_STATS: 'bookshelf_reading_stats',
    COMPLETED_BOOKS: 'bookshelf_completed_books',
};

const BOOK_DEFAULTS = {
    FONT_SIZE: 1.05,
    FONT_SIZE_MIN: 0.7,
    FONT_SIZE_MAX: 2.0,
    FONT_SIZE_STEP: 0.1,
    SPINE_BASE_HEIGHT: 210,
    SPINE_HEIGHT_VARIANCE: 60,
    BOOKS_PER_ROW_MIN: 9,
    BOOKS_PER_ROW_VARIANCE: 3,
    MIN_SHELF_ROWS: 2,
    PAGE_GAP: 100,
};

const IMPORT_COLORS = ['#8B0000', '#2F4F4F', '#191970', '#4B0082', '#556B2F', '#A0522D'];
const IMPORT_PATTERNS = ['antique', 'leather', 'fabric'];
const DECOR_TYPES = ['vase', 'frame', 'vase-2', 'frame-2', 'vase-3', 'frame-3'];
const TAG_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e84393'];

const ANIMATION_TIMING = {
    BOOK_OPEN_DELAY: 50,
    PAGINATION_DELAY: 1500,
    FONT_RECALC_DELAY: 100,
    SHELF_TRANSITION: 400,
    TOAST_DURATION: 4000,
    TOAST_FADEOUT: 500,
};

// ==============================
// アプリケーション状態
// ==============================
let bookshelves = [];
let books = [];
let currentBookshelfId = null;
let currentFontSize = BOOK_DEFAULTS.FONT_SIZE;
let isGothic = false;
let currentBgmVolume = 0.12;
let currentSeason = 'spring';
let particlesActive = false;

// ==============================
// Firebase 設定
// ==============================
// FIXME: ここにあなたのFirebase設定を貼り付けてください
const firebaseConfig = {
  apiKey: "AIzaSyAjSCZWwLLFOIl08ZVlj_PSfx9-Xq-vHQo",
  authDomain: "jareshoko.firebaseapp.com",
  projectId: "jareshoko",
  storageBucket: "jareshoko.firebasestorage.app",
  messagingSenderId: "839348164263",
  appId: "1:839348164263:web:520351a7d8a18667422d82"
};

// Firebase初期化
try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
} catch (e) {
    console.error("Firebase initialization failed:", e);
    var db = null;
}

// ==============================
// BGM管理
// ==============================
const dayBgmList = [
    'bgm_day/spring_mountain.mp3',
];
const nightBgmList = [
    'bgm_night/gentle_snow.mp3',
];

let bgmAudio = null;
let bgmPlaylist = [];
let bgmIndex = 0;

/**
 * 配列をFisher-Yatesアルゴリズムでシャッフルする（元配列は変更しない）
 * @param {Array} arr - シャッフル対象の配列
 * @returns {Array} シャッフルされた新しい配列
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function stopBgm() {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.onended = null;
        bgmAudio = null;
    }
}

function playNextBgm() {
    if (bgmPlaylist.length === 0) return;
    bgmIndex = (bgmIndex + 1) % bgmPlaylist.length;
    loadAndPlayBgm(bgmPlaylist[bgmIndex]);
}

function loadAndPlayBgm(src) {
    stopBgm();
    const audio = new Audio(src);
    audio.volume = currentBgmVolume;
    audio.onended = playNextBgm;
    audio.onerror = () => {
        if (bgmPlaylist.length > 1) playNextBgm();
    };
    audio.play().catch(e => console.log('BGM play blocked:', e));
    bgmAudio = audio;
}

function playCurrentBgm() {
    const isDark = document.body.classList.contains('dark-theme');
    const list = isDark ? nightBgmList : dayBgmList;
    if (list.length === 0) return;
    bgmPlaylist = shuffle(list);
    bgmIndex = 0;
    loadAndPlayBgm(bgmPlaylist[0]);
}

// ==============================
// DOM 参照
// ==============================
const startScreen      = document.getElementById('start-screen');
const startBtn         = document.getElementById('start-btn');
const mainContent      = document.getElementById('main-content');
const bookshelfWrapper = document.getElementById('bookshelf-wrapper');
const flipSound        = document.getElementById('flip-sound');
const closeSound       = document.getElementById('close-sound');
const searchInput      = document.getElementById('search-input');
const sortSelect       = document.getElementById('sort-select');
const darkModeBtn      = document.getElementById('dark-mode-btn');
const addBookBtn       = document.getElementById('add-book-btn');
const downloadBtn       = document.getElementById('download-btn');
const addBookModal     = document.getElementById('add-book-modal');
const closeAddModal    = document.getElementById('close-add-modal');
const addBookForm      = document.getElementById('add-book-form');
const fileUpload       = document.getElementById('file-upload');
const bookTitleInput   = document.getElementById('book-title');
const bookContentInput = document.getElementById('book-content');
const editBookIdInput  = document.getElementById('edit-book-id');
const modalTitle       = document.getElementById('modal-title');
const saveBookBtn      = document.getElementById('save-book-btn');
const readBookModal    = document.getElementById('read-book-modal');
const closeReadModal   = document.getElementById('close-read-modal');
const currentBookEl    = document.getElementById('current-book');
const bookCoverElement = document.getElementById('book-cover-element');
const readTitleFront   = document.getElementById('read-title-front');
const readTitle        = document.getElementById('read-title');
const readContent      = document.getElementById('read-content');
const bookViewport     = document.getElementById('book-viewport');
const prevPageBtn      = document.getElementById('prev-page-btn');
const nextPageBtn      = document.getElementById('next-page-btn');
const fontFamilyBtn    = document.getElementById('font-family-btn');
const fontSizeDownBtn  = document.getElementById('font-size-down-btn');
const fontSizeUpBtn    = document.getElementById('font-size-up-btn');

const bookshelfTabs    = document.getElementById('bookshelf-tabs');
const addShelfBtn      = document.getElementById('add-shelf-btn');
const renameShelfModal = document.getElementById('rename-shelf-modal');
const closeRenameModal = document.getElementById('close-rename-shelf-modal');
const renameShelfForm  = document.getElementById('rename-shelf-form');
const shelfNameInput   = document.getElementById('shelf-name-input');
const randomBookBtn    = document.getElementById('random-book-btn');
const prevShelfBtn     = document.getElementById('prev-shelf-btn');
const nextShelfBtn     = document.getElementById('next-shelf-btn');

const contextMenu      = document.getElementById('context-menu');
const bookCtxOptions   = document.getElementById('book-ctx-options');
const shelfCtxOptions  = document.getElementById('shelf-ctx-options');
const ctxEditBtn       = document.getElementById('ctx-edit-btn');
const ctxDeleteBtn     = document.getElementById('ctx-delete-btn');

const downloadModal         = document.getElementById('download-modal');
const closeDownloadModal    = document.getElementById('close-download-modal');
const downloadBookList      = document.getElementById('download-book-list');
const doDownloadBtn         = document.getElementById('do-download-btn');
const selectAllBtn          = document.getElementById('select-all-btn');
const deselectAllBtn        = document.getElementById('deselect-all-btn');
const clearBookmarksBtn     = document.getElementById('clear-bookmarks-btn');
const ctxRemoveBookmarkBtn  = document.getElementById('ctx-remove-bookmark-btn');

const dragOverlay           = document.getElementById('drag-overlay');
const toastContainer        = document.getElementById('toast-container');

const bulkDeleteBtn         = document.getElementById('bulk-delete-btn');
const deleteModal           = document.getElementById('delete-modal');
const deleteBookList        = document.getElementById('delete-book-list');
const doDeleteBtn           = document.getElementById('do-delete-btn');
const selectAllDeleteBtn    = document.getElementById('select-all-delete-btn');
const deselectAllDeleteBtn  = document.getElementById('deselect-all-delete-btn');
const closeDeleteModal      = document.getElementById('close-delete-modal');

const importConflictModal   = document.getElementById('import-conflict-modal');
const conflictBookList      = document.getElementById('conflict-book-list');
const doImportConflictBtn   = document.getElementById('do-import-conflict-btn');
const selectAllConflictBtn   = document.getElementById('select-all-conflict-btn');
const deselectAllConflictBtn = document.getElementById('deselect-all-conflict-btn');
const closeImportConflictModal = document.getElementById('close-import-conflict-modal');
const conflictSummaryText   = document.getElementById('conflict-summary-text');

// v40: 新機能DOM
const statsBtn              = document.getElementById('stats-btn');
const statsModal            = document.getElementById('stats-modal');
const closeStatsModal       = document.getElementById('close-stats-modal');
const backupBtn             = document.getElementById('backup-btn');
const backupModal           = document.getElementById('backup-modal');
const closeBackupModal      = document.getElementById('close-backup-modal');
const doExportBtn           = document.getElementById('do-export-btn');
const importJsonFile        = document.getElementById('import-json-file');
const tagFilter             = document.getElementById('tag-filter');
const bookTagsInput         = document.getElementById('book-tags');
const fireplace             = document.getElementById('fireplace');
const seasonParticles       = document.getElementById('season-particles');
const shortcutsModal        = document.getElementById('shortcuts-modal');
const closeShortcutsModal   = document.getElementById('close-shortcuts-modal');
const pageInfo              = document.getElementById('page-info');
const readingProgressFill   = document.getElementById('reading-progress-fill');
const ctxMoveShelfBtn       = document.getElementById('ctx-move-shelf-btn');
const moveShelfMenu         = document.getElementById('move-shelf-menu');

// ==============================
// ページネーション・コンテキスト状態
// ==============================
let currentPage = 0;
let totalPages = 1;
/** @type {number|null} 現在読んでいる本のID */
let currentReadingBookId = null;
/** @type {number|null} 右クリックメニュー対象の本ID */
let contextMenuTargetId = null;
/** @type {Array} インポート衝突解決待ちの本の一時バッファ */
let pendingImportBooks = [];

// ==============================
// 初期化
// ==============================
async function init() {
    console.log("Initializing Forest Archive v40...");
    setupEventListeners(); // UI操作を最優先
    restoreUserSettings();
    detectSeason();
    
    if (db) {
        setupFirestoreListeners();
    } else {
        showToast('データベースに接続できません。オフラインモードで動作します。', 'forest');
        renderBookshelf();
    }
    
    setupDragAndDrop();
    setupKeyboardShortcuts();
    startSeasonParticles();
}

/**
 * LocalStorageから個人設定（音量など）を復元する
 */
function restoreUserSettings() {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    if (savedVolume !== null) {
        currentBgmVolume = parseFloat(savedVolume);
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) volumeSlider.value = currentBgmVolume;
    }
}

function setupFirestoreListeners() {
    if (!db) return;
    showToast('書庫に接続中...', 'forest');

    // 本棚の監視
    db.collection('bookshelves').orderBy('id', 'asc').onSnapshot(snapshot => {
        bookshelves = snapshot.docs.map(doc => doc.data());
        if (bookshelves.length === 0) {
            // 初期本棚の作成（誰もいない場合のみ）
            createInitialShelf();
        } else {
            if (!currentBookshelfId) currentBookshelfId = bookshelves[0].id;
            renderBookshelf();
        }
    });

    // 本の監視
    db.collection('books').onSnapshot(snapshot => {
        const firestoreBooks = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
        
        // しおり情報（LocalStorage）はブラウザ個人のデータとしてマージ
        const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
        books = firestoreBooks.map(b => ({
            ...b,
            lastPage: bookmarks[b.id] || 0
        }));
        
        renderBookshelf();
    });
}

async function createInitialShelf() {
    const id = Date.now();
    const newShelf = { id, name: 'じゃれ書庫 1' };
    await db.collection('bookshelves').doc(String(id)).set(newShelf);
}

/**
 * しおり（読書進捗）をLocalStorageに保存する
 * @param {number} bookId - 本のID
 * @param {number} page - 現在のページ番号
 */
function saveBookmark(bookId, page) {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
    bookmarks[bookId] = page;
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
}

// ==============================
// 本棚描画
// ==============================
function renderBookshelf() {
    renderTabs();
    bookshelfWrapper.innerHTML = '<div class="decorations-image"></div>';
    const displayBooks = getSortedAndFilteredBooks();
    
    let currentBookIndex = 0;
    while (currentBookIndex < displayBooks.length || currentBookIndex === 0) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        
        // 1段あたりの冊数をランダムに変動させ、自然な見た目にする
        const booksInThisRow = Math.floor(Math.random() * BOOK_DEFAULTS.BOOKS_PER_ROW_VARIANCE) + BOOK_DEFAULTS.BOOKS_PER_ROW_MIN;
        const rowBooks = displayBooks.slice(currentBookIndex, currentBookIndex + booksInThisRow);
        
        rowBooks.forEach(book => {
            row.appendChild(createBookSpine(book));
        });

        // 空きスペースに小物を配置
        const remainingSpace = booksInThisRow - rowBooks.length;
        if (remainingSpace > 2 || displayBooks.length === 0) {
            const decorCount = Math.floor(Math.random() * 2) + 1;
            for (let j = 0; j < decorCount; j++) {
                const decor = document.createElement('div');
                const type = DECOR_TYPES[Math.floor(Math.random() * DECOR_TYPES.length)];
                decor.className = `cute-item-${type}`;
                row.appendChild(decor);
            }
        }

        bookshelfWrapper.appendChild(row);
        currentBookIndex += booksInThisRow;
        if (currentBookIndex >= displayBooks.length && displayBooks.length > 0) break;
        if (displayBooks.length === 0) break; // 最低1段は表示
    }

    // 本が全くない場合でも最低段数は表示して本棚らしさを保つ
    while (bookshelfWrapper.querySelectorAll('.bookshelf-row').length < BOOK_DEFAULTS.MIN_SHELF_ROWS) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        bookshelfWrapper.appendChild(row);
    }

    // v40: タグ選択肢の更新
    updateTagFilterOptions();
}

function getSortedAndFilteredBooks() {
    const q = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const tagFilterVal = tagFilter ? tagFilter.value : '';

    let filtered = books.filter(b => b.shelfId === currentBookshelfId);

    if (q) {
        filtered = filtered.filter(b => 
            b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q)
        );
    }

    // v40: タグフィルター
    if (tagFilterVal) {
        filtered = filtered.filter(b => b.tags && b.tags.includes(tagFilterVal));
    }

    if (sort === 'newest') filtered.sort((a, b) => b.date - a.date);
    else if (sort === 'oldest') filtered.sort((a, b) => a.date - b.date);
    else if (sort === 'color') filtered.sort((a, b) => a.color.localeCompare(b.color));
    else if (sort === 'completed') {
        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_BOOKS) || '{}');
        filtered.sort((a, b) => (completed[b.id] || 0) - (completed[a.id] || 0));
    }

    return filtered;
}

/**
 * 本の背表紙DOM要素を生成する
 * @param {{id: number, title: string, color: string, pattern: string, lastPage: number}} book
 * @returns {HTMLElement}
 */
function createBookSpine(book) {
    const spine = document.createElement('div');
    spine.className = `book-spine pattern-${book.pattern || 'antique'}`;
    spine.style.backgroundColor = book.color;
    spine.style.height = `${BOOK_DEFAULTS.SPINE_BASE_HEIGHT + (book.id % BOOK_DEFAULTS.SPINE_HEIGHT_VARIANCE)}px`;
    spine.dataset.bookId = book.id;

    const title = document.createElement('div');
    title.className = 'spine-text';
    title.textContent = book.title;

    const tooltip = document.createElement('div');
    tooltip.className = 'book-spine-tooltip';
    let tooltipText = book.title;
    if (book.tags && book.tags.length > 0) {
        tooltipText += '\n' + book.tags.map(t => `#${t}`).join(' ');
    }
    tooltip.textContent = tooltipText;

    spine.appendChild(title);
    spine.appendChild(tooltip);

    if (book.lastPage > 0) {
        const ribbon = document.createElement('div');
        ribbon.className = 'bookmark-ribbon';
        spine.appendChild(ribbon);
    }

    // v40: プログレスバー
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
    const savedPage = bookmarks[book.id] || 0;
    if (savedPage > 0) {
        const progress = document.createElement('div');
        progress.className = 'spine-progress';
        const fill = document.createElement('div');
        fill.className = 'spine-progress-fill';
        // ページ数推定（文字数ベース）
        const estTotal = Math.max(1, Math.ceil(book.content.length / 800));
        const pct = Math.min(100, Math.round(((savedPage + 1) / estTotal) * 100));
        fill.style.width = `${pct}%`;
        progress.appendChild(fill);
        spine.appendChild(progress);
    }

    // v40: 読了バッジ
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_BOOKS) || '{}');
    if (completed[book.id]) {
        const badge = document.createElement('div');
        badge.className = 'completion-badge';
        badge.innerHTML = '<i class="fas fa-check"></i>';
        badge.title = '読了';
        spine.appendChild(badge);
    }

    // v40: タグドット表示
    if (book.tags && book.tags.length > 0) {
        const tagContainer = document.createElement('div');
        tagContainer.className = 'spine-tags';
        book.tags.slice(0, 3).forEach((tag, i) => {
            const dot = document.createElement('div');
            dot.className = 'spine-tag-dot';
            dot.style.backgroundColor = TAG_COLORS[i % TAG_COLORS.length];
            tagContainer.appendChild(dot);
        });
        spine.appendChild(tagContainer);
    }

    spine.addEventListener('click', () => openBook(book));
    spine.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        contextMenuTargetId = book.id;
        showContextMenu(e, 'book');
    });

    // v40: 引き抜き演出
    spine.addEventListener('mouseenter', () => {
        const prev = spine.previousElementSibling;
        const next = spine.nextElementSibling;
        if (prev && prev.classList.contains('book-spine')) prev.classList.add('neighbor-tilt-left');
        if (next && next.classList.contains('book-spine')) next.classList.add('neighbor-tilt-right');
    });
    spine.addEventListener('mouseleave', () => {
        const prev = spine.previousElementSibling;
        const next = spine.nextElementSibling;
        if (prev) prev.classList.remove('neighbor-tilt-left');
        if (next) next.classList.remove('neighbor-tilt-right');
    });

    return spine;
}

function showContextMenu(e, type) {
    contextMenu.classList.remove('hidden');
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top  = `${e.pageY}px`;

    bookCtxOptions.classList.add('hidden');
    shelfCtxOptions.classList.add('hidden');

    if (type === 'book') bookCtxOptions.classList.remove('hidden');
    else if (type === 'shelf') shelfCtxOptions.classList.remove('hidden');
}

// ==============================
// 読書画面
// ==============================
function openBook(book) {
    currentReadingBookId = book.id;
    readTitleFront.textContent = book.title;
    readTitle.textContent = book.title;
    readContent.innerHTML = book.content.split('\n').map(p => p.trim() === '' ? '<br>' : `<p>${p}</p>`).join('');
    readContent.style.fontSize = `${currentFontSize}rem`;
    bookCoverElement.style.backgroundColor = book.color;
    bookCoverElement.className = `book-cover pattern-${book.pattern || 'antique'}`;

    readBookModal.classList.remove('hidden');
    currentBookEl.classList.remove('open');
    currentBookEl.classList.add('closed');

    // 音声を再生
    void currentBookEl.offsetWidth; 
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});

    setTimeout(() => {
        currentBookEl.classList.remove('closed');
        currentBookEl.classList.add('open');
        setTimeout(() => {
            calculatePagination(book.lastPage || 0);
            updateReadingProgress(); // v40: プログレス更新
        }, 1500);
    }, 50);
}

/**
 * 縦書きページネーションを計算する
 * @param {number} jumpToPage - 移動先のページ番号
 */
function calculatePagination(jumpToPage = 0) {
    const vw = bookViewport.clientWidth;
    const pageAdvance = vw + BOOK_DEFAULTS.PAGE_GAP;
    
    readContent.style.transform = 'translateX(0)';
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const sw = readContent.scrollWidth;
            totalPages = Math.max(1, Math.ceil(sw / pageAdvance));
            currentPage = Math.min(jumpToPage, totalPages - 1);
            updatePaginationUI();
        });
    });
}

/** ページネーションのUI状態を更新する */
function updatePaginationUI() {
    const vw = bookViewport.clientWidth;
    const pageAdvance = vw + BOOK_DEFAULTS.PAGE_GAP;
    readContent.style.transform = `translateX(${currentPage * pageAdvance}px)`;

    nextPageBtn.disabled = currentPage >= totalPages - 1;
    prevPageBtn.disabled = currentPage === 0;

    // v40: プログレスとページ情報の更新
    if (pageInfo) pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
    updateReadingProgress();
}

function updateReadingProgress() {
    if (!readingProgressFill) return;
    const pct = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 100;
    readingProgressFill.style.width = `${pct}%`;

    // v40: 自動しおり保存（ページめくりのたび）
    if (currentReadingBookId) {
        saveBookmark(currentReadingBookId, currentPage);
        trackReadingProgress(currentReadingBookId, currentPage);
    }
}

/**
 * ページをめくる
 * @param {'next'|'prev'} dir - 方向
 */
function flipPage(dir) {
    if (dir === 'next' && currentPage < totalPages - 1) currentPage++;
    else if (dir === 'prev' && currentPage > 0) currentPage--;
    else return;

    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});
    updatePaginationUI();
}

// ==============================
// v40: 読書統計 & 読了
// ==============================
function trackReadingProgress(bookId, page) {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_STATS) || '{}');
    const today = new Date().toISOString().split('T')[0];
    
    if (!stats[today]) stats[today] = { pages: 0, books: [] };
    
    // 簡易的なページカウント（同じ日に同じ本で進んだ場合のみカウントする等の厳密な管理は省略）
    stats[today].pages += 1; 
    if (!stats[today].books.includes(bookId)) stats[today].books.push(bookId);
    
    localStorage.setItem(STORAGE_KEYS.READING_STATS, JSON.stringify(stats));

    // 読了チェック
    if (page >= totalPages - 1 && totalPages > 1) {
        markAsCompleted(bookId);
    }
}

function markAsCompleted(bookId) {
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_BOOKS) || '{}');
    if (!completed[bookId]) {
        completed[bookId] = Date.now();
        localStorage.setItem(STORAGE_KEYS.COMPLETED_BOOKS, JSON.stringify(completed));
        showToast('一冊の物語を読み終えました。読了おめでとうございます！', 'forest');
        renderBookshelf();
    }
}

function showStats() {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_STATS) || '{}');
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_BOOKS) || '{}');
    
    const totalPagesRead = Object.values(stats).reduce((acc, curr) => acc + (curr.pages || 0), 0);
    const completedCount = Object.keys(completed).length;

    document.getElementById('stat-total-pages').textContent = totalPagesRead;
    document.getElementById('stat-completed-books').textContent = completedCount;
    document.getElementById('stat-total-books').textContent = books.length;

    renderHeatmap(stats);
    renderCompletedList(completed);
    statsModal.classList.remove('hidden');
}

function renderHeatmap(stats) {
    const container = document.getElementById('stats-heatmap');
    container.innerHTML = '';
    const now = new Date();
    
    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = stats[dateStr] || { pages: 0 };
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        const pages = dayData.pages || 0;
        if (pages > 0) {
            const level = Math.min(4, Math.ceil(pages / 10));
            cell.classList.add(`heatmap-level-${level}`);
        }
        cell.title = `${dateStr}: ${pages} ページ`;
        container.appendChild(cell);
    }
}

function renderCompletedList(completed) {
    const container = document.getElementById('completed-list');
    const completedIds = Object.keys(completed).sort((a, b) => completed[b] - completed[a]);
    
    if (completedIds.length === 0) {
        container.innerHTML = '<p style="color:#999;">まだ読了した本はありません。</p>';
        return;
    }

    container.innerHTML = '';
    completedIds.forEach(id => {
        const book = books.find(b => String(b.id) === String(id));
        if (book) {
            const item = document.createElement('div');
            item.className = 'completed-item';
            const date = new Date(completed[id]).toLocaleDateString();
            item.innerHTML = `<i class="fas fa-medal"></i> <span>${book.title}</span> <span class="completed-date">${date}</span>`;
            container.appendChild(item);
        }
    });
}

// ==============================
// v40: 季節 & パーティクル
// ==============================
function detectSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) currentSeason = 'spring';
    else if (month >= 6 && month <= 8) currentSeason = 'summer';
    else if (month >= 9 && month <= 11) currentSeason = 'autumn';
    else currentSeason = 'winter';
}

function startSeasonParticles() {
    if (particlesActive) return;
    particlesActive = true;
    setInterval(createParticle, 500);
}

function createParticle() {
    const p = document.createElement('div');
    p.className = `particle particle-${currentSeason}`;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (Math.random() * 5 + 5) + 's';
    p.style.opacity = Math.random() * 0.5 + 0.3;
    seasonParticles.appendChild(p);
    setTimeout(() => p.remove(), 10000);
}

// ==============================
// v40: バックアップ & 復元
// ==============================
async function exportData() {
    const data = {
        books,
        bookshelves,
        bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}'),
        stats: JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_STATS) || '{}'),
        completed: JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_BOOKS) || '{}'),
        exportDate: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookshelf_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('書庫のデータを保存しました。');
}

async function importData(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('データを復元しますか？現在のデータに上書き・統合されます。')) {
                // Firebase同期本は統合が難しいため、設定系のみ優先復元し、本は新規追加として扱う等の処理が必要
                // ここでは簡易的にLocalStorage系の設定を復元
                if (data.bookmarks) localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(data.bookmarks));
                if (data.stats) localStorage.setItem(STORAGE_KEYS.READING_STATS, JSON.stringify(data.stats));
                if (data.completed) localStorage.setItem(STORAGE_KEYS.COMPLETED_BOOKS, JSON.stringify(data.completed));
                
                showToast('設定と統計を復元しました。蔵書はFirestoreから同期されます。');
                location.reload();
            }
        } catch (err) {
            showToast('ファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
}

// ==============================
// v40: キーボードショートカット
// ==============================
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // 入力中は無視
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (e.key === 'Escape') document.activeElement.blur();
            return;
        }

        if (!readBookModal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') flipPage('next'); // 縦書きなので左が次
            if (e.key === 'ArrowRight') flipPage('prev');
            if (e.key === 'Escape') closeReadModal.click();
            return;
        }

        switch(e.key.toLowerCase()) {
            case 'n': addBookBtn.click(); break;
            case 'd': darkModeBtn.click(); break;
            case 'r': randomBookBtn.click(); break;
            case 's': statsBtn.click(); break;
            case 'escape': 
                addBookModal.classList.add('hidden');
                downloadModal.classList.add('hidden');
                deleteModal.classList.add('hidden');
                statsModal.classList.add('hidden');
                backupModal.classList.add('hidden');
                shortcutsModal.classList.add('hidden');
                break;
            case '?':
            case '/':
                shortcutsModal.classList.remove('hidden');
                break;
        }
    });
}

// ==============================
// 本棚管理（タブ・今日の一冊）
// ==============================
function renderTabs() {
    bookshelfTabs.innerHTML = '';
    bookshelves.forEach(shelf => {
        const tab = document.createElement('div');
        tab.className = `bookshelf-tab ${shelf.id === currentBookshelfId ? 'active' : ''}`;
        tab.innerHTML = `
            <span>${shelf.name}</span>
            <i class="fas fa-edit tab-rename-icon" title="名前を変更"></i>
        `;
        
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-rename-icon')) {
                openRenameModal(shelf);
            } else {
                currentBookshelfId = shelf.id;
                renderBookshelf();
                localStorage.setItem(STORAGE_KEYS.CURRENT_SHELF, currentBookshelfId);
            }
        });
        bookshelfTabs.appendChild(tab);
    });
}

function openRenameModal(shelf) {
    shelfNameInput.value = shelf.name;
    renameShelfModal.dataset.shelfId = shelf.id;
    renameShelfModal.classList.remove('hidden');
}

function openRandomBook() {
    if (books.length === 0) {
        showToast('書庫に本が一冊もありません。');
        return;
    }
    const randomIdx = Math.floor(Math.random() * books.length);
    const book = books[randomIdx];
    
    // もし現在の棚と違う本なら棚を切り替える
    if (book.shelfId !== currentBookshelfId) {
        currentBookshelfId = book.shelfId;
        renderBookshelf();
    }
    
    showToast(`「${book.title}」を棚から取り出しました。`);
    openBook(book);
}

// ==============================
// ドラッグ＆ドロップ
// ==============================
/**
 * ドラッグ＆ドロップによるファイルインポートを設定する
 */
function setupDragAndDrop() {
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragOverlay.classList.remove('hidden');
    });
    dragOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('hidden');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('hidden');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    });
}

/**
 * ファイルアップロード処理（重複チェック付き）
 * @param {FileList} files - アップロードされたファイル群
 */
async function handleFileUpload(files) {
    const immediateImports = [];
    const conflictBooks = [];

    for (const file of Array.from(files)) {
        if (!file.name.endsWith('.txt')) continue;

        const title = file.name.replace(/\.[^/.]+$/, '');
        const content = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        });

        const bookData = {
            id: Date.now() + Math.random(),
            title,
            content,
            color: IMPORT_COLORS[Math.floor(Math.random() * IMPORT_COLORS.length)],
            pattern: IMPORT_PATTERNS[Math.floor(Math.random() * IMPORT_PATTERNS.length)],
            lastPage: 0,
            date: Date.now(),
            shelfId: currentBookshelfId,
        };

        if (books.some(b => b.title === title)) {
            conflictBooks.push(bookData);
        } else {
            immediateImports.push(bookData);
        }
    }

    // 重複がないものは即座にインポート
    if (immediateImports.length > 0) {
        immediateImports.forEach(book => db.collection('books').add(book));
    }

    // 重複がある場合は専用画面を表示
    if (conflictBooks.length > 0) {
        pendingImportBooks = conflictBooks;
        showImportConflictModal();
    } else if (immediateImports.length > 0) {
        showToast(`${immediateImports.length}冊の物語を棚に収めました。`);
    }
}

function showImportConflictModal() {
    conflictBookList.innerHTML = '';
    pendingImportBooks.forEach(b => {
        const card = document.createElement('div');
        card.className = 'conflict-book-card selected'; // デフォルトで選択状態
        card.innerHTML = `
            <div class="card-spine" style="background-color: ${b.color}"></div>
            <div class="card-title">${b.title}</div>
            <input type="checkbox" id="conf-${b.id}" data-id="${b.id}" checked>
        `;
        card.addEventListener('click', () => {
            const cb = card.querySelector('input');
            cb.checked = !cb.checked;
            card.classList.toggle('selected', cb.checked);
        });
        conflictBookList.appendChild(card);
    });
    conflictSummaryText.textContent = `計 ${pendingImportBooks.length} 冊の重複が見つかりました。`;
    importConflictModal.classList.remove('hidden');
}

// ==============================
// トースト通知
// ==============================
/**
 * トースト通知を表示する
 * @param {string} message - 表示メッセージ
 * @param {'default'|'forest'} type - トーストの種類
 */
function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'forest' ? 'toast-forest' : ''}`;
    const icon = type === 'forest' ? 'fa-leaf' : 'fa-check-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), ANIMATION_TIMING.TOAST_FADEOUT);
    }, ANIMATION_TIMING.TOAST_DURATION);
}

// ==============================
// イベント設定
// ==============================
function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        mainContent.style.animation = 'fadeIn 1.5s ease';
        playCurrentBgm();
    });

    darkModeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        darkModeBtn.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i> ライトモード' 
            : '<i class="fas fa-moon"></i> ダークモード';
        
        if (isDark) {
            fireplace.classList.remove('hidden');
        } else {
            fireplace.classList.add('hidden');
        }
        
        playCurrentBgm();
    });

    searchInput.addEventListener('input', renderBookshelf);
    sortSelect.addEventListener('change', renderBookshelf);

    addBookBtn.addEventListener('click', () => {
        addBookForm.reset();
        editBookIdInput.value = '';
        modalTitle.textContent  = '新しい本を棚にしまう';
        saveBookBtn.textContent = '追加する';
        addBookModal.classList.remove('hidden');
    });

    closeAddModal.addEventListener('click', () => addBookModal.classList.add('hidden'));

    fileUpload.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        addBookModal.classList.add('hidden');
    });

    addBookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editBookIdInput.value;
        const title = bookTitleInput.value;
        const content = bookContentInput.value;
        const color = document.querySelector('input[name="book-color"]:checked').value;
        const pattern = document.querySelector('input[name="book-pattern"]:checked').value;
        const tags = bookTagsInput.value.split(',').map(t => t.trim()).filter(t => t !== '');

        if (id) {
            const b = books.find(item => item.id == id);
            if (b) {
                db.collection('books').doc(b.firestoreId).update({ title, content, color, pattern, tags });
            }
        } else {
            const newBook = { id: Date.now(), title, content, color, pattern, tags, date: Date.now(), shelfId: currentBookshelfId };
            db.collection('books').add(newBook);
        }
        addBookModal.classList.add('hidden');
        showToast('書庫に物語を届けました。');
        updateTagFilterOptions(); // タグフィルター更新
    });

    randomBookBtn.addEventListener('click', openRandomBook);

    prevShelfBtn.addEventListener('click', () => cycleShelf(-1));
    nextShelfBtn.addEventListener('click', () => cycleShelf(1));

    addShelfBtn.addEventListener('click', async () => {
        const id = Date.now();
        const newShelf = {
            id,
            name: `じゃれ書庫 ${bookshelves.length + 1}`
        };
        await db.collection('bookshelves').doc(String(id)).set(newShelf);
        currentBookshelfId = id;
        showToast('新しい本棚を作成しました。');
    });

    closeRenameModal.addEventListener('click', () => renameShelfModal.classList.add('hidden'));

    renameShelfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const shelfId = parseInt(renameShelfModal.dataset.shelfId);
        const newName = shelfNameInput.value;
        const shelf = bookshelves.find(s => s.id === shelfId);
        if (shelf) {
            db.collection('bookshelves').doc(String(shelfId)).update({ name: newName });
            renameShelfModal.classList.add('hidden');
            showToast('本棚の名前を変更しました。');
        }
    });

    closeReadModal.addEventListener('click', () => {
        closeSound.play();
        currentBookEl.classList.remove('open');
        currentBookEl.classList.add('closed');
        readBookModal.classList.add('hidden');
        if (currentReadingBookId) {
            const b = books.find(b => b.id === currentReadingBookId);
            if (b) { saveBookmark(b.id, currentPage); renderBookshelf(); }
        }
    });

    nextPageBtn.addEventListener('click', () => flipPage('next'));
    prevPageBtn.addEventListener('click', () => flipPage('prev'));

    fontFamilyBtn.addEventListener('click', () => {
        isGothic = !isGothic;
        readContent.classList.toggle('font-gothic', isGothic);
        setTimeout(() => calculatePagination(currentPage), 100);
    });

    fontSizeDownBtn.addEventListener('click', () => {
        if (currentFontSize > BOOK_DEFAULTS.FONT_SIZE_MIN) { currentFontSize -= BOOK_DEFAULTS.FONT_SIZE_STEP; updateFontSize(); }
    });
    fontSizeUpBtn.addEventListener('click', () => {
        if (currentFontSize < BOOK_DEFAULTS.FONT_SIZE_MAX) { currentFontSize += BOOK_DEFAULTS.FONT_SIZE_STEP; updateFontSize(); }
    });

    downloadBtn.addEventListener('click', () => {
        downloadBookList.innerHTML = '';
        books.forEach(b => {
            const item = document.createElement('div');
            item.className = 'download-book-item';
            item.innerHTML = `<input type="checkbox" id="dl-${b.id}" data-id="${b.id}">
                             <label for="dl-${b.id}">${b.title}</label>`;
            downloadBookList.appendChild(item);
        });
        downloadModal.classList.remove('hidden');
    });

    closeDownloadModal.addEventListener('click', () => downloadModal.classList.add('hidden'));

    doDownloadBtn.addEventListener('click', () => {
        const selected = [...downloadBookList.querySelectorAll('input:checked')];
        selected.forEach(cb => {
            const b = books.find(item => item.id == cb.dataset.id);
            if (b) {
                const blob = new Blob([b.title + '\n\n' + b.content], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${b.title}.txt`;
                a.click();
            }
        });
        downloadModal.classList.add('hidden');
        showToast('ファイルをダウンロードしました。');
    });

    ctxEditBtn.addEventListener('click', () => {
        const b = books.find(item => item.id === contextMenuTargetId);
        if (b) {
            editBookIdInput.value = b.id;
            bookTitleInput.value = b.title;
            bookContentInput.value = b.content;
            modalTitle.textContent = '本を編集する';
            saveBookBtn.textContent = '保存する';
            addBookModal.classList.remove('hidden');
        }
    });

    ctxDeleteBtn.addEventListener('click', async () => {
        if (confirm('削除しますか？（全員の画面から消えます）')) {
            const b = books.find(item => item.id === contextMenuTargetId);
            if (b) await db.collection('books').doc(b.firestoreId).delete();
            showToast('物語は風に乗り、去っていきました。');
        }
    });

    clearBookmarksBtn.addEventListener('click', () => {
        if (confirm('すべてのしおりをリセットしますか？（あなたのブラウザのみ）')) {
            localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
            books.forEach(b => b.lastPage = 0);
            renderBookshelf();
            showToast('すべてのしおりをリセットしました。');
        }
    });

    ctxRemoveBookmarkBtn.addEventListener('click', () => {
        const b = books.find(item => item.id === contextMenuTargetId);
        if (b) {
            saveBookmark(b.id, 0);
            renderBookshelf();
            showToast('しおりを外しました。');
        }
    });

    bulkDeleteBtn.addEventListener('click', () => {
        deleteBookList.innerHTML = '';
        books.forEach(b => {
            const shelf = bookshelves.find(s => s.id === b.shelfId);
            const shelfName = shelf ? shelf.name : '不明な本棚';
            
            const card = document.createElement('div');
            card.className = 'delete-book-card';
            card.innerHTML = `
                <div class="card-spine" style="background-color: ${b.color}"></div>
                <div class="card-title">${b.title}</div>
                <div class="shelf-badge">${shelfName}</div>
                <input type="checkbox" id="del-${b.id}" data-id="${b.id}">
            `;
            card.addEventListener('click', () => {
                const cb = card.querySelector('input');
                cb.checked = !cb.checked;
                card.classList.toggle('selected', cb.checked);
            });
            deleteBookList.appendChild(card);
        });
        deleteModal.classList.remove('hidden');
    });

    closeDeleteModal.addEventListener('click', () => deleteModal.classList.add('hidden'));

    selectAllDeleteBtn.addEventListener('click', () => {
        deleteBookList.querySelectorAll('.delete-book-card').forEach(card => {
            card.querySelector('input').checked = true;
            card.classList.add('selected');
        });
    });

    deselectAllDeleteBtn.addEventListener('click', () => {
        deleteBookList.querySelectorAll('.delete-book-card').forEach(card => {
            card.querySelector('input').checked = false;
            card.classList.remove('selected');
        });
    });

    doDeleteBtn.addEventListener('click', async () => {
        const selected = [...deleteBookList.querySelectorAll('input:checked')];
        if (selected.length === 0) return;
        
        if (confirm(`選択した ${selected.length} 冊の物語を整理しますか？\n（全員の画面から消えます）`)) {
            for (const cb of selected) {
                const b = books.find(item => String(item.id) === String(cb.dataset.id));
                if (b && b.firestoreId) {
                    await db.collection('books').doc(b.firestoreId).delete();
                }
            }
            deleteModal.classList.add('hidden');
            showToast('選ばれた物語は、静かに森の奥へと還っていきました。', 'forest');
        }
    });

    // インポート衝突解決のイベント
    closeImportConflictModal.addEventListener('click', () => importConflictModal.classList.add('hidden'));

    selectAllConflictBtn.addEventListener('click', () => {
        conflictBookList.querySelectorAll('.conflict-book-card').forEach(card => {
            card.querySelector('input').checked = true;
            card.classList.add('selected');
        });
    });

    deselectAllConflictBtn.addEventListener('click', () => {
        conflictBookList.querySelectorAll('.conflict-book-card').forEach(card => {
            card.querySelector('input').checked = false;
            card.classList.remove('selected');
        });
    });

    doImportConflictBtn.addEventListener('click', async () => {
        const selectedCbs = [...conflictBookList.querySelectorAll('input:checked')];
        const selectedIds = selectedCbs.map(cb => cb.dataset.id);
        const toImport = pendingImportBooks.filter(b => selectedIds.includes(String(b.id)));

        if (toImport.length > 0) {
            for (const newBook of toImport) {
                const existingBook = books.find(b => b.title === newBook.title);
                if (existingBook) {
                    await db.collection('books').doc(existingBook.firestoreId).update(newBook);
                } else {
                    await db.collection('books').add(newBook);
                }
            }
            showToast(`${toImport.length} 冊の物語を更新して棚に収めました。`);
        }

        importConflictModal.classList.add('hidden');
        pendingImportBooks = [];
    });

    window.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
        moveShelfMenu.classList.add('hidden');
    });

    // v40: 追加イベント
    statsBtn.addEventListener('click', showStats);
    closeStatsModal.addEventListener('click', () => statsModal.classList.add('hidden'));
    
    backupBtn.addEventListener('click', () => backupModal.classList.remove('hidden'));
    closeBackupModal.addEventListener('click', () => backupModal.classList.add('hidden'));
    doExportBtn.addEventListener('click', exportData);
    importJsonFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) importData(e.target.files[0]);
    });

    tagFilter.addEventListener('change', renderBookshelf);
    
    closeShortcutsModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));

    ctxMoveShelfBtn.addEventListener('mouseenter', (e) => {
        showMoveShelfSubmenu(e);
    });

    // ダークモード時の暖炉連動（既に登録済みの場合は何もしない）
    // NOTE: 981行目付近で既に登録されているため、ここでは暖炉の表示制御のみ追加
}

function updateTagFilterOptions() {
    const allTags = new Set();
    books.forEach(b => {
        if (b.tags) b.tags.forEach(t => allTags.add(t));
    });
    
    const currentVal = tagFilter.value;
    tagFilter.innerHTML = '<option value="">すべてのタグ</option>';
    [...allTags].sort().forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        tagFilter.appendChild(opt);
    });
    tagFilter.value = currentVal;
}

function showMoveShelfSubmenu(e) {
    moveShelfMenu.innerHTML = '';
    moveShelfMenu.classList.remove('hidden');
    
    // サブメニューの位置調整
    const rect = ctxMoveShelfBtn.getBoundingClientRect();
    moveShelfMenu.style.left = `${rect.right}px`;
    moveShelfMenu.style.top = `${rect.top}px`;

    bookshelves.forEach(shelf => {
        const btn = document.createElement('button');
        btn.textContent = shelf.name;
        btn.addEventListener('click', async () => {
            const b = books.find(item => item.id === contextMenuTargetId);
            if (b) {
                await db.collection('books').doc(b.firestoreId).update({ shelfId: shelf.id });
                showToast(`「${b.title}」を「${shelf.name}」へ移動しました。`);
                contextMenu.classList.add('hidden');
                moveShelfMenu.classList.add('hidden');
            }
        });
        moveShelfMenu.appendChild(btn);
    });
}

function updateFontSize() {
    currentFontSize = Math.round(currentFontSize * 10) / 10;
    readContent.style.fontSize = `${currentFontSize}rem`;
    setTimeout(() => calculatePagination(currentPage), ANIMATION_TIMING.FONT_RECALC_DELAY);
}

/**
 * 本棚を左右に切り替える（アニメーション付き）
 * @param {-1|1} dir - 方向（-1: 前, 1: 次）
 */
function cycleShelf(dir) {
    if (bookshelves.length <= 1) return;
    
    bookshelfWrapper.classList.add('shelf-transition-out');
    
    setTimeout(() => {
        const currentIdx = bookshelves.findIndex(s => s.id === currentBookshelfId);
        let nextIdx = currentIdx + dir;
        if (nextIdx < 0) nextIdx = bookshelves.length - 1;
        if (nextIdx >= bookshelves.length) nextIdx = 0;
        
        currentBookshelfId = bookshelves[nextIdx].id;
        localStorage.setItem(STORAGE_KEYS.CURRENT_SHELF, currentBookshelfId);
        renderBookshelf();
        
        bookshelfWrapper.classList.remove('shelf-transition-out');
        bookshelfWrapper.classList.add('shelf-transition-in');
        
        setTimeout(() => {
            bookshelfWrapper.classList.remove('shelf-transition-in');
        }, ANIMATION_TIMING.SHELF_TRANSITION);
    }, ANIMATION_TIMING.SHELF_TRANSITION);
}

window.addEventListener('DOMContentLoaded', init);
