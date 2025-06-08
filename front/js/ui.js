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
                'Accept': 'application/json'
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
let saveRequestCount = 0;
let isSaveHandlerAdded = false;

function saveMap() {
    if (!isAuthenticated()) {
        alert('Пожалуйста, войдите в систему для сохранения карты.');
        return;
    }
    // Получаем имя файла из input
    const fileNameInput = document.getElementById('save-file-name');
    const fileName = fileNameInput ? fileNameInput.value.trim() : '';
    if (!fileName) {
        alert('Пожалуйста, введите имя файла для сохранения.');
        isSaving = false;
        return;
    }
    if (isSaving) {
        console.log('Сохранение уже выполняется, игнорируем повторный запрос.');
        return;
    }
    isSaving = true;
    saveRequestCount++;
    console.log('Попытка сохранения номер:', saveRequestCount);
    if (fileName) {
        console.log('Сохранение файла:', fileName);
        const geojsonData = exportToGeoJSON();
        console.log('Данные для сохранения:', geojsonData);
        fetch('http://127.0.0.1:3000/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName, geojsonData }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Файл успешно сохранен:', data);
            alert(data.message);
            console.log('Обновление списка файлов после сохранения...');
            updateFileList();
            console.log('Список файлов обновлен после сохранения.');
            isSaving = false;
            console.log('Сохранение завершено, isSaving сброшен в false.');
            // Отображение названия текущего файла в панели
            document.getElementById('current-file').textContent = 'Текущий файл: ' + fileName;
        })
        .catch(error => {
            console.error('Ошибка при сохранении файла:', error);
            alert('Произошла ошибка при сохранении файла.');
            isSaving = false;
            console.log('Сохранение завершено с ошибкой, isSaving сброшен в false.');
        });
    } else {
        isSaving = false;
        console.log('Сохранение отменено пользователем, isSaving сброшен в false.');
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
        isSaveHandlerAdded = true;
        console.log('Обработчик для кнопки сохранения добавлен (удалены все предыдущие обработчики)');
    } else {
        console.error('Кнопка сохранения не найдена в DOM');
    }

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

// Обработчик для кнопки "Загрузить"
const loadButton = document.getElementById('load-map');
if (loadButton) {
    loadButton.removeEventListener('click', loadMap); // Удаляем существующий обработчик, если есть
    loadButton.addEventListener('click', async () => {
        try {
            console.log('Нажата кнопка "Загрузить"');
            const fileName = document.getElementById('load-file-name').value;
            if (!fileName) {
                console.error('Ошибка: Не выбран файл для загрузки');
                alert('Пожалуйста, выберите файл для загрузки.');
                return;
            }
            console.log('Попытка загрузки файла:', fileName);
            const response = await fetch(`http://127.0.0.1:3000/load/${fileName}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка загрузки файла:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Текст ошибки от сервера:', errorText);
                alert(`Ошибка загрузки файла: ${response.status}. ${errorText}`);
                return;
            }

            const mapData = await response.json();
            console.log('Данные карты успешно загружены:', mapData);
            if (typeof importFromGeoJSON === 'function') {
                // Проверяем, является ли поле features строкой, и если да, преобразуем в массив
                if (mapData.type === 'FeatureCollection' && typeof mapData.features === 'string') {
                    try {
                        mapData.features = JSON.parse(mapData.features);
                        console.log('Поле features преобразовано из строки в массив:', mapData.features);
                    } catch (e) {
                        console.error('Ошибка при парсинге поля features:', e);
                        alert('Ошибка формата данных карты.');
                        return;
                    }
                }
                // Проверяем, является ли features массивом перед передачей в importFromGeoJSON
                if (Array.isArray(mapData.features)) {
                    state.drawnItems.clearLayers(); // Очищаем существующие слои перед загрузкой новых данных
                    importFromGeoJSON(mapData);
                    console.log('Данные карты переданы в функцию importFromGeoJSON');
                } else {
                    console.error('Ошибка: Поле features не является массивом', mapData.features);
                    alert('Ошибка формата данных карты: features не является массивом.');
                }
            } else {
                console.error('Ошибка: Функция importFromGeoJSON не определена');
                alert('Функция загрузки данных карты не найдена.');
            }
        } catch (error) {
            console.error('Исключение при загрузке файла:', error);
            alert('Произошла ошибка при загрузке файла.');
        }
    });
} else {
    console.error('Кнопка загрузки не найдена в DOM');
}

// Обработчик для кнопки "Удалить выбранное сохранение"
const deleteButton = document.getElementById('delete-map');
if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
        try {
            console.log('Нажата кнопка "Удалить выбранное сохранение"');
            const fileName = document.getElementById('load-file-name').value;
            if (!fileName) {
                console.error('Ошибка: Не выбран файл для удаления');
                alert('Пожалуйста, выберите файл для удаления.');
                return;
            }
            console.log('Попытка удаления файла:', fileName);
            if (confirm(`Вы уверены, что хотите удалить файл ${fileName}?`)) {
                const response = await fetch(`http://127.0.0.1:3000/delete/${fileName}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.error('Ошибка удаления файла:', response.status, response.statusText);
                    const errorText = await response.text();
                    console.error('Текст ошибки от сервера:', errorText);
                    alert(`Ошибка удаления файла: ${response.status}. ${errorText}`);
                    return;
                }

                const result = await response.json();
                console.log('Файл успешно удален:', result);
                alert('Файл успешно удален!');
                updateFileList(); // Обновляем список файлов после удаления
            } else {
                console.log('Удаление файла отменено пользователем');
            }
        } catch (error) {
            console.error('Исключение при удалении файла:', error);
            alert('Произошла ошибка при удалении файла.');
        }
    });
} else {
    console.error('Кнопка удаления не найдена в DOM');
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