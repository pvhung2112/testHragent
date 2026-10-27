# Intelligent HR Assistant (HR Agent)

**Intelligent HR Assistant** là một nền tảng quản lý tuyển dụng toàn diện, tự động hóa các quy trình sàng lọc hồ sơ, ghép nối công việc (job matching), và phân tích ứng viên. Hệ thống ứng dụng sức mạnh của **Generative AI (Google Gemini)**, trích xuất dữ liệu có cấu trúc và sở hữu giao diện người dùng full-stack hiện đại.

---

## Mục tiêu dự án

Ứng dụng được thiết kế nhằm giúp các chuyên viên Nhân sự (HR) / Tuyển dụng:
- **Tự động phân tích CV** (PDF / văn bản) thành định dạng JSON có cấu trúc.
- **Tự động tìm kiếm ứng viên tiềm năng** bằng cách khai thác thông tin từ LinkedIn, GitHub và các nguồn công khai khác qua luồng duyệt web tự động (agentic browsing).
- **Lưu trữ và quản lý** hồ sơ ứng viên và các bài đăng tuyển dụng.
- **Đánh giá mức độ phù hợp** giữa ứng viên và công việc bằng AI/ngữ nghĩa.
- **Tạo và gửi email tiếp cận (outreach emails)** hoàn toàn tự động khi tìm thấy ứng viên phù hợp.
- **Cung cấp thông tin chi tiết nhanh chóng** (tóm tắt năng lực, cảnh báo rủi ro (red flags), gợi ý câu hỏi phỏng vấn).

> **Luồng làm việc tiêu chuẩn:** Tải CV lên ➔ Phân tích ➔ Lưu trữ ➔ Đánh giá bằng AI ➔ Liên hệ tự động.

---

## Các tính năng chính

### 1. Phân tích & Trích xuất CV (Data Structuring)
- Tải file CV (PDF/Text) trực tiếp qua giao diện web.
- Sử dụng **Google Gemini** (qua `@google/genai`) để đọc và trích xuất dữ liệu ứng viên thành cấu trúc rõ ràng.
- Lưu trữ dữ liệu đã phân tích vào cơ sở dữ liệu MongoDB.

### 2. Quản lý Tin tuyển dụng (Job Management)
- Tạo mới, cập nhật, xóa và liệt kê các bài đăng tuyển dụng.
- Sử dụng tin tuyển dụng làm dữ liệu gốc để AI đối chiếu với hồ sơ ứng viên.

### 3. Quản lý Ứng viên (Candidate Management)
- Danh sách ứng viên đi kèm tóm tắt hồ sơ (kỹ năng nổi bật, thông tin liên hệ, link CV).
- Hồ sơ chi tiết bao gồm lịch sử học vấn, kinh nghiệm làm việc, dự án thực tế và bộ kỹ năng.

### 4. Ghép nối Ứng viên & Công việc bằng AI
Khi chọn một ứng viên và một tin tuyển dụng, **Gemini AI** sẽ tự động:
- Chấm **điểm phù hợp** (Matching score).
- Đưa ra bản **tóm tắt** ngắn gọn.
- Chỉ ra các **điểm cần lưu ý/rủi ro** (Red flags).
- Đề xuất **câu hỏi phỏng vấn** chuyên sâu.

### 5. Tìm kiếm Ứng viên Tự động (Sourcing)
- Tích hợp Nanobrowser (agent flows) để tự động rà soát các hồ sơ khớp với tiêu chí tuyển dụng.
- Thu thập dữ liệu công khai (Trạng thái Open to work, Tech stack, Chức danh) từ LinkedIn/GitHub để xây dựng danh sách tiềm năng.

### 6. Gửi Email & Lên lịch Tự động
- Tự động tạo email cá nhân hóa dựa trên template AI và bối cảnh của ứng viên/công việc.
- Lên lịch hoặc gửi email trực tiếp qua dịch vụ tích hợp.
- Theo dõi trạng thái phản hồi của ứng viên.

### 7. Xác thực & Bảo mật
- Xác thực bằng Token (JWT được lưu trong HTTP-only cookie).
- Bảo vệ các API endpoints bằng middleware an toàn.

---

## Công nghệ sử dụng (Tech Stack)

- **Backend:** Node.js, Express, TypeScript
- **Cơ sở dữ liệu:** MongoDB (Mongoose)
- **Frontend:** React, Vite, React Router, Axios
- **AI Engine:** Google Gemini (`@google/genai`)
- **Lưu trữ file:** Multer (in-memory), Cloudinary
- **Xác thực:** JWT (JSON Web Tokens)

---

## Kiến trúc hệ thống

Dự án được cấu trúc theo mô hình **Monorepo** bao gồm hai ứng dụng chính và một module công cụ:

```text
 repository
 ┣ backend/       # Node.js + Express API server
 ┣ frontend/      # React (Vite) client UI
 ┗ nanobrowser/   # Agent flow dùng để rà soát/sourcing web tự động
```

---

## Hướng dẫn cài đặt & Chạy dự án với Docker

