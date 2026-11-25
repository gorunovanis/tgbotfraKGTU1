/**
 * Подключение к базе данных MySQL (Node.js)
 * База данных: kuzbassmeg
 * Хост: localhost
 */

const mysql = require('mysql2/promise');

// Конфигурация подключения
const dbConfig = {
    host: 'localhost',
    user: 'root', // Измените на вашего пользователя
    password: '', // Укажите пароль
    database: 'kuzbassmeg',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Создание пула соединений
let pool = null;

/**
 * Получение пула соединений (singleton)
 * @returns {Promise<mysql.Pool>}
 */
function getDBPool() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
        
        // Обработка ошибок пула
        pool.on('error', (err) => {
            console.error('Database pool error:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                pool = null; // Пересоздадим пул при следующем запросе
            }
        });
    }
    
    return pool;
}

/**
 * Выполнение запроса
 * @param {string} query - SQL запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise}
 */
async function query(query, params = []) {
    try {
        const pool = getDBPool();
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Проверка подключения к базе данных
 * @returns {Promise<boolean>}
 */
async function checkConnection() {
    try {
        const pool = getDBPool();
        await pool.execute('SELECT 1');
        return true;
    } catch (error) {
        console.error('Connection check failed:', error);
        return false;
    }
}

/**
 * Закрытие всех соединений
 */
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// Пример использования:
// const users = await query('SELECT * FROM users WHERE id = ?', [1]);
// await checkConnection();

module.exports = {
    getDBPool,
    query,
    checkConnection,
    closePool
};
