const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const app = express();
const port = 3000;

const db = require('./models/db');

// Middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Middleware для проверки JWT
async function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Требуется аутентификация' });

    try {
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const decoded = jwt.verify(token, secret);
        const user = await db.getUserByEmail(decoded.email);
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        req.user = { id: user.id, email: user.email, isAdmin: user.role === 'admin' };
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return res.status(403).json({ error: 'Недействительный токен' });
    }
}

// Middleware для проверки прав администратора
function isAdmin(req, res, next) {
    if (!req.user.isAdmin && req.user.email !== 'admin') {
        console.log('Доступ запрещен для пользователя:', req.user.email);
        return res.status(403).json({ error: 'Требуются права администратора' });
    }
    console.log('Доступ администратора разрешен для:', req.user.email);
    next();
}

// Регистрация
app.post('/register', async (req, res) => {
    console.log('Запрос на регистрацию получен:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
        console.log('Ошибка: отсутствует email или пароль');
        return res.status(400).json({ error: 'Требуются email и пароль' });
    }

    // Проверка действительности email с помощью quickemailverification
    try {
        console.log('Проверка действительности email...');
        const quickemailverification = require('quickemailverification').client('API_KEY').quickemailverification(); // Замените API_KEY на ваш ключ API
        const verificationResult = await new Promise((resolve, reject) => {
            quickemailverification.verify(email, function (err, response) {
                if (err) {
                    reject(err);
                } else {
                    resolve(response.body);
                }
            });
        });

        if (!verificationResult.result || verificationResult.result !== 'valid') {
            console.log('Недействительный email:', email);
            // Теперь не возвращаем ошибку, а просто логируем
            // return res.status(400).json({ error: 'Недействительный email-адрес' });
        } else {
            console.log('Email действителен:', email);
        }
    } catch (error) {
        console.error('Ошибка проверки email:', error);
        // Можно решить, продолжать ли регистрацию при ошибке проверки
        // В данном случае продолжаем, но логируем ошибку
    }

    try {
        console.log('Проверка существующего пользователя...');
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            console.log('Пользователь уже существует:', email);
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        console.log('Хеширование пароля...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Создание нового пользователя...');
        const userId = await db.createUserByEmail(email, hashedPassword);
        // Устанавливаем роль student для новых пользователей
        await db.updateUserRole(userId, 'student');
        
        console.log('Генерация JWT токена...');
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const token = jwt.sign({ email }, secret, { expiresIn: '24h' });
        
        console.log('Установка cookie...');
        res.cookie('token', token, { 
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        });
        console.log('Отправка успешного ответа...');
        res.json({ message: 'Регистрация успешна', email });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/login', async (req, res) => {
    console.log('Запрос на вход получен:', req.body);
    const { email, password } = req.body;

    try {
        console.log('Поиск пользователя...');
        const user = await db.getUserByEmail(email);
        if (!user) {
            console.log('Пользователь не найден:', email);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        console.log('Проверка пароля...');
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Неверный пароль для пользователя:', email);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        console.log('Обновление времени последнего входа...');
        await db.updateUserLastLogin(user.id);

        console.log('Генерация JWT токена...');
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const token = jwt.sign({ email }, secret, { expiresIn: '24h' });
        
        console.log('Установка cookie...');
        res.cookie('token', token, { 
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log('Отправка успешного ответа...');
        res.json({ 
            message: 'Вход выполнен успешно', 
            email,
            isAdmin: user.role === 'admin'
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Сохранение GeoJSON
app.post('/save', authenticateToken, async (req, res) => {
    const { fileName, geojsonData } = req.body;
    const { id: userId } = req.user;

    if (!fileName || !geojsonData) {
        return res.status(400).json({ error: 'Имя файла и данные обязательны' });
    }

    try {
        await db.saveMapObject(
            userId,
            fileName,
            geojsonData.type || 'FeatureCollection',
            geojsonData.features || geojsonData,
            {}
        );
        
        res.json({ message: 'Сохранено успешно' });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка GeoJSON
app.get('/load/:fileName', authenticateToken, async (req, res) => {
    const { fileName } = req.params;
    const { id: userId } = req.user;

    try {
        const mapObject = await db.getMapObjectByName(userId, fileName);
        if (!mapObject) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const geojsonData = {
            type: mapObject.type,
            features: mapObject.coordinates
        };

        res.json(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Список файлов
app.get('/files', authenticateToken, async (req, res) => {
    const { id: userId } = req.user;
    
    try {
        const mapObjects = await db.getMapObjectsByUser(userId);
        const files = mapObjects.map(obj => obj.name);
        res.json(files);
    } catch (error) {
        console.error('Ошибка получения списка файлов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка всех файлов (для админа)
app.get('/admin/files', authenticateToken, isAdmin, async (req, res) => {
    console.log('Запрос списка всех файлов от администратора:', req.user.email);
    try {
        const allFiles = await db.getAllMapObjects();
        const files = allFiles.map(file => ({
            email: file.email,
            fileName: file.name,
            createdAt: file.created_at
        }));
        console.log('Список файлов успешно отправлен администратору');
        res.json(files);
    } catch (error) {
        console.error('Ошибка получения списка файлов для админа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка файла любого пользователя (для админа)
app.get('/admin/load/:email/:fileName', authenticateToken, isAdmin, async (req, res) => {
    const { email, fileName } = req.params;

    try {
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const mapObject = await db.getMapObjectByName(user.id, fileName);
        if (!mapObject) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const geojsonData = {
            type: mapObject.type,
            features: mapObject.coordinates
        };

        res.json(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение информации о текущем пользователе
app.get('/user/info', authenticateToken, (req, res) => {
    res.json({
        email: req.user.email,
        isAdmin: req.user.isAdmin
    });
});

// Выход из системы
app.post('/logout', (req, res) => {
    console.log('Запрос на выход из системы получен');
    res.clearCookie('token', {
        httpOnly: false,
        secure: false,
        sameSite: 'none',
        path: '/'
    });
    res.json({ message: 'Выход выполнен успешно' });
    console.log('Cookie токен очищен, выход выполнен');
});

// Проверка существования email через API QuickEmailVerification
app.get('/verify-email', async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ error: 'Email обязателен' });
    }

    try {
        console.log('Проверка email через API:', email);
        const quickemailverification = require('quickemailverification').client('ef2daf6f600fa70684ae72d405e822042a47b06b4de528a9a17c8f5351df').quickemailverification();
        
        quickemailverification.verify(email, function(err, response) {
            if (err) {
                console.error('Ошибка при проверке email через API:', err);
                return res.status(500).json({ error: 'Ошибка проверки email', details: err.message });
            }
            
            const result = response.body;
            console.log('Результат проверки email:', result);
            res.json({ exists: result.result === 'valid' });
        });
    } catch (error) {
        console.error('Ошибка при проверке email через API:', error);
        res.status(500).json({ error: 'Ошибка проверки email', details: error.message });
    }
});

// Временный endpoint для обновления роли пользователя на admin (для начальной настройки)
app.get('/admin/set-role', authenticateToken, isAdmin, async (req, res) => {
    const { email, role } = req.query;
    if (!email || !role) {
        return res.status(400).json({ error: 'Email и роль обязательны' });
    }

    try {
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await db.updateUserRole(user.id, role);
        res.json({ message: `Роль пользователя ${email} обновлена на ${role}` });
    } catch (error) {
        console.error('Ошибка при обновлении роли:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Временный endpoint для проверки количества пользователей без email (для отладки)
app.get('/admin/check-users-without-email', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { runQuery } = require('./config/database');
        const usersWithoutEmail = await runQuery('SELECT id, username FROM Users WHERE email IS NULL OR email = ""');
        res.json({ count: usersWithoutEmail.length, users: usersWithoutEmail });
    } catch (error) {
        console.error('Ошибка при проверке пользователей без email:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка всех пользователей (для админа)
app.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    console.log('Запрос списка всех пользователей от администратора:', req.user.email);
    try {
        const { runQuery } = require('./config/database');
        const allUsers = await runQuery('SELECT id, email, role FROM Users WHERE email IS NOT NULL AND email != ""');
        console.log('Список пользователей успешно отправлен администратору');
        res.json(allUsers.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role || 'student'
        })));
    } catch (error) {
        console.error('Ошибка получения списка пользователей для админа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Email Verification
app.post('/verify-email', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        var quickemailverification = require('quickemailverification').client('API_KEY').quickemailverification(); // Replace API_KEY with your API Key

        quickemailverification.verify(email, function (err, response) {
            if (err) {
                console.error('Email verification error:', err);
                return res.status(500).json({ error: 'Verification failed' });
            }
            // Print response object
            console.log(response.body);
            res.json({ message: 'Email verification result', result: response.body });
        });
    } catch (error) {
        console.error('Server error during email verification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, async () => {
    console.log(`Сервер запущен на порту ${port}`);
    
    // Проверка подключения к базе данных
    try {
        const { runQuery } = require('./config/database');
        const result = await runQuery('SELECT 1 as test');
        console.log('Успешное подключение к базе данных SQLite!');
        
        // Временный код для установки роли admin для пользователя gagenik257@gmail.com
        try {
            const adminUser = await db.getUserByEmail('gagenik257@gmail.com');
            if (adminUser && adminUser.role !== 'admin') {
                await db.updateUserRole(adminUser.id, 'admin');
                console.log('Роль пользователя gagenik257@gmail.com обновлена на admin');
            } else if (adminUser) {
                console.log('Пользователь gagenik257@gmail.com уже имеет роль admin');
            } else {
                console.log('Пользователь gagenik257@gmail.com не найден в базе данных');
            }
        } catch (error) {
            console.error('Ошибка при установке роли admin для gagenik257@gmail.com:', error);
        }
    } catch (error) {
        console.error('Ошибка подключения к базе данных при старте сервера:', error);
        console.error('Код ошибки:', error.code);
        if (error.originalError) {
            console.error('Оригинальная ошибка:', error.originalError);
        }
    }
});