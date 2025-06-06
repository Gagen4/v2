/**
 * Инициализирует кнопки инструментов и их обработчики событий.
 * @module tools
 */
import { state } from './mapInit.js';
import { finishDrawing, resetDrawing, exportToGeoJSON, importFromGeoJSON } from './drawing.js';
import { updateToolButtons, showHelp, updateFileList } from './ui.js';
import { isAuthenticated } from './auth.js';

/**
 * Инициализирует обработчики событий для кнопок инструментов.
 */
function initTools() {
  // Кэширование элементов кнопок
  const buttons = {
    marker: document.getElementById('add-marker'),
    line: document.getElementById('add-line'),
    polygon: document.getElementById('add-polygon'),
    delete: document.getElementById('delete-object'),
    clear: document.getElementById('clear-all'),
    save: document.getElementById('save-map'),
    load: document.getElementById('load-map'),
  };

  // Проверка наличия кнопок
  for (const [key, btn] of Object.entries(buttons)) {
    if (!btn) {
      console.error(`Кнопка ${key} (#${key === 'save' ? 'save-map' : key === 'load' ? 'load-map' : key}) не найдена`);
      document.getElementById('error-message').textContent = `Кнопка ${key} не найдена`;
      return;
    }
  }

  // Добавление маркера
  buttons.marker.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'marker';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить маркер');
  });

  // Добавление линии
  buttons.line.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'line';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить точки линии. Нажмите Esc для завершения.');
  });

  // Добавление полигона
  buttons.polygon.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'polygon';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить точки полигона. Нажмите Esc для завершения.');
  });

  // Удаление объекта
  buttons.delete.addEventListener('click', () => {
    finishDrawing(state);
    if (state.selectedLayer) {
      state.drawnItems.removeLayer(state.selectedLayer);
      state.selectedLayer = null;
    }
    resetDrawing(state, false);
    state.currentTool = 'delete';
    updateToolButtons(state);
    showHelp('Кликните на объект, чтобы удалить его');
  });

  // Очистка всех объектов
  buttons.clear.addEventListener('click', () => {
    state.drawnItems.clearLayers();
    resetDrawing(state, true);
    state.currentTool = null;
    updateToolButtons(state);
    showHelp('Все объекты очищены');
  });

  // Сохранение карты
  buttons.save.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showHelp('Ошибка: Необходимо войти в систему');
      return;
    }

    const fileNameInput = document.getElementById('save-file-name');
    const fileName = fileNameInput.value.trim();
    if (!fileName) {
      showHelp('Ошибка: Введите имя файла для сохранения');
      return;
    }

    const geojson = exportToGeoJSON();
    if (!geojson || geojson.features.length === 0) {
      showHelp('Ошибка: На карте нет объектов для сохранения');
      return;
    }

    try {
      console.log('Сохранение файла:', fileName);
      const response = await fetch('http://127.0.0.1:3000/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          fileName,
          geojsonData: geojson
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка сохранения:', response.status, errorText);
        throw new Error('Ошибка сохранения');
      }

      const result = await response.json();
      showHelp(`Сохранено: ${result.message}`);
      fileNameInput.value = '';
      await updateFileList();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showHelp('Ошибка при сохранении. Проверьте консоль.');
    }
  });

  // Загрузка карты
  buttons.load.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showHelp('Ошибка: Необходимо войти в систему');
      return;
    }

    const fileSelect = document.getElementById('load-file-name');
    const fileName = fileSelect.value;
    if (!fileName) {
      showHelp('Ошибка: Выберите файл для загрузки');
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

      const geojson = await response.json();
      state.drawnItems.clearLayers();
      importFromGeoJSON(geojson);
      showHelp(`Загружен файл: ${fileName}`);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showHelp('Ошибка при загрузке. Проверьте консоль.');
    }
  });
}

export { initTools };