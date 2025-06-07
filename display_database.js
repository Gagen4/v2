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

// Получаем список всех таблиц в базе данных
db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
    if (err) {
        console.error('Ошибка при получении списка таблиц:', err);
        db.close();
        return;
    }
    console.log('Таблицы в базе данных:', tables.map(t => t.name));
    
    // Для каждой таблицы выводим её содержимое
    tables.forEach((table) => {
        console.log(`\nСодержимое таблицы ${table.name}:`);
        db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
            if (err) {
                console.error(`Ошибка при получении данных из таблицы ${table.name}:`, err);
            } else {
                if (rows.length === 0) {
                    console.log(`Таблица ${table.name} пуста.`);
                } else {
                    console.log(rows);
                }
            }
        });
    });
    
    // Закрываем соединение после выполнения всех запросов
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('Ошибка при закрытии базы данных:', err);
            } else {
                console.log('Соединение с базой данных закрыто.');
            }
        });
    }, 2000); // Даем время на выполнение всех запросов
}); 