Dự án đã được cấu hình sẵn **Docker** và **Docker Compose**, cho phép đóng gói và khởi chạy toàn bộ 3 dịch vụ (**MongoDB**, **Backend**, **Frontend**) chỉ với một câu lệnh mà không cần cài đặt môi trường Node.js hay MongoDB trên máy chủ.

### 1. Yêu cầu tiên quyết (Prerequisites)

- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS, Windows hoặc Linux).
- Docker daemon đang chạy (kiểm tra bằng `docker --version` và `docker compose version`).

---

### 2. Chuẩn bị cấu hình biến môi trường (Environment Setup)

Trước khi khởi chạy các container, bạn cần chuẩn bị tệp cấu hình môi trường cho backend:

1. Di chuyển vào thư mục `backend` và sao chép tệp `.env.example` thành `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Cập nhật các thông số quan trọng trong `backend/.env` (đặc biệt là API Key cho AI và các dịch vụ thứ 3):
   ```env
   PORT=5050
   ACCESS_TOKEN_SECRET=your_super_secret_jwt_key_here

   # Khi chạy qua Docker Compose, MongoDB URI đã tự động cấu hình tới container "mongodb"
   MONGODB_URI=mongodb://mongodb:27017/hr_agent

   # API Key cho Google Gemini (Bắt buộc cho phân tích CV và Job matching)
   GEMINI_API_KEY=your_google_gemini_api_key_here

   # Cloudinary (Lưu trữ ảnh avatar, file CV tải lên)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Cấu hình Mail SMTP (Tùy chọn)
   MAIL_USER=your_email@gmail.com
   PASSWORD_USER=your_app_password
   ```

---

### 3. Khởi chạy toàn bộ hệ thống bằng Docker Compose

Từ thư mục gốc của dự án (`testHragent`), chạy lệnh:

```bash
docker compose up -d --build
```
> *(Nếu máy tính sử dụng phiên bản Docker Compose cũ hơn, hãy dùng cú pháp: `docker-compose up -d --build`)*

Docker Compose sẽ tự động xây dựng và khởi động 3 container:
1. **`hr_agent_mongodb`**: Chạy MongoDB (port `27017`) kèm cơ chế kiểm tra trạng thái (healthcheck).
2. **`hr_agent_backend`**: Biên dịch mã nguồn Node.js/TypeScript (`node:22-slim`), kết nối tới MongoDB và lắng nghe tại cổng `5050`.
3. **`hr_agent_frontend`**: Multi-stage build ứng dụng React Vite (`node:22-alpine`) và phân phối qua máy chủ web Nginx (`nginx:alpine`) tại cổng `5173`.

---

### 4. Truy cập ứng dụng

Khi các container đã ở trạng thái chạy (`running`), bạn có thể truy cập các đường dẫn sau:

| Dịch vụ | Địa chỉ truy cập (URL) | Chức năng |
| :--- | :--- | :--- |
| **Frontend (Giao diện Web)** | [http://localhost:5173](http://localhost:5173) | Ứng dụng web React để tương tác, quản lý hồ sơ và tuyển dụng |
| **Backend API** | [http://localhost:5050](http://localhost:5050) | RESTful API server |
| **MongoDB** | `mongodb://localhost:27017` | Kết nối trực tiếp cơ sở dữ liệu qua MongoDB Compass hoặc DBeaver |

---

### 5. Các lệnh quản lý Docker thông dụng

- **Kiểm tra trạng thái các container:**
  ```bash
  docker compose ps
  ```

- **Xem toàn bộ log thời gian thực:**
  ```bash
  docker compose logs -f
  ```

- **Xem log của từng dịch vụ riêng biệt:**
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  docker compose logs -f mongodb
  ```

- **Khởi động lại một dịch vụ cụ thể:**
  ```bash
  docker compose restart backend
  ```

- **Dừng hệ thống (bảo toàn dữ liệu trong MongoDB):**
  ```bash
  docker compose down
  ```

- **Dừng hệ thống và XÓA sạch dữ liệu database (volumes):**
  ```bash
  docker compose down -v
  ```

- **Rebuild lại toàn bộ container sau khi chỉnh sửa mã nguồn:**
  ```bash
  docker compose up -d --build
  ```

---

### 6. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi trùng cổng (Port conflict - 27017, 5050, 5173):**
   - Nếu bạn đã có MongoDB cài đặt cục bộ đang chạy nền, hãy tạm thời dừng service này (`brew services stop mongodb-community` trên macOS hoặc dừng dịch vụ trong Windows Services).
   - Đảm bảo các cổng `5050` và `5173` không bị chiếm dụng bởi tiến trình khác.

2. **Lỗi trích xuất CV hoặc gọi AI thất bại:**
   - Kiểm tra xem bạn đã cấu hình chính xác `GEMINI_API_KEY` trong `backend/.env` hay chưa.
   - Kiểm tra chi tiết log backend: `docker compose logs -f backend`.

3. **Frontend báo lỗi kết nối Network Error khi gọi API:**
   - Đảm bảo container `hr_agent_backend` đã khởi động thành công và vượt qua bước kết nối cơ sở dữ liệu MongoDB.
   - Kiểm tra CORS hoặc truy cập trực tiếp `http://localhost:5050` để xác nhận backend phản hồi.
