export interface IProbedProject {
  name: string;
  language?: string | null;
  stars?: number;
  url?: string;
}

export interface IVerificationProps {
  id?: string;
  candidateId: string;
  isVerified?: boolean;
  name?: string;
  age?: string;
  phone?: string;
  email?: string;
  githubStars?: number;
  topLanguages?: string[];
  school?: string;
  probedProjects?: IProbedProject[];
  aiReasoning?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IVerifyCandidateInputDTO = Omit<
  IVerificationProps,
  "id" | "candidateId" | "isVerified" | "createdAt" | "updatedAt"
>;
