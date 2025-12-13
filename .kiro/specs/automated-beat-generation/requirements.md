# Requirements Document

## Introduction

Hệ thống tạo beat nhạc không lời tự động là một nền tảng sản xuất nhạc tự động sử dụng AI, tích hợp nhiều API (Gemini, OpenAI, Suno) để tạo ra các beat nhạc đa dạng theo lịch trình. Hệ thống quản lý nhiều API key Suno, tự động tạo nhạc theo catalog đã định nghĩa, và lưu trữ toàn bộ metadata, prompt để tái sử dụng. Mục tiêu là tối ưu hóa việc sử dụng ngân sách miễn phí của Suno API và tạo ra thư viện beat phong phú cho nhiều mục đích sử dụng.

## Glossary

- **Beat Generator System**: Hệ thống tổng thể tạo beat nhạc tự động
- **Gemini API**: API của Google dùng để gợi ý concept, phân tích trend, tạo metadata
- **OpenAI API**: API của OpenAI dùng để chuẩn hóa prompt và sinh tag
- **Suno API**: API tạo nhạc chính của hệ thống
- **API Key Pool**: Danh sách các API key Suno do người dùng cung cấp
- **Beat Catalog**: File XML chứa định nghĩa các loại beat (Category, Genre, Style, Mood, Use-case)
- **Production Schedule**: Lịch trình tự động tạo nhạc (mỗi 15 phút một bài)
- **Prompt Template**: Mẫu prompt được lưu trữ để tái sử dụng
- **MySQL Database**: Cơ sở dữ liệu lưu trữ beat, metadata, prompt, API key status
- **Free Quota**: Ngân sách miễn phí của mỗi Suno API key

## Requirements

### Requirement 1

**User Story:** Là người quản trị hệ thống, tôi muốn quản lý nhiều Suno API key, để có thể tối ưu hóa việc sử dụng ngân sách miễn phí và đảm bảo hệ thống hoạt động liên tục.

#### Acceptance Criteria

1. WHEN người dùng thêm một API key mới THEN the Beat Generator System SHALL lưu trữ API key vào MySQL Database và đánh dấu trạng thái là active
2. WHEN the Beat Generator System kiểm tra quota của một API key THEN the Beat Generator System SHALL truy vấn Suno API để lấy thông tin quota còn lại và cập nhật vào MySQL Database
3. WHEN một API key hết quota miễn phí THEN the Beat Generator System SHALL đánh dấu API key đó là exhausted và chuyển sang sử dụng API key khác trong API Key Pool
4. WHEN tất cả API key đều hết quota THEN the Beat Generator System SHALL dừng Production Schedule và ghi log thông báo
5. THE Beat Generator System SHALL luân phiên sử dụng các API key active theo thuật toán round-robin để phân bổ đều quota

### Requirement 2

**User Story:** Là người quản trị nội dung, tôi muốn hệ thống đọc và phân tích Beat Catalog, để có thể tạo nhạc theo các phân loại đã định nghĩa.

#### Acceptance Criteria

1. WHEN hệ thống khởi động THEN the Beat Generator System SHALL đọc file beat_catalog.xml và parse toàn bộ thông tin Category, Genre, Style, Mood, Use-case, Tags, Prompt vào MySQL Database
2. WHEN Beat Catalog được cập nhật THEN the Beat Generator System SHALL phát hiện thay đổi và reload dữ liệu mới vào MySQL Database
3. THE Beat Generator System SHALL validate cấu trúc XML của Beat Catalog trước khi parse
4. WHEN dữ liệu Beat Catalog không hợp lệ THEN the Beat Generator System SHALL ghi log lỗi chi tiết và giữ nguyên dữ liệu cũ trong MySQL Database
5. THE Beat Generator System SHALL lưu trữ mỗi beat template với unique identifier liên kết với Category, Genre, Style, Mood

### Requirement 3

**User Story:** Là hệ thống tự động, tôi muốn tạo concept và chuẩn hóa prompt qua AI, để đảm bảo chất lượng và tính đa dạng của beat được tạo ra.

#### Acceptance Criteria

1. WHEN Production Schedule chọn một beat template THEN the Beat Generator System SHALL gửi thông tin Category, Genre, Style, Mood đến Gemini API để nhận concept suggestion và trend analysis
2. WHEN nhận được concept từ Gemini API THEN the Beat Generator System SHALL gửi concept và base prompt đến OpenAI API để chuẩn hóa prompt và sinh tag bổ sung
3. WHEN OpenAI API trả về normalized prompt THEN the Beat Generator System SHALL lưu trữ prompt vào MySQL Database với liên kết đến beat template và timestamp
4. IF Gemini API hoặc OpenAI API trả về lỗi THEN the Beat Generator System SHALL retry tối đa 3 lần với exponential backoff
5. IF sau 3 lần retry vẫn lỗi THEN the Beat Generator System SHALL sử dụng base prompt từ Beat Catalog và ghi log warning

### Requirement 4

**User Story:** Là hệ thống sản xuất, tôi muốn gọi Suno API để tạo nhạc, để chuyển đổi prompt thành beat nhạc thực tế.

#### Acceptance Criteria

1. WHEN the Beat Generator System có normalized prompt THEN the Beat Generator System SHALL chọn một API key active từ API Key Pool và gửi request tạo nhạc đến Suno API
2. WHEN Suno API bắt đầu xử lý THEN the Beat Generator System SHALL lưu trữ job ID và trạng thái processing vào MySQL Database
3. WHEN Suno API hoàn thành tạo nhạc THEN the Beat Generator System SHALL tải về file nhạc, lưu trữ URL hoặc file path vào MySQL Database
4. WHEN Suno API trả về lỗi rate limit THEN the Beat Generator System SHALL chuyển sang API key khác trong API Key Pool và retry request
5. THE Beat Generator System SHALL poll Suno API để kiểm tra trạng thái job với interval 10 giây cho đến khi hoàn thành hoặc timeout sau 5 phút

