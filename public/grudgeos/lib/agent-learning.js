/**
 * AgentLearning - Adaptive Learning System for AI Agents
 * Learns from request processing, user feedback, and successful patterns
 */

class AgentLearning {
  constructor() {
    this.namespace = 'cloudpilot_learning';
    this.patterns = new Map();
    this.feedback = [];
    this.sessionStart = Date.now();
    this.learningRate = 0.1;
    this.confidenceThreshold = 0.6;
  }
  
  // ============ PATTERN LEARNING ============
  
  async learnPattern(input, output, context = {}) {
    const pattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inputSignature: this.generateSignature(input),
      inputSample: input.slice(0, 500),
      outputSample: output.slice(0, 500),
      context: {
        task: context.task,
        model: context.model,
        duration: context.duration,
        success: context.success ?? true
      },
      confidence: 0.5,
      usageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Check for similar existing patterns
    const similar = await this.findSimilarPattern(input);
    
    if (similar) {
      // Reinforce existing pattern
      similar.usageCount++;
      similar.confidence = Math.min(0.99, similar.confidence + this.learningRate);
      similar.updatedAt = new Date().toISOString();
      await this.savePattern(similar);
      return { learned: true, reinforced: true, pattern: similar };
    }
    
    // Save new pattern
    await this.savePattern(pattern);
    return { learned: true, reinforced: false, pattern };
  }
  
  async findSimilarPattern(input) {
    const inputSig = this.generateSignature(input);
    const patterns = await this.loadPatterns();
    
    for (const pattern of patterns) {
      if (this.compareSignatures(inputSig, pattern.inputSignature) > 0.7) {
        return pattern;
      }
    }
    
    return null;
  }
  
  async suggestFromPatterns(input) {
    const inputSig = this.generateSignature(input);
    const patterns = await this.loadPatterns();
    
    const matches = patterns
      .map(p => ({
        pattern: p,
        similarity: this.compareSignatures(inputSig, p.inputSignature)
      }))
      .filter(m => m.similarity > 0.5 && m.pattern.confidence > this.confidenceThreshold)
      .sort((a, b) => (b.similarity * b.pattern.confidence) - (a.similarity * a.pattern.confidence));
    
    if (matches.length > 0) {
      return {
        hasSuggestion: true,
        suggestion: matches[0].pattern.outputSample,
        confidence: matches[0].similarity * matches[0].pattern.confidence,
        patternId: matches[0].pattern.id
      };
    }
    
    return { hasSuggestion: false };
  }
  
  // ============ FEEDBACK PROCESSING ============
  
  async recordFeedback(interactionId, feedback) {
    const record = {
      id: `feedback_${Date.now()}`,
      interactionId,
      feedback: {
        rating: feedback.rating, // 1-5
        helpful: feedback.helpful, // boolean
        correct: feedback.correct, // boolean
        comments: feedback.comments
      },
      timestamp: new Date().toISOString()
    };
    
    // Save to Puter KV
    const key = `${this.namespace}:feedback:${record.id}`;
    await puter.kv.set(key, JSON.stringify(record));
    
    // Update related pattern if exists
    if (feedback.patternId) {
      const pattern = await this.loadPattern(feedback.patternId);
      if (pattern) {
        if (feedback.helpful || feedback.rating >= 4) {
          pattern.confidence = Math.min(0.99, pattern.confidence + this.learningRate * 2);
        } else if (feedback.rating <= 2) {
          pattern.confidence = Math.max(0.1, pattern.confidence - this.learningRate);
        }
        await this.savePattern(pattern);
      }
    }
    
    return record;
  }
  
  async analyzeFeedback() {
    const feedbackRecords = await this.loadAllFeedback();
    
    const analysis = {
      totalFeedback: feedbackRecords.length,
      averageRating: 0,
      helpfulRate: 0,
      correctRate: 0,
      recentTrend: 'stable'
    };
    
    if (feedbackRecords.length === 0) return analysis;
    
    let ratingSum = 0, helpfulCount = 0, correctCount = 0;
    
    feedbackRecords.forEach(f => {
      ratingSum += f.feedback.rating || 3;
      if (f.feedback.helpful) helpfulCount++;
      if (f.feedback.correct) correctCount++;
    });
    
    analysis.averageRating = ratingSum / feedbackRecords.length;
    analysis.helpfulRate = helpfulCount / feedbackRecords.length;
    analysis.correctRate = correctCount / feedbackRecords.length;
    
    // Analyze trend
    const recentFeedback = feedbackRecords.slice(-10);
    const olderFeedback = feedbackRecords.slice(-20, -10);
    
    if (recentFeedback.length >= 5 && olderFeedback.length >= 5) {
      const recentAvg = recentFeedback.reduce((s, f) => s + (f.feedback.rating || 3), 0) / recentFeedback.length;
      const olderAvg = olderFeedback.reduce((s, f) => s + (f.feedback.rating || 3), 0) / olderFeedback.length;
      
      if (recentAvg > olderAvg + 0.3) analysis.recentTrend = 'improving';
      else if (recentAvg < olderAvg - 0.3) analysis.recentTrend = 'declining';
    }
    
    return analysis;
  }
  
