export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
];

export const validateCVFile = (file?: Express.Multer.File): void => {
  if (!file) {
    throw new Error('No file uploaded');
  }

  if (!file.size || file.size === 0 || !file.buffer || file.buffer.length === 0) {
    throw new Error('File rỗng, vui lòng chọn file hợp lệ');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  const originalName = file.originalname || '';
  const lastDotIndex = originalName.lastIndexOf('.');

  if (lastDotIndex === -1) {
    throw new Error('Định dạng file không hỗ trợ: Tệp không có phần mở rộng');
  }

  const ext = originalName.substring(lastDotIndex).toLowerCase();

  const forbiddenExts = ['.exe', '.sh', '.bat', '.zip', '.rar', '.xlsx', '.xls'];
  const hasForbiddenExt = forbiddenExts.some((bad) => originalName.toLowerCase().endsWith(bad));
  if (hasForbiddenExt) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('EX_01: Định dạng file không hỗ trợ hoặc dung lượng quá lớn');
  }

  if (file.buffer.length >= 2) {
    const isExecutableHeader = file.buffer[0] === 0x4d && file.buffer[1] === 0x5a;
    if (isExecutableHeader) {
      throw new Error('Kiểm tra cấu trúc file PDF thất bại: phát hiện sai header file');
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
  const rawName = data.fullName?.trim() || '';

  if (!rawName) {
    throw new Error('Vui lòng nhập họ và tên ứng viên');
  }

  if (rawName.length < 2) {
    throw new Error('Họ và tên phải có tối thiểu 2 ký tự');
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
