const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function run() {
  console.log("Preparing build for CrazyGames...");

  const oldNextDir = path.join(outDir, "_next");
  const newNextDir = path.join(outDir, "next");

  // 1. Đổi tên thư mục _next -> next
  if (fs.existsSync(oldNextDir)) {
    if (fs.existsSync(newNextDir)) {
      fs.rmSync(newNextDir, { recursive: true, force: true });
    }
    fs.renameSync(oldNextDir, newNextDir);
    console.log("✔ Đã đổi tên out/_next -> out/next");
  } else if (!fs.existsSync(newNextDir)) {
    console.warn("⚠ Không tìm thấy thư mục out/_next hoặc out/next. Bạn hãy chạy `pnpm run build` trước.");
    return;
  }

  // 2. Thay thế đường dẫn tài nguyên _next/ thành next/ (giữ nguyên biến hệ thống Next __next)
  const extensions = [".html", ".js", ".css", ".json", ".txt"];
  let replacedCount = 0;

  walkDir(outDir, (filePath) => {
    if (extensions.some((ext) => filePath.endsWith(ext))) {
      const content = fs.readFileSync(filePath, "utf-8");
      // Thay thế đường dẫn: /_next/ hoặc ./_next/ hoặc _next/
      const updated = content
        .replaceAll("/_next/", "/next/")
        .replaceAll("./_next/", "./next/")
        .replaceAll('"/_next"', '"/next"')
        .replaceAll("'_next/'", "'next/'")
        .replaceAll('"_next/', '"next/');

      if (updated !== content) {
        fs.writeFileSync(filePath, updated, "utf-8");
        replacedCount++;
      }
    }
  });

  console.log(`✔ Đã cập nhật đường dẫn trong ${replacedCount} file.`);
  console.log("=================================================================");
  console.log(" HƯỚNG DẪN NÉN FILE CHO CRAZYGAMES:");
  console.log(" 1. Mở thư mục 'out'");
  console.log(" 2. Chọn TẤT CẢ các file & thư mục bên trong (index.html, next, models, ...)");
  console.log(" 3. Nhấp chuột phải -> Send to / Compress to ZIP.");
  console.log(" Lưu ý: Đảm bảo khi mở file .zip ra thì index.html nằm ngay tầng ngoài cùng!");
  console.log("=================================================================");
}

run();
