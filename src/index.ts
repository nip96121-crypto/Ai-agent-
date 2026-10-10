import { config } from './config';
import { bot } from './bot';
import { startScheduler } from './jobs/scheduler';
import express from 'express';

async function bootstrap() {
    console.log('🚀 AI Task Bot is starting...');
    
    // Express server to keep Render service alive
    const app = express();
    app.get('/', (req, res) => res.send('Bot is running!'));
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`✅ Web server is listening on port ${port}`);
        
        // Render server uxlab qolmasligi uchun har 14 daqiqada o'z-o'zini ping qilish
        const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
        setInterval(async () => {
            try {
                // Axios yordamida o'zimizning serverga so'rov yuboramiz
                const axios = require('axios');
                await axios.get(url);
                console.log(`✅ Serverni uyg'oq ushlash uchun ping yuborildi: ${url}`);
            } catch (err: any) {
                console.error(`❌ Ping yuborishda xatolik:`, err.message);
            }
        }, 14 * 60 * 1000); // 14 daqiqa
    });

    // Cron scheduler-ni ishga tushirish
    startScheduler();
    console.log('✅ Cron scheduler started');

    // Telegram botni ishga tushirish
    await bot.launch();
    console.log('✅ Telegram bot successfully started!');

    // Dastur to'xtatilganda to'g'ri yopish (Graceful shutdown)
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('❌ Error starting bot:', err);
});
