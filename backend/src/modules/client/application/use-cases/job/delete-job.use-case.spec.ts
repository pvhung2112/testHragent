/// <reference path="../../../../../types/jest.d.ts" />

import { DeleteJobUseCase } from './delete-job.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobReadRepo, IJobWriteRepo } from '../../../application/ports/repositories/job.interface';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeJobEntity = (id = 'job-001', userID = 'user-owner') =>
  JobEntity.restore({
    id,
    userID,
    title: 'QA Automation Engineer',
    description: 'Thiết kế kịch bản kiểm thử tự động',
    requirements: ['Playwright', 'Jest', 'TypeScript'],
    status: false,
    deleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

const makeJobRepo = (overrides = {}): jest.Mocked<IJobReadRepo & IJobWriteRepo> =>
  ({
    getById: jest.fn().mockResolvedValue(makeJobEntity()),
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(makeJobEntity()),
    update: jest.fn().mockImplementation(async (job: JobEntity) => job),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  jobRepo?: any;
} = {}) => {
  return new DeleteJobUseCase(
    overrides.jobRepo ?? makeJobRepo(),
  );
};

const validJobId = 'job-001';
const validUserId = 'user-owner';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeleteJobUseCase', () => {
  describe('Kiểm tra điều kiện đầu vào', () => {
    it('ném lỗi khi công việc không tồn tại trong CSDL', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute('job-not-exist', validUserId)).rejects.toThrow(
        'Công việc không tồn tại!'
      );
      expect(jobRepo.getById).toHaveBeenCalledWith('job-not-exist');
    });

    it('ném lỗi khi người dùng không phải là người tạo công việc (không có quyền xóa)', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute('job-001', 'user-intruder')).rejects.toThrow(
        'Bạn không có quyền'
      );
    });
  });

  describe('Lỗi lưu CSDL', () => {
    it('ném lỗi khi repo.update trả về null khi xóa', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({
        getById: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockResolvedValue(null),
      });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute('job-001', 'user-owner')).rejects.toThrow('Xóa thất bại!');
    });
  });

  describe('Luồng thành công', () => {
    it('đánh dấu xóa và trả về ID của công việc khi xóa thành công', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute(validJobId, validUserId);

      expect(result).toBe('job-001');
      expect(jobRepo.getById).toHaveBeenCalledWith('job-001');
      expect(jobRepo.update).toHaveBeenCalledTimes(1);
      expect(job.getDetailJob().deleted).toBe(true);
    });
  });
});
