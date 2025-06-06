/**
 * Управляет рисованием маркеров, линий и полигонов.
 * @module drawing
 */
import { state } from './mapInit.js';
import { selectObject } from './selection.js';
import { saveMapData } from './api.js';

// Таймер для дебаунсинга сохранения
let saveTimeout = null;
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL = 2000; // Минимальный интервал между сохранениями (2 секунды)

/**
 * Настраивает обработчики кликов по карте для рисования.
 */
function setupMapHandlers() {
  if (!state.map) return;
  
  // Предотвращаем отправку формы по умолчанию
  document.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  state.map.on('click', (e) => {
    if (state.currentTool === 'marker') {
      e.originalEvent.preventDefault();
      addMarker(e.latlng);
    } else if (state.currentTool === 'line') {
      e.originalEvent.preventDefault();
      addLinePoint(e.latlng);
    } else if (state.currentTool === 'polygon') {
      e.originalEvent.preventDefault();
      addPolygonPoint(e.latlng);
    } else if (state.currentTool === 'delete') {
      e.originalEvent.preventDefault();
      selectObject(e.latlng);
    }
  });
}

/**
 * Сохраняет текущее состояние карты на сервер с дебаунсингом.
 * @param {boolean} [forceSave=false] - Принудительное сохранение, игнорируя дебаунсинг
 */
async function saveCurrentState(forceSave = false) {
  try {
    const now = Date.now();
    
    // Если это не принудительное сохранение, применяем дебаунсинг
    if (!forceSave) {
      // Проверяем, прошло ли достаточно времени с последнего сохранения
      if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
        // Если нет, отменяем предыдущий таймер и устанавливаем новый
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => saveCurrentState(true), MIN_SAVE_INTERVAL);
        return;
      }
    }

    // Обновляем время последнего сохранения
    lastSaveTime = now;

    // Не сохраняем автоматически, только если это принудительное сохранение
    if (forceSave) {
      const geojson = exportToGeoJSON();
      await saveMapData(geojson);
      console.log('Данные карты успешно сохранены');
    }
  } catch (error) {
    console.error('Ошибка при сохранении данных карты:', error);
  }
}

/**
 * Добавляет маркер на карту.
 * @param {L.LatLng} latlng - Координаты маркера.
 */
function addMarker(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  try {
    const marker = L.marker(latlng, { 
      draggable: true // Делаем маркер перетаскиваемым
    }).addTo(state.drawnItems);
    
    marker.feature = { type: 'Feature', properties: { name: 'Маркер' } };
    console.log('Маркер добавлен, открываем всплывающее окно');
    const popupContent = `
      <div>
        <b>Название:</b> <input type="text" id="popup-name-input" value="Маркер" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
        <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
      </div>
    `;
    marker.bindPopup(popupContent).openPopup();
    console.log('Всплывающее окно привязано и открыто для маркера');
    
    // Добавляем обработчики событий для маркера
    marker.on('click', (e) => {
      e.originalEvent?.preventDefault();
      selectObject(marker);
    });
    
    // Не сохраняем автоматически при перетаскивании
    marker.on('dragend', (e) => {
      e.originalEvent?.preventDefault();
    });
    
    // Добавляем обработчик для кнопки сохранения
    setTimeout(() => {
      const saveButton = document.getElementById('popup-save-name');
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          const nameInput = document.getElementById('popup-name-input');
          if (nameInput) {
            const newName = nameInput.value.trim();
            if (newName) {
              marker.feature.properties.name = newName;
              console.log('Название маркера обновлено:', newName);
              marker.closePopup();
            } else {
              console.log('Название не введено');
            }
          }
        });
        console.log('Обработчик для кнопки сохранения добавлен');
      } else {
        console.error('Кнопка сохранения не найдена в всплывающем окне');
      }
    }, 100);
  } catch (error) {
    console.error('Ошибка при добавлении маркера:', error);
  }
}

/**
 * Добавляет точку к временной линии.
 * @param {L.LatLng} latlng - Координаты точки.
 */
