import { VerifyCandidateUseCase } from './candidate-verify.use-case';
import { ConfirmVerifyUseCase } from './confirmVerify.use-case';
import { VerificationEntity } from '../../../domain/verifycation';
import { CandidateEntity } from '../../../domain/candidate/candidate.entity';
import { CandidateStatus, VerificationStatus } from '../../../domain/candidate/candidate.types';
import type { IVerificationRepository } from '../../../application/ports/repositories/verification.interface';
import type { ICandidateReadRepo, ICandidateWriteRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IVerifyCandidateInputDTO, IVerificationProps } from '../../../domain/verifycation';

// =============================================================================
// CÁC HÀM XÁC THỰC DỮ LIỆU ĐẦU VÀO ĐƯỢC ĐẶC TẢ TRONG TÀI LIỆU
// =============================================================================
export function validateFullName(fullName: string | null): string {
  if (fullName == null || fullName.trim() === "") {
    return "Họ tên không được để trống.";
  }
  if (fullName.trim().length < 2 || fullName.trim().length > 100) {
    return "Họ tên phải từ 2 đến 100 ký tự.";
  }
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(fullName.trim())) {
    return "Họ tên chỉ được chứa chữ cái và khoảng trắng.";
  }
  return "Hợp lệ";
}

export function validateEmail(email: string | null): string {
  if (email == null || email.trim() === "") {
    return "Địa chỉ email không được để trống.";
  }
  if (email.trim().length < 6 || email.trim().length > 100) {
    return "Địa chỉ email phải từ 6 đến 100 ký tự.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Địa chỉ email không đúng định dạng chuẩn.";
  }
  return "Hợp lệ";
}

export function validatePhone(phone: string | null): string {
  if (phone == null || phone.trim() === "") {
    return "Số điện thoại không được để trống.";
  }
  if (!/^\d+$/.test(phone.trim())) {
    return "Số điện thoại chỉ được chứa chữ số.";
  }
  const length = phone.trim().length;
  if (length !== 10) {
    return "Số điện thoại phải có đúng 10 chữ số.";
  }
  if (!/^(03|05|07|08|09)/.test(phone.trim())) {
    return "Đầu số điện thoại không hợp lệ.";
  }
  return "Hợp lệ";
}

export function validateSchool(school: string | null | undefined): string {
  if (school == null || school.trim() === "") {
    return "Hợp lệ";
  }
  if (/<[^>]*>/g.test(school.trim())) {
    return "Tên trường đào tạo không được chứa mã HTML.";
  }
  const length = school.trim().length;
  if (length < 2 || length > 150) {
    return "Tên trường đào tạo phải từ 2 đến 150 ký tự.";
  }
  return "Hợp lệ";
}

export function validateGithubStars(githubStars: any): string {
  if (githubStars == null || githubStars === undefined) {
    return "Hợp lệ (mặc định 0)";
  }
  if (!Number.isInteger(githubStars)) {
    return "Số lượng GitHub Stars phải là số nguyên.";
  }
  const stars = githubStars;
  if (stars < 0) {
    return "Số lượng GitHub Stars không hợp lệ.";
  }
  return "Hợp lệ";
}

export function validateTopLanguages(topLanguages: any): string {
  if (topLanguages == null || !Array.isArray(topLanguages) || topLanguages.length === 0) {
    return "Khởi tạo mảng rỗng []";
  }
  const hasInvalid = topLanguages.some(
    (item) => typeof item !== 'string' || item.trim() === '' || item.trim().length > 50 || /<[^>]*>/g.test(item)
  );
  if (hasInvalid) {
    return "Đã lọc bỏ phần tử không hợp lệ";
  }
  return "Hợp lệ";
}

