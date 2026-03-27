const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// 毎日午前0時（日本時間）に古いランキングデータを削除
exports.cleanupOldRankings = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const db = admin.database();
    const modes = ['normal', 'hard', 'superhard'];
    
    // 今日の日付を取得
    const today = new Date();
    const todayStr = formatDate(today);
    
    console.log(`Cleanup started at ${todayStr}`);
    
    for (const mode of modes) {
      try {
        const rankingsRef = db.ref(`rankings/${mode}`);
        const snapshot = await rankingsRef.once('value');
        
        if (!snapshot.exists()) {
          console.log(`No data for mode: ${mode}`);
          continue;
        }
        
        const dates = Object.keys(snapshot.val());
        let deletedCount = 0;
        
        for (const date of dates) {
          // 今日以外のデータを削除
          if (date !== todayStr) {
            await rankingsRef.child(date).remove();
            deletedCount++;
            console.log(`Deleted ${mode}/${date}`);
          }
        }
        
        console.log(`Mode ${mode}: Deleted ${deletedCount} old date(s)`);
      } catch (error) {
        console.error(`Error cleaning up ${mode}:`, error);
      }
    }
    
    console.log('Cleanup completed');
    return null;
  });

// 日付をYYYY-MM-DD形式にフォーマット
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
