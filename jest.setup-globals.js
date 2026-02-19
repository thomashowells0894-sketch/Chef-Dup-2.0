// Pre-define expo lazy globals to prevent Jest 30 "import outside test scope" errors.
// expo/src/winter/runtime.native.ts installs lazy getters via Object.defineProperty
// that call require() on first access. In Jest 30, if that access happens after
// leaveTestCode(), the lazy require is blocked. Making these properties non-configurable
// prevents expo's installGlobal from overwriting them with lazy getters.

const globals = ['__ExpoImportMetaRegistry', 'structuredClone', 'TextDecoder', 'TextDecoderStream', 'TextEncoderStream'];
for (const name of globals) {
  if (typeof globalThis[name] !== 'undefined') {
    // Already defined (e.g. Node built-ins) — make non-configurable so expo won't override
    Object.defineProperty(globalThis, name, {
      value: globalThis[name],
      configurable: false,
      writable: true,
      enumerable: true,
    });
  } else {
    Object.defineProperty(globalThis, name, {
      value: name === '__ExpoImportMetaRegistry' ? {} : undefined,
      configurable: false,
      writable: true,
      enumerable: false,
    });
  }
}