export function validateProbedProjects(probedProjects: any): string {
  if (probedProjects == null || (Array.isArray(probedProjects) && probedProjects.length === 0)) {
    return "Không có dữ liệu dự án.";
  }
  if (!Array.isArray(probedProjects)) {
    return "Dữ liệu dự án sai định dạng JSON.";
  }
  const hasInvalidItem = probedProjects.some((proj) => !proj || typeof proj !== 'object' || !proj.name);
  if (hasInvalidItem) {
    return "Dữ liệu dự án sai định dạng JSON.";
  }
  const count = probedProjects.length;
  if (count > 5) {
    return "Hợp lệ (tối đa 5 dự án nổi bật)";
  }
  return "Hợp lệ";
}

export function validateAiReasoning(aiReasoning: any): string {
  if (aiReasoning == null || (typeof aiReasoning === 'string' && aiReasoning.trim() === "")) {
    return "Hợp lệ (mặc định '—')";
  }
  if (typeof aiReasoning === 'string' && /<[^>]*>/g.test(aiReasoning.trim())) {
    return "Nội dung phân tích AI không được chứa mã HTML.";
  }
  const length = typeof aiReasoning === 'string' ? aiReasoning.trim().length : 0;
  if (length > 2000) {
    return "Nội dung phân tích AI không được vượt quá 2000 ký tự.";
  }
  return "Hợp lệ";
}

export function validateStatus(status: any): string {
  if (!status) {
    return "Thiếu trạng thái xác minh!";
  }
  if (!['verified', 'risky'].includes(status)) {
    return "Status không hợp lệ. Chỉ cho phép: verified hoặc risky";
  }
  return "Hợp lệ";
}

// =============================================================================
// MOCK FACTORIES
// =============================================================================
const makeRepo = (overrides: Partial<IVerificationRepository> = {}): jest.Mocked<IVerificationRepository> =>
  ({
    getByCandidateId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (entity: VerificationEntity) => entity),
    updateIsVerify: jest.fn().mockResolvedValue(undefined),
    updateVerificationStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);

const makeCandidateReadRepo = (candidate: CandidateEntity | null = null): jest.Mocked<ICandidateReadRepo> =>
  ({
    getById: jest.fn().mockResolvedValue(candidate),
    getCandidates: jest.fn().mockResolvedValue([]),
    checkExistsCandidate: jest.fn().mockResolvedValue(false),
    findByEmail: jest.fn().mockResolvedValue(null),
    countForStatistics: jest.fn().mockResolvedValue(0),
    getForStatistics: jest.fn().mockResolvedValue([]),
    getCanidateByJob: jest.fn().mockResolvedValue([]),
  } as any);

const makeCandidateWriteRepo = (): jest.Mocked<ICandidateWriteRepo> =>
  ({
    create: jest.fn().mockImplementation(async (c: CandidateEntity) => c),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation(async (c: CandidateEntity) => c),
  } as any);

const makeTestCandidate = (overrides = {}): CandidateEntity =>
  CandidateEntity.restore({
    id: 'cand-001',
    jobID: 'job-101',
    jobTitle: 'Senior Fullstack Engineer',
    addedBy: 'hr-admin',
    status: CandidateStatus.APPLIED,
    verificationStatus: VerificationStatus.UNVERIFIED,
    personal: {
      fullName: 'Nguyễn Văn An',
      email: 'phungvanduy@gmail.com',
      phone: '0912345678',
      avatar: '',
      cvLink: '',
      githubLink: 'https://github.com/nguyenvanan',
      socialLinks: {},
    },
    ...overrides,
  });

const validVerificationInput: IVerifyCandidateInputDTO = {
  name: 'Nguyễn Văn An',
  email: 'phungvanduy@gmail.com',
  phone: '0912345678',
  school: 'Đại học Bách Khoa Hà Nội',
  githubStars: 50,
  topLanguages: ['TypeScript', 'Python'],
  probedProjects: [
    { name: 'Ecommerce-Platform', stars: 25, language: 'TypeScript' },
    { name: 'AI-Agent-Bot', stars: 25, language: 'Python' },
  ],
  aiReasoning: 'Hồ sơ có dữ liệu đối soát thực tế khớp 95% với bằng cấp và dự án GitHub.',
};

