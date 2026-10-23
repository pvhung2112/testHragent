import type { ICandidateReadRepo, ICandidateWriteRepo } from '../../../application/ports/repositories/candidate.interface';
import type { IJobReadRepo } from '../../../application/ports/repositories/job.interface';
import type { IAnalysisReadRepo, IAnalysisWriteRepo } from '../../../application/ports/repositories/analysis.interface';
import type { IAIService } from '../../../application/ports/services/ai.service';
import { CandidateStatus } from '../../../domain/candidate';
import { AnalysisEntity } from '../../../domain/analysis';
import { AnalysisInputDto, AnalysisOutputDto } from '../../dtos/analysis/analysis.dto';

export class AnalysisUseCase {
  constructor(
    private readonly candidateRepo: ICandidateReadRepo & ICandidateWriteRepo,
    private readonly jobRepo: IJobReadRepo,
    private readonly aiAnalyzeRepo: IAnalysisReadRepo & IAnalysisWriteRepo,
    private readonly geminiService: IAIService,
  ) { }

  async execute(input: AnalysisInputDto): Promise<AnalysisOutputDto> {
    const { candidateID, jobID } = input;

    if (!jobID || !jobID.trim()) {
      throw new Error('EX_02: Vui lòng chọn JD (Mô tả công việc) để thực hiện so khớp');
    }

    const existingAnalysis = await this.aiAnalyzeRepo.getAnalysisByCandidateIdAndJobId(candidateID, jobID);
    if (existingAnalysis) {
      return existingAnalysis as AnalysisOutputDto;
    }

    const candidate = await this.candidateRepo.getById(candidateID);
    if (!candidate) throw new Error('Không tìm thấy thông tin ứng viên.');

    const job = await this.jobRepo.getById(jobID);
    if (!job) throw new Error('Không tìm thấy thông tin công việc (Job).');

    if ((job as any).status === 'CLOSED' || (job as any).isClosed) {
      throw new Error('JD này đã đóng tuyển dụng. Vui lòng chọn JD đang mở tuyển');
    }

    let analysisResult: any;
    try {
      analysisResult = await this.geminiService.analyzeCandidateWithJob(
        candidate.getDetailProfile(),
        job.getDetailJob(),
      );
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('timeout') || err.message?.includes('EX_03')) {
        throw new Error('EX_03: Máy chủ AI phản hồi chậm quá thời gian cho phép (Timeout)');
      }
      throw err;
    }

    if (!analysisResult) throw new Error('Lỗi khi gọi AI phân tích dữ liệu.');

    const analysis = AnalysisEntity.create({
      jobID,
      candidateID,
      summary: analysisResult['summary'] as string,
      matchingScore: analysisResult['matchingScore'] as number,
      redFlags: analysisResult['redFlags'] as string[],
      suggestedQuestions: analysisResult['suggestedQuestions'] as string[]
    });

    const savedAnalysis = await this.aiAnalyzeRepo.create(analysis);

    if (!savedAnalysis) throw new Error('Lỗi khi lưu kết quả phân tích.');

    candidate.updateStatus(CandidateStatus.SCREENING);
    await this.candidateRepo.update(candidate);

    return savedAnalysis as AnalysisOutputDto;
  }
}
