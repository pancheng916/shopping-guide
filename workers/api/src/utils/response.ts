export function jsonResponse<T>(
  data: T,
  code = 0,
  message = 'success',
  init?: ResponseInit
): Response {
  const body = JSON.stringify({
    code,
    message,
    data,
    timestamp: Date.now(),
  });

  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  return new Response(body, {
    ...init,
    headers,
  });
}

export function errorResponse(
  code: number,
  message: string,
  statusCode = 400
): Response {
  return jsonResponse(null, code, message, { status: statusCode });
}

export function successResponse<T>(data: T, message = 'success'): Response {
  return jsonResponse(data, 0, message);
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): Response {
  return successResponse({
    items,
    total,
    page,
    pageSize,
  });
}