### Requirement 5

**User Story:** Là hệ thống metadata, tôi muốn Gemini API tạo tên, tag và mô tả cho beat, để có thể quản lý và tìm kiếm beat dễ dàng.

#### Acceptance Criteria

1. WHEN Suno API hoàn thành tạo nhạc THEN the Beat Generator System SHALL gửi thông tin beat (Genre, Style, Mood, prompt) đến Gemini API để tạo tên beat
2. WHEN Gemini API trả về tên beat THEN the Beat Generator System SHALL gửi tiếp request để tạo tag phù hợp cho quản lý
3. WHEN Gemini API trả về tags THEN the Beat Generator System SHALL gửi request cuối cùng để tạo mô tả chi tiết cho beat
4. WHEN nhận đủ tên, tags và mô tả THEN the Beat Generator System SHALL lưu trữ toàn bộ metadata vào MySQL Database liên kết với beat record
5. THE Beat Generator System SHALL đảm bảo tên beat là unique bằng cách thêm suffix nếu trùng lặp

### Requirement 6

**User Story:** Là hệ thống lập lịch, tôi muốn tự động tạo beat theo lịch trình, để duy trì sản xuất liên tục mà không cần can thiệp thủ công.

#### Acceptance Criteria

1. WHEN Production Schedule được kích hoạt THEN the Beat Generator System SHALL tạo một beat mới mỗi 15 phút
2. WHEN đến thời điểm tạo beat THEN the Beat Generator System SHALL chọn ngẫu nhiên một beat template từ Beat Catalog chưa được sử dụng trong 24 giờ gần nhất
3. WHEN tất cả beat template đã được sử dụng trong 24 giờ THEN the Beat Generator System SHALL reset danh sách và chọn ngẫu nhiên từ toàn bộ catalog
4. WHEN một beat creation job đang chạy THEN the Beat Generator System SHALL bỏ qua lịch trình tiếp theo cho đến khi job hiện tại hoàn thành
5. THE Beat Generator System SHALL ghi log mỗi lần thực thi Production Schedule với timestamp, beat template, và kết quả

### Requirement 7

**User Story:** Là người phát triển, tôi muốn lưu trữ prompt cẩn thận, để có thể tái sử dụng và phối nhạc tương tự trong tương lai.

#### Acceptance Criteria

1. WHEN một prompt được tạo THEN the Beat Generator System SHALL lưu trữ prompt với version number, timestamp, và liên kết đến beat template
2. THE Beat Generator System SHALL lưu trữ cả base prompt từ Beat Catalog và normalized prompt từ OpenAI API
3. THE Beat Generator System SHALL lưu trữ concept suggestion và trend analysis từ Gemini API cùng với prompt
4. WHEN cần tái sử dụng prompt THEN the Beat Generator System SHALL cho phép query prompt theo beat template, Genre, Style, Mood, hoặc tags
5. THE Beat Generator System SHALL lưu trữ thông tin API key đã sử dụng và kết quả (success/failure) cho mỗi prompt execution

### Requirement 8

**User Story:** Là người quản trị dữ liệu, tôi muốn sử dụng MySQL để lưu trữ, để có thể quản lý và truy vấn dữ liệu hiệu quả.

#### Acceptance Criteria

1. THE Beat Generator System SHALL sử dụng MySQL Database với các bảng: api_keys, beat_templates, beats, prompts, metadata, execution_logs
2. WHEN lưu trữ dữ liệu THEN the Beat Generator System SHALL sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
3. THE Beat Generator System SHALL tạo index trên các cột thường xuyên query: beat_template_id, genre, style, mood, created_at
4. WHEN query dữ liệu THEN the Beat Generator System SHALL sử dụng prepared statement để tránh SQL injection
5. THE Beat Generator System SHALL backup MySQL Database hàng ngày vào lúc 00:00 UTC

### Requirement 9

**User Story:** Là người vận hành hệ thống, tôi muốn có logging và monitoring, để theo dõi hoạt động và xử lý lỗi kịp thời.

#### Acceptance Criteria

1. THE Beat Generator System SHALL ghi log mọi API call với timestamp, endpoint, request payload, response status, và execution time
2. WHEN xảy ra lỗi THEN the Beat Generator System SHALL ghi log với level ERROR bao gồm stack trace và context information
3. THE Beat Generator System SHALL ghi log quota status của mỗi API key sau mỗi lần sử dụng
4. THE Beat Generator System SHALL tạo daily summary report về số lượng beat đã tạo, API key status, và error rate
5. WHEN error rate vượt quá 20% trong 1 giờ THEN the Beat Generator System SHALL gửi alert notification

### Requirement 10

**User Story:** Là người dùng hệ thống, tôi muốn có API endpoint để truy vấn beat, để có thể tích hợp với các ứng dụng khác.

#### Acceptance Criteria

1. THE Beat Generator System SHALL cung cấp REST API endpoint để query beat theo Genre, Style, Mood, tags
2. WHEN client gửi GET request đến /api/beats THEN the Beat Generator System SHALL trả về danh sách beat với pagination (default 20 items per page)
3. WHEN client gửi GET request đến /api/beats/:id THEN the Beat Generator System SHALL trả về chi tiết beat bao gồm metadata, prompt, file URL
4. THE Beat Generator System SHALL cung cấp endpoint /api/stats để xem thống kê tổng quan về số lượng beat, API key status
5. THE Beat Generator System SHALL implement rate limiting 100 requests per minute per IP address cho tất cả API endpoint
