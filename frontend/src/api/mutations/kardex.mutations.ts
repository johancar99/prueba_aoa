import { gql } from '@apollo/client';

export const REGISTER_MOVEMENT = gql`
  mutation RegisterMovement($input: RegisterMovementInput!) {
    registerMovement(input: $input) {
      id
      type
      quantity
      previousStock
      newStock
      unitPrice
      observations
      productId
      userId
      lowStockAlert
      createdAt
    }
  }
`;

export interface RegisterMovementInput {
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unitPrice?: number;
  observations: string;
}

export interface RegisterMovementResult {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  observations: string | null;
  productId: string;
  userId: string;
  lowStockAlert: boolean | null;
  createdAt: string;
}

export interface RegisterMovementData {
  registerMovement: RegisterMovementResult;
}
