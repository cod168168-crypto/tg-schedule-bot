// ==========================================
// 全域變數設定
// ==========================================
const BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
const CHAT_ID = "YOUR_TELEGRAM_CHAT_ID";

// 固定的 5 個緊急任務設定
const EMERGENCY_TASKS = [
  "應門",
  "重開機 ( 含主管 )",
  "緊急代碼> 飛機及APP群",
  "聯繫主管",
  "藏手機+刪除APP"
];

// ==========================================
// 1. 每月 10 號 09:00 特定月份任務提醒檢查
// ==========================================
function checkAndSendMonthlyTasks() {
  deleteTriggerByName("checkAndSendMonthlyTasks");
  
  let tomorrow900 = new Date();
  tomorrow900.setDate(tomorrow900.getDate() + 1);
  tomorrow900.setHours(9, 0, 0, 0);
  ScriptApp.newTrigger("checkAndSendMonthlyTasks").timeBased().at(tomorrow900).create();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();
  
  if (currentDate === 10) {
    if ([1, 4, 7, 10].indexOf(currentMonth) !== -1) {
      sendPureTextMessage(BOT_TOKEN, CHAT_ID, "1月/4月/7月/10月任務:考逼逼逼");
    }
    if ([1, 5, 9].indexOf(currentMonth) !== -1) {
      sendPureTextMessage(BOT_TOKEN, CHAT_ID, "1月/5月/9月任務:技術進度追蹤");
    }
  }
}

// ==========================================
// 2. 每天早上 07:30 自動發送緊急任務表單
// ==========================================
function sendDailyEmergencyTasks() {
  deleteTriggerByName("sendDailyEmergencyTasks");
  
  let tomorrow730 = new Date();
  tomorrow730.setDate(tomorrow730.getDate() + 1);
  tomorrow730.setHours(7, 30, 0, 0);
  ScriptApp.newTrigger("sendDailyEmergencyTasks").timeBased().at(tomorrow730).create();
  
  let textLines = ["緊急狀況 負責項目："];
  let keyboard = [];
  
  EMERGENCY_TASKS.forEach(function(task, index) {
    textLines.push("☐ " + task + "：");
    keyboard.push([{
      "text": task + " 選擇",
      "callback_data": "TASK_" + index + "_0_none"
    }]);
  });
  
  keyboard.push([{
    "text": "隱藏資訊-請勿點擊",
    "callback_data": "TASK_INIT"
  }]);
  
  sendTelegramMessageWithKeyboard(BOT_TOKEN, CHAT_ID, textLines.join("\n"), keyboard);
}

// ==========================================
// 3. 【恢復最初版本】每天早上 08:00 客服名單
// ==========================================
function sendYesterdayActiveStaff() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  if (sheets.length < 2) return;
  
  const sheet = sheets[1]; 
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayString = yesterday.getFullYear() + "/" + (yesterday.getMonth() + 1) + "/" + yesterday.getDate();
  
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 4) return;
  
  const dates = sheet.getRange(4, 1, lastRow - 3, 1).getValues(); 
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]; 
  
  let targetRowIndex = -1;
  for (let i = 0; i < dates.length; i++) {
    let dateVal = dates[i][0];
    if (dateVal instanceof Date) {
      let formattedDate = dateVal.getFullYear() + "/" + (dateVal.getMonth() + 1) + "/" + dateVal.getDate();
      if (formattedDate === yesterdayString) { targetRowIndex = i + 4; break; }
    } else if (dateVal.toString().trim() === yesterdayString) {
      targetRowIndex = i + 4;
      break;
    }
  }
  
  if (targetRowIndex === -1) return;
  
  const rowData = sheet.getRange(targetRowIndex, 1, 1, lastColumn).getValues()[0];
  let activeStaff = [];
  const totalColumns = [1, 3, 5, 7, 9, 11, 13, 15]; 
  
  totalColumns.forEach(function(colIndex) {
    if (colIndex < lastColumn) {
      const val = rowData[colIndex];
      const name = headers[colIndex];
      if (typeof val === 'number' && !isNaN(val) && val > 0) {
        if (name && name.trim() !== "") activeStaff.push(name.trim());
      }
    }
  });
  
  const displayDate = (yesterday.getMonth() + 1) + "/" + yesterday.getDate();
  let textLines = [displayDate + " 名單："];
  let keyboard = [];
  
  if (activeStaff.length > 0) {
    activeStaff.forEach(function(name, index) {
      textLines.push("☐ " + name);
      keyboard.push([{ "text": name + " 選擇", "callback_data": index + "_0_none_none" }]);
    });
    keyboard.push([{ "text": "隱藏資訊-請勿點擊", "callback_data": "INIT_LIST:" + activeStaff.join(",") }]);
  } else {
    textLines.push("昨日無客服填寫數量或皆為休息狀態。");
  }
  
  sendTelegramMessageWithKeyboard(BOT_TOKEN, CHAT_ID, textLines.join("\n"), keyboard);
}

