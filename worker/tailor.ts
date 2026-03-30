export interface TailorResult {
    coverLetter: string
    resumeBullets: string[]
  }
  
  export async function tailorApplication(
    jobData: { jobTitle: string; company: string; jobDescription: string },
    resumeText: string
  ): Promise<TailorResult> {
    return {
      coverLetter: `Mock cover letter for ${jobData.company}`,
      resumeBullets: ['Mock bullet 1', 'Mock bullet 2', 'Mock bullet 3']
    }
  }