// export type AddSuffix<Obj extends Record<string, any>, Suffix extends string> = {
//   [Key in keyof Obj as `${string & Key}${Suffix}`]: Obj[Key];
// };
export type AddSuffix<T, S extends string> = {
  [K in keyof T as K extends string ? `${K}${S}` : never]: T[K];
};
