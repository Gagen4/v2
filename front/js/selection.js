/**
 * Управляет выбором и подсветкой объектов.
 * @module selection
 */
import { state } from './mapInit.js';

/**
 * Выбирает объект по клику или слою.
 * @param {L.LatLng|L.Layer} latlngOrLayer - Координаты или слой для выбора.
 */
function selectObject(latlngOrLayer) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  resetSelection();

  let layer = latlngOrLayer;
  if (!(latlngOrLayer instanceof L.Layer)) {
    state.drawnItems.eachLayer((l) => {
      if (l instanceof L.Marker) {
        if (l.getLatLng().distanceTo(latlngOrLayer) < 20) {
          layer = l;
        }
      } else if (l instanceof L.Polyline) {
        if (isPointOnLine(latlngOrLayer, l.getLatLngs())) {
          layer = l;
        }
      } else if (l instanceof L.Polygon) {
        if (l.getBounds().contains(latlngOrLayer)) {
          layer = l;
        }
      }
    });
  }

  if (layer) {
    state.selectedLayer = layer;
    state.selectedFeature = { layer: layer, properties: layer.feature ? layer.feature.properties : {} };
    highlightLayer(layer);
    // Отправляем событие выбора объекта
    const event = new CustomEvent('featureselect', { detail: { feature: state.selectedFeature } });
    document.dispatchEvent(event);
    console.log('Объект выбран:', state.selectedFeature);
    // Открываем всплывающее окно с полем для ввода названия
    const currentName = state.selectedFeature.properties.name || 'Без названия';
    console.log('Текущее название объекта:', currentName);
    const popupContent = `
      <div>
        <b>Название:</b> <input type="text" id="popup-name-input" value="${currentName}" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
        <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
      </div>
    `;
    try {
      layer.bindPopup(popupContent).openPopup();
      console.log('Всплывающее окно успешно открыто для объекта');
    } catch (error) {
      console.error('Ошибка при открытии всплывающего окна:', error);
      // Альтернативный способ отображения окна для ввода названия
      console.log('Попытка отобразить альтернативное окно для ввода названия...');
      const altDiv = document.createElement('div');
      altDiv.id = 'alt-name-editor';
      altDiv.style.position = 'absolute';
      altDiv.style.top = '50%';
      altDiv.style.left = '50%';
      altDiv.style.transform = 'translate(-50%, -50%)';
      altDiv.style.background = 'white';
      altDiv.style.padding = '15px';
      altDiv.style.border = '1px solid #ccc';
      altDiv.style.borderRadius = '5px';
      altDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
      altDiv.style.zIndex = '10000';
      altDiv.innerHTML = `
        <div>
          <b>Название объекта:</b><br>
          <input type="text" id="alt-name-input" value="${currentName}" style="width: 200px; padding: 5px; margin-bottom: 10px;"><br>
          <button id="alt-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
          <button id="alt-close" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Закрыть</button>
        </div>
      `;
      document.body.appendChild(altDiv);
      console.log('Альтернативное окно для ввода названия добавлено в DOM');
    }
    // Добавляем обработчик для кнопки сохранения в popup
    setTimeout(() => {
      const saveButton = document.getElementById('popup-save-name');
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          const nameInput = document.getElementById('popup-name-input');
          if (nameInput) {
            const newName = nameInput.value.trim();
            if (newName) {
              if (!state.selectedFeature.layer.feature) {
                state.selectedFeature.layer.feature = { type: 'Feature', properties: {} };
              }
              state.selectedFeature.layer.feature.properties.name = newName;
              state.selectedFeature.properties = state.selectedFeature.layer.feature.properties;
              console.log('Название обновлено через popup:', newName);
              layer.closePopup();
            } else {
              console.log('Название не введено');
            }
          }
        });
        console.log('Обработчик для кнопки сохранения в popup добавлен');
      } else {
        console.error('Кнопка сохранения в popup не найдена');
      }
      // Добавляем обработчики для альтернативного окна
      const altSaveButton = document.getElementById('alt-save-name');
      const altCloseButton = document.getElementById('alt-close');
      if (altSaveButton) {
        altSaveButton.addEventListener('click', () => {
          const altNameInput = document.getElementById('alt-name-input');
          if (altNameInput) {
            const newName = altNameInput.value.trim();
            if (newName) {
              if (!state.selectedFeature.layer.feature) {
                state.selectedFeature.layer.feature = { type: 'Feature', properties: {} };
              }
              state.selectedFeature.layer.feature.properties.name = newName;
              state.selectedFeature.properties = state.selectedFeature.layer.feature.properties;
              console.log('Название обновлено через альтернативное окно:', newName);
              const altDiv = document.getElementById('alt-name-editor');
              if (altDiv) altDiv.remove();
            }
          }
        });
      }
      if (altCloseButton) {
        altCloseButton.addEventListener('click', () => {
          const altDiv = document.getElementById('alt-name-editor');
          if (altDiv) altDiv.remove();
          console.log('Альтернативное окно закрыто');
        });
      }
    }, 100); // Небольшая задержка, чтобы popup успел отрендериться
  } else {
    console.log('Объект не найден по указанным координатам');
  }
}

/**
 * Проверяет, находится ли точка рядом с линией.
 * @param {L.LatLng} point - Точка для проверки.
 * @param {L.LatLng[]} latlngs - Координаты линии.
 * @returns {boolean}
 */
function isPointOnLine(point, latlngs) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return false;
  }

  for (let i = 0; i < latlngs.length - 1; i++) {
    const dist = L.GeometryUtil.distanceSegment(state.map, point, latlngs[i], latlngs[i + 1]);
    if (dist < 10) return true;
  }
  return false;
}

/**
 * Подсвечивает выбранный слой.
 * @param {L.Layer} layer - Слой для подсветки.
 */
function highlightLayer(layer) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (layer instanceof L.Marker) {
    layer.setZIndexOffset(1000);
  } else {
    layer.setStyle({
      color: '#ff0000',
      weight: 3,
    });
  }
}

/**
 * Сбрасывает состояние выбора.
 */
function resetSelection() {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (state.selectedLayer) {
    if (state.selectedLayer instanceof L.Marker) {
      state.selectedLayer.setZIndexOffset(0);
    } else {
      state.selectedLayer.setStyle({
        color: '#3388ff',
        weight: 2,
      });
    }
    state.selectedLayer = null;
  }
}

export { selectObject, isPointOnLine, highlightLayer, resetSelection };