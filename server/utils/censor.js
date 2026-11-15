'use strict';

/**
 * Normaliza uma string removendo acentos e convertendo leetspeak comum.
 */
function normalizeForCensor(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1'); // reduz repetições excessivas: porrrrra -> porra
}

/**
 * Expressões regulares com limite de palavra (\b) ou delimitadores para evitar falsos positivos
 * (Ex: "disputa" não pode ativar "puta", "computador" não pode ativar "puta" ou "cu", "custo" não pode ativar "cu").
 */
const PROFANITY_PATTERNS = [
  // Termos sexuais explícitos / genitais
  /\b(bucet[as]?|bocet[as]?|bucetinh[as]?)\b/i,
  /\b(caralh[os]?|caralhin[os]?)\b/i,
  /\b(foder|fod[ae]|fodid[os]?|fodedor|fodase|foda-se|fudid[os]?|fudeu)\b/i,
  /\b(arrombad[os]?|arrombadinh[os]?)\b/i,
  /\b(pau|pauz[ao]o|pauzinh[os]?)\b/i,
  /\b(pic[as]?|pic[ao]o)\b/i,
  /\b(pint[os]?|pint[ao]o)\b/i,
  /\b(cu|cuz[ao]o|cus[ao]o|cuzinh[os]?)\b/i,
  /\b(punhet[as]?|punheteir[os]?)\b/i,
  /\b(goz[os]?|gozar|gozad[as]?)\b/i,
  /\b(xoxot[as]?|xoxotinh[as]?|xana)\b/i,
  /\b(siriric[as]?)\b/i,
  /\b(boquet[es]?|boqueteir[os]?)\b/i,
  /\b(chup[ao]o|chupeta)\b/i,
  /\b(penis|vagin[as]?)\b/i,
  /\b(porn[os]?|pornografia|putari[as]?)\b/i,
  /\b(orgasm[os]?|masturb[ao]|masturbaca[os]?)\b/i,
  /\b(prostitut[as]?|garot[ao] de programa)\b/i,

  // Ofensas e xingamentos graves
  /\b(put[as]?|putinh[as]?)\b/i,
  /\b(vadi[as]?|vagabund[as]?)\b/i,
  /\b(desgrac[as]?|desgracad[os]?)\b/i,
  /\b(porr[as]?|porrinh[as]?)\b/i,
  /\b(merd[as]?|merdinh[as]?)\b/i,
  /\b(corn[os]?|cornud[os]?)\b/i,
  /\b(imbecil|imbecis|retardad[os]?|idiot[as]?)\b/i,
  /\b(fdp|f\.d\.p|filh[os]? d[ae] put[as]?)\b/i,

  // Discurso de ódio, termos preconceituosos, racismo, homofobia e intolerância
  /\b(viad[os]?|viadinh[os]?|bich[as]?|boiol[as]?)\b/i,
  /\b(sapata[os]?|sapatinh[as]?)\b/i,
  /\b(travec[os]?|travesti)\b/i,
  /\b(macac[os]?|crioul[os]?|negro fedid[os]?|preto fedid[os]?|preto lixo)\b/i,
  /\b(nazis[tm][as]?|hitler|holocausto)\b/i,
  /\b(estupr[os]?|estuprad[os]?|estuprador[es]?)\b/i,
  /\b(pedofil[os]?|pedofili[as]?)\b/i,
  /\b(suicidi[os]?|se mate|morra)\b/i,
];

/**
 * Verifica se o texto contém palavras ofensivas, preconceituosas ou +18.
 * @param {string} text
 * @returns {boolean}
 */
function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalizeForCensor(text);

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Censura palavras ofensivas substituindo-as por asteriscos no chat.
 * @param {string} text
 * @returns {string}
 */
function censorText(text) {
  if (!text || typeof text !== 'string') return '';
  let result = text;

  // Percorre cada palavra e testa individualmente
  const words = text.split(/(\s+|[.,!?;:()])/);
  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    const normalized = normalizeForCensor(rawWord);
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(normalized)) {
        words[i] = '*'.repeat(rawWord.length);
        break;
      }
    }
  }

  result = words.join('');

  // Checa também frases compostas (ex: "filho da puta")
  const fullNorm = normalizeForCensor(result);
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(fullNorm)) {
      result = result.replace(pattern, match => '*'.repeat(match.length));
    }
  }

  return result;
}

module.exports = {
  containsProfanity,
  censorText,
  normalizeForCensor,
};
