/**
 * reportContent.js
 * Generates the 11-section full paid report from a scores object.
 * Each section returns an object: { title, content } or { title, items }
 *
 * Score bands (each dimension 5-35):
 *   High  : 26-35
 *   Mid   : 15-25
 *   Low   : 5-14
 */

const BAND = {
  HIGH: 'high',
  MID: 'mid',
  LOW: 'low',
};

function band(score) {
  if (score >= 26) return BAND.HIGH;
  if (score >= 15) return BAND.MID;
  return BAND.LOW;
}

// ─── Per-dimension trait descriptions ────────────────────────────────────────

const EXTRAVERSION_LABELS = {
  high: 'High Surgency / Extraversion',
  mid: 'Moderate Surgency / Extraversion',
  low: 'Low Surgency / Extraversion',
};

const AGREEABLENESS_LABELS = {
  high: 'High Agreeableness',
  mid: 'Moderate Agreeableness',
  low: 'Low Agreeableness',
};

const ADJUSTMENT_LABELS = {
  high: 'High Adjustment (Emotional Stability)',
  mid: 'Moderate Adjustment',
  low: 'Low Adjustment (Higher Emotional Reactivity)',
};

const CONSCIENTIOUSNESS_LABELS = {
  high: 'High Conscientiousness',
  mid: 'Moderate Conscientiousness',
  low: 'Low Conscientiousness',
};

const OPENNESS_LABELS = {
  high: 'High Openness to Experience',
  mid: 'Moderate Openness to Experience',
  low: 'Low Openness to Experience',
};

// ─── Section 1: Overall Personality Profile ──────────────────────────────────

function overallProfile(scores) {
  const { extraversion, agreeableness, adjustment, conscientiousness, openness } = scores;
  const total = extraversion + agreeableness + adjustment + conscientiousness + openness;
  const avg = (total / 5).toFixed(1);

  const topDimension = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const topLabel = {
    extraversion: 'Surgency / Extraversion',
    agreeableness: 'Agreeableness',
    adjustment: 'Adjustment',
    conscientiousness: 'Conscientiousness',
    openness: 'Openness to Experience',
  }[topDimension];

  return {
    title: 'Overall Personality Profile',
    content: `Your composite Big Five score is ${avg}/35 on average across all five dimensions. Your standout trait is **${topLabel}** (${scores[topDimension]}/35), which tends to be the lens through which you engage with the world most naturally. Together, your five scores paint a picture of a ${total >= 125 ? 'broadly high-functioning and well-rounded' : total >= 90 ? 'balanced and adaptable' : 'introspective and deliberately paced'} individual. The sections below unpack each dimension and what your specific combination means for your work, relationships, and growth.`,
  };
}

// ─── Section 2: Personality Type Summary ─────────────────────────────────────

function personalityTypeSummary(scores) {
  const { extraversion, agreeableness, adjustment, conscientiousness, openness } = scores;
  const bE = band(extraversion);
  const bA = band(agreeableness);
  const bC = band(conscientiousness);
  const bAd = band(adjustment);
  const bO = band(openness);

  let typeName = '';
  let typeDesc = '';

  // High E + High C → driven achiever
  if (bE === 'high' && bC === 'high') {
    typeName = 'The Driven Achiever';
    typeDesc =
      'You combine social energy with disciplined execution. You thrive in environments where you can lead initiatives, set ambitious goals, and see them through. Others often look to you to rally the team and deliver results.';
  }
  // High A + High E → collaborative connector
  else if (bA === 'high' && bE === 'high') {
    typeName = 'The Collaborative Connector';
    typeDesc =
      'You are energised by people and motivated by harmony. You build relationships quickly, create inclusive environments, and are at your best when bridging different perspectives and personalities.';
  }
  // High O + High C → innovative executor
  else if (bO === 'high' && bC === 'high') {
    typeName = 'The Innovative Executor';
    typeDesc =
      'You pair creative thinking with the discipline to turn ideas into reality. While many innovators struggle with follow-through, you move comfortably from concept to implementation — a rare and valuable combination.';
  }
  // High Ad + High C → steady professional
  else if (bAd === 'high' && bC === 'high') {
    typeName = 'The Steady Professional';
    typeDesc =
      'Calm under pressure and meticulous in execution, you are the person colleagues rely on when stakes are high. You rarely over-promise, consistently over-deliver, and bring emotional grounding to high-stress situations.';
  }
  // Low E + High O → reflective explorer
  else if (bE === 'low' && bO === 'high') {
    typeName = 'The Reflective Explorer';
    typeDesc =
      'You prefer to think before acting and find your richest ideas emerge in solitude. Curious and creative, you draw insight from diverse fields and bring a depth of thought that more extroverted thinkers often miss.';
  }
  // Low E + High C → quiet specialist
  else if (bE === 'low' && bC === 'high') {
    typeName = 'The Quiet Specialist';
    typeDesc =
      'You lead through competence rather than charisma. Thorough, reliable, and precise, you build credibility by consistently doing excellent work — and you are often the indispensable backbone of any high-performing team.';
  }
  // High A + Low E → supportive collaborator
  else if (bA === 'high' && bE === 'low') {
    typeName = 'The Supportive Collaborator';
    typeDesc =
      'Warm, empathetic, and genuinely other-focused, you create psychological safety wherever you go. You may not seek the spotlight, but your ability to listen deeply and support others makes you a cornerstone of team culture.';
  }
  // Fallback balanced
  else {
    typeName = 'The Balanced Pragmatist';
    typeDesc =
      'Your scores reflect a flexible, context-sensitive personality. You adapt your style to what the situation calls for — assertive when leadership is needed, collaborative when consensus matters, and reflective when precision counts. This adaptability is a genuine strategic strength.';
  }

  return {
    title: 'Personality Type Summary',
    typeName,
    content: typeDesc,
  };
}

