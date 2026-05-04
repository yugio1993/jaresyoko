/**
 * JARESOHOKO - THE FOREST ARCHIVE v38
 * Professional Refactored Application Engine
 */

class JareshokoApp {
    constructor() {
        this.state = {
            books: [],
            bookshelves: [],
            currentShelfId: null,
            isDarkMode: false,
            volume: 0.12,
            isGothic: false,
            fontSize: 1.05,
            searchQuery: '',
            sortOrder: 'newest',
            loading: true,
            currentReadingBook: null,
            currentPage: 0,
            totalPages: 1
        };

        this.db = null;
        this.audio = {
            bgm: null,
            sfx: {
                flip: document.getElementById('flip-sound'),
                close: document.getElementById('close-sound')
            }
        };

        this.config = {
            firebase: {
                apiKey: "AIzaSyAjSCZWwLLFOIl08ZVlj_PSfx9-Xq-vHQo",
                authDomain: "jareshoko.firebaseapp.com",
                projectId: "jareshoko",
                storageBucket: "jareshoko.firebasestorage.app",
                messagingSenderId: "839348164263",
                appId: "1:839348164263:web:520351a7d8a18667422d82"
            },
            colors: ["#8B0000", "#2F4F4F", "#191970", "#4B0082", "#556B2F", "#A0522D"],
            patterns: ["antique", "leather", "fabric", "solid"]
        };

        this.init();
    }

    async init() {
        try {
            this.initFirebase();
            this.loadSettings();
            this.bindEvents();
            this.setupFirestoreListeners();
            this.setupDragAndDrop();
            
            // Artificial delay for smooth loader transition
            setTimeout(() => this.hideLoader(), 1500);
        } catch (error) {
            console.error("Initialization Failed:", error);
            this.showToast("起動に失敗しました。ページを再読み込みしてください。", "error");
        }
    }

    initFirebase() {
        firebase.initializeApp(this.config.firebase);
        this.db = firebase.firestore();
    }

    loadSettings() {
        const savedVolume = localStorage.getItem('jareshoko_volume');
        if (savedVolume !== null) this.state.volume = parseFloat(savedVolume);
        
        const savedTheme = localStorage.getItem('jareshoko_dark_mode');
        if (savedTheme === 'true') {
            this.state.isDarkMode = true;
            document.body.classList.add('dark-theme');
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) volumeSlider.value = this.state.volume;
    }

    hideLoader() {
        const loader = document.getElementById('loader');
        loader.classList.add('fade-out');
        document.body.classList.remove('loading-state');
    }

    // --- Firestore Sync ---

    setupFirestoreListeners() {
        // Sync Bookshelves
        this.db.collection('bookshelves').orderBy('id', 'asc').onSnapshot(snapshot => {
            const shelves = snapshot.docs.map(doc => doc.data());
            this.setState({ bookshelves: shelves });
            
            if (shelves.length === 0) {
                this.createInitialShelf();
            } else if (!this.state.currentShelfId) {
                this.setState({ currentShelfId: shelves[0].id });
            }
            this.render();
        });

        // Sync Books
        this.db.collection('books').onSnapshot(snapshot => {
            const firestoreBooks = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                firestoreId: doc.id 
            }));
            
            // Merge with local bookmarks
            const bookmarks = JSON.parse(localStorage.getItem('jareshoko_bookmarks') || '{}');
            const books = firestoreBooks.map(b => ({
                ...b,
                lastPage: bookmarks[b.id] || 0
            }));

