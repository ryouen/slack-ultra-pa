import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { HierarchySuggestion } from '@/types';
import { config } from '@/config/environment';
import OpenAI from 'openai';

export interface ProjectPattern {
  pattern: RegExp;
  type: 'project' | 'client';
  examples: string[];
}

export interface TaskHierarchyInfo {
  level: 'PROJECT' | 'MID_TASK' | 'SUB_TASK';
  suggestedParent?: string;
  projectName?: string;
  clientName?: string;
  confidence: number;
}

export interface AutoPromotionResult {
  promoted: boolean;
  newLevel?: 'PROJECT' | 'MID_TASK';
  reason?: string;
  affectedTasks?: string[];
}

export class HierarchyService {
  private prisma = getPrismaClient();
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openai?.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
  }

  // Project/Client detection patterns
  private readonly projectPatterns: ProjectPattern[] = [
    // Japanese patterns
    {
      pattern: /(.+?)(プロジェクト|PJ|開発|構築|導入|リニューアル|改修)/,
      type: 'project',
      examples: ['ECサイトリニューアルプロジェクト', '基幹システム開発', 'CRM導入PJ']
    },
    {
      pattern: /(.+?)(様|さま|御中|株式会社|会社|法人)/,
      type: 'client',
      examples: ['山田商事様', '株式会社ABC', 'XYZ法人']
    },
    // English patterns
    {
      pattern: /(.+?)\s*(project|development|implementation|migration|upgrade)/i,
      type: 'project',
      examples: ['Website Redesign Project', 'API Development', 'Cloud Migration']
    },
    {
      pattern: /(inc\.|corp\.|ltd\.|company|client:|for\s+)(.+)/i,
      type: 'client',
      examples: ['ABC Inc.', 'Client: XYZ Corp.', 'for Google']
    },
    // Bracket patterns
    {
      pattern: /\[(.+?)\]|\【(.+?)\】/,
      type: 'project',
      examples: ['[社内システム]', '【新規案件】']
    }
  ];

  // Mid-task detection keywords
  private readonly midTaskKeywords = {
    ja: [
      '実装', '開発', '設計', '構築', 'テスト', '検証', 'レビュー',
      'ドキュメント', '資料作成', '調査', '分析', '企画', '提案'
    ],
    en: [
      'implement', 'develop', 'design', 'build', 'test', 'review',
      'document', 'research', 'analyze', 'plan', 'propose', 'create'
    ]
  };

  /**
   * Analyze task and suggest hierarchy
   * @param task - The task to analyze
   * @param options - Analysis options
   */
  async analyzeTaskHierarchy(task: {
    id?: string;
    title: string;
    description?: string;
    parentId?: string | null;
  }, options?: {
    useAI?: boolean;
    userId?: string;
  }): Promise<TaskHierarchyInfo> {
    // Check if user wants AI analysis and it's available
    const shouldUseAI = options?.useAI && this.openai && config.openai?.apiKey;
    
    if (shouldUseAI) {
      logger.info('Using AI for hierarchy analysis', { taskTitle: task.title });
      
      // Try AI analysis first
      try {
        const aiResult = await this.analyzeWithAI(task);
        if (aiResult.confidence >= 0.7) {
          return aiResult;
        }
        // If AI confidence is low, fall back to pattern matching
        logger.info('AI confidence low, falling back to pattern matching', { 
          confidence: aiResult.confidence 
        });
      } catch (error) {
        logger.error('AI analysis failed, falling back to pattern matching', { error });
      }
    }

    // Pattern-based analysis (original logic)
    const content = `${task.title} ${task.description || ''}`;
    
    // Check if already has parent
    if (task.parentId) {
      const parent = await this.prisma.task.findUnique({
        where: { id: task.parentId }
      });
      
      if (parent) {
        // If parent is PROJECT, this should be MID_TASK
        if (parent.level === 'PROJECT') {
          return {
            level: 'MID_TASK',
            suggestedParent: parent.id,
            projectName: parent.title,
            confidence: 0.9
          };
        }
        // If parent is MID_TASK, this should be SUB_TASK
        else if (parent.level === 'MID_TASK') {
          return {
            level: 'SUB_TASK',
            suggestedParent: parent.id,
            confidence: 0.9
          };
        }
      }
    }

    // Detect project or client names
    const projectInfo = this.detectProjectOrClient(content);
    if (projectInfo) {
      logger.info('Detected project/client', { projectInfo, taskTitle: task.title });
      
      // Check if this project already exists
      const existingProject = await this.findExistingProject(projectInfo.name);
      
      if (existingProject) {
        // This task should be under the existing project
        return {
          level: this.detectTaskLevel(content),
          suggestedParent: existingProject.id,
          projectName: existingProject.title,
          confidence: 0.8
        };
      } else if (this.isProjectLevel(content)) {
        // This is a new project
        return {
          level: 'PROJECT',
          projectName: projectInfo.name,
          clientName: projectInfo.type === 'client' ? projectInfo.name : undefined,
          confidence: 0.8
        };
      }
    }

    // Detect task level based on content
    const level = this.detectTaskLevel(content);
    
    // Try to find a suitable parent
    let suggestedParent: string | undefined;
    if (level === 'SUB_TASK' || level === 'MID_TASK') {
      suggestedParent = await this.findSuitableParent(task, level);
    }

    return {
      level,
      suggestedParent,
      confidence: suggestedParent ? 0.7 : 0.5
    };
  }

  /**
   * Check and perform auto-promotion if needed
   */
  async checkAutoPromotion(parentTaskId: string): Promise<AutoPromotionResult> {
    const parentTask = await this.prisma.task.findUnique({
      where: { id: parentTaskId },
      include: {
        children: {
          where: { status: { not: 'COMPLETED' } }
        }
      }
    });

    if (!parentTask) {
      return { promoted: false };
    }

    // Check if sub-tasks exceed 5
    if (parentTask.children.length > 5 && parentTask.level === 'SUB_TASK') {
      // Promote to MID_TASK
      await this.prisma.task.update({
        where: { id: parentTaskId },
        data: { level: 'MID_TASK' }
      });

      logger.info('Auto-promoted task to MID_TASK', {
        taskId: parentTaskId,
        childCount: parentTask.children.length
      });

      return {
        promoted: true,
        newLevel: 'MID_TASK',
        reason: `Sub-tasks exceeded 5 (${parentTask.children.length} active sub-tasks)`,
        affectedTasks: parentTask.children.map(child => child.id)
      };
    }

    // Check if MID_TASK should be promoted to PROJECT
    if (parentTask.level === 'MID_TASK' && !parentTask.parentId) {
      const relatedTasks = await this.findRelatedMidTasks(parentTask);
      
      if (relatedTasks.length >= 3) {
        // Create a new PROJECT level task
        const projectName = this.extractProjectName(parentTask, relatedTasks);
        
        const newProject = await this.prisma.task.create({
          data: {
            title: projectName,
            description: `Auto-generated project for ${relatedTasks.length} related tasks`,
            status: 'IN_PROGRESS',
            priority: 'P2',
            level: 'PROJECT',
            userId: parentTask.userId,
            priorityScore: 0.5
          }
        });

        // Update all related tasks to have this project as parent
        await this.prisma.task.updateMany({
          where: {
            id: { in: [parentTask.id, ...relatedTasks.map(t => t.id)] }
          },
          data: { parentId: newProject.id }
        });

        logger.info('Auto-created PROJECT and organized related tasks', {
          projectId: newProject.id,
          projectName,
          taskCount: relatedTasks.length + 1
        });

        return {
          promoted: true,
          newLevel: 'PROJECT',
          reason: `Created project for ${relatedTasks.length + 1} related mid-level tasks`,
          affectedTasks: [parentTask.id, ...relatedTasks.map(t => t.id)]
        };
      }
    }

    return { promoted: false };
  }

  /**
   * Get hierarchy visualization data
   */
  async getHierarchyVisualization(userId: string): Promise<any> {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' }
      },
      orderBy: [
        { level: 'asc' },
        { priorityScore: 'desc' }
      ]
    });

    // Build hierarchy tree
    const projects = tasks.filter(t => t.level === 'PROJECT');
    const hierarchy = projects.map(project => {
      const midTasks = tasks.filter(t => t.parentId === project.id && t.level === 'MID_TASK');
      
      return {
        id: project.id,
        title: project.title,
        level: 'PROJECT',
        taskCount: midTasks.length,
        children: midTasks.map(midTask => {
          const subTasks = tasks.filter(t => t.parentId === midTask.id && t.level === 'SUB_TASK');
          
          return {
            id: midTask.id,
            title: midTask.title,
            level: 'MID_TASK',
            taskCount: subTasks.length,
            children: subTasks.map(subTask => ({
              id: subTask.id,
              title: subTask.title,
              level: 'SUB_TASK',
              priority: subTask.priority,
              dueDate: subTask.dueDate
            }))
          };
        })
      };
    });

    // Add orphaned tasks
    const orphanedMidTasks = tasks.filter(t => 
      t.level === 'MID_TASK' && !t.parentId
    );
    
    const orphanedSubTasks = tasks.filter(t => 
      t.level === 'SUB_TASK' && !t.parentId
    );

    return {
      hierarchy,
      orphaned: {
        midTasks: orphanedMidTasks.map(t => ({
          id: t.id,
          title: t.title,
          level: t.level
        })),
        subTasks: orphanedSubTasks.map(t => ({
          id: t.id,
          title: t.title,
          level: t.level,
          priority: t.priority
        }))
      },
      summary: {
        totalProjects: projects.length,
        totalMidTasks: tasks.filter(t => t.level === 'MID_TASK').length,
        totalSubTasks: tasks.filter(t => t.level === 'SUB_TASK').length,
        orphanedCount: orphanedMidTasks.length + orphanedSubTasks.length
      }
    };
  }

  /**
   * Detect project or client name from content
   */
  private detectProjectOrClient(content: string): { name: string; type: 'project' | 'client' } | null {
    for (const pattern of this.projectPatterns) {
      const match = content.match(pattern.pattern);
      if (match) {
        const name = match[1] || match[2] || match[0];
        return {
          name: name.trim(),
          type: pattern.type
        };
      }
    }
    return null;
  }

  /**
   * Detect task level based on content
   */
  private detectTaskLevel(content: string): 'PROJECT' | 'MID_TASK' | 'SUB_TASK' {
    const lowerContent = content.toLowerCase();

    // Check for project-level indicators
    if (this.isProjectLevel(lowerContent)) {
      return 'PROJECT';
    }

    // Check for mid-task keywords
    const allMidTaskKeywords = [
      ...this.midTaskKeywords.ja,
      ...this.midTaskKeywords.en
    ];

    for (const keyword of allMidTaskKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return 'MID_TASK';
      }
    }

    // Default to sub-task
    return 'SUB_TASK';
  }

  /**
   * Check if content indicates project level
   */
  private isProjectLevel(content: string): boolean {
    const projectIndicators = [
      'プロジェクト', 'project', 'pj', '開発', 'development',
      '構築', 'implementation', '導入', 'deployment', 'リニューアル',
      'renewal', '改修', 'upgrade', 'フェーズ', 'phase'
    ];

    return projectIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );
  }

  /**
   * Find existing project by name
   */
  private async findExistingProject(projectName: string): Promise<any | null> {
    const normalizedName = projectName.toLowerCase().trim();
    
    const projects = await this.prisma.task.findMany({
      where: {
        level: 'PROJECT',
        status: { not: 'COMPLETED' }
      }
    });

    return projects.find(project => {
      const projectTitle = project.title.toLowerCase();
      return projectTitle.includes(normalizedName) || 
             normalizedName.includes(projectTitle);
    }) || null;
  }

  /**
   * Find suitable parent for a task
   */
  private async findSuitableParent(
    task: { title: string; description?: string },
    level: 'MID_TASK' | 'SUB_TASK'
  ): Promise<string | undefined> {
    const content = `${task.title} ${task.description || ''}`.toLowerCase();
    
    // Extract keywords
    const keywords = content
      .split(/[\s、。,\.\-_]/)
      .filter(word => word.length > 2)
      .slice(0, 5);

    if (keywords.length === 0) return undefined;

    // Find parent tasks
    const parentLevel = level === 'SUB_TASK' ? 'MID_TASK' : 'PROJECT';
    const potentialParents = await this.prisma.task.findMany({
      where: {
        level: parentLevel,
        status: { not: 'COMPLETED' }
      }
    });

    // Score each potential parent
    const scored = potentialParents.map(parent => {
      const parentContent = `${parent.title} ${parent.description || ''}`.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (parentContent.includes(keyword)) {
          score += 1;
        }
      });

      return { parent, score };
    });

    // Return the best match if score is high enough
    const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
    if (bestMatch && bestMatch.score >= 2) {
      return bestMatch.parent.id;
    }

    return undefined;
  }

  /**
   * Find related mid-level tasks
   */
  private async findRelatedMidTasks(task: any): Promise<any[]> {
    const keywords = this.extractKeywords(task.title);
    if (keywords.length === 0) return [];

    const relatedTasks = await this.prisma.task.findMany({
      where: {
        level: 'MID_TASK',
        parentId: null,
        id: { not: task.id },
        status: { not: 'COMPLETED' },
        userId: task.userId
      }
    });

    // Score and filter related tasks
    return relatedTasks.filter(relatedTask => {
      const relatedKeywords = this.extractKeywords(relatedTask.title);
      const commonKeywords = keywords.filter(k => 
        relatedKeywords.some(rk => rk.includes(k) || k.includes(rk))
      );
      return commonKeywords.length >= 2;
    });
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s、。,\.\-_\[\]【】()]/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より'
    ];
    return stopWords.includes(word);
  }

  /**
   * Extract project name from related tasks
   */
  private extractProjectName(mainTask: any, relatedTasks: any[]): string {
    const allTitles = [mainTask.title, ...relatedTasks.map(t => t.title)];
    
    // Find common prefix
    const commonWords = this.findCommonWords(allTitles);
    if (commonWords.length > 0) {
      return commonWords.join(' ') + ' プロジェクト';
    }

    // Extract from main task
    const projectInfo = this.detectProjectOrClient(mainTask.title);
    if (projectInfo) {
      return projectInfo.name;
    }

    // Default
    return `${mainTask.title} 関連プロジェクト`;
  }

  /**
   * Find common words in titles
   */
  private findCommonWords(titles: string[]): string[] {
    if (titles.length === 0) return [];

    const wordSets = titles.map(title => 
      new Set(this.extractKeywords(title))
    );

    const commonWords = Array.from(wordSets[0]).filter(word =>
      wordSets.every(set => set.has(word))
    );

    return commonWords;
  }

  /**
   * Analyze task hierarchy using AI
   */
  private async analyzeWithAI(task: {
    title: string;
    description?: string;
  }): Promise<TaskHierarchyInfo> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const systemPrompt = `あなたはタスク管理の専門家です。タスクを以下の3階層に分類してください：

1. PROJECT: プロジェクト全体を表す大きな単位（例：ECサイトリニューアル、新製品開発）
2. MID_TASK: プロジェクト内の中規模タスク（例：ユーザー認証機能実装、デザイン作成）
3. SUB_TASK: 具体的な小さなタスク（例：ログイン画面作成、バグ修正）

また、以下も判定してください：
- プロジェクト名または顧客名が含まれているか
- 既存のどのタスクの配下に置くべきか（関連キーワードから推測）

JSON形式で回答してください。`;

    const userPrompt = `タスク: ${task.title}
説明: ${task.description || 'なし'}

以下のJSON形式で回答してください：
{
  "level": "PROJECT" | "MID_TASK" | "SUB_TASK",
  "projectName": "検出されたプロジェクト名（あれば）",
  "clientName": "検出された顧客名（あれば）",
  "suggestedParentKeywords": ["親タスクを探すためのキーワード"],
  "reasoning": "分類の理由",
  "confidence": 0.0-1.0
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL!,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent classification
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const aiAnalysis = JSON.parse(response);
      
      // Find suggested parent if keywords provided
      let suggestedParent: string | undefined;
      if (aiAnalysis.suggestedParentKeywords?.length > 0) {
        suggestedParent = await this.findParentByKeywords(
          aiAnalysis.suggestedParentKeywords,
          aiAnalysis.level
        );
      }

      logger.info('AI hierarchy analysis completed', {
        taskTitle: task.title,
        level: aiAnalysis.level,
        confidence: aiAnalysis.confidence,
        reasoning: aiAnalysis.reasoning
      });

      return {
        level: aiAnalysis.level,
        suggestedParent,
        projectName: aiAnalysis.projectName || undefined,
        clientName: aiAnalysis.clientName || undefined,
        confidence: aiAnalysis.confidence || 0.5
      };
    } catch (error) {
      logger.error('AI analysis error', { error });
      throw error;
    }
  }

  /**
   * Find parent task by AI-suggested keywords
   */
  private async findParentByKeywords(
    keywords: string[],
    childLevel: string
  ): Promise<string | undefined> {
    const parentLevel = childLevel === 'SUB_TASK' ? 'MID_TASK' : 
                       childLevel === 'MID_TASK' ? 'PROJECT' : null;
    
    if (!parentLevel) return undefined;

    const potentialParents = await this.prisma.task.findMany({
      where: {
        level: parentLevel,
        status: { not: 'COMPLETED' }
      }
    });

    // Score based on keyword matches
    const scored = potentialParents.map(parent => {
      const parentContent = `${parent.title} ${parent.description || ''}`.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (parentContent.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      return { parent, score };
    });

    const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
    if (bestMatch && bestMatch.score > 0) {
      return bestMatch.parent.id;
    }

    return undefined;
  }
}