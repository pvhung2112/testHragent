/// <reference path="../../../../../types/jest.d.ts" />

import { UpdateJobUseCase } from './update-job.use-case';
import { JobEntity } from '../../../domain/job';
import type { IJobReadRepo, IJobWriteRepo } from '../../../application/ports/repositories/job.interface';
import type { IUpdateJobInputDto } from '../../dtos/job/create.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeJobEntity = (id = 'job-001', userID = 'user-owner') =>
  JobEntity.restore({
    id,
    userID,
    title: 'Middle Java Developer',
    description: 'Phát triển backend hệ thống ngân hàng',
    requirements: ['Java 17', 'Spring Boot', 'MySQL'],
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
  return new UpdateJobUseCase(
    overrides.jobRepo ?? makeJobRepo(),
  );
};

const validJobId = 'job-001';
const validUserId = 'user-owner';
const validUpdateInput: IUpdateJobInputDto = {
  title: 'Senior Java Developer',
  description: 'Kiến trúc hệ thống tài chính phân tán',
  requirements: ['Java 21', 'Spring Boot 3', 'Kafka', 'Docker'],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateJobUseCase', () => {
  describe('Kiểm tra điều kiện đầu vào', () => {
    it('ném lỗi khi công việc không tồn tại trong CSDL', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      await expect(
        useCase.execute('job-nonexistent', validUserId, { title: 'New Title' })
      ).rejects.toThrow('Công việc không tồn tại!');

      expect(jobRepo.getById).toHaveBeenCalledWith('job-nonexistent');
    });

    it('ném lỗi khi người dùng không phải là người tạo công việc (không có quyền)', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      await expect(
        useCase.execute('job-001', 'user-other', { title: 'Hacked Title' })
      ).rejects.toThrow('Bạn không có quyền!');
    });

    it('ném lỗi khi cập nhật tiêu đề thành chuỗi rỗng', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      await expect(
        useCase.execute('job-001', 'user-owner', { title: '' })
      ).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });

    it('ném lỗi khi tiêu đề mới chỉ chứa toàn khoảng trắng', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      await expect(
        useCase.execute('job-001', 'user-owner', { title: '     ' })
      ).rejects.toThrow('Domain Error: Thiếu tiêu đề.');
    });
  });

  describe('Lỗi lưu CSDL', () => {
    it('ném lỗi khi repo.update trả về null', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({
        getById: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockResolvedValue(null),
      });
      const useCase = makeUseCase({ jobRepo });

      await expect(
        useCase.execute('job-001', 'user-owner', { title: 'Updated Title' })
      ).rejects.toThrow('Cập nhật thất bại!');
    });
  });

  describe('Luồng thành công', () => {
    it('cập nhật thành công toàn bộ thông tin (title, description, requirements)', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute(validJobId, validUserId, validUpdateInput);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Senior Java Developer');
      expect(result?.description).toBe('Kiến trúc hệ thống tài chính phân tán');
      expect(result?.requirements).toEqual(['Java 21', 'Spring Boot 3', 'Kafka', 'Docker']);
      expect(jobRepo.update).toHaveBeenCalledTimes(1);
    });

    it('chỉ cập nhật title, giữ nguyên description và requirements cũ', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('job-001', 'user-owner', {
        title: 'Lead Architect',
      });

      expect(result?.title).toBe('Lead Architect');
      expect(result?.description).toBe('Phát triển backend hệ thống ngân hàng');
      expect(result?.requirements).toEqual(['Java 17', 'Spring Boot', 'MySQL']);
    });

    it('chỉ cập nhật description, giữ nguyên title và requirements cũ', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('job-001', 'user-owner', {
        description: 'Mô tả công việc mới đã cập nhật',
      });

      expect(result?.title).toBe('Middle Java Developer');
      expect(result?.description).toBe('Mô tả công việc mới đã cập nhật');
    });

    it('chỉ cập nhật requirements, giữ nguyên title và description cũ', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('job-001', 'user-owner', {
        requirements: ['Golang', 'Kubernetes'],
      });

      expect(result?.requirements).toEqual(['Golang', 'Kubernetes']);
    });

    it('cập nhật với đối tượng rỗng giữ nguyên toàn bộ dữ liệu ban đầu', async () => {
      const job = makeJobEntity('job-001', 'user-owner');
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(job) });
      const useCase = makeUseCase({ jobRepo });

      const result = await useCase.execute('job-001', 'user-owner', {});

      expect(result?.title).toBe('Middle Java Developer');
      expect(result?.description).toBe('Phát triển backend hệ thống ngân hàng');
      expect(result?.requirements).toEqual(['Java 17', 'Spring Boot', 'MySQL']);
    });
  });
});
