import { SURVEY_QUESTIONS } from './defaults.mjs';
import { clamp } from './util.mjs';

const CHOICE_IDS = SURVEY_QUESTIONS.filter((q) => q.type === 'choice').map((q) => q.id);

export function computeSurvey(answers) {
  let raw = 0;
  for (const q of SURVEY_QUESTIONS) {
    if (q.type !== 'choice') continue;
    const chosen = q.options.find((o) => o.v === String(answers[q.id]));
    if (chosen) raw += chosen.s;
  }
  let min = 0, max = 0;
  for (const q of SURVEY_QUESTIONS) {
    if (q.type !== 'choice') continue;
    min += Math.min(...q.options.map((o) => o.s));
    max += Math.max(...q.options.map((o) => o.s));
  }
  const declared = clamp(Number(answers.declared) || 5, 5, 40);
  const basePct = ((raw - min) / (max - min)) * 100;
  const declaredPct = ((declared - 5) / 35) * 100;
  const score = Math.round(clamp(basePct * 0.85 + declaredPct * 0.15, 0, 100));
  return { score, raw, declared, answers };
}

export function validateAnswers(answers) {
  for (const id of CHOICE_IDS) {
    if (!answers?.[id]) return `Falta responder: ${SURVEY_QUESTIONS.find((q) => q.id === id)?.label}`;
  }
  return null;
}
