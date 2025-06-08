const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'map4.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err);
        return;
    }
    console.log('Подключено к базе данных:', dbPath);
});

const invalidNames = ['11', 'undefined_11', '123', '352345', '1233'];
const placeholders = invalidNames.map(() => '?').join(',');
const query = `DELETE FROM MapObjects WHERE name IN (${placeholders})`;

db.run(query, invalidNames, function(err) {
    if (err) {
        console.error('Ошибка при удалении некорректных объектов из MapObjects:', err);
    } else {
        console.log('Некорректные объекты удалены из MapObjects. Удалено строк:', this.changes);
    }
    db.close((err) => {
        if (err) {
            console.error('Ошибка при закрытии базы данных:', err);
        } else {
            console.log('Соединение с базой данных закрыто.');
        }
    });
});
