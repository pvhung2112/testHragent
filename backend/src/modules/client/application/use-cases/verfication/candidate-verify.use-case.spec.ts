import { VerifyCandidateUseCase } from './candidate-verify.use-case';
import { VerificationEntity } from '../../../domain/verifycation';
import type { IVerificationRepository } from '../../../application/ports/repositories/verification.interface';
import type { IVerifyCandidateInputDTO } from '../../../domain/verifycation';

const makeRepo = (overrides: Partial<IVerificationRepository> = {}): jest.Mocked<IVerificationRepository> =>
  ({
    getByCandidateId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateIsVerify: jest.fn().mockResolvedValue(undefined),
    updateVerificationStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);

const makeVerificationEntity = (candidateId = 'cand-001'): VerificationEntity =>
  VerificationEntity.create({ candidateId, githubStars: 0, topLanguages: [] });

const validInput: IVerifyCandidateInputDTO = {
  name: 'Nguyen Van A',
  email: 'a@test.com',
  githubStars: 10,
  topLanguages: ['TypeScript', 'Python'],
};

describe('VerifyCandidateUseCase', () => {
  describe('Kiểm tra đầu vào', () => {
    it('ném lỗi khi candidateID là chuỗi rỗng', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('', validInput)).rejects.toThrow(
        'candidateID không hợp lệ hoặc bị rỗng.',
      );
    });

    it('ném lỗi khi candidateID chỉ chứa khoảng trắng', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('   ', validInput)).rejects.toThrow(
        'candidateID không hợp lệ hoặc bị rỗng.',
      );
    });

    it('ném lỗi khi dataVerification là null hoặc undefined', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', null as any)).rejects.toThrow(
        'Dữ liệu xác minh không được để trống.',
      );
    });
  });

  describe('Kiểm tra xác minh trùng lặp', () => {
    it('ném lỗi khi ứng viên đã được xác minh trước đó', async () => {
      const existing = makeVerificationEntity('cand-001');
      const repo = makeRepo({ getByCandidateId: jest.fn().mockResolvedValue(existing) });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validInput)).rejects.toThrow(
        'Ứng viên này đã được kiểm chứng trước đó, không thể xác minh lại.',
      );
      expect(repo.getByCandidateId).toHaveBeenCalledWith('cand-001');
    });
  });

  describe('Lỗi lưu dữ liệu', () => {
    it('ném lỗi khi repo.create bị từ chối', async () => {
      const repo = makeRepo({
        create: jest.fn().mockRejectedValue(new Error('DB error')),
        updateIsVerify: jest.fn().mockResolvedValue(undefined),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validInput)).rejects.toThrow(
        'Đã xảy ra lỗi khi lưu thông tin xác minh, vui lòng thử lại.',
      );
    });

    it('ném lỗi khi repo.create trả về null', async () => {
      const repo = makeRepo({
        create: jest.fn().mockResolvedValue(null),
        updateIsVerify: jest.fn().mockResolvedValue(undefined),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validInput)).rejects.toThrow(
        'Kiểm chứng lỗi vui lòng thử lại!',
      );
    });
  });

  describe('Luồng thành công', () => {
    it('trả về IVerificationProps khi xác minh thành công', async () => {
      const entity = makeVerificationEntity('cand-001');
      const repo = makeRepo({
        create: jest.fn().mockResolvedValue(entity),
        updateIsVerify: jest.fn().mockResolvedValue(undefined),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      const result = await useCase.execute('cand-001', validInput);

      expect(result).toBeDefined();
      expect(result.candidateId).toBe('cand-001');
      expect(result.isVerified).toBe(false);
    });

    it('gọi create và updateIsVerify song song', async () => {
      const entity = makeVerificationEntity('cand-001');
      const repo = makeRepo({
        create: jest.fn().mockResolvedValue(entity),
        updateIsVerify: jest.fn().mockResolvedValue(undefined),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await useCase.execute('cand-001', validInput);

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.updateIsVerify).toHaveBeenCalledWith('cand-001', true);
    });

    it('không gọi create khi ứng viên đã được xác minh', async () => {
      const existing = makeVerificationEntity('cand-001');
      const repo = makeRepo({ getByCandidateId: jest.fn().mockResolvedValue(existing) });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validInput)).rejects.toThrow();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });
});