function addLinePoint(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }
  state.tempPoints.push(latlng);

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }

  if (state.tempPoints.length >= 2) {
    state.tempLayer = L.polyline(state.tempPoints, {
      color: 'blue',
      dashArray: '5,5',
      weight: 2,
    }).addTo(state.map);
  }
}

/**
 * Добавляет точку к временному полигону.
 * @param {L.LatLng} latlng - Координаты точки.
 */
function addPolygonPoint(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }
  state.tempPoints.push(latlng);

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }

  if (state.tempPoints.length >= 3) {
    state.tempLayer = L.polygon([state.tempPoints], {
      color: 'green',
      dashArray: '5,5',
      fillOpacity: 0.2,
    }).addTo(state.map);
  }
}

/**
 * Завершает рисование линии или полигона и добавляет их в drawnItems.
 * @param {MapState} state - Глобальное состояние.
 */
function finishDrawing(state) {
  if (state.tempPoints.length === 0) return;

  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (state.currentTool === 'line' && state.tempPoints.length >= 2) {
    const line = L.polyline(state.tempPoints, { color: 'red' }).addTo(state.drawnItems);
    line.feature = { type: 'Feature', properties: { name: 'Линия' } };
    const length = calculateLineLength(line.getLatLngs());
    line.feature.properties.length = length;
    const popupContent = `
      <div>
        <b>Название:</b> <input type="text" id="popup-name-input" value="Линия" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
        <b>Длина:</b> <span id="line-length">${length.toFixed(2)} м</span><br>
        <select id="unit-select" style="margin-top: 5px;">
          <option value="meters">Метры</option>
          <option value="kilometers">Километры</option>
        </select>
        <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">Сохранить</button>
      </div>
    `;
    line.bindPopup(popupContent).openPopup();
    line.on('click', () => selectObject(line));
    setTimeout(() => {
      const saveButton = document.getElementById('popup-save-name');
      const unitSelect = document.getElementById('unit-select');
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          const nameInput = document.getElementById('popup-name-input');
          if (nameInput) {
            const newName = nameInput.value.trim();
            if (newName) {
              line.feature.properties.name = newName;
              console.log('Название линии обновлено:', newName);
              line.closePopup();
            } else {
              console.log('Название не введено');
            }
          }
        });
      }
      if (unitSelect) {
        unitSelect.addEventListener('change', () => {
          const unit = unitSelect.value;
          const lengthSpan = document.getElementById('line-length');
          if (lengthSpan) {
            if (unit === 'meters') {
              lengthSpan.textContent = `${length.toFixed(2)} м`;
            } else {
              lengthSpan.textContent = `${(length / 1000).toFixed(2)} км`;
            }
          }
        });
      }
    }, 100);
  } else if (state.currentTool === 'polygon' && state.tempPoints.length >= 3) {
    const polygon = L.polygon([state.tempPoints], { color: 'green' }).addTo(state.drawnItems);
    polygon.feature = { type: 'Feature', properties: { name: 'Полигон' } };
    const area = calculatePolygonArea(polygon.getLatLngs()[0]);
    polygon.feature.properties.area = area;
    const popupContent = `
      <div>
        <b>Название:</b> <input type="text" id="popup-name-input" value="Полигон" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
        <b>Площадь:</b> <span id="polygon-area">${area.toFixed(2)} м²</span><br>
        <select id="unit-select" style="margin-top: 5px;">
          <option value="meters">Метры</option>
          <option value="kilometers">Километры</option>
        </select>
        <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">Сохранить</button>
      </div>
    `;
    polygon.bindPopup(popupContent).openPopup();
    polygon.on('click', () => selectObject(polygon));
    setTimeout(() => {
      const saveButton = document.getElementById('popup-save-name');
      const unitSelect = document.getElementById('unit-select');
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          const nameInput = document.getElementById('popup-name-input');
          if (nameInput) {
            const newName = nameInput.value.trim();
            if (newName) {
              polygon.feature.properties.name = newName;
              console.log('Название полигона обновлено:', newName);
              polygon.closePopup();
            } else {
              console.log('Название не введено');
            }
          }
        });
      }
      if (unitSelect) {
        unitSelect.addEventListener('change', () => {
          const unit = unitSelect.value;
          const areaSpan = document.getElementById('polygon-area');
          if (areaSpan) {
            if (unit === 'meters') {
              areaSpan.textContent = `${area.toFixed(2)} м²`;
            } else {
              areaSpan.textContent = `${(area / 1000000).toFixed(2)} км²`;
            }
          }
        });
      }
    }, 100);
  }

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }
  state.tempPoints = [];
}

