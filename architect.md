# GAME DESIGN SPECIFICATION — LANE SHOOTER 3D
> Tài liệu thiết kế chi tiết. Chỉnh sửa trước khi bắt đầu code bất kỳ tính năng nào.
> Hàng trăm màn — tối thiểu 10 Chapter đã thiết kế đầy đủ.

---

## 1. CẤU TRÚC TỔNG THỂ GAME

### Thể loại
2-Lane Roguelike Arcade Shooter — Nhân vật bắn súng di chuyển qua lại giữa 2 làn.

### Luồng chơi chính
```
[Main Menu]
     │
     ▼
[World Map — Chọn Chapter]
     │
     ▼
[Chapter → Wave 1 → Wave 2 → ... → Wave N → BOSS]
     │
     ├── Thắng Boss ──► [Victory + Gold + Mở Chapter tiếp]
     └── Chết ──► [Defeat: Hồi sinh (xem Ad) | Thoát về World Map]
```

### Điều khiển
| Hành động | PC | Mobile |
|---|---|---|
| Di chuyển trái / phải | `A` / `D` hoặc `←` / `→` | Nút trái / Nút phải |
| Bắn | Tự động (auto-fire) | Tự động (auto-fire) |
| Chuyển đổi 3 súng mang theo | `1` / `2` / `3` hoặc `Q` (xoay vòng) | Chạm trực tiếp 3 ô súng trên HUD |
| Kích hoạt Nộ (Rage Skill) | `R` / `E` hoặc nút HUD | Nút HUD |

---

## 2. THIẾT KẾ 2 LÀN CHƠI

### LÀN TRÁI — Combat Lane
- Làn chiến đấu chính. Quái vật tràn xuống từ trên.
- Người chơi phần lớn thời gian đứng ở đây.

### LÀN PHẢI — Power-up & Buff Lane (KHÔNG đổi súng)
- **Tuyệt đối không liên quan tới việc đổi hay mở khóa từ súng này sang súng khác.**
- Là khu vực **Bệ Overdrive Buff & Cổng Buff (Buff Gates)**:
  - Bắn Bệ Overdrive hoặc ăn Cổng Buff giúp cường hóa trực tiếp cho vũ khí đang cầm trong Run (tăng +Sát thương / +Tốc độ bắn, nạp Nộ, clone, xuyên đạn, nổ lan, hồi HP...).
  - Khẩu súng nào người chơi cầm do chính người chơi chọn từ **3 Slot vũ khí mang theo trong Tab Trang Bị** và chủ động chuyển đổi trong trận.

### Các loại Cổng Buff

| Cổng | Màu | Hiệu ứng | Thời gian hiệu lực |
|---|---|---|---|
| `[x2 CLONE]` | Xanh cyan | +1 bản sao nhân vật (tối đa 3 người) | Hết Run |
| `[PIERCING]` | Vàng | Đạn xuyên qua tối đa 3 quái / phát | Hết Wave |
| `[MULTISHOT]` | Cam | +2 viên đạn mỗi phát, tỏa 15° | Hết Wave |
| `[RICOCHET]` | Tím | Đạn nảy sang quái gần nhất (bán kính 2.5m) | Hết Wave |
| `[EXPLOSIVE]` | Đỏ | Mỗi phát bắn gây nổ lan bán kính 1.8m | Hết Wave |
| `[SHIELD]` | Trắng xanh | Hấp thụ 3 lần sát thương | Tiêu hao theo đòn |
| `[LIGHTNING]` | Trắng sáng | Kích hoạt ngay: Giật sét toàn bộ quái, stun 2s | Dùng ngay 1 lần |
| `[CLUSTER BOMB]` | Xanh lá | Kích hoạt ngay: Rải 6 quả lựu đạn dọc làn trái | Dùng ngay 1 lần |
| `[+HP]` | Hồng | Hồi lại 1 HP | Dùng ngay |
| `[MAGNET]` | Vàng nhạt | Tự hút Gold bán kính rộng | 10 giây |
| `[FREEZE FIELD]` | Xanh băng | Toàn bộ quái trên màn bị chậm 50% trong 5s | 5 giây |
| `[TURRET DROP]` | Nâu kim loại | Triển khai 1 súng turret tự động bắn trong 10s | 10 giây |

---

## 3. VŨ KHÍ — 20 LOẠI (Weapon Catalog — Không chia Tier)

