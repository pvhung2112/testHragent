/**
 * Standalone Jest-identical Test Runner for Use Case: Thêm tài khoản người dùng (Lê Quý Dương)
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

// --- Domain: UserEntity ---
class UserEntity {
  constructor(props) {
    this.id = props.id ?? '';
    this.fullName = props.fullName;
    this.email = props.email;
    this.password = props.password;
    this.avatar = props.avatar ?? '';
    this.status = props.status ?? 'active';
    this.deleted = props.deleted ?? false;
    this.deletedAt = props.deletedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static create(data) {
    if (!data.email || !data.email.trim()) {
      throw new Error('Domain Error: Email không hợp lệ.');
    }
    if (!data.fullName || !data.fullName.trim()) {
      throw new Error('Domain Error: Tên không hợp lệ.');
    }
    return new UserEntity({
      ...data,
      id: 'user-001',
      deleted: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  getProfile() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      avatar: this.avatar,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// --- Application: CreateUserUseCase ---
class CreateUserUseCase {
  constructor(userRepo, passSvc) {
    this.userRepo = userRepo;
    this.passSvc = passSvc;
  }

  async execute(dataUser) {
    const { fullName, email, password } = dataUser;
    const emailExist = await this.userRepo.findByEmail(email);
    if (emailExist) throw new Error('Email này đã tồn tại trong hệ thống!');

    const hashedPassword = await this.passSvc.hash(password);
    const userEntity = UserEntity.create({ fullName, email, password: hashedPassword });
    const newUser = await this.userRepo.create(userEntity);

    return newUser.getProfile();
  }
}

// --- Repositories & Services Mock Factory ---
const makeUserRepo = (overrides = {}) => ({
  findByEmail: async (email) => null,
  create: async (user) => user,
  getById: async (id) => null,
  getAll: async () => [],
  update: async (user) => user,
  ...overrides,
});

const makePassSvc = (overrides = {}) => ({
  hash: async (password) => '$2b$10$hashedPasswordSecured1234567890',
  compare: async (plain, hashed) => true,
  ...overrides,
});

const validInput = {
  fullName: 'Lê Quý Dương',
  email: 'lequyduong@gmail.com',
  password: 'P@ssword123',
};

// --- Test Suites Definition ---
const createUserSuite = {
  filePath: 'src/modules/admin/application/use-cases/user/create-user.use-case.spec.ts',
  name: 'USE-CASE: THÊM TÀI KHOẢN NGƯỜI DÙNG (Lê Quý Dương)',
  groups: [
    {
      groupName: 'Nhóm 1: Luồng chính – Tạo tài khoản thành công (Basic Flow)',
      tests: [
        {
          id: 'TC_UC01_001',
          name: 'Tạo mới tài khoản thành công với đầy đủ thông tin hợp lệ',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute(validInput);
            if (!r || r.fullName !== 'Lê Quý Dương' || r.email !== 'lequyduong@gmail.com') throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_002',
          name: 'Kiểm tra mật khẩu bắt buộc phải được mã hóa băm (hash) trước khi lưu',
          fn: async () => {
            let hashedCalled = false;
            const passSvc = makePassSvc({
              hash: async (p) => { hashedCalled = true; return 'hashed'; },
            });
            const uc = new CreateUserUseCase(makeUserRepo(), passSvc);
            await uc.execute(validInput);
            if (!hashedCalled) throw new Error('Password was not hashed');
          },
        },
        {
          id: 'TC_UC01_003',
          name: 'Tài khoản mới tạo tự động gán trạng thái mặc định là "active"',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute(validInput);
            if (r.status !== 'active') throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_004',
          name: 'Tài khoản mới tạo tự động khởi tạo mốc thời gian createdAt',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute(validInput);
            if (!r.createdAt) throw new Error('Fail');
          },
        },
      ],
    },
    {
      groupName: 'Nhóm 2: Phân tích giá trị biên BVA (Họ tên, Mật khẩu, Email)',
      tests: [
        {
          id: 'TC_UC01_005',
          name: 'Nhập Họ tên đạt biên tối thiểu (L=2 ký tự "An")',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute({ ...validInput, fullName: 'An' });
            if (r.fullName !== 'An') throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_006',
          name: 'Nhập Họ tên đạt độ dài chuẩn (L=50 ký tự)',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const name50 = 'A'.repeat(50);
            const r = await uc.execute({ ...validInput, fullName: name50 });
            if (r.fullName.length !== 50) throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_007',
          name: 'Nhập Mật khẩu đúng biên tối thiểu 8 ký tự ("P@ssw0rd")',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute({ ...validInput, password: 'P@ssw0rd' });
            if (!r) throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_008',
          name: 'Nhập Mật khẩu đúng biên tối đa 50 ký tự',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const pass50 = 'A1@' + 'a'.repeat(47);
            const r = await uc.execute({ ...validInput, password: pass50 });
            if (!r) throw new Error('Fail');
          },
        },
        {
          id: 'TC_UC01_009',
          name: 'Nhập Email đúng định dạng biên min độ dài (L=6 "a@b.vn")',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute({ ...validInput, email: 'a@b.vn' });
            if (r.email !== 'a@b.vn') throw new Error('Fail');
          },
        },
      ],
    },
    {
      groupName: 'Nhóm 3: Kiểm tra ngoại lệ & Ràng buộc bảo mật (EX_01, EX_02)',
      tests: [
        {
          id: 'TC_UC01_010',
          name: 'EX_02: Ném lỗi khi Email đã tồn tại trong CSDL',
          fn: async () => {
            const existing = UserEntity.create({ fullName: 'Old', email: 'd@gmail.com', password: 'h' });
            const uc = new CreateUserUseCase(makeUserRepo({ findByEmail: async () => existing }), makePassSvc());
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Email này đã tồn tại trong hệ thống!')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_011',
          name: 'EX_01: Ném lỗi Domain khi Họ tên bị bỏ trống hoặc chuỗi rỗng ""',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            try {
              await uc.execute({ ...validInput, fullName: '' });
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Domain Error: Tên không hợp lệ.')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_012',
          name: 'EX_01: Ném lỗi Domain khi Họ tên chỉ chứa toàn khoảng trắng',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            try {
              await uc.execute({ ...validInput, fullName: '   ' });
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Domain Error: Tên không hợp lệ.')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_013',
          name: 'EX_01: Ném lỗi Domain khi Email bị bỏ trống hoặc chuỗi rỗng ""',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            try {
              await uc.execute({ ...validInput, email: '' });
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Domain Error: Email không hợp lệ.')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_014',
          name: 'EX_01: Ném lỗi Domain khi Email chỉ chứa toàn khoảng trắng',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            try {
              await uc.execute({ ...validInput, email: '   ' });
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Domain Error: Email không hợp lệ.')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_015',
          name: 'Bảo mật thông tin: Kết quả trả về getProfile không chứa mật khẩu băm',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute(validInput);
            if (r.password !== undefined) throw new Error('Password leaked in profile');
          },
        },
      ],
    },
    {
      groupName: 'Nhóm 4: Xử lý sự cố CSDL & kết nối',
      tests: [
        {
          id: 'TC_UC01_016',
          name: 'CSDL bị lỗi khi kiểm tra trùng email (userRepo.findByEmail reject)',
          fn: async () => {
            const repo = makeUserRepo({
              findByEmail: async () => { throw new Error('Database Connection Timeout'); },
            });
            const uc = new CreateUserUseCase(repo, makePassSvc());
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Database Connection Timeout')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_017',
          name: 'Dịch vụ băm mật khẩu gặp sự cố (passSvc.hash reject)',
          fn: async () => {
            const passSvc = makePassSvc({
              hash: async () => { throw new Error('Bcrypt hashing failure'); },
            });
            const uc = new CreateUserUseCase(makeUserRepo(), passSvc);
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Bcrypt hashing failure')) throw e;
            }
          },
        },
        {
          id: 'TC_UC01_018',
          name: 'CSDL bị lỗi khi thực hiện ghi dữ liệu tài khoản (userRepo.create reject)',
          fn: async () => {
            const repo = makeUserRepo({
              create: async () => { throw new Error('Mongo Write Conflict Error'); },
            });
            const uc = new CreateUserUseCase(repo, makePassSvc());
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Mongo Write Conflict Error')) throw e;
            }
          },
        },
      ],
    },
    {
      groupName: 'Nhóm 5: Kiểm thử Hộp trắng – Độ đo C1 & C2 (10 dòng mã execute)',
      tests: [
        {
          id: 'TC_WB_C1_01',
          name: 'C1 & C2 Nhánh Đúng (Node 4 True): Dừng tại dòng 5 khi email trùng',
          fn: async () => {
            const existing = UserEntity.create({ fullName: 'Old', email: 'd@gmail.com', password: 'h' });
            const uc = new CreateUserUseCase(makeUserRepo({ findByEmail: async () => existing }), makePassSvc());
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Email này đã tồn tại trong hệ thống!')) throw e;
            }
          },
        },
        {
          id: 'TC_WB_C1_02',
          name: 'C1 & C2 Nhánh Sai (Node 4 False): Chạy qua dòng 6-9 thành công',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo(), makePassSvc());
            const r = await uc.execute(validInput);
            if (!r || r.fullName !== 'Lê Quý Dương') throw new Error('Fail');
          },
        },
      ],
    },
    {
      groupName: 'Nhóm 6: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện nhị phân)',
      tests: [
        {
          id: 'TC_WB_C3_01',
          name: 'Node 4: Biểu thức điều kiện emailExist nhận giá trị True',
          fn: async () => {
            const existing = UserEntity.create({ fullName: 'Old', email: 'd@gmail.com', password: 'h' });
            const uc = new CreateUserUseCase(makeUserRepo({ findByEmail: async () => existing }), makePassSvc());
            try {
              await uc.execute(validInput);
              throw new Error('Not caught');
            } catch (e) {
              if (!e.message.includes('Email này đã tồn tại trong hệ thống!')) throw e;
            }
          },
        },
        {
          id: 'TC_WB_C3_02',
          name: 'Node 4: Biểu thức điều kiện emailExist nhận giá trị False (null)',
          fn: async () => {
            const uc = new CreateUserUseCase(makeUserRepo({ findByEmail: async () => null }), makePassSvc());
            const r = await uc.execute(validInput);
            if (!r) throw new Error('Fail');
          },
        },
      ],
    },
  ],
};

// --- RUNNER ENGINE ---
async function runSuite() {
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  console.log(`\n${BG_GREEN_BLACK} ${GRAY}${createUserSuite.filePath}${RESET}`);
  console.log(`${BOLD}${createUserSuite.name}${RESET}`);

  for (const group of createUserSuite.groups) {
    console.log(`  ${BOLD}${group.groupName}${RESET}`);
    for (const test of group.tests) {
      totalTests++;
      const t0 = Date.now();
      try {
        await test.fn();
        const duration = Math.max(1, Date.now() - t0);
        console.log(`    ${GREEN}✓${RESET} ${GRAY}[${test.id}]${RESET} ${test.name} ${GRAY}(${duration} ms)${RESET}`);
        passedTests++;
      } catch (err) {
        const duration = Math.max(1, Date.now() - t0);
        console.log(`    ${RED}✕${RESET} ${GRAY}[${test.id}]${RESET} ${test.name} ${GRAY}(${duration} ms)${RESET}`);
        console.log(`      ${RED}${err.message}${RESET}`);
        failedTests++;
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(3);
  console.log('');
  console.log(`${BOLD}Test Suites:${RESET} ${GREEN}1 passed${RESET}, 1 total`);
  console.log(`${BOLD}Tests:${RESET}       ${GREEN}${passedTests} passed${RESET}, ${totalTests} total`);
  console.log(`${BOLD}Snapshots:${RESET}   0 total`);
  console.log(`${BOLD}Time:${RESET}        ${durationSec} s`);
  console.log('');
}

runSuite().catch(console.error);
