let bookshelves = []; 
let books = []; 
let currentBookshelfId = null;
let currentFontSize = 1.1;
let isGothic = false;
let currentBgmVolume = 0.12;

// ==============================
// BGMリスト
// ==============================
const dayBgmList = ['bgm_day/spring_mountain.mp3'];
const nightBgmList = ['bgm_night/gentle_snow.mp3'];
let bgmPlaylist = [];
let bgmIndex = 0;

// ==============================
// Firebase 設定
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyAjSCZWwLLFOIl08ZVlj_PSfx9-Xq-vHQo",
  authDomain: "jareshoko.firebaseapp.com",
  projectId: "jareshoko",
  storageBucket: "jareshoko.firebasestorage.app",
  messagingSenderId: "839348164263",
  appId: "1:839348164263:web:520351a7d8a18667422d82"
};

// BGM再生用関数
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

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
const readTitle        = document.getElementById('read-title');
const readContent      = document.getElementById('read-content');
const bookViewport     = document.getElementById('book-viewport');
const prevPageBtn      = document.getElementById('prev-page-btn');
const nextPageBtn      = document.getElementById('next-page-btn');
const pageInfo         = document.getElementById('page-info');
const fontFamilyBtn    = document.getElementById('font-family-btn');
const fontSizeDownBtn  = document.getElementById('font-size-down-btn');
const fontSizeUpBtn    = document.getElementById('font-size-up-btn');
const mobileMenuBtn    = document.getElementById('mobile-menu-btn');
const mobileActions    = document.getElementById('mobile-actions');

const bookshelfTabs    = document.getElementById('bookshelf-tabs');
const addShelfBtn      = document.getElementById('add-shelf-btn');
const renameShelfModal = document.getElementById('rename-shelf-modal');
const closeRenameModal = document.getElementById('close-rename-shelf-modal');
const renameShelfForm  = document.getElementById('rename-shelf-form');
const shelfNameInput   = document.getElementById('shelf-name-input');
const randomBookBtn    = document.getElementById('random-book-btn');
const prevShelfBtn     = document.getElementById('prev-shelf-btn');
const nextShelfBtn     = document.getElementById('next-shelf-btn');
const toastContainer    = document.getElementById('toast-container');

const downloadModal     = document.getElementById('download-modal');
const closeDownloadModal= document.getElementById('close-download-modal');
const downloadBookList  = document.getElementById('download-book-list');
const doDownloadBtn     = document.getElementById('do-download-btn');
const bulkDeleteBtn     = document.getElementById('bulk-delete-btn');
const deleteModal       = document.getElementById('delete-modal');
const deleteBookList    = document.getElementById('delete-book-list');
const doDeleteBtn       = document.getElementById('do-delete-btn');
const contextMenu       = document.getElementById('context-menu');

// ==============================
// 状態管理
// ==============================
let currentPage = 0;
let totalPages  = 1;
let currentReadingBookId = null;
let contextMenuTargetId  = null;
let bgmAudio = null;

// ==============================
// 初期化
// ==============================
async function init() {
    setupFirestoreListeners();
    setupEventListeners();
}

function setupFirestoreListeners() {
    db.collection('bookshelves').orderBy('id', 'asc').onSnapshot(snapshot => {
        bookshelves = snapshot.docs.map(doc => doc.data());
        if (bookshelves.length === 0) {
            createInitialShelf();
        } else {
            if (!currentBookshelfId) currentBookshelfId = bookshelves[0].id;
            renderBookshelf();
        }
    });

    db.collection('books').onSnapshot(snapshot => {
        const firestoreBooks = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
        const bookmarks = JSON.parse(localStorage.getItem('bookshelf_bookmarks') || '{}');
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

function renderBookshelf() {
    renderTabs();
    bookshelfWrapper.innerHTML = '';
    const displayBooks = getSortedAndFilteredBooks();
    
    let currentBookIndex = 0;
    while (currentBookIndex < displayBooks.length || currentBookIndex === 0) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        // モバイルでは1段あたりの冊数を極限まで少なく (2〜3冊)
        const booksInThisRow = Math.floor(Math.random() * 2) + 2; 
        const rowBooks = displayBooks.slice(currentBookIndex, currentBookIndex + booksInThisRow);
        
        rowBooks.forEach(book => row.appendChild(createBookSpine(book)));
        bookshelfWrapper.appendChild(row);
        currentBookIndex += booksInThisRow;
        if (currentBookIndex >= displayBooks.length && displayBooks.length > 0) break;
        if (displayBooks.length === 0) break;
    }
}

function getSortedAndFilteredBooks() {
    const q = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    let filtered = q ? books.filter(b => b.title.toLowerCase().includes(q)) : books.filter(b => b.shelfId === currentBookshelfId);

    if (sort === 'newest') filtered.sort((a, b) => b.date - a.date);
    else if (sort === 'oldest') filtered.sort((a, b) => a.date - b.date);
    else if (sort === 'color') filtered.sort((a, b) => a.color.localeCompare(b.color));
    return filtered;
}

function createBookSpine(book) {
    const spine = document.createElement('div');
    spine.className = `book-spine pattern-${book.pattern || 'antique'}`;
    spine.style.backgroundColor = book.color;
    spine.style.height = `${320 + (book.id % 50)}px`;

    const title = document.createElement('div');
    title.className = 'spine-text';
    title.textContent = book.title;
    spine.appendChild(title);

    if (book.lastPage > 0) {
        const ribbon = document.createElement('div');
        ribbon.className = 'bookmark-ribbon';
        spine.appendChild(ribbon);
    }

    spine.addEventListener('click', () => openBook(book));
    spine.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        contextMenuTargetId = book.id;
        showContextMenu(e);
    });
    return spine;
}

