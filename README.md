# Graduation Vintage Invitation

Thiệp tốt nghiệp phong cách vintage scrapbook (React + Vite), ưu tiên điện thoại.

## Chạy thử

1. Cài Node.js bản LTS.
2. Giải nén thư mục và mở terminal trong thư mục dự án.
3. Chạy:

   ```bash
   npm install
   npm run dev
   ```

4. Mở địa chỉ local mà Vite hiển thị.

## Chỉnh nội dung

Mở `src/App.jsx`, sửa các trường trong `CONFIG`:
- `graduateName`
- `school`
- `graduationDate`
- `eventTime`
- `venue`
- `address`
- `mapsUrl`

Đổi ảnh minh họa bằng cách chép ảnh tốt nghiệp vào `public/images/graduate.jpg`, sau đó sửa `photoUrl` thành `/images/graduate.jpg`. Ảnh hiện tại chỉ là ảnh minh họa vector, không phải ảnh thật của bạn.

## Thư mời cá nhân hóa

Ứng dụng đọc `token` từ query string và gọi RPC `public.get_invitation(p_token uuid)`. Link có dạng:

```text
https://ten-site.vercel.app/?token=<INVITATION_UUID>
```

Lấy token riêng trong Supabase SQL Editor bằng truy vấn giới hạn theo khách:

```sql
select invitation_token
from public.guests
where guest_name = '<TEN_KHACH>';
```

Không đăng token hoặc link cá nhân lên nơi công khai; ai có link đều có thể mở lời mời tương ứng.

Để cấu hình Supabase:
1. Sao chép `.env.example` thành `.env.local` trong thư mục dự án.
2. Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` từ cấu hình API của dự án Supabase.
3. Khởi động lại `npm run dev`, hoặc cấu hình cùng hai biến trong môi trường hosting rồi build/deploy lại.

Chỉ dùng anon/publishable key ở frontend. Không đặt `service_role` key hoặc secret trong biến `VITE_*` hay trong mã phía trình duyệt. Không gửi các giá trị biến môi trường cho người khác.

Kiểm thử:
1. Chọn hai khách khác nhau trong SQL Editor, lấy riêng hai token và mở hai URL tương ứng ở hai cửa sổ/trình duyệt.
2. Mở thiệp; mỗi URL phải hiển thị đúng tên và nội dung thư lấy từ Supabase.
3. Thử `?token=not-a-uuid` để kiểm tra lỗi định dạng, rồi thử UUID hợp lệ nhưng không có trong bảng để kiểm tra trạng thái không tìm thấy.
4. Trong DevTools, kiểm tra Console và Network. Request hợp lệ sẽ gọi `get_invitation`; không chia sẻ token hay response có dữ liệu khách.

## RSVP

Sau khi tải được thư mời bằng token, khách có thể gửi RSVP qua RPC `public.submit_rsvp(p_token uuid, p_response text)`. Frontend chỉ gửi token trên URL và giá trị `yes`/`no`; RPC phía database chịu trách nhiệm xác thực khách và ghi nhận/cập nhật RSVP. Frontend không đọc trực tiếp bảng `rsvps`, không gửi tên/guest_key và không dùng `localStorage` làm RSVP.

Frontend chấp nhận RPC thành công dạng `void` (`data: null`), boolean `true`, một object kết quả, hoặc mảng đúng một object kết quả; các dấu hiệu lỗi như `success: false`, `ok: false`, `submit_rsvp: false`, trạng thái lỗi hoặc response khác lựa chọn sẽ bị từ chối. Mảng rỗng/nhiều dòng và kết quả không đúng cấu trúc hiển thị lỗi. Nếu định nghĩa SQL trả kiểu khác, cần đối chiếu trước khi sử dụng thay vì bỏ qua kiểm tra.

Thử cả hai lựa chọn trên link của một khách; sau đó dùng link đó gửi lựa chọn còn lại để xác nhận RSVP được cập nhật. Kiểm tra trạng thái thành công trên trang và lỗi chi tiết trong browser console. Không chia sẻ token hoặc response chứa dữ liệu khách.

## Tự động hết hạn sau 30 ngày

Đặt `VITE_INVITATION_EXPIRES_AT` trong `.env.local` thành ngày/giờ hết hạn ISO 8601, ví dụ `2026-11-16T23:59:00+07:00`. Giá trị phải được đặt trước khi build/deploy. Khi hết hạn, website hiện màn hình cảm ơn thay cho thiệp. Đây là khóa giao diện phía client, không phải biện pháp bảo mật để xóa dữ liệu.

## Deploy miễn phí

Có thể triển khai frontend lên Vercel bằng cách import repository GitHub hoặc chạy `npx vercel`. Gói miễn phí, giới hạn và điều khoản có thể thay đổi; hãy kiểm tra điều khoản hiện hành trước khi public. Cấu hình các biến môi trường trên dashboard Vercel rồi deploy lại.

## Trước khi gửi QR

- Thay ảnh minh họa bằng ảnh đã được bạn duyệt.
- Cập nhật ngày, giờ, địa điểm, lịch trình và link bản đồ.
- Thử link riêng của ít nhất hai khách và xác nhận tên/thư tương ứng.
- Thử gửi RSVP và đổi câu trả lời bằng một token thật; xác nhận hoạt động của RPC trong Supabase.
- Kiểm tra URL HTTPS và tạo QR sau khi đã deploy.
