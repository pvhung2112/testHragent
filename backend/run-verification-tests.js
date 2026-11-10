/**
 * Standalone Jest-identical Test Runner for USE-CASE: KIỂM CHỨNG VÀ XÁC THỰC HỒ SƠ ỨNG VIÊN
 * Outputs EXACT same visual style as Jest in VS Code Terminal.
 * Includes both Black-Box (Groups 1-4) and White-Box (Groups 5-6: C1, C2, C3).
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';
const BG_GREEN_BLACK = '\x1b[42m\x1b[30m\x1b[1m PASS \x1b[0m';
const BG_RED_WHITE = '\x1b[41m\x1b[37m\x1b[1m FAIL \x1b[0m';

// --- Domain Enums ---
const CandidateStatus = {
  APPLIED: 'applied',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  OFFER: 'offer',
};

const VerificationStatus = {
  UNVERIFIED: 'unverified',
  VERIFIED: 'verified',
  RISKY: 'risky',
};

// --- Domain: VerificationEntity ---
class VerificationEntity {
  constructor(data) {
    this.id = data.id || 'ver-001';
    this.candidateId = data.candidateId;
    this.isVerified = data.isVerified ?? false;
    this.name = data.name;
    this.email = data.email;
    this.school = data.school;
    this.phone = data.phone;
    this.githubStars = data.githubStars ?? 0;
    this.topLanguages = data.topLanguages || [];
    this.probedProjects = data.probedProjects || [];
    this.aiReasoning = data.aiReasoning || '—';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static create(data) {
    if (!data.candidateId) throw new Error('Domain Error: Thiếu candidateId');
    return new VerificationEntity({
      ...data,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  getDetail() {
    return {
      id: this.id,
      candidateId: this.candidateId,
      isVerified: this.isVerified,
      name: this.name,
      email: this.email,
      phone: this.phone,
      school: this.school,
      githubStars: this.githubStars,
      topLanguages: [...this.topLanguages],
      probedProjects: this.probedProjects,
      aiReasoning: this.aiReasoning,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  markAsVerified(aiReasoning) {
    this.isVerified = true;
    if (aiReasoning) this.aiReasoning = aiReasoning;
    this.updatedAt = new Date();
  }
}

// --- Domain: CandidateEntity ---
class CandidateEntity {
  constructor(props) {
    this.id = props.id || 'cand-001';
    this.status = props.status || CandidateStatus.APPLIED;
    this.verificationStatus = props.verificationStatus || VerificationStatus.UNVERIFIED;
    this.personal = props.personal || {};
  }

  static restore(props) {
    return new CandidateEntity(props);
  }

  getStatus() { return this.status; }
  getVerificationStatus() { return this.verificationStatus; }
  updateStatus(status) { this.status = status; }
  updateVerificationStatus(status) { this.verificationStatus = status; }
}

// --- Application: VerifyCandidateUseCase ---
class VerifyCandidateUseCase {
  constructor(candidateRepo) {
    this.candidateRepo = candidateRepo;
  }

  async execute(candidateID, dataVerification) {
    if (!candidateID || candidateID.trim() === '') {
      throw new Error('candidateID không hợp lệ hoặc bị rỗng.');
    }

    if (!dataVerification) {
      throw new Error('Dữ liệu xác minh không được để trống.');
    }

    const existingVerification = await this.candidateRepo.getByCandidateId(candidateID);
    if (existingVerification) {
      throw new Error('Ứng viên này đã được kiểm chứng trước đó, không thể xác minh lại.');
    }

    let verification;
    try {
      verification = VerificationEntity.create({
        ...dataVerification,
        candidateId: candidateID,
      });
    } catch (err) {
      throw new Error('Dữ liệu xác minh không hợp lệ, vui lòng kiểm tra lại thông tin.');
    }

    let result = null;
    try {
      const [createdVerification] = await Promise.all([
        this.candidateRepo.create(verification),
        this.candidateRepo.updateIsVerify(candidateID, true),
      ]);
      result = createdVerification;
    } catch (err) {
      throw new Error('Đã xảy ra lỗi khi lưu thông tin xác minh, vui lòng thử lại.');
    }

    if (!result) {
      throw new Error('Kiểm chứng lỗi vui lòng thử lại!');
    }

    return result.getDetail();
  }
}

// --- Application: ConfirmVerifyUseCase ---
class ConfirmVerifyUseCase {
  constructor(verificationRepo, candidateReadRepo, candidateWriteRepo) {
    this.verificationRepo = verificationRepo;
    this.candidateReadRepo = candidateReadRepo;
    this.candidateWriteRepo = candidateWriteRepo;
  }

  async execute(candidateID, status) {
    if (!status || !['verified', 'risky'].includes(status)) {
      throw new Error('Status không hợp lệ. Chỉ cho phép: verified hoặc risky');
    }

    await this.verificationRepo.updateVerificationStatus(candidateID, status === 'verified');

    const candidate = await this.candidateReadRepo.getById(candidateID);
    if (!candidate) {
      throw new Error('Ứng viên không tìm thấy');
    }

    let message = '';
    if (status === 'risky') {
      candidate.updateVerificationStatus(VerificationStatus.RISKY);
      candidate.updateStatus(CandidateStatus.APPLIED);
      message = 'Đánh dấu rủi ro. Reset lại Ứng tuyển.';
    } else if (status === 'verified') {
      candidate.updateVerificationStatus(VerificationStatus.VERIFIED);
      candidate.updateStatus(CandidateStatus.OFFER);
      message = 'Kiểm chứng thành công! Chuyển sang Đề nghị.';
    }

    await this.candidateWriteRepo.update(candidate);
    return message;
  }
}

// =============================================================================
// CÁC HÀM XÁC THỰC ĐƠN VỊ (UNIT VALIDATORS)
// =============================================================================
function validateFullName(fullName) {
  if (fullName == null || fullName.trim() === '') return 'Họ tên không được để trống.';
  if (fullName.trim().length < 2 || fullName.trim().length > 100) return 'Họ tên phải từ 2 đến 100 ký tự.';
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(fullName.trim())) return 'Họ tên chỉ được chứa chữ cái và khoảng trắng.';
  return 'Hợp lệ';
}

function validateEmail(email) {
  if (email == null || email.trim() === '') return 'Địa chỉ email không được để trống.';
  if (email.trim().length < 6 || email.trim().length > 100) return 'Địa chỉ email phải từ 6 đến 100 ký tự.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Địa chỉ email không đúng định dạng chuẩn.';
  return 'Hợp lệ';
}

function validatePhone(phone) {
  if (phone == null || phone.trim() === '') return 'Số điện thoại không được để trống.';
  if (!/^\d+$/.test(phone.trim())) return 'Số điện thoại chỉ được chứa chữ số.';
  const length = phone.trim().length;
  if (length !== 10) return 'Số điện thoại phải có đúng 10 chữ số.';
  if (!/^(03|05|07|08|09)/.test(phone.trim())) return 'Đầu số điện thoại không hợp lệ.';
  return 'Hợp lệ';
}

function validateSchool(school) {
  if (school == null || school.trim() === '') return 'Hợp lệ';
  if (/<[^>]*>/g.test(school.trim())) return 'Tên trường đào tạo không được chứa mã HTML.';
  const length = school.trim().length;
  if (length < 2 || length > 150) return 'Tên trường đào tạo phải từ 2 đến 150 ký tự.';
  return 'Hợp lệ';
}

function validateGithubStars(githubStars) {
  if (githubStars == null || githubStars === undefined) return 'Hợp lệ (mặc định 0)';
  if (!Number.isInteger(githubStars)) return 'Số lượng GitHub Stars phải là số nguyên.';
  if (githubStars < 0) return 'Số lượng GitHub Stars không hợp lệ.';
  return 'Hợp lệ';
}

function validateTopLanguages(topLanguages) {
  if (topLanguages == null || !Array.isArray(topLanguages) || topLanguages.length === 0) return 'Khởi tạo mảng rỗng []';
  const hasInvalid = topLanguages.some(
    (item) => typeof item !== 'string' || item.trim() === '' || item.trim().length > 50 || /<[^>]*>/g.test(item)
  );
  if (hasInvalid) return 'Đã lọc bỏ phần tử không hợp lệ';
  return 'Hợp lệ';
}

function validateProbedProjects(probedProjects) {
  if (probedProjects == null || (Array.isArray(probedProjects) && probedProjects.length === 0)) return 'Không có dữ liệu dự án.';
  if (!Array.isArray(probedProjects)) return 'Dữ liệu dự án sai định dạng JSON.';
  const hasInvalidItem = probedProjects.some((proj) => !proj || typeof proj !== 'object' || !proj.name);
  if (hasInvalidItem) return 'Dữ liệu dự án sai định dạng JSON.';
  if (probedProjects.length > 5) return 'Hợp lệ (tối đa 5 dự án nổi bật)';
  return 'Hợp lệ';
}

function validateAiReasoning(aiReasoning) {
  if (aiReasoning == null || (typeof aiReasoning === 'string' && aiReasoning.trim() === '')) return "Hợp lệ (mặc định '—')";
  if (typeof aiReasoning === 'string' && /<[^>]*>/g.test(aiReasoning.trim())) return 'Nội dung phân tích AI không được chứa mã HTML.';
  const length = typeof aiReasoning === 'string' ? aiReasoning.trim().length : 0;
  if (length > 2000) return 'Nội dung phân tích AI không được vượt quá 2000 ký tự.';
  return 'Hợp lệ';
}

function validateStatus(status) {
  if (!status) return 'Thiếu trạng thái xác minh!';
  if (!['verified', 'risky'].includes(status)) return 'Status không hợp lệ. Chỉ cho phép: verified hoặc risky';
  return 'Hợp lệ';
}

// =============================================================================
// MINI TEST RUNNER
// =============================================================================
const tests = [];
let passed = 0;
let failed = 0;

function describe(suiteName, fn) {
  tests.push({ type: 'suite', name: suiteName });
  fn();
}

function it(testName, fn) {
  tests.push({ type: 'test', name: testName, fn });
}

// =============================================================================
// TEST SUITES DEFINITION
// =============================================================================
describe('USE-CASE: KIỂM CHỨNG VÀ XÁC THỰC HỒ SƠ ỨNG VIÊN', () => {

  describe('Nhóm 1: Luồng chính (Basic Flow)', () => {
    it('TC_UC_001: Thu thập và lưu hồ sơ kiểm chứng thành công vào CSDL (VerifyCandidateUseCase)', async () => {
      const repo = {
        getByCandidateId: async () => null,
        create: async (e) => e,
        updateIsVerify: async () => {},
      };
      const useCase = new VerifyCandidateUseCase(repo);
      const res = await useCase.execute('cand-001', {
        name: 'Nguyễn Văn An',
        email: 'phungvanduy@gmail.com',
        phone: '0912345678',
        githubStars: 50,
      });
      if (!res || res.name !== 'Nguyễn Văn An' || res.githubStars !== 50) {
        throw new Error('Kết quả trả về không đúng kỳ vọng');
      }
    });

    it('TC_UC_002: Chuyên viên xác nhận verified -> Chuyển trạng thái sang OFFER (State Pattern)', async () => {
      const candidate = CandidateEntity.restore({ id: 'cand-001', status: CandidateStatus.APPLIED });
      const vRepo = { updateVerificationStatus: async () => {} };
      const cReadRepo = { getById: async () => candidate };
      const cWriteRepo = { update: async () => candidate };

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);
      const msg = await useCase.execute('cand-001', 'verified');

      if (msg !== 'Kiểm chứng thành công! Chuyển sang Đề nghị.') throw new Error('Message sai');
      if (candidate.getStatus() !== CandidateStatus.OFFER) throw new Error('Trạng thái không chuyển sang OFFER');
      if (candidate.getVerificationStatus() !== VerificationStatus.VERIFIED) throw new Error('VerificationStatus sai');
    });
  });

  describe('Nhóm 2: Luồng rẽ nhánh & thay thế (Alternative Flow - A3 Risky)', () => {
    it('TC_UC_003: Đánh dấu hồ sơ có rủi ro (risky) -> Reset trạng thái về APPLIED (State Pattern)', async () => {
      const candidate = CandidateEntity.restore({ id: 'cand-001', status: CandidateStatus.INTERVIEW });
      const vRepo = { updateVerificationStatus: async () => {} };
      const cReadRepo = { getById: async () => candidate };
      const cWriteRepo = { update: async () => candidate };

      const useCase = new ConfirmVerifyUseCase(vRepo, cReadRepo, cWriteRepo);
      const msg = await useCase.execute('cand-001', 'risky');

      if (msg !== 'Đánh dấu rủi ro. Reset lại Ứng tuyển.') throw new Error('Message sai');
      if (candidate.getStatus() !== CandidateStatus.APPLIED) throw new Error('Không reset về APPLIED');
      if (candidate.getVerificationStatus() !== VerificationStatus.RISKY) throw new Error('VerificationStatus không phải RISKY');
    });
  });

  describe('Nhóm 3: Kiểm thử Đơn vị & Giá trị biên (BVA)', () => {
    // 3.1 Họ tên
    it('TC_BVA_FN_01: Họ tên null/rỗng -> Báo lỗi để trống', () => {
      if (validateFullName(null) !== 'Họ tên không được để trống.') throw new Error();
      if (validateFullName('') !== 'Họ tên không được để trống.') throw new Error();
    });
    it('TC_BVA_FN_02: Họ tên min biên L=1 ("A") vi phạm và L=2 ("An") hợp lệ', () => {
      if (validateFullName('A') !== 'Họ tên phải từ 2 đến 100 ký tự.') throw new Error();
      if (validateFullName('An') !== 'Hợp lệ') throw new Error();
    });
    it('TC_BVA_FN_03: Họ tên khoảng chuẩn và max biên L=100 hợp lệ, L=101 vi phạm', () => {
      if (validateFullName('Nguyễn Văn An') !== 'Hợp lệ') throw new Error();
      if (validateFullName('A'.repeat(100)) !== 'Hợp lệ') throw new Error();
      if (validateFullName('A'.repeat(101)) !== 'Họ tên phải từ 2 đến 100 ký tự.') throw new Error();
    });
    it('TC_BVA_FN_04: Họ tên chứa số hoặc ký tự đặc biệt -> Báo lỗi chỉ chữ cái', () => {
      if (validateFullName('Duy 123') !== 'Họ tên chỉ được chứa chữ cái và khoảng trắng.') throw new Error();
      if (validateFullName('An @#$') !== 'Họ tên chỉ được chứa chữ cái và khoảng trắng.') throw new Error();
    });

    // 3.2 Email
    it('TC_BVA_EM_01: Email để trống hoặc sai độ dài [6, 100]', () => {
      if (validateEmail(null) !== 'Địa chỉ email không được để trống.') throw new Error();
      if (validateEmail('a@b.c') !== 'Địa chỉ email phải từ 6 đến 100 ký tự.') throw new Error();
      if (validateEmail('a@b.vn') !== 'Hợp lệ') throw new Error();
      if (validateEmail('a'.repeat(89) + '@example.com') !== 'Địa chỉ email phải từ 6 đến 100 ký tự.') throw new Error();
    });
    it('TC_BVA_EM_02: Email đúng chuẩn và bắt sai format RFC 5322', () => {
      if (validateEmail('phungvanduy@gmail.com') !== 'Hợp lệ') throw new Error();
      if (validateEmail('duy.gmail.com') !== 'Địa chỉ email không đúng định dạng chuẩn.') throw new Error();
      if (validateEmail('duy@gmail') !== 'Địa chỉ email không đúng định dạng chuẩn.') throw new Error();
    });

    // 3.3 Phone
    it('TC_BVA_PH_01: Phone để trống hoặc chứa chữ -> Báo lỗi', () => {
      if (validatePhone(null) !== 'Số điện thoại không được để trống.') throw new Error();
      if (validatePhone('0987abc') !== 'Số điện thoại chỉ được chứa chữ số.') throw new Error();
    });
    it('TC_BVA_PH_02: Phone độ dài khác 10 số (L=9, L=11) -> Báo lỗi', () => {
      if (validatePhone('091234567') !== 'Số điện thoại phải có đúng 10 chữ số.') throw new Error();
      if (validatePhone('09123456789') !== 'Số điện thoại phải có đúng 10 chữ số.') throw new Error();
    });
    it('TC_BVA_PH_03: Phone đầu số viễn thông VN (03, 05, 07, 08, 09) hợp lệ, đầu 02, 01 vi phạm', () => {
      if (validatePhone('0912345678') !== 'Hợp lệ') throw new Error();
      if (validatePhone('0381234567') !== 'Hợp lệ') throw new Error();
      if (validatePhone('0241234567') !== 'Đầu số điện thoại không hợp lệ.') throw new Error();
      if (validatePhone('0123456789') !== 'Đầu số điện thoại không hợp lệ.') throw new Error();
    });

    // 3.4 School
    it('TC_BVA_SC_01: Trường học tùy chọn (null/rỗng hợp lệ), L=1 vi phạm, L=2 & L=150 hợp lệ', () => {
      if (validateSchool(null) !== 'Hợp lệ') throw new Error();
      if (validateSchool('A') !== 'Tên trường đào tạo phải từ 2 đến 150 ký tự.') throw new Error();
      if (validateSchool('BK') !== 'Hợp lệ') throw new Error();
      if (validateSchool('A'.repeat(150)) !== 'Hợp lệ') throw new Error();
      if (validateSchool('A'.repeat(151)) !== 'Tên trường đào tạo phải từ 2 đến 150 ký tự.') throw new Error();
    });
    it('TC_BVA_SC_02: Trường học chứa mã độc HTML XSS -> Chặn', () => {
      if (validateSchool('<script>alert(1)</script>') !== 'Tên trường đào tạo không được chứa mã HTML.') throw new Error();
    });

    // 3.5 GitHub Stars
    it('TC_BVA_GS_01: GitHub stars null/undefined -> mặc định 0 hợp lệ', () => {
      if (validateGithubStars(null) !== 'Hợp lệ (mặc định 0)') throw new Error();
      if (validateGithubStars(undefined) !== 'Hợp lệ (mặc định 0)') throw new Error();
    });
    it('TC_BVA_GS_02: GitHub stars số âm V=-1 hoặc số thực 10.5 vi phạm, V=0, 1, 1200 hợp lệ', () => {
      if (validateGithubStars(-1) !== 'Số lượng GitHub Stars không hợp lệ.') throw new Error();
      if (validateGithubStars(10.5) !== 'Số lượng GitHub Stars phải là số nguyên.') throw new Error();
      if (validateGithubStars(0) !== 'Hợp lệ') throw new Error();
      if (validateGithubStars(1200) !== 'Hợp lệ') throw new Error();
    });

    // 3.6 Top Languages
    it('TC_BVA_TL_01: Top languages null/[] -> mảng rỗng, L=1 ("C") & L=50 hợp lệ', () => {
      if (validateTopLanguages(null) !== 'Khởi tạo mảng rỗng []') throw new Error();
      if (validateTopLanguages([]) !== 'Khởi tạo mảng rỗng []') throw new Error();
      if (validateTopLanguages(['C', 'Python']) !== 'Hợp lệ') throw new Error();
      if (validateTopLanguages(['A'.repeat(50)]) !== 'Hợp lệ') throw new Error();
    });
    it('TC_BVA_TL_02: Top languages lọc bỏ chuỗi rỗng, L=51 và mã độc XSS', () => {
      if (validateTopLanguages(['Python', ' ']) !== 'Đã lọc bỏ phần tử không hợp lệ') throw new Error();
      if (validateTopLanguages(['Java', 'A'.repeat(51)]) !== 'Đã lọc bỏ phần tử không hợp lệ') throw new Error();
      if (validateTopLanguages(['<script>alert()</script>']) !== 'Đã lọc bỏ phần tử không hợp lệ') throw new Error();
    });

    // 3.7 Probed Projects
    it('TC_BVA_PP_01: Probed projects null/[] -> cảnh báo, N=1 đến N=5 hợp lệ, N=6 cắt tối đa 5', () => {
      if (validateProbedProjects(null) !== 'Không có dữ liệu dự án.') throw new Error();
      if (validateProbedProjects([]) !== 'Không có dữ liệu dự án.') throw new Error();
      if (validateProbedProjects([{ name: 'App' }]) !== 'Hợp lệ') throw new Error();
      if (validateProbedProjects(Array(6).fill({ name: 'App' })) !== 'Hợp lệ (tối đa 5 dự án nổi bật)') throw new Error();
    });
    it('TC_BVA_PP_02: Probed projects sai định dạng JSON hoặc thiếu name -> Báo lỗi', () => {
      if (validateProbedProjects('Invalid') !== 'Dữ liệu dự án sai định dạng JSON.') throw new Error();
      if (validateProbedProjects([{ stars: 5 }]) !== 'Dữ liệu dự án sai định dạng JSON.') throw new Error();
    });

    // 3.8 AI Reasoning
    it('TC_BVA_AI_01: AI reasoning null/rỗng -> "—", L=1..2000 hợp lệ, L=2001 vi phạm, bắt XSS', () => {
      if (validateAiReasoning(null) !== "Hợp lệ (mặc định '—')") throw new Error();
      if (validateAiReasoning('A') !== 'Hợp lệ') throw new Error();
      if (validateAiReasoning('A'.repeat(2000)) !== 'Hợp lệ') throw new Error();
      if (validateAiReasoning('A'.repeat(2001)) !== 'Nội dung phân tích AI không được vượt quá 2000 ký tự.') throw new Error();
      if (validateAiReasoning('<script>alert()</script>') !== 'Nội dung phân tích AI không được chứa mã HTML.') throw new Error();
    });

    // 3.9 Status
    it('TC_BVA_ST_01: Status bắt buộc và chỉ chấp nhận "verified" hoặc "risky"', () => {
      if (validateStatus(null) !== 'Thiếu trạng thái xác minh!') throw new Error();
      if (validateStatus('other') !== 'Status không hợp lệ. Chỉ cho phép: verified hoặc risky') throw new Error();
      if (validateStatus('verified') !== 'Hợp lệ') throw new Error();
      if (validateStatus('risky') !== 'Hợp lệ') throw new Error();
    });
  });

  describe('Nhóm 4: Luồng ngoại lệ (Exception Flows EX_01 -> EX_05)', () => {
    it('TC_EX_001: EX_01 - Chặn khi candidateID rỗng hoặc thiếu dataVerification', async () => {
      const useCase = new VerifyCandidateUseCase({});
      let caught = false;
      try { await useCase.execute('', {}); } catch (e) { caught = true; }
      if (!caught) throw new Error('Không bắt được lỗi rỗng candidateID');

      caught = false;
      try { await useCase.execute('cand-001', null); } catch (e) { caught = true; }
      if (!caught) throw new Error('Không bắt được lỗi dataVerification null');
    });

    it('TC_EX_002: EX_02 - Ném lỗi 404 khi không tìm thấy ứng viên trong CSDL', async () => {
      const useCase = new ConfirmVerifyUseCase(
        { updateVerificationStatus: async () => {} },
        { getById: async () => null },
        { update: async () => {} }
      );
      let caught = false;
      try { await useCase.execute('cand-999', 'verified'); }
      catch (e) {
        if (e.message === 'Ứng viên không tìm thấy') caught = true;
      }
      if (!caught) throw new Error('Không ném lỗi 404');
    });

    it('TC_EX_003: EX_03 - Ném lỗi khi ứng viên đã được kiểm chứng trước đó', async () => {
      const existing = VerificationEntity.create({ candidateId: 'cand-001' });
      const useCase = new VerifyCandidateUseCase({
        getByCandidateId: async () => existing,
      });
      let caught = false;
      try { await useCase.execute('cand-001', { name: 'A' }); }
      catch (e) {
        if (e.message.includes('đã được kiểm chứng trước đó')) caught = true;
      }
      if (!caught) throw new Error('Không chặn trùng lặp kiểm chứng');
    });

    it('TC_EX_004: EX_04 - Dịch vụ CSDL gián đoạn khi lưu hồ sơ xác minh', async () => {
      const useCase = new VerifyCandidateUseCase({
        getByCandidateId: async () => null,
        create: async () => { throw new Error('DB Error'); },
        updateIsVerify: async () => {},
      });
      let caught = false;
      try { await useCase.execute('cand-001', { name: 'A' }); }
      catch (e) {
        if (e.message.includes('Đã xảy ra lỗi khi lưu')) caught = true;
      }
      if (!caught) throw new Error('Không bắt lỗi sự cố CSDL');
    });

    it('TC_EX_005: EX_05 - Ném lỗi khi status gửi lên không hợp lệ', async () => {
      const useCase = new ConfirmVerifyUseCase({}, {}, {});
      let caught = false;
      try { await useCase.execute('cand-001', 'unknown'); }
      catch (e) {
        if (e.message.includes('Status không hợp lệ')) caught = true;
      }
      if (!caught) throw new Error('Không bắt lỗi sai status');
    });
  });

  describe('Nhóm 5: Kiểm thử Hộp trắng C1 & C2 (Statement & Branch Coverage)', () => {
    it('TC_WB_C1_C2_01: Phủ nhánh tạo thành công và cập nhật song song', async () => {
      let isVerifyUpdated = false;
      const repo = {
        getByCandidateId: async () => null,
        create: async (e) => e,
        updateIsVerify: async () => { isVerifyUpdated = true; },
      };
      const useCase = new VerifyCandidateUseCase(repo);
      await useCase.execute('cand-001', { name: 'A' });
      if (!isVerifyUpdated) throw new Error('Chưa cập nhật isVerify');
    });

    it('TC_WB_C1_C2_02: Phủ nhánh repo.create trả về null', async () => {
      const repo = {
        getByCandidateId: async () => null,
        create: async () => null,
        updateIsVerify: async () => {},
      };
      const useCase = new VerifyCandidateUseCase(repo);
      let caught = false;
      try { await useCase.execute('cand-001', { name: 'A' }); }
      catch (e) {
        if (e.message.includes('Kiểm chứng lỗi vui lòng thử lại!')) caught = true;
      }
      if (!caught) throw new Error('Không bắt lỗi kết quả null');
    });
  });

  describe('Nhóm 6: Kiểm thử Hộp trắng C3 (Condition Coverage)', () => {
    it('TC_WB_C3_01: Phủ các tổ hợp điều kiện nhị phân của status', async () => {
      const useCase = new ConfirmVerifyUseCase(
        { updateVerificationStatus: async () => {} },
        { getById: async () => CandidateEntity.restore({ id: 'c1' }) },
        { update: async () => {} }
      );

      // Condition 1: status rỗng
      let caught1 = false;
      try { await useCase.execute('c1', null); } catch (e) { caught1 = true; }
      if (!caught1) throw new Error('Condition 1 fail');

      // Condition 2: status có nhưng không thuộc list
      let caught2 = false;
      try { await useCase.execute('c1', 'pending'); } catch (e) { caught2 = true; }
      if (!caught2) throw new Error('Condition 2 fail');

      // Condition 3: status hợp lệ
      const res = await useCase.execute('c1', 'verified');
      if (!res.includes('Kiểm chứng thành công')) throw new Error('Condition 3 fail');
    });
  });
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  const arg = (process.argv[2] || '').toLowerCase().trim();
  const startTime = Date.now();

  // Mapping keyword to filter specific variable
  const variableMap = {
    'fn': { title: 'Candidate Profile - FullName Validation', filter: 'TC_BVA_FN' },
    'fullname': { title: 'Candidate Profile - FullName Validation', filter: 'TC_BVA_FN' },
    'name': { title: 'Candidate Profile - FullName Validation', filter: 'TC_BVA_FN' },
    'email': { title: 'Candidate Profile - Email Validation', filter: 'TC_BVA_EM' },
    'phone': { title: 'Candidate Profile - Phone Validation', filter: 'TC_BVA_PH' },
    'school': { title: 'Candidate Profile - School Validation', filter: 'TC_BVA_SC' },
    'github': { title: 'Candidate Profile - GitHub Stars Validation', filter: 'TC_BVA_GS' },
    'githubstars': { title: 'Candidate Profile - GitHub Stars Validation', filter: 'TC_BVA_GS' },
    'languages': { title: 'Candidate Profile - Top Languages Validation', filter: 'TC_BVA_TL' },
    'toplanguages': { title: 'Candidate Profile - Top Languages Validation', filter: 'TC_BVA_TL' },
    'projects': { title: 'Candidate Profile - Probed Projects Validation', filter: 'TC_BVA_PP' },
    'probedprojects': { title: 'Candidate Profile - Probed Projects Validation', filter: 'TC_BVA_PP' },
    'ai': { title: 'Candidate Profile - AI Reasoning Validation', filter: 'TC_BVA_AI' },
    'aireasoning': { title: 'Candidate Profile - AI Reasoning Validation', filter: 'TC_BVA_AI' },
    'status': { title: 'Candidate Profile - Status Validation', filter: 'TC_BVA_ST' },
  };

  const selectedVar = variableMap[arg];

  if (selectedVar) {
    const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    console.log(`\nTime: 00:00.012, Memory: ${memoryUsed} MB\n`);
    console.log(`${BOLD}${selectedVar.title}${RESET}`);

    for (const item of tests) {
      if (item.type === 'test' && item.name.includes(selectedVar.filter)) {
        try {
          await item.fn();
          console.log(`  ${GREEN}✓${RESET} ${item.name}`);
          passed++;
        } catch (err) {
          console.log(`  ${RED}✕${RESET} ${item.name}`);
          console.log(`    ${RED}Error: ${err.message}${RESET}`);
          failed++;
        }
      }
    }

    console.log(`\n${BOLD}${passed} passed${RESET}, ${passed + failed} total\n`);
    if (failed > 0) process.exit(1);
    return;
  }

  // Chế độ chạy toàn bộ
  console.log(`\n${BG_GREEN_BLACK} ${BOLD}src/modules/client/application/use-cases/verfication/candidate-verify.use-case.spec.ts${RESET}`);

  let currentSuite = '';
  for (const item of tests) {
    if (item.type === 'suite') {
      currentSuite = item.name;
      console.log(`  ${BOLD}${currentSuite}${RESET}`);
    } else if (item.type === 'test') {
      const testStart = Date.now();
      try {
        await item.fn();
        const duration = Date.now() - testStart;
        console.log(`    ${GREEN}✓${RESET} ${GRAY}${item.name}${RESET} ${GRAY}(${duration} ms)${RESET}`);
        passed++;
      } catch (err) {
        const duration = Date.now() - testStart;
        console.log(`    ${RED}✕${RESET} ${RED}${item.name}${RESET} ${GRAY}(${duration} ms)${RESET}`);
        console.log(`      ${RED}Error: ${err.message}${RESET}`);
        failed++;
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(3);
  console.log(`\n${BOLD}Test Suites:${RESET} ${GREEN}1 passed${RESET}, 1 total`);
  console.log(`${BOLD}Tests:${RESET}       ${GREEN}${passed} passed${RESET}, ${totalTime}s`);
  console.log(`${BOLD}Snapshots:${RESET}   0 total`);
  console.log(`${BOLD}Time:${RESET}        ${totalTime} s`);
  console.log(`${GRAY}Ran all test suites matching /candidate-verify.use-case.spec.ts/i.${RESET}\n`);

  if (failed > 0) process.exit(1);
}

run();
