// Global variables
let currentUser = null;
let menuItems = [];
let currentOrder = [];
let socket = null;
let selectedItem = null; // For modal
let itemOptionsModal = null;
let cancelItemModal = null;
let newShiftModal = null;
let selectedTableNumber = null;

// Menu filtering and search
let allMenuItems = [];
let currentFilter = 'all';
let currentSearch = '';

// DOM elements
let loadingScreen, loginScreen, app, loginForm, loginError, userName, logoutLink, navMenu;
let waiterDashboard, cookDashboard, bartenderDashboard, adminDashboard;
let menuItemsContainer, orderItemsContainer, placeOrderBtn, clearOrderBtn, myOrdersContainer;

// Audio elements for notifications
let notificationSound = null;
let beepSound = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        showLoginScreen();
    }

    // Setup event listeners
    setupEventListeners();
}

function initializeDOMElements() {
    // Main elements
    loadingScreen = document.getElementById('loadingScreen');
    loginScreen = document.getElementById('loginScreen');
    app = document.getElementById('app');
    loginForm = document.getElementById('loginForm');
    loginError = document.getElementById('loginError');
    userName = document.getElementById('userName');
    logoutLink = document.getElementById('logoutLink');
    navMenu = document.getElementById('navMenu');

    // Dashboard elements
    waiterDashboard = document.getElementById('waiterDashboard');
    cookDashboard = document.getElementById('cookDashboard');
    bartenderDashboard = document.getElementById('bartenderDashboard');
    adminDashboard = document.getElementById('adminDashboard');

    // Waiter elements
    menuItemsContainer = document.getElementById('menuItems');
    orderItemsContainer = document.getElementById('orderItems');
    placeOrderBtn = document.getElementById('placeOrderBtn');
    clearOrderBtn = document.getElementById('clearOrderBtn');
    myOrdersContainer = document.getElementById('myOrders');

    // Modal elements
    itemOptionsModal = new bootstrap.Modal(document.getElementById('itemOptionsModal'));
    cancelItemModal = new bootstrap.Modal(document.getElementById('cancelItemModal'));
    newShiftModal = new bootstrap.Modal(document.getElementById('newShiftModal'));
    reportsModal = new bootstrap.Modal(document.getElementById('reportsModal'));
    reportDetailsModal = new bootstrap.Modal(document.getElementById('reportDetailsModal'));

    // Audio elements
    notificationSound = document.getElementById('notificationSound');
    beepSound = document.getElementById('beepSound');
}

function setupEventListeners() {
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Menu filters
    const allItemsFilter = document.getElementById('allItems');
    const foodItemsFilter = document.getElementById('foodItems');
    const drinkItemsFilter = document.getElementById('drinkItems');
    
    if (allItemsFilter) allItemsFilter.addEventListener('change', filterMenuItems);
    if (foodItemsFilter) foodItemsFilter.addEventListener('change', filterMenuItems);
    if (drinkItemsFilter) drinkItemsFilter.addEventListener('change', filterMenuItems);
    
    // Order actions
    if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);
    if (clearOrderBtn) clearOrderBtn.addEventListener('click', clearOrder);
    
    // Table selection
    const tableBoxes = document.querySelectorAll('.table-box');
    tableBoxes.forEach(box => {
        box.addEventListener('click', handleTableSelection);
    });
    
    // Order notes
    const orderNotes = document.getElementById('orderNotes');
    if (orderNotes) {
        orderNotes.addEventListener('input', validateOrder);
    }
}

// Global functions for buttons
function showReports() {
    // Show reports modal
    const reportsModal = new bootstrap.Modal(document.getElementById('reportsModal'));
    reportsModal.show();
    // Load reports when modal opens
    loadReports();
}

function showNewShiftModal() {
    if (!newShiftModal) {
        newShiftModal = new bootstrap.Modal(document.getElementById('newShiftModal'));
    }
    newShiftModal.show();
}

async function startNewShift() {
    try {
        const response = await fetch('/api/shifts/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Nova smjena uspješno započeta!', 'success');
            if (newShiftModal) {
                newShiftModal.hide();
            }
            // Refresh data
            refreshOrders();
        } else {
            showToast(data.error || 'Greška pri započinjanju nove smjene', 'error');
        }
    } catch (error) {
        console.error('Error starting new shift:', error);
        showToast('Greška pri započinjanju nove smjene', 'error');
    }
}

function handleTableSelection(e) {
    const clickedBox = e.currentTarget;
    const tableNumber = parseInt(clickedBox.getAttribute('data-table'));
    
    // Samo selektuj kliknuti sto
    document.querySelectorAll('.table-box').forEach(box => {
        box.classList.remove('selected');
    });
    clickedBox.classList.add('selected');
    selectedTableNumber = tableNumber;
    validateOrder();
}

function getSelectedTableNumber() {
    const selectedBox = document.querySelector('.table-box.selected');
    return selectedBox ? parseInt(selectedBox.getAttribute('data-table')) : null;
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showMainApp();
        } else {
            showLoginError(data.error);
        }
    } catch (error) {
        showLoginError('Greška pri povezivanju sa serverom');
    }
}

async function validateToken(token) {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showMainApp();
        } else {
            localStorage.removeItem('token');
            showLoginScreen();
        }
    } catch (error) {
        localStorage.removeItem('token');
        showLoginScreen();
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    if (socket) {
        socket.disconnect();
    }
    showLoginScreen();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('d-none');
    setTimeout(() => {
        loginError.classList.add('d-none');
    }, 5000);
}

// UI functions
function showLoginScreen() {
    loadingScreen.style.display = 'none';
    loginScreen.style.display = 'block';
    app.classList.add('d-none');
}

function showMainApp() {
    loadingScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    app.classList.remove('d-none');
    
    setupUserInterface();
    initializeSocket();
}

function setupUserInterface() {
    // Set user name
    userName.textContent = currentUser.full_name;
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Setup event listeners
    setupEventListeners();
    
    // Show appropriate dashboard
    showDashboard();
}

