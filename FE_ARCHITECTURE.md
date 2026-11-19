# Kiến trúc dự án Frontend (3d_demo)

Tài liệu này quy chuẩn cấu trúc thư mục và nguyên tắc phát triển giao diện (FE) của dự án **3D Demo** (`3d_demo`), giữ nguyên pattern phân tầng từ dự án tham chiếu và mở rộng thêm mảng 3D (`three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`).

## Cấu trúc thư mục (`src/`)

* **`src/app/`**: Chứa code của các trang (App Router của Next.js).
  * `src/app/page.tsx`: Trang chính nạp `GameViewport` (client-only qua `next/dynamic`) và lớp `GameHUD`.
  * `src/app/layout.tsx`: Root layout bọc Provider, Header, Footer.
  * `src/app/globals.css`: Cấu hình Tailwind CSS và CSS variables.
  * `src/app/api/`: Các Next.js API route (`health/route.ts`).
* **`src/components/`**:
  * **`ui/`**: Chứa các component nền tảng từ `shadcn/ui` (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `dialog.tsx`).
  * **`custom/`**: Chứa các component tự định nghĩa phục vụ riêng cho dự án.
    * **`common/`**: Chứa các component dùng chung toàn dự án (`status-badge.tsx`).
    * **`game/`**: Chứa thế giới 3D và HUD game (`GameViewport.tsx`, `GameCamera.tsx`, `ArenaStage.tsx`, `ArenaWorld.tsx`, `PlayerUnit.tsx`, `WeaponCrate.tsx`, `GameHUD.tsx`).
* **`src/context/`**: Quản lý React Context (`app-context.tsx`).
* **`src/dto/`**: Các DTO & Type definitions (`CommonDTO.ts`, `GameDTO.ts`).
* **`src/lang/`**: Thư mục quản lý đa ngôn ngữ (`vi.ts`).
* **`src/layout/`**: Chứa các thành phần layout lớn của trang web (`header.tsx`, `footer.tsx`).
* **`src/lib/`**: Chứa các hàm tiện ích dùng chung (`utils.ts`).
* **`src/service/`**: Chứa các cấu hình, service & helper nghiệp vụ (`app-service.ts`, `weapon-service.ts`, `game-constants.ts`, `game-input.ts`).
* **`src/state-manager/`**: Quản lý global state của ứng dụng bằng `zustand` (`app-store.ts`, `game-store.ts`).

## Nguyên tắc triển khai 3D

1. **Tách biệt Thế giới 3D và Camera**: Toàn bộ logic di chuyển, đạn, quái và hòm đồ dùng hệ trục thế giới cố định `(X, Y, Z)`. `GameCamera.tsx` xử lý độc lập các chế độ góc quay (`TOP_DOWN`, `THIRD_PERSON`, `FREE_ORBIT`).
2. **Tối ưu 60fps trong `useFrame`**: Vị trí liên tục theo từng frame (đạn, quái, hạt nổ, vị trí người chơi) lưu qua `ref` và `InstancedMesh` thay vì `setState` liên tục; Zustand chỉ cập nhật khi có sự kiện rời rạc (ăn hòm vũ khí, hạ quái, mất máu, đổi góc camera).
3. **Next.js SSR**: Component chứa `<Canvas>` luôn khai báo `"use client"` và nạp động với `{ ssr: false }`.