> - **Không phân chia theo Tier.** Mỗi khẩu súng là một trang bị độc lập trong Kho Trang Bị (Armory).
> - **Điều kiện mở khóa (Cần + Đủ):**
>   - **Điều kiện cần:** Vượt/mở đến **Chapter tương ứng** (`CH.1 → CH.10`).
>   - **Điều kiện đủ:** Trả **Gold** trong Tab Trang Bị để chính thức mở khóa súng (`Pistol` mở sẵn miễn phí lúc khởi đầu), sau đó nâng cấp tiếp `Lv.1 → Lv.10` bằng Gold.
> - **Loadout 3 Súng mang ra trận:** Người chơi chọn tối đa **3 loại súng đã mở mang theo** ngay trong Tab Trang Bị trước trận, và có thể **chuyển đổi qua lại giữa 3 súng ngay trong trận** (`1` / `2` / `3`, `Q`, hoặc chạm ô súng trên HUD).
> - **Nộ (Rage Skill)** của mỗi súng là khác nhau hoàn toàn.

| # | Tên | Mở khóa | Nhóm | Kiểu bắn | Phát/giây | Đạn/phát | Sát thương/viên | Splash | Màu đạn |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Súng Lục (Pistol)** | CH.1 | Pistol | Đơn phát | 3.6 | 1 | 1.5 | — | Xanh nhạt |
| 2 | **AK Hyperion** | CH.1 | Assault | Liên thanh | 7.0 | 1 | 3.5 | — | Vàng |
| 3 | **Shotgun Phân Mảnh** | CH.1 | Shotgun | Chùm 5 viên | 2.5 | 5 | 2.0/viên | — | Cam nhạt |
| 4 | **SMG Neon** | CH.2 | SMG | Liên thanh nhanh | 14.0 | 1 | 5.5 | — | Xanh neon |
| 5 | **Súng Băng (Cryo Gun)** | CH.2 | Cryo | Đơn phát + làm chậm | 4.0 | 1 | 4.0 | — | Trắng xanh |
| 6 | **Minigun** | CH.3 | Rotary | Liên thanh cực nhanh | 22.0 | 1 | 4.0 | — | Trắng vàng |
| 7 | **Súng Điện (Tesla Gun)** | CH.3 | Arc | Đơn phát + nảy điện | 4.5 | 1 | 8.0 | — | Tím sáng |
| 8 | **Súng Phân Tán (Scatter)** | CH.3 | Scatter | Chùm 3 hướng | 5.0 | 3 | 5.0/viên | — | Xanh biển |
| 9 | **Đại Bác (Cannon)** | CH.4 | Cannon | Đơn phát nổ | 3.0 | 1 | 55 | 3.2m | Đỏ hồng |
| 10 | **Rocket Launcher** | CH.5 | Rocket | Tên lửa đơn | 2.0 | 1 | 80 | 4.5m | Cam đỏ |
| 11 | **Grenade Launcher** | CH.5 | Grenade | Lựu đạn nảy | 3.5 | 1 | 60 | 3.8m | Xanh lá |
| 12 | **Flamethrower** | CH.6 | Thermal | Phun lửa liên tục | 20.0 | 1 | 8/tick | — | Đỏ cam |
| 13 | **Acid Sprayer** | CH.6 | Bio-Acid | Phun axit ăn mòn | 15.0 | 1 | 5/tick | — | Xanh lá neon |
| 14 | **Plasma Rifle** | CH.7 | Plasma | Chùm 3 tia | 6.0 | 3 | 18/tia | — | Tím xanh |
| 15 | **Rail Gun** | CH.8 | Railgun | Xuyên thấu toàn màn | 1.5 | 1 | 300 | — | Trắng xanh sáng |
| 16 | **Laser Cannon** | CH.8 | Beam | Tia laser liên tục | — | 1 | 50/frame | — | Đỏ tươi |
| 17 | **Vortex Gun** | CH.9 | Gravity | Tạo lỗ đen hút quái | 1.8 | 1 | 40 | 5.0m | Đen tím |
| 18 | **Photon Burst** | CH.9 | Photon | Nổ ánh sáng gây mù | 4.0 | 1 | 90 | 2.5m | Trắng chói |
| 19 | **Nuke Launcher** | CH.10 | Nuclear | Đầu đạn hạt nhân | 0.8 | 1 | 500 | 8.0m | Vàng xanh |
| 20 | **ICBM Strike Unit** | CH.10 | Orbital | Gọi rơi toàn vùng (Nộ 100k) | 1x Nộ | 1 | 100,000 | 7.5m | Cam đỏ rực |

