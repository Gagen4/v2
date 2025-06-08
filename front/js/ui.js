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
  const helpText = message || `
    Инструкция по использованию карты:
    1. Для добавления маркера нажмите кнопку "Маркер" и кликните на карту
    2. Для сохранения карты введите имя файла и нажмите "Сохранить"
    3. Для загрузки карты выберите файл из списка и нажмите "Загрузить"
    4. Для удаления файла выберите его из списка и нажмите "Удалить"
  `;
  showNotification(helpText, 'info');
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
let isFileListUpdated = false;
let fileListUpdateTimeout = null;
let fileListUpdateCount = 0;
async function updateFileList() {
    try {
        console.log('Обновление списка файлов...');
        const response = await fetch('http://127.0.0.1:3000/files', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        // Логируем статус ответа сервера
        console.log('Ответ сервера на /files:', response.status, response.statusText);
        if (!response.ok) {
            // Очищаем DOM элементы при ошибке
            const fileList = document.getElementById('file-list');
            if (fileList) fileList.innerHTML = '<li>Ошибка загрузки списка файлов (сервер недоступен или ошибка 500)</li>';
            const fileSelect = document.getElementById('load-file-name');
            if (fileSelect) fileSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = `Ошибка загрузки файлов: ${response.status} ${response.statusText}`;
            }
            console.error('Ошибка при получении списка файлов:', response.status, response.statusText);
            // Не выбрасываем исключение, просто выходим из функции
            return;
        }
        let files = await response.json();
        // Проверяем, что сервер вернул массив
        if (!Array.isArray(files)) {
            console.warn('Сервер вернул не массив файлов, files:', files);
            files = [];
        }
        // Фильтруем только строки
        files = files.filter(f => typeof f === 'string' && f.length > 0);
        console.log('Список файлов получен:', files);
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
            if (files.length === 0) {
                console.log('Нет сохраненных файлов для отображения');
                fileList.innerHTML = '<li>Нет сохраненных файлов</li>';
            } else {
                files.forEach(fileName => {
                    const li = document.createElement('li');
                    li.textContent = fileName;
                    li.setAttribute('data-file-name', fileName);
                    fileList.appendChild(li);
                });
            }
        } else {
            console.error('Элемент file-list не найден в DOM');
        }
        
        const fileSelect = document.getElementById('load-file-name');
        if (fileSelect) {
            fileSelect.innerHTML = '<option value="">Выберите файл...</option>';
            if (files.length > 0) {
                files.forEach(fileName => {
                    const option = document.createElement('option');
                    option.value = fileName;
                    option.textContent = fileName;
                    fileSelect.appendChild(option);
                });
            }
        } else {
            console.error('Элемент load-file-name не найден в DOM');
        }
        // Очищаем сообщение об ошибке, если всё прошло успешно
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = '';
        }
    } catch (error) {
        // Очищаем DOM элементы при ошибке
        const fileList = document.getElementById('file-list');
        if (fileList) fileList.innerHTML = '<li>Ошибка загрузки списка файлов (сервер недоступен или ошибка 500)</li>';
        const fileSelect = document.getElementById('load-file-name');
        if (fileSelect) fileSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = 'Ошибка загрузки списка файлов. Попробуйте позже или обратитесь к администратору.';
        }
        console.error('Исключение при получении списка файлов:', error);
        console.error('URL запроса:', 'http://127.0.0.1:3000/files');
        console.error('Ошибка может быть связана с недоступностью сервера или сетевыми проблемами.');
    }
}

let isSaving = false;
let saveAttempts = 0;
let currentFileName = null;

