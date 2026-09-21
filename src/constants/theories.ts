import { TheoryConfig } from '../types';

export const THEORY_CONFIGS: Record<string, TheoryConfig> = {
  classical: {
    id: 'classical',
    name: '经典扎根理论',
    nameEn: 'Classical Grounded Theory',
    author: 'Glaser & Strauss（1967）/ Glaser（后期）',
    shortDesc: '让理论从数据中自然涌现，严格避免预设概念',
    fullDesc:
      '经典扎根理论由 Barney Glaser 与 Anselm Strauss 于1967年共同创立。其核心主张是"理论自然涌现"（emergence），研究者应以开放心态进入田野，严格避免预先阅读大量文献以防概念污染。编码方式以实质编码（Substantive Coding）和理论编码（Theoretical Coding）为主，最终目标是生成一个能解释主要关切问题（Main Concern）的核心变量（Core Variable）。',
    goals: [
      '识别研究参与者的"主要关切"（Main Concern）',
      '发现能持续解释数据变异的核心变量',
      '通过理论抽样达到理论饱和',
      '生成形式理论而非描述性发现',
    ],
    codingLevels: {
      level1: '理论编码',
      level2: '实质编码',
      level3: '概念',
    },
    promptGuidance: `你正在运用【经典扎根理论（Glaser）】进行编码分析。请遵循以下原则：
- 核心原则：让理论从数据中自然涌现（emergence），严禁将数据强行套入预设框架。
- 编码策略：
  1. 概念层（concept）：紧贴数据，用简洁词汇命名数据中的事件、行动或意义。
  2. 实质编码层（substantive code）：归纳相关概念，识别参与者"主要关切"（main concern）。
  3. 理论编码层（theoretical code）：抽象出能连接实质编码并解释变异的核心变量（core variable）。
- 输出重点：聚焦于"过程"与"模式"，而非静态的描述与分类。
- 语言风格：编码标签应简洁有力，优先使用动名词形式（如"应对不确定性"）。`,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },

  procedural: {
    id: 'procedural',
    name: '程序化扎根理论',
    nameEn: 'Procedural Grounded Theory',
    author: 'Strauss & Corbin（1990）',
    shortDesc: '系统化三阶段编码，使用范式模型揭示条件-行动-结果结构',
    fullDesc:
      'Strauss 与 Corbin 于1990年发展出程序化（或称规范化）扎根理论，提供了更结构化的操作步骤。其最重要的贡献是引入了"范式模型"（Paradigm Model），要求研究者在主轴式编码阶段系统性地分析现象的因果条件、脉络、中介条件、行动/互动策略与结果。最终通过选择性编码整合所有范畴，形成核心范畴。',
    goals: [
      '系统完成开放式、主轴式、选择性三阶段编码',
      '运用范式模型分析条件—行动—结果关系',
      '识别并整合核心范畴',
      '构建具有解释力的理论框架',
    ],
    codingLevels: {
      level1: '选择性编码',
      level2: '主轴式编码',
      level3: '开放式编码',
    },
    promptGuidance: `你正在运用【程序化扎根理论（Strauss & Corbin）】进行编码分析。请遵循以下原则：
- 核心原则：系统化执行三阶段编码，使用范式模型（Paradigm Model）分析数据结构。
- 编码策略：
  1. 开放式编码（open coding）：逐句逐段贴近原文命名，产生大量具体概念。
  2. 主轴式编码（axial coding）：将开放编码归类为范畴，并尝试识别其【因果条件→现象→脉络→中介条件→行动策略→结果】的关系。
  3. 选择性编码（selective coding）：找出能统摄所有主轴编码的核心范畴，描述其"故事线"。
- 输出重点：每个主轴编码应尽量体现条件或结果关系，选择性编码应是高度抽象的范畴名称。
- 语言风格：使用规范的社会科学学术术语，编码标签结构清晰。`,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },

  constructivist: {
    id: 'constructivist',
    name: '建构式扎根理论',
    nameEn: 'Constructivist Grounded Theory',
    author: 'Charmaz（2006）',
    shortDesc: '关注参与者意义建构，反思研究者立场，强调过程与行动',
    fullDesc:
      'Kathy Charmaz 于2006年提出建构式扎根理论，对传统客观主义立场进行了批判性反思。她认为理论是由研究者与参与者共同建构的，而非"客观发现"的。其编码方法强调使用"行动词"（gerunds）进行初始编码，以捕捉参与者的行动与过程；聚焦编码则从初始编码中选择最具分析意义的编码进行深化；理论编码用于整合最终理论。研究者的反身性（reflexivity）是其方法的核心关切。',
    goals: [
      '捕捉参与者的主观意义建构与体验过程',
      '使用行动词编码揭示动态过程',
      '反思研究者自身立场对分析的影响',
      '建构能体现参与者视角的扎根理论',
    ],
    codingLevels: {
      level1: '核心范畴',
      level2: '聚焦编码',
      level3: '初始编码',
    },
    promptGuidance: `你正在运用【建构式扎根理论（Charmaz）】进行编码分析。请遵循以下原则：
- 核心原则：理论是研究者与数据共同建构的产物，强调参与者的主观意义与行动过程。
- 编码策略：
  1. 初始编码（initial coding）：尽量使用【动名词/进行时动词】命名，紧贴参与者的行动与体验（如"寻求认同""承受压力""重构身份"），而非静态描述。
  2. 聚焦编码（focused coding）：从初始编码中选取最频繁、最有分析意义的编码，进行综合归纳，形成更抽象的分析范畴。
  3. 核心范畴（core category）：整合聚焦编码，形成能解释参与者核心体验或意义建构过程的范畴。
- 输出重点：编码应体现过程性、行动性和意义性；引语选取应能体现参与者的主观声音。
- 语言风格：优先使用动名词形式（如"协商边界"而非"边界协商"），保留参与者视角的温度。`,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
};

export const THEORY_LIST = Object.values(THEORY_CONFIGS);
