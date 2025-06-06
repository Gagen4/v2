-- Создание базы данных
CREATE DATABASE map4;
GO
USE map4;
GO

-- Создание таблицы пользователей
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Создание таблицы объектов карты
CREATE TABLE MapObjects (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    coordinates NVARCHAR(MAX) NOT NULL,
    properties NVARCHAR(MAX),
    created_by INT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (created_by) REFERENCES Users(id)
);

-- Создание индексов
CREATE INDEX idx_mapobjects_type ON MapObjects(type);
CREATE INDEX idx_users_username ON Users(username); 