// ─── Section 3: Major Strengths ──────────────────────────────────────────────

function majorStrengths(scores) {
  const strengths = [];

  if (band(scores.extraversion) === 'high') {
    strengths.push('Natural leadership presence — you step up and take charge when direction is needed.');
    strengths.push('Strong networking ability — you build rapport quickly and expand your circle of influence with ease.');
  } else if (band(scores.extraversion) === 'mid') {
    strengths.push('Situational assertiveness — you can lead when needed while also knowing when to step back.');
  }

  if (band(scores.agreeableness) === 'high') {
    strengths.push('Exceptional interpersonal intelligence — you read people well and foster trust naturally.');
    strengths.push('Collaborative orientation — you draw out the best in teams through encouragement and inclusion.');
  } else if (band(scores.agreeableness) === 'mid') {
    strengths.push('Diplomatic balance — you can advocate for your position without damaging relationships.');
  }

  if (band(scores.adjustment) === 'high') {
    strengths.push('Composure under pressure — you remain effective when others struggle with stress and uncertainty.');
    strengths.push('Emotional resilience — setbacks roll off you, allowing rapid recovery and forward momentum.');
  } else if (band(scores.adjustment) === 'mid') {
    strengths.push('Emotional awareness — you recognise your reactions and can manage them effectively in most situations.');
  }

  if (band(scores.conscientiousness) === 'high') {
    strengths.push('Exceptional reliability — stakeholders trust you to deliver on commitments, every time.');
    strengths.push('Systematic thinking — you plan ahead, anticipate obstacles, and execute with precision.');
  } else if (band(scores.conscientiousness) === 'mid') {
    strengths.push('Practical discipline — you balance structure with enough flexibility to adapt when plans change.');
  }

  if (band(scores.openness) === 'high') {
    strengths.push('Creative problem-solving — you see angles that others miss and enjoy tackling novel challenges.');
    strengths.push('Intellectual curiosity — your appetite for learning keeps you growing and relevant in fast-changing environments.');
  } else if (band(scores.openness) === 'mid') {
    strengths.push('Balanced innovation — you welcome useful new ideas while staying grounded in what works.');
  }

  // Ensure at least 3 strengths even for low scorers
  if (strengths.length < 3) {
    strengths.push(
      'Consistency — your measured, predictable approach provides stability that teams and organisations value highly.',
      'Authenticity — you know yourself well and engage with the world on your own terms.',
      'Focus — you direct your energy deliberately rather than spreading yourself thin.'
    );
  }

  return { title: 'Major Strengths', items: strengths.slice(0, 6) };
}

// ─── Section 4: Leadership Potential ─────────────────────────────────────────