// ==========================================
// 4. 監聽 Webhook 回傳（按鈕點擊處理）
// ==========================================
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    if (!update.callback_query) return;
    
    const callbackQuery = update.callback_query;
    const msg = callbackQuery.message;
    const clickUser = callbackQuery.from;
    const clickedData = callbackQuery.data;
    
    const userIdStr = clickUser.id.toString();
    let userNickname = clickUser.first_name || "";
    if (clickUser.last_name) userNickname += " " + clickUser.last_name;
    userNickname = userNickname.trim() || "匿名用戶";
    
    // 07:30 緊急任務
    if (clickedData.indexOf("TASK_") === 0) {
      if (clickedData === "TASK_INIT") {
        answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "");
        return;
      }
      
      const parts = clickedData.split("_");
      const targetIndex = parseInt(parts[1]);
      let currentStatus = parseInt(parts[2]); 
      let selectorId = parts[3];
      
      if (currentStatus === 0) {
        currentStatus = 1;
        selectorId = userIdStr;
      } else if (currentStatus === 1) {
        if (selectorId === userIdStr) {
          currentStatus = 0;
          selectorId = "none";
        } else {
          answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "⚠️ 此任務已被其他人認領！");
          return;
        }
      }
      
      const replyMarkup = msg.reply_markup;
      const buttons = replyMarkup.inline_keyboard;
      
      let textLines = ["緊急狀況 負責項目："];
      let newKeyboard = [];
      
      EMERGENCY_TASKS.forEach(function(task, index) {
        let btnText = "";
        let btnCallback = "";
        
        if (index === targetIndex) {
          if (currentStatus === 0) {
            textLines.push("☐ " + task + "：");
            btnText = task + " 選擇";
            btnCallback = "TASK_" + index + "_0_none";
          } else {
            textLines.push("☑ " + task + "：" + userNickname);
            btnText = task + "  " + userNickname + " (點擊可取消)";
            btnCallback = "TASK_" + index + "_1_" + userIdStr;
          }
        } else {
          const oldBtn = buttons[index][0];
          const oldParts = oldBtn.callback_data.split("_");
          const oldStatus = parseInt(oldParts[2]);
          const oldSelectorId = oldParts[3];
          
          let oldNickname = "未知用戶";
          if (oldStatus !== 0) {
            let prefix = task + "  ";
            if (oldBtn.text.indexOf(prefix) === 0) {
              oldNickname = oldBtn.text.replace(prefix, "").replace(" (點擊可取消)", "");
            }
            textLines.push("☑ " + task + "：" + oldNickname);
            btnText = task + "  " + oldNickname + " (點擊可取消)";
            btnCallback = "TASK_" + index + "_1_" + oldSelectorId;
          } else {
            textLines.push("☐ " + task + "：");
            btnText = task + " 選擇";
            btnCallback = "TASK_" + index + "_0_none";
          }
        }
        newKeyboard.push([{ "text": btnText, "callback_data": btnCallback }]);
      });
      
      newKeyboard.push([{ "text": "隱藏資訊-請勿點擊", "callback_data": "TASK_INIT" }]);
      
      editTelegramMessage(BOT_TOKEN, CHAT_ID, msg.message_id, textLines.join("\n"), newKeyboard);
      answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "任務狀態已更新！");
      return;
    }
    
    // 08:00 客服名單
    if (clickedData.indexOf("INIT_LIST:") === 0) {
      answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "");
      return;
    }
    
    const parts = clickedData.split("_");
    const targetIndex = parseInt(parts[0]);
    let currentStatus = parseInt(parts[1]); 
    let selectorId = parts[2]; 
    let confirmTime = parts[3];
    
    const replyMarkup = msg.reply_markup;
    const buttons = replyMarkup.inline_keyboard;
    const hiddenBtnData = buttons[buttons.length - 1][0].callback_data;
    
    if (!hiddenBtnData || hiddenBtnData.indexOf("INIT_LIST:") !== 0) {
      answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "⚠️ 結構失效，請重新發送新名單。");
      return;
    }
    const originalStaff = hiddenBtnData.replace("INIT_LIST:", "").split(",");
    const lines = msg.text.split("\n");
    const dateTitle = lines[0]; 
    
    if (currentStatus === 0) {
      currentStatus = 1;
      selectorId = userIdStr;
    } else if (currentStatus === 1) {
      if (selectorId === userIdStr) {
        currentStatus = 2;
        const now = new Date();
        confirmTime = padZero(now.getHours()) + ":" + padZero(now.getMinutes());
      } else {
        answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "⚠️ 此人已被其他人選擇中！");
        return;
      }
    } else if (currentStatus === 2) {
      if (selectorId === userIdStr) {
        currentStatus = 0;
        selectorId = "none";
        confirmTime = "none";
      } else {
        answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "⚠️ 只有選擇者本人可以取消此確認！");
        return;
      }
    }
    
    let newTextLines = [dateTitle]; 
    let newKeyboard = [];
    
    originalStaff.forEach(function(name, index) {
      let btnText = "";
      let btnCallback = "";
      const oldBtn = buttons[index][0];
      const oldParts = oldBtn.callback_data.split("_");
      const oldStatus = parseInt(oldParts[1]);
      const oldSelectorId = oldParts[2];
      const oldTime = oldParts[3];
      
      let oldNickname = "未知用戶";
      if (oldStatus !== 0) {
        let prefix = name + "  ";
        if (oldBtn.text.indexOf(prefix) === 0) {
          oldNickname = oldBtn.text.replace(prefix, "").replace(" 確認", "").replace(" (點擊可取消)", "");
        }
      }
      
      if (index === targetIndex) {
        if (currentStatus === 0) {
          newTextLines.push("☐ " + name);
          btnText = name + " 選擇";
          btnCallback = index + "_0_none_none";
        } else if (currentStatus === 1) {
          newTextLines.push("☑ " + name + " (由 " + userNickname + " 選擇中)");
          btnText = name + "  " + userNickname + " 確認";
          btnCallback = index + "_1_" + userIdStr + "_none";
        } else if (currentStatus === 2) {
          newTextLines.push("☑ " + name + "  " + userNickname + " " + confirmTime);
          btnText = name + "  " + userNickname + " (點擊可取消)";
          btnCallback = index + "_2_" + userIdStr + "_" + confirmTime;
        }
      } else {
        if (oldStatus === 0) {
          newTextLines.push("☐ " + name);
          btnText = name + " 選擇";
          btnCallback = index + "_0_none_none";
        } else if (oldStatus === 1) {
          newTextLines.push("☑ " + name + " (由 " + oldNickname + " 選擇中)");
          btnText = name + "  " + oldNickname + " 確認";
          btnCallback = index + "_1_" + oldSelectorId + "_none";
        } else if (oldStatus === 2) {
          newTextLines.push("☑ " + name + "  " + oldNickname + " " + oldTime);
          btnText = name + "  " + oldNickname + " (點擊可取消)";
          btnCallback = index + "_2_" + oldSelectorId + "_" + oldTime;
        }
      }
      newKeyboard.push([{ "text": btnText, "callback_data": btnCallback }]);
    });
    
    newKeyboard.push([{ "text": "隱藏資訊-請勿點擊", "callback_data": hiddenBtnData }]);
    
    editTelegramMessage(BOT_TOKEN, CHAT_ID, msg.message_id, newTextLines.join("\n"), newKeyboard);
    answerCallbackQuery(BOT_TOKEN, callbackQuery.id, "狀態已更新！");
    
  } catch (error) {
    Logger.log("doPost 發生錯誤: " + error.toString());
  }
}

