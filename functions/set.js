/**
 * iOS Location Spoofer Web
 * Copyright (c) 2026 akudamatata
 * https://github.com/akudamatata/iOS-Location-Spoofer-Web
 * Licensed under CC BY-NC-SA 4.0
 * 修改：校验坐标，并在存储未绑定或写入失败时返回错误。
 */

import {
  DEFAULT_LOC,
  authOk,
  jsonResponse,
  errorResponse,
  corsHeaders
} from './_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!authOk(request, env)) {
    return errorResponse('unauthorized', 401);
  }

  if (!env.SPOOFER_DATA) {
    return errorResponse('missing SPOOFER_DATA binding', 503);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return errorResponse('bad json', 400);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return errorResponse('expected a JSON object', 400);
  }

  for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (key in data &&
        (!Number.isFinite(data[key]) || Math.abs(data[key]) > limit)) {
      return errorResponse('invalid ' + key, 400);
    }
  }

  try {
    const current =
      await env.SPOOFER_DATA.get('loc', { type: 'json' }) || DEFAULT_LOC;

    const updated = { ...current };
    for (const key of [
      'latitude',
      'longitude',
      'altitude',
      'horizontalAccuracy',
      'verticalAccuracy'
    ]) {
      if (typeof data[key] === 'number') {
        updated[key] = data[key];
      }
    }

    await env.SPOOFER_DATA.put('loc', JSON.stringify(updated));
    return jsonResponse(updated);
  } catch {
    return errorResponse('location storage unavailable', 503);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}