function leadershipPotential(scores) {
  const { extraversion, conscientiousness, agreeableness } = scores;
  const leaderScore = extraversion + conscientiousness;
  const bE = band(extraversion);
  const bC = band(conscientiousness);

  let style = '';
  let content = '';

  if (leaderScore >= 52) {
    style = 'Transformational Leader';
    content =
      'You score in the highest bracket for both energy/assertiveness and disciplined follow-through. You inspire action and deliver results — the hallmarks of transformational leadership. You are likely comfortable in front of large groups, comfortable making unpopular decisions, and energised (rather than drained) by the responsibility of leading.';
  } else if (leaderScore >= 42) {
    style = bE === 'high' ? 'Visionary Leader' : 'Operational Leader';
    content =
      bE === 'high'
        ? 'Your high drive and assertiveness make you a compelling visionary — you communicate direction with conviction. Pairing this with structure and planning will maximise your effectiveness as a senior leader.'
        : 'Your conscientiousness and reliability make you an exceptionally effective operational or project leader. You excel at bringing order to complexity, building systems that scale, and earning the trust of your team through consistent delivery.';
  } else if (leaderScore >= 28) {
    style = 'Servant Leader / Influential Contributor';
    content =
      agreeableness >= 20
        ? 'You lead through service and relationship rather than authority. Your high agreeableness means your teams feel genuinely supported and valued — a leadership style that drives loyalty and psychological safety, particularly in knowledge-work environments.'
        : 'You lead best through expertise and quiet influence rather than positional authority. In roles that reward deep competence, your leadership impact can be very significant even without a formal management title.';
  } else {
    style = 'Individual Contributor / Specialist Leader';
    content =
      'You are likely most energised and effective as a deep specialist or subject-matter expert. This is not a limitation — organisations need people who go deep rather than wide, and "thought leadership" through expertise is a powerful and valued form of influence.';
  }

  return { title: 'Leadership Potential', style, content };
}

// ─── Section 5: Communication Style ──────────────────────────────────────────

function communicationStyle(scores) {
  const { extraversion, agreeableness } = scores;
  const bE = band(extraversion);
  const bA = band(agreeableness);

  let style = '';
  let content = '';
  let tips = [];

  if (bE === 'high' && bA === 'high') {
    style = 'Expressive & Collaborative';
    content =
      'You communicate with warmth, energy, and inclusiveness. You are comfortable in large groups, skilled at building consensus, and naturally draw others into conversation. You tend to think aloud and process through dialogue.';
    tips = [
      'Be mindful not to dominate group discussions — your energy can unintentionally crowd out quieter voices.',
      'In written communication, your natural verbosity is an asset; just ensure the core message is front-loaded.',
    ];
  } else if (bE === 'high' && bA !== 'high') {
    style = 'Directive & Assertive';
    content =
      'You communicate with directness and confidence. You state your position clearly, push back on ideas you disagree with, and are comfortable in confrontational conversations. You tend to be persuasive and can dominate discussions.';
    tips = [
      'Consciously invite dissenting views before drawing conclusions — your confidence can inadvertently shut down debate.',
      'Adapt your directness to context: useful in crisis, potentially off-putting in consensus-building moments.',
    ];
  } else if (bE !== 'high' && bA === 'high') {
    style = 'Warm & Listening-Centred';
    content =
      'You are an exceptional listener who communicates with empathy and care. People feel heard around you. You are more comfortable one-on-one or in small groups, where your warmth and attentiveness shine most.';
    tips = [
      'Speak up more in group settings — your perspective is valuable, even when you feel others have things covered.',
      'Practice asserting disagreement early and diplomatically — avoiding friction can let problems fester.',
    ];
  } else {
    style = 'Precise & Analytical';
    content =
      'You communicate deliberately and accurately. You think before speaking, choose your words carefully, and prefer written or structured formats over open-ended discussion. Others value your precision and credibility.';
    tips = [
      'In fast-moving discussions, a brief verbal contribution — even if incomplete — keeps you visible and included.',
      'Pair your analytical depth with brevity: most audiences need the headline before the detail.',
    ];
  }

  return { title: 'Communication Style', style, content, tips };
}

// ─── Section 6: Decision-Making Style ────────────────────────────────────────

