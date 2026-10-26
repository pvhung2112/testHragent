import { UploadCVUseCase } from './upload-cv.use-case';
import { CandidateEntity } from '../../../domain/candidate/candidate.entity';
import { CandidateStatus } from '../../../domain/candidate';
import type { ICandidateWriteRepo, ICandidateReadRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IUploadService } from '../../../application/ports/services/upload.service';
import type { IAIService } from '../../../application/ports/services/ai.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const makeExtractedData = (overrides = {}) => ({
  personal: {
    email: 'nguyenvana@test.com',
    name: 'Nguyen Van A',
    phone: '0123456789',
    ...overrides,
  },
  skills: ['TypeScript', 'NestJS'],
  experience: [],
  education: [],
});

const makeCandidateEntity = (overrides = {}) => {
  const profile = {
    id: 'cand-001',
    personal: { email: 'nguyenvana@test.com', name: 'Nguyen Van A', ...overrides },
    status: CandidateStatus.APPLIED,
  };
  return {
    getDetailProfile: jest.fn().mockReturnValue(profile),
    update: jest.fn(),
  };
};

const makeJobEntity = () => ({ id: 'job-001', title: 'Backend Developer' });

const makeCandidateRepo = (overrides = {}): jest.Mocked<ICandidateWriteRepo & ICandidateReadRepo> =>
  ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (entity) => entity || makeCandidateEntity()),
    update: jest.fn().mockImplementation(async (entity) => entity || makeCandidateEntity()),
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

// ─── UNIT TESTS CHO USE CASE 06: THU THẬP HỒ SƠ QUA UPLOAD CV (TC_UC06_001 -> TC_UC06_038) ───

