/**
 * Управляет обновлением интерфейса (кнопки, текст подсказок, координаты).
 * @module ui
 */
import { state } from './mapInit.js';
import { exportToGeoJSON, importFromGeoJSON } from './drawing.js';
import { isAuthenticated, getCurrentUser } from './auth.js';

/**
 * Обновляет состояние кнопок инструментов.
 * @param {MapState} state - Глобальное состояние.
 */
function updateToolButtons(state) {
  console.log('Обновление кнопок, currentTool:', state.currentTool);
  document.querySelectorAll('.tools button').forEach((btn) => {
    btn.classList.remove('active');
  });

  if (state.currentTool) {
    const btnId = state.currentTool === 'delete' ? 'delete-object' : `add-${state.currentTool}`;
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.add('active');
    } else {
      console.warn(`Кнопка с ID ${btnId} не найдена`);
      document.getElementById('error-message').textContent = `Кнопка ${btnId} не найдена`;
    }
  }
}

/**
 * Отображает текст подсказки или ошибки.
 * @param {string} message - Сообщение для отображения.
 */
function showHelp(message) {
  const help = document.getElementById('help-text');
  const error = document.getElementById('error-message');
  if (help) help.textContent = message;
  if (error) error.textContent = message.startsWith('Ошибка') ? message : '';
}

/**
 * Обновляет отображение координат
 */
function updateCoordinates(lat, lng) {
    const latElement = document.getElementById('lat');
    const lngElement = document.getElementById('lng');
    if (latElement && lngElement) {
        latElement.textContent = lat.toFixed(6);
        lngElement.textContent = lng.toFixed(6);
    } else {
        console.warn('Элементы координат (#lat, #lng) не найдены');
        document.getElementById('error-message').textContent = 'Элементы координат не найдены';
    }
}

/**
 * Инициализирует отображение координат с дебаунсингом.
 */
function initCoordinates() {
    if (!state.map) {
        console.error('Карта не инициализирована для обновления координат');
        document.getElementById('error-message').textContent = 'Карта не инициализирована';
        return;
    }

    let timeout;
    state.map.on('mousemove', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            updateCoordinates(e.latlng.lat, e.latlng.lng);
        }, 50);
    });
}

/**
 * Очищает все объекты на карте
 */
function clearAllFeatures() {
    if (state.drawnItems) {
        state.drawnItems.clearLayers();
        showHelp('Все объекты очищены');
    } else {
        showHelp('Ошибка: Слой для объектов не инициализирован');
    }
}

/**
 * Обновляет список файлов
 */
async function updateFileList() {
    if (!isAuthenticated()) {
        console.log('Пользователь не авторизован');
        return;
    }

    try {
        console.log('Запрос списка файлов...');
        console.log('Текущие cookies:', document.cookie);
        
        // Сначала проверяем, является ли пользователь администратором
        const userResponse = await fetch('http://127.0.0.1:3000/user/info', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!userResponse.ok) {
            console.error('Ошибка получения информации о пользователе:', userResponse.status, userResponse.statusText);
            const errorText = await userResponse.text();
            console.error('Текст ошибки:', errorText);
            throw new Error('Ошибка получения информации о пользователе');
        }
        
        const user = await userResponse.json();
        console.log('Информация о пользователе:', user);
        let files = [];

        if (user.isAdmin || user.username === 'admin') {
            console.log('Загрузка списка файлов для администратора...');
            const adminResponse = await fetch('http://127.0.0.1:3000/admin/files', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!adminResponse.ok) {
                console.error('Ошибка получения списка файлов для админа:', adminResponse.status, adminResponse.statusText);
                const errorText = await adminResponse.text();
                console.error('Текст ошибки:', errorText);
                throw new Error('Ошибка получения списка файлов для администратора');
            }
            
            files = await adminResponse.json();
            console.log('Получен список файлов для админа:', files);
            
            const select = document.getElementById('admin-file-list');
            if (select) {
                select.innerHTML = '<option value="">Выберите файл...</option>';
                files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = `${file.username}/${file.fileName}`;
                    option.textContent = `${file.username} - ${file.fileName}`;
                    select.appendChild(option);
                });
                // Показываем панель администратора
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) {
                    adminPanel.style.display = 'block';
                } else {
                    console.error('Элемент admin-panel не найден в DOM');
                }
            } else {
                console.error('Элемент admin-file-list не найден в DOM');
            }
        } else {
            console.log('Загрузка списка файлов для обычного пользователя...');
            const response = await fetch('http://127.0.0.1:3000/files', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка получения списка файлов:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Текст ошибки:', errorText);
                throw new Error('Ошибка получения списка файлов');
            }
            
            files = await response.json();
            console.log('Получен список файлов:', files);
            
            const select = document.getElementById('load-file-name');
            if (select) {
                select.innerHTML = '<option value="">Выберите файл...</option>';
                files.forEach(fileName => {
                    const option = document.createElement('option');
                    option.value = fileName;
                    option.textContent = fileName;
                    select.appendChild(option);
                });
            } else {
                console.error('Элемент load-file-name не найден в DOM');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки списка файлов:', error);
        document.getElementById('error-message').textContent = 'Ошибка загрузки списка файлов';
    }
}

