import { logger } from 'app/logging/logger';
import { RootState } from 'app/store/store';
import {
  DenoiseLatentsInvocation,
  NonNullableGraph,
  ONNXTextToLatentsInvocation,
} from 'services/api/types';
import { addControlNetToLinearGraph } from './addControlNetToLinearGraph';
import { addHrfToGraph } from './addHrfToGraph';
import { addIPAdapterToLinearGraph } from './addIPAdapterToLinearGraph';
import { addLinearUIOutputNode } from './addLinearUIOutputNode';
import { addLoRAsToGraph } from './addLoRAsToGraph';
import { addNSFWCheckerToGraph } from './addNSFWCheckerToGraph';
import { addSeamlessToLinearGraph } from './addSeamlessToLinearGraph';
import { addT2IAdaptersToLinearGraph } from './addT2IAdapterToLinearGraph';
import { addVAEToGraph } from './addVAEToGraph';
import { addWatermarkerToGraph } from './addWatermarkerToGraph';
import {
  CLIP_SKIP,
  DENOISE_LATENTS,
  LATENTS_TO_IMAGE,
  MAIN_MODEL_LOADER,
  NEGATIVE_CONDITIONING,
  NOISE,
  ONNX_MODEL_LOADER,
  POSITIVE_CONDITIONING,
  SEAMLESS,
  TEXT_TO_IMAGE_GRAPH,
} from './constants';
import { addCoreMetadataNode } from './metadata';

