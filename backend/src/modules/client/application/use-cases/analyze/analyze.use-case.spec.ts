import { AnalysisUseCase } from './analyze.use-case';
import { AnalysisEntity } from '../../../domain/analysis';
import type { ICandidateReadRepo, ICandidateWriteRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IAnalysisReadRepo, IAnalysisWriteRepo } from '../../../application/ports/repositories/analysis.interface';
import type { IAIService } from '../../../application/ports/services/ai.service';
import { CandidateStatus } from '../../../domain/candidate';
import type { AnalysisInputDto } from '../../dtos/analysis/analysis.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeCandidateEntity = () => ({
  getDetailProfile: jest.fn().mockReturnValue({ id: 'cand-001', name: 'Nguyen Van A' }),
  updateStatus: jest.fn(),
});

const makeJobEntity = () => ({
  getDetailJob: jest.fn().mockReturnValue({ id: 'job-001', title: 'Backend Dev' }),
});

const makeAnalysisEntity = (): AnalysisEntity =>
  AnalysisEntity.create({
    jobID: 'job-001',
    candidateID: 'cand-001',
    summary: 'Good match',
    matchingScore: 85,
    redFlags: [],
    suggestedQuestions: ['Tell me about yourself'],
  });

const makeAIResult = () => ({
  summary: 'Strong candidate',
  matchingScore: 90,
  redFlags: ['No leadership experience'],
  suggestedQuestions: ['Why do you want this job?'],
});

const makeCandidateRepo = (overrides = {}): jest.Mocked<ICandidateReadRepo & ICandidateWriteRepo> =>
  ({
    getById: jest.fn().mockResolvedValue(makeCandidateEntity()),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);

const makeJobRepo = (overrides = {}): jest.Mocked<IJobReadRepo> =>
  ({
    getById: jest.fn().mockResolvedValue(makeJobEntity()),
    ...overrides,
  } as any);

const makeAnalysisRepo = (overrides = {}): jest.Mocked<IAnalysisReadRepo & IAnalysisWriteRepo> =>
  ({
    getAnalysisByCandidateIdAndJobId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeAnalysisEntity()),
    ...overrides,
  } as any);

const makeGeminiService = (overrides = {}): jest.Mocked<IAIService> =>
  ({
    analyzeCandidateWithJob: jest.fn().mockResolvedValue(makeAIResult()),
    ...overrides,
  } as any);

const makeUseCase = (overrides: {
  candidateRepo?: any;
  jobRepo?: any;
  analysisRepo?: any;
  geminiService?: any;
} = {}) => {
  return new AnalysisUseCase(
    overrides.candidateRepo ?? makeCandidateRepo(),
    overrides.jobRepo ?? makeJobRepo(),
    overrides.analysisRepo ?? makeAnalysisRepo(),
    overrides.geminiService ?? makeGeminiService(),
  );
};

const validInput: AnalysisInputDto = { candidateID: 'cand-001', jobID: 'job-001' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnalysisUseCase', () => {
  describe('Kết quả phân tích đã tồn tại (cache)', () => {
    it('trả về kết quả đã lưu mà không gọi AI khi phân tích đã tồn tại', async () => {
      const cached = { id: 'anal-001', summary: 'Cached', matchingScore: 70 };
      const analysisRepo = makeAnalysisRepo({
        getAnalysisByCandidateIdAndJobId: jest.fn().mockResolvedValue(cached),
      });
      const geminiService = makeGeminiService();
      const useCase = makeUseCase({ analysisRepo, geminiService });

      const result = await useCase.execute(validInput);

      expect(result).toEqual(cached);
      expect(geminiService.analyzeCandidateWithJob).not.toHaveBeenCalled();
    });
  });

  describe('Kiểm tra điều kiện đầu vào', () => {
    it('ném lỗi khi không tìm thấy ứng viên', async () => {
      const candidateRepo = makeCandidateRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ candidateRepo });

      await expect(useCase.execute(validInput)).rejects.toThrow('Không tìm thấy thông tin ứng viên.');
    });

    it('ném lỗi khi không tìm thấy công việc', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute(validInput)).rejects.toThrow('Không tìm thấy thông tin công việc (Job).');
    });

    it('ném lỗi khi dịch vụ AI trả về null', async () => {
      const geminiService = makeGeminiService({
        analyzeCandidateWithJob: jest.fn().mockResolvedValue(null),
      });
      const useCase = makeUseCase({ geminiService });

      await expect(useCase.execute(validInput)).rejects.toThrow('Lỗi khi gọi AI phân tích dữ liệu.');
    });

    it('ném lỗi khi lưu kết quả phân tích trả về null', async () => {
      const analysisRepo = makeAnalysisRepo({ create: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ analysisRepo });

      await expect(useCase.execute(validInput)).rejects.toThrow('Lỗi khi lưu kết quả phân tích.');
    });
  });

  describe('Luồng thành công', () => {
    it('trả về kết quả phân tích khi thực thi thành công', async () => {
      const useCase = makeUseCase();
      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
    });

    it('gọi geminiService với profile ứng viên và thông tin công việc', async () => {
      const geminiService = makeGeminiService();
      const useCase = makeUseCase({ geminiService });

      await useCase.execute(validInput);

      expect(geminiService.analyzeCandidateWithJob).toHaveBeenCalledTimes(1);
      expect(geminiService.analyzeCandidateWithJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cand-001' }),
        expect.objectContaining({ id: 'job-001' }),
      );
    });

    it('cập nhật trạng thái ứng viên sang SCREENING sau khi lưu phân tích', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ getById: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ candidateRepo });

      await useCase.execute(validInput);

      expect(candidateEntity.updateStatus).toHaveBeenCalledWith(CandidateStatus.SCREENING);
      expect(candidateRepo.update).toHaveBeenCalledWith(candidateEntity);
    });

    it('không gọi AI khi kết quả phân tích đã tồn tại', async () => {
      const geminiService = makeGeminiService();
      const analysisRepo = makeAnalysisRepo({
        getAnalysisByCandidateIdAndJobId: jest.fn().mockResolvedValue({ id: 'cached' }),
      });
      const useCase = makeUseCase({ analysisRepo, geminiService });

      await useCase.execute(validInput);

      expect(geminiService.analyzeCandidateWithJob).not.toHaveBeenCalled();
    });
  });
});
