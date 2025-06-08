const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем соединение с базой данных
const db = new sqlite3.Database(path.join(__dirname, 'map4.db'), (err) => {
    if (err) {
        console.error('Ошибка при открытии базы данных:', err);
        return;
    }
    console.log('База данных успешно открыта');
});

// Функция для вывода содержимого таблицы
function displayTable(tableName) {
    return new Promise((resolve, reject) => {
        console.log(`\n=== Содержимое таблицы ${tableName} ===`);
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) {
                console.error(`Ошибка при чтении таблицы ${tableName}:`, err);
                reject(err);
                return;
            }
            console.log(JSON.stringify(rows, null, 2));
            resolve();
        });
    });
}

// Функция для вывода структуры таблицы
function displayTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        console.log(`\n=== Структура таблицы ${tableName} ===`);
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) {
                console.error(`Ошибка при чтении структуры таблицы ${tableName}:`, err);
                reject(err);
                return;
            }
            console.log(JSON.stringify(rows, null, 2));
            resolve();
        });
    });
}

// Основная функция
async function displayDatabase() {
    try {
        // Получаем список всех таблиц
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(row => row.name));
            });
        });

        console.log('Список таблиц в базе данных:', tables);

        // Для каждой таблицы выводим структуру и содержимое
        for (const table of tables) {
            await displayTableStructure(table);
            await displayTable(table);
        }
    } catch (error) {
        console.error('Ошибка при отображении базы данных:', error);
    } finally {
        // Закрываем соединение с базой данных
        db.close((err) => {
            if (err) {
                console.error('Ошибка при закрытии базы данных:', err);
            } else {
                console.log('\nСоединение с базой данных закрыто');
            }
        });
    }
}

// Запускаем отображение базы данных
displayDatabase(); 