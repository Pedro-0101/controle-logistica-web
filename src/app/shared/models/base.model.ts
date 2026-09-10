/** Valores aceitos como parâmetro de query na API. */
export type QueryValue = string | number | boolean | null | undefined;

/** Mapa de parâmetros de query (snake_case, como esperado pela API). */
export type HttpQuery = Record<string, QueryValue>;
