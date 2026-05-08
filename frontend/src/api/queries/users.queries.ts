import { gql } from '@apollo/client';
import type { UserRole } from '../../store/AuthContext';

export const GET_USERS = gql`
  query GetUsers($filters: UserFiltersInput) {
    users(filters: $filters) {
      total
      items {
        id
        name
        email
        role
      }
    }
  }
`;

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface GetUsersData {
  users: {
    total: number;
    items: UserItem[];
  };
}

export interface UserFiltersInput {
  name?: string;
  role?: UserRole | '';
  limit?: number;
  offset?: number;
}

export interface GetUsersVars {
  filters?: UserFiltersInput;
}
