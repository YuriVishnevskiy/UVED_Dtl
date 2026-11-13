// SegFormer B0, fine-tuned to distinguish car_body from car_non_body.
const modelDirectory = new URL('./vendor/body-mask/', import.meta.url);
const inputSize = 512;
const mean = [.485, .456, .406];
const deviation = [.229, .224, .225];
let modelPromise;

async function loadModel() {
  modelPromise ??= (async () => {
    const ort = await import('./vendor/body-mask/ort.wasm.min.mjs');
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = modelDirectory.href;
    const session = await ort.InferenceSession.create(new URL('body.onnx', modelDirectory).href, {
      executionProviders: ['wasm']
    });
    return {session, Tensor: ort.Tensor};
  })().catch(error => {
    modelPromise = null;
    throw error;
  });
  return modelPromise;
}

export async function detectBody(image) {
  const {session, Tensor} = await loadModel();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = inputSize;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(image, 0, 0, inputSize, inputSize);
  const pixels = context.getImageData(0, 0, inputSize, inputSize).data;
  const area = inputSize ** 2;
  const input = new Float32Array(area * 3);
  for (let channel = 0; channel < 3; channel++) {
    for (let i = 0; i < area; i++) {
      input[channel * area + i] = (pixels[i * 4 + channel] / 255 - mean[channel]) / deviation[channel];
    }
  }

  const {logits} = await session.run({pixel_values: new Tensor('float32', input, [1, 3, inputSize, inputSize])});
  const [, , height, width] = logits.dims;
  canvas.width = width;
  canvas.height = height;
  const mask = context.createImageData(width, height);
  const maskArea = width * height;
  let painted = 0;
  for (let i = 0; i < maskArea; i++) {
    const margin = logits.data[maskArea + i] - Math.max(logits.data[i], logits.data[2 * maskArea + i]);
    if (margin <= -1) continue;
    mask.data[i * 4 + 3] = 255 * Math.min(1, (margin + 1) / 5.4);
    painted++;
  }
  if (painted < maskArea * .005) return null;
  context.putImageData(mask, 0, 0);
  return canvas;
}
