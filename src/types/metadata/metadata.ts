type AnyJson = boolean | number | string | null | JsonArray | JsonMap | any;

interface JsonMap {
  [key: string]: AnyJson;
}

interface JsonArray extends Array<AnyJson> {}

export type Metadata = AnyJson | JsonArray | JsonMap;