function setupNavigation() {
    navMenu.innerHTML = '';
    
    const menuItems = [];
    
    switch (currentUser.role) {
        case 'waiter':
            menuItems.push({
                text: 'Narudžbe',
                icon: 'bi-cart',
                action: () => showWaiterDashboard()
            });
            break;
            
        case 'cook':
            menuItems.push({
                text: 'Kuhinja',
                icon: 'bi-fire',
                action: () => showCookDashboard()
            });
            break;
            
        case 'bartender':
            menuItems.push({
                text: 'Šank',
                icon: 'bi-cup-straw',
                action: () => showBartenderDashboard()
            });
            break;
            
        case 'admin':
            menuItems.push(
                {
                    text: 'Korisnici',
                    icon: 'bi-people',
                    action: () => showAdminDashboard()
                },
                {
                    text: 'Meni',
                    icon: 'bi-list-ul',
                    action: () => showAdminDashboard()
                }
            );
            break;
    }
    
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `
            <a class="nav-link" href="#" onclick="event.preventDefault(); ${item.action.name}()">
                <i class="${item.icon} me-1"></i>${item.text}
            </a>
        `;
        navMenu.appendChild(li);
    });
}

function showDashboard() {
    // Hide all dashboards
    waiterDashboard.classList.add('d-none');
    cookDashboard.classList.add('d-none');
    bartenderDashboard.classList.add('d-none');
    adminDashboard.classList.add('d-none');
    
    // Show appropriate dashboard and load data
    switch (currentUser.role) {
        case 'waiter':
            showWaiterDashboard();
            break;
        case 'cook':
            showCookDashboard();
            break;
        case 'bartender':
            showBartenderDashboard();
            break;
        case 'admin':
            showAdminDashboard();
            break;
    }
}

function showWaiterDashboard() {
    waiterDashboard.classList.remove('d-none');
    
    // Check if user is logged in
    if (!currentUser) {
        return;
    }
    
    // Load menu items immediately
    loadMenuItems();
    
    // Wait for DOM to be ready and dashboard to be visible
    setTimeout(() => {
        // Check if dashboard is visible
        if (waiterDashboard.classList.contains('d-none')) {
            return;
        }
        
        // Re-setup table selection event listeners
        const tableBoxes = document.querySelectorAll('.table-box');
        tableBoxes.forEach(box => {
            box.removeEventListener('click', handleTableSelection);
            box.addEventListener('click', handleTableSelection);
        });
        
        loadMyOrders();
    }, 100);
}

function showCookDashboard() {
    cookDashboard.classList.remove('d-none');
    loadCookOrders();
}

function showBartenderDashboard() {
    bartenderDashboard.classList.remove('d-none');
    loadBartenderOrders();
}

function showAdminDashboard() {
    adminDashboard.classList.remove('d-none');
    loadAdminDashboard();
    loadInventory();
    
    // Set today's date for bar book
    document.getElementById('barBookDate').value = new Date().toISOString().split('T')[0];
}

// Socket.IO functions
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join-room', currentUser.role);
    });
    
    socket.on('order-update', (order) => {
        showToast('Nova narudžba!', 'info');
        refreshOrders();
    });
    
    // Dodano: listener za new-order event
    socket.on('new-order', (order) => {
        console.log('NEW ORDER event:', order);
        showToast('Nova narudžba!', 'info');
        refreshOrders();
    });
    
    socket.on('order-confirmation', (order) => {
        showToast('Narudžba uspješno poslana!', 'success');
        refreshOrders();
    });
    
    socket.on('status-update', (data) => {
        showToast('Status narudžbe ažuriran', 'success');
        refreshOrders();
    });
    
    socket.on('order-cancelled', (data) => {
        showToast('Narudžba otkazana', 'warning');
        refreshOrders();
        
        // Free up table if order was cancelled
        if (data.table_number) {
            // Ukloni occupiedTables, isTableOccupied, updateTableStatus
        }
    });
    
    // Dodano: listener za item-ready event
    socket.on('item-ready', (data) => {
        console.log('Item ready notification:', data);
        if (currentUser && currentUser.role === 'waiter') {
            // Play notification sound
            playNotificationSound();
            
                    // Show toast notification
        showToast(`Sto ${data.table_number} - ${data.item_name} je spremno!`, 'success');
            
            // Refresh orders to show updated status
            refreshOrders();
        }
    });
    
    // Dodano: listener za order-completed event
    socket.on('order-completed', (data) => {
        showToast('Narudžba završena', 'success');
        refreshOrders();
        
        // Free up table when order is completed
        if (data.table_number) {
            // Ukloni occupiedTables, isTableOccupied, updateTableStatus
        }
    });
}

// API functions
async function loadMenuItems() {
    try {
        // Check if user is logged in
        if (!currentUser) {
            return;
        }
        
        const response = await fetch('/api/menu?available=true');
        const data = await response.json();
        
        allMenuItems = data.items || [];
        setupMenuFilters(); // Setup filters after loading items
        filterAndRenderMenu(); // Render all items initially
    } catch (error) {
        console.error('Menu loading error:', error);
        showToast('Greška pri učitavanju menija', 'error');
    }
}

async function loadMyOrders() {
    try {
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        renderMyOrders(data.orders);
    } catch (error) {
        showToast('Greška pri učitavanju narudžbi', 'error');
    }
}

