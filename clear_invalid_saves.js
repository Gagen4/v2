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

// Проверяем структуру таблицы files
db.all('PRAGMA table_info(files)', [], (err, rows) => {
    if (err) {
        console.error('Ошибка при проверке структуры таблицы files:', err);
        db.close();
        return;
    }
    console.log('Структура таблицы files:', rows);
    
    // Используем столбец file_name
    const columnName = 'file_name';
    
    const invalidFileNames = ['11', 'undefined_11', '123', '352345', '1233'];
    const placeholders = invalidFileNames.map(() => '?').join(',');
    const query = `DELETE FROM files WHERE ${columnName} IN (${placeholders})`;
    
    db.run(query, invalidFileNames, function(err) {
        if (err) {
            console.error('Ошибка при удалении файлов с некорректными данными:', err);
        } else {
            console.log('Файлы с некорректными данными удалены. Удалено строк:', this.changes);
        }
        db.close((err) => {
            if (err) {
                console.error('Ошибка при закрытии базы данных:', err);
            } else {
                console.log('Соединение с базой данных закрыто.');
            }
        });
    });
}); 