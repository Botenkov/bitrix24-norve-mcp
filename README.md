# Bitrix24 NORVE — MCP Server

MCP-сервер для подключения Claude к Bitrix24 NORVE (b24-5dx2y0.bitrix24.eu).

## Деплой на Railway

### 1. Загрузить файлы на GitHub
Создай репозиторий и загрузи все 3 файла:
- `server.js`
- `package.json`
- `railway.json`

### 2. Развернуть на Railway
1. Зайди на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Выбери репозиторий
4. Railway автоматически определит Node.js и запустит

### 3. Переменные окружения (опционально)
В Railway → Variables добавь:
```
BITRIX_WEBHOOK=https://b24-5dx2y0.bitrix24.eu/rest/1/4cjga9783436rxem/
```
*(уже прописан в коде как default, но лучше вынести в env)*

### 4. Получить URL
После деплоя Railway даст URL вида:
```
https://bitrix24-norve-mcp-production.up.railway.app
```

### 5. Подключить в Claude.ai
Settings → Integrations → Add MCP Server:
- **Name:** Bitrix24 NORVE
- **URL:** `https://your-railway-url.up.railway.app/sse`

## Инструменты (tools)

| Tool | Описание |
|------|----------|
| `norve_validate` | Проверка связи |
| `norve_task_create` | Создать задачу |
| `norve_task_list` | Список задач |
| `norve_task_update` | Обновить задачу |
| `norve_deal_create` | Создать сделку |
| `norve_deal_list` | Список сделок |
| `norve_deal_update` | Обновить сделку |
| `norve_lead_create` | Создать лид |
| `norve_lead_list` | Список лидов |
| `norve_contact_create` | Создать контакт |
| `norve_users_list` | Список пользователей |
| `norve_deal_stages` | Стадии воронки |
| `norve_pipelines_list` | Список воронок |
