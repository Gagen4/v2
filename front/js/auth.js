/**
 * Модуль аутентификации
 */

let currentUser = null;

/**
 * Инициализация формы аутентификации
 */
function initAuth() {
    setupAuthListeners();
    checkAuthStatus();
}

/**
 * Настройка обработчиков событий для формы аутентификации
 */
function setupAuthListeners() {
    const authSubmit = document.getElementById('auth-submit');
    const switchAuth = document.getElementById('switch-auth');
    const logoutBtn = document.getElementById('logout-btn');
    let isLoginMode = true;

    switchAuth.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.querySelector('.auth-form h2').textContent = isLoginMode ? 'Вход' : 'Регистрация';
        authSubmit.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        switchAuth.textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти';
        hideError();
    });

    authSubmit.addEventListener('click', async () => {
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('Заполните все поля');
            return;
        }

        try {
            if (isLoginMode) {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (error) {
            showError(error.message);
        }
    });

    logoutBtn.addEventListener('click', logout);
}

/**
 * Показать сообщение об ошибке
 */
function showError(message) {
    const errorDiv = document.querySelector('.auth-form .error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

/**
 * Скрыть сообщение об ошибке
 */
function hideError() {
    const errorDiv = document.querySelector('.auth-form .error');
    errorDiv.style.display = 'none';
}

/**
 * Регистрация нового пользователя
 */
async function register(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Заполните все поля');
        }
        if (!isValidEmail(email)) {
            throw new Error('Некорректный формат email');
        }
        // Проверка существования email (заглушка)
        const emailExists = await checkEmailExistence(email);
        if (!emailExists) {
            throw new Error('Этот email не существует или недоступен');
        }
        console.log('Отправка запроса на регистрацию с данными:', { email, password });
        const response = await fetch('http://127.0.0.1:3000/register', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
        });

        console.log('Ответ сервера на запрос регистрации:', response.status, response.statusText);
        const data = await response.json();
        console.log('Данные ответа сервера:', data);
        if (!response.ok) {
            if (response.status === 400 && data.error === 'Пользователь уже существует') {
                throw new Error('Этот email уже зарегистрирован');
            }
            throw new Error(data.error || 'Ошибка регистрации');
        }

        // Проверяем куки после регистрации
        console.log('Куки после регистрации:', document.cookie);
        
        // Verify authentication after registration
        const verifyResponse = await fetch('http://127.0.0.1:3000/files', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Ответ на проверку аутентификации после регистрации:', verifyResponse.status, verifyResponse.statusText);
        if (!verifyResponse.ok) {
            throw new Error('Ошибка аутентификации после регистрации');
        }

        currentUser = { email };
        updateAuthUI();
        dispatchAuthSuccess();
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        throw error;
    }
}

/**
 * Проверка существования email
 * Использует endpoint на сервере для проверки через API QuickEmailVerification
 */
