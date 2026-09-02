export const QUESTIONNAIRE = [
  { id: 1,  text: "I step forward and take charge in leaderless situations." },
  { id: 2,  text: "I am concerned about getting along well with others." },
  { id: 3,  text: "I have good self-control; I don't get emotional and get angry and yell." },
  { id: 4,  text: "I'm dependable; when I say I will do something, it's done well and on time." },
  { id: 5,  text: "I try to do things differently to improve my performance." },
  { id: 6,  text: "I enjoy competing and winning; losing bothers me." },
  { id: 7,  text: "I enjoy having lots of friends and going to parties." },
  { id: 8,  text: "I perform well under pressure." },
  { id: 9,  text: "I work hard to be successful." },
  { id: 10, text: "I go to new places and enjoy traveling." },
  { id: 11, text: "I am outgoing and willing to confront people when in conflict." },
  { id: 12, text: "I try to see things from other people's points of view." },
  { id: 13, text: "I am an optimistic person who sees the positive side of situations (the cup is half full)." },
  { id: 14, text: "I am a well-organized person." },
  { id: 15, text: "When I go to a new restaurant, I order foods I haven't tried." },
  { id: 16, text: "I want to climb the corporate ladder to as high a level of management as I can." },
  { id: 17, text: "I want other people to like me and to be viewed as very friendly." },
  { id: 18, text: "I give people lots of praise and encouragement; I don't put people down and criticize." },
  { id: 19, text: "I conform by following the rules of an organization." },
  { id: 20, text: "I volunteer to be the first to learn or do new tasks at work." },
  { id: 21, text: "I try to influence other people to get my way." },
  { id: 22, text: "I enjoy working with others more than working alone." },
  { id: 23, text: "I view myself as being relaxed and secure, rather than nervous and insecure." },
  { id: 24, text: "I am considered credible because I do a good job and come through for people." },
  { id: 25, text: "When people suggest doing things differently, I support them and help bring about change; I don't make statements such as, \"It will not work,\" \"We never did it before,\" \"Who else did it?\" or \"We can't do it.\"" },
]

export const DIMENSIONS = {
  extraversion:      { label: 'Surgency / Extraversion', items: [1, 6, 11, 16, 21], color: '#0ea5e9' },
  agreeableness:     { label: 'Agreeableness',            items: [2, 7, 12, 17, 22], color: '#10b981' },
  adjustment:        { label: 'Adjustment',               items: [3, 8, 13, 18, 23], color: '#6366f1' },
  conscientiousness: { label: 'Conscientiousness',        items: [4, 9, 14, 19, 24], color: '#f59e0b' },
  openness:          { label: 'Openness to Experience',   items: [5, 10, 15, 20, 25], color: '#ec4899' },
}

// Free-tier interpretation (High/Mid/Low per dimension)
export const INTERPRETATIONS = {
  extraversion: {
    high: {
      headline: 'Natural Leader & Social Energizer',
      body: 'You take charge naturally and thrive in the spotlight. Energetic, assertive, and competitive, you are drawn to leadership roles and social settings. You gain energy from being around people and are most satisfied when driving initiatives forward. Your boldness inspires others to act.',
    },
    mid: {
      headline: 'Situationally Assertive',
      body: 'You balance social energy with a preference for selective engagement. You can lead confidently when the situation calls for it but also appreciate working independently or in small groups. You are comfortable both asserting yourself and stepping back — a genuinely flexible social style.',
    },
    low: {
      headline: 'Reflective & Collaborative Contributor',
      body: 'You tend to let others take the lead and prefer collaborating in the background over competing for the spotlight. This is a strength in team settings that value steady, low-ego contributors who do excellent work without needing recognition. Your listening skills and measured presence create psychological safety for others.',
    },
  },
  agreeableness: {
    high: {
      headline: 'Warm, Empathetic Team Builder',
      body: 'You are genuinely concerned with others\' wellbeing and highly skilled at building trust and rapport. You resolve conflict through empathy and compromise, prioritise harmony, and are seen by others as approachable and supportive. Your high agreeableness creates the relational glue that holds teams together.',
    },
    mid: {
      headline: 'Diplomatically Balanced',
      body: 'You care about relationships while also being willing to advocate for your own position. You can collaborate warmly when stakes are social but negotiate firmly when interests diverge. This balance allows you to maintain good relationships without becoming a pushover — a genuinely effective interpersonal style.',
    },
    low: {
      headline: 'Pragmatic & Results-Focused',
      body: 'You prioritise honesty and results over harmony, which can make you a refreshingly direct colleague. You are not swayed by social pressure and are willing to say what others won\'t. In environments that value candour and individual accountability, this directness is a significant asset.',
    },
  },
  adjustment: {
    high: {
      headline: 'Calm, Resilient, and Emotionally Grounded',
      body: 'You handle pressure with remarkable composure. Setbacks roll off you, you rarely over-react, and you consistently project stability that others find reassuring. Your emotional resilience is a genuine competitive advantage — you are at your best precisely when the stakes are highest and others struggle.',
    },
    mid: {
      headline: 'Emotionally Self-Aware',
      body: 'You manage your emotional responses well in most situations, though sustained or compounded pressure can test your equilibrium. You\'re aware of your stress triggers, which is itself a major advantage. Building deliberate recovery habits after high-demand periods will further strengthen your emotional stability.',
    },
    low: {
      headline: 'Emotionally Sensitive & Empathetic',
      body: 'You feel the weight of challenges more acutely than many — which means you also feel the highs more deeply, connect with others\' struggles more naturally, and bring a level of emotional attunement that high-stability individuals sometimes lack. Investing in stress-management practices will help you sustain your performance through demanding periods.',
    },
  },
  conscientiousness: {
    high: {
      headline: 'Reliable, Disciplined, and Excellence-Driven',
      body: 'You are deeply dependable — when you commit to something, it gets done well and on time. You are organised, goal-oriented, and hold yourself to high standards. Teams and organisations treasure people like you because your reliability creates the conditions for everyone around you to trust and build on your contributions.',
    },
    mid: {
      headline: 'Practically Disciplined',
      body: 'You have a solid work ethic and generally follow through on commitments, while maintaining enough flexibility to adapt when plans change. You structure your work without being rigid — an effective balance for roles that require both planning and responsiveness.',
    },
    low: {
      headline: 'Flexible, Spontaneous, and Adaptive',
      body: 'You are less constrained by routine and structure, which gives you an agility that highly conscientious individuals sometimes lack. You adapt quickly when circumstances change and resist over-planning. Developing simple routines for your most important commitments will amplify your natural adaptability with just enough consistency to build trust.',
    },
  },
  openness: {
    high: {
      headline: 'Creative, Curious, and Innovation-Driven',
      body: 'You are intellectually voracious and energised by novelty. You seek out new experiences, ideas, and ways of doing things — and you frequently see angles that others miss. In roles that reward creativity and strategic thinking, your openness is a powerful differentiator. You thrive when given latitude to explore and experiment.',
    },
    mid: {
      headline: 'Selectively Open to New Ideas',
      body: 'You welcome fresh perspectives and new approaches when they are clearly useful, while staying grounded in what has been proven to work. You balance innovation with pragmatism — a combination that helps teams avoid both stagnation and reckless experimentation.',
    },
    low: {
      headline: 'Grounded, Practical, and Consistent',
      body: 'You prefer reliable, proven approaches over experimentation for its own sake. Your practicality and preference for stability make you a steadying influence in environments prone to change fatigue. You do your best work when expectations are clear and systems are well-established — and you can be relied upon to execute consistently within them.',
    },
  },
}

export const PAYMENT_AMOUNT = 99
