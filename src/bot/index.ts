import { Telegraf } from 'telegraf';
import axios from 'axios';
import { config } from '../config';
import { GeminiService } from '../services/gemini.service';
import { prisma } from '../database';

export const bot = new Telegraf(config.botToken);

// O'rta darajadagi xatolarni ushlab qolish
bot.catch((err, ctx) => {
    console.error(`Bot Error for ${ctx.updateType}:`, err);
});



bot.start(async (ctx) => {
    const telegramId = ctx.from.id;
    const username = ctx.from.username;

    try {
        // Foydalanuvchini bazaga qo'shish yoki yangilash
        await prisma.user.upsert({
            where: { telegramId: BigInt(telegramId) },
            update: { username },
            create: { telegramId: BigInt(telegramId), username },
        });

        await ctx.reply("Assalomu alaykum! Menga vazifalaringizni ovozli xabar orqali yuboring. Men ularni tushunib, rejalashtirib qo'yaman va vaqti kelganda eslataman.");
    } catch (e) {
        console.error(e);
        await ctx.reply("Xatolik yuz berdi. Iltimos qayta /start bosing.");
    }
});

bot.on('voice', async (ctx) => {
    try {
        const loadingMsg = await ctx.reply('⏳ Ovozli xabar tahlil qilinmoqda, kuting...');
        const fileId = ctx.message.voice.file_id;
        
        // Telegramdan fayl URL-ni olish
        const fileLink = await ctx.telegram.getFileLink(fileId);
        
        // Faylni xotiraga (buffer) yuklab olish
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(response.data);
        const base64Audio = audioBuffer.toString('base64');

        // Gemini orqali tahlil qilish
        const tasks = await GeminiService.processAudioToTasks(base64Audio, ctx.message.voice.mime_type);

        if (tasks.length === 0) {
            return await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, 'Hech qanday vazifa topilmadi.');
        }

        // Bazaga foydalanuvchi orqali vazifalarni saqlash
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
        if (!user) throw new Error("Foydalanuvchi topilmadi. Iltimos /start tugmasini bosing.");

        for (const task of tasks) {
            await prisma.task.create({
                data: {
                    userId: user.id,
                    title: task.title,
                    description: task.description,
                    dueDate: task.due_date ? new Date(task.due_date) : null,
                }
            });
        }

        // Javob qaytarish
        const replyText = tasks.map((t, i) => `${i + 1}. 📌 *${t.title}*\n📝 ${t.description || "Tavsif yo'q"}\n⏰ Vaqt: ${t.due_date ? new Date(t.due_date).toLocaleString('uz-UZ') : 'Belgilanmagan'}`).join('\n\n');
        
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, `✅ Quyidagi vazifalar saqlandi:\n\n${replyText}`, { parse_mode: 'Markdown' });

    } catch (error: any) {
        console.error('Ovozli xabarni ishlashda xatolik:', error);
        await ctx.reply(`❌ Xatolik yuz berdi: ${error.message || error}`);
    }
});