async function checkEmailExistence(email) {
    try {
        console.log('Проверка существования email через серверный endpoint:', email);
        const response = await fetch(`http://127.0.0.1:3000/verify-email?email=${encodeURIComponent(email)}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        console.log('Результат проверки email:', result);
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка проверки email через сервер');
        }
        return result.exists;
    } catch (error) {
        console.error('Ошибка при проверке email через серверный endpoint:', error);
        throw new Error('Этот email не может быть проверен. Проблема с сервисом проверки.');
    }
}

/**
 * Вход пользователя
 */
async function login(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Заполните все поля');
        }
        if (!isValidEmail(email)) {
            throw new Error('Некорректный формат email');
        }
        const response = await fetch('http://127.0.0.1:3000/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        // Проверяем наличие cookie после входа
        const cookies = document.cookie;
        console.log('Cookies после входа:', cookies);

        if (!response.ok) {
            if (response.status === 401) {
                currentUser = null;
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                throw new Error('Email не зарегистрирован или пароль неверный');
            }
            throw new Error(data.error || 'Ошибка входа');
        }

        // Сразу устанавливаем currentUser
        currentUser = { email };
        updateAuthUI();
        dispatchAuthSuccess();

        // Проверяем аутентификацию после установки UI
        try {
            const verifyResponse = await fetch('http://127.0.0.1:3000/files', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('Ответ на проверку аутентификации после входа:', verifyResponse.status, verifyResponse.statusText);
            if (!verifyResponse.ok) {
                throw new Error('Ошибка аутентификации после входа');
            }
        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
            // Не выбрасываем ошибку, так как вход уже выполнен
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        throw error;
    }
}

/**
 * Выход пользователя
 */
async function logout() {
    try {
        console.log('Выполняется выход из системы...');
        const response = await fetch('http://127.0.0.1:3000/logout', {
            method: 'POST',
            credentials: 'include',
        });
        console.log('Ответ сервера на запрос выхода:', response.status, response.statusText);
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }

    console.log('Очистка текущего пользователя и обновление UI...');
    currentUser = null;
    updateAuthUI();
    console.log('Удаление токена из куки...');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('Перезагрузка страницы после выхода...');
    window.location.reload();
}

/**
 * Проверка статуса аутентификации при загрузке
 */
async function checkAuthStatus() {
    try {
        console.log('Проверка статуса аутентификации...');
        console.log('Текущие cookies:', document.cookie);
        
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        console.log('Найден токен:', token);
        
        if (token) {
            const email = decodeToken(token.split('=')[1]);
            console.log('Декодированное имя пользователя:', email);
            
            if (email) {
                // Получаем информацию о пользователе с сервера
                const response = await fetch('http://127.0.0.1:3000/user/info', {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    currentUser = {
                        email: userData.email,
                        isAdmin: userData.isAdmin
                    };
                    updateAuthUI();
                    dispatchAuthSuccess();
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        return false;
    }
}

/**
 * Декодирование JWT токена
 */
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        return payload.email;
    } catch (error) {
        return null;
    }
}

/**
 * Обновление UI в зависимости от состояния аутентификации
 */
function updateAuthUI() {
    console.log('Обновление UI, currentUser:', currentUser);
    const authContainer = document.getElementById('auth-container');
    const mapContainer = document.getElementById('map-container');
    const userInfo = document.querySelector('.user-info');
    const usernameDisplay = document.getElementById('username-display');
    const adminFilePanel = document.getElementById('admin-file-panel');
    const adminRolePanel = document.getElementById('admin-role-panel');

    if (currentUser) {
        console.log('Показываем интерфейс для авторизованного пользователя');
        authContainer.style.display = 'none';
        mapContainer.style.display = 'block';
        userInfo.style.display = 'block';
        usernameDisplay.textContent = currentUser.email + (currentUser.isAdmin ? ' (Admin)' : '');
        
        // Показываем или скрываем админ-панели
        if (adminFilePanel && adminRolePanel) {
            adminFilePanel.style.display = currentUser.isAdmin ? 'block' : 'none';
            adminRolePanel.style.display = currentUser.isAdmin ? 'block' : 'none';
            if (currentUser.isAdmin) {
                loadUserList();
            }
        }
    } else {
        console.log('Показываем форму входа');
        authContainer.style.display = 'flex';
        mapContainer.style.display = 'none';
        userInfo.style.display = 'none';
        if (adminFilePanel && adminRolePanel) {
            adminFilePanel.style.display = 'none';
            adminRolePanel.style.display = 'none';
        }
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

/**
 * Отправка события успешной аутентификации
 */
function dispatchAuthSuccess() {
    const event = new Event('authSuccess');
    document.dispatchEvent(event);
}

/**
 * Проверка аутентификации пользователя
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Получение текущего пользователя
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Проверка формата email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Обновление роли пользователя
 */
async function updateUserRole() {
    const email = document.getElementById('role-email').value;
    const role = document.getElementById('role-select').value;
    
    if (!email || !role) {
        alert('Введите email и выберите роль');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/admin/set-role?email=${encodeURIComponent(email)}&role=${role}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка обновления роли');
        }

        alert(result.message);
        loadUserList();
    } catch (error) {
        console.error('Ошибка при обновлении роли:', error);
        alert('Ошибка: ' + error.message);
    }
}

/**
 * Загрузка списка пользователей для админ-панели
 */
async function loadUserList() {
    try {
        const response = await fetch('http://127.0.0.1:3000/admin/files', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        const files = await response.json();
        if (!response.ok) {
            throw new Error(files.error || 'Ошибка получения списка пользователей');
        }

        const userList = document.getElementById('user-list');
        userList.innerHTML = '<h4>Файлы пользователей:</h4>';
        const users = {};
        files.forEach(file => {
            if (!users[file.email]) {
                users[file.email] = [];
            }
            users[file.email].push(file.fileName);
        });

        for (const [email, userFiles] of Object.entries(users)) {
            const userDiv = document.createElement('div');
            userDiv.innerHTML = `<strong>${email}</strong>: ${userFiles.join(', ')}`;
            userList.appendChild(userDiv);
        }
        
        // Заполняем выпадающее меню email пользователей из нового endpoint
        const usersResponse = await fetch('http://127.0.0.1:3000/admin/users', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const allUsers = await usersResponse.json();
        if (usersResponse.ok) {
            const emailSelect = document.getElementById('role-email');
            emailSelect.innerHTML = '<option value="">Выберите пользователя...</option>';
            allUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.email;
                option.textContent = `${user.email} (${user.role})`;
                emailSelect.appendChild(option);
            });
        }
        
        // Добавляем проверку пользователей без email
        const checkResponse = await fetch('http://127.0.0.1:3000/admin/check-users-without-email', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const checkResult = await checkResponse.json();
        if (checkResponse.ok) {
            const noEmailDiv = document.createElement('div');
            noEmailDiv.innerHTML = `<br><strong>Пользователей без email:</strong> ${checkResult.count}`;
            userList.appendChild(noEmailDiv);
            
            if (checkResult.count > 0) {
                checkResult.users.forEach(user => {
                    const userNoEmailDiv = document.createElement('div');
                    userNoEmailDiv.innerHTML = `ID: ${user.id}, Username: ${user.username || 'не указан'}`;
                    userList.appendChild(userNoEmailDiv);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка пользователей:', error);
    }
}

export { initAuth, isAuthenticated, getCurrentUser }; 