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

db.run('DELETE FROM files', [], function(err) {
    if (err) {
        console.error('Ошибка при очистке таблицы files:', err);
    } else {
        console.log('Все записи из таблицы files удалены. Удалено строк:', this.changes);
    }
    db.close((err) => {
        if (err) {
            console.error('Ошибка при закрытии базы данных:', err);
        } else {
            console.log('Соединение с базой данных закрыто.');
        }
    });
}); 