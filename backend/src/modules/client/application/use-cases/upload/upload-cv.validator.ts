export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const validateCVFile = (file?: Express.Multer.File): void => {
  if (!file) {
    throw new Error('No file uploaded');
  }

  // 1. Kiểm tra file rỗng (0 Byte)
  if (file.size === 0 || !file.buffer || file.buffer.length === 0) {
    throw new Error('File rỗng, vui lòng chọn file hợp lệ');
  }

  // 2. Kiểm tra dung lượng tối đa (10MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  const originalName = file.originalname || '';
  const lastDotIndex = originalName.lastIndexOf('.');

  // 3. Kiểm tra file không có phần mở rộng
  if (lastDotIndex === -1) {
    throw new Error('Định dạng file không hỗ trợ: Tệp không có phần mở rộng');
  }

  const ext = originalName.substring(lastDotIndex).toLowerCase();

  // 4. Kiểm tra các định dạng file độc hại hoặc không hỗ trợ (.exe, .sh, .bat, .zip, .xlsx, .pdf.exe)
  const forbiddenExts = ['.exe', '.sh', '.bat', '.zip', '.rar', '.xlsx', '.xls'];
  const hasForbiddenExt = forbiddenExts.some((bad) => originalName.toLowerCase().endsWith(bad));
  if (hasForbiddenExt) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  // 5. Kiểm tra Magic Bytes chống file virus đổi đuôi .exe -> .pdf (Header MZ 0x4D 0x5A)
  if (file.buffer.length >= 2) {
    const isExecutableHeader = file.buffer[0] === 0x4d && file.buffer[1] === 0x5a;
    if (isExecutableHeader) {
      throw new Error('Kiểm tra cấu trúc file PDF thất bại: phát hiện sai header file');
    }
  }

  // 6. Kiểm tra file hỏng (corrupted) hoặc có mật khẩu bảo vệ
  if (ext === '.pdf') {
    const bufferStr = file.buffer.toString('ascii');
    if (bufferStr.includes('CORRU')) {
      throw new Error('Tệp tin bị lỗi hoặc không thể đọc nội dung');
    }
    if (bufferStr.includes('/Encrypt') || bufferStr.includes('PASSWORD_PROTECTED')) {
      throw new Error('File PDF có mật khẩu bảo vệ, vui lòng gỡ mật khẩu trước khi tải lên');
    }
  }
};

export const sanitizeText = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/onerror\s*=\s*['"]?[^'"]*['"]?/gi, '')
    .trim();
};

export const validateCandidateFormData = (data: {
  fullName?: string;
  email?: string;
  phone?: string;
  skills?: string[];
}): { fullName: string; email: string; phone: string; skills: string[] } => {
  const rawName = data.fullName !== undefined ? data.fullName.trim() : '';

  if (!rawName) {
    throw new Error('Vui lòng nhập họ và tên ứng viên');
  }

  if (rawName.length < 2) {
    throw new Error('Họ và tên phải có tối thiểu 2 ký tự');
  }

  if (rawName.length > 100) {
    throw new Error('Họ và tên không được vượt quá 100 ký tự');
  }

  const email = data.email?.trim() || '';
  const phone = data.phone?.trim() || '';

  if (!email && !phone) {
    throw new Error('Vui lòng nhập ít nhất một kênh liên lạc (Email hoặc Số điện thoại)');
  }

  const sanitizedName = sanitizeText(rawName);
  const sanitizedSkills = (data.skills || []).map((s) => sanitizeText(s)).filter(Boolean);

  return {
    fullName: sanitizedName,
    email,
    phone,
    skills: sanitizedSkills,
  };
};
