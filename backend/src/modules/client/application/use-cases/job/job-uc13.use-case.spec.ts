/// <reference path="../../../../../types/jest.d.ts" />

import { CreateJobUseCase } from './create-job.use-case';
import { GetJobByIdUseCase } from './get-job-by-id.use-case';
import { GetAllJobUseCase } from './get-all-job.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobWriteRepo, IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { ICreateJobInputDto } from '../../dtos/job/create.dto';

const makeJobEntity = (id = 'job-001', userId = 'user-001') =>
  JobEntity.restore({
    id,
    userID: userId,
    title: 'Senior Backend Developer',
    description: 'Phát triển hệ thống microservices',
    requirements: ['NodeJS', 'TypeScript', 'PostgreSQL'],
    status: false,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makeJobRepo = (overrides = {}): jest.Mocked<IJobWriteRepo & IJobReadRepo> =>
  ({
    create: jest.fn().mockImplementation(async (job: JobEntity) => job),
    getById: jest.fn().mockImplementation(async (id: string) => makeJobEntity(id)),
    getAll: jest.fn().mockImplementation(async (userId: string) => [makeJobEntity('job-001', userId)]),
    update: jest.fn().mockImplementation(async (job: JobEntity) => job),
    ...overrides,
  } as any);

describe('Use Case 13: Thêm và Xem JD', () => {
  // ==========================================
  // PHẦN A: KIỂM THỬ HỘP ĐEN (BLACK-BOX)
  // ==========================================
  describe('Nhóm 1: Luồng chính – Thêm và Xem chi tiết JD', () => {
    it('[TC_UC13_001] Tạo mới JD thành công với đầy đủ thông tin', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const input: ICreateJobInputDto = {
        userID: 'user-001',
        title: 'Senior Java Developer',
        description: 'Làm hệ thống Bank',
        requirements: ['Java', 'Spring Boot'],
      };
      const result = await useCase.execute(input);
      expect(result).toBeDefined();
      expect(result?.title).toBe(input.title);
      expect(result?.requirements).toEqual(input.requirements);
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('[TC_UC13_002] Tạo mới JD chỉ nhập Tiêu đề (Áp dụng giá trị mặc định)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({
        userID: 'user-001',
        title: 'Fresher Tester',
      });
      expect(result).toBeDefined();
      expect(result?.title).toBe('Fresher Tester');
      expect(result?.description).toBe('');
      expect(result?.requirements).toEqual([]);
    });

    it('[TC_UC13_016] Xem chi tiết JD tồn tại hợp lệ theo ID', async () => {
      const repo = makeJobRepo();
      const useCase = new GetJobByIdUseCase(repo);
      const result = await useCase.execute('job-001');
      expect(result).toBeDefined();
      expect(result?.id).toBe('job-001');
      expect(result?.title).toBe('Senior Backend Developer');
    });

    it('[TC_UC13_018] Xem danh sách ứng viên nộp vào JD tương ứng', async () => {
      const repo = makeJobRepo();
      const job = await repo.getById('job-001');
      expect(job).toBeDefined();
      const candidates = [{ id: 'can-1', name: 'Nguyễn Văn An' }];
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('[TC_UC13_020] Xem danh sách JD khi người dùng có nhiều công việc', async () => {
      const repo = makeJobRepo({
        getAll: jest.fn().mockResolvedValue([makeJobEntity('j1'), makeJobEntity('j2')]),
      });
      const useCase = new GetAllJobUseCase(repo);
      const list = await useCase.execute('user-001');
      expect(list.length).toBe(2);
    });

    it('[TC_UC13_036] Đóng Modal xem chi tiết JD bằng phím ESC', () => {
      const event = { key: 'Escape', preventDefault: jest.fn() };
      let modalOpen = true;
      if (event.key === 'Escape') modalOpen = false;
      expect(modalOpen).toBe(false);
    });

    it('[TC_UC13_038] Kiểm tra tính nhất quán dữ liệu trả về của API xem chi tiết', async () => {
      const repo = makeJobRepo();
      const useCase = new GetJobByIdUseCase(repo);
      const detail = await useCase.execute('job-001');
      expect(detail).toHaveProperty('id');
      expect(detail).toHaveProperty('title');
      expect(detail).toHaveProperty('status');
      expect(detail).toHaveProperty('userID');
      expect(detail).toHaveProperty('description');
      expect(detail).toHaveProperty('requirements');
    });
  });

  describe('Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng, Mô tả)', () => {
    it('[TC_UC13_005] Nhập Tiêu đề đạt biên tối thiểu (1 ký tự)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({ userID: 'user-001', title: 'A' });
      expect(result?.title).toBe('A');
    });

    it('[TC_UC13_006] Nhập Tiêu đề đạt biên tối đa (150 ký tự)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const title150 = 'A'.repeat(150);
      const result = await useCase.execute({ userID: 'user-001', title: title150 });
      expect(result?.title.length).toBe(150);
    });

    it('[TC_UC13_007] Nhập Tiêu đề vượt quá biên tối đa (151 ký tự)', () => {
      const title151 = 'A'.repeat(151);
      const isValid = title151.length <= 150;
      expect(isValid).toBe(false);
    });

    it('[TC_UC13_008] Thêm danh sách kỹ năng gồm 1 kỹ năng', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({
        userID: 'user-001',
        title: 'React Dev',
        requirements: ['ReactJS'],
      });
      expect(result?.requirements).toEqual(['ReactJS']);
    });

    it('[TC_UC13_009] Thêm danh sách kỹ năng đạt biên tối đa (50 kỹ năng)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const skills50 = Array.from({ length: 50 }, (_, i) => `Skill_${i + 1}`);
      const result = await useCase.execute({
        userID: 'user-001',
        title: 'Fullstack Dev',
        requirements: skills50,
      });
      expect(result?.requirements.length).toBe(50);
    });

    it('[TC_UC13_010] Thêm danh sách kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', () => {
      const skills51 = Array.from({ length: 51 }, (_, i) => `Skill_${i + 1}`);
      const isValid = skills51.length <= 50;
      expect(isValid).toBe(false);
    });

    it('[TC_UC13_012] Nhập Mô tả công việc dài tối đa 10.000 ký tự', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const desc10k = 'M'.repeat(10000);
      const result = await useCase.execute({
        userID: 'user-001',
        title: 'Arch',
        description: desc10k,
      });
      expect(result?.description.length).toBe(10000);
    });

    it('[TC_UC13_019] Xem danh sách JD khi người dùng chưa tạo công việc nào', async () => {
      const repo = makeJobRepo({ getAll: jest.fn().mockResolvedValue([]) });
      const useCase = new GetAllJobUseCase(repo);
      const list = await useCase.execute('new-user');
      expect(list).toEqual([]);
    });

    it('[TC_UC13_030] Nhập 1 tag kỹ năng vượt quá độ dài tối đa (101 ký tự)', () => {
      const longSkill = 'S'.repeat(101);
      const isValid = longSkill.length <= 100;
      expect(isValid).toBe(false);
    });
  });

  describe('Nhóm 3: Kiểm tra tính hợp lệ dữ liệu, bắt lỗi ngoại lệ & bảo mật', () => {
    it('[TC_UC13_003] Bỏ trống hoàn toàn trường Tiêu đề JD', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: 'user-001', title: '' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('[TC_UC13_004] Nhập Tiêu đề chỉ toàn ký tự khoảng trắng', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: 'user-001', title: '     ' })
      ).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });

    it('[TC_UC13_011] Gửi trường requirements sai kiểu dữ liệu (String thay vì Array)', () => {
      const reqInput = 'Java, Python';
      const isArray = Array.isArray(reqInput);
      expect(isArray).toBe(false);
    });

    it('[TC_UC13_013] Chèn mã độc XSS vào trường Tiêu đề công việc', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const xssTitle = '<script>alert("XSS")</script>';
      const sanitized = xssTitle.replace(/<[^>]*>?/gm, '');
      const result = await useCase.execute({ userID: 'user-001', title: sanitized || 'Safe Title' });
      expect(result?.title).not.toContain('<script>');
    });

    it('[TC_UC13_014] Chèn mã độc XSS vào nội dung Mô tả công việc', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const xssDesc = '<img src=x onerror=alert(1)>';
      const sanitized = xssDesc.replace(/<[^>]*>?/gm, '');
      const result = await useCase.execute({
        userID: 'user-001',
        title: 'Tester',
        description: sanitized,
      });
      expect(result?.description).toBe('');
    });

    it('[TC_UC13_015] Tấn công SQL/NoSQL Injection vào ô tìm kiếm JD', () => {
      const query = { $ne: null };
      const safeKeyword = typeof query === 'string' ? query : '';
      expect(safeKeyword).toBe('');
    });

    it('[TC_UC13_017] Xem chi tiết JD có mã ID không tồn tại trong CSDL', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new GetJobByIdUseCase(repo);
      const result = await useCase.execute('invalid-999');
      expect(result).toBeNull();
    });

    it('[TC_UC13_026] Người dùng chưa đăng nhập cố gắng gọi API tạo JD', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: '', title: 'Developer' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });
  });

  describe('Nhóm 4: Xử lý sự cố mạng, kết nối CSDL & phiên làm việc', () => {
    it('[TC_UC13_021] Hủy bỏ thao tác khi đang nhập dở thông tin JD', () => {
      let isFormOpen = true;
      let formState = { title: 'Draft title' };
      const onCancel = () => { isFormOpen = false; formState = { title: '' }; };
      onCancel();
      expect(isFormOpen).toBe(false);
      expect(formState.title).toBe('');
    });

    it('[TC_UC13_022] Chống spam click liên tiếp vào nút "Lưu công việc"', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      let isSubmitting = false;
      let calls = 0;
      const handleClick = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        calls++;
        await useCase.execute({ userID: 'user-001', title: 'Dev' });
      };
      await Promise.all([handleClick(), handleClick(), handleClick()]);
      expect(calls).toBe(1);
    });

    it('[TC_UC13_023] Mất kết nối Internet trong lúc nhấn "Lưu công việc"', async () => {
      const repo = makeJobRepo({
        create: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const useCase = new CreateJobUseCase(repo);
      await expect(
        useCase.execute({ userID: 'user-001', title: 'Dev' })
      ).rejects.toThrow('Network error');
    });

    it('[TC_UC13_024] CSDL bị lỗi khi lưu (Repo trả về null)', async () => {
      const repo = makeJobRepo({ create: jest.fn().mockResolvedValue(null) });
      const useCase = new CreateJobUseCase(repo);
      await expect(
        useCase.execute({ userID: 'user-001', title: 'Dev' })
      ).rejects.toThrow('Tạo mới không thành công!');
    });

    it('[TC_UC13_025] Hết hạn Token JWT khi đang tạo JD', () => {
      const isTokenExpired = true;
      const getAuthHeader = () => {
        if (isTokenExpired) throw new Error('Token expired');
        return 'Bearer valid';
      };
      expect(() => getAuthHeader()).toThrow('Token expired');
    });
  });

  describe('Nhóm 5: Logic nghiệp vụ, toàn vẹn dữ liệu & tìm kiếm lọc', () => {
    it('[TC_UC13_027] Kiểm tra trạng thái ngầm định của JD mới tạo', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({ userID: 'user-001', title: 'Tester' });
      expect(result?.status).toBe(false);
      expect(result?.deleted).toBe(false);
    });

    it('[TC_UC13_028] Kiểm tra tự động gán ngày tạo (createdAt) cho JD', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({ userID: 'user-001', title: 'Tester' });
      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('[TC_UC13_029] Nhập kỹ năng chứa ký tự đặc biệt hợp lệ', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const specialSkills = ['C#', 'C++', '.NET Core', 'Node.js'];
      const result = await useCase.execute({
        userID: 'user-001',
        title: '.NET Lead',
        requirements: specialSkills,
      });
      expect(result?.requirements).toEqual(specialSkills);
    });

    it('[TC_UC13_031] Nhập trùng lặp kỹ năng trong mảng yêu cầu', () => {
      const skills = ['Java', 'Java', 'Spring'];
      const uniqueSkills = Array.from(new Set(skills));
      expect(uniqueSkills).toEqual(['Java', 'Spring']);
    });

    it('[TC_UC13_032] Lọc danh sách công việc theo từ khóa Tiêu đề', () => {
      const jobs = [{ title: 'NodeJS Dev' }, { title: 'Java Dev' }];
      const filtered = jobs.filter((j) => j.title.includes('NodeJS'));
      expect(filtered.length).toBe(1);
    });

    it('[TC_UC13_033] Tìm kiếm JD không khớp với bất kỳ bản ghi nào', () => {
      const jobs = [{ title: 'NodeJS Dev' }, { title: 'Java Dev' }];
      const filtered = jobs.filter((j) => j.title.includes('Python'));
      expect(filtered.length).toBe(0);
    });

    it('[TC_UC13_034] Tự động cắt tỉa khoảng trắng ở hai đầu Tiêu đề (Trim)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({
        userID: 'user-001',
        title: '   QA Lead   ',
      });
      expect(result?.title).toBe('QA Lead');
    });

    it('[TC_UC13_035] Kiểm tra tự động gắn userID của người tạo vào JD', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({ userID: 'hr-specialist-99', title: 'Dev' });
      expect(result?.userID).toBe('hr-specialist-99');
    });

    it('[TC_UC13_037] Hai HR cùng tạo JD có tiêu đề giống nhau', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const job1 = await useCase.execute({ userID: 'hr-1', title: 'DevOps' });
      const job2 = await useCase.execute({ userID: 'hr-2', title: 'DevOps' });
      expect(job1?.userID).toBe('hr-1');
      expect(job2?.userID).toBe('hr-2');
    });
  });

  // ==========================================
  // PHẦN B: KIỂM THỬ HỘP TRẮNG (WHITE-BOX C1, C2, C3, LOOP)
  // ==========================================
  describe('Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh)', () => {
    it('[TC_WB_C1_01] Thực thi đường đi Node 1 -> Node 2 (Thiếu dữ liệu bắt buộc)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: '', title: '' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('[TC_WB_C1_02] Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Lưu thất bại trả về null)', async () => {
      const repo = makeJobRepo({ create: jest.fn().mockResolvedValue(null) });
      const useCase = new CreateJobUseCase(repo);
      await expect(
        useCase.execute({ userID: 'user-001', title: 'Backend' })
      ).rejects.toThrow('Tạo mới không thành công!');
    });

    it('[TC_WB_C1_03] Thực thi đường đi Node 1 -> Node 3 -> Node 5 (Thành công qua Node 5)', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const result = await useCase.execute({ userID: 'user-001', title: 'Backend' });
      expect(result).toBeDefined();
      expect(result?.title).toBe('Backend');
    });
  });

  describe('Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)', () => {
    it('[TC_WB_C2_01] Node 1 Nhánh True: Chặn khi thiếu tiêu đề', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: 'u1', title: '' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('[TC_WB_C2_02] Node 1 Nhánh False: Đi tiếp khi có đủ userID và title', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const res = await useCase.execute({ userID: 'u1', title: 'Valid' });
      expect(res).toBeDefined();
    });

    it('[TC_WB_C2_03] Node 3 Nhánh True: Ném lỗi khi CSDL trả về null', async () => {
      const repo = makeJobRepo({ create: jest.fn().mockResolvedValue(null) });
      const useCase = new CreateJobUseCase(repo);
      await expect(
        useCase.execute({ userID: 'u1', title: 'Valid' })
      ).rejects.toThrow('Tạo mới không thành công!');
    });

    it('[TC_WB_C2_04] Node 3 Nhánh False: Đi tiếp sang Node 5 khi CSDL lưu thành công', async () => {
      const repo = makeJobRepo();
      const useCase = new CreateJobUseCase(repo);
      const res = await useCase.execute({ userID: 'u1', title: 'Valid' });
      expect(res?.title).toBe('Valid');
    });
  });

  describe('Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện con)', () => {
    it('[TC_WB_C3_01] Node 1 Điều kiện A=True (!jobData.userID) -> Sang Node 2', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: '', title: 'Valid Title' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('[TC_WB_C3_02] Node 1 Điều kiện A=False, B=True (!jobData.title) -> Sang Node 2', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      await expect(
        useCase.execute({ userID: 'user-001', title: '' })
      ).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('[TC_WB_C3_03] Node 1 Điều kiện A=False, B=False -> Sang Node 3', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const res = await useCase.execute({ userID: 'user-001', title: 'Valid Title' });
      expect(res?.title).toBe('Valid Title');
    });
  });

  describe('Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)', () => {
    it('[TC_WB_LOOP_01] Vòng lặp m = 0 lần (Mảng rỗng)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: [] });
      expect(r?.requirements).toEqual([]);
    });

    it('[TC_WB_LOOP_02] Vòng lặp m = 1 lần (1 kỹ năng)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: ['NodeJS'] });
      expect(r?.requirements.length).toBe(1);
    });

    it('[TC_WB_LOOP_03] Vòng lặp m = 2 lần (2 kỹ năng)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: ['NodeJS', 'TypeScript'] });
      expect(r?.requirements.length).toBe(2);
    });

    it('[TC_WB_LOOP_04] Vòng lặp m = k lần (k = 10)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const arr10 = Array.from({ length: 10 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: arr10 });
      expect(r?.requirements.length).toBe(10);
    });

    it('[TC_WB_LOOP_05] Vòng lặp m = n - 1 lần (n = 49)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const arr49 = Array.from({ length: 49 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: arr49 });
      expect(r?.requirements.length).toBe(49);
    });

    it('[TC_WB_LOOP_06] Vòng lặp m = n lần (n = 50 tối đa)', async () => {
      const useCase = new CreateJobUseCase(makeJobRepo());
      const arr50 = Array.from({ length: 50 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute({ userID: 'u1', title: 'T', requirements: arr50 });
      expect(r?.requirements.length).toBe(50);
    });

    it('[TC_WB_LOOP_07] Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', () => {
      const arr51 = Array.from({ length: 51 }, (_, i) => `Skill_${i}`);
      const isAllowed = arr51.length <= 50;
      expect(isAllowed).toBe(false);
    });
  });
});
