import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
} from '@apollo/client';

const TOKEN_KEY = 'aoa_token';

/**
 * Inyecta el JWT en cada request de forma dinámica,
 * leyendo desde localStorage para que funcione tras refresh de página.
 */
const authLink = new ApolloLink((operation, forward) => {
  const raw = localStorage.getItem(TOKEN_KEY);
  const token: string | null = raw ? JSON.parse(raw) : null;

  if (token) {
    operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    }));
  }

  return forward(operation);
});

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

export default client;