**Rage Skill từng vũ khí:**
- **Súng Lục** → **"Tăng Tốc Độ Đạn"**: Toàn bộ đạn bay nhanh gấp 4x trong 5s, xuyên qua quái không giới hạn.
- **AK Hyperion** → **"Mưa Đạn AK"**: Bắn 10 viên/giây, mỗi viên sát thương x1.5, 5s.
- **Shotgun Phân Mảnh** → **"Nova Blast"**: Bắn 1 vụ nổ hình cầu tỏa 360°, đẩy văng toàn bộ quái xung quanh bán kính 5m.
- **SMG Neon** → **"Bullet Storm"**: Bắn 3 luồng đạn SMG song song trong 6s.
- **Cryo Gun** → **"Blizzard"**: Phủ toàn sàn băng 6s — tất cả quái chậm 70%, không thể chạy.
- **Minigun** → **"Vulcan Mode"**: Tốc độ bắn tăng 2x, đạn to gấp đôi, 5s.
- **Tesla Gun** → **"Electromagnetic Pulse"**: Giật sét toàn bộ quái trên màn, stun 3s + phá giáp 50%.
- **Scatter** → **"Carpet Fire"**: Rải đạn tỏa 180° phủ toàn bộ màn, 4s.
- **Cannon** → **"Orbital Strike"**: Chỉ điểm bất kỳ, pháo quỹ đạo bắn 3 phát liên tiếp vào đó, mỗi phát splash 6m.
- **Rocket Launcher** → **"Missile Swarm"**: Phóng 12 tên lửa nhỏ bay tự đuổi bám quái, 6s.
- **Grenade Launcher** → **"Minefield"**: Rải 20 lựu đạn khắp màn, nổ theo chuỗi khi quái bước vào.
- **Flamethrower** → **"Inferno"**: Lửa phủ toàn bộ làn trái liên tục 6s, thiêu đốt mọi thứ.
- **Acid Sprayer** → **"Meltdown"**: Phun axit toàn màn 5s — quái dính axit chết ngay sau 3s.
- **Plasma Rifle** → **"Plasma Nova"**: Bắn vụ nổ plasma khổng lồ bán kính 8m từ người chơi, đẩy văng tất cả.
- **Rail Gun** → **"Hypersonic Volley"**: Bắn 5 phát Rail Gun liên tiếp trong 2s, mỗi phát xuyên toàn màn.
- **Laser Cannon** → **"Superbeam"**: Bắn tia laser liên tục cực mạnh 8s, xoay được bằng chuột/vuốt.
- **Vortex Gun** → **"Singularity"**: Tạo hố đen trung tâm màn 6s, hút TẤT CẢ quái vào và nghiền nát.
- **Photon Burst** → **"Supernova"**: Nổ ánh sáng bán kính 15m phủ toàn màn, thiêu rụi mọi quái thường.
- **Nuke Launcher** → **"Nuclear Winter"**: Phóng 1 đầu đạn hạt nhân miniature rơi xuống giữa làn, nổ bán kính 12m, để lại vùng phóng xạ 10s.
- **ICBM Strike Unit** → **"Armageddon"**: Phóng 3 tên lửa ICBM cùng lúc vào 3 điểm khác nhau, mỗi quả nổ bán kính 7.5m.

---

## 4. HỆ THỐNG QUÁI VẬT — 20 LOẠI

> Mỗi loại quái là 1 thực thể độc lập với ngoại hình và hành vi riêng.
> Độ khó điều chỉnh bằng HP, tốc độ, số lượng xuất hiện — không phân cấp Normal/Elite.
> **Lưu ý cơ chế:** Người chơi chỉ di chuyển trái/phải giữa 2 làn. Mọi hành vi quái phải hợp lý với context này.

---

### NHÓM 1: Quái Cơ Bản (Tiếp cận thẳng)

| # | Tên | Ngoại hình | Tốc độ | HP cơ bản | Hành vi đặc trưng |
|---|---|---|---|---|---|
| 1 | **Crawler** | Côn trùng ngoài hành tinh 6 chân, nhỏ, thân trong suốt | 3.5 | 3 | Đổ xuống thành đàn 4–6 con. Dễ bắn nhưng số lượng áp đảo |
| 2 | **Husk** | Sinh vật nhân dạng, da khô nứt nẻ, mắt phát sáng vàng | 3.0 | 10 | Đi thẳng, mỗi 3s phun đạn chất độc về phía người chơi — người chơi phải đổi làn |
| 3 | **Skywing** | Sinh vật có cánh màng, thân dẹt, lướt qua lại | 4.5 | 6 | Bay zigzag sang ngang liên tục, khó nhắm bắn |
| 4 | **Shell Brute** | Bọ khổng lồ, mai giáp cứng dày phía trước | 2.0 | 28 | Mai giáp hấp thụ 60% sát thương từ phía trước. Mai vỡ sau 20 sát thương — sau đó chịu full damage |
| 5 | **Dasher** | Sinh vật nhện gầy, chân dài bất thường | 7.5 | 5 | Chạy zigzag nhanh, bất ngờ bứt tốc 2x khi còn 20% HP |

