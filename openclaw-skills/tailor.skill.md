# Tailor Resume + Cover Letter

Given a resume and job description, return JSON:
{
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "coverLetter": "full cover letter text"
}

Rules:
- Each bullet: action verb, under 20 words, metric if possible
- Cover letter: 3 paragraphs, under 250 words, sounds like a real student
- Never use "I am excited to" or "I would be a great fit"