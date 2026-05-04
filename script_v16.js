// ==============================
// データ管理
// ==============================
let books = [];
let currentFontSize = 1.0;
let isGothic = false;

// ==============================
// BGM管理
// ==============================
const dayBgmList = [
    'bgm（昼）/春の山.mp3',
];
const nightBgmList = [
    'bgm（夜）/優しい雪に.mp3',
];

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

// ==============================
// 状態管理
// ==============================
let currentPage = 0;
let totalPages  = 1;
let currentReadingBookId = null;
let contextMenuTargetId  = null;

// ==============================
// 初期化
// ==============================
function init() {
    loadBooks();
    renderBookshelf();
    setupEventListeners();
}

function loadBooks() {
    const saved = localStorage.getItem('bookshelf_data');
    if (saved) {
        books = JSON.parse(saved);
    } else {
        books = [{
            id: Date.now(),
            title: "はじまりの物語",
            content: "昔々、あるところに静かで美しい図書館がありました。\n\nそこには、訪れる人々の心の中にある物語が、本となって収められていました。\n\nこの本棚は、あなたの物語を紡ぐための場所です。新しい本を追加し、あなただけの世界を広げていってください。",
            color: "#8B0000",
            pattern: "antique",
            lastPage: 0,
            date: Date.now()
        }];
        saveBooks();
    }
}

function saveBooks() {
    localStorage.setItem('bookshelf_data', JSON.stringify(books));
}

// ==============================
// 本棚描画
// ==============================
function renderBookshelf() {
    bookshelfWrapper.innerHTML = '<div class="decorations-image"></div>';
    const displayBooks = getSortedAndFilteredBooks();
    
    const booksPerRow = 12;
    const rowCount = Math.max(2, Math.ceil(displayBooks.length / booksPerRow));

    for (let i = 0; i < rowCount; i++) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        
        const rowBooks = displayBooks.slice(i * booksPerRow, (i + 1) * booksPerRow);
        rowBooks.forEach(book => {
            row.appendChild(createBookSpine(book));
        });

        // 本が少ない場合、ランダムに小物を配置
        if (rowBooks.length < 8) {
            const decorCount = Math.floor(Math.random() * 2) + 1;
            for (let j = 0; j < decorCount; j++) {
                const decor = document.createElement('div');
                const types = ['vase', 'frame', 'vase-2', 'frame-2'];
                const type = types[Math.floor(Math.random() * types.length)];
                decor.className = `cute-item-${type}`;
                row.appendChild(decor);
            }
        }

        bookshelfWrapper.appendChild(row);
    }
}

function getSortedAndFilteredBooks() {
    const q = searchInput.value.toLowerCase();
    const sort = sortSelect.value;

    let filtered = books.filter(b => 
        b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q)
    );

    if (sort === 'newest') filtered.sort((a, b) => b.date - a.date);
    else if (sort === 'oldest') filtered.sort((a, b) => a.date - b.date);
    else if (sort === 'color') filtered.sort((a, b) => a.color.localeCompare(b.color));

    return filtered;
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
        e.preventDefault();
        e.stopPropagation();
        contextMenuTargetId = book.id;
        showContextMenu(e, 'book');
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
        }, 1500);
    }, 50);
}

function calculatePagination(jumpToPage = 0) {
    const vw = bookViewport.clientWidth;
    const pageAdvance = vw + 100;
    
    // レイアウト確定を待つ
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const sw = readContent.scrollWidth;
            totalPages = Math.max(1, Math.ceil(sw / pageAdvance));
            currentPage = Math.min(jumpToPage, totalPages - 1);
            updatePaginationUI();
        });
    });
}

function updatePaginationUI() {
    const vw = bookViewport.clientWidth;
    const pageAdvance = vw + 100;
    // 縦書き(vertical-rl)では、スクロール領域が左側に伸びる
    // translateX(-X) で左側の隠れた領域を出す
    readContent.style.transform = `translateX(${-currentPage * pageAdvance}px)`;

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
// イベント設定
// ==============================
function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        playCurrentBgm();
        startScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        mainContent.style.animation = 'fadeIn 1.5s ease';
    });

    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        darkModeBtn.innerHTML = document.body.classList.contains('dark-theme') 
            ? '<i class="fas fa-sun"></i> ライトモード' 
            : '<i class="fas fa-moon"></i> ダークモード';
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

    addBookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editBookIdInput.value;
        const title = bookTitleInput.value;
        const content = bookContentInput.value;
        const color = document.querySelector('input[name="book-color"]:checked').value;
        const pattern = document.querySelector('input[name="book-pattern"]:checked').value;

        if (id) {
            const idx = books.findIndex(b => b.id == id);
            if (idx > -1) books[idx] = { ...books[idx], title, content, color, pattern };
        } else {
            books.push({ id: Date.now(), title, content, color, pattern, lastPage: 0, date: Date.now() });
        }
        saveBooks();
        renderBookshelf();
        addBookModal.classList.add('hidden');
    });

    closeReadModal.addEventListener('click', () => {
        closeSound.play();
        currentBookEl.classList.remove('open');
        currentBookEl.classList.add('closed');
        readBookModal.classList.add('hidden');
        if (currentReadingBookId) {
            const b = books.find(b => b.id === currentReadingBookId);
            if (b) { b.lastPage = currentPage; saveBooks(); renderBookshelf(); }
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
        if (currentFontSize > 0.7) { currentFontSize -= 0.1; updateFontSize(); }
    });
    fontSizeUpBtn.addEventListener('click', () => {
        if (currentFontSize < 2.0) { currentFontSize += 0.1; updateFontSize(); }
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

    ctxDeleteBtn.addEventListener('click', () => {
        if (confirm('削除しますか？')) {
            books = books.filter(b => b.id !== contextMenuTargetId);
            saveBooks();
            renderBookshelf();
        }
    });

    window.addEventListener('click', () => contextMenu.classList.add('hidden'));
}

function updateFontSize() {
    currentFontSize = Math.round(currentFontSize * 10) / 10;
    readContent.style.fontSize = `${currentFontSize}rem`;
    setTimeout(() => calculatePagination(currentPage), 100);
}

init();