  // ============ USER PREFERENCE LEARNING ============
  
  async learnPreference(category, preference, value) {
    const key = `${this.namespace}:preference:${category}:${preference}`;
    const existing = await puter.kv.get(key);
    
    let prefData;
    if (existing) {
      prefData = JSON.parse(existing);
      prefData.observations.push({ value, timestamp: Date.now() });
      if (prefData.observations.length > 20) {
        prefData.observations = prefData.observations.slice(-20);
      }
      prefData.currentValue = this.inferPreference(prefData.observations);
      prefData.updatedAt = new Date().toISOString();
    } else {
      prefData = {
        category,
        preference,
        observations: [{ value, timestamp: Date.now() }],
        currentValue: value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    await puter.kv.set(key, JSON.stringify(prefData));
    return prefData.currentValue;
  }
  
  async getPreference(category, preference, defaultValue = null) {
    const key = `${this.namespace}:preference:${category}:${preference}`;
    try {
      const data = await puter.kv.get(key);
      if (data) {
        return JSON.parse(data).currentValue;
      }
    } catch (e) {}
    return defaultValue;
  }
  
  inferPreference(observations) {
    if (observations.length === 0) return null;
    if (observations.length === 1) return observations[0].value;
    
    // For strings, return most common
    if (typeof observations[0].value === 'string') {
      const counts = {};
      observations.forEach(o => {
        counts[o.value] = (counts[o.value] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    
    // For numbers, return weighted average (recent values weighted more)
    if (typeof observations[0].value === 'number') {
      let sum = 0, weightSum = 0;
      observations.forEach((o, i) => {
        const weight = i + 1;
        sum += o.value * weight;
        weightSum += weight;
      });
      return sum / weightSum;
    }
    
    // For booleans, return majority
    if (typeof observations[0].value === 'boolean') {
      const trueCount = observations.filter(o => o.value).length;
      return trueCount > observations.length / 2;
    }
    
    return observations[observations.length - 1].value;
  }
  
  // ============ SKILL ACQUISITION ============
  
  async acquireSkill(skillName, skillData) {
    const key = `${this.namespace}:skill:${skillName}`;
    
    const skill = {
      name: skillName,
      description: skillData.description,
      examples: skillData.examples || [],
      prompts: skillData.prompts || [],
      model: skillData.preferredModel || 'claude-sonnet-4',
      proficiency: 0.5,
      usageCount: 0,
      acquiredAt: new Date().toISOString()
    };
    
    await puter.kv.set(key, JSON.stringify(skill));
    return skill;
  }
  
  async improveSkill(skillName, success) {
    const key = `${this.namespace}:skill:${skillName}`;
    const data = await puter.kv.get(key);
    
    if (!data) return null;
    
    const skill = JSON.parse(data);
    skill.usageCount++;
    
    if (success) {
      skill.proficiency = Math.min(0.99, skill.proficiency + this.learningRate);
    } else {
      skill.proficiency = Math.max(0.1, skill.proficiency - this.learningRate * 0.5);
    }
    
    await puter.kv.set(key, JSON.stringify(skill));
    return skill;
  }
  
  async listSkills() {
    const prefix = `${this.namespace}:skill:`;
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      const skills = [];
      
      for (const key of keys) {
        const data = await puter.kv.get(key);
        if (data) skills.push(JSON.parse(data));
      }
      
      return skills.sort((a, b) => b.proficiency - a.proficiency);
    } catch (e) {
      return [];
    }
  }
  
  // ============ REQUEST PROCESSING RULES ============
  
  async learnFromRequest(request, response, outcome) {
    const record = {
      requestType: this.classifyRequest(request),
      requestLength: request.length,
      responseModel: outcome.model,
      responseDuration: outcome.duration,
      success: outcome.success,
      userSatisfaction: outcome.satisfaction,
      timestamp: Date.now()
    };
    
    // Update request type statistics
    const statsKey = `${this.namespace}:stats:${record.requestType}`;
    const existingStats = await puter.kv.get(statsKey);
    
    let stats;
    if (existingStats) {
      stats = JSON.parse(existingStats);
      stats.count++;
      stats.successRate = (stats.successRate * (stats.count - 1) + (outcome.success ? 1 : 0)) / stats.count;
      stats.avgDuration = (stats.avgDuration * (stats.count - 1) + outcome.duration) / stats.count;
    } else {
      stats = {
        type: record.requestType,
        count: 1,
        successRate: outcome.success ? 1 : 0,
        avgDuration: outcome.duration,
        bestModel: outcome.model
      };
    }
    
    await puter.kv.set(statsKey, JSON.stringify(stats));
    
    // Learn pattern if successful
    if (outcome.success && outcome.satisfaction >= 0.7) {
      await this.learnPattern(request, response, {
        task: record.requestType,
        model: outcome.model,
        duration: outcome.duration,
        success: true
      });
    }
    
    return record;
  }
  
  classifyRequest(request) {
    const lower = request.toLowerCase();
    
    if (/\b(code|function|class|implement|program|script)\b/.test(lower)) return 'code_generation';
    if (/\b(fix|bug|error|debug|issue)\b/.test(lower)) return 'debugging';
    if (/\b(explain|what|how|why|describe)\b/.test(lower)) return 'explanation';
    if (/\b(analyze|review|assess|evaluate)\b/.test(lower)) return 'analysis';
    if (/\b(create|build|make|generate)\b/.test(lower)) return 'creation';
    if (/\b(summarize|summary|brief|tldr)\b/.test(lower)) return 'summarization';
    if (/\b(translate|convert)\b/.test(lower)) return 'translation';
    if (/\b(idea|brainstorm|suggest)\b/.test(lower)) return 'brainstorming';
    
    return 'general';
  }
  
  async getOptimalModel(requestType) {
    const statsKey = `${this.namespace}:stats:${requestType}`;
    const stats = await puter.kv.get(statsKey);
    
    if (stats) {
      const parsed = JSON.parse(stats);
      if (parsed.successRate > 0.8) {
        return parsed.bestModel;
      }
    }
    
    // Default model selection
    const defaults = {
      code_generation: 'claude-sonnet-4',
      debugging: 'claude-sonnet-4',
      explanation: 'gpt-4o',
      analysis: 'gemini-1.5-pro',
      creation: 'claude-3-5-sonnet',
      summarization: 'claude-3-haiku',
      translation: 'mistral-large',
      brainstorming: 'gpt-4o',
      general: 'claude-sonnet-4'
    };
    
    return defaults[requestType] || 'claude-sonnet-4';
  }
  
  // ============ UTILITIES ============
  
  generateSignature(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 50);
    
    const wordFreq = {};
    words.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    
    return {
      length: text.length,
      wordCount: words.length,
      topWords: Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([w]) => w),
      hasCode: /```|function|class|const|let|var|def |import /.test(text),
      hasQuestion: /\?/.test(text)
    };
  }
  
  compareSignatures(sig1, sig2) {
    if (!sig1 || !sig2) return 0;
    
    let score = 0;
    
    // Length similarity
    const lengthRatio = Math.min(sig1.length, sig2.length) / Math.max(sig1.length, sig2.length);
    score += lengthRatio * 0.2;
    
    // Word overlap
    const overlap = sig1.topWords.filter(w => sig2.topWords.includes(w)).length;
    score += (overlap / Math.max(sig1.topWords.length, sig2.topWords.length)) * 0.5;
    
    // Same type
    if (sig1.hasCode === sig2.hasCode) score += 0.15;
    if (sig1.hasQuestion === sig2.hasQuestion) score += 0.15;
    
    return score;
  }
  
  async savePattern(pattern) {
    const key = `${this.namespace}:pattern:${pattern.id}`;
    await puter.kv.set(key, JSON.stringify(pattern));
  }
  
  async loadPattern(patternId) {
    const key = `${this.namespace}:pattern:${patternId}`;
    const data = await puter.kv.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async loadPatterns() {
    const prefix = `${this.namespace}:pattern:`;
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      const patterns = [];
      
      for (const key of keys) {
        const data = await puter.kv.get(key);
        if (data) patterns.push(JSON.parse(data));
      }
      
      return patterns;
    } catch (e) {
      return [];
    }
  }
  
  async loadAllFeedback() {
    const prefix = `${this.namespace}:feedback:`;
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      const feedback = [];
      
      for (const key of keys) {
        const data = await puter.kv.get(key);
        if (data) feedback.push(JSON.parse(data));
      }
      
      return feedback.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (e) {
      return [];
    }
  }
  
  async getLearningStats() {
    const patterns = await this.loadPatterns();
    const skills = await this.listSkills();
    const feedback = await this.analyzeFeedback();
    
    return {
      patternsLearned: patterns.length,
      avgPatternConfidence: patterns.length > 0 
        ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length 
        : 0,
      skillsAcquired: skills.length,
      avgSkillProficiency: skills.length > 0
        ? skills.reduce((s, sk) => s + sk.proficiency, 0) / skills.length
        : 0,
      feedbackAnalysis: feedback,
      sessionDuration: Date.now() - this.sessionStart
    };
  }
}

// Create global instance
const agentLearning = new AgentLearning();

// Export
if (typeof window !== 'undefined') {
  window.AgentLearning = AgentLearning;
  window.agentLearning = agentLearning;
}

if (typeof module !== 'undefined') {
  module.exports = { AgentLearning, agentLearning };
}
