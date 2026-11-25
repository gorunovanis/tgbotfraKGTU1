"""
Подключение к базе данных MySQL (Python)
База данных: kuzbassmeg
Хост: localhost
"""

import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация подключения
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',  # Измените на вашего пользователя
    'password': '',  # Укажите пароль
    'database': 'kuzbassmeg',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
    'autocommit': False
}

# Конфигурация пула соединений
POOL_CONFIG = {
    'pool_name': 'kuzbassmeg_pool',
    'pool_size': 10,
    'pool_reset_session': True,
    **DB_CONFIG
}

# Глобальный пул соединений
_connection_pool = None


def get_connection_pool():
    """Получение пула соединений (singleton)"""
    global _connection_pool
    
    if _connection_pool is None:
        try:
            _connection_pool = pooling.MySQLConnectionPool(**POOL_CONFIG)
            logger.info("Database connection pool created")
        except mysql.connector.Error as err:
            logger.error(f"Error creating connection pool: {err}")
            raise
    
    return _connection_pool


@contextmanager
def get_connection():
    """Контекстный менеджер для получения соединения из пула"""
    pool = get_connection_pool()
    
    try:
        connection = pool.get_connection()
        yield connection
        connection.commit()
    except mysql.connector.Error as err:
        logger.error(f"Database error: {err}")
        if 'connection' in locals():
            connection.rollback()
        raise
    finally:
        if 'connection' in locals() and connection.is_connected():
            connection.close()


def execute_query(query, params=None, fetch=True):
    """
    Выполнение SQL запроса
    
    Args:
        query: SQL запрос
        params: Параметры запроса (кортеж или список)
        fetch: Получить результат (True) или только выполнить (False)
    
    Returns:
        Результат запроса или None
    """
    with get_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute(query, params or ())
            
            if fetch:
                result = cursor.fetchall()
                return result
            else:
                return cursor.rowcount
        finally:
            cursor.close()


def check_connection():
    """Проверка подключения к базе данных"""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return True
    except Exception as e:
        logger.error(f"Connection check failed: {e}")
        return False


# Пример использования:
# users = execute_query("SELECT * FROM users WHERE id = %s", (1,))
# execute_query("INSERT INTO users (email, password_hash) VALUES (%s, %s)", 
#               ('test@example.com', 'hash'), fetch=False)
