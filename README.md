# Multidatasoure Frontend

Front-end интерфейс для демонстрационного CRM-сервиса из репозитория [multidatasoure](https://github.com/AntonTupikin/multidatasoure).

## Стек

- [Next.js 15](https://nextjs.org/) + TypeScript
- Tailwind CSS
- Axios для работы с API

## Запуск

```bash
npm install
npm run dev
```

Приложение доступно по адресу http://localhost:3000.

Для указания адреса бэкенда используйте переменную окружения `NEXT_PUBLIC_API_URL` (по умолчанию `http://localhost:8080`).

## Функциональность

- Регистрация и авторизация пользователей
- Просмотр информации о текущем пользователе
- Создание организации
- Просмотр списка пользователей (для администратора)
