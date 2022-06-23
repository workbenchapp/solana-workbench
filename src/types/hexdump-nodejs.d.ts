declare module 'hexdump-nodejs' {
  function hexdump(
    data: Buffer | Uint8Array,
    offset?: number,
    length?: number
  ): string;

  export = hexdump;
}
