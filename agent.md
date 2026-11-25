# Quy tắc làm việc cho AI Agent (3d_demo)

1. **Không tự ý sửa logic khi chưa được phép**: Chỉ sửa đúng phần người dùng yêu cầu. Không tự ý thay đổi thông số cân bằng, cơ chế gameplay hoặc refactor ngoài phạm vi được giao.
2. **Tuân thủ kiến trúc dự án**: Theo đúng cấu trúc thư mục và nguyên tắc trong `FE_ARCHITECTURE.md`.
3. **Không tự ý chạy lệnh terminal** (`pnpm dev`, `pnpm build`, `lint`, `typecheck`, ...): Để người dùng tự kiểm tra và chạy local.
4. **Chỉ sửa code khi người dùng yêu cầu rõ ràng**: Khi người dùng đặt câu hỏi, nhờ phân tích hoặc hỏi "làm như nào", **tuyệt đối không sửa code** — chỉ trả lời, giải thích và đề xuất phương án cho tới khi người dùng cho phép sửa/code.
5. **Không bao giờ viết code kiểu fallback**: Lỗi là báo lỗi / ném lỗi rõ ràng, không tự ý fallback ngầm sang local/mock/dữ liệu giả khi service chính (API, Firebase, SDK, CDN...) hỏng hoặc chưa sẵn sàng. Kệ lỗi để lộ ra mà xử lý đúng bản chất.
