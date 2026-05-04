let bookshelves = []; 
let books = []; 
let currentBookshelfId = null;
let currentFontSize = 1.05;
let isGothic = false;

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

// 一括削除関連のDOM
const bulkDeleteBtn         = document.getElementById('bulk-delete-btn');
const deleteModal           = document.getElementById('delete-modal');
const deleteBookList        = document.getElementById('delete-book-list');
const doDeleteBtn           = document.getElementById('do-delete-btn');
const selectAllDeleteBtn    = document.getElementById('select-all-delete-btn');
const deselectAllDeleteBtn  = document.getElementById('deselect-all-delete-btn');
const closeDeleteModal      = document.getElementById('close-delete-modal');

// インポート衝突解決関連のDOM
const importConflictModal   = document.getElementById('import-conflict-modal');
const conflictBookList      = document.getElementById('conflict-book-list');
const doImportConflictBtn   = document.getElementById('do-import-conflict-btn');
const selectAllConflictBtn   = document.getElementById('select-all-conflict-btn');
const deselectAllConflictBtn = document.getElementById('deselect-all-conflict-btn');
const closeImportConflictModal = document.getElementById('close-import-conflict-modal');
const conflictSummaryText   = document.getElementById('conflict-summary-text');

// ==============================
// 状態管理
// ==============================
let currentPage = 0;
let totalPages  = 1;
let currentReadingBookId = null;
let contextMenuTargetId  = null;
let pendingImportBooks   = []; // 衝突解決待ちの本

// ==============================
// 初期化
// ==============================
function init() {
    loadBooks();
    renderBookshelf();
    setupEventListeners();
    setupDragAndDrop();
}

function loadBooks() {
    const saved = localStorage.getItem('bookshelf_v28_data');
    if (saved) {
        const data = JSON.parse(saved);
        bookshelves = data.bookshelves || [];
        books = data.books || [];
        currentBookshelfId = data.currentBookshelfId || (bookshelves[0] ? bookshelves[0].id : null);
    } else {
        // V27以前のデータからの移行
        const oldSaved = localStorage.getItem('bookshelf_data');
        if (oldSaved) {
            const oldBooks = JSON.parse(oldSaved);
            bookshelves = [{ id: Date.now(), name: 'じゃれ書庫 1' }];
            currentBookshelfId = bookshelves[0].id;
            books = oldBooks.map(b => ({ ...b, shelfId: currentBookshelfId }));
        } else {
            // 初期データ
            bookshelves = [{ id: Date.now(), name: 'じゃれ書庫 1' }];
            currentBookshelfId = bookshelves[0].id;
            books = [{
                id: Date.now(),
                title: "はじまりの物語",
                content: "昔々、あるところに静かで美しい図書館がありました。\n\nそこには、訪れる人々の心の中にある物語が、本となって収められていました。\n\nこの本棚は、あなたの物語を紡ぐための場所です。新しい本を追加し、あなただけの世界を広げていってください。",
                color: "#8B0000",
                pattern: "antique",
                lastPage: 0,
                date: Date.now(),
                shelfId: currentBookshelfId
            }];
        }
        saveBooks();
    }
}

function saveBooks() {
    const data = {
        bookshelves,
        books,
        currentBookshelfId
    };
    localStorage.setItem('bookshelf_v28_data', JSON.stringify(data));
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
        
        // 1段あたりの冊数を8〜12冊でランダムに変動させ、自然な見た目にする
        const booksInThisRow = Math.floor(Math.random() * 3) + 9; 
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
                const types = ['vase', 'frame', 'vase-2', 'frame-2', 'vase-3', 'frame-3'];
                const type = types[Math.floor(Math.random() * types.length)];
                decor.className = `cute-item-${type}`;
                row.appendChild(decor);
            }
        }

        bookshelfWrapper.appendChild(row);
        currentBookIndex += booksInThisRow;
        if (currentBookIndex >= displayBooks.length && displayBooks.length > 0) break;
        if (displayBooks.length === 0) break; // 最低1段は表示
    }

    // 本が全くない場合でも2段は表示して本棚らしさを保つ
    if (bookshelfWrapper.querySelectorAll('.bookshelf-row').length < 2) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        bookshelfWrapper.appendChild(row);
    }
}

