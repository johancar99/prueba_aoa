import cors from "cors";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { formatGraphQLError } from "./graphql/errors/errorFormatter";
import { createMovementLoaders } from "./graphql/loaders/movement.loader";
import { resolvers } from "./graphql/resolvers";
import { typeDefs } from "./graphql/typeDefs";
import { authMiddleware, errorMiddleware } from "./middlewares";
import type { GraphQLContext } from "./types";
import { seedAdminUser } from "./utils/seeder";

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  await seedAdminUser();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authMiddleware);

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    formatError: formatGraphQLError
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => ({
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        loaders: createMovementLoaders()
      })
    })
  );

  app.use(errorMiddleware);

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server ready at http://localhost:${env.port}/graphql`);
  });
};

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to bootstrap application:", error);
  process.exit(1);
});