describe('USE-CASE: KIỂM CHỨNG VÀ XÁC THỰC HỒ SƠ ỨNG VIÊN', () => {

  // =========================================================================
  // NHÓM 1: LUỒNG CHÍNH (Basic Flow)
  // =========================================================================
  describe('Nhóm 1: Luồng chính (Basic Flow)', () => {
    it('TC_UC_001: Thu thập và lưu hồ sơ kiểm chứng thành công vào CSDL (VerifyCandidateUseCase)', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      const result = await useCase.execute('cand-001', validVerificationInput);

      expect(result).toBeDefined();
      expect(result.candidateId).toBe('cand-001');
      expect(result.name).toBe('Nguyễn Văn An');
      expect(result.githubStars).toBe(50);
      expect(result.isVerified).toBe(false);
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.updateIsVerify).toHaveBeenCalledWith('cand-001', true);
    });

    it('TC_UC_002: Chuyên viên xác nhận verified -> Chuyển trạng thái sang OFFER (State Pattern)', async () => {
      const candidate = makeTestCandidate();
      const vRepo = makeRepo();
      const cReadRepo = makeCandidateReadRepo(candidate);
      const cWriteRepo = makeCandidateWriteRepo();

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);
      const message = await useCase.execute('cand-001', 'verified');

      expect(message).toBe('Kiểm chứng thành công! Chuyển sang Đề nghị.');
      expect(candidate.getStatus()).toBe(CandidateStatus.OFFER);
      expect(candidate.getVerificationStatus()).toBe(VerificationStatus.VERIFIED);
      expect(vRepo.updateVerificationStatus).toHaveBeenCalledWith('cand-001', true);
      expect(cWriteRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // NHÓM 2: LUỒNG RẼ NHÁNH VÀ THAY THẾ (Alternative Flow)
  // =========================================================================
  describe('Nhóm 2: Luồng rẽ nhánh & thay thế (Alternative Flow - A3 Risky)', () => {
    it('TC_UC_003: Đánh dấu hồ sơ có rủi ro (risky) -> Reset trạng thái về APPLIED (State Pattern)', async () => {
      const candidate = makeTestCandidate({
        status: CandidateStatus.INTERVIEW,
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      const vRepo = makeRepo();
      const cReadRepo = makeCandidateReadRepo(candidate);
      const cWriteRepo = makeCandidateWriteRepo();

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);
      const message = await useCase.execute('cand-001', 'risky');

      expect(message).toBe('Đánh dấu rủi ro. Reset lại Ứng tuyển.');
      expect(candidate.getStatus()).toBe(CandidateStatus.APPLIED);
      expect(candidate.getVerificationStatus()).toBe(VerificationStatus.RISKY);
      expect(vRepo.updateVerificationStatus).toHaveBeenCalledWith('cand-001', false);
      expect(cWriteRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // NHÓM 3: KIỂM THỬ ĐƠN VỊ VÀ GIÁ TRỊ BIÊN (BVA) TỪNG TRƯỜNG DỮ LIỆU
  // =========================================================================
  describe('Nhóm 3: Kiểm thử Đơn vị & Giá trị biên (BVA)', () => {
    // --- 3.1 Họ và tên ---
    describe('3.1 Họ và tên ứng viên (fullName)', () => {
      it('TC_BVA_FN_01: null -> Báo lỗi để trống', () => {
        expect(validateFullName(null)).toBe('Họ tên không được để trống.');
      });
      it('TC_BVA_FN_02: Chuỗi rỗng -> Báo lỗi để trống', () => {
        expect(validateFullName('')).toBe('Họ tên không được để trống.');
      });
      it('TC_BVA_FN_03: Dưới biên min (L=1 "A") -> Báo lỗi tối thiểu 2 ký tự', () => {
        expect(validateFullName('A')).toBe('Họ tên phải từ 2 đến 100 ký tự.');
      });
      it('TC_BVA_FN_04: Đúng biên min (L=2 "An") -> Hợp lệ', () => {
        expect(validateFullName('An')).toBe('Hợp lệ');
      });
      it('TC_BVA_FN_05: Khoảng chuẩn (L=13 "Nguyễn Văn An") -> Hợp lệ', () => {
        expect(validateFullName('Nguyễn Văn An')).toBe('Hợp lệ');
      });
      it('TC_BVA_FN_06: Đúng biên max (L=100) -> Hợp lệ', () => {
        expect(validateFullName('A'.repeat(100))).toBe('Hợp lệ');
      });
      it('TC_BVA_FN_07: Vượt biên max (L=101) -> Báo lỗi vượt quá 100 ký tự', () => {
        expect(validateFullName('A'.repeat(101))).toBe('Họ tên phải từ 2 đến 100 ký tự.');
      });
      it('TC_BVA_FN_08: Chứa chữ số "Duy 123" -> Báo lỗi chỉ được chứa chữ cái', () => {
        expect(validateFullName('Duy 123')).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng.');
      });
      it('TC_BVA_FN_09: Chứa ký tự đặc biệt "An @#$" -> Báo lỗi chỉ được chứa chữ cái', () => {
        expect(validateFullName('An @#$')).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng.');
      });
    });

    // --- 3.2 Email ---
    describe('3.2 Email ứng viên (email)', () => {
      it('TC_BVA_EM_01: null -> Báo lỗi để trống', () => {
        expect(validateEmail(null)).toBe('Địa chỉ email không được để trống.');
      });
      it('TC_BVA_EM_02: Dưới biên min (L=5 "a@b.c") -> Báo lỗi độ dài', () => {
        expect(validateEmail('a@b.c')).toBe('Địa chỉ email phải từ 6 đến 100 ký tự.');
      });
      it('TC_BVA_EM_03: Đúng biên min (L=6 "a@b.vn") -> Hợp lệ', () => {
        expect(validateEmail('a@b.vn')).toBe('Hợp lệ');
      });
      it('TC_BVA_EM_04: Khoảng chuẩn "phungvanduy@gmail.com" -> Hợp lệ', () => {
        expect(validateEmail('phungvanduy@gmail.com')).toBe('Hợp lệ');
      });
      it('TC_BVA_EM_05: Đúng biên max L=100 -> Hợp lệ', () => {
        const email100 = 'a'.repeat(88) + '@example.com';
        expect(validateEmail(email100)).toBe('Hợp lệ');
      });
      it('TC_BVA_EM_06: Vượt biên max L=101 -> Báo lỗi độ dài', () => {
        const email101 = 'a'.repeat(89) + '@example.com';
        expect(validateEmail(email101)).toBe('Địa chỉ email phải từ 6 đến 100 ký tự.');
      });
      it('TC_BVA_EM_07: Sai format thiếu @ ("duy.gmail.com") -> Báo lỗi định dạng', () => {
        expect(validateEmail('duy.gmail.com')).toBe('Địa chỉ email không đúng định dạng chuẩn.');
      });
      it('TC_BVA_EM_08: Sai format thiếu domain ("duy@gmail") -> Báo lỗi định dạng', () => {
        expect(validateEmail('duy@gmail')).toBe('Địa chỉ email không đúng định dạng chuẩn.');
      });
    });

    // --- 3.3 Số điện thoại ---
    describe('3.3 Số điện thoại (phone)', () => {
      it('TC_BVA_PH_01: null hoặc rỗng -> Báo lỗi để trống', () => {
        expect(validatePhone(null)).toBe('Số điện thoại không được để trống.');
        expect(validatePhone('')).toBe('Số điện thoại không được để trống.');
      });
      it('TC_BVA_PH_02: Chứa chữ cái "0987abc" -> Báo lỗi chỉ được chứa chữ số', () => {
        expect(validatePhone('0987abc')).toBe('Số điện thoại chỉ được chứa chữ số.');
      });
      it('TC_BVA_PH_03: Dưới biên độ dài L=9 ("091234567") -> Báo lỗi đúng 10 số', () => {
        expect(validatePhone('091234567')).toBe('Số điện thoại phải có đúng 10 chữ số.');
      });
      it('TC_BVA_PH_04: Vượt biên độ dài L=11 ("09123456789") -> Báo lỗi đúng 10 số', () => {
        expect(validatePhone('09123456789')).toBe('Số điện thoại phải có đúng 10 chữ số.');
      });
      it('TC_BVA_PH_05: Đầu số không hợp lệ ("0241234567", "0123456789") -> Báo lỗi đầu số', () => {
        expect(validatePhone('0241234567')).toBe('Đầu số điện thoại không hợp lệ.');
        expect(validatePhone('0123456789')).toBe('Đầu số điện thoại không hợp lệ.');
      });
      it('TC_BVA_PH_06: Các đầu số chuẩn Viễn thông VN (03, 05, 07, 08, 09) -> Hợp lệ', () => {
        expect(validatePhone('0381234567')).toBe('Hợp lệ');
        expect(validatePhone('0581234567')).toBe('Hợp lệ');
        expect(validatePhone('0771234567')).toBe('Hợp lệ');
        expect(validatePhone('0881234567')).toBe('Hợp lệ');
        expect(validatePhone('0912345678')).toBe('Hợp lệ');
      });
    });

    // --- 3.4 Trường đại học đào tạo ---
    describe('3.4 Trường đại học đào tạo (school)', () => {
      it('TC_BVA_SC_01: null hoặc chuỗi rỗng -> Hợp lệ (dữ liệu tùy chọn)', () => {
        expect(validateSchool(null)).toBe('Hợp lệ');
        expect(validateSchool('')).toBe('Hợp lệ');
      });
      it('TC_BVA_SC_02: Dưới biên min L=1 ("A") -> Báo lỗi tối thiểu 2 ký tự', () => {
        expect(validateSchool('A')).toBe('Tên trường đào tạo phải từ 2 đến 150 ký tự.');
      });
      it('TC_BVA_SC_03: Đúng biên min L=2 ("BK") -> Hợp lệ', () => {
        expect(validateSchool('BK')).toBe('Hợp lệ');
      });
      it('TC_BVA_SC_04: Đúng biên max L=150 -> Hợp lệ', () => {
        expect(validateSchool('A'.repeat(150))).toBe('Hợp lệ');
      });
      it('TC_BVA_SC_05: Vượt biên max L=151 -> Báo lỗi vượt quá 150 ký tự', () => {
        expect(validateSchool('A'.repeat(151))).toBe('Tên trường đào tạo phải từ 2 đến 150 ký tự.');
      });
      it('TC_BVA_SC_06: Chứa mã độc XSS <script> -> Báo lỗi bảo mật', () => {
        expect(validateSchool("<script>alert('hack')</script>")).toBe(
          'Tên trường đào tạo không được chứa mã HTML.'
        );
      });
    });

    // --- 3.5 Điểm uy tín GitHub ---
    describe('3.5 Điểm uy tín GitHub (githubStars)', () => {
      it('TC_BVA_GS_01: null hoặc undefined -> Mặc định 0 hợp lệ', () => {
        expect(validateGithubStars(null)).toBe('Hợp lệ (mặc định 0)');
        expect(validateGithubStars(undefined)).toBe('Hợp lệ (mặc định 0)');
      });
      it('TC_BVA_GS_02: Số âm V=-1 -> Báo lỗi không hợp lệ', () => {
        expect(validateGithubStars(-1)).toBe('Số lượng GitHub Stars không hợp lệ.');
      });
      it('TC_BVA_GS_03: Đúng biên min V=0 -> Hợp lệ', () => {
        expect(validateGithubStars(0)).toBe('Hợp lệ');
      });
      it('TC_BVA_GS_04: Liền kề biên min V=1 -> Hợp lệ', () => {
        expect(validateGithubStars(1)).toBe('Hợp lệ');
      });
      it('TC_BVA_GS_05: Giá trị lớn V=1200 -> Hợp lệ', () => {
        expect(validateGithubStars(1200)).toBe('Hợp lệ');
      });
      it('TC_BVA_GS_06: Số thực không phải nguyên (10.5) -> Báo lỗi số nguyên', () => {
        expect(validateGithubStars(10.5)).toBe('Số lượng GitHub Stars phải là số nguyên.');
      });
    });

    // --- 3.6 Ngôn ngữ lập trình chính ---
    describe('3.6 Ngôn ngữ lập trình chính (topLanguages)', () => {
      it('TC_BVA_TL_01: null, undefined hoặc [] -> Khởi tạo mảng rỗng []', () => {
        expect(validateTopLanguages(null)).toBe('Khởi tạo mảng rỗng []');
        expect(validateTopLanguages(undefined)).toBe('Khởi tạo mảng rỗng []');
        expect(validateTopLanguages([])).toBe('Khởi tạo mảng rỗng []');
      });
      it('TC_BVA_TL_02: Đúng biên min L=1 (["C", "R"]) -> Hợp lệ', () => {
        expect(validateTopLanguages(['C', 'R'])).toBe('Hợp lệ');
      });
      it('TC_BVA_TL_03: Trong khoảng chuẩn (["TypeScript", "Python"]) -> Hợp lệ', () => {
        expect(validateTopLanguages(['TypeScript', 'Python'])).toBe('Hợp lệ');
      });
      it('TC_BVA_TL_04: Đúng biên max L=50 -> Hợp lệ', () => {
        expect(validateTopLanguages(['A'.repeat(50)])).toBe('Hợp lệ');
      });
      it('TC_BVA_TL_05: Vượt biên max L=51 -> Lọc bỏ phần tử không hợp lệ', () => {
        expect(validateTopLanguages(['Java', 'A'.repeat(51)])).toBe(
          'Đã lọc bỏ phần tử không hợp lệ'
        );
      });
      it('TC_BVA_TL_06: Chứa phần tử rỗng hoặc mã độc XSS -> Lọc bỏ', () => {
        expect(validateTopLanguages(['Python', ' ', 'Java'])).toBe(
          'Đã lọc bỏ phần tử không hợp lệ'
        );
        expect(validateTopLanguages(['JS', "<script>alert(1)</script>"])).toBe(
          'Đã lọc bỏ phần tử không hợp lệ'
        );
      });
    });

    // --- 3.7 Danh sách dự án đối soát ---
    describe('3.7 Danh sách dự án đối soát (probedProjects)', () => {
      it('TC_BVA_PP_01: null, undefined hoặc [] -> Báo không có dữ liệu', () => {
        expect(validateProbedProjects(null)).toBe('Không có dữ liệu dự án.');
        expect(validateProbedProjects(undefined)).toBe('Không có dữ liệu dự án.');
        expect(validateProbedProjects([])).toBe('Không có dữ liệu dự án.');
      });
      it('TC_BVA_PP_02: Đúng biên min N=1 -> Hợp lệ', () => {
        expect(validateProbedProjects([{ name: 'App-Chat', stars: 5 }])).toBe('Hợp lệ');
      });
      it('TC_BVA_PP_03: Đúng biên max N=5 -> Hợp lệ', () => {
        const fiveProjects = Array(5).fill({ name: 'Project-Item' });
        expect(validateProbedProjects(fiveProjects)).toBe('Hợp lệ');
      });
      it('TC_BVA_PP_04: Vượt biên max N=6 -> Tối đa 5 dự án nổi bật', () => {
        const sixProjects = Array(6).fill({ name: 'Project-Item' });
        expect(validateProbedProjects(sixProjects)).toBe('Hợp lệ (tối đa 5 dự án nổi bật)');
      });
      it('TC_BVA_PP_05: Dữ liệu không phải mảng hoặc thiếu trường name -> Báo lỗi JSON', () => {
        expect(validateProbedProjects('Invalid JSON')).toBe('Dữ liệu dự án sai định dạng JSON.');
        expect(validateProbedProjects([{ stars: 10 }])).toBe('Dữ liệu dự án sai định dạng JSON.');
      });
    });

    // --- 3.8 Lý giải từ AI ---
    describe('3.8 Đánh giá & Lý giải từ AI (aiReasoning)', () => {
      it('TC_BVA_AI_01: null hoặc rỗng -> Mặc định "—"', () => {
        expect(validateAiReasoning(null)).toBe("Hợp lệ (mặc định '—')");
        expect(validateAiReasoning('')).toBe("Hợp lệ (mặc định '—')");
      });
      it('TC_BVA_AI_02: Biên chuẩn L=1 đến L=2000 -> Hợp lệ', () => {
        expect(validateAiReasoning('A')).toBe('Hợp lệ');
        expect(validateAiReasoning('A'.repeat(2000))).toBe('Hợp lệ');
      });
      it('TC_BVA_AI_03: Vượt biên max L=2001 -> Báo lỗi vượt quá 2000 ký tự', () => {
        expect(validateAiReasoning('A'.repeat(2001))).toBe(
          'Nội dung phân tích AI không được vượt quá 2000 ký tự.'
        );
      });
      it('TC_BVA_AI_04: Chứa mã độc XSS -> Báo lỗi bảo mật', () => {
        expect(validateAiReasoning("Good <script>alert(1)</script>")).toBe(
          'Nội dung phân tích AI không được chứa mã HTML.'
        );
      });
    });

    // --- 3.9 Trạng thái xác minh ---
    describe('3.9 Trạng thái xác nhận (status)', () => {
      it('TC_BVA_ST_01: null hoặc rỗng -> Báo thiếu trạng thái', () => {
        expect(validateStatus(null)).toBe('Thiếu trạng thái xác minh!');
        expect(validateStatus('')).toBe('Thiếu trạng thái xác minh!');
      });
      it('TC_BVA_ST_02: Giá trị khác verified và risky -> Báo lỗi status', () => {
        expect(validateStatus('pending')).toBe('Status không hợp lệ. Chỉ cho phép: verified hoặc risky');
        expect(validateStatus('rejected')).toBe('Status không hợp lệ. Chỉ cho phép: verified hoặc risky');
      });
      it('TC_BVA_ST_03: Giá trị chuẩn "verified" và "risky" -> Hợp lệ', () => {
        expect(validateStatus('verified')).toBe('Hợp lệ');
        expect(validateStatus('risky')).toBe('Hợp lệ');
      });
    });
  });

  // =========================================================================
  // NHÓM 4: KIỂM THỬ NGOẠI LỆ & RÀNG BUỘC NGHIỆP VỤ (Exception Flows)
  // =========================================================================
  describe('Nhóm 4: Luồng ngoại lệ (Exception Flows EX_01 -> EX_05)', () => {
    it('TC_EX_001: EX_01 - Ném lỗi khi candidateID bị rỗng hoặc thiếu dataVerification', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('', validVerificationInput)).rejects.toThrow(
        'candidateID không hợp lệ hoặc bị rỗng.'
      );
      await expect(useCase.execute('   ', validVerificationInput)).rejects.toThrow(
        'candidateID không hợp lệ hoặc bị rỗng.'
      );
      await expect(useCase.execute('cand-001', null as any)).rejects.toThrow(
        'Dữ liệu xác minh không được để trống.'
      );
    });

    it('TC_EX_002: EX_02 - Ném lỗi 404 khi không tìm thấy ứng viên trong CSDL', async () => {
      const vRepo = makeRepo();
      const cReadRepo = makeCandidateReadRepo(null); // Trả về null
      const cWriteRepo = makeCandidateWriteRepo();

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);

      await expect(useCase.execute('cand-999', 'verified')).rejects.toThrow(
        'Ứng viên không tìm thấy'
      );
    });

    it('TC_EX_003: EX_03 - Ném lỗi khi ứng viên đã được kiểm chứng trước đó', async () => {
      const existing = VerificationEntity.create({
        candidateId: 'cand-001',
        githubStars: 10,
        topLanguages: [],
      });
      const repo = makeRepo({
        getByCandidateId: jest.fn().mockResolvedValue(existing),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validVerificationInput)).rejects.toThrow(
        'Ứng viên này đã được kiểm chứng trước đó, không thể xác minh lại.'
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('TC_EX_004: EX_04 - Dịch vụ CSDL gián đoạn khi lưu hồ sơ xác minh', async () => {
      const repo = makeRepo({
        create: jest.fn().mockRejectedValue(new Error('Connection Timeout')),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validVerificationInput)).rejects.toThrow(
        'Đã xảy ra lỗi khi lưu thông tin xác minh, vui lòng thử lại.'
      );
    });

    it('TC_EX_005: EX_05 - Ném lỗi khi status gửi lên không hợp lệ', async () => {
      const vRepo = makeRepo();
      const cReadRepo = makeCandidateReadRepo(makeTestCandidate());
      const cWriteRepo = makeCandidateWriteRepo();

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);

      await expect(useCase.execute('cand-001', 'unknown_status')).rejects.toThrow(
        'Status không hợp lệ. Chỉ cho phép: verified hoặc risky'
      );
      await expect(useCase.execute('cand-001', '')).rejects.toThrow(
        'Status không hợp lệ. Chỉ cho phép: verified hoặc risky'
      );
    });
  });

  // =========================================================================
  // NHÓM 5: KIỂM THỬ HỘP TRẮNG C1 & C2 (Statement & Branch Coverage)
  // =========================================================================
  describe('Nhóm 5: Kiểm thử Hộp trắng C1 & C2 (Statement & Branch Coverage)', () => {
    it('TC_WB_C1_C2_01: Phủ nhánh tạo thành công và cập nhật isVerify song song', async () => {
      const repo = makeRepo();
      const useCase = new VerifyCandidateUseCase(repo);

      const res = await useCase.execute('cand-001', validVerificationInput);

      expect(res).toBeDefined();
      expect(repo.updateIsVerify).toHaveBeenCalledWith('cand-001', true);
    });

    it('TC_WB_C1_C2_02: Phủ nhánh repo.create trả về null', async () => {
      const repo = makeRepo({
        create: jest.fn().mockResolvedValue(null),
      });
      const useCase = new VerifyCandidateUseCase(repo);

      await expect(useCase.execute('cand-001', validVerificationInput)).rejects.toThrow(
        'Kiểm chứng lỗi vui lòng thử lại!'
      );
    });
  });

  // =========================================================================
  // NHÓM 6: KIỂM THỬ HỘP TRẮNG C3 (Condition Coverage)
  // =========================================================================
  describe('Nhóm 6: Kiểm thử Hộp trắng C3 (Condition Coverage)', () => {
    it('TC_WB_C3_01: Phủ các tổ hợp điều kiện !status || !allowed.includes(status)', async () => {
      const vRepo = makeRepo();
      const cReadRepo = makeCandidateReadRepo(makeTestCandidate());
      const cWriteRepo = makeCandidateWriteRepo();
      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);

      // Điều kiện 1: !status == true
      await expect(useCase.execute('cand-001', null as any)).rejects.toThrow(
        'Status không hợp lệ. Chỉ cho phép: verified hoặc risky'
      );

      // Điều kiện 2: !status == false nhưng includes == false
      await expect(useCase.execute('cand-001', 'pending')).rejects.toThrow(
        'Status không hợp lệ. Chỉ cho phép: verified hoặc risky'
      );

      // Điều kiện 3: Cả hai điều kiện đều thỏa mãn -> pass
      const res = await useCase.execute('cand-001', 'verified');
      expect(res).toContain('Kiểm chứng thành công');
    });
  });
});
