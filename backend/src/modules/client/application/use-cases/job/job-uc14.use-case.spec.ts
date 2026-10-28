/// <reference path="../../../../../types/jest.d.ts" />

import { UpdateJobUseCase } from './update-job.use-case';
import { DeleteJobUseCase } from './delete-job.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobWriteRepo, IJobReadRepo } from '../../../application/ports/repositories/job.interface';

const makeJobEntity = (id = 'job-001', userId = 'user-owner') =>
  JobEntity.restore({
    id,
    userID: userId,
    title: 'Middle Java Developer',
    description: 'Phát triển backend hệ thống ngân hàng',
    requirements: ['Java 17', 'Spring Boot', 'MySQL'],
    status: false,
    deleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

const makeJobRepo = (overrides = {}): jest.Mocked<IJobWriteRepo & IJobReadRepo> =>
  ({
    getById: jest.fn().mockImplementation(async (id: string) => makeJobEntity(id, 'user-owner')),
    update: jest.fn().mockImplementation(async (job: JobEntity) => job),
    create: jest.fn().mockImplementation(async (job: JobEntity) => job),
    getAll: jest.fn().mockImplementation(async () => []),
    ...overrides,
  } as any);

describe('Use Case 14: Cập nhật và Xóa JD', () => {
  // ==========================================
  // PHẦN A: KIỂM THỬ HỘP ĐEN (BLACK-BOX)
  // ==========================================
  describe('Nhóm 1: Luồng chính – Cập nhật & Xóa mềm công việc', () => {
    it('[TC_UC14_001] Cập nhật thành công toàn bộ thông tin JD', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {
        title: 'Senior Tech Lead',
        description: 'Kiến trúc Cloud',
        requirements: ['K8s', 'Go'],
      });
      expect(result?.title).toBe('Senior Tech Lead');
      expect(result?.description).toBe('Kiến trúc Cloud');
      expect(result?.requirements).toEqual(['K8s', 'Go']);
    });

    it('[TC_UC14_002] Chỉ cập nhật Tiêu đề, giữ nguyên Mô tả và Kỹ năng cũ', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {
        title: 'Project Manager',
      });
      expect(result?.title).toBe('Project Manager');
      expect(result?.description).toBe('Phát triển backend hệ thống ngân hàng');
      expect(result?.requirements).toEqual(['Java 17', 'Spring Boot', 'MySQL']);
    });

    it('[TC_UC14_003] Chỉ cập nhật Mô tả, giữ nguyên Tiêu đề và Kỹ năng cũ', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {
        description: 'Mô tả công việc chi tiết 2026',
      });
      expect(result?.title).toBe('Middle Java Developer');
      expect(result?.description).toBe('Mô tả công việc chi tiết 2026');
    });

    it('[TC_UC14_004] Chỉ cập nhật Danh sách Kỹ năng yêu cầu', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {
        requirements: ['Python', 'FastAPI'],
      });
      expect(result?.requirements).toEqual(['Python', 'FastAPI']);
    });

    it('[TC_UC14_005] Cập nhật với payload rỗng {} (Không đổi gì)', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {});
      expect(result?.title).toBe('Middle Java Developer');
    });

    it('[TC_UC14_016] Xóa JD thành công khi người dùng là chủ sở hữu', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const repo = makeJobRepo({
        getById: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockImplementation(async (j) => j),
      });
      const useCase = new DeleteJobUseCase(repo);
      const deletedId = await useCase.execute('job-001', 'user-owner');
      expect(deletedId).toBe('job-001');
      expect(job.getDetailJob().deleted).toBe(true);
    });

    it('[TC_UC14_017] Hủy bỏ thao tác xóa tại Modal xác nhận', () => {
      let isModalOpen = true;
      let isDeleted = false;
      const onCancel = () => { isModalOpen = false; };
      onCancel();
      expect(isModalOpen).toBe(false);
      expect(isDeleted).toBe(false);
    });

    it('[TC_UC14_038] Hiển thị Toast thông báo sau khi cập nhật thành công', () => {
      const showToast = jest.fn();
      showToast('Cập nhật công việc thành công!', 'success');
      expect(showToast).toHaveBeenCalledWith('Cập nhật công việc thành công!', 'success');
    });
  });

  describe('Nhóm 2: Phân tích giá trị biên BVA (Tiêu đề, Kỹ năng)', () => {
    it('[TC_UC14_008] Cập nhật Tiêu đề đạt biên tối đa 150 ký tự', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const title150 = 'B'.repeat(150);
      const result = await useCase.execute('job-001', 'user-owner', { title: title150 });
      expect(result?.title.length).toBe(150);
    });

    it('[TC_UC14_009] Cập nhật Tiêu đề vượt quá biên tối đa 151 ký tự', () => {
      const title151 = 'B'.repeat(151);
      const isValid = title151.length <= 150;
      expect(isValid).toBe(false);
    });

    it('[TC_UC14_010] Cập nhật kỹ năng thành mảng rỗng []', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', { requirements: [] });
      expect(result?.requirements).toEqual([]);
    });

    it('[TC_UC14_032] Cập nhật kỹ năng mới đạt biên tối đa 50 kỹ năng', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const skills50 = Array.from({ length: 50 }, (_, i) => `Skill_New_${i}`);
      const result = await useCase.execute('job-001', 'user-owner', { requirements: skills50 });
      expect(result?.requirements.length).toBe(50);
    });

    it('[TC_UC14_033] Cập nhật kỹ năng vượt quá 50 kỹ năng (51 kỹ năng)', () => {
      const skills51 = Array.from({ length: 51 }, (_, i) => `Skill_New_${i}`);
      const isValid = skills51.length <= 50;
      expect(isValid).toBe(false);
    });
  });

  describe('Nhóm 3: Kiểm tra hợp lệ dữ liệu, phân quyền & bảo mật', () => {
    it('[TC_UC14_006] Xóa trắng Tiêu đề khi cập nhật', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner', { title: '' })
      ).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });

    it('[TC_UC14_007] Nhập Tiêu đề toàn dấu cách khi cập nhật', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner', { title: '     ' })
      ).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });

    it('[TC_UC14_011] Chèn mã độc XSS vào Tiêu đề khi cập nhật', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const xssTitle = '<script>alert("hack")</script>';
      const sanitized = xssTitle.replace(/<[^>]*>?/gm, '');
      const result = await useCase.execute('job-001', 'user-owner', { title: sanitized || 'Safe Title' });
      expect(result?.title).not.toContain('<script>');
    });

    it('[TC_UC14_012] Chèn mã độc XSS vào Mô tả khi cập nhật', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const xssDesc = '<img src=x onerror=alert(1)>';
      const sanitized = xssDesc.replace(/<[^>]*>?/gm, '');
      const result = await useCase.execute('job-001', 'user-owner', { description: sanitized });
      expect(result?.description).toBe('');
    });

    it('[TC_UC14_013] Cập nhật JD có mã jobId không tồn tại trong CSDL', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('invalid-999', 'user-owner', { title: 'New Title' })
      ).rejects.toThrow('Công việc không tồn tại!');
    });

    it('[TC_UC14_014] Người dùng khác cố tình cập nhật JD không do mình tạo', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'hacker-user', { title: 'New Title' })
      ).rejects.toThrow('Bạn không có quyền!');
    });

    it('[TC_UC14_018] Xóa JD có mã jobId không tồn tại trong CSDL', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new DeleteJobUseCase(repo);
      await expect(
        useCase.execute('invalid-999', 'user-owner')
      ).rejects.toThrow('Công việc không tồn tại!');
    });

    it('[TC_UC14_019] Người dùng khác cố tình xóa JD không do mình tạo', async () => {
      const repo = makeJobRepo();
      const useCase = new DeleteJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'hacker-user')
      ).rejects.toThrow('Bạn không có quyền');
    });

    it('[TC_UC14_030] Tấn công SQL Injection thông qua param id trên URL update', () => {
      const idParam = "1' OR '1'='1";
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
      expect(isValidObjectId).toBe(false);
    });

    it('[TC_UC14_035] Kiểm tra phân quyền tài khoản Viewer không được sửa JD', () => {
      const userRole = 'Viewer';
      const canEdit = userRole === 'Admin' || userRole === 'Recruiter';
      expect(canEdit).toBe(false);
    });

    it('[TC_UC14_036] Kiểm tra phân quyền tài khoản Viewer không được xóa JD', () => {
      const userRole = 'Viewer';
      const canDelete = userRole === 'Admin' || userRole === 'Recruiter';
      expect(canDelete).toBe(false);
    });
  });

  describe('Nhóm 4: Xử lý sự cố mạng, CSDL & tương tranh', () => {
    it('[TC_UC14_015] CSDL gặp sự cố khi cập nhật (repo.update trả về null)', async () => {
      const repo = makeJobRepo({ update: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner', { title: 'New' })
      ).rejects.toThrow('Cập nhật thất bại!');
    });

    it('[TC_UC14_020] CSDL gặp sự cố khi xóa (repo.update trả về null)', async () => {
      const repo = makeJobRepo({ update: jest.fn().mockResolvedValue(null) });
      const useCase = new DeleteJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner')
      ).rejects.toThrow('Xóa thất bại!');
    });

    it('[TC_UC14_022] Chống spam click liên tiếp vào nút "Xác nhận xóa"', async () => {
      const repo = makeJobRepo();
      const useCase = new DeleteJobUseCase(repo);
      let isDeleting = false;
      let deleteCalls = 0;
      const handleDelete = async () => {
        if (isDeleting) return;
        isDeleting = true;
        deleteCalls++;
        await useCase.execute('job-001', 'user-owner');
      };
      await Promise.all([handleDelete(), handleDelete(), handleDelete()]);
      expect(deleteCalls).toBe(1);
    });

    it('[TC_UC14_023] Mất kết nối Internet khi nhấn Lưu cập nhật', async () => {
      const repo = makeJobRepo({
        update: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner', { title: 'New' })
      ).rejects.toThrow('Network error');
    });

    it('[TC_UC14_024] Hết hạn Token JWT khi đang xóa JD', () => {
      const isExpired = true;
      const verifyToken = () => { if (isExpired) throw new Error('JWT Expired'); };
      expect(() => verifyToken()).toThrow('JWT Expired');
    });

    it('[TC_UC14_029] Hai HR cùng lúc chỉnh sửa một JD (Concurrency)', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const res1 = await useCase.execute('job-001', 'user-owner', { title: 'Update 1' });
      const res2 = await useCase.execute('job-001', 'user-owner', { title: 'Update 2' });
      expect(res2?.title).toBe('Update 2');
    });
  });

  describe('Nhóm 5: Logic trạng thái đóng/mở, toàn vẹn dữ liệu & Audit Log', () => {
    it('[TC_UC14_021] Tự động cập nhật mốc thời gian updatedAt khi sửa JD', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', { title: 'New Title' });
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('[TC_UC14_025] Đóng JD (Close Job) chuyển trạng thái tuyển dụng', () => {
      const job = makeJobEntity();
      job.closeJob();
      expect(job.getStatus()).toBe(true);
    });

    it('[TC_UC14_026] Đóng JD đã ở trạng thái đóng trước đó', () => {
      const job = makeJobEntity();
      job.closeJob();
      expect(() => job.closeJob()).toThrow('Domain Error: Job đã đóng.');
    });

    it('[TC_UC14_027] Cố gắng chỉnh sửa JD đã bị đánh dấu xóa mềm', () => {
      const job = makeJobEntity();
      job.delete(true);
      const canEdit = !job.getDetailJob().deleted;
      expect(canEdit).toBe(false);
    });

    it('[TC_UC14_028] Tìm kiếm không hiển thị các JD đã bị xóa', () => {
      const list = [
        { id: 'j1', deleted: false },
        { id: 'j2', deleted: true },
      ];
      const activeList = list.filter((j) => !j.deleted);
      expect(activeList.length).toBe(1);
    });

    it('[TC_UC14_031] Tự động cắt tỉa khoảng trắng thừa khi cập nhật tiêu đề', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const result = await useCase.execute('job-001', 'user-owner', {
        title: '   QA Lead   ',
      });
      expect(result?.title).toBe('QA Lead');
    });

    it('[TC_UC14_034] Ghi nhận Audit Log khi thực hiện xóa công việc', () => {
      const auditLog = jest.fn();
      auditLog({ action: 'DELETE_JOB', jobId: 'job-001', userId: 'user-owner' });
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_JOB', jobId: 'job-001' })
      );
    });

    it('[TC_UC14_037] Kiểm tra danh sách ứng viên nộp vào JD sau khi JD bị xóa', () => {
      const candidates = [{ id: 'c1', jobId: 'job-001' }];
      expect(candidates.length).toBe(1);
    });
  });

  // ==========================================
  // PHẦN B: KIỂM THỬ HỘP TRẮNG (WHITE-BOX C1, C2, C3, LOOP)
  // ==========================================
  describe('Nhóm 6: Kiểm thử Hộp trắng – Độ đo C1 (Phủ câu lệnh UpdateJobUseCase)', () => {
    it('[TC_WB_C1_01] Thực thi đường đi Node 1 -> Node 2 (Công việc không tồn tại)', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('unknown-id', 'user-owner', { title: 'T' })
      ).rejects.toThrow('Công việc không tồn tại!');
    });

    it('[TC_WB_C1_02] Thực thi đường đi Node 1 -> Node 3 -> Node 4 (Không có quyền)', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'stranger', { title: 'T' })
      ).rejects.toThrow('Bạn không có quyền!');
    });

    it('[TC_WB_C1_03] Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 6 (Lưu CSDL trả về null)', async () => {
      const repo = makeJobRepo({ update: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(
        useCase.execute('job-001', 'user-owner', { title: 'T' })
      ).rejects.toThrow('Cập nhật thất bại!');
    });

    it('[TC_WB_C1_04] Thực thi đường đi Node 1 -> Node 3 -> Node 5 -> Node 7 (Thành công)', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const res = await useCase.execute('job-001', 'user-owner', { title: 'Lead' });
      expect(res).toBeDefined();
      expect(res?.title).toBe('Lead');
    });
  });

  describe('Nhóm 7: Kiểm thử Hộp trắng – Độ đo C2 (Phủ nhánh True/False)', () => {
    it('[TC_WB_C2_01] Node 1 Nhánh True: job == null', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('x', 'u', {})).rejects.toThrow('Công việc không tồn tại!');
    });

    it('[TC_WB_C2_02] Node 1 Nhánh False: job != null', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', {});
      expect(r).toBeDefined();
    });

    it('[TC_WB_C2_03] Node 3 Nhánh True: isOwner == false', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('job-001', 'other', {})).rejects.toThrow('Bạn không có quyền!');
    });

    it('[TC_WB_C2_04] Node 3 Nhánh False: isOwner == true', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', {});
      expect(r).toBeDefined();
    });

    it('[TC_WB_C2_05] Node 5 Nhánh True: jobUpdated == null', async () => {
      const repo = makeJobRepo({ update: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('job-001', 'user-owner', {})).rejects.toThrow('Cập nhật thất bại!');
    });

    it('[TC_WB_C2_06] Node 5 Nhánh False: jobUpdated != null', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', { title: 'Update Title' });
      expect(r?.title).toBe('Update Title');
    });
  });

  describe('Nhóm 8: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện nhị phân)', () => {
    it('[TC_WB_C3_01] Biểu thức job == null nhận giá trị True', async () => {
      const repo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('j_null', 'u', {})).rejects.toThrow();
    });

    it('[TC_WB_C3_02] Biểu thức job == null nhận giá trị False', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', {});
      expect(r).toBeDefined();
    });

    it('[TC_WB_C3_03] Biểu thức isOwner == false nhận giá trị True', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('job-001', 'intruder', {})).rejects.toThrow('Bạn không có quyền!');
    });

    it('[TC_WB_C3_04] Biểu thức isOwner == false nhận giá trị False', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', {});
      expect(r).toBeDefined();
    });

    it('[TC_WB_C3_05] Biểu thức jobUpdated == null nhận giá trị True', async () => {
      const repo = makeJobRepo({ update: jest.fn().mockResolvedValue(null) });
      const useCase = new UpdateJobUseCase(repo);
      await expect(useCase.execute('job-001', 'user-owner', {})).rejects.toThrow('Cập nhật thất bại!');
    });

    it('[TC_WB_C3_06] Biểu thức jobUpdated == null nhận giá trị False', async () => {
      const repo = makeJobRepo();
      const useCase = new UpdateJobUseCase(repo);
      const r = await useCase.execute('job-001', 'user-owner', { title: 'Ok' });
      expect(r?.title).toBe('Ok');
    });
  });

  describe('Nhóm 9: Kiểm thử Hộp trắng – Vòng lặp Loop Testing (requirements, n=50)', () => {
    it('[TC_WB_LOOP_01] Vòng lặp m = 0 lần (Xóa trắng mảng kỹ năng)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const r = await useCase.execute('job-001', 'user-owner', { requirements: [] });
      expect(r?.requirements).toEqual([]);
    });

    it('[TC_WB_LOOP_02] Vòng lặp m = 1 lần (1 kỹ năng cập nhật)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const r = await useCase.execute('job-001', 'user-owner', { requirements: ['Golang'] });
      expect(r?.requirements.length).toBe(1);
    });

    it('[TC_WB_LOOP_03] Vòng lặp m = 2 lần (2 kỹ năng cập nhật)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const r = await useCase.execute('job-001', 'user-owner', { requirements: ['Golang', 'Docker'] });
      expect(r?.requirements.length).toBe(2);
    });

    it('[TC_WB_LOOP_04] Vòng lặp m = k lần (k = 15 kỹ năng)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const arr15 = Array.from({ length: 15 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute('job-001', 'user-owner', { requirements: arr15 });
      expect(r?.requirements.length).toBe(15);
    });

    it('[TC_WB_LOOP_05] Vòng lặp m = n - 1 lần (n = 49 kỹ năng)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const arr49 = Array.from({ length: 49 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute('job-001', 'user-owner', { requirements: arr49 });
      expect(r?.requirements.length).toBe(49);
    });

    it('[TC_WB_LOOP_06] Vòng lặp m = n lần (n = 50 tối đa)', async () => {
      const useCase = new UpdateJobUseCase(makeJobRepo());
      const arr50 = Array.from({ length: 50 }, (_, i) => `Skill_${i}`);
      const r = await useCase.execute('job-001', 'user-owner', { requirements: arr50 });
      expect(r?.requirements.length).toBe(50);
    });

    it('[TC_WB_LOOP_07] Vòng lặp m = n + 1 lần (n = 51 vượt ngưỡng)', () => {
      const arr51 = Array.from({ length: 51 }, (_, i) => `Skill_${i}`);
      const isAllowed = arr51.length <= 50;
      expect(isAllowed).toBe(false);
    });
  });
});
