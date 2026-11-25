// Обработка ошибок runtime
if (typeof chrome !== 'undefined' && chrome.runtime) {
    const originalSendMessage = chrome.runtime.sendMessage;
    if (originalSendMessage) {
        chrome.runtime.sendMessage = function(...args) {
            try {
                return originalSendMessage.apply(this, args);
            } catch (e) {
                // Игнорируем ошибки закрытых портов
                if (e.message && e.message.includes('port closed')) {
                    return;
                }
                throw e;
            }
        };
    }
}

// Подавление ошибок runtime.lastError
window.addEventListener('error', function(e) {
    if (e.message && (
        e.message.includes('runtime.lastError') ||
        e.message.includes('message port closed') ||
        e.message.includes('Extension context invalidated')
    )) {
        e.preventDefault();
        return false;
    }
});

// Data for exercise complexes
const complexesData = {
    I: {
        months: [
            { imageNumber: 1 },
            { imageNumber: 2 },
            { imageNumber: 3 },
            { imageNumber: 4 },
            { imageNumber: 5 },
            { imageNumber: 6 },
            { imageNumber: 7 },
            { imageNumber: 8 },
            { imageNumber: 9 },
            { imageNumber: 10 },
            { imageNumber: 11 },
            { imageNumber: 12 }
        ]
    },
    II: {
        months: [
            { imageNumber: 1 },
            { imageNumber: 2 },
            { imageNumber: 3 },
            { imageNumber: 4 },
            { imageNumber: 5 },
            { imageNumber: 6 },
            { imageNumber: 7 },
            { imageNumber: 8 },
            { imageNumber: 9 },
            { imageNumber: 10 },
            { imageNumber: 11 },
            { imageNumber: 12 }
        ]
    },
    III: {
        "Заболевание опорно-двигательного аппарата": {
            months: [
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 },
                { imageNumber: 3 }
            ]
        },
        "Заболевание сердечно-сосудистой системы": {
            months: [
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 },
                { imageNumber: 13 }
            ]
        },
        "Заболевание зрительного аппарата": {
            months: [
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 },
                { imageNumber: 23 }
            ]
        }
    }
};

// Function to get current month (0-11)
function getCurrentMonth() {
    return new Date().getMonth();
}