async function loadCookOrders() {
    try {
        console.log('loadCookOrders: Fetching orders...');
        const response = await fetch('/api/orders?status=pending,preparing', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        console.log('loadCookOrders: Received data:', data);
        // Backend already filters food orders, no need to filter again
        renderCookOrders(data.orders);
    } catch (error) {
        console.error('loadCookOrders error:', error);
        showToast('Greška pri učitavanju narudžbi', 'error');
    }
}

async function loadBartenderOrders() {
    try {
        const response = await fetch('/api/orders?status=pending,preparing', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        // Backend already filters drink orders, no need to filter again
        renderBartenderOrders(data.orders);
    } catch (error) {
        showToast('Greška pri učitavanju narudžbi', 'error');
    }
}

async function loadAdminData() {
    // Load users and menu management
    try {
        const [usersResponse, menuResponse] = await Promise.all([
            fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }),
            fetch('/api/menu', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        ]);
        
        const usersData = await usersResponse.json();
        const menuData = await menuResponse.json();
        
        renderAdminUsers(usersData.users);
        renderAdminMenu(menuData.items);
    } catch (error) {
        showToast('Greška pri učitavanju podataka', 'error');
    }
}

async function loadReports() {
    try {
        const dateFilter = document.getElementById('dateFilter').value;
        const startDateFilter = document.getElementById('startDateFilter').value;
        const endDateFilter = document.getElementById('endDateFilter').value;

        let url = '/api/shifts/reports';
        const params = new URLSearchParams();
        
        if (dateFilter) {
            params.append('date', dateFilter);
        } else if (startDateFilter && endDateFilter) {
            params.append('start_date', startDateFilter);
            params.append('end_date', endDateFilter);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        renderReports(data.reports);
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('reportsList').innerHTML = 
            '<div class="alert alert-danger">Greška pri učitavanju izvještaja</div>';
    }
}

function renderReports(reports) {
    const container = document.getElementById('reportsList');
    
    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="bi bi-file-earmark-text" style="font-size: 3rem; color: #6c757d;"></i>
                <h5 class="mt-3">Nema izvještaja</h5>
                <p class="text-muted">Nema izvještaja za odabrani period</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reports.map(report => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <h6 class="card-title">Datum: ${new Date(report.report_date).toLocaleDateString()}</h6>
                        <p class="text-muted">${report.shift_start} - ${report.shift_end}</p>
                    </div>
                    <div class="col-md-3">
                        <p class="mb-1"><strong>Ukupno narudžbi:</strong> ${report.total_orders}</p>
                        <p class="mb-1"><strong>Ukupan prihod:</strong> ${parseFloat(report.total_revenue).toFixed(2)} KM</p>
                    </div>
                    <div class="col-md-3">
                        <p class="mb-1"><strong>Otpisane narudžbe:</strong> ${report.total_cancelled_orders}</p>
                        <p class="mb-1"><strong>Otpisani prihod:</strong> ${parseFloat(report.total_cancelled_revenue).toFixed(2)} KM</p>
                    </div>
                    <div class="col-md-3">
                        <p class="text-muted">Kreirao: ${report.created_by_name}</p>
                        <button class="btn btn-primary btn-sm" onclick="showReportDetails(${report.id})">
                            <i class="bi bi-eye"></i> Detalji
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function showReportDetails(reportId) {
    try {
        const response = await fetch(`/api/shifts/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        renderReportDetails(data.report);
        
        // Show details in a new modal
        const detailsModal = new bootstrap.Modal(document.getElementById('reportDetailsModal'));
        detailsModal.show();
    } catch (error) {
        console.error('Error loading report details:', error);
        showToast('Greška pri učitavanju detalja izvještaja', 'error');
    }
}

function renderReportDetails(report) {
    const content = document.getElementById('reportDetailsContent');
    
    content.innerHTML = `
        <div class="mb-3">
            <h6>Opći podaci</h6>
            <p><strong>Datum:</strong> ${new Date(report.report_date).toLocaleDateString()}</p>
            <p><strong>Smjena:</strong> ${report.shift_start} - ${report.shift_end}</p>
            <p><strong>Ukupan prihod:</strong> ${parseFloat(report.total_revenue).toFixed(2)} KM</p>
            <p><strong>Otpisani prihod:</strong> ${parseFloat(report.total_cancelled_revenue).toFixed(2)} KM</p>
        </div>
        
        <div class="mb-3">
            <h6>Detalji po artiklima</h6>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Artikal</th>
                            <th>Kategorija</th>
                            <th>Prodano</th>
                            <th>Otpisano</th>
                            <th>Prihod</th>
                            <th>Otpisani prihod</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.items.map(item => `
                            <tr>
                                <td>${item.item_name}</td>
                                <td>${item.category}</td>
                                <td>${item.quantity_sold}</td>
                                <td>${item.quantity_cancelled}</td>
                                <td>${parseFloat(item.total_revenue).toFixed(2)} KM</td>
                                <td>${parseFloat(item.cancelled_revenue).toFixed(2)} KM</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function exportReport() {
    // This would need to be implemented with the actual report data
    showToast('Funkcija izvoza će biti implementirana uskoro', 'info');
}

// Rendering functions
function renderMenuItems() {
    if (!menuItemsContainer) {
        console.error('menuItemsContainer not found');
        return;
    }
    
    menuItemsContainer.innerHTML = '';
    
    if (menuItems.length === 0) {
        menuItemsContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-list-ul"></i>
                    <h5>Nema dostupnih stavki</h5>
                    <p>Meni je trenutno prazan</p>
                </div>
            </div>
        `;
        return;
    }
    
    menuItems.forEach(item => {
        const menuItemElement = createMenuItemElement(item);
        menuItemsContainer.appendChild(menuItemElement);
    });
}

function createMenuItemElement(item) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 col-xl-3';
    
    col.innerHTML = `
        <div class="card menu-item" data-item-id="${item.id}" onclick="addToOrder(${item.id})">
            <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 120px; background-color: #f8f9fa;">
                <i class="bi ${item.category === 'food' ? 'bi-egg-fried' : 'bi-cup-straw'}" style="font-size: 3rem; color: #6c757d;"></i>
            </div>
            <span class="badge category-badge ${item.category === 'food' ? 'bg-success' : 'bg-info'}">
                ${item.category === 'food' ? 'Hrana' : 'Piće'}
            </span>
            <div class="card-body">
                <h6 class="card-title">${item.name}</h6>
                <p class="card-text">${item.description || ''}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="price">${parseFloat(item.price).toFixed(2)} KM</span>
                    <small class="text-muted">${item.subcategory || ''}</small>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function renderMyOrders(orders) {
    const container = document.getElementById('myOrders');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <h5>Nema narudžbi</h5>
                    <p>Vaše narudžbe će se ovdje prikazati</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    orders.forEach(order => {
        const orderElement = createOrderElement(order);
        container.appendChild(orderElement);
    });
}

function renderCookOrders(orders) {
    console.log('renderCookOrders called with orders:', orders);
    const container = document.getElementById('cookOrders');
    if (!container) {
        console.error('cookOrders container not found!');
        return;
    }
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-egg-fried"></i>
                    <h5>Nema aktivnih narudžbi</h5>
                    <p>Čekajte nove narudžbe hrane</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    orders.forEach(order => {
        const orderElement = createCookOrderElement(order);
        container.appendChild(orderElement);
    });
}

function createCookOrderElement(order) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    // Filter only food items
    const foodItems = order.items.filter(item => item.category === 'food' && item.status !== 'cancelled');
    
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Stol ${order.table_number}</h6>
                <span class="badge bg-primary">${order.waiter_name}</span>
            </div>
            <div class="card-body">
                <div class="order-item-list">
                    ${foodItems.length > 0 ? foodItems.map(item => `
                        <div class="order-item-row mb-2 p-2 border rounded">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="fw-bold">${item.name}</div>
                                    ${item.size ? `<small class="text-muted">Veličina: ${item.size}</small><br>` : ''}
                                    ${item.variation ? `<small class="text-muted">Varijacija: ${item.variation}</small><br>` : ''}
                                    ${item.notes ? `<small class="text-info"><i class="bi bi-info-circle"></i> ${item.notes}</small><br>` : ''}
                                    <small class="text-muted">Količina: ${item.quantity}</small>
                                </div>
                                <div class="ms-2">
                                    <span class="badge bg-${item.status === 'ready' ? 'success' : item.status === 'preparing' ? 'warning' : 'secondary'}">
                                        ${getStatusText(item.status)}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-2 d-flex gap-1">
                                ${item.status === 'pending' ? `
                                    <button class="btn btn-sm btn-warning" onclick="updateOrderItemStatus(${order.id}, ${item.id}, 'preparing')">
                                        <i class="bi bi-play-fill"></i> Priprema
                                    </button>
                                ` : ''}
                                ${item.status === 'preparing' ? `
                                    <button class="btn btn-sm btn-success" onclick="updateOrderItemStatus(${order.id}, ${item.id}, 'ready')">
                                        <i class="bi bi-check-lg"></i> Gotovo
                                    </button>
                                ` : ''}
                                ${item.status !== 'ready' && item.status !== 'cancelled' ? `
                                    <button class="btn btn-sm btn-danger" onclick="cancelOrderItem(${order.id}, ${item.id})">
                                        <i class="bi bi-x-lg"></i> Otpiši
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') : 'Nema hrane u narudžbi'}
                </div>
                ${order.notes ? `
                    <div class="mt-2 p-2 bg-light rounded">
                        <small class="text-muted"><i class="bi bi-chat"></i> Napomena: ${order.notes}</small>
                    </div>
                ` : ''}
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">${new Date(order.created_at).toLocaleTimeString()}</small>
                    <span class="fw-bold">${parseFloat(order.total_amount).toFixed(2)} KM</span>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function renderBartenderOrders(orders) {
    const container = document.getElementById('bartenderOrders');
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-cup-straw"></i>
                    <h5>Nema aktivnih narudžbi</h5>
                    <p>Nove narudžbe će se ovdje prikazati</p>
                </div>
            </div>
        `;
        return;
    }
    
    orders.forEach(order => {
        const orderElement = createBartenderOrderElement(order);
        container.appendChild(orderElement);
    });
}

function createOrderElement(order) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Stol ${order.table_number}</h6>
                <span class="badge bg-${order.status === 'served' ? 'success' : order.status === 'ready' ? 'warning' : 'secondary'}">
                    ${getStatusText(order.status)}
                </span>
            </div>
            <div class="card-body">
                <div class="order-item-list">
                    ${order.items ? order.items.map(item => `
                        <div class="order-item-row mb-2 p-2 border rounded">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="fw-bold">${item.name}</div>
                                    ${item.size ? `<small class="text-muted">Veličina: ${item.size}</small><br>` : ''}
                                    ${item.variation ? `<small class="text-muted">Varijacija: ${item.variation}</small><br>` : ''}
                                    ${item.notes ? `<small class="text-info"><i class="bi bi-info-circle"></i> ${item.notes}</small><br>` : ''}
                                    <small class="text-muted">Količina: ${item.quantity}</small>
                                </div>
                                <div class="ms-2">
                                    <span class="badge bg-${item.status === 'ready' ? 'success' : item.status === 'preparing' ? 'warning' : item.status === 'cancelled' ? 'danger' : 'secondary'}">
                                        ${getStatusText(item.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('') : 'Nema stavki'}
                </div>
                ${order.notes ? `
                    <div class="mt-2 p-2 bg-light rounded">
                        <small class="text-muted"><i class="bi bi-chat"></i> Napomena: ${order.notes}</small>
                    </div>
                ` : ''}
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">${new Date(order.created_at).toLocaleTimeString()}</small>
                    <span class="fw-bold">${parseFloat(order.total_amount).toFixed(2)} KM</span>
                </div>
                ${order.status === 'ready' ? `
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-success btn-sm" onclick="markOrderServed(${order.id})">
                            <i class="bi bi-check-circle"></i> Posluženo
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">
                            <i class="bi bi-x-circle"></i> Otkaži
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return col;
}

function createBartenderOrderElement(order) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    // Filter only drink items
    const drinkItems = order.items.filter(item => item.category === 'drink' && item.status !== 'cancelled');
    
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Stol ${order.table_number}</h6>
                <span class="badge bg-primary">${order.waiter_name}</span>
            </div>
            <div class="card-body">
                <div class="order-item-list">
                    ${drinkItems.length > 0 ? drinkItems.map(item => `
                        <div class="order-item-row mb-2 p-2 border rounded">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="fw-bold">${item.name}</div>
                                    ${item.size ? `<small class="text-muted">Veličina: ${item.size}</small><br>` : ''}
                                    ${item.variation ? `<small class="text-muted">Varijacija: ${item.variation}</small><br>` : ''}
                                    ${item.notes ? `<small class="text-info"><i class="bi bi-info-circle"></i> ${item.notes}</small><br>` : ''}
                                    <small class="text-muted">Količina: ${item.quantity}</small>
                                </div>
                                <div class="ms-2">
                                    <span class="badge bg-${item.status === 'ready' ? 'success' : item.status === 'preparing' ? 'warning' : 'secondary'}">
                                        ${getStatusText(item.status)}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-2 d-flex gap-1">
                                ${item.status === 'pending' ? `
                                    <button class="btn btn-sm btn-warning" onclick="updateOrderItemStatus(${order.id}, ${item.id}, 'preparing')">
                                        <i class="bi bi-play-fill"></i> Priprema
                                    </button>
                                ` : ''}
                                ${item.status === 'preparing' ? `
                                    <button class="btn btn-sm btn-success" onclick="updateOrderItemStatus(${order.id}, ${item.id}, 'ready')">
                                        <i class="bi bi-check-lg"></i> Gotovo
                                    </button>
                                ` : ''}
                                ${item.status !== 'ready' && item.status !== 'cancelled' ? `
                                    <button class="btn btn-sm btn-danger" onclick="cancelOrderItem(${order.id}, ${item.id})">
                                        <i class="bi bi-x-lg"></i> Otpiši
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') : 'Nema pića u narudžbi'}
                </div>
                ${order.notes ? `
                    <div class="mt-2 p-2 bg-light rounded">
                        <small class="text-muted"><i class="bi bi-chat"></i> Napomena: ${order.notes}</small>
                    </div>
                ` : ''}
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">${new Date(order.created_at).toLocaleTimeString()}</small>
                    <span class="fw-bold">${parseFloat(order.total_amount).toFixed(2)} KM</span>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Order functions
function addToOrder(itemId) {
    const item = allMenuItems.find(i => i.id === itemId);
    if (!item) return;
    
    selectedItem = item;
    showItemOptionsModal();
}

function showItemOptionsModal() {
    if (!itemOptionsModal) {
        itemOptionsModal = new bootstrap.Modal(document.getElementById('itemOptionsModal'));
    }
    
    document.getElementById('itemName').textContent = selectedItem.name;
    document.getElementById('itemDescription').textContent = selectedItem.description || 'Nema opis';
    document.getElementById('itemPrice').textContent = `${parseFloat(selectedItem.price).toFixed(2)} KM`;
    
    // Show/hide size section based on item category
    const sizeSection = document.getElementById('sizeSection');
    if (selectedItem.category === 'food' && (selectedItem.subcategory === 'pizza' || selectedItem.subcategory === 'burger')) {
        sizeSection.style.display = 'block';
    } else {
        sizeSection.style.display = 'none';
    }
    
    // Show/hide variation section based on item
    const variationSection = document.getElementById('variationSection');
    const variationSelect = document.getElementById('itemVariation');
    
    if (selectedItem.subcategory === 'pizza') {
        variationSection.style.display = 'block';
        variationSelect.innerHTML = `
            <option value="">Odaberite varijaciju</option>
            <option value="Margherita">Margherita</option>
            <option value="Capricciosa">Capricciosa</option>
            <option value="Quattro Stagioni">Quattro Stagioni</option>
            <option value="Pepperoni">Pepperoni</option>
            <option value="Hawaii">Hawaii</option>
        `;
    } else if (selectedItem.subcategory === 'kafa') {
        variationSection.style.display = 'block';
        variationSelect.innerHTML = `
            <option value="">Odaberite varijaciju</option>
            <option value="Espresso">Espresso</option>
            <option value="Sa mlekom">Sa mlekom</option>
            <option value="Cappuccino">Cappuccino</option>
            <option value="Latte">Latte</option>
        `;
    } else {
        variationSection.style.display = 'none';
    }
    
    // Reset form
    document.getElementById('itemQuantity').value = 1;
    document.getElementById('itemNotes').value = '';
    document.getElementById('sizeMedium').checked = true;
    document.getElementById('itemVariation').value = '';
    
    itemOptionsModal.show();
}

function addItemToOrder() {
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const notes = document.getElementById('itemNotes').value;
    const size = document.querySelector('input[name="itemSize"]:checked')?.value;
    const variation = document.getElementById('itemVariation').value;
    
    const existingItem = currentOrder.find(i => 
        i.menu_item_id === selectedItem.id && 
        i.notes === notes && 
        i.size === size && 
        i.variation === variation
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        currentOrder.push({
            menu_item_id: selectedItem.id,
            quantity: quantity,
            notes: notes,
            size: size,
            variation: variation
        });
    }
    
    renderCurrentOrder();
    validateOrder();
    itemOptionsModal.hide();
    
    // Reset modal
    document.getElementById('itemQuantity').value = 1;
    document.getElementById('itemNotes').value = '';
    document.getElementById('sizeMedium').checked = true;
    document.getElementById('itemVariation').value = '';
}

function changeQuantity(change) {
    const quantityInput = document.getElementById('itemQuantity');
    let currentQuantity = parseInt(quantityInput.value) || 1;
    currentQuantity = Math.max(1, Math.min(99, currentQuantity + change));
    quantityInput.value = currentQuantity;
}

function removeFromOrder(itemId) {
    const index = currentOrder.findIndex(i => i.menu_item_id === itemId);
    if (index > -1) {
        currentOrder.splice(index, 1);
        renderCurrentOrder();
        validateOrder();
    }
}

function updateItemQuantity(itemId, change) {
    const item = currentOrder.find(i => i.menu_item_id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromOrder(itemId);
        } else {
            renderCurrentOrder();
            validateOrder();
        }
    }
}

function renderCurrentOrder() {
    console.log('renderCurrentOrder called');
    console.log('orderItemsContainer:', orderItemsContainer);
    console.log('currentOrder:', currentOrder);
    console.log('allMenuItems:', allMenuItems);
    
    if (!orderItemsContainer) {
        console.error('orderItemsContainer is null!');
        return;
    }
    
    if (currentOrder.length === 0) {
        orderItemsContainer.innerHTML = '<div class="text-muted text-center">Dodajte artikle iz menija</div>';
        return;
    }
    
    orderItemsContainer.innerHTML = '';
    
    currentOrder.forEach((item, index) => {
        const menuItem = allMenuItems.find(m => m.id === item.menu_item_id);
        console.log('Looking for menu item with id:', item.menu_item_id, 'Found:', menuItem);
        if (!menuItem) return;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item d-flex justify-content-between align-items-center p-2 border-bottom';
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'flex-grow-1';
        
        let itemText = `${menuItem.name} (${item.quantity}x)`;
        if (item.size) itemText += ` - ${item.size}`;
        if (item.variation) itemText += ` - ${item.variation}`;
        if (item.notes) itemText += ` - ${item.notes}`;
        
        itemInfo.innerHTML = `
            <div class="fw-bold">${itemText}</div>
            <small class="text-muted">${parseFloat(menuItem.price * item.quantity).toFixed(2)} KM</small>
        `;
        
        const itemActions = document.createElement('div');
        itemActions.className = 'd-flex align-items-center';
        itemActions.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="updateItemQuantity(${item.menu_item_id}, -1)">
                <i class="bi bi-dash"></i>
            </button>
            <span class="mx-2">${item.quantity}</span>
            <button class="btn btn-sm btn-outline-secondary me-2" onclick="updateItemQuantity(${item.menu_item_id}, 1)">
                <i class="bi bi-plus"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromOrder(${item.menu_item_id})">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        itemElement.appendChild(itemInfo);
        itemElement.appendChild(itemActions);
        orderItemsContainer.appendChild(itemElement);
    });
    
    // Show total
    const total = currentOrder.reduce((sum, item) => {
        const menuItem = allMenuItems.find(m => m.id === item.menu_item_id);
        return sum + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0);
    
    console.log('Total calculated:', total);
    
    const totalElement = document.createElement('div');
    totalElement.className = 'mt-3 p-2 bg-primary text-white rounded';
    totalElement.innerHTML = `<strong>Ukupno: ${total.toFixed(2)} KM</strong>`;
    orderItemsContainer.appendChild(totalElement);
}

function validateOrder() {
    const selectedTable = getSelectedTableNumber();
    const hasItems = currentOrder.length > 0;
    
    if (placeOrderBtn) {
        placeOrderBtn.disabled = !selectedTable || !hasItems;
    }
    
    return selectedTable && hasItems;
}

function clearOrder() {
    currentOrder = [];
    renderCurrentOrder();
    
    // Reset table selection
    document.querySelectorAll('.table-box').forEach(box => {
        box.classList.remove('selected');
    });
    
    // Clear notes
    const orderNotes = document.getElementById('orderNotes');
    if (orderNotes) {
        orderNotes.value = '';
    }
    
    validateOrder();
    showToast('Narudžba je očišćena', 'info');
}

async function placeOrder() {
    if (!validateOrder()) return;
    
    const selectedTable = getSelectedTableNumber();
    if (!selectedTable) {
        showToast('Odaberite stol', 'error');
        return;
    }
    
    const tableNumber = selectedTable;
    const notes = document.getElementById('orderNotes').value;
    
    if (currentOrder.length === 0) {
        showToast('Dodajte artikle u narudžbu', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                table_number: tableNumber,
                items: currentOrder,
                notes: notes
            })
        });
        
        if (response.ok) {
            showToast('Narudžba uspješno poslana!', 'success');
            // Clear order after successful placement
            currentOrder = [];
            renderCurrentOrder();
            
            // Mark table as occupied
            // Ukloni occupiedTables, isTableOccupied, updateTableStatus
            
            // Reset table selection
            document.querySelectorAll('.table-box').forEach(box => {
                box.classList.remove('selected');
            });
            
            // Clear notes
            const orderNotes = document.getElementById('orderNotes');
            if (orderNotes) {
                orderNotes.value = '';
            }
            
            validateOrder();
            showToast('Narudžba je uspješno poslana!', 'success');
            loadMyOrders();
        } else {
            const errorData = await response.json();
            showToast(errorData.error || 'Greška pri slanju narudžbe', 'error');
        }
    } catch (error) {
        showToast('Greška pri slanju narudžbe', 'error');
    }
}

async function updateOrderItemStatus(orderId, itemId, status, reason = '') {
    try {
        const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status, reason })
        });
        
        if (response.ok) {
            showToast('Status stavke ažuriran', 'success');
            refreshOrders();
        } else {
            const errorData = await response.json();
            showToast(errorData.error || 'Greška pri ažuriranju', 'error');
        }
    } catch (error) {
        showToast('Greška pri ažuriranju statusa', 'error');
    }
}

// Utility functions
function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Čeka';
        case 'preparing': return 'Priprema se';
        case 'ready': return 'Spremno';
        case 'served': return 'Posluženo';
        case 'cancelled': return 'Otpisano';
        default: return status;
    }
}

