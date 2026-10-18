import { UploadCVUseCase } from './upload-cv.use-case';
import { CandidateEntity } from '../../../domain/candidate/candidate.entity';
import type { ICandidateWriteRepo, ICandidateReadRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IUploadService } from '../../../application/ports/services/upload.service';
import type { IAIService } from '../../../application/ports/services/ai.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeMuleterFile = (mimetype = 'application/pdf'): Express.Multer.File =>
  ({
    fieldname: 'cv',
    originalname: 'resume.pdf',
    encoding: '7bit',
    mimetype,
    buffer: Buffer.from('fake-pdf-content'),
    size: 1000,
  } as Express.Multer.File);

const makeExtractedData = () => ({
  personal: {
    email: 'nguyenvana@test.com',
    name: 'Nguyen Van A',
    phone: '0123456789',
  },
  skills: ['TypeScript', 'NestJS'],
  experience: [],
  education: [],
});

const makeCandidateEntity = () => {
  const profile = { id: 'cand-001', personal: { email: 'nguyenvana@test.com', name: 'Nguyen Van A' } };
  return {
    getDetailProfile: jest.fn().mockReturnValue(profile),
    update: jest.fn(),
  };
};

const makeJobEntity = () => ({ id: 'job-001', title: 'Backend Developer' });

const makeCandidateRepo = (overrides = {}): jest.Mocked<ICandidateWriteRepo & ICandidateReadRepo> =>
  ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as any);

const makeJobRepo = (overrides = {}): jest.Mocked<IJobReadRepo> =>
  ({
    getById: jest.fn().mockResolvedValue(makeJobEntity()),
    ...overrides,
  } as any);

const makeUploadSvc = (overrides = {}): jest.Mocked<IUploadService> =>
  ({
    uploadCloud: jest.fn().mockResolvedValue(['https://cdn.example.com/resume.pdf']),
    ...overrides,
  } as any);

const makeGeminiSvc = (overrides = {}): jest.Mocked<IAIService> =>
  ({
    extractCV: jest.fn().mockResolvedValue(makeExtractedData()),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  candidateRepo?: any;
  jobRepo?: any;
  uploadSvc?: any;
  geminiSvc?: any;
} = {}) =>
  new UploadCVUseCase(
    overrides.candidateRepo ?? makeCandidateRepo(),
    overrides.jobRepo ?? makeJobRepo(),
    overrides.uploadSvc ?? makeUploadSvc(),
    overrides.geminiSvc ?? makeGeminiSvc(),
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UploadCVUseCase', () => {
  describe('Kiểm tra đầu vào', () => {
    it('ném lỗi khi không có file CV được tải lên', async () => {
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', null as any)).rejects.toThrow('No file uploaded');
    });

    it('ném lỗi khi không tìm thấy công việc', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow('Công việc không đúng');
    });

    it('ném lỗi khi upload trả về mảng rỗng', async () => {
      const uploadSvc = makeUploadSvc({ uploadCloud: jest.fn().mockResolvedValue([]) });
      const useCase = makeUseCase({ uploadSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow('Upload CV thất bại');
    });

    it('ném lỗi khi không thể trích xuất email từ CV', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({ personal: {} }),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'không thể trích xuất được Email từ CV',
      );
    });
  });

  describe('Trích xuất nội dung CV', () => {
    it('gọi geminiSvc.extractCV với file PDF', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({
        create: jest.fn().mockResolvedValue(candidateEntity),
      });
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ candidateRepo, geminiSvc });
      const cvFile = makeMuleterFile('application/pdf');

      await useCase.execute('user-1', 'job-1', cvFile);

      expect(geminiSvc.extractCV).toHaveBeenCalledWith(cvFile.buffer, cvFile.mimetype);
    });

    it('gọi geminiSvc.extractCV với file ảnh', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({
        create: jest.fn().mockResolvedValue(candidateEntity),
      });
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ candidateRepo, geminiSvc });
      const cvFile = makeMuleterFile('image/png');

      await useCase.execute('user-1', 'job-1', cvFile);

      expect(geminiSvc.extractCV).toHaveBeenCalledWith(cvFile.buffer, cvFile.mimetype);
    });

    it('không gọi geminiSvc.extractCV với file text thông thường', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({}),
      });
      const useCase = makeUseCase({ geminiSvc });
      const cvFile = makeMuleterFile('text/plain');

      await expect(useCase.execute('user-1', 'job-1', cvFile)).rejects.toThrow();
      expect(geminiSvc.extractCV).not.toHaveBeenCalled();
    });
  });

  describe('Tạo mới hoặc cập nhật ứng viên', () => {
    it('tạo mới ứng viên khi email chưa tồn tại trong hệ thống', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(candidateEntity),
      });
      const useCase = makeUseCase({ candidateRepo });

      await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(candidateRepo.create).toHaveBeenCalledTimes(1);
      expect(candidateRepo.update).not.toHaveBeenCalled();
    });

    it('cập nhật ứng viên khi email đã tồn tại trong hệ thống', async () => {
      const existingEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({
        findByEmail: jest.fn().mockResolvedValue(existingEntity),
        update: jest.fn().mockResolvedValue(existingEntity),
      });
      const useCase = makeUseCase({ candidateRepo });

      await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(candidateRepo.update).toHaveBeenCalledTimes(1);
      expect(candidateRepo.create).not.toHaveBeenCalled();
    });

    it('ném lỗi khi lưu hồ sơ ứng viên trả về null', async () => {
      const candidateRepo = makeCandidateRepo({
        create: jest.fn().mockResolvedValue(null),
      });
      const useCase = makeUseCase({ candidateRepo });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Lưu hồ sơ ứng viên thất bại!',
      );
    });
  });

  describe('Xử lý ảnh đại diện (avatar)', () => {
    it('tải lên cả CV và avatar khi có file avatar', async () => {
      const uploadSvc = makeUploadSvc({
        uploadCloud: jest.fn().mockResolvedValue([
          'https://cdn.example.com/resume.pdf',
          'https://cdn.example.com/avatar.jpg',
        ]),
      });
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ create: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ uploadSvc, candidateRepo });

      await useCase.execute('user-1', 'job-1', makeMuleterFile(), makeMuleterFile('image/jpeg'));

      expect(uploadSvc.uploadCloud).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object), expect.any(Object)]),
      );
    });

    it('chỉ tải lên CV khi không có file avatar', async () => {
      const uploadSvc = makeUploadSvc();
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ create: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ uploadSvc, candidateRepo });

      await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(uploadSvc.uploadCloud).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
      );
    });
  });

  describe('Luồng thành công', () => {
    it('trả về thông tin profile ứng viên khi thực thi thành công', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ create: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ candidateRepo });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(result).toHaveProperty('candidate');
      expect(candidateEntity.getDetailProfile).toHaveBeenCalled();
    });
  });
});