function decisionMakingStyle(scores) {
  const { extraversion, agreeableness, conscientiousness, openness, adjustment } = scores;

  let style = '';
  let content = '';

  if (band(conscientiousness) === 'high' && band(openness) === 'low') {
    style = 'Structured & Rule-Based';
    content =
      'You make decisions by gathering relevant data, applying established criteria, and following a disciplined process. You are rarely impulsive and prefer to commit only when you have sufficient information. This approach minimises errors and builds trust — but can feel slow in highly ambiguous, fast-moving situations where perfect information is never available.';
  } else if (band(openness) === 'high' && band(conscientiousness) !== 'high') {
    style = 'Intuitive & Exploratory';
    content =
      'You make decisions by scanning broadly for patterns and possibilities, drawing on a wide range of inputs and your own intuition. You are comfortable with ambiguity and often make strong early judgements that prove correct — but you benefit from pairing your instinct with a structured review before committing to high-stakes choices.';
  } else if (band(extraversion) === 'high' && band(adjustment) === 'high') {
    style = 'Decisive & Action-Oriented';
    content =
      'You make decisions quickly, communicate them confidently, and move to action without prolonged deliberation. Under pressure, your speed is an asset. In complex situations requiring nuance, ensure you build in time for broader input before finalising your call.';
  } else if (band(agreeableness) === 'high') {
    style = 'Collaborative & Consensus-Seeking';
    content =
      'You prefer decisions that carry buy-in from the people affected. You naturally seek input, facilitate discussion, and look for solutions that work for everyone. This produces more durable decisions — but can slow you down when consensus is unachievable. Practice making the call yourself when group alignment proves elusive.';
  } else {
    style = 'Balanced & Context-Sensitive';
    content =
      'You adapt your decision-making approach to the situation. You can be data-driven when stakes are high, intuitive when speed matters, and collaborative when buy-in is essential. This versatility is a genuine asset, particularly for roles requiring judgement across diverse, unpredictable situations.';
  }

  // Unused variable fix
  void adjustment;

  return { title: 'Decision-Making Style', style, content };
}

// ─── Section 7: Career Suitability ───────────────────────────────────────────

function careerSuitability(scores) {
  const { extraversion, agreeableness, adjustment, conscientiousness, openness } = scores;

  const roles = [];

  if (band(extraversion) === 'high' && band(conscientiousness) === 'high') {
    roles.push('Senior Management / Executive Leadership');
    roles.push('Sales Leadership / Business Development');
    roles.push('Entrepreneurship / Founder');
  }
  if (band(agreeableness) === 'high' && band(extraversion) !== 'low') {
    roles.push('Human Resources / People & Culture');
    roles.push('Counselling / Coaching / Training & Development');
    roles.push('Customer Success / Client Relations');
  }
  if (band(openness) === 'high' && band(conscientiousness) !== 'low') {
    roles.push('Strategy & Innovation');
    roles.push('Research & Development');
    roles.push('Creative Direction / Design / Marketing');
  }
  if (band(conscientiousness) === 'high' && band(openness) !== 'high') {
    roles.push('Operations / Supply Chain Management');
    roles.push('Finance / Accounting / Audit');
    roles.push('Project / Programme Management');
  }
  if (band(adjustment) === 'high' && band(extraversion) !== 'high') {
    roles.push('Technical / Engineering Roles');
    roles.push('Research / Academia');
    roles.push('Quality Assurance / Risk Management');
  }

  // Deduplicate and cap at 6
  const unique = [...new Set(roles)].slice(0, 6);
  if (unique.length === 0) {
    unique.push('Consulting', 'Project Management', 'Data Analysis');
  }

  const content =
    'Based on the combination of your five dimension scores, you are likely to thrive in roles that reward your natural strengths. The following career clusters represent the strongest alignment with your personality profile:';

  void adjustment;
  return { title: 'Career Suitability', content, items: unique };
}

// ─── Section 8: Learning Style ────────────────────────────────────────────────

function learningStyle(scores) {
  const { openness, conscientiousness, extraversion } = scores;

  let style = '';
  let content = '';

  if (band(openness) === 'high' && band(conscientiousness) === 'high') {
    style = 'Structured Experimenter';
    content =
      'You love learning new things and have the discipline to see learning initiatives through to mastery. You do well with structured programmes (courses, certifications) that also leave room for exploration and creative application. You are likely a self-directed, voracious learner who reads widely across fields.';
  } else if (band(openness) === 'high') {
    style = 'Curious Explorer';
    content =
      'You are driven by curiosity and learn best when the material feels novel or challenges your existing mental models. You may start more learning projects than you finish — try to anchor each learning goal to a tangible output or application to increase follow-through.';
  } else if (band(conscientiousness) === 'high') {
    style = 'Methodical Mastery-Seeker';
    content =
      'You approach learning systematically — taking notes, practising consistently, and testing your understanding before moving on. You tend to go deep rather than wide, building genuine expertise in chosen domains. Highly structured programmes (textbooks, formal courses) suit you well.';
  } else if (band(extraversion) === 'high') {
    style = 'Social Learner';
    content =
      'You learn best through discussion, collaboration, and real-world application. Workshops, study groups, mentorship, and role-plays activate your learning more than solo study. Look for learning environments that involve peer interaction and immediate feedback.';
  } else {
    style = 'Reflective Learner';
    content =
      'You absorb and integrate information through reflection and independent study. You tend to think deeply about what you encounter, making connections across ideas over time. Journalling, quiet reading, and self-paced online learning all suit your style well.';
  }

  return { title: 'Learning Style', style, content };
}