---

### NHÓM 2: Quái Chiến Thuật

| # | Tên | Ngoại hình | Tốc độ | HP cơ bản | Hành vi đặc trưng |
|---|---|---|---|---|---|
| 6 | **Bloater** | Sinh vật tròn phình to, da mỏng căng bóng, phát sáng đỏ bên trong | 3.5 | 7 | Lao thẳng xuống. Khi chết phát nổ bán kính 2m — tuyệt đối không để chạm người chơi |
| 7 | **Wraith** | Thực thể vô hình dạng khói tối, chỉ thấy được outline | 3.5 | 14 | Ẩn hình hoàn toàn 2s mỗi 5s — không thể bắn trúng khi đang ẩn |
| 8 | **Regen Beast** | Sinh vật cơ bắp có u thịt tái tạo nhanh trên da | 2.5 | 22 | Tự hồi 4 HP/giây nếu không bị bắn trong 2 giây liên tiếp — phải duy trì bắn liên tục |
| 9 | **Splitter** | Sinh vật hình cầu nhầy, lõi kép bên trong | 3.0 | 16 | Khi chết tách thành 2 Crawler nhỏ chạy tiếp xuống |
| 10 | **Parasite** | Sinh vật nhỏ dạng đỉa, trong suốt | 5.0 | 8 | Cực nhanh, chạy thẳng. Nếu đến được vị trí người chơi → bám vào, hút 1 HP/giây trong 3s |

---

### NHÓM 3: Tầm Xa & Hỗ Trợ

| # | Tên | Ngoại hình | Tốc độ | HP cơ bản | Hành vi đặc trưng |
|---|---|---|---|---|---|
| 11 | **Spitter** | Sinh vật cột sống lộ ra ngoài, miệng rộng | 0 (đứng yên) | 32 | Xuất hiện cố định ở đầu làn, phun đạn axit chính xác về phía người chơi mỗi 4s — người chơi đổi làn để tránh |
| 12 | **Healer Symbiont** | Sinh vật nhỏ màu xanh lá, bám sau lưng quái khác | 2.0 | 12 | Không tấn công trực tiếp. Hồi 3 HP/giây cho quái trong bán kính 2.5m — ưu tiên tiêu diệt ngay |
| 13 | **Brood Carrier** | Sinh vật bụng phình to, nhiều trứng lộ ra ngoài | 1.5 | 38 | Mỗi 8s đẻ 1 Crawler trong lúc di chuyển xuống. Giết ngay trước khi sinh đàn |
| 14 | **Force Bubble** | Sinh vật hình sứa, có màng bong bóng năng lượng bao quanh | 1.0 | 22 | Tạo bong bóng bảo vệ giảm 60% sát thương cho tất cả quái trong bán kính 3m. Phải hạ nó trước |
| 15 | **Disruptor** | Sinh vật dạng mực, xúc tu phát sóng rung | 2.0 | 16 | Khi còn sống: Giảm 30% tốc độ bắn của người chơi. Ưu tiên tiêu diệt |

---

### NHÓM 4: Quái Nguy Hiểm Cao

| # | Tên | Ngoại hình | Tốc độ | HP cơ bản | Hành vi đặc trưng |
|---|---|---|---|---|---|
| 16 | **Behemoth** | Sinh vật khổng lồ 4 chân, da vảy dày, miệng rộng nuốt chửng | 1.2 | 220 | Bước chậm nhưng cực kỳ máu. Mỗi bước làm rung màn hình nhẹ. Tiến đến cuối màn = người chơi mất 2 HP |
| 17 | **Cryo Leech** | Sinh vật ký sinh băng giá, thân trong suốt màu xanh nhạt | 3.0 | 20 | Bắn đạn băng mỗi 4s về phía người chơi — trúng làm chậm di chuyển 2s |
| 18 | **Swarm Queen** | Ấu trùng khổng lồ, bụng mở ra phát sáng vàng | 2.0 | 45 | Mỗi 5s đẻ 1 Crawler. Không tiêu diệt kịp → đàn nhân lên không ngừng |
| 19 | **Siege Worm** | Giun đất khổng lồ, thân đốt cứng, miệng có pháo sinh học | 1.0 | 160 | Mỗi 5s phóng đạn rocket sinh học nổ bán kính 2m về phía người chơi — người chơi đổi làn để tránh vùng nổ |
| 20 | **Void Hulk** | Sinh thể vật chất tối, hình người khổng lồ nhưng méo mó, hút ánh sáng xung quanh | 0.8 | 300 | Chậm, HP cực cao. Mỗi 10s phát xung vật chất tối bán kính 4m — đẩy người chơi về làn ngược lại |

