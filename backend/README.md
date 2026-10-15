# SasaPay POC - Node backend

1. Stop the PHP server (same port 8000)
2. cp .env.example .env   (Windows: copy .env.example .env) and fill in your keys
3. npm install
4. npm start
5. ngrok http 8000 (update CALLBACK_URL if the URL changed, then restart)
6. In ../frontend run: npm run dev  -> http://localhost:5173
