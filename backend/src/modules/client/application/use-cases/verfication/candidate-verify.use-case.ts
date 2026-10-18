import { VerificationEntity, IVerificationProps, IVerifyCandidateInputDTO } from "../../../domain/verifycation";
import { IVerificationRepository } from "../../../application/ports/repositories/verification.interface";

export class VerifyCandidateUseCase {
  constructor(
    private readonly candidateRepo: IVerificationRepository,
  ) {}

  async execute(candidateID: string, dataVerification: IVerifyCandidateInputDTO): Promise<IVerificationProps> {
    if (!candidateID || candidateID.trim() === "") {
      throw new Error("candidateID không hợp lệ hoặc bị rỗng.");
    }

    if (!dataVerification) {
      throw new Error("Dữ liệu xác minh không được để trống.");
    }

    const existingVerification = await this.candidateRepo.getByCandidateId(candidateID);

    if (existingVerification) {
      throw new Error("Ứng viên này đã được kiểm chứng trước đó, không thể xác minh lại.");
    }

    let verification: VerificationEntity;

    try {
      verification = VerificationEntity.create({
        ...dataVerification,
        candidateId: candidateID,
      });
    } catch (err) {
      throw new Error("Dữ liệu xác minh không hợp lệ, vui lòng kiểm tra lại thông tin.");
    }

    let result: VerificationEntity | null = null;

    try {
      const [createdVerification] = await Promise.all([
        this.candidateRepo.create(verification),
        this.candidateRepo.updateIsVerify(candidateID, true),
      ]);

      result = createdVerification;
    } catch (err) {
      throw new Error("Đã xảy ra lỗi khi lưu thông tin xác minh, vui lòng thử lại.");
    }

    if (!result) {
      throw new Error("Kiểm chứng lỗi vui lòng thử lại!");
    }

    return result.getDetail();
  }
}
