const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем соединение с базой данных
const db = new sqlite3.Database(path.join(__dirname, 'map4.db'), sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Ошибка при открытии базы данных:', err);
        process.exit(1);
    }
    console.log('База данных успешно открыта');
});

// Функция для получения информации о таблице
function getTableInfo(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Функция для получения данных из таблицы
function getTableData(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Основная функция
async function showDatabaseInfo() {
    try {
        // Получаем список таблиц
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });

        console.log('\nСписок таблиц в базе данных:', tables);

        // Для каждой таблицы выводим информацию
        for (const table of tables) {
            console.log(`\n=== Таблица: ${table} ===`);
            
            // Получаем структуру таблицы
            const structure = await getTableInfo(table);
            console.log('\nСтруктура таблицы:');
            console.log(JSON.stringify(structure, null, 2));

            // Получаем данные таблицы
            const data = await getTableData(table);
            console.log('\nДанные таблицы:');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Ошибка при получении информации о базе данных:', error);
    } finally {
        // Закрываем соединение
        db.close((err) => {
            if (err) {
                console.error('Ошибка при закрытии базы данных:', err);
            } else {
                console.log('\nСоединение с базой данных закрыто');
            }
        });
    }
}

// Запускаем функцию
showDatabaseInfo(); 