async function saveMap() {
    if (isSaving) {
        console.log('Сохранение уже выполняется, пропускаем');
        return;
    }
    isSaving = true;
    console.log('Попытка сохранения номер:', saveAttempts + 1);
    saveAttempts++;

    const fileNameInput = document.getElementById('save-file-name');
    if (!fileNameInput) {
        showNotification('Ошибка: поле ввода имени файла не найдено', 'error');
        isSaving = false;
        return;
    }

    const fileName = fileNameInput.value.trim();
    console.log('Сохранение файла:', fileName);

    if (!fileName) {
        showNotification('Введите имя файла', 'error');
        isSaving = false;
        return;
    }

    const geojsonData = getGeoJSONForSave();
    console.log('Данные для сохранения:', geojsonData);

    try {
        const response = await fetch('http://127.0.0.1:3000/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                fileName: fileName,
                geojsonData: geojsonData
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Сессия истекла, требуется повторная авторизация', 'error');
                showLoginForm();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Файл успешно сохранен:', result);
        showNotification('Файл успешно сохранен', 'success');
        await updateFileList();
    } catch (error) {
        console.error('Ошибка при сохранении файла:', error);
        showNotification('Ошибка при сохранении файла', 'error');
    } finally {
        isSaving = false;
        console.log('Сохранение завершено, isSaving сброшен в false.');
    }
}

/**
 * Получает значение cookie по имени
 * @param {string} name - Имя cookie
 * @returns {string|null} - Значение cookie или null, если не найдено
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

/**
 * Проверяет доступность сервера
 * @returns {Promise<boolean>}
 */
async function checkServerAvailability() {
    try {
        const response = await fetch('http://127.0.0.1:3000/health', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        return response.ok;
    } catch (error) {
        console.error('Сервер недоступен:', error);
        return false;
    }
}

/**
 * Проверяет и обновляет токен при необходимости
 * @returns {Promise<boolean>}
 */
async function checkAndRefreshToken() {
    const token = getCookie('token');
    if (!token) {
        console.log('Токен отсутствует');
        return false;
    }

    try {
        const response = await fetch('http://127.0.0.1:3000/check-token', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (response.status === 401) {
            console.log('Токен истек, требуется повторная аутентификация');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Ошибка при проверке токена:', error);
        return false;
    }
}

// Функция для получения GeoJSON данных карты
function getGeoJSONForSave() {
    if (!state || !state.drawnItems) {
        console.error('Ошибка: state или drawnItems не определены');
        return {
            type: 'FeatureCollection',
            features: []
        };
    }

    try {
        const geojsonData = state.drawnItems.toGeoJSON();
        console.log('GeoJSON для сохранения:', geojsonData);
        return geojsonData;
    } catch (error) {
        console.error('Ошибка при получении GeoJSON:', error);
        return {
            type: 'FeatureCollection',
            features: []
        };
    }
}

    async function deleteFile() {
    const selectedFile = document.querySelector('.file-item.selected');
    if (!selectedFile) {
        showNotification('Выберите файл для удаления', 'error');
        return;
    }

    const fileName = selectedFile.dataset.filename;
    console.log('Попытка удаления файла:', fileName);

    if (!confirm(`Вы уверены, что хотите удалить файл "${fileName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/delete/${fileName}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Сессия истекла, требуется повторная авторизация', 'error');
                showLoginForm();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Файл успешно удален:', result);
        showNotification('Файл успешно удален', 'success');
        await updateFileList();
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        showNotification('Ошибка при удалении файла', 'error');
    }
}

// Добавляем обработчик для кнопки удаления файла
function initFileControls() {
    const deleteButton = document.getElementById('delete-file');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const fileName = document.getElementById('load-file-name').value;
            deleteFile(fileName);
        });
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

    // Добавляем обработчик для кнопки отмены выбора инструмента
    const cancelToolBtn = document.getElementById('cancel-tool');
    if (cancelToolBtn) {
        cancelToolBtn.addEventListener('click', () => {
            state.currentTool = null;
            updateToolButtons(state);
            showHelp('Выбор инструмента отменён. Теперь можно кликать по объектам для просмотра их данных.');
        });
    } else {
        console.error('Кнопка отмены выбора инструмента не найдена в DOM');
    }

    const saveButton = document.getElementById('save-map');
    if (saveButton) {
        // Удаляем все существующие обработчики событий для кнопки сохранения
        saveButton.removeEventListener('click', saveMap);
        saveButton.addEventListener('click', saveMap);
        console.log('Обработчик для кнопки сохранения добавлен (удалены все предыдущие обработчики)');
    } else {
        console.error('Кнопка сохранения не найдена в DOM');
    }

    document.getElementById('load-map').addEventListener('click', loadMap);

    initNameEditor();
    initFileControls();
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

// Функция для загрузки карты
async function loadMap(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        console.error('Некорректное имя файла:', fileName);
        showNotification('Ошибка: некорректное имя файла', 'error');
        return;
    }

    console.log('Загрузка файла:', fileName);
    try {
        const response = await fetch(`http://127.0.0.1:3000/load/${encodeURIComponent(fileName)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Сессия истекла, требуется повторная авторизация', 'error');
                showLoginForm();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Получены данные:', data);

        if (!data || !data.geojsonData) {
            throw new Error('Некорректный формат данных');
        }

        // Очищаем текущие элементы
        if (state && state.drawnItems) {
            state.drawnItems.clear();
        }

        // Загружаем новые данные
        L.geoJSON(data.geojsonData, {
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.popupContent) {
                    layer.bindPopup(feature.properties.popupContent);
                }
            }
        }).addTo(state.drawnItems);

        showNotification('Файл успешно загружен', 'success');
    } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        showNotification('Ошибка при загрузке файла', 'error');
    }
}

// Функция для отображения формы авторизации
function showLoginForm() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('map-container').style.display = 'none';
    // Перезагружаем страницу для корректной инициализации
    window.location.reload();
}

// Добавляем функцию для установки имени файла
function setCurrentFileName(fileName) {
    currentFileName = fileName;
    const currentFileElement = document.getElementById('current-file');
    if (currentFileElement) {
        currentFileElement.textContent = 'Текущий файл: ' + fileName;
    }
}

// Простейшая реализация функции уведомления
function showNotification(message, type = 'info') {
    alert(message);
}

// Экспортируем все необходимые функции
export {
    initUI,
    updateFileList,
    showNotification,
    saveMap,
    deleteFile,
    showHelp,
    updateToolButtons,
    updateCoordinates,
    initCoordinates,
    clearAllFeatures,
    showLoginForm,
    loadMap
};