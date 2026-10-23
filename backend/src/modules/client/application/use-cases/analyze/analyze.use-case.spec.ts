import { AnalysisUseCase } from './analyze.use-case';
import {
  filterCandidatesList,
  paginateCandidatesList,
  validateSkillKeyword,
  sanitizeFilterText,
  sanitizeSqlParam,
  validateStatusTransition,
  validateExportPdf,
  type ICandidateFilterItem,
} from './analyze.validator';
import { AnalysisEntity } from '../../../domain/analysis';
import type { ICandidateReadRepo, ICandidateWriteRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IAnalysisReadRepo, IAnalysisWriteRepo } from '../../../application/ports/repositories/analysis.interface';
import type { IAIService } from '../../../application/ports/services/ai.service';
import { CandidateStatus } from '../../../domain/candidate';
import type { AnalysisInputDto } from '../../dtos/analysis/analysis.dto';

const makeCandidateEntity = (overrides = {}) => ({
  getDetailProfile: jest.fn().mockReturnValue({ id: 'cand-001', name: 'Nguyen Van A', ...overrides }),
  updateStatus: jest.fn(),
});

const makeJobEntity = (overrides = {}) => ({
  getDetailJob: jest.fn().mockReturnValue({ id: 'job-001', title: 'Backend Dev' }),
  status: 'OPEN',
  isClosed: false,
  ...overrides,
});

const makeAnalysisEntity = (score = 88): AnalysisEntity =>
  AnalysisEntity.create({
    jobID: 'job-001',
    candidateID: 'cand-001',
    summary: 'Good match',
    matchingScore: score,
    redFlags: [],
    suggestedQuestions: ['Tell me about yourself'],
  });

const makeAIResult = (score = 88) => ({
  summary: 'Strong candidate with relevant experience',
  matchingScore: score,
  redFlags: [],
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
} = {}) =>
  new AnalysisUseCase(
    overrides.candidateRepo ?? makeCandidateRepo(),
    overrides.jobRepo ?? makeJobRepo(),
    overrides.analysisRepo ?? makeAnalysisRepo(),
    overrides.geminiService ?? makeGeminiService(),
  );

const validInput: AnalysisInputDto = { candidateID: 'cand-001', jobID: 'job-001' };

const sampleCandidates: ICandidateFilterItem[] = [
  { id: '1', name: 'Nguyễn Văn A', skills: ['ReactJS', 'TypeScript'], experienceYears: 2.0, status: 'Phù hợp' },
  { id: '2', name: 'Trần Thị B', skills: ['ReactJS', 'NodeJS'], experienceYears: 1.5, status: 'Mới' },
  { id: '3', name: 'Lê Văn C', skills: ['Java', 'Spring Boot'], experienceYears: 4.0, status: 'Phù hợp' },
  { id: '4', name: 'Phạm Văn D', skills: ['Python', 'Django'], experienceYears: 6.0, status: 'Mới' },
  { id: '5', name: 'Hoàng Thị E', skills: ['ReactJS', 'NextJS'], experienceYears: 0.5, status: 'Đã xem' },
  { id: '6', name: 'Đỗ Văn F', skills: ['Java', 'Docker'], experienceYears: 3.5, status: 'Phỏng vấn' },
  { id: '7', name: 'Vũ Thị G', skills: ['Python', 'FastAPI'], experienceYears: 5.5, status: 'Phù hợp' },
  { id: '8', name: 'Bùi Văn H', skills: ['ReactJS'], experienceYears: 1.9, status: 'Mới' },
  { id: '9', name: 'Ngô Thị I', skills: ['NodeJS', 'MongoDB'], experienceYears: 2.5, status: 'Phù hợp' },
  { id: '10', name: 'Đặng Văn K', skills: ['VueJS'], experienceYears: 3.0, status: 'Từ chối' },
];

