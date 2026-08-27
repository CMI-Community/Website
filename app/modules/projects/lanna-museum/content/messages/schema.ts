export type MessageShape<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? { [K in keyof T]: MessageShape<T[K]> }
    : { [K in keyof T]: MessageShape<T[K]> };