/**
 * Сбрасывает состояние рисования.
 * @param {MapState} state - Глобальное состояние.
 * @param {boolean} [fullReset=true] - Сбрасывать ли currentTool.
 */
function resetDrawing(state, fullReset = true) {
  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }
  state.tempPoints = [];
  if (fullReset) {
    state.currentTool = null;
  }
}

/**
 * Экспортирует слой drawnItems в GeoJSON.
 * @returns {Object} GeoJSON объект.
 */
function exportToGeoJSON() {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return null;
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [],
  };

  state.drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
        },
        properties: layer.feature ? layer.feature.properties : { name: 'Маркер' },
      });
      console.log('Маркер добавлен в GeoJSON для сохранения');
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: layer.getLatLngs().map((latlng) => [latlng.lng, latlng.lat]),
        },
        properties: layer.feature ? layer.feature.properties : { name: 'Линия', length: calculateLineLength(layer.getLatLngs()) },
      });
      console.log('Линия добавлена в GeoJSON для сохранения');
    } else if (layer instanceof L.Polygon) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [layer.getLatLngs()[0].map((latlng) => [latlng.lng, latlng.lat])],
        },
        properties: layer.feature ? layer.feature.properties : { name: 'Полигон', area: calculatePolygonArea(layer.getLatLngs()[0]) },
      });
      console.log('Полигон добавлен в GeoJSON для сохранения');
    }
  });

  console.log('GeoJSON для сохранения:', geojson);
  return geojson;
}

/**
 * Импортирует GeoJSON в drawnItems.
 * @param {Object} geojson - GeoJSON объект.
 */