function openBook(book) {
    currentReadingBookId = book.id;
    readTitle.textContent = book.title;
    readContent.innerHTML = book.content.split('\n').map(p => p.trim() === '' ? '<br>' : `<p>${p}</p>`).join('');
    readContent.style.fontSize = `${currentFontSize}rem`;
    
    readBookModal.classList.remove('hidden');
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});

    setTimeout(() => {
        // 連続スクロール対応: 右端（文頭）へ
        // 縦書き(vertical-rl)ではブラウザにより挙動が異なるため、確実な方法をとる
        bookViewport.scrollLeft = 0; 
        const maxScroll = bookViewport.scrollWidth - bookViewport.clientWidth;
        // scrollLeft が負、または 0 が右端の場合などがあるため、絶対値の最大方向に振る
        bookViewport.scrollLeft = bookViewport.scrollLeft <= 0 ? 0 : maxScroll;
        // それでも右端でない場合は強制的に最大値
        if (bookViewport.scrollLeft === 0 && maxScroll > 0) {
            bookViewport.scrollLeft = maxScroll;
        }
        updatePaginationUI();
    }, 200);
}

function updatePaginationUI() {
    const sw = bookViewport.scrollWidth;
    const cw = bookViewport.clientWidth;
    const sl = Math.abs(bookViewport.scrollLeft);
    
    // スクロール位置に応じたボタンの有効・無効化のみ
    // 縦書きでは左端が文末
    nextPageBtn.disabled = sl >= (sw - cw - 10); 
    prevPageBtn.disabled = sl <= 10;
    
    // ページ情報（目安として表示し続ける）
    currentPage = Math.floor(sl / (cw + 10));
    totalPages = Math.max(1, Math.ceil(sw / cw));
    pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
}

function flipPage(dir) {
    const cw = bookViewport.clientWidth;
    const scrollAmount = cw * 0.9;
    
    if (dir === 'next') {
        bookViewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        bookViewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});
    setTimeout(updatePaginationUI, 500);
}

function renderTabs() {
    bookshelfTabs.innerHTML = '';
    bookshelves.forEach(shelf => {
        const tab = document.createElement('div');
        tab.className = `bookshelf-tab ${shelf.id === currentBookshelfId ? 'active' : ''}`;
        tab.innerHTML = `<span>${shelf.name}</span><i class="fas fa-edit tab-rename-icon"></i>`;
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-rename-icon')) {
                openRenameModal(shelf);
            } else {
                currentBookshelfId = shelf.id;
                renderBookshelf();
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

function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        playCurrentBgm();
    });

    mobileMenuBtn.addEventListener('click', () => mobileActions.classList.toggle('hidden'));

    addBookBtn.addEventListener('click', () => {
        addBookForm.reset();
        editBookIdInput.value = '';
        modalTitle.textContent = '本をしまう';
        addBookModal.classList.remove('hidden');
    });

    closeAddModal.addEventListener('click', () => addBookModal.classList.add('hidden'));

    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editBookIdInput.value;
        const title = bookTitleInput.value;
        const content = bookContentInput.value;
        const color = document.querySelector('input[name="book-color"]:checked').value;
        const data = { title, content, color, pattern: 'antique', date: Date.now(), shelfId: currentBookshelfId };

        if (id) {
            const b = books.find(item => item.id == id);
            if (b) await db.collection('books').doc(b.firestoreId).update(data);
        } else {
            data.id = Date.now();
            await db.collection('books').add(data);
        }
        addBookModal.classList.add('hidden');
        showToast('物語を届けました。');
    });

    closeReadModal.addEventListener('click', () => {
        closeSound.play();
        readBookModal.classList.add('hidden');
        if (currentReadingBookId) {
            const bookmarks = JSON.parse(localStorage.getItem('bookshelf_bookmarks') || '{}');
            bookmarks[currentReadingBookId] = currentPage;
            localStorage.setItem('bookshelf_bookmarks', JSON.stringify(bookmarks));
            renderBookshelf();
        }
    });

    nextPageBtn.addEventListener('click', () => flipPage('next'));
    prevPageBtn.addEventListener('click', () => flipPage('prev'));

    bookViewport.addEventListener('scroll', updatePaginationUI);

    fontFamilyBtn.addEventListener('click', () => {
        isGothic = !isGothic;
        readContent.classList.toggle('font-gothic', isGothic);
        setTimeout(() => updatePaginationUI(), 100);
    });

    fontSizeUpBtn.addEventListener('click', () => { if (currentFontSize < 2.0) { currentFontSize += 0.1; updateFontSize(); } });
    fontSizeDownBtn.addEventListener('click', () => { if (currentFontSize > 0.7) { currentFontSize -= 0.1; updateFontSize(); } });

    randomBookBtn.addEventListener('click', () => {
        if (books.length === 0) return;
        const book = books[Math.floor(Math.random() * books.length)];
        currentBookshelfId = book.shelfId;
        renderBookshelf();
        openBook(book);
    });

    window.addEventListener('click', () => contextMenu.classList.add('hidden'));
}

function updateFontSize() {
    readContent.style.fontSize = `${currentFontSize}rem`;
    updatePaginationUI();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-leaf"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showContextMenu(e) {
    contextMenu.classList.remove('hidden');
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
}

init();
