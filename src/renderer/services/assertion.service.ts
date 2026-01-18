import type { Assertion, Request, ApiResponse } from '../../shared/types';

/**
 * Updates the assertions for a given request.
 * @param requestId The ID of the request to update.
 * @param assertions The new array of assertions.
 * @returns The updated request.
 */
export const updateAssertions = async (
  requestId: string,
  assertions: Assertion[]
): Promise<ApiResponse<Request>> => {
  return await window.api.assertions.update(requestId, assertions);
};