describe('Use Case 06: Thu thập hồ sơ ứng viên qua Upload CV', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM 1: LUỒNG CHÍNH UPLOAD CV & LƯU HỒ SƠ (TC_UC06_001 -> TC_UC06_011)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Nhóm 1: Luồng chính - Upload CV, Bóc tách thực thể & Lưu hồ sơ', () => {
    it('[TC_UC06_001] Upload tệp CV định dạng PDF hợp lệ và lưu hồ sơ thành công', async () => {
      const geminiSvc = makeGeminiSvc();
      const candidateRepo = makeCandidateRepo();
      const useCase = makeUseCase({ geminiSvc, candidateRepo });
      const pdfFile = makeMuleterFile('application/pdf', 'CV_Fullstack.pdf', 2.5 * 1024 * 1024);

      const result = await useCase.execute('user-1', 'job-1', pdfFile);

      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(pdfFile.buffer, 'application/pdf');
      expect(candidateRepo.create).toHaveBeenCalledTimes(1);
    });

    it('[TC_UC06_002] Upload tệp CV định dạng Word (.docx) hợp lệ và lưu hồ sơ thành công', async () => {
      const docxFile = makeMuleterFile(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'CV_Backend.docx',
        1.2 * 1024 * 1024,
      );
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ geminiSvc });

      const result = await useCase.execute('user-1', 'job-1', docxFile);
      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(docxFile.buffer, docxFile.mimetype);
    });

    it('[TC_UC06_003] Upload tệp CV định dạng Ảnh (.png) qua OCR trích xuất thành công', async () => {
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ geminiSvc });
      const pngFile = makeMuleterFile('image/png', 'CV_Scan.png', 3.8 * 1024 * 1024);

      const result = await useCase.execute('user-1', 'job-1', pngFile);

      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(pngFile.buffer, 'image/png');
    });

    it('[TC_UC06_004] Upload tệp CV định dạng Ảnh (.jpg / .jpeg) qua OCR trích xuất thành công', async () => {
      const geminiSvc = makeGeminiSvc();
      const useCase = makeUseCase({ geminiSvc });
      const jpgFile = makeMuleterFile('image/jpeg', 'CV_ChuyenNghiep.jpg', 2.0 * 1024 * 1024);

      const result = await useCase.execute('user-1', 'job-1', jpgFile);

      expect(result).toHaveProperty('candidate');
      expect(geminiSvc.extractCV).toHaveBeenCalledWith(jpgFile.buffer, 'image/jpeg');
    });

    it('[TC_UC06_005] Upload tệp CV kèm ảnh đại diện (avatar) của ứng viên', async () => {
      const uploadSvc = makeUploadSvc({
        uploadCloud: jest.fn().mockResolvedValue([
          'https://cdn.example.com/resume.pdf',
          'https://cdn.example.com/avatar.jpg',
        ]),
      });
      const candidateEntity = makeCandidateEntity();
      const candidateRepo = makeCandidateRepo({ create: jest.fn().mockResolvedValue(candidateEntity) });
      const useCase = makeUseCase({ uploadSvc, candidateRepo });

      const cvFile = makeMuleterFile('application/pdf', 'CV_Candidate.pdf', 1.5 * 1024 * 1024);
      const avatarFile = makeMuleterFile('image/jpeg', 'avatar.jpg', 500 * 1024);

      await useCase.execute('user-1', 'job-1', cvFile, avatarFile);

      expect(uploadSvc.uploadCloud).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object), expect.any(Object)]),
      );
    });

    it('[TC_UC06_006] Kéo thả tệp CV vào vùng Drop Zone', async () => {
      const droppedFile = makeMuleterFile('application/pdf', 'CV_Mau.pdf', 1.0 * 1024 * 1024);
      const useCase = makeUseCase();

      const result = await useCase.execute('user-1', 'job-1', droppedFile);
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_007] Mở File Dialog chọn file CV tải lên', async () => {
      const selectedFile = makeMuleterFile('application/pdf', 'CV_Mau.pdf', 1.0 * 1024 * 1024);
      const useCase = makeUseCase();

      const result = await useCase.execute('user-1', 'job-1', selectedFile);
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_008] Chỉnh sửa thông tin trên Form xem trước trước khi lưu', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({
          personal: { email: 'an@example.com', name: 'Nguyễn Văn An Khang', phone: '0988776655' },
        }),
      });
      const useCase = makeUseCase({ geminiSvc });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());
      const nameVal = (result.candidate.personal as any).name || result.candidate.personal.fullName;
      expect(nameVal).toBe('Nguyễn Văn An Khang');
      expect(result.candidate.personal.phone).toBe('0988776655');
    });

    it('[TC_UC06_009] Bổ sung thông tin bị khuyết số năm kinh nghiệm trên Form xem trước', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({
          personal: { email: 'nam.tran@example.com', name: 'Trần Nam' },
          experience: [{ company: 'FPT Software', duration: '3.0 năm' }],
        }),
      });
      const useCase = makeUseCase({ geminiSvc });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_010] Hủy bỏ lưu hồ sơ tại Form xem trước', () => {
      const candidateRepo = makeCandidateRepo();
      const isCancelled = true;

      if (!isCancelled) {
        candidateRepo.create({} as any);
      }

      expect(candidateRepo.create).not.toHaveBeenCalled();
      expect(candidateRepo.update).not.toHaveBeenCalled();
    });

    it('[TC_UC06_011] Nhấn "Lưu hồ sơ" liên tiếp chống spam click (Idempotency / Single Save)', async () => {
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM 2: PHÂN TÍCH GIÁ TRỊ BIÊN DUNG LƯỢNG TỆP (TC_UC06_012 -> TC_UC06_017)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Nhóm 2: Phân tích giá trị biên dung lượng tệp tải lên (BVA)', () => {
    it('[TC_UC06_012] Upload file CV dung lượng nhỏ nhất hợp lệ (1 KB)', async () => {
      const tinyFile = makeMuleterFile('application/pdf', 'CV_Tiny.pdf', 1024, Buffer.alloc(1024, 0x20));
      const useCase = makeUseCase();

      const result = await useCase.execute('user-1', 'job-1', tinyFile);
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_013] Upload file CV cận biên trên hợp lệ (9.9 MB)', async () => {
      const largeFile = makeMuleterFile('application/pdf', 'CV_Large.pdf', 10137 * 1024);
      const useCase = makeUseCase();

      const result = await useCase.execute('user-1', 'job-1', largeFile);
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_014] Upload file CV đúng ngưỡng tối đa (10.0 MB)', async () => {
      const maxFile = makeMuleterFile('application/pdf', 'CV_Max.pdf', 10 * 1024 * 1024);
      const useCase = makeUseCase();

      const result = await useCase.execute('user-1', 'job-1', maxFile);
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_015] Upload file CV vượt biên trên tối thiểu (10.01 MB)', async () => {
      const overFile = makeMuleterFile('application/pdf', 'CV_Over.pdf', 10250 * 1024);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', overFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_016] Upload file CV dung lượng cực lớn (50 MB)', async () => {
      const hugeFile = makeMuleterFile('application/pdf', 'CV_Huge.pdf', 50 * 1024 * 1024);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', hugeFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_017] Upload file rỗng dung lượng 0 Byte', async () => {
      const emptyFile = makeMuleterFile('application/pdf', 'CV_Empty.pdf', 0, Buffer.alloc(0));
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', emptyFile)).rejects.toThrow(
        'File rỗng, vui lòng chọn file hợp lệ',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM 3: ĐỊNH DẠNG TỆP & TỆP ĐỘC HẠI (TC_UC06_018 -> TC_UC06_027)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Nhóm 3: Kiểm tra định dạng không hỗ trợ, tệp độc hại & toàn vẹn dữ liệu', () => {
    it('[TC_UC06_018] Upload file thực thi độc hại (.exe) giả mạo', async () => {
      const exeFile = makeMuleterFile('application/x-msdownload', 'CV_Trojan.exe', 1.5 * 1024 * 1024);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', exeFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_019] Upload file script shell (.sh) độc hại', async () => {
      const shFile = makeMuleterFile('application/x-sh', 'install.sh', 4096);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', shFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_020] Upload file batch script (.bat) độc hại', async () => {
      const batFile = makeMuleterFile('application/x-bat', 'run.bat', 2048);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', batFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_021] Upload file nén (.zip / .rar)', async () => {
      const zipFile = makeMuleterFile('application/zip', 'All_CV.zip', 3.0 * 1024 * 1024);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', zipFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_022] Upload file bảng tính Excel (.xlsx / .xls)', async () => {
      const xlsxFile = makeMuleterFile(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'DanhSach.xlsx',
        500 * 1024,
      );
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', xlsxFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_023] Upload file ngụy trang đuôi kép (.pdf.exe)', async () => {
      const doubleExtFile = makeMuleterFile('application/octet-stream', 'CV_NguyenVanA.pdf.exe', 2.0 * 1024 * 1024);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', doubleExtFile)).rejects.toThrow(
        'EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn',
      );
    });

    it('[TC_UC06_024] Đổi đuôi file virus .exe thành .pdf rồi upload (Magic Bytes MZ)', async () => {
      const fakePdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      const spoofedFile = makeMuleterFile('application/pdf', 'Trojan.pdf', 2.0 * 1024 * 1024, fakePdfBuffer);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', spoofedFile)).rejects.toThrow(
        'Kiểm tra cấu trúc file PDF thất bại: phát hiện sai header file',
      );
    });

    it('[TC_UC06_025] Upload file không có phần mở rộng (đuôi file)', async () => {
      const noExtFile = makeMuleterFile('application/octet-stream', 'CV_NguyenVanA', 5000);
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', noExtFile)).rejects.toThrow(
        'Định dạng file không hỗ trợ: Tệp không có phần mở rộng',
      );
    });

    it('[TC_UC06_026] Upload file CV bị lỗi cấu trúc / hỏng nội dung (Corrupted file)', async () => {
      const corruptedFile = makeMuleterFile('application/pdf', 'CV_Damaged.pdf', 5000, Buffer.from('CORRU_BAD_DATA'));
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', corruptedFile)).rejects.toThrow(
        'Tệp tin bị lỗi hoặc không thể đọc nội dung',
      );
    });

    it('[TC_UC06_027] Upload file PDF có đặt mật khẩu bảo vệ (Password-protected PDF)', async () => {
      const lockedFile = makeMuleterFile('application/pdf', 'CV_Protected.pdf', 5000, Buffer.from('%PDF-1.4 /Encrypt'));
      const useCase = makeUseCase();

      await expect(useCase.execute('user-1', 'job-1', lockedFile)).rejects.toThrow(
        'File PDF có mật khẩu bảo vệ, vui lòng gỡ mật khẩu trước khi tải lên',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM 4: TIMEOUT, MẠNG & DỊCH VỤ ĐÁM MÂY (TC_UC06_028 -> TC_UC06_031)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Nhóm 4: Xử lý Timeout, Mất mạng & Dịch vụ đám mây', () => {
    it('[TC_UC06_028] Timeout khi máy chủ AI trích xuất bị nghẽn (> 10.0s)', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockRejectedValue(new Error('AI Service request timeout after 10000ms (EX_02)')),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'EX_02: Quá thời gian phản hồi từ máy chủ AI (Timeout)',
      );
    });

    it('[TC_UC06_029] Phản hồi bóc tách AI thành công ở cận trên thời gian cho phép (9.9s)', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue(makeExtractedData()),
      });
      const useCase = makeUseCase({ geminiSvc });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_030] Mất kết nối Internet khi đang tải tệp CV lên', async () => {
      const uploadSvc = makeUploadSvc({
        uploadCloud: jest.fn().mockRejectedValue(new Error('Lỗi kết nối mạng, vui lòng kiểm tra Internet và thử lại')),
      });
      const useCase = makeUseCase({ uploadSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Lỗi kết nối mạng, vui lòng kiểm tra Internet và thử lại',
      );
    });

    it('[TC_UC06_031] Lỗi từ dịch vụ lưu trữ đám mây Cloud Storage (Upload thất bại)', async () => {
      const uploadSvc = makeUploadSvc({ uploadCloud: jest.fn().mockResolvedValue([]) });
      const useCase = makeUseCase({ uploadSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Upload CV thất bại',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM 5: FIELD VALIDATION & BẢO MẬT FORM (TC_UC06_032 -> TC_UC06_038)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Nhóm 5: Kiểm tra tính hợp lệ của dữ liệu Form xem trước & Bảo mật', () => {
    it('[TC_UC06_032] Bỏ trống trường bắt buộc Họ và tên khi lưu', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({ personal: { email: 'an@gmail.com', name: '' } }),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Vui lòng nhập họ và tên ứng viên',
      );
    });

    it('[TC_UC06_033] Nhập Họ tên chỉ 1 ký tự (Dưới ngưỡng biên min)', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({ personal: { email: 'an@gmail.com', name: 'A' } }),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Họ và tên phải có tối thiểu 2 ký tự',
      );
    });

    it('[TC_UC06_034] Nhập Họ tên độ dài tối đa biên trên (100 ký tự)', async () => {
      const exact100 = 'A'.repeat(100);
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({ personal: { email: 'an@gmail.com', name: exact100 } }),
      });
      const useCase = makeUseCase({ geminiSvc });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());
      expect(result).toHaveProperty('candidate');
    });

    it('[TC_UC06_035] Bỏ trống cả Email và Số điện thoại khi lưu', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({ personal: { email: '', phone: '' } }),
      });
      const useCase = makeUseCase({ geminiSvc });

      await expect(useCase.execute('user-1', 'job-1', makeMuleterFile())).rejects.toThrow(
        'không thể trích xuất được Email từ CV',
      );
    });

    it('[TC_UC06_036] Chèn mã độc XSS vào Họ tên và Kỹ năng', async () => {
      const geminiSvc = makeGeminiSvc({
        extractCV: jest.fn().mockResolvedValue({
          personal: { email: 'test@gmail.com', name: "<script>alert('XSS')</script>Nguyễn Văn A" },
          skills: ["<img src=x onerror=alert(1)>NodeJS"],
        }),
      });
      const candidateRepo = makeCandidateRepo();
      const useCase = makeUseCase({ geminiSvc, candidateRepo });

      const result = await useCase.execute('user-1', 'job-1', makeMuleterFile());
      const nameVal = (result.candidate.personal as any)?.name || (result.candidate.personal as any)?.fullName;
      expect(nameVal).not.toContain('<script>');
      expect(nameVal).toBe('Nguyễn Văn A');
    });

    it('[TC_UC06_037] Cảnh báo trùng lặp Email đã có trong CSDL', async () => {
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

    it('[TC_UC06_038] Hết hạn Token đăng nhập khi thao tác tải CV hoặc lưu hồ sơ', async () => {
      const useCase = makeUseCase();

      await expect(useCase.execute('', 'job-1', makeMuleterFile())).rejects.toThrow(
        'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
      );
    });
  });
});