function importFromGeoJSON(geojson) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (!geojson || !geojson.features) {
    console.error('Некорректный формат GeoJSON');
    return;
  }

  state.drawnItems.clearLayers();

  geojson.features.forEach((feature) => {
    try {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        const marker = L.marker([lat, lng], { 
          draggable: true // Делаем маркер перетаскиваемым
        }).addTo(state.drawnItems);
        
        if (feature.properties && feature.properties.name) {
          marker.bindPopup(feature.properties.name);
        }
        
        marker.on('click', () => selectObject(marker));
        marker.on('dragend', () => saveCurrentState());
      } else if (feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const line = L.polyline(coordinates, { color: 'red' })
          .addTo(state.drawnItems);
        if (feature.properties) {
          line.feature = { type: 'Feature', properties: feature.properties };
          const length = feature.properties.length || calculateLineLength(line.getLatLngs());
          line.feature.properties.length = length;
          const popupContent = `
            <div>
              <b>Название:</b> <input type="text" id="popup-name-input" value="${feature.properties.name || 'Линия'}" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
              <b>Длина:</b> <span id="line-length">${length.toFixed(2)} м</span><br>
              <select id="unit-select" style="margin-top: 5px;">
                <option value="meters">Метры</option>
                <option value="kilometers">Километры</option>
              </select>
              <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">Сохранить</button>
            </div>
          `;
          line.bindPopup(popupContent);
          line.on('popupopen', () => {
            setTimeout(() => {
              const saveButton = document.getElementById('popup-save-name');
              const unitSelect = document.getElementById('unit-select');
              if (saveButton) {
                saveButton.addEventListener('click', () => {
                  const nameInput = document.getElementById('popup-name-input');
                  if (nameInput) {
                    const newName = nameInput.value.trim();
                    if (newName) {
                      line.feature.properties.name = newName;
                      console.log('Название линии обновлено:', newName);
                      line.closePopup();
                    } else {
                      console.log('Название не введено');
                    }
                  }
                });
              }
              if (unitSelect) {
                unitSelect.addEventListener('change', () => {
                  const unit = unitSelect.value;
                  const lengthSpan = document.getElementById('line-length');
                  if (lengthSpan) {
                    if (unit === 'meters') {
                      lengthSpan.textContent = `${length.toFixed(2)} м`;
                    } else {
                      lengthSpan.textContent = `${(length / 1000).toFixed(2)} км`;
                    }
                  }
                });
              }
            }, 100);
          });
        }
        line.on('click', () => selectObject(line));
      } else if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const polygon = L.polygon([coordinates], { color: 'green' })
          .addTo(state.drawnItems);
        if (feature.properties) {
          polygon.feature = { type: 'Feature', properties: feature.properties };
          const area = feature.properties.area || calculatePolygonArea(polygon.getLatLngs()[0]);
          polygon.feature.properties.area = area;
          const popupContent = `
            <div>
              <b>Название:</b> <input type="text" id="popup-name-input" value="${feature.properties.name || 'Полигон'}" style="width: 150px; padding: 5px; margin-bottom: 5px;"><br>
              <b>Площадь:</b> <span id="polygon-area">${area.toFixed(2)} м²</span><br>
              <select id="unit-select" style="margin-top: 5px;">
                <option value="meters">Метры</option>
                <option value="kilometers">Километры</option>
              </select>
              <button id="popup-save-name" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">Сохранить</button>
            </div>
          `;
          polygon.bindPopup(popupContent);
          polygon.on('popupopen', () => {
            setTimeout(() => {
              const saveButton = document.getElementById('popup-save-name');
              const unitSelect = document.getElementById('unit-select');
              if (saveButton) {
                saveButton.addEventListener('click', () => {
                  const nameInput = document.getElementById('popup-name-input');
                  if (nameInput) {
                    const newName = nameInput.value.trim();
                    if (newName) {
                      polygon.feature.properties.name = newName;
                      console.log('Название полигона обновлено:', newName);
                      polygon.closePopup();
                    } else {
                      console.log('Название не введено');
                    }
                  }
                });
              }
              if (unitSelect) {
                unitSelect.addEventListener('change', () => {
                  const unit = unitSelect.value;
                  const areaSpan = document.getElementById('polygon-area');
                  if (areaSpan) {
                    if (unit === 'meters') {
                      areaSpan.textContent = `${area.toFixed(2)} м²`;
                    } else {
                      areaSpan.textContent = `${(area / 1000000).toFixed(2)} км²`;
                    }
                  }
                });
              }
            }, 100);
          });
        }
        polygon.on('click', () => selectObject(polygon));
      }
    } catch (error) {
      console.error('Ошибка при импорте объекта:', error);
    }
  });
}

/**
 * Вычисляет длину линии в метрах.
 * @param {L.LatLng[]} latlngs - Координаты точек линии.
 * @returns {number} Длина линии в метрах.
 */
function calculateLineLength(latlngs) {
  let length = 0;
  for (let i = 0; i < latlngs.length - 1; i++) {
    length += latlngs[i].distanceTo(latlngs[i + 1]);
  }
  return length;
}

/**
 * Вычисляет площадь полигона в квадратных метрах.
 * @param {L.LatLng[]} latlngs - Координаты точек полигона.
 * @returns {number} Площадь полигона в квадратных метрах.
 */
function calculatePolygonArea(latlngs) {
  if (latlngs.length < 3) return 0;
  
  let area = 0;
  const R = 6371000; // Радиус Земли в метрах
  
  for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
    const lat1 = latlngs[j].lat * Math.PI / 180;
    const lat2 = latlngs[i].lat * Math.PI / 180;
    const dLon = (latlngs[i].lng - latlngs[j].lng) * Math.PI / 180;
    area += (latlngs[j].lng - latlngs[i].lng) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = area * R * R / 2;
  return Math.abs(area);
}

export { setupMapHandlers, addMarker, addLinePoint, addPolygonPoint, finishDrawing, resetDrawing, exportToGeoJSON, importFromGeoJSON, calculateLineLength, calculatePolygonArea };