# Telegram 自動化團隊排程與任務提醒 Bot

基於 **Google Apps Script (GAS)** 部署的 Telegram 自動化機器人，整合 Google Sheets 試算表，提供團隊自動化任務推播、每日動態名單讀取與互動式按鈕（Inline Keyboard）狀態追蹤。

---

## 🛠️ 主要功能

1. **每天 07:30 - 緊急任務推播**
   * 自動推播緊急狀況負責項目。
   * 提供互動式按鈕（Inline Keyboard），支援單階狀態切換（選擇／已認領／點擊取消）。
   * 內建防重複認領鎖定機制，並即時顯示認領者暱稱。

2. **每天 08:00 - 昨日活躍客服名單推播**
   * 自動讀取 Google Sheets 試算表，判斷昨日活躍人員。
   * 產生動態點擊按鈕，供客服人員選擇與確認。

3. **每月 10 號 09:00 - 週期性任務提醒**
   * 自動判斷特定月份（1/4/7/10 月與 1/5/9 月），精準推播當月定期維護與進度追蹤提醒。

---

## 🏗️ 技術架構

* **Language:** JavaScript / Google Apps Script
* **Database:** Google Sheets
* **Interface:** Telegram Bot API (Inline Keyboards & Webhook)
* **Scheduling:** Time-driven Triggers

---

## 🚀 部署說明

1. **建立 Google Apps Script**
   * 開啟 Google Sheets 試算表 ➔ 點擊「擴充功能」 ➔ 「Apps Script」。
   * 將本專案 `Code.gs` 程式碼複製貼上至編輯器中。

2. **設定全域變數**
   在程式碼頂端填入你的 Telegram Bot Token 與 Chat ID：
   ```javascript
   const BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
   const CHAT_ID = "YOUR_TELEGRAM_CHAT_ID";

3.初始化觸發器
   * 在 GAS 編輯器上方選擇執行 setDailyTriggers 函式。
   * 點擊「執行」，完成時間排程預約。

4.部署 Webhook
   * 點擊右上角「部署」 ➔ 「新增部署」。
   * 種類選擇「Web 應用程式」，存取權限設定為「所有人」。
   * 將取得的 Web App URL 設定給 Telegram Webhook。
