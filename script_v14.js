// ==============================
// データ管理
// ==============================
let books = []; 
let currentFontSize = 1.0;
let isGothic = false;

const dayBgmList = ['bgm（昼）/春の山.mp3'];
const nightBgmList = ['bgm（夜）/優しい雪に.mp3'];

let bgmAudio = null;
let bgmPlaylist = [];
let bgmIndex = 0;

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
    audio.volume = 0.12;
    audio.onended = playNextBgm;
    audio.onerror = () => { if (bgmPlaylist.length > 1) playNextBgm(); };
    audio.play().catch(e => console.log('BGM blocked:', e));
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
const bookshelfTop     = document.getElementById('bookshelf-top');
const bookshelfMain    = document.getElementById('bookshelf');

const flipSound  = document.getElementById('flip-sound');
const closeSound = document.getElementById('close-sound');

const searchInput = document.getElementById('search-input');
const sortSelect  = document.getElementById('sort-select');

const darkModeBtn       = document.getElementById('dark-mode-btn');
const addBookBtn        = document.getElementById('add-book-btn');
const downloadBtn       = document.getElementById('download-btn');
const clearBookmarksBtn = document.getElementById('clear-bookmarks-btn');

const addBookModal     = document.getElementById('add-book-modal');
const closeAddModal    = document.getElementById('close-add-modal');
const addBookForm      = document.getElementById('add-book-form');
const fileUpload       = document.getElementById('file-upload');
const bookTitleInput   = document.getElementById('book-title');
const bookContentInput = document.getElementById('book-content');
const editBookIdInput  = document.getElementById('edit-book-id');
const modalTitle       = document.getElementById('modal-title');
const saveBookBtn      = document.getElementById('save-book-btn');

const readBookModal  = document.getElementById('read-book-modal');
const closeReadModal = document.getElementById('close-read-modal');
const currentBookEl  = document.getElementById('current-book');
const bookCoverElement  = document.getElementById('book-cover-element');
const readTitleFront = document.getElementById('read-title-front');
const readTitle      = document.getElementById('read-title');
const readContent    = document.getElementById('read-content');
const bookViewport   = document.getElementById('book-viewport');

const prevPageBtn     = document.getElementById('prev-page-btn');
const nextPageBtn     = document.getElementById('next-page-btn');
const fontFamilyBtn   = document.getElementById('font-family-btn');
const fontSizeDownBtn = document.getElementById('font-size-down-btn');
const fontSizeUpBtn   = document.getElementById('font-size-up-btn');

const contextMenu        = document.getElementById('context-menu');
const bookCtxOptions     = document.getElementById('book-ctx-options');
const shelfCtxOptions    = document.getElementById('shelf-ctx-options');
const decorCtxOptions    = document.getElementById('decor-ctx-options');
const ctxEditBtn         = document.getElementById('ctx-edit-btn');
const ctxDeleteBtn       = document.getElementById('ctx-delete-btn');
const ctxRemoveBookmarkBtn = document.getElementById('ctx-remove-bookmark-btn');
const ctxAddDecorBtn     = document.getElementById('ctx-add-decor-btn');
const ctxDeleteDecorBtn  = document.getElementById('ctx-delete-decor-btn');

const decorModal      = document.getElementById('decor-modal');
const closeDecorModal = document.getElementById('close-decor-modal');
const decorOptions    = document.querySelectorAll('.decor-option');

// ==============================
// 状態管理
// ==============================
let currentPage = 0;
let totalPages  = 1;
let currentReadingBookId = null;
let contextMenuTargetId  = null;
let draggedItemId = null;

// ==============================
// 初期化
// ==============================
function init() {
    loadBooks();
    renderBookshelf();
    setupEventListeners();
}

function loadBooks() {
    const saved = localStorage.getItem('bookshelf_data_v2');
    if (saved) {
        books = JSON.parse(saved);
    } else {
        // 初期配置
        books = [
            { id: 101, type: 'book', title: "はじまりの物語", content: "昔々、あるところに静かで美しい図書館がありました。\n\nそこには、訪れる人々の心の中にある物語が、本となって収められていました。\n\nこの本棚は、あなたの物語を紡ぐための場所です。新しい本を追加し、あなただけの世界を広げていってください。", color: "#8B0000", pattern: "antique", lastPage: 0, date: Date.now(), location: 'shelf' },
            { id: 102, type: 'decor', decorType: 'vase', location: 'shelf' },
            { id: 103, type: 'decor', decorType: 'frame-2', location: 'top' },
            { id: 104, type: 'decor', decorType: 'vase-3', location: 'shelf' },
            { id: 105, type: 'decor', decorType: 'frame', location: 'top' }
        ];
        saveBooks();
    }
}

function saveBooks() {
    localStorage.setItem('bookshelf_data_v2', JSON.stringify(books));
}