function getSortedAndFilteredBooks() {
    const q = searchInput.value.toLowerCase();
    const sort = sortSelect.value;

    // 現在の本棚に所属している本のみをフィルタリング
    let filtered = books.filter(b => b.shelfId === currentBookshelfId);

    // 検索処理
    if (q) {
        filtered = filtered.filter(b => 
            b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q)
        );
    }

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
    
    // 縦書き(vertical-rl)において、冒頭は右端にあります。
    // style.css で right: 0 に設定しているため、translateX(0) で冒頭が表示されます。
    readContent.style.transform = "translateX(0)";
    
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
    // 縦書き(vertical-rl)かつ right: 0 の場合、
    // 左側にある「次のページ」を表示するには、要素を右方向（プラス方向）にずらします。
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
                saveBooks();
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
function setupDragAndDrop() {
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragOverlay.classList.remove('hidden');
    });

    dragOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('hidden');
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('hidden');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files);
        }
    });
}

async function handleFileUpload(files) {
    const colors = ["#8B0000", "#2F4F4F", "#191970", "#4B0082", "#556B2F", "#A0522D"];
    const patterns = ["antique", "leather", "fabric"];
    
    let immediateImports = [];
    let conflictBooks = [];

    for (const file of Array.from(files)) {
        if (!file.name.endsWith('.txt')) continue;

        const title = file.name.replace(/\.[^/.]+$/, "");
        const content = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        });

        const bookData = {
            id: Date.now() + Math.random(),
            title,
            content,
            color: colors[Math.floor(Math.random() * colors.length)],
            pattern: patterns[Math.floor(Math.random() * patterns.length)],
            lastPage: 0,
            date: Date.now(),
            shelfId: currentBookshelfId
        };

        if (books.some(b => b.title === title)) {
            conflictBooks.push(bookData);
        } else {
            immediateImports.push(bookData);
        }
    }

    // 重複がないものは即座にインポート
    if (immediateImports.length > 0) {
        books.push(...immediateImports);
        saveBooks();
        renderBookshelf();
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
function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'forest' ? 'toast-forest' : ''}`;
    const icon = type === 'forest' ? 'fa-leaf' : 'fa-check-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
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

        // 新規追加時の重複チェック
        if (!id) {
            const existingBook = books.find(b => b.title === title);
            if (existingBook) {
                const ok = confirm(`「${title}」はすでに書庫に存在します。上書きしますか？`);
                if (!ok) return;
                books = books.filter(b => b.id !== existingBook.id);
            }
        }

        if (id) {
            const idx = books.findIndex(b => b.id == id);
            if (idx > -1) books[idx] = { ...books[idx], title, content, color, pattern };
        } else {
            books.push({ id: Date.now(), title, content, color, pattern, lastPage: 0, date: Date.now(), shelfId: currentBookshelfId });
        }
        saveBooks();
        renderBookshelf();
        addBookModal.classList.add('hidden');
        showToast('本棚を整理しました。');
    });

    randomBookBtn.addEventListener('click', openRandomBook);

    prevShelfBtn.addEventListener('click', () => cycleShelf(-1));
    nextShelfBtn.addEventListener('click', () => cycleShelf(1));

    addShelfBtn.addEventListener('click', () => {
        const newShelf = {
            id: Date.now(),
            name: `じゃれ書庫 ${bookshelves.length + 1}`
        };
        bookshelves.push(newShelf);
        currentBookshelfId = newShelf.id;
        saveBooks();
        renderBookshelf();
        showToast('新しい本棚を作成しました。');
    });

    closeRenameModal.addEventListener('click', () => renameShelfModal.classList.add('hidden'));

    renameShelfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const shelfId = parseInt(renameShelfModal.dataset.shelfId);
        const newName = shelfNameInput.value;
        const shelf = bookshelves.find(s => s.id === shelfId);
        if (shelf) {
            shelf.name = newName;
            saveBooks();
            renderBookshelf();
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

    ctxDeleteBtn.addEventListener('click', () => {
        if (confirm('削除しますか？')) {
            books = books.filter(b => b.id !== contextMenuTargetId);
            saveBooks();
            renderBookshelf();
            showToast('本を削除しました。');
        }
    });

    clearBookmarksBtn.addEventListener('click', () => {
        if (confirm('すべてのしおりをリセットしますか？')) {
            books.forEach(b => b.lastPage = 0);
            saveBooks();
            renderBookshelf();
            showToast('すべてのしおりをリセットしました。');
        }
    });

    ctxRemoveBookmarkBtn.addEventListener('click', () => {
        const b = books.find(item => item.id === contextMenuTargetId);
        if (b) {
            b.lastPage = 0;
            saveBooks();
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

    doDeleteBtn.addEventListener('click', () => {
        const selected = [...deleteBookList.querySelectorAll('input:checked')];
        if (selected.length === 0) return;
        
        // ワンクッションの確認
        if (confirm(`選択した ${selected.length} 冊の物語を整理しますか？\nこの操作は取り消せません。`)) {
            const idsToDelete = selected.map(cb => String(cb.dataset.id));
            books = books.filter(b => !idsToDelete.includes(String(b.id)));
            saveBooks();
            renderBookshelf();
            deleteModal.classList.add('hidden');
            
            // 専用の情緒的な通知
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

    doImportConflictBtn.addEventListener('click', () => {
        const selectedCbs = [...conflictBookList.querySelectorAll('input:checked')];
        const selectedIds = selectedCbs.map(cb => cb.dataset.id);
        const toImport = pendingImportBooks.filter(b => selectedIds.includes(String(b.id)));

        if (toImport.length > 0) {
            // 既存の同名タイトルを削除
            const titlesToReplace = toImport.map(b => b.title);
            books = books.filter(b => !titlesToReplace.includes(b.title));
            
            // 新しいデータを追加
            books.push(...toImport);
            saveBooks();
            renderBookshelf();
            showToast(`${toImport.length} 冊の物語を上書きして棚に収めました。`);
        }

        importConflictModal.classList.add('hidden');
        pendingImportBooks = [];
    });

    window.addEventListener('click', () => contextMenu.classList.add('hidden'));
}

function updateFontSize() {
    currentFontSize = Math.round(currentFontSize * 10) / 10;
    readContent.style.fontSize = `${currentFontSize}rem`;
    setTimeout(() => calculatePagination(currentPage), 100);
}

function cycleShelf(dir) {
    if (bookshelves.length <= 1) return;
    
    // アニメーション開始
    bookshelfWrapper.classList.add('shelf-transition-out');
    
    setTimeout(() => {
        const currentIdx = bookshelves.findIndex(s => s.id === currentBookshelfId);
        let nextIdx = currentIdx + dir;
        if (nextIdx < 0) nextIdx = bookshelves.length - 1;
        if (nextIdx >= bookshelves.length) nextIdx = 0;
        
        currentBookshelfId = bookshelves[nextIdx].id;
        renderBookshelf();
        saveBooks();
        
        // 切り替え後のアニメーション
        bookshelfWrapper.classList.remove('shelf-transition-out');
        bookshelfWrapper.classList.add('shelf-transition-in');
        
        setTimeout(() => {
            bookshelfWrapper.classList.remove('shelf-transition-in');
        }, 400);
    }, 400);
}

window.addEventListener('DOMContentLoaded', init);
