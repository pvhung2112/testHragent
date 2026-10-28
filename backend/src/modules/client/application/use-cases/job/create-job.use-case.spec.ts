/// <reference path="../../../../../types/jest.d.ts" />

import { CreateJobUseCase } from './create-job.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobWriteRepo } from '../../../application/ports/repositories/job.interface';
import type { ICreateJobInputDto } from '../../dtos/job/create.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeJobEntity = () =>
  JobEntity.createJob(
    'user-001',
    'Senior Backend Developer',
    'Phát triển hệ thống microservices',
    ['NodeJS', 'TypeScript', 'PostgreSQL'],
  );

const makeJobRepo = (overrides = {}): jest.Mocked<IJobWriteRepo> =>
  ({
    create: jest.fn().mockImplementation(async (job: JobEntity) => job),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  jobRepo?: any;
} = {}) => {
  return new CreateJobUseCase(
    overrides.jobRepo ?? makeJobRepo(),
  );
};

const validInput: ICreateJobInputDto = {
  userID: 'user-001',
  title: 'Senior Backend Developer',
  description: 'Phát triển hệ thống microservices',
  requirements: ['NodeJS', 'TypeScript', 'PostgreSQL'],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateJobUseCase', () => {
  describe('Kiểm tra điều kiện đầu vào', () => {
    it('ném lỗi khi thiếu cả userID và title', async () => {
      const useCase = makeUseCase();
      const input = { userID: '', title: '' } as ICreateJobInputDto;

      await expect(useCase.execute(input)).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('ném lỗi khi thiếu userID', async () => {
      const useCase = makeUseCase();
      const input = { ...validInput, userID: '' };

      await expect(useCase.execute(input)).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('ném lỗi khi thiếu title', async () => {
      const useCase = makeUseCase();
      const input = { ...validInput, title: '' };

      await expect(useCase.execute(input)).rejects.toThrow('UserID và Tiêu đề là bắt buộc!');
    });

    it('ném lỗi khi title chỉ chứa khoảng trắng', async () => {
      const useCase = makeUseCase();
      const input = { ...validInput, title: '   ' };

      await expect(useCase.execute(input)).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });
  });

  describe('Lỗi lưu CSDL', () => {
    it('ném lỗi khi repo.create trả về null', async () => {
      const jobRepo = makeJobRepo({ create: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute(validInput)).rejects.toThrow('Tạo mới không thành công!');
    });
  });

  describe('Luồng thành công', () => {
    it('tạo mới công việc thành công với đầy đủ thông tin', async () => {
      const jobRepo = makeJobRepo();
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result?.title).toBe(validInput.title);
      expect(result?.userID).toBe(validInput.userID);
      expect(result?.description).toBe(validInput.description);
      expect(result?.requirements).toEqual(validInput.requirements);
      expect(result?.status).toBe(false);
      expect(jobRepo.create).toHaveBeenCalledTimes(1);
    });

    it('tạo mới công việc thành công khi không truyền description và requirements', async () => {
      const jobRepo = makeJobRepo();
      const useCase = makeUseCase({ jobRepo });
      const inputWithDefaults: ICreateJobInputDto = {
        userID: 'user-001',
        title: 'Frontend Developer',
      };

      const result = await useCase.execute(inputWithDefaults);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Frontend Developer');
      expect(result?.description).toBe('');
      expect(result?.requirements).toEqual([]);
      expect(jobRepo.create).toHaveBeenCalledTimes(1);
    });

    it('tạo công việc với mảng requirements rỗng', async () => {
      const useCase = makeUseCase();
      const input = { ...validInput, requirements: [] };

      const result = await useCase.execute(input);

      expect(result?.requirements).toEqual([]);
    });

    it('tạo công việc với nhiều yêu cầu kỹ năng', async () => {
      const useCase = makeUseCase();
      const skills = ['React', 'TypeScript', 'TailwindCSS', 'Jest', 'Git'];
      const input = { ...validInput, requirements: skills };

      const result = await useCase.execute(input);

      expect(result?.requirements).toEqual(skills);
    });
  });
});
