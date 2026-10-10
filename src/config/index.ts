import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BOT_TOKEN || !process.env.GEMINI_API_KEY || !process.env.DATABASE_URL) {
    console.warn("DIQQAT: .env faylida kerakli kalitlar to'liq kiritilmagan!");
}

export const config = {
    botToken: process.env.BOT_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    adminId: process.env.ADMIN_ID || '',
};