// ─── Section 9: Stress & Coping Tendencies ───────────────────────────────────

function stressAndCoping(scores) {
  const { adjustment, conscientiousness, agreeableness } = scores;

  let tendencies = [];
  let coping = [];

  if (band(adjustment) === 'high') {
    tendencies.push('You experience stress in a measured way and recover quickly from setbacks.');
    tendencies.push('You are unlikely to catastrophise under pressure and often serve as a calming presence for others.');
    coping.push('Continue building on your natural resilience by maintaining consistent routines during high-stress periods.');
    coping.push('Use your emotional stability to mentor or support colleagues who struggle more under pressure.');
  } else if (band(adjustment) === 'mid') {
    tendencies.push('You manage stress adequately in most situations but may feel overwhelmed during prolonged or compounded pressure.');
    tendencies.push('You benefit from clear priorities during crunch periods — ambiguity amplifies your stress response.');
    coping.push('Build explicit recovery rituals after high-demand periods (exercise, rest, social connection).');
    coping.push('Identify your two or three most reliable stress signals early and respond proactively rather than reactively.');
  } else {
    tendencies.push('You are more sensitive to environmental stressors than most, which means you feel pressure more acutely — but also more empathetically than lower-sensitivity peers.');
    tendencies.push('Sustained high-pressure environments can drain your energy and reduce your effectiveness if boundaries are not protected.');
    coping.push('Prioritise roles and environments with predictable workloads and clear expectations where possible.');
    coping.push('Invest in stress-management practices (mindfulness, physical activity, adequate sleep) as a non-negotiable part of your performance toolkit.');
    coping.push('Build a trusted support network of colleagues or mentors you can debrief with during difficult periods.');
  }

  if (band(conscientiousness) === 'high') {
    tendencies.push('Over-preparation is a common stress response for you — you mitigate uncertainty by over-planning, which sometimes creates its own pressure.');
  }
  if (band(agreeableness) === 'high') {
    tendencies.push('You may absorb the emotional stress of those around you — be mindful of boundary-setting to protect your own reserves.');
  }

  return { title: 'Stress & Coping Tendencies', tendencies, coping };
}

// ─── Section 10: Motivational Drivers ────────────────────────────────────────

function motivationalDrivers(scores) {
  const { extraversion, agreeableness, conscientiousness, openness } = scores;

  const drivers = [];

  if (band(extraversion) === 'high') {
    drivers.push({ driver: 'Recognition & Status', detail: 'You are motivated by visible success, advancement, and the acknowledgement of peers and superiors.' });
    drivers.push({ driver: 'Competition', detail: 'Winning energises you; environments with clear performance metrics and competitive dynamics bring out your best.' });
  }
  if (band(agreeableness) === 'high') {
    drivers.push({ driver: 'Belonging & Harmony', detail: 'You are motivated by positive relationships and environments where people genuinely care for each other.' });
    drivers.push({ driver: 'Contribution & Service', detail: 'Knowing that your work meaningfully helps others is a powerful source of satisfaction.' });
  }
  if (band(conscientiousness) === 'high') {
    drivers.push({ driver: 'Achievement & Mastery', detail: 'You are motivated by doing things excellently — meeting and exceeding high standards is deeply satisfying.' });
    drivers.push({ driver: 'Order & Structure', detail: 'Clear goals, defined processes, and organised environments allow you to perform at your peak.' });
  }
  if (band(openness) === 'high') {
    drivers.push({ driver: 'Intellectual Stimulation', detail: 'You are energised by novelty, learning, and the opportunity to engage with complex or creative challenges.' });
    drivers.push({ driver: 'Autonomy & Creative Freedom', detail: 'Environments that constrain your thinking or limit experimentation quickly demotivate you.' });
  }
  if (drivers.length < 3) {
    drivers.push(
      { driver: 'Stability & Security', detail: 'Predictable, well-resourced environments allow you to deliver your best work consistently.' },
      { driver: 'Competence & Expertise', detail: 'Being genuinely good at what you do — and being respected for it — is a core motivator.' }
    );
  }

  return { title: 'Motivational Drivers', items: drivers.slice(0, 5) };
}

