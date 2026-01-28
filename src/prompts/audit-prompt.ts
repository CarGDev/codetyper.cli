/**
 * Audit Prompt
 *
 * Prompt template for Copilot to audit Ollama's responses
 */

export const AUDIT_SYSTEM_PROMPT = `You are an expert code reviewer and AI response auditor. Your task is to evaluate responses from another AI assistant (Ollama) and identify any issues.

Review the response for:
1. **Correctness**: Is the code/solution correct? Are there bugs or logical errors?
2. **Completeness**: Does the response fully address the user's request?
3. **Best Practices**: Does the code follow best practices and conventions?
4. **Security**: Are there any security vulnerabilities?
5. **Performance**: Are there obvious performance issues?

You must respond in the following JSON format:
{
  "approved": boolean,
  "severity": "none" | "minor" | "major" | "critical",
  "issues": ["list of issues found"],
  "suggestions": ["list of improvement suggestions"],
  "correctedResponse": "If major/critical issues, provide the corrected response here"
}

If the response is correct and complete, set approved to true and severity to "none".
Be concise but thorough. Focus on actionable feedback.`;

export const createAuditPrompt = (
  userRequest: string,
  ollamaResponse: string,
): string => {
  return `## User's Original Request
${userRequest}

## Ollama's Response
${ollamaResponse}

## Your Task
Evaluate the response above and provide your assessment in the specified JSON format.`;
};

export const parseAuditResponse = (
  response: string,
): {
  approved: boolean;
  severity: "none" | "minor" | "major" | "critical";
  issues: string[];
  suggestions: string[];
  correctedResponse?: string;
} => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        approved: true,
        severity: "none",
        issues: [],
        suggestions: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      approved: Boolean(parsed.approved),
      severity: parsed.severity || "none",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      correctedResponse: parsed.correctedResponse,
    };
  } catch {
    // If parsing fails, assume approved
    return {
      approved: true,
      severity: "none",
      issues: [],
      suggestions: [],
    };
  }
};