function filterMenuItems() {
    const filter = document.querySelector('input[name="menuFilter"]:checked').id;
    
    let filteredItems = menuItems;
    
    if (filter === 'foodItems') {
        filteredItems = menuItems.filter(item => item.category === 'food');
    } else if (filter === 'drinkItems') {
        filteredItems = menuItems.filter(item => item.category === 'drink');
    }
    
    renderFilteredMenuItems(filteredItems);
}

function renderFilteredMenuItems(items) {
    menuItemsContainer.innerHTML = '';
    
    if (items.length === 0) {
        menuItemsContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h5>Nema rezultata</h5>
                    <p>Pokušajte s drugim filterom</p>
                </div>
            </div>
        `;
        return;
    }
    
    items.forEach(item => {
        const menuItemElement = createMenuItemElement(item);
        menuItemsContainer.appendChild(menuItemElement);
    });
}

function refreshOrders() {
    console.log('refreshOrders called for role:', currentUser.role);
    switch (currentUser.role) {
        case 'waiter':
            console.log('Loading waiter orders...');
            loadMyOrders();
            break;
        case 'cook':
            console.log('Loading cook orders...');
            loadCookOrders();
            break;
        case 'bartender':
            console.log('Loading bartender orders...');
            loadBartenderOrders();
            break;
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div class="toast" id="${toastId}" role="alert">
            <div class="toast-header">
                <i class="bi bi-${type === 'success' ? 'check-circle text-success' : type === 'error' ? 'exclamation-circle text-danger' : 'info-circle text-info'} me-2"></i>
                <strong class="me-auto">MenuAuto</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function loadInitialData() {
    // Load initial data based on user role
    switch (currentUser.role) {
        case 'waiter':
            // Load menu items first, then orders
            loadMenuItems().then(() => {
                loadMyOrders();
            });
            break;
        case 'cook':
            loadCookOrders();
            break;
        case 'bartender':
            loadBartenderOrders();
            break;
        case 'admin':
            loadAdminData();
            break;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Function to play notification sound
function playNotificationSound() {
    try {
        // Show visual indicator
        const soundIndicator = document.getElementById('soundIndicator');
        if (soundIndicator) {
            soundIndicator.classList.add('show');
            setTimeout(() => {
                soundIndicator.classList.remove('show');
            }, 500);
        }
        
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 30% volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5); // 0.5 seconds duration
        
    } catch (error) {
        console.log('Audio play failed:', error);
        // Fallback to HTML5 audio if Web Audio API fails
        if (beepSound) {
            beepSound.currentTime = 0;
            beepSound.volume = 0.5;
            beepSound.play().catch(e => console.log('Fallback audio failed:', e));
        }
    }
}

// Test function for notification sound (can be called from console)
function testNotificationSound() {
    console.log('Testing notification sound...');
    playNotificationSound();
}

// Admin dashboard functions
async function loadAdminDashboard() {
    try {
        // Load dashboard statistics
        const statsResponse = await fetch('/api/admin/dashboard', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const stats = await statsResponse.json();
        
        // Update statistics cards
        document.getElementById('totalRevenue').textContent = `${stats.totalRevenue.toFixed(2)} KM`;
        document.getElementById('totalOrders').textContent = stats.totalOrders;
        document.getElementById('activeWaiters').textContent = stats.activeWaiters;
        document.getElementById('lowStockItems').textContent = stats.lowStockItems;
        
        // Load charts
        await loadSalesTimeChart();
        await loadTopItemsChart();
        await loadStaffPerformance();
        
    } catch (error) {
        console.error('Load admin dashboard error:', error);
        showToast('Greška pri učitavanju admin dashboard-a', 'error');
    }
}

async function loadSalesTimeChart() {
    try {
        const response = await fetch('/api/admin/charts/sales-time', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const ctx = document.getElementById('salesTimeChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => `${item.hour}:00`),
                datasets: [{
                    label: 'Narudžbe',
                    data: data.map(item => item.orders),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Prihod (KM)',
                    data: data.map(item => item.revenue),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Load sales chart error:', error);
    }
}

async function loadTopItemsChart() {
    try {
        const response = await fetch('/api/admin/charts/top-items', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const ctx = document.getElementById('topItemsChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.total_quantity),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Load top items chart error:', error);
    }
}

async function loadStaffPerformance() {
    try {
        const response = await fetch('/api/admin/staff/performance', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        // Render staff statistics
        const staffStatsContainer = document.getElementById('staffStats');
        staffStatsContainer.innerHTML = data.map(staff => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6 class="card-title">${staff.name}</h6>
                    <p class="mb-1">Narudžbe: ${staff.total_orders}</p>
                    <p class="mb-1">Prihod: ${parseFloat(staff.total_revenue || 0).toFixed(2)} KM</p>
                    <p class="mb-0">Prosjek: ${parseFloat(staff.avg_order_value || 0).toFixed(2)} KM</p>
                </div>
            </div>
        `).join('');
        
        // Create staff performance chart
        const ctx = document.getElementById('staffPerformanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(staff => staff.name),
                datasets: [{
                    label: 'Prihod (KM)',
                    data: data.map(staff => staff.total_revenue || 0),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Load staff performance error:', error);
    }
}

// Inventory management functions
async function loadInventory() {
    try {
        const response = await fetch('/api/admin/inventory', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const inventory = await response.json();
        
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = inventory.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.received_quantity} ${item.unit}</td>
                <td>${item.used_quantity} ${item.unit}</td>
                <td>${item.remaining_quantity} ${item.unit}</td>
                <td>${item.min_quantity} ${item.unit}</td>
                <td>
                    <span class="badge bg-${item.status === 'low' ? 'danger' : 'success'}">
                        ${item.status === 'low' ? 'Nisko' : 'OK'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showUpdateInventoryModal(${item.id}, '${item.name}', ${item.min_quantity})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Load inventory error:', error);
        showToast('Greška pri učitavanju zaliha', 'error');
    }
}

function showAddItemModal() {
    const modal = new bootstrap.Modal(document.getElementById('addInventoryModal'));
    modal.show();
}

async function addInventoryItem() {
    try {
        const formData = {
            name: document.getElementById('inventoryName').value,
            category: document.getElementById('inventoryCategory').value,
            unit: document.getElementById('inventoryUnit').value,
            received_quantity: parseFloat(document.getElementById('inventoryReceived').value),
            min_quantity: parseFloat(document.getElementById('inventoryMinQuantity').value),
            price_per_unit: parseFloat(document.getElementById('inventoryPrice').value)
        };
        
        const response = await fetch('/api/admin/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast('Artikal uspješno dodan', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addInventoryModal')).hide();
            loadInventory();
            loadAdminDashboard(); // Refresh low stock count
        } else {
            showToast('Greška pri dodavanju artikla', 'error');
        }
        
    } catch (error) {
        console.error('Add inventory error:', error);
        showToast('Greška pri dodavanju artikla', 'error');
    }
}

function showUpdateInventoryModal(id, name, minQuantity) {
    document.getElementById('updateInventoryId').value = id;
    document.getElementById('updateInventoryName').textContent = name;
    document.getElementById('updateMinQuantity').value = minQuantity;
    
    const modal = new bootstrap.Modal(document.getElementById('updateInventoryModal'));
    modal.show();
}

async function updateInventoryItem() {
    try {
        const id = document.getElementById('updateInventoryId').value;
        const formData = {
            received_quantity: parseFloat(document.getElementById('updateReceived').value) || 0,
            used_quantity: parseFloat(document.getElementById('updateUsed').value) || 0,
            min_quantity: parseFloat(document.getElementById('updateMinQuantity').value)
        };
        
        const response = await fetch(`/api/admin/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast('Zalihe uspješno ažurirane', 'success');
            bootstrap.Modal.getInstance(document.getElementById('updateInventoryModal')).hide();
            loadInventory();
            loadAdminDashboard(); // Refresh low stock count
        } else {
            showToast('Greška pri ažuriranju zaliha', 'error');
        }
        
    } catch (error) {
        console.error('Update inventory error:', error);
        showToast('Greška pri ažuriranju zaliha', 'error');
    }
}

async function showLowStockModal() {
    try {
        const response = await fetch('/api/admin/inventory', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const inventory = await response.json();
        
        const lowStockItems = inventory.filter(item => item.status === 'low');
        
        const content = document.getElementById('lowStockContent');
        if (lowStockItems.length === 0) {
            content.innerHTML = '<p class="text-success">Nema artikala sa niskim zalihama!</p>';
        } else {
            content.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Artikal</th>
                                <th>Ostatak</th>
                                <th>Minimalna količina</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lowStockItems.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.remaining_quantity} ${item.unit}</td>
                                    <td>${item.min_quantity} ${item.unit}</td>
                                    <td><span class="badge bg-danger">Nisko</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('lowStockModal'));
        modal.show();
        
    } catch (error) {
        console.error('Show low stock modal error:', error);
        showToast('Greška pri učitavanju niskih zaliha', 'error');
    }
}

// Bar book functions
async function generateBarBook() {
    try {
        const date = document.getElementById('barBookDate').value || new Date().toISOString().split('T')[0];
        
        const response = await fetch(`/api/admin/bar-book/${date}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const content = document.getElementById('barBookContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Prodaja pića - ${date}</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Artikal</th>
                                    <th>Količina</th>
                                    <th>Cijena</th>
                                    <th>Ukupno</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.drinkSales.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.total_quantity}</td>
                                        <td>${parseFloat(item.price).toFixed(2)} KM</td>
                                        <td>${parseFloat(item.total_revenue).toFixed(2)} KM</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="fw-bold">Ukupan prihod: ${data.totalRevenue.toFixed(2)} KM</p>
                </div>
                <div class="col-md-6">
                    <h5>Troškovi zaliha</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Artikal</th>
                                    <th>Utrošeno</th>
                                    <th>Cijena/kom</th>
                                    <th>Ukupno</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.inventoryUsage.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.used_quantity} ${item.unit}</td>
                                        <td>${parseFloat(item.price_per_unit).toFixed(2)} KM</td>
                                        <td>${parseFloat(item.total_cost).toFixed(2)} KM</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="fw-bold">Ukupan trošak: ${data.totalCost.toFixed(2)} KM</p>
                    <p class="fw-bold text-success">Profit: ${(data.totalRevenue - data.totalCost).toFixed(2)} KM</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Generate bar book error:', error);
        showToast('Greška pri generiranju knjige šanka', 'error');
    }
}

// Report generation
async function generateReport() {
    try {
        const period = document.getElementById('reportPeriod').value;
        const waiter = document.getElementById('reportWaiter').value;
        
        // This would generate a comprehensive report
        showToast('Izvještaj se generira...', 'info');
        
        // For now, just show a placeholder
        const content = document.getElementById('reportsContent');
        content.innerHTML = `
            <div class="alert alert-info">
                <h5>Izvještaj za period: ${period}</h5>
                <p>Konobar: ${waiter || 'Svi konobari'}</p>
                <p>Ovde će biti detaljan izvještaj sa svim podacima...</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Generate report error:', error);
        showToast('Greška pri generiranju izvještaja', 'error');
    }
}

function setupMenuFilters() {
    // Category filter event listeners
    document.querySelectorAll('input[name="menuFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            filterAndRenderMenu();
        });
    });

    // Search input event listener
    const searchInput = document.getElementById('menuSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            filterAndRenderMenu();
        });
    }
}

function filterAndRenderMenu() {
    let filteredItems = allMenuItems;

    // Apply category filter
    if (currentFilter !== 'all') {
        filteredItems = filteredItems.filter(item => {
            switch (currentFilter) {
                case 'hot-drinks':
                    return item.category === 'drink' && item.subcategory === 'kafa';
                case 'cold-drinks':
                    return item.category === 'drink' && ['sok', 'limunada', 'cola'].includes(item.subcategory);
                case 'alcoholic':
                    return item.category === 'drink' && ['pivo', 'vino', 'rakija'].includes(item.subcategory);
                case 'food':
                    return item.category === 'food';
                default:
                    return true;
            }
        });
    }

    // Apply search filter
    if (currentSearch) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(currentSearch) ||
            item.description.toLowerCase().includes(currentSearch)
        );
    }

    renderMenuItems(filteredItems);
}

function renderMenuItems(items) {
    const container = document.getElementById('menuContainer');
    if (!container) return;

    container.innerHTML = items.map(item => createMenuItemElement(item)).join('');
}

function createMenuItemElement(item) {
    const categoryClass = getCategoryClass(item);
    const categoryText = getCategoryText(item);
    const imageUrl = getItemImage(item);

    return `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="menu-item-card" onclick="addToOrder(${item.id})">
                <img src="${imageUrl}" alt="${item.name}" class="menu-item-image" onerror="this.src='https://via.placeholder.com/300x200/f8f9fa/6c757d?text=${encodeURIComponent(item.name)}'">
                <div class="menu-item-content">
                    <span class="menu-item-category ${categoryClass}">${categoryText}</span>
                    <h6 class="menu-item-title">${item.name}</h6>
                    <p class="menu-item-description">${item.description || 'Nema opisa'}</p>
                    <div class="menu-item-price">${parseFloat(item.price).toFixed(2)} KM</div>
                    <button class="btn btn-primary add-to-order-btn">
                        <i class="bi bi-plus-circle me-2"></i>Dodaj u narudžbu
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getCategoryClass(item) {
    if (item.category === 'food') return 'food';
    if (item.category === 'drink') {
        if (item.subcategory === 'kafa') return 'hot-drinks';
        if (['pivo', 'vino', 'rakija'].includes(item.subcategory)) return 'alcoholic';
        return 'cold-drinks';
    }
    return 'food';
}

function getCategoryText(item) {
    if (item.category === 'food') return 'Hrana';
    if (item.category === 'drink') {
        if (item.subcategory === 'kafa') return 'Toplo piće';
        if (['pivo', 'vino', 'rakija'].includes(item.subcategory)) return 'Alkoholno';
        return 'Hladno piće';
    }
    return 'Hrana';
}

function getItemImage(item) {
        // Map items to specific food/drink images using Unsplash (free, high quality)
        const imageMap = {
            // Hot Drinks
            'espresso': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=200&fit=crop',
            'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=200&fit=crop',
            'topla čokolada': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=300&h=200&fit=crop',
            
            // Cold Drinks
            'coca cola': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=200&fit=crop',
            'limunada': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&h=200&fit=crop',
            'sok od pomorandže': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=200&fit=crop',
            'voda': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=200&fit=crop',
            
            // Alcoholic Drinks
            'pivo': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=200&fit=crop',
            'vino': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=200&fit=crop',
            'whiskey': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=200&fit=crop',
            
            // Food - Pizza
            'pizza margherita': 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=300&h=200&fit=crop',
            'pizza capricciosa': 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=300&h=200&fit=crop',
            
            // Food - Burgers
            'classic burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
            'cheese burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
            
            // Food - Pasta
            'spaghetti bolognese': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&h=200&fit=crop',
            'pasta carbonara': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&h=200&fit=crop',
            
            // Food - Salads
            'cezar salata': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=200&fit=crop',
            'grčka salata': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=200&fit=crop',
            
            // Food - Main Dishes
            'pileći kotlet': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
            'steak': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop',
            
            // Food - Desserts
            'tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop',
            'čokoladna torta': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop'
        };

        // Try to find specific image for exact item name first
        const itemName = item.name.toLowerCase();
        
        // Check for exact matches first
        if (imageMap[itemName]) {
            return imageMap[itemName];
        }
        
        // Check for partial matches
        for (const [key, url] of Object.entries(imageMap)) {
            if (itemName.includes(key) || key.includes(itemName)) {
                return url;
            }
        }
        
        // Fallback to subcategory-based images
        const subcategoryMap = {
            'kafa': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=200&fit=crop',
            'sok': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=200&fit=crop',
            'limunada': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&h=200&fit=crop',
            'gazirano': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=200&fit=crop',
            'voda': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=200&fit=crop',
            'alkohol': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=200&fit=crop',
            'pizza': 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=300&h=200&fit=crop',
            'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
            'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&h=200&fit=crop',
            'salata': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=200&fit=crop',
            'glavno_jelo': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&h=200&fit=crop',
            'desert': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop'
        };
        
        if (subcategoryMap[item.subcategory]) {
            return subcategoryMap[item.subcategory];
        }

        // Default images based on category
        if (item.category === 'food') {
            return 'https://images.unsplash.com/photo-1504674900244-1b47f22f8f54?w=300&h=200&fit=crop';
        } else {
            return 'https://images.unsplash.com/photo-1546173159-315724a31696?w=300&h=200&fit=crop';
        }
    }