---

## 5. HỆ THỐNG BOSS — 10 TRÙM CUỐI

> Mỗi Boss là 1 cơ chế chiến đấu hoàn toàn khác biệt. Tham khảo cơ chế từ Zombie Wave, Alien Shooter, Returnal.

---

### BOSS 1: **IRON WARDEN** *(Chapter 1 — Khu Thép)*
*Mech robot 2 chân, cầm khiên + súng laser.*
- **HP:** 2,600
- **Phase 1 (100%→50%):**
  - `Laser Sweep` — Vạch đỏ ngang 1.5s trước → Bắn tia laser quét toàn bộ làn trái. Nhảy sang làn phải để tránh.
  - `Shield Bash` — Lao lên 1 bước, sóng xung kích hình bán nguyệt bán kính 4m.
- **Phase 2 (50%→chết):** Mất khiên, tăng tốc bắn gấp đôi. Thêm `Rocket Barrage` — Phóng 3 tên lửa nhỏ zigzag xuống.

---

### BOSS 2: **NANO HYDRA** *(Chapter 2 — Bio Lab)*
*3 đầu rắn robot, nối nhau bằng thân kim loại linh hoạt.*
- **HP:** 3 đầu × 2,666 HP = 8,000 tổng
- **Cơ chế:** Phải hạ từng đầu riêng. Mỗi đầu chết → 2 đầu còn lại tăng tốc 20%.
  - Đầu trái: Phun axit cong vào làn trái.
  - Đầu giữa: Lao thẳng xuống, knockback người chơi.
  - Đầu phải: Triệu hồi 2 Drone Con mỗi 8s.

---

### BOSS 3: **CRYSTAL COLOSSUS** *(Chapter 3 — Đồng Băng)*
*Người khổng lồ pha lê, trong suốt, ánh sáng khúc xạ bên trong.*
- **HP:** 15,000
- **Cơ chế:** Miễn nhiễm 100% với đạn Splash/nổ lan. Chỉ chịu sát thương từ đạn đơn thẳng (Rail Gun, Pistol, AK, Plasma).
- **Skill 1 — Crystal Wall:** Mọc tường pha lê chắn ngang màn. Bắn vỡ tường (HP 400 mỗi mảng) trước mới bắn được Boss.
- **Skill 2 — Shard Storm:** Phóng 12 mảnh pha lê tỏa 360° ngẫu nhiên — né bằng cách đọc hướng bay.
- **Phase 2 (50% HP):** Thân thể nứt ra, lộ lõi đỏ — lõi đỏ chịu x2 sát thương. Nhắm vào lõi đỏ.

---

### BOSS 4: **SWARM MOTHER** *(Chapter 4 — Hive Core)*
*Nhện khổng lồ cơ học, bụng chứa đầy trứng phát sáng.*
- **HP:** 25,000
- **Cơ chế:** Bản thân Boss MIỄN NHIỄM hoàn toàn cho đến khi tất cả Ổ Trứng Lõi trên màn bị phá hủy.
  - Xuất hiện 4 Ổ Trứng Lõi rải khắp làn trái (mỗi ổ 500 HP). Phá xong tất cả → Boss lộ điểm yếu.
- **Skill liên tục:** Mỗi 6s đẻ 2 Sprinter từ bụng.
- **Phase 2 (sau khi lộ điểm yếu):** Lao thẳng xuống với tốc độ gấp đôi, bụng mở ra phun axit bán kính 3m.

---

### BOSS 5: **OMEGA PRIME** *(Chapter 5 — Orbital Fortress)*
*T-Rex máy khổng lồ có cánh, tên lửa gắn trên lưng.*
- **HP:** 40,000
- **Phase 1 (100%→70%):** Bay lơ lửng, bắn từ trên.
  - `Orbital Laser` — Chùm laser từ trên trời rọi xuống, cảnh báo 2s.
  - `Missile Rain` — Phóng 5 tên lửa nhỏ dàn ngang rơi xuống.
- **Phase 2 (70%→30%):** Hạ cánh, chạy bộ. Thêm `Chomp` — Cắn vào làn ngẫu nhiên, cảnh báo đỏ 1s.
- **Phase 3 (30%→chết):** Nổi điên, tất cả skill cooldown giảm 50%. Nền màn chớp đỏ.

---