/**
 * Сохраняет текущее состояние карты
 */
async function saveMap() {
    if (!isAuthenticated()) {
        document.getElementById('error-message').textContent = 'Необходимо войти в систему';
        return;
    }

    const fileName = document.getElementById('save-file-name').value;
    if (!fileName) {
        document.getElementById('error-message').textContent = 'Введите имя файла';
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const fullFileName = `${currentUser.username}_${fileName}`;
        const geojsonData = exportToGeoJSON();
        
        console.log('Сохранение файла:', fullFileName);
        const response = await fetch('http://127.0.0.1:3000/save', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ fileName: fullFileName, geojsonData }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка сохранения:', response.status, errorText);
            throw new Error('Ошибка сохранения');
        }
        
        document.getElementById('save-file-name').value = '';
        await updateFileList();
        showHelp('Карта успешно сохранена');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        document.getElementById('error-message').textContent = 'Ошибка сохранения карты';
    }
}

/**
 * Загружает сохраненное состояние карты
 */
async function loadMap() {
    if (!isAuthenticated()) {
        document.getElementById('error-message').textContent = 'Необходимо войти в систему';
        return;
    }

    const fileName = document.getElementById('load-file-name').value;
    if (!fileName) {
        document.getElementById('error-message').textContent = 'Выберите файл для загрузки';
        return;
    }

    try {
        console.log('Загрузка файла:', fileName);
        const response = await fetch(`http://127.0.0.1:3000/load/${fileName}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка загрузки:', response.status, errorText);
            throw new Error('Ошибка загрузки');
        }
        
        const geojsonData = await response.json();
        state.drawnItems.clearLayers();
        importFromGeoJSON(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('error-message').textContent = 'Ошибка загрузки карты';
    }
}

/**
 * Инициализация обработчиков событий для UI
 */
function initUI() {
    console.log('Инициализация UI...');
    initCoordinates();
    updateFileList();
    
    document.getElementById('add-marker').addEventListener('click', () => {
        state.currentTool = 'marker';
        updateToolButtons(state);
        showHelp('Кликните на карте, чтобы добавить маркер');
    });
    document.getElementById('add-line').addEventListener('click', () => {
        state.currentTool = 'line';
        updateToolButtons(state);
        showHelp('Кликните на карте, чтобы добавить точки линии. Нажмите Esc для завершения.');
    });
    document.getElementById('add-polygon').addEventListener('click', () => {
        state.currentTool = 'polygon';
        updateToolButtons(state);
        showHelp('Кликните на карте, чтобы добавить точки полигона. Нажмите Esc для завершения.');
    });
    document.getElementById('delete-object').addEventListener('click', () => {
        state.currentTool = 'delete';
        updateToolButtons(state);
        showHelp('Кликните на объект, чтобы удалить его');
    });
    document.getElementById('clear-all').addEventListener('click', clearAllFeatures);
    
    document.getElementById('save-map').addEventListener('click', saveMap);
    document.getElementById('load-map').addEventListener('click', loadMap);
    
    initNameEditor();
}

/**
 * Инициализирует обработчик изменения названия объекта
 */
function initNameEditor() {
    const saveNameBtn = document.getElementById('save-name');
    const nameInput = document.getElementById('object-name');
    
    if (saveNameBtn && nameInput) {
        saveNameBtn.addEventListener('click', () => {
            if (state.selectedFeature && state.selectedFeature.layer) {
                const newName = nameInput.value.trim();
                if (newName) {
                    // Обновляем свойства объекта
                    if (!state.selectedFeature.layer.feature) {
                        state.selectedFeature.layer.feature = { type: 'Feature', properties: {} };
                    }
                    state.selectedFeature.layer.feature.properties.name = newName;
                    state.selectedFeature.properties = state.selectedFeature.layer.feature.properties;
                    // Обновляем всплывающее окно
                    state.selectedFeature.layer.bindPopup(newName);
                    state.selectedFeature.layer.openPopup();
                    console.log('Название обновлено:', newName);
                    nameInput.value = '';
                    showHelp('Название объекта обновлено');
                } else {
                    showHelp('Ошибка: Введите название');
                }
            } else {
                showHelp('Ошибка: Выберите объект для изменения названия');
                console.log('Объект не выбран');
            }
        });
        
        // При выборе объекта показываем текущее название, если оно есть
        document.addEventListener('featureselect', (e) => {
            console.log('Событие featureselect получено:', e.detail.feature);
            if (e.detail.feature && e.detail.feature.properties && e.detail.feature.properties.name) {
                nameInput.value = e.detail.feature.properties.name;
                console.log('Поле ввода обновлено с названием:', e.detail.feature.properties.name);
            } else {
                nameInput.value = '';
                console.log('Поле ввода очищено, название отсутствует');
            }
        });
    } else {
        console.error('Элементы для редактирования названия не найдены');
    }
}

export { 
    updateToolButtons, 
    showHelp, 
    initCoordinates, 
    updateFileList, 
    saveMap, 
    loadMap,
    initUI,
    initNameEditor
};