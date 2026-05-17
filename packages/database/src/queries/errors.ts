export class QueryError extends Error {
  constructor(message: string, public readonly code = "QUERY_ERROR") {
    super(message);
    this.name = "QueryError";
  }
}

export function assertResult<T>(data: T | null, error: { message: string; code?: string } | null): T {
  if (error) throw new QueryError(error.message, error.code);
  if (data === null) throw new QueryError("No data returned", "NO_DATA");
  return data;
}
