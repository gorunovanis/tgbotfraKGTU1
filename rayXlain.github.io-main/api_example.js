/**
 * Пример API для работы с базой данных MySQL (Node.js)
 * FitHealth39 Backend API
 */

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Конфигурация базы данных
const dbConfig = {
    host: 'localhost',
    user: 'root', // Измените на вашего пользователя
    password: '', // Укажите пароль
    database: 'kuzbassmeg',
    charset: 'utf8mb4'
};

// Создание пула соединений
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ============================================
// Middleware для проверки авторизации
// ============================================
async function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    
    try {
        const [sessions] = await pool.execute(
            'SELECT user_id FROM user_sessions WHERE session_token = ? AND expires_at > NOW()',
            [token]
        );
        
        if (sessions.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        req.userId = sessions[0].user_id;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// ============================================
// API Endpoints
// ============================================

/**
 * Регистрация пользователя
 * POST /api/register
 */
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'CALL sp_register_user(?, ?)',
            [email, passwordHash]
        );
        
        const user = result[0][0];
        
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Email already exists' });
        } else {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

/**
 * Вход пользователя
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Получаем пользователя
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Обновляем last_login
        await pool.execute('CALL sp_login_user(?)', [email]);
        
        // Создаем сессию
        const sessionToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        await pool.execute(
            'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
            [user.id, sessionToken, expiresAt]
        );
        
        // Получаем обновленные данные
        const [updatedUsers] = await pool.execute(
            'CALL sp_get_user_data(?)',
            [user.id]
        );
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                health_group: updatedUsers[0][0].health_group,
                last_login: updatedUsers[0][0].last_login
            },
            session_token: sessionToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * Сохранение группы здоровья
 * POST /api/save-health-group
 */
app.post('/api/save-health-group', authenticateUser, async (req, res) => {
    try {
        const { health_group } = req.body;
        const userId = req.userId;
        
        if (!health_group || !['II', 'III'].includes(health_group)) {
            return res.status(400).json({ error: 'Invalid health group' });
        }
        
        const [result] = await pool.execute(
            'CALL sp_save_health_group(?, ?)',
            [userId, health_group]
        );
        
        const user = result[0][0];
        
        res.json({
            success: true,
            user: {
                id: user.id,
                health_group: user.health_group,
                health_group_updated_at: user.health_group_updated_at
            }
        });
    } catch (error) {
        console.error('Save health group error:', error);
        res.status(500).json({ error: 'Failed to save health group' });
    }
});

/**
 * Получение данных пользователя
 * GET /api/user/:id
 */
app.get('/api/user/:id', authenticateUser, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Проверяем, что пользователь запрашивает свои данные
        if (userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const [result] = await pool.execute('CALL sp_get_user_data(?)', [userId]);
        const user = result[0][0];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Убираем пароль из ответа
        delete user.password_hash;
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

/**
 * Получение статистики по группам здоровья
 * GET /api/health-group-stats
 */
app.get('/api/health-group-stats', async (req, res) => {
    try {
        const [stats] = await pool.query('SELECT * FROM v_health_group_stats');
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * Получение истории группы здоровья пользователя
 * GET /api/user/:id/health-history
 */
app.get('/api/user/:id/health-history', authenticateUser, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const [history] = await pool.execute(
            'SELECT * FROM health_group_history WHERE user_id = ? ORDER BY selected_at DESC LIMIT 50',
            [userId]
        );
        
        res.json({ success: true, history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});