            this.setState({ books });
            this.render();
        });
    }

    async createInitialShelf() {
        const id = Date.now();
        await this.db.collection('bookshelves').doc(String(id)).set({ 
            id, 
            name: '最初の本棚' 
        });
    }

    // --- State Management ---

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    // --- Rendering Engine ---

    render() {
        this.renderTabs();
        this.renderBookshelf();
    }

    renderTabs() {
        const container = document.getElementById('bookshelf-tabs');
        if (!container) return;

        container.innerHTML = '';
        this.state.bookshelves.forEach(shelf => {
            const tab = document.createElement('div');
            tab.className = `bookshelf-tab ${shelf.id === this.state.currentShelfId ? 'active' : ''}`;
            tab.innerHTML = `
                <span>${shelf.name}</span>
                <i class="fas fa-pen-to-square tab-edit" data-id="${shelf.id}"></i>
            `;
            
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-edit')) {
                    this.showRenameModal(shelf);
                } else {
                    this.setState({ currentShelfId: shelf.id });
                    this.render();
                }
            });
            container.appendChild(tab);
        });
    }

    renderBookshelf() {
        const wrapper = document.getElementById('bookshelf-wrapper');
        if (!wrapper) return;

        // Clear only book rows, keep decor
        const rows = wrapper.querySelectorAll('.bookshelf-row');
        rows.forEach(r => r.remove());

        const displayBooks = this.getFilteredBooks();
        let index = 0;

        if (displayBooks.length === 0) {
            wrapper.appendChild(this.createEmptyRow());
        } else {
            while (index < displayBooks.length) {
                const rowSize = Math.floor(Math.random() * 3) + 8; // 8-10 books per row
                const rowBooks = displayBooks.slice(index, index + rowSize);
                wrapper.appendChild(this.createRow(rowBooks));
                index += rowSize;
            }
        }
    }

    getFilteredBooks() {
        const { searchQuery, sortOrder, currentShelfId, books } = this.state;
        let filtered = [];

        if (searchQuery) {
            filtered = books.filter(b => 
                b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                b.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
        } else {
            filtered = books.filter(b => b.shelfId === currentShelfId);
        }

        // Sorting
        switch(sortOrder) {
            case 'newest': filtered.sort((a, b) => b.date - a.date); break;
            case 'oldest': filtered.sort((a, b) => a.date - b.date); break;
            case 'color': filtered.sort((a, b) => a.color.localeCompare(b.color)); break;
        }

        return filtered;
    }

    createRow(books) {
        const row = document.createElement('div');
        row.className = 'bookshelf-row fadeIn';
        books.forEach(book => {
            row.appendChild(this.createBookSpine(book));
        });
        return row;
    }

    createEmptyRow() {
        const row = document.createElement('div');
        row.className = 'bookshelf-row';
        row.innerHTML = '<div style="width:100%; text-align:center; color:rgba(255,255,255,0.2); font-family:var(--font-serif); padding-top:100px;">本棚は空です</div>';
        return row;
    }

    createBookSpine(book) {
        const spine = document.createElement('div');
        spine.className = `book-spine pattern-${book.pattern || 'solid'}`;
        spine.style.backgroundColor = book.color;
        spine.style.height = `${210 + (book.id % 40)}px`;

        const title = document.createElement('div');
        title.className = 'spine-text';
        title.textContent = book.title;

        spine.appendChild(title);
        
        if (book.lastPage > 0) {
            const ribbon = document.createElement('div');
            ribbon.className = 'bookmark-ribbon';
            spine.appendChild(ribbon);
        }

        spine.onclick = () => this.openBook(book);
        
        // Context Menu (Edit/Delete)
        spine.oncontextmenu = (e) => {
            e.preventDefault();
            this.showContextMenu(e, book);
        };

        return spine;
    }

    // --- Interaction Logic ---

    openBook(book) {
        this.setState({ currentReadingBook: book });
        
        const modal = document.getElementById('read-book-modal');
        const bookObj = document.getElementById('current-book');
        const cover = document.getElementById('book-cover-element');
        const titleFront = document.getElementById('read-title-front');
        const titleInside = document.getElementById('read-title');
        const content = document.getElementById('read-content');

        titleFront.textContent = book.title;
        titleInside.textContent = book.title;
        content.innerHTML = book.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br>').join('');
        content.style.fontSize = `${this.state.fontSize}rem`;
        
        cover.style.backgroundColor = book.color;
        cover.className = `obj-cover pattern-${book.pattern || 'solid'}`;

        modal.classList.remove('hidden');
        bookObj.classList.remove('open');
        bookObj.classList.add('closed');

        this.playSound('flip');

        setTimeout(() => {
            bookObj.classList.remove('closed');
            bookObj.classList.add('open');
            setTimeout(() => this.calculatePagination(book.lastPage || 0), 1200);
        }, 50);
    }

    calculatePagination(jumpToPage = 0) {
        const viewport = document.getElementById('book-viewport');
        const content = document.getElementById('read-content');
        if (!viewport || !content) return;

        const vw = viewport.clientWidth;
        const pageAdvance = vw + 100; // Width + column gap
        
        content.style.transform = "translateX(0)";

        requestAnimationFrame(() => {
            const sw = content.scrollWidth;
            const total = Math.max(1, Math.ceil(sw / pageAdvance));
            this.setState({ 
                totalPages: total, 
                currentPage: Math.min(jumpToPage, total - 1) 
            });
            this.updatePaginationUI();
        });
    }

    updatePaginationUI() {
        const content = document.getElementById('read-content');
        const vw = document.getElementById('book-viewport').clientWidth;
        const pageAdvance = vw + 100;
        
        content.style.transform = `translateX(${this.state.currentPage * pageAdvance}px)`;
        
        document.getElementById('next-page-btn').disabled = this.state.currentPage >= this.state.totalPages - 1;
        document.getElementById('prev-page-btn').disabled = this.state.currentPage === 0;
    }

    flipPage(dir) {
        let { currentPage, totalPages } = this.state;
        if (dir === 'next' && currentPage < totalPages - 1) currentPage++;
        else if (dir === 'prev' && currentPage > 0) currentPage--;
        else return;

        this.setState({ currentPage });
        this.playSound('flip');
        this.updatePaginationUI();
    }

    // --- Events & Bindings ---

    bindEvents() {
        // Start Screen
        document.getElementById('start-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            this.playBgm();
        };

        // Dark Mode
        document.getElementById('dark-mode-btn').onclick = () => {
            this.state.isDarkMode = !this.state.isDarkMode;
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('jareshoko_dark_mode', this.state.isDarkMode);
        };

        // Search & Sort
        document.getElementById('search-input').oninput = (e) => {
            this.setState({ searchQuery: e.target.value });
            this.render();
        };

        document.getElementById('sort-select').onchange = (e) => {
            this.setState({ sortOrder: e.target.value });
            this.render();
        };

        // Modals
        document.getElementById('add-book-btn').onclick = () => this.showAddModal();
        document.getElementById('close-add-modal').onclick = () => document.getElementById('add-book-modal').classList.add('hidden');
        document.getElementById('close-read-modal').onclick = () => this.closeBook();

        // Reader Controls
        document.getElementById('next-page-btn').onclick = () => this.flipPage('next');
        document.getElementById('prev-page-btn').onclick = () => this.flipPage('prev');
        document.getElementById('font-size-up-btn').onclick = () => this.changeFontSize(0.1);
        document.getElementById('font-size-down-btn').onclick = () => this.changeFontSize(-0.1);

        // Form Submit
        document.getElementById('add-book-form').onsubmit = (e) => this.handleBookSubmit(e);
        
        // Volume
        document.getElementById('volume-slider').oninput = (e) => {
            const v = parseFloat(e.target.value);
            this.state.volume = v;
            localStorage.setItem('jareshoko_volume', v);
        };
    }

    async handleBookSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = document.getElementById('edit-book-id').value;
        const bookData = {
            title: document.getElementById('book-title').value,
            content: document.getElementById('book-content').value,
            color: form.querySelector('input[name="book-color"]:checked').value,
            pattern: form.querySelector('input[name="book-pattern"]:checked').value,
            date: Date.now(),
            shelfId: this.state.currentShelfId
        };

        try {
            if (id) {
                const book = this.state.books.find(b => b.id == id);
                await this.db.collection('books').doc(book.firestoreId).update(bookData);
            } else {
                bookData.id = Date.now();
                await this.db.collection('books').add(bookData);
            }
            document.getElementById('add-book-modal').classList.add('hidden');
            this.showToast("物語を棚に収めました。");
        } catch (e) {
            this.showToast("保存に失敗しました。", "error");
        }
    }

    closeBook() {
        const book = this.state.currentReadingBook;
        if (book) {
            this.saveBookmark(book.id, this.state.currentPage);
        }
        
        this.playSound('close');
        document.getElementById('current-book').classList.replace('open', 'closed');
        setTimeout(() => {
            document.getElementById('read-book-modal').classList.add('hidden');
        }, 500);
    }

    saveBookmark(bookId, page) {
        const bookmarks = JSON.parse(localStorage.getItem('jareshoko_bookmarks') || '{}');
        bookmarks[bookId] = page;
        localStorage.setItem('jareshoko_bookmarks', JSON.stringify(bookmarks));
    }

    changeFontSize(delta) {
        let size = this.state.fontSize + delta;
        size = Math.min(Math.max(0.7, size), 2.0);
        this.setState({ fontSize: size });
        document.getElementById('read-content').style.fontSize = `${size}rem`;
        this.calculatePagination(this.state.currentPage);
    }

    // --- UI Helpers ---

    showToast(message, type = "success") {
        const area = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fadeIn`;
        toast.innerHTML = `<span>${message}</span>`;
        area.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    playSound(key) {
        const s = this.audio.sfx[key];
        if (s) {
            s.currentTime = 0;
            s.volume = this.state.volume;
            s.play().catch(() => {});
        }
    }

    playBgm() {
        // Placeholder for BGM logic
        console.log("BGM Started");
    }

    showAddModal() {
        document.getElementById('add-book-form').reset();
        document.getElementById('edit-book-id').value = '';
        document.getElementById('modal-title').textContent = "新しい物語を棚に収める";
        document.getElementById('add-book-modal').classList.remove('hidden');
    }

    showRenameModal(shelf) {
        document.getElementById('shelf-name-input').value = shelf.name;
        const modal = document.getElementById('rename-shelf-modal');
        modal.dataset.shelfId = shelf.id;
        modal.classList.remove('hidden');
        
        document.getElementById('rename-shelf-form').onsubmit = async (e) => {
            e.preventDefault();
            const newName = document.getElementById('shelf-name-input').value;
            await this.db.collection('bookshelves').doc(String(shelf.id)).update({ name: newName });
            modal.classList.add('hidden');
        };
        
        document.getElementById('close-rename-shelf-modal').onclick = () => modal.classList.add('hidden');
    }

    setupDragAndDrop() {
        const overlay = document.getElementById('drag-overlay');
        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            overlay.classList.remove('hidden');
        });
        overlay.addEventListener('dragleave', (e) => {
            if (e.relatedTarget === null) overlay.classList.add('hidden');
        });
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            overlay.classList.add('hidden');
            const files = e.dataTransfer.files;
            if (files.length > 0) this.handleFiles(files);
        });
    }

    async handleFiles(files) {
        for (const file of Array.from(files)) {
            if (!file.name.endsWith('.txt')) continue;
            const title = file.name.replace('.txt', '');
            const content = await file.text();
            
            const bookData = {
                id: Date.now() + Math.random(),
                title,
                content,
                color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                pattern: this.config.patterns[Math.floor(Math.random() * this.config.patterns.length)],
                date: Date.now(),
                shelfId: this.state.currentShelfId
            };
            
            await this.db.collection('books').add(bookData);
        }
        this.showToast(`${files.length} 冊の物語をインポートしました。`);
    }
}

// Instantiate the application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new JareshokoApp();
});