// ─── Section 11: Action Plan ──────────────────────────────────────────────────

function actionPlan(scores) {
  const { extraversion, agreeableness, adjustment, conscientiousness, openness } = scores;

  const actions = [];

  // Low-score development nudges
  if (band(extraversion) === 'low') {
    actions.push('Build your leadership visibility: volunteer to present in one meeting per week for the next month — not to change who you are, but to build the skill of projecting your expertise.');
  }
  if (band(agreeableness) === 'low') {
    actions.push('Invest in one genuine relationship each week: ask a colleague about their work or challenges with no agenda. Relational capital compounds over time.');
  }
  if (band(adjustment) === 'low') {
    actions.push('Establish a daily stress-recovery routine (10 minutes of movement, journalling, or meditation) and treat it as a non-negotiable work appointment.');
  }
  if (band(conscientiousness) === 'low') {
    actions.push('Implement a weekly planning ritual: every Sunday or Monday morning, spend 15 minutes writing your top 3 priorities for the week and the specific first action for each.');
  }
  if (band(openness) === 'low') {
    actions.push('Expose yourself to one new idea, domain, or perspective each week: a podcast, article, or conversation outside your usual field. Curiosity is a muscle — it grows with use.');
  }

  // Strength-leverage nudges
  if (band(extraversion) === 'high') {
    actions.push('Channel your leadership energy into mentoring: identify one junior colleague to support over the next quarter. Teaching accelerates your own growth while building your reputation.');
  }
  if (band(conscientiousness) === 'high') {
    actions.push('Guard against perfectionism: define "done" at the start of each project and commit to shipping at that standard rather than continuing to refine indefinitely.');
  }
  if (band(openness) === 'high') {
    actions.push('Convert your ideas into impact: for every three ideas you generate, push yourself to fully execute one before moving on to the next.');
  }
  if (band(adjustment) === 'high') {
    actions.push('Use your emotional stability to be a stabilising presence for your team during the next high-pressure period — consciously model calm and clarity for others.');
  }

  // Ensure 3–5 items
  while (actions.length < 3) {
    actions.push('Schedule a quarterly self-review: revisit your Big Five scores and ask yourself whether your actions over the past 90 days reflect your values and long-term goals.');
  }

  return { title: '30-Day Action Plan', items: actions.slice(0, 5) };
}

// ─── Master export ────────────────────────────────────────────────────────────

/**
 * Generates the complete 11-section paid report from the scores object.
 * @param {object} scores - { extraversion, agreeableness, adjustment, conscientiousness, openness }
 * @returns {object[]} Array of section objects, each with at minimum { title }
 */
function generateFullReport(scores) {
  return [
    overallProfile(scores),
    personalityTypeSummary(scores),
    majorStrengths(scores),
    leadershipPotential(scores),
    communicationStyle(scores),
    decisionMakingStyle(scores),
    careerSuitability(scores),
    learningStyle(scores),
    stressAndCoping(scores),
    motivationalDrivers(scores),
    actionPlan(scores),
  ];
}

/**
 * Returns score band labels for each dimension (used in the free tier too).
 */
function getDimensionLabels(scores) {
  return {
    extraversion: { band: band(scores.extraversion), label: EXTRAVERSION_LABELS[band(scores.extraversion)] },
    agreeableness: { band: band(scores.agreeableness), label: AGREEABLENESS_LABELS[band(scores.agreeableness)] },
    adjustment: { band: band(scores.adjustment), label: ADJUSTMENT_LABELS[band(scores.adjustment)] },
    conscientiousness: { band: band(scores.conscientiousness), label: CONSCIENTIOUSNESS_LABELS[band(scores.conscientiousness)] },
    openness: { band: band(scores.openness), label: OPENNESS_LABELS[band(scores.openness)] },
  };
}

module.exports = { generateFullReport, getDimensionLabels, band, BAND };
