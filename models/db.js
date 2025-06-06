const { runQuery, run } = require('../config/database');

// Операции с пользователями
async function createUser(username, hashedPassword) {
    const result = await run(
        'INSERT INTO Users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
    );
    return result.id;
}

async function createUserByEmail(email, hashedPassword) {
    const result = await run(
        'INSERT INTO Users (email, username, password) VALUES (?, ?, ?)',
        [email, email, hashedPassword]
    );
    return result.id;
}

async function getUserByUsername(username) {
    const rows = await runQuery(
        'SELECT * FROM Users WHERE username = ?',
        [username]
    );
    return rows[0];
}

async function getUserByEmail(email) {
    const rows = await runQuery(
        'SELECT * FROM Users WHERE email = ?',
        [email]
    );
    return rows[0];
}

async function updateUserLastLogin(userId) {
    await run(
        'UPDATE Users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
    );
}

async function updateUserRole(userId, role) {
    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    return await runQuery(sql, [role, userId]);
}

// Операции с объектами карты
async function saveMapObject(userId, name, type, coordinates, properties) {
    const result = await run(
        'INSERT INTO MapObjects (name, type, coordinates, properties, created_by) VALUES (?, ?, ?, ?, ?)',
        [name, type, JSON.stringify(coordinates), JSON.stringify(properties), userId]
    );
    return result.id;
}

async function getMapObjectsByUser(userId) {
    const rows = await runQuery(
        'SELECT * FROM MapObjects WHERE created_by = ?',
        [userId]
    );
    return rows;
}

async function getMapObjectByName(userId, name) {
    const rows = await runQuery(
        'SELECT * FROM MapObjects WHERE created_by = ? AND name = ?',
        [userId, name]
    );
    return rows[0];
}

async function getAllMapObjects() {
    const rows = await runQuery(
        'SELECT m.*, u.username FROM MapObjects m JOIN Users u ON m.created_by = u.id'
    );
    return rows;
}

module.exports = {
    createUser,
    createUserByEmail,
    getUserByUsername,
    getUserByEmail,
    updateUserLastLogin,
    updateUserRole,
    saveMapObject,
    getMapObjectsByUser,
    getMapObjectByName,
    getAllMapObjects
}; 