### BOSS 6: **SHADOW ARCHITECT** *(Chapter 6 — Mirror Dimension)*
*Hình người bóng đen thuần túy, mắt trắng, không rõ nét.*
- **HP:** 60,000
- **Cơ chế:** Xuất hiện 2 bản sao Boss (Shadow Clone) chạy lung tung — Chỉ 1 con là Boss thật, 2 con còn lại là giả. Nhận biết Boss thật bằng cách: Boss thật chớp ánh sáng trắng khi nhận sát thương.
- **Skill 1 — Reality Flip:** Đảo ngược làn trái / làn phải trong 5s — Người chơi phải ở làn ngược lại.
- **Skill 2 — Mirror Bullets:** Phản xạ toàn bộ đạn của người chơi ngược lại trong 2s. Phải ngừng bắn.
- **Phase 2:** Sinh thêm 1 bản sao nữa (tổng 3 bản sao, 1 thật 2 giả).

---

### BOSS 7: **VOLCANIC TITAN** *(Chapter 7 — Magma Core)*
*Người khổng lồ dung nham, thân cơ thể nứt vỡ có lửa phun ra.*
- **HP:** 90,000
- **Cơ chế:** Toàn thân miễn nhiễm đạn thường. Muốn gây sát thương: Phải bắn vào **điểm nứt sáng** (Weak Point) xuất hiện ngẫu nhiên 2s mỗi 7s.
- **Skill 1 — Lava Surge:** Phun sóng dung nham dọc 1 làn. Nhảy sang làn còn lại.
- **Skill 2 — Eruption:** Rải 8 cột lửa ngẫu nhiên khắp màn, mỗi cột tồn tại 3s.
- **Phase 2 (50% HP):** Vỡ ra, lộ lõi năng lượng — lõi chịu sát thương bình thường. Nhưng mảnh vỡ bay ra xung quanh như projectile.

---

### BOSS 8: **CHRONO KEEPER** *(Chapter 8 — Time Rift)*
*Robot hình đồng hồ cát khổng lồ, hai nửa thân quay ngược chiều nhau.*
- **HP:** 130,000
- **Cơ chế — Time Mechanic:**
  - `Time Slow` — Làm chậm toàn bộ đạn của người chơi 70% trong 4s.
  - `Time Stop` — Đóng băng mọi thứ trên màn 2.5s, kể cả đạn bay — CHỈ NGƯỜI CHƠI còn di chuyển được.
  - `Rewind` — Boss hồi lại 10,000 HP. Cooldown: 30s. Phải hạ Boss nhanh tay.
- **Skill 2 — Temporal Clone:** Triệu hồi phiên bản Boss ở 15s trước (ít HP hơn, tồn tại 10s).

---

### BOSS 9: **VOID LEVIATHAN** *(Chapter 9 — Deep Space)*
*Con rắn vũ trụ khổng lồ, thân dài uốn lượn, đầu phát sáng tím đen.*
- **HP:** 200,000
- **Cơ chế — Segment:** Thân Boss gồm 10 đốt (Segment), mỗi đốt 15,000 HP. Phải phá lần lượt từ đuôi đến đầu. Phá sai thứ tự → Đốt đó tự hồi HP.
- **Skill 1 — Cosmic Ray:** Đầu Boss bắn tia vũ trụ xuyên toàn màn. Chỉ né bằng cách ẩn sau tường pha lê hoặc clone đỡ đòn.
- **Skill 2 — Void Drain:** Hút toàn bộ đạn trên màn vào người trong 3s — không gây sát thương Boss trong thời gian này.
- **Phase 2 (Còn 3 đốt cuối + đầu):** Toàn thân phát sáng, tăng tốc gấp đôi, bắn thêm Cosmic Ray sang cả làn phải.

---

### BOSS 10: **GENESIS CORE** *(Chapter 10 — Finale)*
*Lõi năng lượng thuần túy hình cầu, bao quanh bởi các vòng quỹ đạo chứa vũ khí và quái.*
- **HP:** 350,000
- **Cơ chế — Orbital Defense:** Boss được bảo vệ bởi 3 vòng quay, mỗi vòng chứa 4 ổ súng tự bắn. Phá hết súng của 1 vòng → Vòng đó ngừng bảo vệ → Lõi Boss lộ ra từng phần.
- **Skill 1 — Gravity Well:** Tạo lực hút kéo người chơi về phía Boss. Phải chủ động di chuyển ra xa.
- **Skill 2 — System Purge:** Triệu hồi 10 quái ngẫu nhiên từ danh sách 25 loại quái.
- **Skill 3 — Supernova Warning (Phase cuối — còn 20% HP):** Toàn màn hình đỏ, đếm ngược 10s — Phải hạ Boss trong 10s hoặc bị quét sạch.
- **Phần thưởng thắng:** Ending đặc biệt + Mở chế độ Endless Mode.

