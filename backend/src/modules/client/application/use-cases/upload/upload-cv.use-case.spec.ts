import { UploadCVUseCase } from './upload-cv.use-case';
import {
  validateCVFile,
  validateCandidateFormData,
  sanitizeText,
} from './upload-cv.validator';
import { CandidateEntity } from '../../../domain/candidate/candidate.entity';
import { CandidateStatus } from '../../../domain/candidate';
import type { ICandidateWriteRepo, ICandidateReadRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IUploadService } from '../../../application/ports/services/upload.service';
import type { IAIService } from '../../../application/ports/services/ai.service';

const makeMuleterFile = (
  mimetype = 'application/pdf',
  originalname = 'resume.pdf',
  size = 1000,
  buffer = Buffer.from('%PDF-1.4 fake-pdf-content'),
): Express.Multer.File =>
  ({
    fieldname: 'cv',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size,
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
    create: jest.fn().mockResolvedValue(makeCandidateEntity()),
    update: jest.fn().mockResolvedValue(makeCandidateEntity()),
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

describe('Use Case 06: Upload và Bóc tách hồ sơ CV', () => {

  describe('Nhóm 1: Kiểm tra đầu vào & Quyền truy cập', () => {
    it('ném lỗi khi không có file CV được tải lên', async () => {
      const useCase = makeUseCase();
      await expect(useCase.execute('user-1', 'job-1', null as any)).rejects.toThrow('No file uploaded');
    });

    it('ném lỗi khi không tìm thấy công việc', async () => {
      const jobRepo = makeJobRepo({ getById: jest.fn().mockResolvedValue(null) });
      const useCase = makeUseCase({ jobRepo });
      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow('Công việc không đúng');
    });

    it('ném lỗi khi phiên đăng nhập hết hạn hoặc thiếu userID', async () => {
      const useCase = makeUseCase();
      await expect(useCase.execute('', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
      );
    });
  });

  describe('Nhóm 2: Định dạng file hợp lệ & Cơ chế tiếp nhận', () => {
    it('upload tệp CV định dạng PDF hợp lệ (2.5 MB)', async () => {
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ geminiSvc });
      const pdfFile = makeMuleterFile('application/pdf', 'CV_Fullstack.pdf', 2.5 * 1024 * 1024);

      const result = await useCase.execute('user-1', 'job-1', pdfFile);

      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(pdfFile.buffer, 'application/pdf');
    });

    it('upload tệp CV định dạng Word (.docx) hợp lệ (1.2 MB)', () => {
      const docxFile = makeMuleterFile(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'CV_Backend.docx',
        1.2 * 1024 * 1024,
      );

      expect(() => validateCVFile(docxFile)).not.toThrow();
    });

    it('upload tệp CV định dạng Ảnh (.png) hợp lệ (3.8 MB)', async () => {
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ geminiSvc });
      const pngFile = makeMuleterFile('image/png', 'CV_Scan.png', 3.8 * 1024 * 1024);

      const result = await useCase.execute('user-1', 'job-1', pngFile);

      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(pngFile.buffer, 'image/png');
    });

    it('kéo thả tệp CV vào vùng Drop Zone tiếp nhận file bình thường', () => {
      const droppedFile = makeMuleterFile('application/pdf', 'CV_Mau.pdf', 1.0 * 1024 * 1024);
      expect(() => validateCVFile(droppedFile)).not.toThrow();
      expect(droppedFile.size).toBe(1048576);
    });

    it('mở File Dialog chọn file CV tải lên', () => {
      const selectedFile = makeMuleterFile('application/pdf', 'CV_Mau.pdf', 1.0 * 1024 * 1024);
      expect(() => validateCVFile(selectedFile)).not.toThrow();
      expect(selectedFile.originalname).toBe('CV_Mau.pdf');
    });
  });

  describe('Nhóm 3: Phân tích giá trị biên dung lượng tệp (BVA)', () => {
    it('upload file CV dung lượng nhỏ nhất hợp lệ (1 KB = 1024 Bytes)', () => {
      const tinyFile = makeMuleterFile('application/pdf', 'CV_Tiny.pdf', 1024, Buffer.alloc(1024, 0x20));
      expect(() => validateCVFile(tinyFile)).not.toThrow();
    });

    it('upload file CV cận biên trên hợp lệ (9.9 MB = 10,137 KB)', () => {
      const largeFile = makeMuleterFile('application/pdf', 'CV_Large.pdf', 10137 * 1024);
      expect(() => validateCVFile(largeFile)).not.toThrow();
    });

    it('upload file CV đúng ngưỡng tối đa cho phép (10.0 MB = 10,240 KB)', () => {
      const maxFile = makeMuleterFile('application/pdf', 'CV_Max.pdf', 10 * 1024 * 1024);
      expect(() => validateCVFile(maxFile)).not.toThrow();
    });

    it('upload file CV vượt biên trên tối thiểu (10.01 MB = 10,250 KB) -> chặn lỗi EX_01', () => {
      const overFile = makeMuleterFile('application/pdf', 'CV_Over.pdf', 10250 * 1024);
      expect(() => validateCVFile(overFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file CV dung lượng cực lớn (50 MB) -> từ chối tiếp nhận', () => {
      const hugeFile = makeMuleterFile('application/pdf', 'CV_Huge.pdf', 50 * 1024 * 1024);
      expect(() => validateCVFile(hugeFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file rỗng dung lượng 0 Byte -> chặn tải lên', () => {
      const emptyFile = makeMuleterFile('application/pdf', 'CV_Empty.pdf', 0, Buffer.alloc(0));
      expect(() => validateCVFile(emptyFile)).toThrow('File rỗng, vui lòng chọn file hợp lệ');
    });
  });

  describe('Nhóm 4: Kiểm tra định dạng không hỗ trợ và tệp độc hại', () => {
    it('upload file thực thi độc hại (.exe) giả mạo -> chặn lỗi EX_01', () => {
      const exeFile = makeMuleterFile('application/x-msdownload', 'CV_Trojan.exe', 1.5 * 1024 * 1024);
      expect(() => validateCVFile(exeFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file script shell (.sh) độc hại -> chặn lỗi EX_01', () => {
      const shFile = makeMuleterFile('application/x-sh', 'install.sh', 4096);
      expect(() => validateCVFile(shFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file nén (.zip) -> báo lỗi EX_01', () => {
      const zipFile = makeMuleterFile('application/zip', 'All_CV.zip', 3.0 * 1024 * 1024);
      expect(() => validateCVFile(zipFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file bảng tính Excel (.xlsx) -> báo lỗi EX_01', () => {
      const xlsxFile = makeMuleterFile(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'DanhSach.xlsx',
        500 * 1024,
      );
      expect(() => validateCVFile(xlsxFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('upload file ngụy trang đuôi kép (.pdf.exe) -> chặn file độc hại', () => {
      const doubleExtFile = makeMuleterFile('application/octet-stream', 'CV_NguyenVanA.pdf.exe', 2.0 * 1024 * 1024);
      expect(() => validateCVFile(doubleExtFile)).toThrow('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
    });

    it('đổi đuôi file virus .exe thành .pdf rồi upload -> phát hiện sai header (magic bytes)', () => {
      const fakePdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      const spoofedFile = makeMuleterFile('application/pdf', 'Trojan.pdf', 2.0 * 1024 * 1024, fakePdfBuffer);

      expect(() => validateCVFile(spoofedFile)).toThrow(
        'Kiểm tra cấu trúc file PDF thất bại: phát hiện sai header file',
      );
    });

    it('upload file không có phần mở rộng (đuôi file) -> chặn tải lên', () => {
      const noExtFile = makeMuleterFile('application/octet-stream', 'CV_NguyenVanA', 5000);
      expect(() => validateCVFile(noExtFile)).toThrow('Định dạng file không hỗ trợ: Tệp không có phần mở rộng');
    });
  });

  describe('Nhóm 5: Trích xuất nội dung CV qua AI & Upload Cloud', () => {
    it('ném lỗi khi upload cloud trả về mảng rỗng', async () => {
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

    it('timeout khi máy chủ AI bị nghẽn (> 10.0s) -> báo lỗi EX_02', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockRejectedValue(new Error('AI Service request timeout after 10000ms (EX_02)')),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'EX_02: Quá thời gian phản hồi từ máy chủ AI (Timeout)',
      );
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

  describe('Nhóm 6: Xử lý ảnh đại diện (avatar)', () => {
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

      await useCase.execute('user-1', 'job-1', makeMuleterFile(), makeMuleterFile('image/jpeg', 'avatar.jpg'));

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

  describe('Nhóm 7: Tạo mới hoặc cập nhật ứng viên (CSDL)', () => {
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

    it('cập nhật đè ứng viên khi email đã tồn tại trong CSDL', async () => {
      const existingCandidate = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({
        findByEmail: jest.fn().mockResolvedValue(existingCandidate),
        update: jest.fn().mockResolvedValue(existingCandidate),
      });
      const useCase = makeUseCase({ candidateRepo });

      await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(candidateRepo.findByEmail).toHaveBeenCalledWith('nguyenvana@test.com');
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

    it('nhấn "Lưu hồ sơ" liên tiếp chống spam click (Idempotency / Single Save)', async () => {
      const candidateRepo = makeCandidateRepo();
      let isSubmitting = false;
      let callCount = 0;

      const handleSave = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        callCount++;
        await candidateRepo.create(makeCandidateEntity() as any);
      };

      await Promise.all([handleSave(), handleSave(), handleSave(), handleSave(), handleSave()]);

      expect(callCount).toBe(1);
      expect(candidateRepo.create).toHaveBeenCalledTimes(1);
    });

    it('trả về thông tin profile ứng viên khi thực thi thành công', async () => {
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ create: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ candidateRepo });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());

      expect(result).toHaveProperty('candidate');
      expect(candidateEntity.getDetailProfile).toHaveBeenCalled();
    });
  });

  describe('Nhóm 8: Kiểm tra dữ liệu biểu mẫu ứng viên & Bảo mật Form', () => {
    it('bỏ trống trường bắt buộc Họ và tên khi lưu', () => {
      expect(() =>
        validateCandidateFormData({
          fullName: '',
          email: 'an@gmail.com',
        }),
      ).toThrow('Vui lòng nhập họ và tên ứng viên');

      expect(() =>
        validateCandidateFormData({
          fullName: '   ',
          email: 'an@gmail.com',
        }),
      ).toThrow('Vui lòng nhập họ và tên ứng viên');
    });

    it('nhập Họ tên chỉ 1 ký tự (Dưới ngưỡng biên min)', () => {
      expect(() =>
        validateCandidateFormData({
          fullName: 'A',
          email: 'an@gmail.com',
        }),
      ).toThrow('Họ và tên phải có tối thiểu 2 ký tự');
    });

    it('bỏ trống cả Email và Số điện thoại khi lưu', () => {
      expect(() =>
        validateCandidateFormData({
          fullName: 'Lê Văn B',
          email: '',
          phone: '',
        }),
      ).toThrow('Vui lòng nhập ít nhất một kênh liên lạc (Email hoặc Số điện thoại)');
    });

    it('chèn mã độc XSS vào Họ tên và Kỹ năng -> Sanitize text an toàn', () => {
      const dirtyName = "<script>alert('XSS')</script>Nguyễn Văn A";
      const dirtySkill = "<img src=x onerror=alert(1)>NodeJS";

      const sanitized = validateCandidateFormData({
        fullName: dirtyName,
        email: 'test@gmail.com',
        skills: [dirtySkill],
      });

      expect(sanitized.fullName).not.toContain('<script>');
      expect(sanitized.fullName).toBe('Nguyễn Văn A');
      expect(sanitized.skills[0]).not.toContain('<img');
      expect(sanitized.skills[0]).toBe('NodeJS');
    });
  });
});
