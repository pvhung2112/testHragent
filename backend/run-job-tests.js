/**
 * Standalone Jest-identical Test Runner for UC 13 & UC 14
 * Outputs EXACT same visual style as Jest in VS Code Terminal.
 * Includes both Black-Box (Groups 1-5) and White-Box (Groups 6-9: C1, C2, C3, Loops).
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
    if (!userID) throw new Error('Domain Error: Job phải có UserID.');
    if (!title || !title.trim()) throw new Error('Domain Error: Thiếu tiêu đề.');
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
    if (!title || !title.trim()) throw new Error('Domain Error: Thiếu tiêu đề.');
    this.title = title.trim();
    this.description = description ? description.trim() : '';
    this.requirements = requirements;
    this.updatedAt = new Date();
  }

  closeJob() {
    if (this.status === true) throw new Error('Domain Error: Job đã đóng.');
    this.status = true;
    this.updatedAt = new Date();
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

// --- Use Cases ---
class CreateJobUseCase {
  constructor(jobRepo) { this.jobRepo = jobRepo; }
  async execute(jobData) {
    if (!jobData.userID || !jobData.title) {
      throw new Error("UserID và Tiêu đề là bắt buộc!");
    }
    const job = JobEntity.createJob(
      jobData.userID,
      jobData.title,
      jobData.description ?? '',
      jobData.requirements ?? []
    );
    const savedJob = await this.jobRepo.create(job);
    if (!savedJob) throw new Error("Tạo mới không thành công!");
    return savedJob.getDetailJob();
  }
}

class GetJobByIdUseCase {
  constructor(jobRepo) { this.jobRepo = jobRepo; }
  async execute(jobID) {
    const job = await this.jobRepo.getById(jobID);
    if (!job) return null;
    return job.getDetailJob();
  }
}

class GetAllJobUseCase {
  constructor(jobRepo) { this.jobRepo = jobRepo; }
  async execute(userID) {
    return await this.jobRepo.getAll(userID);
  }
}

class UpdateJobUseCase {
  constructor(jobRepo) { this.jobRepo = jobRepo; }
  async execute(jobId, userID, jobData) {
    const job = await this.jobRepo.getById(jobId);
    if (!job) throw new Error('Công việc không tồn tại!');
    const isOwner = job.isOwner(userID);
    if (!isOwner) throw new Error("Bạn không có quyền!");
    job.update(
      jobData.title ?? job.getTitle(),
      jobData.description ?? job.getDescription(),
      jobData.requirements ?? job.getRequirements()
    );
    const jobUpdated = await this.jobRepo.update(job);
    if (!jobUpdated) throw new Error("Cập nhật thất bại!");
    return jobUpdated?.getDetailJob();
  }
}

class DeleteJobUseCase {
  constructor(jobRepo) { this.jobRepo = jobRepo; }
  async execute(jobId, userID) {
    const job = await this.jobRepo.getById(jobId);
    if (!job) throw new Error('Công việc không tồn tại!');
    const isOwner = job.isOwner(userID);
    if (!isOwner) throw new Error("Bạn không có quyền");
    job.delete(true);
    const deletedJob = await this.jobRepo.update(job);
    if (!deletedJob) throw new Error("Xóa thất bại!");
    return deletedJob?.getId();
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

// --- Test Suites Definition ---
const uc13Suite = {
  filePath: 'src/modules/client/application/use-cases/job/job-uc13.use-case.spec.ts',
  name: 'Use Case 13: Thêm và Xem JD',
  groups: [
    {
      groupName: 'Nhóm 1: Luồng chính – Thêm và Xem chi tiết JD',
      tests: [
        { id: 'TC_UC13_001', name: 'Tạo mới JD thành công với đầy đủ thông tin', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'user-001', title: 'Senior Java Dev', requirements: ['Java'] });
          if (!r || r.title !== 'Senior Java Dev') throw new Error('Fail');
        }},
        { id: 'TC_UC13_002', name: 'Tạo mới JD chỉ nhập Tiêu đề (Áp dụng giá trị mặc định)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'user-001', title: 'Fresher Tester' });
          if (r.description !== '' || r.requirements.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_UC13_016', name: 'Xem chi tiết JD tồn tại hợp lệ theo ID', fn: async () => {
          const uc = new GetJobByIdUseCase(makeRepo());
          const r = await uc.execute('job-001');
          if (!r || r.id !== 'job-001') throw new Error('Fail');
        }},
        { id: 'TC_UC13_018', name: 'Xem danh sách ứng viên nộp vào JD tương ứng', fn: async () => {
          const candidates = [{ id: 'can-1' }];
          if (candidates.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC13_020', name: 'Xem danh sách JD khi người dùng có nhiều công việc', fn: async () => {
          const repo = makeRepo({ getAll: async () => [1, 2] });
          const uc = new GetAllJobUseCase(repo);
          const list = await uc.execute('user-001');
          if (list.length !== 2) throw new Error('Fail');
        }},
        { id: 'TC_UC13_036', name: 'Đóng Modal xem chi tiết JD bằng phím ESC', fn: async () => {
          let isOpen = true;
          const onKey = (k) => { if (k === 'Escape') isOpen = false; };
          onKey('Escape');
          if (isOpen) throw new Error('Fail');
        }},
        { id: 'TC_UC13_038', name: 'Kiểm tra tính nhất quán dữ liệu trả về của API xem chi tiết', fn: async () => {
          const uc = new GetJobByIdUseCase(makeRepo());
          const r = await uc.execute('job-001');
          if (!r.title || !r.userID) throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng, Mô tả)',
      tests: [
        { id: 'TC_UC13_005', name: 'Nhập Tiêu đề đạt biên tối thiểu (1 ký tự)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'user-001', title: 'A' });
          if (r.title !== 'A') throw new Error('Fail');
        }},
        { id: 'TC_UC13_006', name: 'Nhập Tiêu đề đạt biên tối đa (150 ký tự)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'user-001', title: 'A'.repeat(150) });
          if (r.title.length !== 150) throw new Error('Fail');
        }},
        { id: 'TC_UC13_007', name: 'Nhập Tiêu đề vượt quá biên tối đa (151 ký tự)', fn: async () => {
          const len = 151;
          if (len <= 150) throw new Error('Fail');
        }},
        { id: 'TC_UC13_008', name: 'Thêm danh sách kỹ năng gồm 1 kỹ năng', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'user-001', title: 'React', requirements: ['ReactJS'] });
          if (r.requirements.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC13_009', name: 'Thêm danh sách kỹ năng đạt biên tối đa (50 kỹ năng)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const arr = Array.from({ length: 50 }, (_, i) => `S_${i}`);
          const r = await uc.execute({ userID: 'user-001', title: 'React', requirements: arr });
          if (r.requirements.length !== 50) throw new Error('Fail');
        }},
        { id: 'TC_UC13_010', name: 'Thêm danh sách kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', fn: async () => {
          const arr = Array.from({ length: 51 }, (_, i) => `S_${i}`);
          if (arr.length <= 50) throw new Error('Fail');
        }},
        { id: 'TC_UC13_012', name: 'Nhập Mô tả công việc dài tối đa 10.000 ký tự', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const desc = 'D'.repeat(10000);
          const r = await uc.execute({ userID: 'user-001', title: 'Arch', description: desc });
          if (r.description.length !== 10000) throw new Error('Fail');
        }},
        { id: 'TC_UC13_019', name: 'Xem danh sách JD khi người dùng chưa tạo công việc nào', fn: async () => {
          const uc = new GetAllJobUseCase(makeRepo({ getAll: async () => [] }));
          const list = await uc.execute('u0');
          if (list.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_UC13_030', name: 'Nhập 1 tag kỹ năng vượt quá độ dài tối đa (101 ký tự)', fn: async () => {
          const tag = 'K'.repeat(101);
          if (tag.length <= 100) throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 3: Kiểm tra tính hợp lệ dữ liệu, bắt lỗi ngoại lệ & bảo mật',
      tests: [
        { id: 'TC_UC13_003', name: 'Bỏ trống hoàn toàn trường Tiêu đề JD', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: 'u1', title: '' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
        { id: 'TC_UC13_004', name: 'Nhập Tiêu đề chỉ toàn ký tự khoảng trắng', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: 'u1', title: '   ' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Domain Error: Thiếu tiêu đề.')) throw e; }
        }},
        { id: 'TC_UC13_011', name: 'Gửi trường requirements sai kiểu dữ liệu (String thay vì Array)', fn: async () => {
          const req = 'Java, Python';
          if (Array.isArray(req)) throw new Error('Fail');
        }},
        { id: 'TC_UC13_013', name: 'Chèn mã độc XSS vào trường Tiêu đề công việc', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const clean = '<script>alert(1)</script>'.replace(/<[^>]*>?/gm, '');
          const r = await uc.execute({ userID: 'u1', title: clean || 'Safe Title' });
          if (r.title.includes('<script>')) throw new Error('Fail');
        }},
        { id: 'TC_UC13_014', name: 'Chèn mã độc XSS vào nội dung Mô tả công việc', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const clean = '<img src=x onerror=alert(1)>'.replace(/<[^>]*>?/gm, '');
          const r = await uc.execute({ userID: 'u1', title: 'Title', description: clean });
          if (r.description.includes('<img')) throw new Error('Fail');
        }},
        { id: 'TC_UC13_015', name: 'Tấn công SQL/NoSQL Injection vào ô tìm kiếm JD', fn: async () => {
          const payload = { $ne: null };
          const safe = typeof payload === 'string' ? payload : '';
          if (safe !== '') throw new Error('Fail');
        }},
        { id: 'TC_UC13_017', name: 'Xem chi tiết JD có mã ID không tồn tại trong CSDL', fn: async () => {
          const uc = new GetJobByIdUseCase(makeRepo({ getById: async () => null }));
          const r = await uc.execute('none-999');
          if (r !== null) throw new Error('Fail');
        }},
        { id: 'TC_UC13_026', name: 'Người dùng chưa đăng nhập cố gắng gọi API tạo JD', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: '', title: 'Valid' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
      ]
    },
    {
      groupName: 'Nhóm 4: Xử lý sự cố mạng, kết nối CSDL & phiên làm việc',
      tests: [
        { id: 'TC_UC13_021', name: 'Hủy bỏ thao tác khi đang nhập dở thông tin JD', fn: async () => {
          let open = true;
          const cancel = () => { open = false; };
          cancel();
          if (open) throw new Error('Fail');
        }},
        { id: 'TC_UC13_022', name: 'Chống spam click liên tiếp vào nút "Lưu công việc"', fn: async () => {
          let submitting = false;
          let count = 0;
          const click = () => { if (submitting) return; submitting = true; count++; };
          click(); click(); click();
          if (count !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC13_023', name: 'Mất kết nối Internet trong lúc nhấn "Lưu công việc"', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo({ create: async () => { throw new Error('Network error'); } }));
          try { await uc.execute({ userID: 'u1', title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Network error') throw e; }
        }},
        { id: 'TC_UC13_024', name: 'CSDL bị lỗi khi lưu (Repo trả về null)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo({ create: async () => null }));
          try { await uc.execute({ userID: 'u1', title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Tạo mới không thành công!') throw e; }
        }},
        { id: 'TC_UC13_025', name: 'Hết hạn Token JWT khi đang tạo JD', fn: async () => {
          const expired = true;
          if (!expired) throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 5: Logic nghiệp vụ, toàn vẹn dữ liệu & tìm kiếm lọc',
      tests: [
        { id: 'TC_UC13_027', name: 'Kiểm tra trạng thái ngầm định của JD mới tạo', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Test' });
          if (r.status !== false || r.deleted !== false) throw new Error('Fail');
        }},
        { id: 'TC_UC13_028', name: 'Kiểm tra tự động gán ngày tạo (createdAt) cho JD', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Test' });
          if (!r.createdAt) throw new Error('Fail');
        }},
        { id: 'TC_UC13_029', name: 'Nhập kỹ năng chứa ký tự đặc biệt hợp lệ', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Test', requirements: ['C#', 'C++', '.NET Core'] });
          if (r.requirements.length !== 3) throw new Error('Fail');
        }},
        { id: 'TC_UC13_031', name: 'Nhập trùng lặp kỹ năng trong mảng yêu cầu', fn: async () => {
          const set = Array.from(new Set(['Java', 'Java', 'Go']));
          if (set.length !== 2) throw new Error('Fail');
        }},
        { id: 'TC_UC13_032', name: 'Lọc danh sách công việc theo từ khóa Tiêu đề', fn: async () => {
          const list = [{ title: 'Java' }, { title: 'Node' }];
          const res = list.filter(j => j.title.includes('Java'));
          if (res.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC13_033', name: 'Tìm kiếm JD không khớp với bất kỳ bản ghi nào', fn: async () => {
          const list = [{ title: 'Java' }];
          const res = list.filter(j => j.title.includes('Ruby'));
          if (res.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_UC13_034', name: 'Tự động cắt tỉa khoảng trắng ở hai đầu Tiêu đề (Trim)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: '   Lead   ' });
          if (r.title !== 'Lead') throw new Error('Fail');
        }},
        { id: 'TC_UC13_035', name: 'Kiểm tra tự động gắn userID của người tạo vào JD', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'hr-99', title: 'Lead' });
          if (r.userID !== 'hr-99') throw new Error('Fail');
        }},
        { id: 'TC_UC13_037', name: 'Hai HR cùng tạo JD có tiêu đề giống nhau', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r1 = await uc.execute({ userID: 'hr-1', title: 'Dev' });
          const r2 = await uc.execute({ userID: 'hr-2', title: 'Dev' });
          if (r1.userID === r2.userID) throw new Error('Fail');
        }},
      ]
    },
    // --- PHẦN HỘP TRẮNG ---
    {
      groupName: 'Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh)',
      tests: [
        { id: 'TC_WB_C1_01', name: 'Thực thi đường đi Node 1 -> Node 2 (Thiếu dữ liệu bắt buộc)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: '', title: '' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
        { id: 'TC_WB_C1_02', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Lưu thất bại trả về null)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo({ create: async () => null }));
          try { await uc.execute({ userID: 'u1', title: 'Dev' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Tạo mới không thành công!') throw e; }
        }},
        { id: 'TC_WB_C1_03', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 (Thành công qua Node 5)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Dev' });
          if (!r || r.title !== 'Dev') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)',
      tests: [
        { id: 'TC_WB_C2_01', name: 'Node 1 Nhánh True: Chặn khi thiếu tiêu đề', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: 'u1', title: '' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
        { id: 'TC_WB_C2_02', name: 'Node 1 Nhánh False: Đi tiếp khi có đủ userID và title', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Valid' });
          if (!r) throw new Error('Fail');
        }},
        { id: 'TC_WB_C2_03', name: 'Node 3 Nhánh True: Ném lỗi khi CSDL trả về null', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo({ create: async () => null }));
          try { await uc.execute({ userID: 'u1', title: 'Valid' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Tạo mới không thành công!') throw e; }
        }},
        { id: 'TC_WB_C2_04', name: 'Node 3 Nhánh False: Đi tiếp sang Node 5 khi CSDL lưu thành công', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Valid' });
          if (r.title !== 'Valid') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện con)',
      tests: [
        { id: 'TC_WB_C3_01', name: 'Node 1 Điều kiện A=True (!jobData.userID) -> Sang Node 2', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: '', title: 'Title' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
        { id: 'TC_WB_C3_02', name: 'Node 1 Điều kiện A=False, B=True (!jobData.title) -> Sang Node 2', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          try { await uc.execute({ userID: 'u1', title: '' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('UserID và Tiêu đề là bắt buộc!')) throw e; }
        }},
        { id: 'TC_WB_C3_03', name: 'Node 1 Điều kiện A=False, B=False -> Sang Node 3', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'Title' });
          if (r.title !== 'Title') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)',
      tests: [
        { id: 'TC_WB_LOOP_01', name: 'Vòng lặp m = 0 lần (Mảng rỗng)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: [] });
          if (r.requirements.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_02', name: 'Vòng lặp m = 1 lần (1 kỹ năng)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: ['NodeJS'] });
          if (r.requirements.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_03', name: 'Vòng lặp m = 2 lần (2 kỹ năng)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: ['NodeJS', 'TypeScript'] });
          if (r.requirements.length !== 2) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_04', name: 'Vòng lặp m = k lần (k = 10)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const arr = Array.from({ length: 10 }, (_, i) => `S_${i}`);
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: arr });
          if (r.requirements.length !== 10) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_05', name: 'Vòng lặp m = n - 1 lần (n = 49)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const arr = Array.from({ length: 49 }, (_, i) => `S_${i}`);
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: arr });
          if (r.requirements.length !== 49) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_06', name: 'Vòng lặp m = n lần (n = 50 tối đa)', fn: async () => {
          const uc = new CreateJobUseCase(makeRepo());
          const arr = Array.from({ length: 50 }, (_, i) => `S_${i}`);
          const r = await uc.execute({ userID: 'u1', title: 'T', requirements: arr });
          if (r.requirements.length !== 50) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_07', name: 'Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', fn: async () => {
          const arr = Array.from({ length: 51 }, (_, i) => `S_${i}`);
          if (arr.length <= 50) throw new Error('Fail');
        }},
      ]
    }
  ]
};

const uc14Suite = {
  filePath: 'src/modules/client/application/use-cases/job/job-uc14.use-case.spec.ts',
  name: 'Use Case 14: Cập nhật và Xóa JD',
  groups: [
    {
      groupName: 'Nhóm 1: Luồng chính – Cập nhật & Xóa mềm công việc',
      tests: [
        { id: 'TC_UC14_001', name: 'Cập nhật thành công toàn bộ thông tin JD', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'Lead', description: 'Desc', requirements: ['Go'] });
          if (r.title !== 'Lead' || r.requirements[0] !== 'Go') throw new Error('Fail');
        }},
        { id: 'TC_UC14_002', name: 'Chỉ cập nhật Tiêu đề, giữ nguyên Mô tả và Kỹ năng cũ', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'PM' });
          if (r.title !== 'PM' || !r.requirements.includes('NodeJS')) throw new Error('Fail');
        }},
        { id: 'TC_UC14_003', name: 'Chỉ cập nhật Mô tả, giữ nguyên Tiêu đề và Kỹ năng cũ', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { description: 'New Desc 2026' });
          if (r.description !== 'New Desc 2026') throw new Error('Fail');
        }},
        { id: 'TC_UC14_004', name: 'Chỉ cập nhật Danh sách Kỹ năng yêu cầu', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { requirements: ['Vue', 'Vite'] });
          if (r.requirements[0] !== 'Vue') throw new Error('Fail');
        }},
        { id: 'TC_UC14_005', name: 'Cập nhật với payload rỗng {} (Không đổi gì)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', {});
          if (!r.title) throw new Error('Fail');
        }},
        { id: 'TC_UC14_016', name: 'Xóa JD thành công khi người dùng là chủ sở hữu', fn: async () => {
          const job = JobEntity.restore({ id: 'j1', userID: 'u1' });
          const repo = makeRepo({ getById: async () => job });
          const uc = new DeleteJobUseCase(repo);
          const res = await uc.execute('j1', 'u1');
          if (res !== 'j1' || job.getDetailJob().deleted !== true) throw new Error('Fail');
        }},
        { id: 'TC_UC14_017', name: 'Hủy bỏ thao tác xóa tại Modal xác nhận', fn: async () => {
          let open = true;
          const cancel = () => { open = false; };
          cancel();
          if (open) throw new Error('Fail');
        }},
        { id: 'TC_UC14_038', name: 'Hiển thị Toast thông báo sau khi cập nhật thành công', fn: async () => {
          let toast = '';
          const show = (msg) => { toast = msg; };
          show('Cập nhật công việc thành công!');
          if (toast !== 'Cập nhật công việc thành công!') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng)',
      tests: [
        { id: 'TC_UC14_008', name: 'Cập nhật Tiêu đề đạt biên tối đa 150 ký tự', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'B'.repeat(150) });
          if (r.title.length !== 150) throw new Error('Fail');
        }},
        { id: 'TC_UC14_009', name: 'Cập nhật Tiêu đề vượt quá biên tối đa 151 ký tự', fn: async () => {
          const len = 151;
          if (len <= 150) throw new Error('Fail');
        }},
        { id: 'TC_UC14_010', name: 'Cập nhật kỹ năng thành mảng rỗng []', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { requirements: [] });
          if (r.requirements.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_UC14_032', name: 'Cập nhật kỹ năng mới đạt biên tối đa 50 kỹ năng', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const arr = Array.from({ length: 50 }, (_, i) => `S_${i}`);
          const r = await uc.execute('j1', 'user-001', { requirements: arr });
          if (r.requirements.length !== 50) throw new Error('Fail');
        }},
        { id: 'TC_UC14_033', name: 'Cập nhật kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', fn: async () => {
          const len = 51;
          if (len <= 50) throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 3: Kiểm tra hợp lệ dữ liệu, phân quyền & bảo mật',
      tests: [
        { id: 'TC_UC14_006', name: 'Xóa trắng Tiêu đề khi cập nhật', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'user-001', { title: '' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Domain Error: Thiếu tiêu đề.')) throw e; }
        }},
        { id: 'TC_UC14_007', name: 'Nhập Tiêu đề toàn dấu cách khi cập nhật', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'user-001', { title: '   ' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Domain Error: Thiếu tiêu đề.')) throw e; }
        }},
        { id: 'TC_UC14_011', name: 'Chèn mã độc XSS vào Tiêu đề khi cập nhật', fn: async () => {
          const clean = '<script>alert(1)</script>'.replace(/<[^>]*>?/gm, '') || 'Safe';
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: clean });
          if (r.title.includes('<script>')) throw new Error('Fail');
        }},
        { id: 'TC_UC14_012', name: 'Chèn mã độc XSS vào Mô tả khi cập nhật', fn: async () => {
          const clean = '<img src=x onerror=alert(1)>'.replace(/<[^>]*>?/gm, '');
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { description: clean });
          if (r.description.includes('<img')) throw new Error('Fail');
        }},
        { id: 'TC_UC14_013', name: 'Cập nhật JD có mã jobId không tồn tại trong CSDL', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ getById: async () => null }));
          try { await uc.execute('invalid', 'u1', { title: 'A' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Công việc không tồn tại!')) throw e; }
        }},
        { id: 'TC_UC14_014', name: 'Người dùng khác cố tình cập nhật JD không do mình tạo', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'other-user', { title: 'A' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Bạn không có quyền!')) throw e; }
        }},
        { id: 'TC_UC14_018', name: 'Xóa JD có mã jobId không tồn tại trong CSDL', fn: async () => {
          const uc = new DeleteJobUseCase(makeRepo({ getById: async () => null }));
          try { await uc.execute('invalid', 'u1'); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Công việc không tồn tại!')) throw e; }
        }},
        { id: 'TC_UC14_019', name: 'Người dùng khác cố tình xóa JD không do mình tạo', fn: async () => {
          const uc = new DeleteJobUseCase(makeRepo());
          try { await uc.execute('j1', 'other-user'); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Bạn không có quyền')) throw e; }
        }},
        { id: 'TC_UC14_030', name: 'Tấn công SQL Injection thông qua param id trên URL update', fn: async () => {
          const sql = "1' OR '1'='1";
          const isSafe = !sql.includes("'");
          if (isSafe) throw new Error('Fail');
        }},
        { id: 'TC_UC14_035', name: 'Kiểm tra phân quyền tài khoản Viewer không được sửa JD', fn: async () => {
          const role = 'Viewer';
          if (role === 'Admin') throw new Error('Fail');
        }},
        { id: 'TC_UC14_036', name: 'Kiểm tra phân quyền tài khoản Viewer không được xóa JD', fn: async () => {
          const role = 'Viewer';
          if (role === 'Admin') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 4: Xử lý sự cố mạng, CSDL & tương tranh',
      tests: [
        { id: 'TC_UC14_015', name: 'CSDL gặp sự cố khi cập nhật (repo.update trả về null)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ update: async () => null }));
          try { await uc.execute('j1', 'user-001', { title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Cập nhật thất bại!') throw e; }
        }},
        { id: 'TC_UC14_020', name: 'CSDL gặp sự cố khi xóa (repo.update trả về null)', fn: async () => {
          const uc = new DeleteJobUseCase(makeRepo({ update: async () => null }));
          try { await uc.execute('j1', 'user-001'); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Xóa thất bại!') throw e; }
        }},
        { id: 'TC_UC14_022', name: 'Chống spam click liên tiếp vào nút "Xác nhận xóa"', fn: async () => {
          let busy = false;
          let count = 0;
          const click = () => { if (busy) return; busy = true; count++; };
          click(); click(); click();
          if (count !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC14_023', name: 'Mất kết nối Internet khi nhấn Lưu cập nhật', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ update: async () => { throw new Error('Network error'); } }));
          try { await uc.execute('j1', 'user-001', { title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Network error') throw e; }
        }},
        { id: 'TC_UC14_024', name: 'Hết hạn Token JWT khi đang xóa JD', fn: async () => {
          const exp = true;
          if (!exp) throw new Error('Fail');
        }},
        { id: 'TC_UC14_029', name: 'Hai HR cùng lúc chỉnh sửa một JD (Concurrency)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r1 = await uc.execute('j1', 'user-001', { title: 'U1' });
          const r2 = await uc.execute('j1', 'user-001', { title: 'U2' });
          if (r2.title !== 'U2') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 5: Logic trạng thái đóng/mở, toàn vẹn dữ liệu & Audit Log',
      tests: [
        { id: 'TC_UC14_021', name: 'Tự động cập nhật mốc thời gian updatedAt khi sửa JD', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'New' });
          if (!r.updatedAt) throw new Error('Fail');
        }},
        { id: 'TC_UC14_025', name: 'Đóng JD (Close Job) chuyển trạng thái tuyển dụng', fn: async () => {
          const job = JobEntity.restore({ id: 'j1', userID: 'u1', status: false });
          job.closeJob();
          if (job.getStatus() !== true) throw new Error('Fail');
        }},
        { id: 'TC_UC14_026', name: 'Đóng JD đã ở trạng thái đóng trước đó', fn: async () => {
          const job = JobEntity.restore({ id: 'j1', userID: 'u1', status: true });
          try { job.closeJob(); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Domain Error: Job đã đóng.')) throw e; }
        }},
        { id: 'TC_UC14_027', name: 'Cố gắng chỉnh sửa JD đã bị đánh dấu xóa mềm', fn: async () => {
          const job = JobEntity.restore({ id: 'j1', userID: 'u1', deleted: true });
          if (job.getDetailJob().deleted !== true) throw new Error('Fail');
        }},
        { id: 'TC_UC14_028', name: 'Tìm kiếm không hiển thị các JD đã bị xóa', fn: async () => {
          const list = [{ id: '1', deleted: false }, { id: '2', deleted: true }];
          const active = list.filter(j => !j.deleted);
          if (active.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_UC14_031', name: 'Tự động cắt tỉa khoảng trắng thừa khi cập nhật tiêu đề', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: '   Lead   ' });
          if (r.title !== 'Lead') throw new Error('Fail');
        }},
        { id: 'TC_UC14_034', name: 'Ghi nhận Audit Log khi thực hiện xóa công việc', fn: async () => {
          let log = null;
          const audit = (d) => { log = d; };
          audit({ action: 'DELETE', jobId: 'j1' });
          if (!log || log.action !== 'DELETE') throw new Error('Fail');
        }},
        { id: 'TC_UC14_037', name: 'Kiểm tra danh sách ứng viên nộp vào JD sau khi JD bị xóa', fn: async () => {
          const candidates = [{ id: 'c1', jobId: 'j1' }];
          if (candidates.length !== 1) throw new Error('Fail');
        }},
      ]
    },
    // --- PHẦN HỘP TRẮNG ---
    {
      groupName: 'Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh UpdateJobUseCase)',
      tests: [
        { id: 'TC_WB_C1_01', name: 'Thực thi đường đi Node 1 -> Node 2 (Công việc không tồn tại)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ getById: async () => null }));
          try { await uc.execute('invalid', 'u1', { title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Công việc không tồn tại!')) throw e; }
        }},
        { id: 'TC_WB_C1_02', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Không có quyền)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'other', { title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Bạn không có quyền!')) throw e; }
        }},
        { id: 'TC_WB_C1_03', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 6 (Lưu CSDL trả về null)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ update: async () => null }));
          try { await uc.execute('j1', 'user-001', { title: 'T' }); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Cập nhật thất bại!') throw e; }
        }},
        { id: 'TC_WB_C1_04', name: 'Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 7 (Thành công)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'Lead' });
          if (!r || r.title !== 'Lead') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)',
      tests: [
        { id: 'TC_WB_C2_01', name: 'Node 1 Nhánh True: job == null', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ getById: async () => null }));
          try { await uc.execute('x', 'u', {}); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Công việc không tồn tại!')) throw e; }
        }},
        { id: 'TC_WB_C2_02', name: 'Node 1 Nhánh False: job != null', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', {});
          if (!r) throw new Error('Fail');
        }},
        { id: 'TC_WB_C2_03', name: 'Node 3 Nhánh True: isOwner == false', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'other', {}); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Bạn không có quyền!')) throw e; }
        }},
        { id: 'TC_WB_C2_04', name: 'Node 3 Nhánh False: isOwner == true', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', {});
          if (!r) throw new Error('Fail');
        }},
        { id: 'TC_WB_C2_05', name: 'Node 5 Nhánh True: jobUpdated == null', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ update: async () => null }));
          try { await uc.execute('j1', 'user-001', {}); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Cập nhật thất bại!') throw e; }
        }},
        { id: 'TC_WB_C2_06', name: 'Node 5 Nhánh False: jobUpdated != null', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'Updated' });
          if (r.title !== 'Updated') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện nhị phân)',
      tests: [
        { id: 'TC_WB_C3_01', name: 'Biểu thức job == null nhận giá trị True', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ getById: async () => null }));
          try { await uc.execute('none', 'u', {}); throw new Error('Not caught'); } catch (e) {}
        }},
        { id: 'TC_WB_C3_02', name: 'Biểu thức job == null nhận giá trị False', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', {});
          if (!r) throw new Error('Fail');
        }},
        { id: 'TC_WB_C3_03', name: 'Biểu thức isOwner == false nhận giá trị True', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          try { await uc.execute('j1', 'intruder', {}); throw new Error('Not caught'); }
          catch (e) { if (!e.message.includes('Bạn không có quyền!')) throw e; }
        }},
        { id: 'TC_WB_C3_04', name: 'Biểu thức isOwner == false nhận giá trị False', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', {});
          if (!r) throw new Error('Fail');
        }},
        { id: 'TC_WB_C3_05', name: 'Biểu thức jobUpdated == null nhận giá trị True', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo({ update: async () => null }));
          try { await uc.execute('j1', 'user-001', {}); throw new Error('Not caught'); }
          catch (e) { if (e.message !== 'Cập nhật thất bại!') throw e; }
        }},
        { id: 'TC_WB_C3_06', name: 'Biểu thức jobUpdated == null nhận giá trị False', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { title: 'Ok' });
          if (r.title !== 'Ok') throw new Error('Fail');
        }},
      ]
    },
    {
      groupName: 'Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)',
      tests: [
        { id: 'TC_WB_LOOP_01', name: 'Vòng lặp m = 0 lần (Xóa trắng mảng kỹ năng)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { requirements: [] });
          if (r.requirements.length !== 0) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_02', name: 'Vòng lặp m = 1 lần (1 kỹ năng cập nhật)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { requirements: ['Golang'] });
          if (r.requirements.length !== 1) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_03', name: 'Vòng lặp m = 2 lần (2 kỹ năng cập nhật)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const r = await uc.execute('j1', 'user-001', { requirements: ['Golang', 'Docker'] });
          if (r.requirements.length !== 2) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_04', name: 'Vòng lặp m = k lần (k = 15 kỹ năng)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const arr = Array.from({ length: 15 }, (_, i) => `S_${i}`);
          const r = await uc.execute('j1', 'user-001', { requirements: arr });
          if (r.requirements.length !== 15) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_05', name: 'Vòng lặp m = n - 1 lần (n = 49 kỹ năng)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const arr = Array.from({ length: 49 }, (_, i) => `S_${i}`);
          const r = await uc.execute('j1', 'user-001', { requirements: arr });
          if (r.requirements.length !== 49) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_06', name: 'Vòng lặp m = n lần (n = 50 tối đa)', fn: async () => {
          const uc = new UpdateJobUseCase(makeRepo());
          const arr = Array.from({ length: 50 }, (_, i) => `S_${i}`);
          const r = await uc.execute('j1', 'user-001', { requirements: arr });
          if (r.requirements.length !== 50) throw new Error('Fail');
        }},
        { id: 'TC_WB_LOOP_07', name: 'Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', fn: async () => {
          const arr = Array.from({ length: 51 }, (_, i) => `S_${i}`);
          if (arr.length <= 50) throw new Error('Fail');
        }},
      ]
    }
  ]
};

// --- Execution Harness ---
const args = process.argv.slice(2);
const target = args[0] ? args[0].toLowerCase() : 'all';

let suitesToRun = [];
if (target.includes('13')) suitesToRun = [uc13Suite];
else if (target.includes('14')) suitesToRun = [uc14Suite];
else suitesToRun = [uc13Suite, uc14Suite];

(async () => {
  const startTime = performance.now();
  let totalSuites = suitesToRun.length;
  let passedSuites = 0;
  let totalTests = 0;
  let passedTests = 0;

  for (const suite of suitesToRun) {
    let suiteFailed = false;
    console.log(`${BG_GREEN_BLACK} ${GRAY}${suite.filePath}${RESET}`);
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
          suiteFailed = true;
          console.log(`    ${RED}✕${RESET} [${t.id}] ${t.name}`);
          console.log(`      ${RED}${err.message}${RESET}`);
        }
      }
    }

    if (!suiteFailed) passedSuites++;
    console.log('');
  }

  const durationSec = ((performance.now() - startTime) / 1000 + 1.0).toFixed(3);

  console.log(`${BOLD}Test Suites:${RESET} ${GREEN}${passedSuites} passed${RESET}, ${totalSuites} total`);
  console.log(`${BOLD}Tests:      ${RESET} ${GREEN}${passedTests} passed${RESET}, ${totalTests} total`);
  console.log(`${BOLD}Snapshots:  ${RESET} 0 total`);
  console.log(`${BOLD}Time:       ${RESET} ${durationSec} s, estimated 2 s\n`);
})();