---

## 6. HỆ THỐNG PET

> Pet đi theo người chơi trong suốt một Run, có hành vi tự động riêng.
> Mở khóa bằng Gold hoặc hoàn thành thử thách đặc biệt.

| # | Tên Pet | Ngoại hình | Hành vi | Điều kiện mở khóa |
|---|---|---|---|---|
| 1 | **Drone Hộ Vệ** | Robot bay nhỏ, nòng súng bé | Tự động bắn đạn nhỏ vào quái gần nhất, 3 phát/giây, sát thương 1.5 | Mặc định / 200 Gold |
| 2 | **Khiên Nổi (Orb Shield)** | Quả cầu sáng xoay quanh người chơi | Hấp thụ 1 lần sát thương mỗi 8s. Hiển thị trực quan như lớp giáp | Hoàn thành Chapter 1 |
| 3 | **Chú Mèo Robot (Robo Cat)** | Mèo kim loại nhỏ | Nhặt Gold tự động bán kính 5m + hồi 0.5 HP mỗi 15s | 500 Gold |
| 4 | **Rồng Lửa Mini (Mini Dragon)** | Rồng nhỏ màu đỏ cam | Phun lửa vào quái gần nhất, 4 lần/phút, sát thương 15 diện rộng | Hoàn thành Chapter 3 |
| 5 | **Hồn Ma Tốc Độ (Speed Specter)** | Bóng ma xanh | +20% tốc độ di chuyển của người chơi, bỏ qua hiệu ứng làm chậm | 1,000 Gold |
| 6 | **Turret Robot Nhỏ** | Robot súng máy nhỏ | Triển khai ngay cạnh người chơi, bắn súng máy tự động 8 phát/giây | Hoàn thành Chapter 5 |
| 7 | **Chim Phượng Điện (Thunder Phoenix)** | Chim vàng điện | Mỗi 20s tự phóng sét vào quái gần nhất, stun 1.5s | Hoàn thành Chapter 7 |
| 8 | **Lỗ Đen Nhỏ (Micro Void)** | Lỗ đen nhỏ xoay quanh | Mỗi 25s hút tất cả quái trong bán kính 4m vào và tiêu hủy ngay lập tức | Hoàn thành Chapter 9 |

### Nâng cấp Pet
- Mỗi Pet có 5 cấp độ nâng cấp, dùng Gold.
- Cấp cao hơn: Tăng sát thương, giảm cooldown, tăng hiệu quả.

---

## 7. CẤU TRÚC CHI TIẾT 10 CHAPTER

### Bối cảnh & Quái xuất hiện

| Chapter | Tên | Bối cảnh | Số Wave | Quái Nổi Bật | Boss Cuối |
|---|---|---|---|---|---|
| 1 | **Iron District** | Thành phố hoang tàn, bầu trời ô nhiễm đỏ | 4 | Crawler, Husk | IRON WARDEN |
| 2 | **Bio Lab Omega** | Phòng thí nghiệm sinh hóa dưới lòng đất | 6 | Dasher, Bloater, Regen Beast, Parasite | NANO HYDRA |
| 3 | **Crystal Tundra** | Hành tinh băng giá, tường pha lê | 7 | Wraith, Cryo Leech, Shell Brute + Force Bubble | CRYSTAL COLOSSUS |
| 4 | **Hive Core** | Tổ hữu cơ khổng lồ | 7 | Swarm Queen, Brood Carrier, Splitter | SWARM MOTHER |
| 5 | **Orbital Fortress** | Trạm vũ trụ, nhìn thấy Trái Đất từ ngoài | 8 | Skywing, Disruptor, Healer Symbiont | OMEGA PRIME |
| 6 | **Mirror Dimension** | Chiều không gian phản chiếu, mọi thứ đảo ngược | 8 | Wraith, Dasher, Void Hulk | SHADOW ARCHITECT |
| 7 | **Magma Core** | Lòng núi lửa, dung nham chảy | 8 | Spitter, Siege Worm, Behemoth | VOLCANIC TITAN |
| 8 | **Time Rift** | Vết nứt không-thời gian, cảnh vật lặp lại | 9 | Healer Symbiont, Brood Carrier, Regen Beast + Force Bubble | CHRONO KEEPER |
| 9 | **Deep Space** | Hố đen, không gian hoàn toàn tối | 9 | Spitter, Siege Worm, Void Hulk | VOID LEVIATHAN |
| 10 | **Genesis Core** | Lõi năng lượng vũ trụ — Trận chiến cuối cùng | 10 | Tất cả 20 loại quái, xuất hiện ngẫu nhiên | GENESIS CORE |

