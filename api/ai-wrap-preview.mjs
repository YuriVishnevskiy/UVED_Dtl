import {randomUUID} from 'node:crypto';

const materials = {
  gloss: 'deep gloss with sharp clear-coat reflections',
  matte: 'matte, softly diffused highlights',
  satin: 'satin with soft silk-like reflections',
  metallic: 'fine metallic flake following panel curvature',
  pearl: 'subtle pearlescent tones in highlights',
  shift: 'angle-dependent color shifts under the original lighting',
  texture: 'fine surface texture at realistic scale'
};

const limits = new Map();
const windowMs = 60 * 60 * 1000;

function reserve(ip, now) {
  for (const [key, value] of limits) {
    if (value.until <= now) limits.delete(key);
  }
  const limit = Math.max(1, Number(process.env.UVED_GENERATIONS_PER_HOUR) || 5);
  const entry = limits.get(ip) ?? {used: 0, until: now + windowMs};
  if (entry.used >= limit || limits.size >= 5000) return false;
  entry.used++;
  limits.set(ip, entry);
  return true;
}

function png(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  if (bytes.subarray(12, 16).toString() !== 'IHDR') return null;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width && height && width <= 1536 && height <= 1536 ? {bytes, width, height} : null;
}

const aiImageProvider = {
  async generateWrapPreview({source, mask, color, finish}) {
    const form = new FormData();
    form.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst');
    form.append('image[]', new Blob([source.bytes], {type: 'image/png'}), 'car.png');
    form.set('mask', new Blob([mask.bytes], {type: 'image/png'}), 'mask.png');
    form.set('size', source.width > source.height ? '1536x1024' : source.width < source.height ? '1024x1536' : '1024x1024');
    form.set('output_format', 'jpeg');
    form.set('prompt', `Photorealistic automotive wrap edit. Preserve the exact original vehicle, body geometry, proportions, panel gaps, wheels, windows, lights, mirrors, trim, background, camera angle, lighting and shadows. Apply ${color} automotive film with ${materials[finish]} only to the masked painted exterior panels. Preserve natural reflections and panel curvature. Do not redesign or replace anything.`);
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + process.env.OPENAI_API_KEY},
      body: form,
      signal: AbortSignal.timeout(110000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error('Image provider returned ' + response.status);
      error.providerStatus = response.status;
      error.providerCode = payload?.error?.code;
      throw error;
    }
    const image = payload?.data?.[0]?.b64_json;
    if (!image) throw new Error('Missing provider result');
    return 'data:image/jpeg;base64,' + image;
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const fail = (code, message) => res.status(code).json({status: 'failed', message});
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(405, 'Используйте POST.');
  }
  if (!req.headers['content-type']?.startsWith('application/json')) return fail(415, 'Ожидается JSON.');
  if (req.headers['sec-fetch-site'] === 'cross-site') return fail(403, 'Запрос отклонён.');
  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return fail(400, 'Некорректный запрос.'); }
  }
  const {sourceImage, bodyMask, filmColor, filmFinish} = data ?? {};
  if ([sourceImage, bodyMask].some(value => typeof value !== 'string' || value.length > 3900000) ||
      sourceImage.length + bodyMask.length > 3900000) return fail(413, 'Фото слишком большое.');
  const source = png(sourceImage);
  const mask = png(bodyMask);
  if (!source || !mask || source.width !== mask.width || source.height !== mask.height ||
      mask.bytes[25] !== 6 || typeof filmColor !== 'string' || !/^#[\da-f]{6}$/i.test(filmColor) ||
      typeof filmFinish !== 'string' || !Object.hasOwn(materials, filmFinish)) {
    return fail(400, 'Проверьте фото, область кузова и параметры плёнки.');
  }
  if (!process.env.OPENAI_API_KEY) return fail(503, 'ИИ-примерка ещё не подключена на сервере.');
  const ip = req.headers['x-vercel-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown';
  if (!reserve(ip, Date.now())) return fail(429, 'Лимит примерок исчерпан. Попробуйте позже.');
  try {
    const resultImage = await aiImageProvider.generateWrapPreview({source, mask, color: filmColor, finish: filmFinish});
    return res.status(200).json({resultImage, generationId: randomUUID(), status: 'completed'});
  } catch (error) {
    console.error('UVED image edit:', error.message, error.providerCode ?? '');
    if (error.providerCode === 'credit_balance_exhausted') {
      return fail(503, 'На балансе OpenAI API закончились кредиты. Пополните баланс API и нажмите «Повторить».');
    }
    if (error.providerCode === 'insufficient_quota' || error.providerCode === 'billing_hard_limit_reached') {
      return fail(503, 'Лимит OpenAI API исчерпан. Проверьте баланс и лимиты проекта.');
    }
    if (error.providerStatus === 401) {
      return fail(503, 'OpenAI отклонил ключ API. Проверьте его срок действия и перезапустите сервер с действующим ключом.');
    }
    if (error.providerStatus === 403 || error.providerCode === 'model_not_found') {
      return fail(503, 'OpenAI не предоставил доступ к модели. Проверьте права ключа на Images и доступ проекта к модели.');
    }
    if (error.providerStatus === 429) {
      return fail(429, 'OpenAI ограничил частоту запросов. Попробуйте чуть позже.');
    }
    if (error.name === 'TimeoutError') {
      return fail(504, 'OpenAI не успел обработать фото. Попробуйте ещё раз.');
    }
    return fail(502, 'Не удалось создать примерку. Попробуйте ещё раз.');
  }
}
