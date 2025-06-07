const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('map4.db');

// Получаем список таблиц
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Ошибка при получении списка таблиц:', err);
        return;
    }

    // Для каждой таблицы выводим содержимое
    tables.forEach(table => {
        console.log(`\n=== Таблица: ${table.name} ===`);
        db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
            if (err) {
                console.error(`Ошибка при чтении таблицы ${table.name}:`, err);
                return;
            }
            console.log(JSON.stringify(rows, null, 2));
        });
    });
});

// Закрываем соединение через 2 секунды
setTimeout(() => {
    db.close();
}, 2000); 