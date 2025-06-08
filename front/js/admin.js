import { importFromGeoJSON } from './drawing.js';
import { state } from './mapInit.js';

/**
 * Загружает список всех файлов для админа
 */
let isFileListLoaded = false;
let fileListLoadTimeout = null;
let fileListLoadCount = 0;
async function loadAdminFileList() {
    fileListLoadCount++;
    console.log(`Вызов loadAdminFileList, попытка #${fileListLoadCount}`);
    if (isFileListLoaded) {
        console.log('Список файлов уже загружен, пропускаем запрос.');
        return;
    }
    if (fileListLoadTimeout) {
        console.log('Запрос на загрузку списка файлов уже в процессе, пропускаем.');
        return;
    }
    fileListLoadTimeout = setTimeout(async () => {
        try {
            console.log('Проверка прав администратора перед запросом списка файлов...');
            const userResponse = await fetch('http://127.0.0.1:3000/user/info', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!userResponse.ok) {
                console.error('Ошибка получения информации о пользователе:', userResponse.status, userResponse.statusText);
                throw new Error('Ошибка получения информации о пользователе');
            }
            
            const user = await userResponse.json();
            console.log('Информация о пользователе:', user);

            if (!user.isAdmin && user.username !== 'admin') {
                console.log('Пользователь не является администратором, запрос списка файлов не выполняется.');
                return;
            }

            console.log('Запрос списка всех файлов для администратора...');
            const response = await fetch('http://127.0.0.1:3000/admin/files', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка получения списка файлов для админа:', response.status, errorText);
                throw new Error('Ошибка получения списка файлов');
            }

            const files = await response.json();
            console.log('Получен список файлов для админа:', files);
            const select = document.getElementById('admin-file-list');
            if (select) {
                select.innerHTML = '<option value="">Select user file...</option>';
                files.forEach(file => {
                    if (file.email && file.fileName) {
                        const option = document.createElement('option');
                        const fileValue = `${file.email}/${file.fileName}`;
                        option.value = fileValue;
                        option.textContent = `${file.email} - ${file.fileName} (${file.createdAt || 'No date'})`;
                        select.appendChild(option);
                        console.log('Добавлен файл в список:', fileValue);
                    } else {
                        console.error('Пропущен файл с некорректными данными:', file);
                    }
                });
                isFileListLoaded = true; // Устанавливаем флаг после успешной загрузки
            } else {
                console.error('Элемент admin-file-list не найден в DOM');
            }
        } catch (error) {
            console.error('Ошибка загрузки списка файлов для админа:', error);
            // Не выводим ошибку на UI, чтобы не отвлекать администратора
        } finally {
            fileListLoadTimeout = null; // Сбрасываем таймер после завершения запроса
        }
    }, 100); // Небольшая задержка для предотвращения множественных вызовов
}

/**
 * Загружает выбранный файл
 */
