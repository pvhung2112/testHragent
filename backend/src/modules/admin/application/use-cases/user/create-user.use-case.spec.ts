import { CreateUserUseCase, ICreateUserInput } from './create-user.use-case';
import { UserEntity } from '../../../domain/entities/user.entity';
import type { IReadUserRepository, IWriteUserRepository } from '../../ports/user.interface';
import type { IPasswordService } from '../../../../client/application/ports/services/password.service';

/**
 * ============================================================================
 * KIỂM THỬ ĐƠN VỊ USE-CASE: THÊM TÀI KHOẢN NGƯỜI DÙNG (Lê Quý Dương)
 * Bao gồm cả kiểm thử giá trị biên/hợp lệ các biến (fullName, email, password)
 * và kiểm thử toàn diện luồng nghiệp vụ của Use Case (Hộp đen + Hộp trắng)
 * ============================================================================
 */

// --- FACTORY MOCK REPOSITORY & SERVICE ---
const makeUserRepo = (overrides = {}): jest.Mocked<IReadUserRepository & IWriteUserRepository> =>
  ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (user: UserEntity) => user),
    getById: jest.fn().mockResolvedValue(null),
    getAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation(async (user: UserEntity) => user),
    ...overrides,
  } as any);

const makePassSvc = (overrides = {}): jest.Mocked<IPasswordService> =>
  ({
    hash: jest.fn().mockResolvedValue('$2b$10$hashedPasswordSecured1234567890'),
    compare: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as any);

const validInput: ICreateUserInput = {
  fullName: 'Lê Quý Dương',
  email: 'lequyduong@gmail.com',
  password: 'P@ssword123',
};

describe('USE-CASE: THÊM TÀI KHOẢN NGƯỜI DÙNG (Lê Quý Dương)', () => {

  // =========================================================================
  // NHÓM 1: Luồng chính – Thêm tài khoản thành công (Basic Flow)
  // =========================================================================
  describe('Nhóm 1: Luồng chính – Tạo tài khoản thành công', () => {
    it('TC_UC01_001: Tạo mới tài khoản thành công với đầy đủ thông tin hợp lệ', async () => {
      const userRepo = makeUserRepo();
      const passSvc = makePassSvc();
      const useCase = new CreateUserUseCase(userRepo, passSvc);

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.fullName).toBe('Lê Quý Dương');
      expect(result.email).toBe('lequyduong@gmail.com');
      expect(result.status).toBe('active');
      expect(userRepo.findByEmail).toHaveBeenCalledWith('lequyduong@gmail.com');
      expect(passSvc.hash).toHaveBeenCalledWith('P@ssword123');
      expect(userRepo.create).toHaveBeenCalledTimes(1);
    });

    it('TC_UC01_002: Kiểm tra mật khẩu bắt buộc phải được mã hóa băm (hash) trước khi lưu', async () => {
      const userRepo = makeUserRepo();
      const passSvc = makePassSvc();
      const useCase = new CreateUserUseCase(userRepo, passSvc);

      await useCase.execute(validInput);

      expect(passSvc.hash).toHaveBeenCalledTimes(1);
      expect(passSvc.hash).toHaveBeenCalledWith(validInput.password);
    });

    it('TC_UC01_003: Tài khoản mới tạo tự động gán trạng thái mặc định là "active"', async () => {
      const userRepo = makeUserRepo();
      const passSvc = makePassSvc();
      const useCase = new CreateUserUseCase(userRepo, passSvc);

      const result = await useCase.execute(validInput);

      expect(result.status).toBe('active');
    });

    it('TC_UC01_004: Tài khoản mới tạo tự động khởi tạo mốc thời gian createdAt', async () => {
      const userRepo = makeUserRepo();
      const passSvc = makePassSvc();
      const useCase = new CreateUserUseCase(userRepo, passSvc);

      const result = await useCase.execute(validInput);

      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // NHÓM 2: Phân tích giá trị biên BVA cho các biến (Họ tên & Mật khẩu)
  // =========================================================================
  describe('Nhóm 2: Phân tích giá trị biên (BVA)', () => {
    it('TC_UC01_005: Nhập Họ tên đạt biên tối thiểu (L=2 ký tự "An")', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const res = await useCase.execute({ ...validInput, fullName: 'An' });
      expect(res.fullName).toBe('An');
    });

    it('TC_UC01_006: Nhập Họ tên đạt độ dài chuẩn (L=50 ký tự)', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const name50 = 'A'.repeat(50);
      const res = await useCase.execute({ ...validInput, fullName: name50 });
      expect(res.fullName.length).toBe(50);
    });

    it('TC_UC01_007: Nhập Mật khẩu đúng biên tối thiểu 8 ký tự ("P@ssw0rd")', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const res = await useCase.execute({ ...validInput, password: 'P@ssw0rd' });
      expect(res).toBeDefined();
    });

    it('TC_UC01_008: Nhập Mật khẩu đúng biên tối đa 50 ký tự', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const pass50 = 'A1@' + 'a'.repeat(47);
      const res = await useCase.execute({ ...validInput, password: pass50 });
      expect(res).toBeDefined();
    });

    it('TC_UC01_009: Nhập Email đúng định dạng biên min độ dài (L=6 "a@b.vn")', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const res = await useCase.execute({ ...validInput, email: 'a@b.vn' });
      expect(res.email).toBe('a@b.vn');
    });
  });

  // =========================================================================
  // NHÓM 3: Kiểm tra tính hợp lệ dữ liệu, ngoại lệ & bảo mật (EX_01, EX_02)
  // =========================================================================
  describe('Nhóm 3: Kiểm tra ngoại lệ & Ràng buộc bảo mật', () => {
    it('TC_UC01_010 (EX_02): Ném lỗi khi Email đã tồn tại trong CSDL', async () => {
      const existingUser = UserEntity.create({
        fullName: 'Người cũ',
        email: 'lequyduong@gmail.com',
        password: 'hashed_password',
      });
      const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(existingUser) });
      const passSvc = makePassSvc();
      const useCase = new CreateUserUseCase(userRepo, passSvc);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Email này đã tồn tại trong hệ thống!'
      );
      expect(passSvc.hash).not.toHaveBeenCalled();
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('TC_UC01_011 (EX_01): Ném lỗi Domain khi Họ tên bị bỏ trống hoặc chuỗi rỗng ""', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      await expect(useCase.execute({ ...validInput, fullName: '' })).rejects.toThrow(
        'Domain Error: Tên không hợp lệ.'
      );
    });

    it('TC_UC01_012 (EX_01): Ném lỗi Domain khi Họ tên chỉ chứa toàn khoảng trắng', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      await expect(useCase.execute({ ...validInput, fullName: '   ' })).rejects.toThrow(
        'Domain Error: Tên không hợp lệ.'
      );
    });

    it('TC_UC01_013 (EX_01): Ném lỗi Domain khi Email bị bỏ trống hoặc chuỗi rỗng ""', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      await expect(useCase.execute({ ...validInput, email: '' })).rejects.toThrow(
        'Domain Error: Email không hợp lệ.'
      );
    });

    it('TC_UC01_014 (EX_01): Ném lỗi Domain khi Email chỉ chứa toàn khoảng trắng', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      await expect(useCase.execute({ ...validInput, email: '   ' })).rejects.toThrow(
        'Domain Error: Email không hợp lệ.'
      );
    });

    it('TC_UC01_015: Bảo mật thông tin – Kết quả trả về getProfile không chứa mật khẩu băm', async () => {
      const useCase = new CreateUserUseCase(makeUserRepo(), makePassSvc());
      const res = await useCase.execute(validInput);
      expect((res as any).password).toBeUndefined();
    });
  });

  // =========================================================================
  // NHÓM 4: Xử lý sự cố mạng & lỗi kết nối CSDL
  // =========================================================================
  describe('Nhóm 4: Xử lý sự cố CSDL & kết nối', () => {
    it('TC_UC01_016: CSDL bị lỗi khi kiểm tra trùng email (userRepo.findByEmail reject)', async () => {
      const userRepo = makeUserRepo({
        findByEmail: jest.fn().mockRejectedValue(new Error('Database Connection Timeout')),
      });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      await expect(useCase.execute(validInput)).rejects.toThrow('Database Connection Timeout');
    });

    it('TC_UC01_017: Dịch vụ băm mật khẩu gặp sự cố (passSvc.hash reject)', async () => {
      const passSvc = makePassSvc({
        hash: jest.fn().mockRejectedValue(new Error('Bcrypt hashing failure')),
      });
      const useCase = new CreateUserUseCase(makeUserRepo(), passSvc);

      await expect(useCase.execute(validInput)).rejects.toThrow('Bcrypt hashing failure');
    });

    it('TC_UC01_018: CSDL bị lỗi khi thực hiện ghi dữ liệu tài khoản (userRepo.create reject)', async () => {
      const userRepo = makeUserRepo({
        create: jest.fn().mockRejectedValue(new Error('Mongo Write Conflict Error')),
      });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      await expect(useCase.execute(validInput)).rejects.toThrow('Mongo Write Conflict Error');
    });
  });

  // =========================================================================
  // NHÓM 5: Kiểm thử Hộp trắng – Độ đo C1 & C2 (10 dòng mã execute)
  // =========================================================================
  describe('Nhóm 5: Kiểm thử Hộp trắng C1 & C2 (10 dòng mã execute)', () => {
    it('TC_WB_01: C1 & C2 Nhánh Đúng (Node 4 True) -> Dừng tại dòng 5 khi email trùng', async () => {
      const existingUser = UserEntity.create({
        fullName: 'Trùng Email',
        email: 'lequyduong@gmail.com',
        password: 'hash',
      });
      const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(existingUser) });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Email này đã tồn tại trong hệ thống!'
      );
    });

    it('TC_WB_02: C1 & C2 Nhánh Sai (Node 4 False) -> Chạy qua dòng 6-9 thành công', async () => {
      const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(null) });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      const res = await useCase.execute(validInput);
      expect(res).toBeDefined();
      expect(res.fullName).toBe('Lê Quý Dương');
    });
  });

  // =========================================================================
  // NHÓM 6: Kiểm thử Hộp trắng – Độ đo C3 (Phủ điều kiện nhị phân)
  // =========================================================================
  describe('Nhóm 6: Kiểm thử Hộp trắng C3 (Condition Coverage)', () => {
    it('TC_WB_C3_01: Node 4 Biểu thức điều kiện emailExist nhận giá trị True', async () => {
      const existingUser = UserEntity.create({ fullName: 'Old', email: 'd@gmail.com', password: 'h' });
      const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(existingUser) });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      await expect(useCase.execute(validInput)).rejects.toThrow('Email này đã tồn tại trong hệ thống!');
    });

    it('TC_WB_C3_02: Node 4 Biểu thức điều kiện emailExist nhận giá trị False (null)', async () => {
      const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(null) });
      const useCase = new CreateUserUseCase(userRepo, makePassSvc());

      const res = await useCase.execute(validInput);
      expect(res).toBeDefined();
    });
  });
});
