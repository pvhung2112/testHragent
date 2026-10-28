/// <reference path="../../../../../types/jest.d.ts" />

import { GetJobByIdUseCase } from './get-job-by-id.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeJobEntity = (id = 'job-101', title = 'DevOps Engineer') =>
  JobEntity.restore({
    id,
    userID: 'user-001',
    title,
    description: 'Quản lý CI/CD và Kubernetes',
    requirements: ['Docker', 'K8s', 'AWS'],
    status: false,
    deleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  });

const makeJobRepo = (overrides = {}): jest.Mocked<IJobReadRepo> =>
  ({
    getById: jest.fn().mockImplementation(async (id: string) => makeJobEntity(id)),
    getAll: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  jobRepo?: any;
} = {}) => {
  return new GetJobByIdUseCase(
    overrides.jobRepo ?? makeJobRepo(),
  );
};

const validJobId = 'job-101';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetJobByIdUseCase', () => {
  describe('Không tìm thấy công việc', () => {
    it('trả về null khi job không tồn tại trong CSDL', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('job-nonexistent');

      expect(result).toBeNull();
      expect(jobRepo.getById).toHaveBeenCalledWith('job-nonexistent');
    });
  });

  describe('Luồng thành công', () => {
    it('trả về thông tin chi tiết JD khi jobID tồn tại', async () => {
      const mockJob = makeJobEntity('job-101', 'DevOps Engineer');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(mockJob) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute(validJobId);

      expect(result).toBeDefined();
      expect(result?.id).toBe('job-101');
      expect(result?.title).toBe('DevOps Engineer');
      expect(result?.description).toBe('Quản lý CI/CD và Kubernetes');
      expect(result?.requirements).toEqual(['Docker', 'K8s', 'AWS']);
      expect(result?.status).toBe(false);
      expect(jobRepo.getById).toHaveBeenCalledWith('job-101');
      expect(jobRepo.getById).toHaveBeenCalledTimes(1);
    });
  });
});
