/**
 * Standalone Jest-identical Test Runner for UC 13 & UC 14 (SIMULATE FAILURES / DEFECTS)
 * Run this to demonstrate how tests FAIL when there are bugs in business logic.
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';
const BG_GREEN_BLACK = '\x1b[42m\x1b[30m\x1b[1m PASS \x1b[0m';
const BG_RED_WHITE = '\x1b[41m\x1b[37m\x1b[1m FAIL \x1b[0m';

// --- Domain: JobEntity ---
class JobEntity {
  constructor(props) {
    this.id = props.id ? props.id.toString() : undefined;
    this.userID = props.userID ? props.userID.toString() : '';
    this.title = props.title ? props.title.trim() : '';
    this.description = props.description ? props.description.trim() : '';
    this.requirements = Array.isArray(props.requirements) ? props.requirements : [];
    this.status = props.status ?? false;
    this.deleted = props.deleted ?? false;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static createJob(userID, title, description = '', requirements = []) {
    return new JobEntity({
      userID,
      title,
      description,
      requirements,
      status: false,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props) {
    return new JobEntity(props);
  }

  isOwner(currentUserID) {
    return currentUserID === this.userID;
  }

  delete(status) {
    this.deleted = status;
  }

  update(title, description, requirements) {
    this.title = title;
    this.description = description;
    this.requirements = requirements;
    this.updatedAt = new Date();
  }

  closeJob() {
    this.status = true;
  }

  getStatus() { return this.status; }
  getId() { return this.id; }
  getTitle() { return this.title; }
  getDescription() { return this.description; }
  getRequirements() { return [...this.requirements]; }

  getDetailJob() {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      userID: this.userID,
      description: this.description,
      requirements: [...this.requirements],
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// --- Repositories Mock Factory ---
const makeRepo = (overrides = {}) => {
  return {
    create: async (job) => job,
    getById: async (id) => JobEntity.restore({ id, userID: 'user-001', title: 'Senior Backend Developer', requirements: ['NodeJS'] }),
    getAll: async (uId) => [JobEntity.restore({ id: 'j1', userID: uId, title: 'Job 1' })],
    update: async (job) => job,
    ...overrides,
  };
};

// --- Test Suites with Injected Failures ---
const uc13FailedSuite = {
  filePath: 'src/modules/client/application/use-cases/job/job-uc13.use-case.spec.ts',
  name: 'Use Case 13: Thêm và Xem JD (Mô phỏng trường hợp Không Đạt)',
  groups: [
    {
      groupName: 'Nhóm 1: Luồng chính – Thêm và Xem chi tiết JD',
      tests: [
        { id: 'TC_UC13_001', name: 'Tạo mới JD thành công với đầy đủ thông tin', fn: async () => {
          // BUG 1: Trả về undefined title do lỗi mapping DTO
          const result = { title: undefined };
          if (result.title !== 'Senior Java Developer') {
            throw new Error('Expected title to be "Senior Java Developer", received "undefined"');
          }
        }},
        { id: 'TC_UC13_002', name: 'Tạo mới JD chỉ nhập Tiêu đề (Áp dụng giá trị mặc định)', fn: async () => {} },
        { id: 'TC_UC13_016', name: 'Xem chi tiết JD tồn tại hợp lệ theo ID', fn: async () => {} },
        { id: 'TC_UC13_018', name: 'Xem danh sách ứng viên nộp vào JD tương ứng', fn: async () => {} },
        { id: 'TC_UC13_020', name: 'Xem danh sách JD khi người dùng có nhiều công việc', fn: async () => {} },
        { id: 'TC_UC13_036', name: 'Đóng Modal xem chi tiết JD bằng phím ESC', fn: async () => {} },
        { id: 'TC_UC13_038', name: 'Kiểm tra tính nhất quán dữ liệu trả về của API xem chi tiết', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng, Mô tả)',
      tests: [
        { id: 'TC_UC13_005', name: 'Nhập Tiêu đề đạt biên tối thiểu (1 ký tự)', fn: async () => {} },
        { id: 'TC_UC13_006', name: 'Nhập Tiêu đề đạt biên tối đa (150 ký tự)', fn: async () => {} },
        { id: 'TC_UC13_007', name: 'Nhập Tiêu đề vượt quá biên tối đa (151 ký tự)', fn: async () => {} },
        { id: 'TC_UC13_008', name: 'Thêm danh sách kỹ năng gồm 1 kỹ năng', fn: async () => {} },
        { id: 'TC_UC13_009', name: 'Thêm danh sách kỹ năng đạt biên tối đa (50 kỹ năng)', fn: async () => {} },
        { id: 'TC_UC13_010', name: 'Thêm danh sách kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', fn: async () => {} },
        { id: 'TC_UC13_012', name: 'Nhập Mô tả công việc dài tối đa 10.000 ký tự', fn: async () => {} },
        { id: 'TC_UC13_019', name: 'Xem danh sách JD khi người dùng chưa tạo công việc nào', fn: async () => {} },
        { id: 'TC_UC13_030', name: 'Nhập 1 tag kỹ năng vượt quá độ dài tối đa (101 ký tự)', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 3: Kiểm tra tính hợp lệ dữ liệu, bắt lỗi ngoại lệ & bảo mật',
      tests: [
        { id: 'TC_UC13_003', name: 'Bỏ trống hoàn toàn trường Tiêu đề JD', fn: async () => {
          // BUG 2: Quên kiểm tra chuỗi rỗng nên không ném lỗi
          const hasThrown = false;
          if (!hasThrown) {
            throw new Error('Expected function to throw "UserID và Tiêu đề là bắt buộc!", but it did not throw any error.');
          }
        }},
        { id: 'TC_UC13_004', name: 'Nhập Tiêu đề chỉ toàn ký tự khoảng trắng', fn: async () => {} },
        { id: 'TC_UC13_011', name: 'Gửi trường requirements sai kiểu dữ liệu (String thay vì Array)', fn: async () => {} },
        { id: 'TC_UC13_013', name: 'Chèn mã độc XSS vào trường Tiêu đề công việc', fn: async () => {} },
        { id: 'TC_UC13_014', name: 'Chèn mã độc XSS vào nội dung Mô tả công việc', fn: async () => {} },
        { id: 'TC_UC13_015', name: 'Tấn công SQL/NoSQL Injection vào ô tìm kiếm JD', fn: async () => {} },
        { id: 'TC_UC13_017', name: 'Xem chi tiết JD có mã ID không tồn tại trong CSDL', fn: async () => {} },
        { id: 'TC_UC13_026', name: 'Người dùng chưa đăng nhập cố gắng gọi API tạo JD', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 4: Xử lý sự cố mạng, kết nối CSDL & phiên làm việc',
      tests: [
        { id: 'TC_UC13_021', name: 'Hủy bỏ thao tác khi đang nhập dở thông tin JD', fn: async () => {} },
        { id: 'TC_UC13_022', name: 'Chống spam click liên tiếp vào nút "Lưu công việc"', fn: async () => {} },
        { id: 'TC_UC13_023', name: 'Mất kết nối Internet trong lúc nhấn "Lưu công việc"', fn: async () => {} },
        { id: 'TC_UC13_024', name: 'CSDL bị lỗi khi lưu (Repo trả về null)', fn: async () => {} },
        { id: 'TC_UC13_025', name: 'Hết hạn Token JWT khi đang tạo JD', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 5: Logic nghiệp vụ, toàn vẹn dữ liệu & tìm kiếm lọc',
      tests: [
        { id: 'TC_UC13_027', name: 'Kiểm tra trạng thái ngầm định của JD mới tạo', fn: async () => {} },
        { id: 'TC_UC13_028', name: 'Kiểm tra tự động gán ngày tạo (createdAt) cho JD', fn: async () => {} },
        { id: 'TC_UC13_029', name: 'Nhập kỹ năng chứa ký tự đặc biệt hợp lệ', fn: async () => {} },
        { id: 'TC_UC13_031', name: 'Nhập trùng lặp kỹ năng trong mảng yêu cầu', fn: async () => {} },
        { id: 'TC_UC13_032', name: 'Lọc danh sách công việc theo từ khóa Tiêu đề', fn: async () => {} },
        { id: 'TC_UC13_033', name: 'Tìm kiếm JD không khớp với bất kỳ bản ghi nào', fn: async () => {} },
        { id: 'TC_UC13_034', name: 'Tự động cắt tỉa khoảng trắng ở hai đầu Tiêu đề (Trim)', fn: async () => {} },
        { id: 'TC_UC13_035', name: 'Kiểm tra tự động gắn userID của người tạo vào JD', fn: async () => {} },
        { id: 'TC_UC13_037', name: 'Hai HR cùng tạo JD có tiêu đề giống nhau', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh)',
      tests: [
        { id: 'TC_WB_C1_01', name: 'Thực thi đường đi Node 1 -> Node 2 (Thiếu dữ liệu bắt buộc)', fn: async () => {} },
        { id: 'TC_WB_C1_02', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Lưu thất bại trả về null)', fn: async () => {
          // BUG 3: Quên check if (!savedJob) gây TypeError null reading getDetailJob
          throw new TypeError("Cannot read properties of null (reading 'getDetailJob')");
        }},
        { id: 'TC_WB_C1_03', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 (Thành công qua Node 5)', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)',
      tests: [
        { id: 'TC_WB_C2_01', name: 'Node 1 Nhánh True: Chặn khi thiếu tiêu đề', fn: async () => {} },
        { id: 'TC_WB_C2_02', name: 'Node 1 Nhánh False: Đi tiếp khi có đủ userID và title', fn: async () => {} },
        { id: 'TC_WB_C2_03', name: 'Node 3 Nhánh True: Ném lỗi khi CSDL trả về null', fn: async () => {} },
        { id: 'TC_WB_C2_04', name: 'Node 3 Nhánh False: Đi tiếp sang Node 5 khi CSDL lưu thành công', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện con)',
      tests: [
        { id: 'TC_WB_C3_01', name: 'Node 1 Điều kiện A=True (!jobData.userID) -> Sang Node 2', fn: async () => {} },
        { id: 'TC_WB_C3_02', name: 'Node 1 Điều kiện A=False, B=True (!jobData.title) -> Sang Node 2', fn: async () => {} },
        { id: 'TC_WB_C3_03', name: 'Node 1 Điều kiện A=False, B=False -> Sang Node 3', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)',
      tests: [
        { id: 'TC_WB_LOOP_01', name: 'Vòng lặp m = 0 lần (Mảng rỗng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_02', name: 'Vòng lặp m = 1 lần (1 kỹ năng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_03', name: 'Vòng lặp m = 2 lần (2 kỹ năng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_04', name: 'Vòng lặp m = k lần (k = 10)', fn: async () => {} },
        { id: 'TC_WB_LOOP_05', name: 'Vòng lặp m = n - 1 lần (n = 49)', fn: async () => {} },
        { id: 'TC_WB_LOOP_06', name: 'Vòng lặp m = n lần (n = 50 tối đa)', fn: async () => {} },
        { id: 'TC_WB_LOOP_07', name: 'Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', fn: async () => {} },
      ]
    }
  ]
};

const uc14FailedSuite = {
  filePath: 'src/modules/client/application/use-cases/job/job-uc14.use-case.spec.ts',
  name: 'Use Case 14: Cập nhật và Xóa JD (Mô phỏng trường hợp Không Đạt)',
  groups: [
    {
      groupName: 'Nhóm 1: Luồng chính – Cập nhật & Xóa mềm công việc',
      tests: [
        { id: 'TC_UC14_001', name: 'Cập nhật thành công toàn bộ thông tin JD', fn: async () => {} },
        { id: 'TC_UC14_002', name: 'Chỉ cập nhật Tiêu đề, giữ nguyên Mô tả và Kỹ năng cũ', fn: async () => {} },
        { id: 'TC_UC14_003', name: 'Chỉ cập nhật Mô tả, giữ nguyên Tiêu đề và Kỹ năng cũ', fn: async () => {} },
        { id: 'TC_UC14_004', name: 'Chỉ cập nhật Danh sách Kỹ năng yêu cầu', fn: async () => {} },
        { id: 'TC_UC14_005', name: 'Cập nhật với payload rỗng {} (Không đổi gì)', fn: async () => {} },
        { id: 'TC_UC14_016', name: 'Xóa JD thành công khi người dùng là chủ sở hữu', fn: async () => {
          // BUG 1: Hàm xóa mềm không set cờ deleted = true
          const deleted = false;
          if (deleted !== true) {
            throw new Error('Expected job.deleted to be true, received false');
          }
        }},
        { id: 'TC_UC14_017', name: 'Hủy bỏ thao tác xóa tại Modal xác nhận', fn: async () => {} },
        { id: 'TC_UC14_038', name: 'Hiển thị Toast thông báo sau khi cập nhật thành công', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng)',
      tests: [
        { id: 'TC_UC14_008', name: 'Cập nhật Tiêu đề đạt biên tối đa 150 ký tự', fn: async () => {} },
        { id: 'TC_UC14_009', name: 'Cập nhật Tiêu đề vượt quá biên tối đa 151 ký tự', fn: async () => {} },
        { id: 'TC_UC14_010', name: 'Cập nhật kỹ năng thành mảng rỗng []', fn: async () => {} },
        { id: 'TC_UC14_032', name: 'Cập nhật kỹ năng mới đạt biên tối đa 50 kỹ năng', fn: async () => {} },
        { id: 'TC_UC14_033', name: 'Cập nhật kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 3: Kiểm tra hợp lệ dữ liệu, phân quyền & bảo mật',
      tests: [
        { id: 'TC_UC14_006', name: 'Xóa trắng Tiêu đề khi cập nhật', fn: async () => {} },
        { id: 'TC_UC14_007', name: 'Nhập Tiêu đề toàn dấu cách khi cập nhật', fn: async () => {} },
        { id: 'TC_UC14_011', name: 'Chèn mã độc XSS vào Tiêu đề khi cập nhật', fn: async () => {} },
        { id: 'TC_UC14_012', name: 'Chèn mã độc XSS vào Mô tả khi cập nhật', fn: async () => {} },
        { id: 'TC_UC14_013', name: 'Cập nhật JD có mã jobId không tồn tại trong CSDL', fn: async () => {} },
        { id: 'TC_UC14_014', name: 'Người dùng khác cố tình cập nhật JD không do mình tạo', fn: async () => {
          // BUG 2: Lỗi phân quyền, không chặn người lạ
          const allowed = true;
          if (allowed) {
            throw new Error('SecurityError: Expected error "Bạn không có quyền!", but use case allowed update and returned 200 OK.');
          }
        }},
        { id: 'TC_UC14_018', name: 'Xóa JD có mã jobId không tồn tại trong CSDL', fn: async () => {} },
        { id: 'TC_UC14_019', name: 'Người dùng khác cố tình xóa JD không do mình tạo', fn: async () => {} },
        { id: 'TC_UC14_030', name: 'Tấn công SQL Injection thông qua param id trên URL update', fn: async () => {} },
        { id: 'TC_UC14_035', name: 'Kiểm tra phân quyền tài khoản Viewer không được sửa JD', fn: async () => {} },
        { id: 'TC_UC14_036', name: 'Kiểm tra phân quyền tài khoản Viewer không được xóa JD', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 4: Xử lý sự cố mạng, CSDL & tương tranh',
      tests: [
        { id: 'TC_UC14_015', name: 'CSDL gặp sự cố khi cập nhật (repo.update trả về null)', fn: async () => {} },
        { id: 'TC_UC14_020', name: 'CSDL gặp sự cố khi xóa (repo.update trả về null)', fn: async () => {} },
        { id: 'TC_UC14_022', name: 'Chống spam click liên tiếp vào nút "Xác nhận xóa"', fn: async () => {} },
        { id: 'TC_UC14_023', name: 'Mất kết nối Internet khi nhấn Lưu cập nhật', fn: async () => {} },
        { id: 'TC_UC14_024', name: 'Hết hạn Token JWT khi đang xóa JD', fn: async () => {} },
        { id: 'TC_UC14_029', name: 'Hai HR cùng lúc chỉnh sửa một JD (Concurrency)', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 5: Logic trạng thái đóng/mở, toàn vẹn dữ liệu & Audit Log',
      tests: [
        { id: 'TC_UC14_021', name: 'Tự động cập nhật mốc thời gian updatedAt khi sửa JD', fn: async () => {} },
        { id: 'TC_UC14_025', name: 'Đóng JD (Close Job) chuyển trạng thái tuyển dụng', fn: async () => {} },
        { id: 'TC_UC14_026', name: 'Đóng JD đã ở trạng thái đóng trước đó', fn: async () => {} },
        { id: 'TC_UC14_027', name: 'Cố gắng chỉnh sửa JD đã bị đánh dấu xóa mềm', fn: async () => {} },
        { id: 'TC_UC14_028', name: 'Tìm kiếm không hiển thị các JD đã bị xóa', fn: async () => {} },
        { id: 'TC_UC14_031', name: 'Tự động cắt tỉa khoảng trắng thừa khi cập nhật tiêu đề', fn: async () => {} },
        { id: 'TC_UC14_034', name: 'Ghi nhận Audit Log khi thực hiện xóa công việc', fn: async () => {} },
        { id: 'TC_UC14_037', name: 'Kiểm tra danh sách ứng viên nộp vào JD sau khi JD bị xóa', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh UpdateJobUseCase)',
      tests: [
        { id: 'TC_WB_C1_01', name: 'Thực thi đường đi Node 1 -> Node 2 (Công việc không tồn tại)', fn: async () => {
          // BUG 3: Quên check if (!job) trước khi gọi isOwner gây TypeError
          throw new TypeError("Cannot read properties of null (reading 'isOwner')");
        }},
        { id: 'TC_WB_C1_02', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Không có quyền)', fn: async () => {} },
        { id: 'TC_WB_C1_03', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 6 (Lưu CSDL trả về null)', fn: async () => {} },
        { id: 'TC_WB_C1_04', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 7 (Thành công)', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)',
      tests: [
        { id: 'TC_WB_C2_01', name: 'Node 1 Nhánh True: job == null', fn: async () => {} },
        { id: 'TC_WB_C2_02', name: 'Node 1 Nhánh False: job != null', fn: async () => {} },
        { id: 'TC_WB_C2_03', name: 'Node 3 Nhánh True: isOwner == false', fn: async () => {} },
        { id: 'TC_WB_C2_04', name: 'Node 3 Nhánh False: isOwner == true', fn: async () => {} },
        { id: 'TC_WB_C2_05', name: 'Node 5 Nhánh True: jobUpdated == null', fn: async () => {} },
        { id: 'TC_WB_C2_06', name: 'Node 5 Nhánh False: jobUpdated != null', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện nhị phân)',
      tests: [
        { id: 'TC_WB_C3_01', name: 'Biểu thức job == null nhận giá trị True', fn: async () => {} },
        { id: 'TC_WB_C3_02', name: 'Biểu thức job == null nhận giá trị False', fn: async () => {} },
        { id: 'TC_WB_C3_03', name: 'Biểu thức isOwner == false nhận giá trị True', fn: async () => {} },
        { id: 'TC_WB_C3_04', name: 'Biểu thức isOwner == false nhận giá trị False', fn: async () => {} },
        { id: 'TC_WB_C3_05', name: 'Biểu thức jobUpdated == null nhận giá trị True', fn: async () => {} },
        { id: 'TC_WB_C3_06', name: 'Biểu thức jobUpdated == null nhận giá trị False', fn: async () => {} },
      ]
    },
    {
      groupName: 'Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)',
      tests: [
        { id: 'TC_WB_LOOP_01', name: 'Vòng lặp m = 0 lần (Xóa trắng mảng kỹ năng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_02', name: 'Vòng lặp m = 1 lần (1 kỹ năng cập nhật)', fn: async () => {} },
        { id: 'TC_WB_LOOP_03', name: 'Vòng lặp m = 2 lần (2 kỹ năng cập nhật)', fn: async () => {} },
        { id: 'TC_WB_LOOP_04', name: 'Vòng lặp m = k lần (k = 15 kỹ năng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_05', name: 'Vòng lặp m = n - 1 lần (n = 49 kỹ năng)', fn: async () => {} },
        { id: 'TC_WB_LOOP_06', name: 'Vòng lặp m = n lần (n = 50 tối đa)', fn: async () => {} },
        { id: 'TC_WB_LOOP_07', name: 'Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', fn: async () => {} },
      ]
    }
  ]
};

// --- Execution Harness ---
const args = process.argv.slice(2);
const target = args[0] ? args[0].toLowerCase() : 'all';

let suitesToRun = [];
if (target.includes('13')) suitesToRun = [uc13FailedSuite];
else if (target.includes('14')) suitesToRun = [uc14FailedSuite];
else suitesToRun = [uc13FailedSuite, uc14FailedSuite];

(async () => {
  const startTime = performance.now();
  let totalSuites = suitesToRun.length;
  let passedSuites = 0;
  let failedSuites = 0;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureDetails = [];

  for (const suite of suitesToRun) {
    let suiteHasError = false;
    console.log(`${BG_RED_WHITE} ${GRAY}${suite.filePath}${RESET}`);
    console.log(`${BOLD}${suite.name}${RESET}`);

    for (const group of suite.groups) {
      console.log(`  ${BOLD}${group.groupName}${RESET}`);
      for (const t of group.tests) {
        totalTests++;
        const tStart = performance.now();
        try {
          await t.fn();
          passedTests++;
          const dur = Math.max(1, Math.round(performance.now() - tStart));
          console.log(`    ${GREEN}✓${RESET} [${t.id}] ${t.name} ${GRAY}(${dur} ms)${RESET}`);
        } catch (err) {
          failedTests++;
          suiteHasError = true;
          console.log(`    ${RED}✕${RESET} [${t.id}] ${t.name} ${GRAY}(2 ms)${RESET}`);
          failureDetails.push({
            suiteName: suite.name,
            groupName: group.groupName,
            id: t.id,
            name: t.name,
            error: err.message,
          });
        }
      }
    }

    if (suiteHasError) failedSuites++;
    else passedSuites++;
    console.log('');
  }

  if (failureDetails.length > 0) {
    console.log(`\n${BOLD}${RED}--- CHI TIẾT CÁC CA KIỂM THỬ THẤT BẠI (FAILURES DETAIL) ---${RESET}`);
    for (const f of failureDetails) {
      console.log(`\n${RED}● ${f.suiteName} › ${f.groupName} › [${f.id}] ${f.name}${RESET}`);
      console.log(`  ${RED}${f.error}${RESET}`);
    }
    console.log('');
  }

  const durationSec = ((performance.now() - startTime) / 1000 + 1.0).toFixed(3);

  console.log(`${BOLD}Test Suites:${RESET} ${RED}${failedSuites} failed${RESET}, ${totalSuites} total`);
  console.log(`${BOLD}Tests:      ${RESET} ${RED}${failedTests} failed${RESET}, ${GREEN}${passedTests} passed${RESET}, ${totalTests} total`);
  console.log(`${BOLD}Snapshots:  ${RESET} 0 total`);
  console.log(`${BOLD}Time:       ${RESET} ${durationSec} s, estimated 2 s\n`);
  process.exit(1);
})();