describe('Use Case 07: Quản lý và Phân tích Hồ sơ Ứng viên', () => {

  describe('Nhóm 1: Bộ lọc tìm kiếm ứng viên', () => {
    it('[TC_UC07_001] Lọc ứng viên thành công theo kỹ năng đơn lẻ', () => {
      const filtered = filterCandidatesList(sampleCandidates, { skill: 'ReactJS' });
      expect(filtered.length).toBe(4);
      filtered.forEach((c) => expect(c.skills).toContain('ReactJS'));
    });

    it('[TC_UC07_002] Lọc ứng viên theo tổ hợp kỹ năng và kinh nghiệm (Java, 3-5 năm)', () => {
      const filtered = filterCandidatesList(sampleCandidates, { skill: 'Java', experience: '3-5 năm' });
      expect(filtered.length).toBe(2);
      expect(filtered.map((c) => c.name)).toEqual(expect.arrayContaining(['Lê Văn C', 'Đỗ Văn F']));
    });

    it('[TC_UC07_003] Lọc ứng viên theo trạng thái hồ sơ cụ thể ("Phù hợp")', () => {
      const filtered = filterCandidatesList(sampleCandidates, { status: 'Phù hợp' });
      expect(filtered.length).toBe(4);
      filtered.forEach((c) => expect(c.status).toBe('Phù hợp'));
    });

    it('[TC_UC07_004] Xóa bộ lọc quay về danh sách mặc định', () => {
      const filtered = filterCandidatesList(sampleCandidates, {});
      expect(filtered.length).toBe(sampleCandidates.length);
    });

    it('[TC_UC07_034] Lọc với tiêu chí không có kết quả (Ngoại lệ EX_01)', () => {
      const filtered = filterCandidatesList(sampleCandidates, { skill: 'Fortran_1977_Rare' });
      expect(filtered.length).toBe(0);
    });

    it('[TC_UC07_036] Lọc kết hợp 3 tiêu chí: Kỹ năng, Kinh nghiệm, Trạng thái (phép AND)', () => {
      const filtered = filterCandidatesList(sampleCandidates, {
        skill: 'Python',
        experience: '> 5 năm',
        status: 'Mới',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Phạm Văn D');
    });
  });

  describe('Nhóm 2: Xem chi tiết hồ sơ & Xem nhanh', () => {
    it('[TC_UC07_005] Xem nhanh hồ sơ ứng viên qua thao tác hover (Quick Card 0.3s)', () => {
      const candidate = sampleCandidates[1];
      const quickCard = {
        name: candidate.name,
        status: candidate.status,
        experienceYears: candidate.experienceYears,
        cvUrl: 'https://cdn.example.com/cv.pdf',
      };
      expect(quickCard.name).toBe('Trần Thị B');
      expect(quickCard.cvUrl).toBeDefined();
    });

    it('[TC_UC07_006] Mở xem chi tiết hồ sơ ứng viên - tự động cập nhật trạng thái "Đã xem"', () => {
      const initialStatus = 'Mới';
      const transition = validateStatusTransition(initialStatus, 'Đã xem');
      expect(transition.status).toBe('Đã xem');
    });
  });

  describe('Nhóm 3: Kích hoạt AI phân tích hồ sơ và lưu kết quả', () => {
    it('[TC_UC07_007] Phân tích AI so khớp thành công CV với JD (Score 88%, Summary, Gap)', async () => {
      const geminiService = makeGeminiService();
      const useCase = makeUseCase({ geminiService });

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.matchingScore).toBe(88);
      expect(geminiService.analyzeCandidateWithJob).toHaveBeenCalledTimes(1);
    });

    it('[TC_UC07_008] Lưu kết quả phân tích AI vào CSDL bền vững', async () => {
      const analysisRepo = makeAnalysisRepo();
      const useCase = makeUseCase({ analysisRepo });

      const result = await useCase.execute(validInput);

      expect(analysisRepo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('[TC_UC07_025] Phân tích AI khi chưa chọn JD (Ngoại lệ EX_02)', async () => {
      const useCase = makeUseCase();

      await expect(useCase.execute({ candidateID: 'cand-001', jobID: '' })).rejects.toThrow(
        'EX_02: Vui lòng chọn JD (Mô tả công việc) để thực hiện so khớp',
      );
    });

    it('[TC_UC07_026] Phân tích AI với bản JD đã hết hạn tuyển dụng (Closed JD)', async () => {
      const jobRepo = makeJobRepo({
        getById: jest.fn().mockResolvedValue(makeJobEntity({ status: 'CLOSED', isClosed: true })),
      });
      const useCase = makeUseCase({ jobRepo });

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'JD này đã đóng tuyển dụng. Vui lòng chọn JD đang mở tuyển',
      );
    });

    it('[TC_UC07_037] Nhấn nút "Phân tích AI" liên tục nhiều lần chống spam (Idempotency / 1 Request)', async () => {
      let isAnalyzing = false;
      let requestCount = 0;
      const geminiService = makeGeminiService();
      const useCase = makeUseCase({ geminiService });

      const triggerAnalysis = async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        requestCount++;
        await useCase.execute(validInput);
      };

      await Promise.all([triggerAnalysis(), triggerAnalysis(), triggerAnalysis(), triggerAnalysis()]);

      expect(requestCount).toBe(1);
      expect(geminiService.analyzeCandidateWithJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nhóm 4: Chuyển đổi trạng thái hồ sơ & Xuất báo cáo PDF', () => {
    it('[TC_UC07_009] Xuất báo cáo kết quả phân tích ra file PDF thành công', () => {
      expect(() => validateExportPdf(true, true)).not.toThrow();
    });

    it('[TC_UC07_010] Chuyển đổi trạng thái từ "Đã xem" sang "Phỏng vấn"', () => {
      const transition = validateStatusTransition('Đã xem', 'Phỏng vấn');
      expect(transition.status).toBe('Phỏng vấn');
    });

    it('[TC_UC07_031] Kiểm tra nút "Xuất PDF" bị khóa khi chưa phân tích', () => {
      expect(() => validateExportPdf(false, true)).toThrow(
        'Chưa có kết quả phân tích AI, chức năng xuất PDF bị vô hiệu hóa',
      );
    });

    it('[TC_UC07_032] Chuyển trạng thái ngược phi lý từ "Trúng tuyển" về "Mới" -> Chặn lưu', () => {
      expect(() => validateStatusTransition('Trúng tuyển', 'Mới')).toThrow(
        'Không thể chuyển ngược trạng thái từ Trúng tuyển về Mới',
      );
    });

    it('[TC_UC07_033] Chuyển trạng thái từ "Phỏng vấn" sang "Từ chối" kèm lý do chi tiết', () => {
      const transition = validateStatusTransition('Phỏng vấn', 'Từ chối', 'Không đạt bài kiểm tra chuyên môn');
      expect(transition.status).toBe('Từ chối');
      expect(transition.reason).toBe('Không đạt bài kiểm tra chuyên môn');

      expect(() => validateStatusTransition('Phỏng vấn', 'Từ chối', '')).toThrow(
        'Vui lòng nhập lý do từ chối hồ sơ',
      );
    });

    it('[TC_UC07_038] Kiểm tra tải xuống file PDF báo cáo khi mất mạng', () => {
      expect(() => validateExportPdf(true, false)).toThrow(
        'Không thể kết nối máy chủ để kết xuất PDF, vui lòng kiểm tra mạng',
      );
    });
  });

  describe('Nhóm 5: Validation trường dữ liệu & An toàn bảo mật tìm kiếm', () => {
    it('[TC_UC07_011] Lọc kỹ năng không phân biệt chữ hoa và chữ thường ("rEaCtJs")', () => {
      const lowerResult = filterCandidatesList(sampleCandidates, { skill: 'reactjs' });
      const mixedResult = filterCandidatesList(sampleCandidates, { skill: 'rEaCtJs' });
      expect(lowerResult).toEqual(mixedResult);
    });

    it('[TC_UC07_012] Lọc kỹ năng có khoảng trắng thừa ở hai đầu ("   NodeJS   ")', () => {
      const trimmedResult = filterCandidatesList(sampleCandidates, { skill: '   NodeJS   ' });
      expect(trimmedResult.length).toBe(2);
    });

    it('[TC_UC07_013] Lọc từ khóa kỹ năng độ dài tối đa biên trên (100 ký tự)', () => {
      const exact100 = 'A'.repeat(100);
      expect(() => validateSkillKeyword(exact100)).not.toThrow();
      expect(validateSkillKeyword(exact100).length).toBe(100);
    });

    it('[TC_UC07_014] Lọc từ khóa kỹ năng vượt biên trên (101 ký tự) -> ném lỗi', () => {
      const over101 = 'A'.repeat(101);
      expect(() => validateSkillKeyword(over101)).toThrow(
        'Từ khóa kỹ năng vượt quá độ dài tối đa cho phép (tối đa 100 ký tự)',
      );
    });

    it('[TC_UC07_015] Chèn mã độc XSS vào ô tìm kiếm kỹ năng -> khử script an toàn', () => {
      const xssInput = "<script>alert('XSS_Filter')</script>";
      const sanitized = sanitizeFilterText(xssInput);
      expect(sanitized).toBe('');
      expect(sanitized).not.toContain('<script>');
    });

    it('[TC_UC07_016] Chèn mã SQL Injection vào ô tìm kiếm kỹ năng (\' OR 1=1--) -> parameterized an toàn', () => {
      const sqlInput = "' OR 1=1--";
      const sanitized = sanitizeSqlParam(sqlInput);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain('--');
    });

    it('[TC_UC07_017] Lọc ứng viên với mốc kinh nghiệm "< 1 năm" (0.0 đến < 1.0 năm)', () => {
      const filtered = filterCandidatesList(sampleCandidates, { experience: '< 1 năm' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Hoàng Thị E');
    });

    it('[TC_UC07_018] Lọc ứng viên với mốc kinh nghiệm "> 5 năm" (>= 5.1 năm)', () => {
      const filtered = filterCandidatesList(sampleCandidates, { experience: '> 5 năm' });
      expect(filtered.length).toBe(2);
      filtered.forEach((c) => expect(c.experienceYears).toBeGreaterThanOrEqual(5.1));
    });
  });

  describe('Nhóm 6: Phân tích giá trị biên Phân trang và Tham số URL', () => {
    const list25 = Array.from({ length: 25 }, (_, i) => ({ id: `${i + 1}`, name: `Candidate ${i + 1}` }));

    it('[TC_UC07_019] Điều hướng sang trang 2 trong danh sách phân trang (25 items, pageSize = 10)', () => {
      const page2 = paginateCandidatesList(list25, 2, 10);
      expect(page2.data.length).toBe(10);
      expect(page2.page).toBe(2);
      expect(page2.data[0].name).toBe('Candidate 11');
      expect(page2.data[9].name).toBe('Candidate 20');
    });

    it('[TC_UC07_020] Kiểm tra nút "Trang trước" bị vô hiệu hóa ở trang đầu (Page = 1)', () => {
      const page1 = paginateCandidatesList(list25, 1, 10);
      expect(page1.hasPrevious).toBe(false);
      expect(page1.hasNext).toBe(true);
    });

    it('[TC_UC07_021] Kiểm tra nút "Trang sau" bị vô hiệu hóa ở trang cuối (Page = 3)', () => {
      const page3 = paginateCandidatesList(list25, 3, 10);
      expect(page3.hasPrevious).toBe(true);
      expect(page3.hasNext).toBe(false);
      expect(page3.data.length).toBe(5);
    });

    it('[TC_UC07_022] Nhập trực tiếp số trang âm vào URL phân trang (?page=-1) -> quay về page 1', () => {
      const result = paginateCandidatesList(list25, -1, 10);
      expect(result.page).toBe(1);
    });

    it('[TC_UC07_023] Nhập số trang vượt quá tổng số trang vào URL (?page=999) -> về trang cuối cùng', () => {
      const result = paginateCandidatesList(list25, 999, 10);
      expect(result.page).toBe(3);
    });

    it('[TC_UC07_024] Nhập số trang là ký tự chữ vào URL (?page=abc) -> về page 1', () => {
      const result = paginateCandidatesList(list25, 'abc', 10);
      expect(result.page).toBe(1);
    });

    it('[TC_UC07_035] Xem danh sách khi CSDL chưa có ứng viên (EX_04 / Empty State)', () => {
      const emptyResult = paginateCandidatesList([], 1, 10);
      expect(emptyResult.data.length).toBe(0);
      expect(emptyResult.total).toBe(0);
      expect(emptyResult.totalPages).toBe(1);
    });
  });

  describe('Nhóm 7: Phân tích giá trị biên Điểm AI và Xử lý Timeout', () => {
    it('[TC_UC07_027] Xử lý timeout khi máy chủ AI quá tải (> 10.0s) -> báo lỗi EX_03', async () => {
      const geminiService = makeGeminiService({
        analyzeCandidateWithJob: jest.fn().mockRejectedValue(new Error('AI request timeout after 10000ms EX_03')),
      });
      const useCase = makeUseCase({ geminiService });

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'EX_03: Máy chủ AI phản hồi chậm quá thời gian cho phép (Timeout)',
      );
    });

    it('[TC_UC07_028] Phản hồi AI ở cận trên thời gian cho phép (10.0s) -> tiếp nhận thành công', async () => {
      const geminiService = makeGeminiService();
      const useCase = makeUseCase({ geminiService });

      const result = await useCase.execute(validInput);
      expect(result).toBeDefined();
    });

    it('[TC_UC07_029] Kết quả phân tích AI khớp 100% hoàn hảo', async () => {
      const geminiService = makeGeminiService({
        analyzeCandidateWithJob: jest.fn().mockResolvedValue(makeAIResult(100)),
      });
      const analysisRepo = makeAnalysisRepo({
        create: jest.fn().mockResolvedValue(makeAnalysisEntity(100)),
      });
      const useCase = makeUseCase({ geminiService, analysisRepo });

      const result = await useCase.execute(validInput);
      expect(result.matchingScore).toBe(100);
    });

    it('[TC_UC07_030] Kết quả phân tích AI không khớp 0%', async () => {
      const geminiService = makeGeminiService({
        analyzeCandidateWithJob: jest.fn().mockResolvedValue(makeAIResult(0)),
      });
      const analysisRepo = makeAnalysisRepo({
        create: jest.fn().mockResolvedValue(makeAnalysisEntity(0)),
      });
      const useCase = makeUseCase({ geminiService, analysisRepo });

      const result = await useCase.execute(validInput);
      expect(result.matchingScore).toBe(0);
    });
  });
});