// Function to display complexes
function displayComplexes(group) {
    const container = document.getElementById('complex-container');
    container.innerHTML = ''; // Clear previous content
    container.style.display = 'block'; // Show the container

    const monthIndex = getCurrentMonth();

    if (group === 'II') {
        const complex = complexesData.II.months[monthIndex];
        const imageNumber = complex.imageNumber;
        const ext = imageNumber === 1 ? 'gif' : 'jpg';
        const complexDiv = document.createElement('div');
        complexDiv.innerHTML = `
            <img src="sep/${imageNumber}.${ext}" alt="Image ${imageNumber}" style="max-width:100%; height:auto; margin-bottom:10px;">
        `;
        container.appendChild(complexDiv);
    } else if (group === 'III') {
        for (const category in complexesData.III) {
            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<h3>${category}</h3>`;
            const complex = complexesData.III[category].months[monthIndex];
            const imageNumber = complex.imageNumber;
            const ext = imageNumber === 1 ? 'gif' : 'jpg';
            categoryDiv.innerHTML += `
                <img src="sep/${imageNumber}.${ext}" alt="Image ${imageNumber}" style="max-width:100%; height:auto; margin-bottom:10px;">
            `;
            container.appendChild(categoryDiv);
        }
    }
}

// Handle search input with Fuse.js
let searchInput = null;
let complexContainer = null;

// Инициализация после загрузки DOM
function initSearchInput() {
    searchInput = document.querySelector('.search-input');
    complexContainer = document.getElementById('complex-container');
    
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }
    
    // Удаляем старый обработчик, если он есть (чтобы избежать дублирования)
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    
    // List of searchable terms
    const searchTerms = ['группа здоровья'];
    
    // Fuse options
    const fuseOptions = {
        includeScore: true,
        threshold: 0.4, // Adjust for fuzziness (lower = stricter)
        keys: []
    };
    
    // Create Fuse instance
    const fuse = new Fuse(searchTerms, fuseOptions);
    
    searchInput.addEventListener('input', function(e) {
        const query = this.value.trim();
        console.log('Input event triggered, query:', query);
        
        // Автоматическое определение группы по цифрам 1, 2, 3
        if (query === '1' || query.toLowerCase() === 'i' || query.toLowerCase() === 'первая') {
            console.log('Detected 1, selecting I group');
            setTimeout(() => {
                autoSelectGroup('I');
            }, 100);
            return;
        }
        
        if (query === '2' || query === 'II' || query.toLowerCase() === 'ii' || query.toLowerCase() === 'вторая') {
            console.log('Detected 2 or II, selecting II group');
            setTimeout(() => {
                autoSelectGroup('II');
            }, 100);
            return;
        }
        
        if (query === '3' || query === 'III' || query.toLowerCase() === 'iii' || query.toLowerCase() === 'третья') {
            console.log('Detected 3 or III, selecting III group');
            setTimeout(() => {
                autoSelectGroup('III');
            }, 100);
            return;
        }
        
        // Обычный поиск
        if (query && query.length > 0) {
            const results = fuse.search(query);
            if (results.length > 0) {
                showGroupDropdown();
            } else {
                hideGroupDropdown();
                if (complexContainer) {
                    complexContainer.innerHTML = '';
                }
            }
        } else {
            hideGroupDropdown();
            if (complexContainer) {
                complexContainer.innerHTML = '';
            }
        }
    });
    
    // Reset search functionality on focus
    searchInput.addEventListener('focus', function() {
        // Allow search to work again
    });
}

// Инициализируем при загрузке DOM
function initializeSearch() {
    // Пробуем инициализировать сразу
    initSearchInput();
    
    // Если не получилось, пробуем через небольшую задержку
    setTimeout(() => {
        if (!document.querySelector('.search-input')) {
            initSearchInput();
        }
    }, 500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
    initializeSearch();
}

function autoSelectGroup(group) {
    console.log('autoSelectGroup called with group:', group);
    
    // Получаем элементы
    const input = document.querySelector('.search-input');
    const container = document.getElementById('complex-container');
    
    if (!input) {
        console.error('Search input not found in autoSelectGroup');
        return;
    }
    
    console.log('Input found, setting value for group:', group);
    
    // Скрываем выпадающий список
    hideGroupDropdown();
    
    // Устанавливаем значение в поле ввода
    if (group === 'I') {
        input.value = 'I - Первая группа здоровья';
        console.log('Set input value to I group');
    } else if (group === 'II') {
        input.value = 'II - Вторая группа здоровья';
        console.log('Set input value to II group');
    } else if (group === 'III') {
        input.value = 'III - Третья группа здоровья';
        console.log('Set input value to III group');
    }
    
    // Автоматически отображаем комплекс для выбранной группы
    if (group === 'I' || group === 'II' || group === 'III') {
        try {
            console.log('Calling displayComplexes with group:', group);
            displayComplexes(group);
            console.log('displayComplexes completed');
        } catch (error) {
            console.error('Error in displayComplexes:', error);
        }
    }
    
    // Сохраняем в базу данных, если пользователь авторизован
    const auth = window.firebaseAuth;
    if (auth && auth.currentUser) {
        saveHealthGroup(auth.currentUser.uid, group).catch(err => {
            console.error('Error saving:', err);
        });
    }
}

function hideGroupDropdown() {
    const dropdown = document.querySelector('.search-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

function showGroupDropdownForNumber(number) {
    if (!searchInput) {
        searchInput = document.querySelector('.search-input');
    }
    
    if (!searchInput) {
        return;
    }
    
    let dropdown = document.querySelector('.search-dropdown');
    
    // Определяем какие группы показывать в зависимости от цифры
    let groupsToShow = [];
    if (number === '1') {
        groupsToShow = [
            { value: 'I', label: 'I - Первая группа здоровья' }
        ];
    } else if (number === '2') {
        groupsToShow = [
            { value: 'II', label: 'II - Вторая группа здоровья' }
        ];
    } else if (number === '3') {
        groupsToShow = [
            { value: 'III', label: 'III - Третья группа здоровья' }
        ];
    }
    
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        searchInput.parentNode.appendChild(dropdown);
    }
    
    // Обновляем содержимое выпадающего списка
    dropdown.innerHTML = groupsToShow.map(g => 
        `<a href="#" class="group-option" data-group="${g.value}">${g.label}</a>`
    ).join('');
    
    dropdown.classList.add('show');
}

function showGroupDropdown() {
    if (!searchInput) {
        searchInput = document.querySelector('.search-input');
    }
    
    if (!searchInput) {
        return;
    }
    
    let dropdown = document.querySelector('.search-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        dropdown.innerHTML = `
            <a href="#" class="group-option" data-group="I">I - Первая группа здоровья</a>
            <a href="#" class="group-option" data-group="II">II - Вторая группа здоровья</a>
            <a href="#" class="group-option" data-group="III">III - Третья группа здоровья</a>
        `;
        searchInput.parentNode.appendChild(dropdown);
    }
    dropdown.classList.add('show');
}

// Database functions
async function saveUserToDatabase(userId, email) {
    try {
        const db = window.firebaseDb;
        const userRef = window.firestoreDoc(db, 'users', userId);
        const userSnap = await window.firestoreGetDoc(userRef);
        
        if (!userSnap.exists()) {
            // Создаем новый документ пользователя
            await window.firestoreSetDoc(userRef, {
                email: email,
                createdAt: window.firestoreServerTimestamp(),
                lastLogin: window.firestoreServerTimestamp(),
                healthGroup: null
            });
            console.log('User data saved to database');
        } else {
            // Обновляем только lastLogin для существующего пользователя
            await window.firestoreUpdateDoc(userRef, {
                lastLogin: window.firestoreServerTimestamp()
            });
            console.log('User last login updated');
        }
    } catch (error) {
        console.error('Error saving user to database:', error);
    }
}

async function getUserData(userId) {
    try {
        const db = window.firebaseDb;
        const userRef = window.firestoreDoc(db, 'users', userId);
        const userSnap = await window.firestoreGetDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

async function saveHealthGroup(userId, healthGroup) {
    try {
        const db = window.firebaseDb;
        const userRef = window.firestoreDoc(db, 'users', userId);
        
        // Проверяем текущую группу здоровья, чтобы не делать лишних обновлений
        const currentData = await getUserData(userId);
        if (currentData && currentData.healthGroup === healthGroup) {
            console.log('Health group already saved:', healthGroup);
            return true;
        }
        
        await window.firestoreUpdateDoc(userRef, {
            healthGroup: healthGroup,
            healthGroupUpdatedAt: window.firestoreServerTimestamp()
        });
        console.log('Health group saved:', healthGroup);
        return true;
    } catch (error) {
        console.error('Error saving health group:', error);
        // Если документ не существует, создаем его
        if (error.code === 'not-found' || error.message.includes('No document')) {
            try {
                const db = window.firebaseDb;
                const userRef = window.firestoreDoc(db, 'users', userId);
                await window.firestoreSetDoc(userRef, {
                    healthGroup: healthGroup,
                    healthGroupUpdatedAt: window.firestoreServerTimestamp()
                });
                console.log('Health group saved (new document):', healthGroup);
                return true;
            } catch (setError) {
                console.error('Error creating document for health group:', setError);
                return false;
            }
        }
        return false;
    }
}

async function loadUserHealthGroup(userId) {
    try {
        const userData = await getUserData(userId);
        if (userData && userData.healthGroup) {
            return userData.healthGroup;
        }
        return null;
    } catch (error) {
        console.error('Error loading health group:', error);
        return null;
    }
}

// Authentication functions
document.addEventListener('DOMContentLoaded', function() {
    const auth = window.firebaseAuth;
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const searchContainer = document.querySelector('.search-container');
    const complexContainer = document.getElementById('complex-container');

    // Show login form
    document.getElementById('show-login').addEventListener('click', function() {
        registerForm.style.opacity = '0';
        registerForm.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            loginForm.style.opacity = '0';
            loginForm.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                loginForm.style.opacity = '1';
                loginForm.style.transform = 'translateY(0)';
            }, 10);
        }, 200);
        // Очищаем поля при переключении
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
    });

    // Show register form
    document.getElementById('show-register').addEventListener('click', function() {
        loginForm.style.opacity = '0';
        loginForm.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            registerForm.style.opacity = '0';
            registerForm.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                registerForm.style.opacity = '1';
                registerForm.style.transform = 'translateY(0)';
            }, 10);
        }, 200);
        // Очищаем поля при переключении
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', function() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        // Проверка на пустые поля
        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        window.signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                console.log('Logged in:', userCredential.user);
                const user = userCredential.user;
                
                // Сохраняем/обновляем данные пользователя в базе данных
                await saveUserToDatabase(user.uid, user.email);
                
                // Загружаем сохраненную группу здоровья
                const savedHealthGroup = await loadUserHealthGroup(user.uid);
                const searchInput = document.querySelector('.search-input');
                
                if (savedHealthGroup) {
                    // Автоматически отображаем сохраненную группу здоровья
                    displayComplexes(savedHealthGroup);
                    if (searchInput) {
                        if (savedHealthGroup === 'I') {
                        searchInput.value = 'I - Первая группа здоровья';
                    } else if (savedHealthGroup === 'II') {
                        searchInput.value = 'II - Вторая группа здоровья';
                    } else if (savedHealthGroup === 'III') {
                        searchInput.value = 'III - Третья группа здоровья';
                    }
                    }
                }
                
                loginForm.style.display = 'none';
                logoutBtn.style.display = 'block';
                searchContainer.style.display = 'block';
                // Изменяем placeholder после входа
                if (searchInput) {
                    searchInput.placeholder = 'Введите группу здоровья';
                }
                // Переинициализируем обработчик поиска после авторизации
                setTimeout(() => {
                    initSearchInput();
                }, 100);
            })
            .catch((error) => {
                console.error('Login error:', error);
                let errorMessage = 'Ошибка входа: ';
                // Улучшенная обработка ошибок
                if (error.code === 'auth/invalid-email') {
                    errorMessage += 'Неверный формат email';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage += 'Пользователь не найден';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage += 'Неверный пароль';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage += 'Слишком много попыток. Попробуйте позже';
                } else {
                    errorMessage += error.message;
                }
                alert(errorMessage);
            });
    });

    // Register
    document.getElementById('register-btn').addEventListener('click', function() {
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        
        // Проверка на пустые поля
        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        // Проверка минимальной длины пароля
        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        window.createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                console.log('Registered:', userCredential.user);
                const user = userCredential.user;
                
                // Сохраняем данные нового пользователя в базе данных
                await saveUserToDatabase(user.uid, user.email);
                
                registerForm.style.display = 'none';
                logoutBtn.style.display = 'block';
                searchContainer.style.display = 'block';
                // Изменяем placeholder после регистрации
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.placeholder = 'Введите группу здоровья';
                }
                // Переинициализируем обработчик поиска после регистрации
                setTimeout(() => {
                    initSearchInput();
                }, 100);
            })
            .catch((error) => {
                console.error('Register error:', error);
                let errorMessage = 'Ошибка регистрации: ';
                // Улучшенная обработка ошибок
                if (error.code === 'auth/invalid-email') {
                    errorMessage += 'Неверный формат email';
                } else if (error.code === 'auth/email-already-in-use') {
                    errorMessage += 'Этот email уже используется';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage += 'Пароль слишком слабый';
                } else {
                    errorMessage += error.message;
                }
                alert(errorMessage);
            });
    });

    // Logout
    logoutBtn.addEventListener('click', function() {
        window.signOut(auth).then(() => {
            console.log('Logged out');
            logoutBtn.style.display = 'none';
            searchContainer.style.display = 'none';
            complexContainer.innerHTML = '';
            loginForm.style.display = 'block';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    });

    // Auth state observer
    window.onAuthStateChanged(auth, async (user) => {
        const blurOverlay = document.querySelector('.blur-overlay');
        const searchInput = document.querySelector('.search-input');
        if (user) {
            blurOverlay.classList.add('hidden');
            logoutBtn.style.display = 'block';
            searchContainer.style.display = 'block';
            // Изменяем placeholder после успешной авторизации
            if (searchInput) {
                searchInput.placeholder = 'Введите группу здоровья';
            }
            
            // Переинициализируем обработчик поиска
            setTimeout(() => {
                initSearchInput();
            }, 200);
            
            // Загружаем сохраненную группу здоровья при проверке состояния авторизации
            const savedHealthGroup = await loadUserHealthGroup(user.uid);
            if (savedHealthGroup) {
                displayComplexes(savedHealthGroup);
                if (searchInput) {
                    if (savedHealthGroup === 'I') {
                        searchInput.value = 'I - Первая группа здоровья';
                    } else if (savedHealthGroup === 'II') {
                        searchInput.value = 'II - Вторая группа здоровья';
                    } else if (savedHealthGroup === 'III') {
                        searchInput.value = 'III - Третья группа здоровья';
                    }
                }
            }
        } else {
            blurOverlay.classList.remove('hidden');
            logoutBtn.style.display = 'none';
            searchContainer.style.display = 'none';
            complexContainer.innerHTML = '';
            // Возвращаем исходный placeholder
            if (searchInput) {
                searchInput.placeholder = 'Введите запрос...';
                searchInput.value = '';
            }
        }
    });
});

// Event listeners for group selection
document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('group-option')) {
        e.preventDefault();
        const group = e.target.getAttribute('data-group');
        displayComplexes(group);
        hideGroupDropdown();
        searchInput.value = '';
        
        // Сохраняем выбранную группу здоровья в базу данных
        const auth = window.firebaseAuth;
        if (auth && auth.currentUser) {
            const success = await saveHealthGroup(auth.currentUser.uid, group);
            if (success) {
                console.log('Health group saved to database:', group);
            }
        }
    } else if (!searchInput.contains(e.target)) {
        hideGroupDropdown();
    }
});