async function loadSelectedFile() {
    try {
        console.log('Нажата кнопка "Загрузить файл" для администратора');
        const filePath = document.getElementById('admin-file-list').value;
        if (!filePath) {
            console.error('Ошибка: Не выбран файл для загрузки');
            alert('Пожалуйста, выберите файл для загрузки.');
            return;
        }
        console.log('Попытка загрузки файла администратором:', filePath);
        console.log('Выбранное значение в списке admin-file-list:', document.getElementById('admin-file-list').value);
        const parts = filePath.split('/');
        console.log('Разбиение пути на части:', parts);
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            console.error('Ошибка: Неверный формат пути файла', filePath);
            alert('Неверный формат пути файла. Пожалуйста, выберите корректный файл из списка.');
            return;
        }
        const [username, fileName] = parts;
        const response = await fetch(`http://127.0.0.1:3000/admin/load/${username}/${fileName}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Ошибка загрузки файла администратором:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Текст ошибки от сервера:', errorText);
            alert(`Ошибка загрузки файла: ${response.status}. ${errorText}`);
            return;
        }

        const mapData = await response.json();
        console.log('Данные карты успешно загружены администратором:', mapData);
        if (typeof loadMapData === 'function') {
            loadMapData(mapData);
            console.log('Данные карты переданы в функцию loadMapData');
        } else {
            console.error('Ошибка: Функция loadMapData не определена');
            alert('Функция загрузки данных карты не найдена.');
        }
    } catch (error) {
        console.error('Исключение при загрузке файла администратором:', error);
        alert('Произошла ошибка при загрузке файла.');
    }
}

/**
 * Обработчик для кнопки удаления файла
 */
async function deleteSelectedFile() {
    try {
        console.log('Нажата кнопка "Удалить выбранный файл"');
        const filePath = document.getElementById('admin-file-list').value;
        if (!filePath) {
            console.error('Ошибка: Не выбран файл для удаления');
            alert('Пожалуйста, выберите файл для удаления.');
            return;
        }
        console.log('Попытка удаления файла:', filePath);
        const parts = filePath.split('/');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            console.error('Ошибка: Неверный формат пути файла', filePath);
            alert('Неверный формат пути файла. Пожалуйста, выберите корректный файл из списка.');
            return;
        }
        const [username, fileName] = parts;
        if (confirm(`Вы уверены, что хотите удалить файл ${fileName} пользователя ${username}?`)) {
            const response = await fetch(`http://127.0.0.1:3000/admin/delete/${username}/${fileName}`, {
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
            loadAdminFileList(); // Обновляем список файлов после удаления
        } else {
            console.log('Удаление файла отменено пользователем');
        }
    } catch (error) {
        console.error('Исключение при удалении файла:', error);
        alert('Произошла ошибка при удалении файла.');
    }
}

/**
 * Обработчик для кнопки удаления всех файлов
 */
async function deleteAllFiles() {
    try {
        console.log('Нажата кнопка "Удалить все файлы"');
        if (confirm('Вы уверены, что хотите удалить все файлы всех пользователей? Это действие нельзя отменить.')) {
            const response = await fetch('http://127.0.0.1:3000/admin/delete-all-files', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка удаления всех файлов:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Текст ошибки от сервера:', errorText);
                alert(`Ошибка удаления всех файлов: ${response.status}. ${errorText}`);
                return;
            }

            const result = await response.json();
            console.log('Все файлы успешно удалены:', result);
            alert('Все файлы успешно удалены!');
            loadAdminFileList(); // Обновляем список файлов после удаления
        } else {
            console.log('Удаление всех файлов отменено пользователем');
        }
    } catch (error) {
        console.error('Исключение при удалении всех файлов:', error);
        alert('Произошла ошибка при удалении всех файлов.');
    }
}

/**
 * Инициализация админских функций
 */
function initAdmin() {
    document.addEventListener('authSuccess', () => {
        // Обновляем список файлов при успешной авторизации
        loadAdminFileList();
    });

    // Добавляем обработчик для кнопки загрузки
    const loadButton = document.getElementById('admin-load-file');
    if (loadButton) {
        loadButton.addEventListener('click', loadSelectedFile);
    }

    // Добавляем обработчик события для кнопки удаления
    try {
        const deleteButton = document.getElementById('admin-delete-file');
        if (deleteButton) {
            deleteButton.addEventListener('click', deleteSelectedFile);
            console.log('Обработчик события для кнопки удаления добавлен');
        } else {
            console.error('Кнопка admin-delete-file не найдена в DOM');
        }
    } catch (error) {
        console.error('Ошибка при добавлении обработчика события для кнопки удаления:', error);
    }

    // Добавляем обработчик события для кнопки удаления всех файлов
    try {
        const deleteAllButton = document.getElementById('admin-delete-all-files');
        if (deleteAllButton) {
            deleteAllButton.addEventListener('click', deleteAllFiles);
            console.log('Обработчик события для кнопки удаления всех файлов добавлен');
        } else {
            console.error('Кнопка admin-delete-all-files не найдена в DOM');
        }
    } catch (error) {
        console.error('Ошибка при добавлении обработчика события для кнопки удаления всех файлов:', error);
    }
}

export { initAdmin }; 