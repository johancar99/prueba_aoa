import mongoose, { type ClientSession } from "mongoose";

/**
 * Wraps an async operation in a MongoDB session transaction.
 * Automatically commits on success, aborts on any error, and always ends the session.
 */
export const withTransaction = async <T>(fn: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