// ==============================
// 本棚描画 & D&D
// ==============================
function renderBookshelf() {
    bookshelfTop.innerHTML = '';
    bookshelfMain.innerHTML = '';

    const topItems = books.filter(item => item.location === 'top');
    const shelfItems = books.filter(item => item.location === 'shelf');

    // 本棚トップ
    topItems.forEach(item => bookshelfTop.appendChild(createItemEl(item)));
    bookshelfTop.addEventListener('dragover', handleDragOver);
    bookshelfTop.addEventListener('drop', (e) => handleDrop(e, 'top'));
    bookshelfTop.addEventListener('contextmenu', (e) => {
        if (e.target === bookshelfTop) { e.preventDefault(); showContextMenu(e, 'shelf', 'top'); }
    });

    // 本棚メイン
    const PER_ROW = 12;
    const rowCount = Math.max(2, Math.ceil(shelfItems.length / PER_ROW));

    for (let i = 0; i < rowCount; i++) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        row.dataset.rowIndex = i;

        const rowItems = shelfItems.slice(i * PER_ROW, (i + 1) * PER_ROW);
        rowItems.forEach(item => row.appendChild(createItemEl(item)));

        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', (e) => handleDrop(e, 'shelf', i));
        row.addEventListener('contextmenu', (e) => {
            if (e.target === row) { e.preventDefault(); showContextMenu(e, 'shelf', 'shelf', i); }
        });

        bookshelfMain.appendChild(row);
    }
}

function createItemEl(item) {
    let el;
    if (item.type === 'book') {
        el = createBookSpine(item);
    } else {
        el = createDecorItem(item);
    }
    el.draggable = true;
    el.dataset.id = item.id;
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragover',  handleDragOverItem);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop',      handleDropOnItem);
    el.addEventListener('dragend',   handleDragEnd);
    return el;
}

function createBookSpine(book) {
    const spine = document.createElement('div');
    spine.className = `book-spine pattern-${book.pattern || 'antique'}`;
    spine.style.backgroundColor = book.color;
    spine.style.height = `${210 + (book.id % 60)}px`;

    const title = document.createElement('div');
    title.className = 'spine-text';
    title.textContent = book.title;

    const tooltip = document.createElement('div');
    tooltip.className = 'book-spine-tooltip';
    tooltip.textContent = book.title;

    spine.appendChild(title);
    spine.appendChild(tooltip);

    if (book.lastPage > 0) {
        const ribbon = document.createElement('div');
        ribbon.className = 'bookmark-ribbon';
        spine.appendChild(ribbon);
    }

    spine.addEventListener('click', () => openBook(book));
    spine.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        contextMenuTargetId = book.id;
        showContextMenu(e, 'book');
    });
    return spine;
}

function createDecorItem(item) {
    const el = document.createElement('div');
    el.className = `cute-item-${item.decorType || 'vase'}`;
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        contextMenuTargetId = item.id;
        showContextMenu(e, 'decor');
    });
    return el;
}

// D&D ロジックの改善
function handleDragStart(e) {
    draggedItemId = this.dataset.id;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragOverItem(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

// アイテムの上へのドロップ（挿入）
function handleDropOnItem(e) {
    e.stopPropagation();
    const targetId = this.dataset.id;
    if (draggedItemId == targetId) return;

    const fromIdx = books.findIndex(b => b.id == draggedItemId);
    const toIdx   = books.findIndex(b => b.id == targetId);
    if (fromIdx > -1 && toIdx > -1) {
        const item = books.splice(fromIdx, 1)[0];
        // ターゲットの場所に挿入し、場所も引き継ぐ
        item.location = books[toIdx < fromIdx ? toIdx : toIdx - 0].location; 
        books.splice(toIdx, 0, item);
        saveBooks();
        renderBookshelf();
    }
}

// 棚板へのドロップ（行の末尾へ移動）
function handleDrop(e, loc, rowIndex = null) {
    if (e.target !== e.currentTarget) return; // 子要素へのドロップは無視
    const fromIdx = books.findIndex(b => b.id == draggedItemId);
    if (fromIdx > -1) {
        const item = books.splice(fromIdx, 1)[0];
        item.location = loc;
        // 特定の行の末尾に持っていきたい場合、その行の最後のアイテムの後に挿入する
        if (loc === 'shelf') {
            const shelfItems = books.filter(b => b.location === 'shelf');
            const targetPos = (rowIndex + 1) * 12; // 大体の位置
            books.splice(Math.min(books.length, targetPos), 0, item);
        } else {
            books.push(item);
        }
        saveBooks();
        renderBookshelf();
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// ==============================
// 読書 & 2ページレイアウト
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

    void currentBookEl.offsetWidth;
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});

    setTimeout(() => {
        currentBookEl.classList.remove('closed');
        currentBookEl.classList.add('open');
        setTimeout(() => {
            calculatePagination(book.lastPage || 0);
        }, 1500);
    }, 50);
}

function calculatePagination(jumpToPage = 0) {
    const vw = bookViewport.clientWidth;
    // 2ページ見開きなので、1ページ送り = vw + gap
    const pageAdvance = vw + 100;
    
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const sw = readContent.scrollWidth;
        // 空ページを表示しないよう、内容がある範囲に限定する
        // vertical-rl では scrollWidth はコンテンツの全幅
        totalPages = Math.max(1, Math.ceil(sw / pageAdvance));
        
        // もし最後のページが完全に空白なら1減らす（簡易的なチェック）
        // 実際にはブラウザのレンダリング結果に依存するため、1ページ以上を保証
        currentPage = Math.min(jumpToPage, totalPages - 1);
        updatePaginationUI();
    }));
}

