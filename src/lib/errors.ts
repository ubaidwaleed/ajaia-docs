export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = "Please sign in") => new HttpError(401, msg);
export const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
// Used for "no access" too, so we don't reveal that a document exists.
export const notFound = (msg = "Document not found") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
