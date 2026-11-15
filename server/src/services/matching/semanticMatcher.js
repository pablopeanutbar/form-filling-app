import { pipeline } from '@huggingface/transformers';
import { CANONICAL_FIELDS, getFieldByKey } from './fieldRegistry.js';

let extractorInstance = null;
let extractorPromise = null;
let cachedCanonicalEmbeddings = null;
let canonicalInitPromise = null;

/**
 * Initialize or retrieve the singleton MiniLM pipeline
 * Safe for concurrent callers.
 */
export const getExtractor = async () => {
  if (extractorInstance) {
    return extractorInstance;
  }

  if (extractorPromise) {
    return extractorPromise;
  }

  extractorPromise = (async () => {
    try {
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      extractorInstance = extractor;
      return extractor;
    } catch (err) {
      extractorPromise = null;
      throw new Error(`Failed to load MiniLM embedding model: ${err.message}`);
    }
  })();

  return extractorPromise;
};

/**
 * Compute the dot product between two normalized vectors (cosine similarity)
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
};

/**
 * Formulate semantic representation text for a canonical registry field
 */
const getCanonicalFieldText = (fieldDef) => {
  const aliases = Array.isArray(fieldDef.aliases) ? fieldDef.aliases.slice(0, 4).join(', ') : '';
  return `${fieldDef.label}: ${fieldDef.description}. Common terms: ${aliases}`;
};

/**
 * Pre-compute and cache normalized embeddings for all canonical fields
 */
export const initCanonicalEmbeddings = async () => {
  if (cachedCanonicalEmbeddings) {
    return cachedCanonicalEmbeddings;
  }

  if (canonicalInitPromise) {
    return canonicalInitPromise;
  }

  canonicalInitPromise = (async () => {
    const extractor = await getExtractor();
    const texts = CANONICAL_FIELDS.map(getCanonicalFieldText);

    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const rawVectors = output.tolist();

    cachedCanonicalEmbeddings = CANONICAL_FIELDS.map((fieldDef, idx) => ({
      key: fieldDef.key,
      label: fieldDef.label,
      category: fieldDef.category,
      dataType: fieldDef.dataType,
      vector: rawVectors[idx]
    }));

    return cachedCanonicalEmbeddings;
  })();

  return canonicalInitPromise;
};

/**
 * Build rich query text from extracted form field attributes
 */
export const buildFieldQueryText = (field) => {
  const parts = [];
  if (field.section) parts.push(`Section: ${field.section}`);
  if (field.label) parts.push(`Label: ${field.label}`);
  if (field.placeholder) parts.push(`Placeholder: ${field.placeholder}`);
  if (field.name) parts.push(`Name: ${field.name}`);
  if (field.id && field.id !== field.name) parts.push(`ID: ${field.id}`);

  return parts.length > 0 ? parts.join('. ') : (field.name || field.id || 'form input field');
};

/**
 * Rank canonical field candidates for a single extracted form field
 *
 * @param {Object} field Extracted form field
 * @param {Object} options Options like topK, minScore
 * @returns {Promise<Array>} Ranked candidate objects
 */
export const rankCandidates = async (field, options = {}) => {
  const topK = options.topK || 5;
  const minScore = options.minScore || 0.40;

  try {
    const canonicals = await initCanonicalEmbeddings();
    const extractor = await getExtractor();

    const queryText = buildFieldQueryText(field);
    const output = await extractor([queryText], { pooling: 'mean', normalize: true });
    const queryVector = output.tolist()[0];

    const ranked = canonicals
      .map((item) => {
        const score = cosineSimilarity(queryVector, item.vector);
        return {
          canonicalKey: item.key,
          label: item.label,
          category: item.category,
          dataType: item.dataType,
          score: Math.round(score * 10000) / 10000,
          method: 'semantic_embedding',
          explanation: `MiniLM semantic similarity score: ${(score * 100).toFixed(1)}%`
        };
      })
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked;
  } catch (err) {
    return [];
  }
};

/**
 * Efficiently rank candidates for a batch of form fields
 * Embeds all query texts in a single transformer pass
 *
 * @param {Array<Object>} fields List of extracted form fields
 * @param {Object} options Options like topK, minScore
 * @returns {Promise<Map<string, Array>>} Map from fieldId or index to ranked candidates
 */
export const rankCandidatesBatch = async (fields, options = {}) => {
  const topK = options.topK || 5;
  const minScore = options.minScore || 0.40;

  if (!fields || fields.length === 0) {
    return new Map();
  }

  try {
    const canonicals = await initCanonicalEmbeddings();
    const extractor = await getExtractor();

    const queryTexts = fields.map(buildFieldQueryText);
    const output = await extractor(queryTexts, { pooling: 'mean', normalize: true });
    const queryVectors = output.tolist();

    const resultMap = new Map();

    for (let i = 0; i < fields.length; i++) {
      const fieldId = fields[i].fieldId || String(i);
      const qVec = queryVectors[i];

      const ranked = canonicals
        .map((item) => {
          const score = cosineSimilarity(qVec, item.vector);
          return {
            canonicalKey: item.key,
            label: item.label,
            category: item.category,
            dataType: item.dataType,
            score: Math.round(score * 10000) / 10000,
            method: 'semantic_embedding',
            explanation: `MiniLM semantic similarity score: ${(score * 100).toFixed(1)}%`
          };
        })
        .filter((c) => c.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      resultMap.set(fieldId, ranked);
    }

    return resultMap;
  } catch (err) {
    const fallbackMap = new Map();
    for (let i = 0; i < fields.length; i++) {
      const fieldId = fields[i].fieldId || String(i);
      fallbackMap.set(fieldId, []);
    }
    return fallbackMap;
  }
};

