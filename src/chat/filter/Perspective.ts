const Perspective = require('perspective-api-client')

import config from '../../../config/config.json'


export async function getPerspectiveAnalysis(input: string) {
  const perspectiveApiClient = new Perspective({
    apiKey: config.chat.token,
  })

    const response = await perspectiveApiClient.analyze({
      comment: {
        text: input,
      },
      languages: ['en'],
      requestedAttributes: {
        TOXICITY: {},
        PROFANITY: {},
        SEXUALLY_EXPLICIT: {},
      },
    })

    return new PerspectiveAnalysisResult(input, response)
  }
  
  /**
   * Represents the result of some user input that's been analyzed by Google's Perspective
   * API
   * 
   * It provides convenience methods for determining whether the response indicates that the
   * input is profane, and gives some information about it
   */
  export class PerspectiveAnalysisResult {
    public readonly filter = 'perspectiveApi'
  
    public readonly sexuallyExplicitScore: number;
    public readonly profanityScore: number;
    public readonly toxicityScore: number;
  
    constructor(
      public readonly subject: string,
      public readonly response: AnalysisResponse
    ) {
      this.sexuallyExplicitScore = response.attributeScores.SEXUALLY_EXPLICIT.summaryScore.value * 100
      this.profanityScore = response.attributeScores.PROFANITY.summaryScore.value * 100
      this.toxicityScore = response.attributeScores.TOXICITY.summaryScore.value * 100
    }
  
    shouldTextBeFiltered() {
      return this.isTextSexuallyExplicit() || this.isTextProfane() || this.isTextToxic()
    }
  
    shouldTextBeLogged() {
      const scores = [this.sexuallyExplicitScore, this.profanityScore, this.toxicityScore]

      return scores.some(score => score > 60)
    }
  
    isTextSexuallyExplicit() {
      return this.sexuallyExplicitScore >= 30
    }
  
    isTextProfane() {
      return this.profanityScore >= 30
    }
  
    isTextToxic() {
      return this.toxicityScore >= 30
    }
  }
  
  interface AnalysisResponse {
    attributeScores: {[key in AnalysisAttribute]: AnalysisAttributeScore};
  }
  
  type AnalysisAttribute =
    | 'TOXICITY'
    | 'PROFANITY'
    | 'SEXUALLY_EXPLICIT'
  
  interface AnalysisAttributeScore {
    summaryScore: AnalysisSummaryScore;
  }
  
  interface AnalysisSummaryScore {
    value: number;
    type: string;
  }