function updatePaginationUI() {
    const vw = bookViewport.clientWidth;
    const pageAdvance = vw + 100;
    // 右ページ右端から開始（translateX=0）
    // 左へ読み進める（次の見開き = 画面を右にずらす = translateXをプラス）
    readContent.style.transform = `translateX(${currentPage * pageAdvance}px)`;

    nextPageBtn.disabled = currentPage >= totalPages - 1;
    prevPageBtn.disabled = currentPage === 0;
}

function flipPage(dir) {
    if (dir === 'next' && currentPage < totalPages - 1) currentPage++;
    else if (dir === 'prev' && currentPage > 0) currentPage--;
    else return;
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});
    updatePaginationUI();
}

// ==============================
// しおり管理
// ==============================
function resetAllBookmarks() {
    if (confirm('すべての本のしおりをリセットしますか？')) {
        books.forEach(b => { if (b.type === 'book') b.lastPage = 0; });
        saveBooks();
        renderBookshelf();
    }
}

function removeCurrentBookmark() {
    const b = books.find(b => b.id === contextMenuTargetId);
    if (b) {
        b.lastPage = 0;
        saveBooks();
        renderBookshelf();
    }
}

// ==============================
// イベント設定
// ==============================
function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        playCurrentBgm();
        startScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
    });

    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        darkModeBtn.innerHTML = document.body.classList.contains('dark-theme') ? '<i class="fas fa-sun"></i> ライトモード' : '<i class="fas fa-moon"></i> ダークモード';
        playCurrentBgm();
    });

    clearBookmarksBtn.addEventListener('click', resetAllBookmarks);
    ctxRemoveBookmarkBtn.addEventListener('click', removeCurrentBookmark);

    // D&D 以外は以前と同様
    ctxEditBtn.addEventListener('click', () => {
        const book = books.find(b => b.id === contextMenuTargetId);
        if (!book) return;
        modalTitle.textContent = '本を編集する';
        saveBookBtn.textContent = '保存する';
        editBookIdInput.value = book.id;
        bookTitleInput.value = book.title;
        bookContentInput.value = book.content;
        addBookModal.classList.remove('hidden');
    });

    ctxDeleteBtn.addEventListener('click', () => {
        if (confirm('削除しますか？')) { books = books.filter(b => b.id !== contextMenuTargetId); saveBooks(); renderBookshelf(); }
    });

    ctxAddDecorBtn.addEventListener('click', () => decorModal.classList.remove('hidden'));
    ctxDeleteDecorBtn.addEventListener('click', () => { books = books.filter(b => b.id !== contextMenuTargetId); saveBooks(); renderBookshelf(); });

    decorOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            books.push({ id: Date.now(), type: 'decor', decorType: opt.dataset.type, location: 'shelf' });
            saveBooks(); renderBookshelf(); decorModal.classList.add('hidden');
        });
    });

    closeDecorModal.addEventListener('click', () => decorModal.classList.add('hidden'));
    closeAddModal.addEventListener('click', () => addBookModal.classList.add('hidden'));
    closeReadModal.addEventListener('click', () => {
        closeSound.play();
        currentBookEl.classList.remove('open');
        currentBookEl.classList.add('closed');
        readBookModal.classList.add('hidden');
        if (currentReadingBookId) {
            const b = books.find(b => b.id === currentReadingBookId);
            if (b) { b.lastPage = currentPage; saveBooks(); renderBookshelf(); }
        }
        currentReadingBookId = null;
    });

    addBookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editBookIdInput.value;
        if (id) {
            const b = books.find(item => item.id == id);
            b.title = bookTitleInput.value; b.content = bookContentInput.value;
        } else {
            books.push({ id: Date.now(), type: 'book', title: bookTitleInput.value, content: bookContentInput.value, color: '#8B0000', pattern: 'antique', lastPage: 0, date: Date.now(), location: 'shelf' });
        }
        saveBooks(); renderBookshelf(); addBookModal.classList.add('hidden');
    });

    nextPageBtn.addEventListener('click', () => flipPage('next'));
    prevPageBtn.addEventListener('click', () => flipPage('prev'));
    
    window.addEventListener('click', () => contextMenu.classList.add('hidden'));
    searchInput.addEventListener('input', renderBookshelf);
    sortSelect.addEventListener('change', renderBookshelf);
}

function showContextMenu(e, type, loc = 'shelf', row = null) {
    contextMenu.classList.remove('hidden');
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top  = `${e.pageY}px`;
    bookCtxOptions.classList.add('hidden');
    shelfCtxOptions.classList.add('hidden');
    decorCtxOptions.classList.add('hidden');
    if (type === 'book') bookCtxOptions.classList.remove('hidden');
    else if (type === 'shelf') shelfCtxOptions.classList.remove('hidden');
    else if (type === 'decor') decorCtxOptions.classList.remove('hidden');
}

init();