// ==========================================
// 5. 輔助與 API 發送函式
// ==========================================
function sendPureTextMessage(token, chatId, text) {
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  const payload = { "chat_id": chatId, "text": text };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  UrlFetchApp.fetch(url, options);
}

function sendTelegramMessageWithKeyboard(token, chatId, text, keyboard) {
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  const payload = { "chat_id": chatId, "text": text, "reply_markup": JSON.stringify({ "inline_keyboard": keyboard }) };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  UrlFetchApp.fetch(url, options);
}

function editTelegramMessage(token, chatId, messageId, text, keyboard) {
  const url = "https://api.telegram.org/bot" + token + "/editMessageText";
  const payload = { "chat_id": chatId, "message_id": messageId, "text": text, "reply_markup": JSON.stringify({ "inline_keyboard": keyboard }) };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  UrlFetchApp.fetch(url, options);
}

function answerCallbackQuery(token, callbackQueryId, text) {
  const url = "https://api.telegram.org/bot" + token + "/answerCallbackQuery";
  const payload = { "callback_query_id": callbackQueryId, "text": text };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  UrlFetchApp.fetch(url, options);
}

function padZero(num) { return num < 10 ? "0" + num : num; }

// ==========================================
// 6. 初始化新功能的觸發器
// ==========================================
function setDailyTriggers() {
  deleteTriggerByName("sendDailyEmergencyTasks");
  deleteTriggerByName("checkAndSendMonthlyTasks");
  
  var now = new Date();
  
  // 1. 預約 07:30 緊急任務
  var t730 = new Date();
  t730.setHours(7, 30, 0, 0);
  if (t730.getTime() < now.getTime()) { t730.setDate(t730.getDate() + 1); }
  ScriptApp.newTrigger("sendDailyEmergencyTasks").timeBased().at(t730).create();
  
  // 2. 預約 09:00 每月提醒
  var t900 = new Date();
  t900.setHours(9, 0, 0, 0);
  if (t900.getTime() < now.getTime()) { t900.setDate(t900.getDate() + 1); }
  ScriptApp.newTrigger("checkAndSendMonthlyTasks").timeBased().at(t900).create();
}

function deleteTriggerByName(functionName) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) { ScriptApp.deleteTrigger(triggers[i]); }
  }
}
