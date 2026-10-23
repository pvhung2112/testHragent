export interface ICandidateFilterItem {
  id: string;
  name: string;
  skills: string[];
  experienceYears: number;
  status: string;
  avatar?: string;
  cvUrl?: string;
  jobTitle?: string;
}

export interface IFilterCriteria {
  skill?: string;
  experience?: string;
  status?: string;
}

export const sanitizeFilterText = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/onerror\s*=\s*['"]?[^'"]*['"]?/gi, '')
    .trim();
};

export const sanitizeSqlParam = (input: string): string => {
  if (!input) return '';
  return input.replace(/['";\\]/g, '').replace(/--/g, '').trim();
};

export const validateSkillKeyword = (skill: string): string => {
  if (!skill) return '';
  const trimmed = skill.trim();

  if (trimmed.length > 100) {
    throw new Error('Từ khóa kỹ năng vượt quá độ dài tối đa cho phép (tối đa 100 ký tự)');
  }

  return trimmed;
};

export const filterCandidatesList = (
  candidates: ICandidateFilterItem[],
  criteria: IFilterCriteria,
): ICandidateFilterItem[] => {
  let result = [...candidates];

  if (criteria.skill) {
    const validatedSkill = validateSkillKeyword(criteria.skill);
    const sanitizedSkill = sanitizeFilterText(validatedSkill).toLowerCase();

    result = result.filter((cand) =>
      cand.skills.some((s) => s.toLowerCase().includes(sanitizedSkill)),
    );
  }

  if (criteria.experience) {
    const exp = criteria.experience.trim();
    if (exp === '< 1 năm') {
      result = result.filter((cand) => cand.experienceYears >= 0 && cand.experienceYears < 1.0);
    } else if (exp === '> 5 năm') {
      result = result.filter((cand) => cand.experienceYears >= 5.1);
    } else if (exp === '3-5 năm') {
      result = result.filter((cand) => cand.experienceYears >= 3.0 && cand.experienceYears <= 5.0);
    } else if (exp === '>= 2 năm' || exp === '> 2 năm') {
      result = result.filter((cand) => cand.experienceYears >= 2.0);
    }
  }

  if (criteria.status) {
    const targetStatus = criteria.status.trim();
    result = result.filter((cand) => cand.status === targetStatus);
  }

  return result;
};

export interface IPaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const paginateCandidatesList = <T>(
  items: T[],
  pageInput: any,
  pageSize = 10,
): IPaginationResult<T> => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let page = Number.parseInt(String(pageInput), 10);
  if (Number.isNaN(page) || page < 1) {
    page = 1;
  } else if (page > totalPages) {
    page = totalPages;
  }

  const startIndex = (page - 1) * pageSize;
  const data = items.slice(startIndex, startIndex + pageSize);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
};

export const validateStatusTransition = (
  currentStatus: string,
  newStatus: string,
  reason?: string,
): { status: string; reason?: string } => {
  if (currentStatus === 'Trúng tuyển' && newStatus === 'Mới') {
    throw new Error('Không thể chuyển ngược trạng thái từ Trúng tuyển về Mới');
  }

  if (newStatus === 'Từ chối' && (!reason || !reason.trim())) {
    throw new Error('Vui lòng nhập lý do từ chối hồ sơ');
  }

  return {
    status: newStatus,
    reason: reason?.trim(),
  };
};

export const validateExportPdf = (hasAnalysisResult: boolean, isOnline = true): void => {
  if (!isOnline) {
    throw new Error('Không thể kết nối máy chủ để kết xuất PDF, vui lòng kiểm tra mạng');
  }
  if (!hasAnalysisResult) {
    throw new Error('Chưa có kết quả phân tích AI, chức năng xuất PDF bị vô hiệu hóa');
  }
};
