import cron from 'node-cron';
import { prisma } from '../database';
import { bot } from '../bot';

export function startScheduler() {
    // Har daqiqada ishga tushadi
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // Hozirgi vaqtdan 15 daqiqa keyingi vaqtni olamiz
            const targetTime = new Date(now.getTime() + 15 * 60000); 

            // Bajarilmagan, eslatilmagan va muddati tugashiga 15 daqiqadan kam qolgan yoki vaqti kelgan vazifalar
            const dueTasks = await prisma.task.findMany({
                where: {
                    isCompleted: false,
                    notified: false,
                    dueDate: {
                        lte: targetTime,
                        not: null
                    }
                },
                include: {
                    user: true
                }
            });

            for (const task of dueTasks) {
                // Foydalanuvchiga xabar yuborish
                const message = `🔔 **ESLATMA!**\n\n📌 Vazifa: ${task.title}\n📝 Tavsif: ${task.description || "Yo'q"}\n⏰ Bajarish vaqti: ${task.dueDate?.toLocaleString('uz-UZ')}`;
                
                try {
                    await bot.telegram.sendMessage(task.user.telegramId.toString(), message, { parse_mode: 'Markdown' });
                    
                    // Bazada vazifani notified = true qilib qo'yish
                    await prisma.task.update({
                        where: { id: task.id },
                        data: { notified: true }
                    });
                } catch (sendError) {
                    console.error(`Foydalanuvchiga eslatma yuborishda xatolik (User ID: ${task.user.telegramId}):`, sendError);
                }
            }
        } catch (error) {
            console.error('Cron job xatoligi:', error);
        }
    });
}
