import { apiRequest } from './queryClient';

// Override apiRequest to include authentication headers
export async function authenticatedApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const user = localStorage.getItem('user');
  const userId = user ? JSON.parse(user).id : null;

  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add user ID header for authentication
  if (userId) {
    headers['x-user-id'] = userId.toString();
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data, (key, value) => {
      // Convert Date objects to ISO strings for proper server-side parsing
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }

  return response;
}

export { apiRequest } from './queryClient';
