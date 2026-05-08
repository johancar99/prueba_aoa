import { requireRole } from "../guards/auth.guard";
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import type { GraphQLContext } from "../../types";
import type {
  CreateUserInput,
  UpdateUserInput,
  UsersFiltersInput
} from "../../utils/validators/user.validator";

const authService = new AuthService();
const userService = new UserService();

interface CreateUserArgs {
  input: CreateUserInput;
}

interface UpdateUserArgs {
  id: string;
  input: UpdateUserInput;
}

interface DeleteUserArgs {
  id: string;
}

interface LoginArgs {
  email: string;
  password: string;
}

interface UsersQueryArgs {
  filters?: UsersFiltersInput;
}

export const userResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) =>
      userService.getCurrentUser(context.userId),
    users: async (_parent: unknown, args: UsersQueryArgs, context: GraphQLContext) => {
      requireRole(context, "ADMIN");
      return userService.searchUsers(args.filters ?? {});
    }
  },
  Mutation: {
    createUser: async (_parent: unknown, args: CreateUserArgs, context: GraphQLContext) => {
      requireRole(context, "ADMIN");
      return userService.createUser(args.input);
    },
    updateUser: async (_parent: unknown, args: UpdateUserArgs, context: GraphQLContext) => {
      requireRole(context, "ADMIN");
      return userService.updateUser(args.id, args.input);
    },
    deleteUser: async (_parent: unknown, args: DeleteUserArgs, context: GraphQLContext) => {
      const adminId = requireRole(context, "ADMIN");
      return userService.deactivateUser(args.id, adminId);
    },
    login: async (_parent: unknown, args: LoginArgs) => authService.login(args.email, args.password)
  }
};
