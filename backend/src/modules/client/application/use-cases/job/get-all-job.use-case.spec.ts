/// <reference path="../../../../../types/jest.d.ts" />

import { GetAllJobUseCase } from './get-all-job.use-case';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IJobSummary } from '../../../domain/job/job.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockJobs: IJobSummary[] = [
  {
    id: 'job-001',
    title: 'Frontend Engineer',
    status: false,
    requirements: ['React', 'TypeScript'],
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'job-002',
    title: 'Backend Engineer',
    status: false,
    requirements: ['NodeJS', 'PostgreSQL'],
    createdAt: new Date('2026-01-02'),
  },
];

const makeJobRepo = (overrides = {}): jest.Mocked<IJobReadRepo> =>
  ({
    getAll: jest.fn().mockResolvedValue(mockJobs),
    getById: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  jobRepo?: any;
} = {}) => {
  return new GetAllJobUseCase(
    overrides.jobRepo ?? makeJobRepo(),
  );
};

const validUserId = 'user-001';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetAllJobUseCase', () => {
  describe('Luồng thành công', () => {
    it('trả về danh sách rỗng khi người dùng chưa có công việc nào', async () => {
      const jobRepo = makeJobRepo({ getAll: jest.fn().mockResolvedValue([]) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('user-empty');

      expect(result).toEqual([]);
      expect(jobRepo.getAll).toHaveBeenCalledWith('user-empty');
    });

    it('trả về danh sách công việc của người dùng', async () => {
      const jobRepo = makeJobRepo();
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute(validUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Frontend Engineer');
      expect(result[1]?.title).toBe('Backend Engineer');
      expect(jobRepo.getAll).toHaveBeenCalledWith(validUserId);
    });
  });
});