export const buildLinearTextToImageGraph = (
  state: RootState
): NonNullableGraph => {
  const log = logger('nodes');
  const {
    positivePrompt,
    negativePrompt,
    model,
    cfgScale: cfg_scale,
    cfgRescaleMultiplier: cfg_rescale_multiplier,
    scheduler,
    steps,
    width,
    height,
    clipSkip,
    shouldUseCpuNoise,
    vaePrecision,
    seamlessXAxis,
    seamlessYAxis,
    seed,
  } = state.generation;

  const use_cpu = shouldUseCpuNoise;

  if (!model) {
    log.error('No model found in state');
    throw new Error('No model found in state');
  }

  const fp32 = vaePrecision === 'fp32';
  const is_intermediate = true;
  const isUsingOnnxModel = model.model_type === 'onnx';

  let modelLoaderNodeId = isUsingOnnxModel
    ? ONNX_MODEL_LOADER
    : MAIN_MODEL_LOADER;

  const modelLoaderNodeType = isUsingOnnxModel
    ? 'onnx_model_loader'
    : 'main_model_loader';

  const t2lNode: DenoiseLatentsInvocation | ONNXTextToLatentsInvocation =
    isUsingOnnxModel
      ? {
          type: 't2l_onnx',
          id: DENOISE_LATENTS,
          is_intermediate,
          cfg_scale,
          scheduler,
          steps,
        }
      : {
          type: 'denoise_latents',
          id: DENOISE_LATENTS,
          is_intermediate,
          cfg_scale,
          cfg_rescale_multiplier,
          scheduler,
          steps,
          denoising_start: 0,
          denoising_end: 1,
        };

  /**
   * The easiest way to build linear graphs is to do it in the node editor, then copy and paste the
   * full graph here as a template. Then use the parameters from app state and set friendlier node
   * ids.
   *
   * The only thing we need extra logic for is handling randomized seed, control net, and for img2img,
   * the `fit` param. These are added to the graph at the end.
   */

  // copy-pasted graph from node editor, filled in with state values & friendly node ids

  // TODO: Actually create the graph correctly for ONNX
  const graph: NonNullableGraph = {
    id: TEXT_TO_IMAGE_GRAPH,
    nodes: {
      [modelLoaderNodeId]: {
        type: modelLoaderNodeType,
        id: modelLoaderNodeId,
        is_intermediate,
        model,
      },
      [CLIP_SKIP]: {
        type: 'clip_skip',
        id: CLIP_SKIP,
        skipped_layers: clipSkip,
        is_intermediate,
      },
      [POSITIVE_CONDITIONING]: {
        type: isUsingOnnxModel ? 'prompt_onnx' : 'compel',
        id: POSITIVE_CONDITIONING,
        prompt: positivePrompt,
        is_intermediate,
      },
      [NEGATIVE_CONDITIONING]: {
        type: isUsingOnnxModel ? 'prompt_onnx' : 'compel',
        id: NEGATIVE_CONDITIONING,
        prompt: negativePrompt,
        is_intermediate,
      },
      [NOISE]: {
        type: 'noise',
        id: NOISE,
        seed,
        width,
        height,
        use_cpu,
        is_intermediate,
      },
      [t2lNode.id]: t2lNode,
      [LATENTS_TO_IMAGE]: {
        type: isUsingOnnxModel ? 'l2i_onnx' : 'l2i',
        id: LATENTS_TO_IMAGE,
        fp32,
        is_intermediate,
        use_cache: false,
      },
    },
    edges: [
      // Connect Model Loader to UNet and CLIP Skip
      {
        source: {
          node_id: modelLoaderNodeId,
          field: 'unet',
        },
        destination: {
          node_id: DENOISE_LATENTS,
          field: 'unet',
        },
      },
      {
        source: {
          node_id: modelLoaderNodeId,
          field: 'clip',
        },
        destination: {
          node_id: CLIP_SKIP,
          field: 'clip',
        },
      },
      // Connect CLIP Skip to Conditioning
      {
        source: {
          node_id: CLIP_SKIP,
          field: 'clip',
        },
        destination: {
          node_id: POSITIVE_CONDITIONING,
          field: 'clip',
        },
      },
      {
        source: {
          node_id: CLIP_SKIP,
          field: 'clip',
        },
        destination: {
          node_id: NEGATIVE_CONDITIONING,
          field: 'clip',
        },
      },
      // Connect everything to Denoise Latents
      {
        source: {
          node_id: POSITIVE_CONDITIONING,
          field: 'conditioning',
        },
        destination: {
          node_id: DENOISE_LATENTS,
          field: 'positive_conditioning',
        },
      },
      {
        source: {
          node_id: NEGATIVE_CONDITIONING,
          field: 'conditioning',
        },
        destination: {
          node_id: DENOISE_LATENTS,
          field: 'negative_conditioning',
        },
      },
      {
        source: {
          node_id: NOISE,
          field: 'noise',
        },
        destination: {
          node_id: DENOISE_LATENTS,
          field: 'noise',
        },
      },
      // Decode Denoised Latents To Image
      {
        source: {
          node_id: DENOISE_LATENTS,
          field: 'latents',
        },
        destination: {
          node_id: LATENTS_TO_IMAGE,
          field: 'latents',
        },
      },
    ],
  };

  addCoreMetadataNode(
    graph,
    {
      generation_mode: 'txt2img',
      cfg_scale,
      cfg_rescale_multiplier,
      height,
      width,
      positive_prompt: positivePrompt,
      negative_prompt: negativePrompt,
      model,
      seed,
      steps,
      rand_device: use_cpu ? 'cpu' : 'cuda',
      scheduler,
      clip_skip: clipSkip,
    },
    LATENTS_TO_IMAGE
  );

  // Add Seamless To Graph
  if (seamlessXAxis || seamlessYAxis) {
    addSeamlessToLinearGraph(state, graph, modelLoaderNodeId);
    modelLoaderNodeId = SEAMLESS;
  }

  // optionally add custom VAE
  addVAEToGraph(state, graph, modelLoaderNodeId);

  // add LoRA support
  addLoRAsToGraph(state, graph, DENOISE_LATENTS, modelLoaderNodeId);

  // add controlnet, mutating `graph`
  addControlNetToLinearGraph(state, graph, DENOISE_LATENTS);

  // add IP Adapter
  addIPAdapterToLinearGraph(state, graph, DENOISE_LATENTS);

  addT2IAdaptersToLinearGraph(state, graph, DENOISE_LATENTS);

  // High resolution fix.
  // NOTE: Not supported for onnx models.
  if (state.generation.hrfEnabled && !isUsingOnnxModel) {
    addHrfToGraph(state, graph);
  }

  // NSFW & watermark - must be last thing added to graph
  if (state.system.shouldUseNSFWChecker) {
    // must add before watermarker!
    addNSFWCheckerToGraph(state, graph);
  }

  if (state.system.shouldUseWatermarker) {
    // must add after nsfw checker!
    addWatermarkerToGraph(state, graph);
  }

  addLinearUIOutputNode(state, graph);

  return graph;
};
