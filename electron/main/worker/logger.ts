import fs from "fs";
import path from "path";
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });
/** 用本地时间，别用 toISOString()（UTC 会差 8 小时导致跨天错乱） */
function localDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// 按天分文件，避免单文件无限增长
let currentDate = localDate();
let filePath = path.join(LOG_DIR, `worker-${currentDate}.log`);

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${localDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function rotateIfNeeded() {
  const today = localDate();
  if (today !== currentDate) {
    currentDate = today;
    filePath = path.join(LOG_DIR, `worker-${today}.log`);
  }
}
/** 写结构化日志：一行一条 JSON */
export function writeLog(tag: string, data: unknown) {
  if (!process.env.VITE_DEV_SERVER_URL) return; // 生产环境直接跳过
  rotateIfNeeded();
  let payload: string;
  try {
    payload = JSON.stringify(data);
  } catch {
    payload = String(data); // 循环引用兜底
  }
  const line = `${timestamp()} [${tag}] ${payload}\n`;
  try {
    fs.promises.appendFile(filePath, line, "utf8");
  } catch (e) {
    console.error("[logger] 写入失败:", e);
  }
}

export { LOG_DIR };