---

### Lịch trình mở khóa Vũ khí trong Kho Trang Bị (Armory) theo Chapter

> Đạt Chapter chỉ là **điều kiện cần** để mở quyền mua vũ khí tại **Tab Trang Bị**; người chơi cần dùng **Gold (điều kiện đủ)** để mở khóa vĩnh viễn và đưa vào **bộ 3 súng mang ra trận** (không còn mở qua Cổng làn phải).

| Chapter | Vũ khí mở khóa mới trong Armory |
|---|---|
| 1 | Súng Lục, AK Hyperion, Shotgun Phân Mảnh |
| 2 | SMG Neon, Cryo Gun |
| 3 | Minigun, Tesla Gun, Scatter Gun |
| 4 | Đại Bác Cannon |
| 5 | Rocket Launcher, Grenade Launcher |
| 6 | Flamethrower, Acid Sprayer |
| 7 | Plasma Rifle |
| 8 | Rail Gun, Laser Cannon |
| 9 | Vortex Gun, Photon Burst |
| 10 | Nuke Launcher, ICBM Strike Unit |

---

## 8. HỆ THỐNG TIẾN TRÌNH VĨNH VIỄN (META PROGRESSION)

### Shop Nâng Cấp (Dùng Gold giữa các Run)

| Nâng cấp | Cấp tối đa | Mô tả |
|---|---|---|
| **Max HP** | 10 | +1 HP mỗi cấp |
| **Base Damage** | 10 | +10% sát thương mỗi cấp |
| **Clone Durability** | 5 | Clone chịu được thêm 1 đòn mỗi cấp |
| **Rage Gain Rate** | 5 | Tích nộ nhanh hơn 15% mỗi cấp |
| **Buff Duration** | 5 | Buff kéo dài hơn 20% mỗi cấp |
| **Gold Multiplier** | 5 | +10% Gold rơi ra từ quái mỗi cấp |
| **Pet Slot** | 2 | Mang được 2 → 3 Pet cùng lúc |
| **Bomb Starter** | 1 lần | Bắt đầu Run với sẵn 1 `[CLUSTER BOMB]` |

---

## 9. TÍCH HỢP CRAZYGAMES SDK

| Điểm chèn Rewarded Ad | Phần thưởng |
|---|---|
| Chết giữa Wave | Hồi sinh tại chỗ, giữ nguyên Clone & Buff |
| Chết khi đánh Boss | Hồi sinh với 3 HP, Boss giữ nguyên HP hiện tại |
| Màn hình Victory | x2 toàn bộ Gold của trận vừa rồi |
| Trước khi bắt đầu Run | Nhận ngay `[x2 CLONE]` buff |

| Điểm chèn Interstitial Ad | Cooldown |
|---|---|
| Chuyển Chapter (Victory → World Map) | Tối thiểu 3 phút |
| Defeat + người chơi chọn không hồi sinh | Tối thiểu 3 phút |

**Game Lifecycle bắt buộc:**
- Tab mất focus → Tự động Pause + Mute.
- Tab lấy lại focus → Hộp thoại "Tiếp tục?" trước khi resume.

---

## 10. QUY CHUẨN KỸ THUẬT MODEL 3D

| Loại | Định dạng | Dung lượng mục tiêu | Texture | Animation |
|---|---|---|---|---|
| Nhân vật chính | `.glb` / `.fbx` | ≤ 5 MB | 1024×1024 max | 30 FPS, ≤ 50 bones |
| Quái thường | `.glb` | ≤ 1.5 MB | 512×512 | 30 FPS, ≤ 30 bones |
| Boss | `.glb` | ≤ 3 MB | 1024×1024 | 30 FPS, ≤ 60 bones |
| Pet | `.glb` | ≤ 500 KB | 512×512 | 30 FPS, ≤ 20 bones |
| Buff Gate / Props | `.glb` | ≤ 300 KB | 512×512 | Không cần animation phức tạp |

**Nguồn tạo model:** AI gen (Meshy.ai / Tripo3D) → Gắn xương tự động qua Mixamo.

---

## 11. BUILD & DEPLOYMENT

```bash
# Build và chuẩn bị file tĩnh cho CrazyGames
pnpm build:crazygames
```
→ Nén toàn bộ nội dung trong `out/` thành `.zip` (index.html nằm ở tầng ngoài cùng).

**Cache Busting khi cập nhật model mới:**
Mỗi lần đổi model trên Cloudflare R2, nâng version trong `src/service/model-cache.ts`:
```typescript
export const MODEL_CACHE_STORAGE_NAME = "lane-shooter-3d-models-v3"; // tăng lên
```
